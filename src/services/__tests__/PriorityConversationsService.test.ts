// Priority Conversations Service Tests - Tests unitarios para el servicio de conversaciones prioritarias
// Fecha: 2025-01-16

import { PriorityConversationsService } from '../PriorityConversationsService';
import { Platform, Priority } from '@/types/dashboard';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  count: jest.fn(),
  head: jest.fn()
};

// Mock del módulo de Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('PriorityConversationsService', () => {
  let service: PriorityConversationsService;
  const mockUserId = 'test-user-id';
  const mockToken = 'test-supabase-token';

  beforeEach(() => {
    service = new PriorityConversationsService(mockToken);
    jest.clearAllMocks();
  });

  describe('getPriorityConversations', () => {
    const mockConversationsData = [
      {
        id: 'conv-1',
        lead_id: 'lead-1',
        servicio_origen: 'whatsapp',
        fecha_mensaje: '2025-01-16T10:00:00Z',
        leads: {
          id: 'lead-1',
          nombre: 'Test Lead',
          valor_potencial: 5000,
          tags: ['vip'],
          asignado_a: 'user-1'
        },
        mensajes_conversacion: [
          {
            id: 'msg-1',
            tipo: 'entrante',
            contenido: 'Hola, necesito información',
            fecha_mensaje: '2025-01-16T10:00:00Z'
          }
        ]
      }
    ];

    it('should return priority conversations successfully', async () => {
      // Mock conversations query
      mockSupabase.range.mockResolvedValue({
        data: mockConversationsData,
        error: null
      });

      // Mock important conversations preferences
      mockSupabase.single.mockResolvedValue({
        data: {
          custom_objectives: {
            important_conversations: ['conv-1']
          }
        }
      });

      // Mock total count
      mockSupabase.count = 1;

      const result = await service.getPriorityConversations(mockUserId);

      expect(result).toBeDefined();
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].leadName).toBe('Test Lead');
      expect(result.conversations[0].isMarkedImportant).toBe(true);
      expect(result.totalCount).toBeDefined();
    });

    it('should apply platform filters correctly', async () => {
      const platforms: Platform[] = ['whatsapp', 'telegram'];

      mockSupabase.range.mockResolvedValue({
        data: mockConversationsData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      await service.getPriorityConversations(mockUserId, { platforms });

      expect(mockSupabase.in).toHaveBeenCalledWith('servicio_origen', platforms);
    });

    it('should apply priority filters correctly', async () => {
      const priorityFilter: Priority[] = ['high', 'urgent'];

      mockSupabase.range.mockResolvedValue({
        data: mockConversationsData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId, { priorityFilter });

      expect(result.filters.priorities).toEqual(priorityFilter);
    });

    it('should handle pagination correctly', async () => {
      const limit = 10;
      const offset = 20;

      mockSupabase.range.mockResolvedValue({
        data: mockConversationsData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      await service.getPriorityConversations(mockUserId, { limit, offset });

      expect(mockSupabase.range).toHaveBeenCalledWith(offset, offset + limit - 1);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(service.getPriorityConversations(mockUserId))
        .rejects.toThrow('Failed to fetch priority conversations');
    });

    it('should handle empty conversations data', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(result.conversations).toHaveLength(0);
      expect(result.totalCount).toBeDefined();
    });
  });

  describe('calculatePriority', () => {
    it('should calculate urgent priority for high-value leads with long response time', async () => {
      const mockLead = {
        valor_potencial: 15000,
        tags: ['vip']
      };

      const mockMessages = [
        { tipo: 'entrante', fecha_mensaje: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }
      ];

      // Test indirectly through getPriorityConversations
      const conversationData = [{
        id: 'conv-1',
        leads: mockLead,
        mensajes_conversacion: mockMessages,
        servicio_origen: 'whatsapp'
      }];

      mockSupabase.range.mockResolvedValue({
        data: conversationData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: { important_conversations: ['conv-1'] } }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(result.conversations[0].priority).toBe('urgent');
    });

    it('should calculate low priority for low-value leads with recent response', async () => {
      const mockLead = {
        valor_potencial: 100,
        tags: []
      };

      const mockMessages = [
        { tipo: 'entrante', fecha_mensaje: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
        { tipo: 'saliente', fecha_mensaje: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
      ];

      const conversationData = [{
        id: 'conv-1',
        leads: mockLead,
        mensajes_conversacion: mockMessages,
        servicio_origen: 'email'
      }];

      mockSupabase.range.mockResolvedValue({
        data: conversationData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(['low', 'medium']).toContain(result.conversations[0].priority);
    });
  });

  describe('markConversationAsImportant', () => {
    it('should mark conversation as important successfully', async () => {
      const conversationId = 'conv-1';

      // Mock current preferences
      mockSupabase.single.mockResolvedValue({
        data: {
          custom_objectives: {
            important_conversations: []
          }
        }
      });

      // Mock update
      mockSupabase.update.mockResolvedValue({
        error: null
      });

      const result = await service.markConversationAsImportant(
        mockUserId,
        conversationId,
        true
      );

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        custom_objectives: {
          important_conversations: [conversationId]
        }
      });
    });

    it('should unmark conversation as important successfully', async () => {
      const conversationId = 'conv-1';

      // Mock current preferences with conversation already marked
      mockSupabase.single.mockResolvedValue({
        data: {
          custom_objectives: {
            important_conversations: [conversationId, 'conv-2']
          }
        }
      });

      // Mock update
      mockSupabase.update.mockResolvedValue({
        error: null
      });

      const result = await service.markConversationAsImportant(
        mockUserId,
        conversationId,
        false
      );

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        custom_objectives: {
          important_conversations: ['conv-2']
        }
      });
    });

    it('should handle database errors when marking important', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      mockSupabase.update.mockResolvedValue({
        error: { message: 'Update failed' }
      });

      const result = await service.markConversationAsImportant(
        mockUserId,
        'conv-1',
        true
      );

      expect(result).toBe(false);
    });

    it('should handle missing preferences gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null
      });

      mockSupabase.update.mockResolvedValue({
        error: null
      });

      const result = await service.markConversationAsImportant(
        mockUserId,
        'conv-1',
        true
      );

      expect(result).toBe(true);
    });
  });

  describe('getConversationsByLead', () => {
    it('should return conversations for specific lead', async () => {
      const leadId = 'lead-1';
      const mockData = [
        {
          id: 'conv-1',
          lead_id: leadId,
          servicio_origen: 'whatsapp',
          mensajes_conversacion: [],
          leads: {
            id: leadId,
            nombre: 'Test Lead',
            valor_potencial: 1000,
            tags: []
          }
        }
      ];

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Mock preferences for priority calculation
      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getConversationsByLead(mockUserId, leadId);

      expect(result).toHaveLength(1);
      expect(result[0].leadId).toBe(leadId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('lead_id', leadId);
    });

    it('should handle errors when fetching by lead', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Lead not found' }
      });

      await expect(service.getConversationsByLead(mockUserId, 'invalid-lead'))
        .rejects.toThrow('Failed to fetch conversations by lead');
    });
  });

  describe('getPriorityStats', () => {
    it('should return priority statistics', async () => {
      // Mock conversations with different priorities
      const mockConversations = {
        conversations: [
          { priority: 'urgent' as Priority },
          { priority: 'high' as Priority },
          { priority: 'high' as Priority },
          { priority: 'medium' as Priority },
          { priority: 'low' as Priority }
        ],
        totalCount: 5,
        hasMore: false,
        filters: { platforms: [], priorities: [] }
      };

      // Mock the getPriorityConversations method
      jest.spyOn(service, 'getPriorityConversations').mockResolvedValue(mockConversations);

      const stats = await service.getPriorityStats(mockUserId);

      expect(stats).toEqual({
        urgent: 1,
        high: 2,
        medium: 1,
        low: 1,
        total: 5
      });
    });

    it('should handle errors in stats calculation', async () => {
      jest.spyOn(service, 'getPriorityConversations').mockRejectedValue(new Error('Stats error'));

      const stats = await service.getPriorityStats(mockUserId);

      expect(stats).toEqual({
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      });
    });
  });

  describe('refreshPriorities', () => {
    it('should refresh priorities successfully', async () => {
      const result = await service.refreshPriorities(mockUserId);
      expect(result).toBe(true);
    });
  });

  describe('Helper methods', () => {
    it('should calculate time since last response correctly', async () => {
      // Test indirectly through priority calculation
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const mockMessages = [
        { tipo: 'entrante', fecha_mensaje: twoHoursAgo.toISOString() }
      ];

      const conversationData = [{
        id: 'conv-1',
        leads: { valor_potencial: 1000, tags: [] },
        mensajes_conversacion: mockMessages,
        servicio_origen: 'whatsapp'
      }];

      mockSupabase.range.mockResolvedValue({
        data: conversationData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(result.conversations[0].timeSinceLastResponse).toBeGreaterThan(100); // More than 100 minutes
    });

    it('should map platforms correctly', async () => {
      const conversationData = [
        {
          id: 'conv-1',
          leads: { valor_potencial: 1000, tags: [] },
          mensajes_conversacion: [],
          servicio_origen: 'telegram'
        }
      ];

      mockSupabase.range.mockResolvedValue({
        data: conversationData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(result.conversations[0].platform).toBe('telegram');
    });

    it('should truncate long messages', async () => {
      const longMessage = 'A'.repeat(150);
      const conversationData = [
        {
          id: 'conv-1',
          leads: { valor_potencial: 1000, tags: [] },
          mensajes_conversacion: [
            { tipo: 'entrante', contenido: longMessage, fecha_mensaje: new Date().toISOString() }
          ],
          servicio_origen: 'whatsapp'
        }
      ];

      mockSupabase.range.mockResolvedValue({
        data: conversationData,
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: { custom_objectives: {} }
      });

      const result = await service.getPriorityConversations(mockUserId);

      expect(result.conversations[0].lastMessage).toHaveLength(103); // 100 chars + '...'
      expect(result.conversations[0].lastMessage).toEndWith('...');
    });
  });
});