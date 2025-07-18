// Priority Conversations Service - Servicio para conversaciones prioritarias
// Fecha: 2025-01-16

import { createClient } from '@supabase/supabase-js';
import { 
  PriorityConversation, 
  Priority, 
  Platform,
  PriorityConversationsRequest,
  PriorityConversationsResponse
} from '@/types/dashboard';
import { 
  ConversacionConLead,
  Lead,
  MensajeConversacion
} from '@/types/database';

export class PriorityConversationsService {
  private supabase;

  constructor(supabaseToken?: string) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseToken ? {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`
          }
        }
      } : undefined
    );
  }

  // =====================================================
  // Método principal para obtener conversaciones prioritarias
  // =====================================================

  async getPriorityConversations(
    usuarioId: string,
    request: PriorityConversationsRequest = {}
  ): Promise<PriorityConversationsResponse> {
    try {
      const {
        limit = 20,
        offset = 0,
        platforms,
        priorityFilter,
        includeCompleted = false
      } = request;

      // Obtener conversaciones con leads y último mensaje
      const conversationsQuery = this.supabase
        .from('conversaciones')
        .select(`
          id,
          lead_id,
          servicio_origen,
          fecha_mensaje,
          tipo,
          metadata,
          leads!inner(
            id,
            nombre,
            email,
            telefono,
            empresa,
            valor_potencial,
            tags,
            estado_id,
            estados_lead(nombre, color)
          ),
          mensajes_conversacion(
            id,
            contenido,
            fecha_mensaje,
            tipo,
            remitente
          )
        `)
        .eq('usuario_id', usuarioId)
        .order('fecha_mensaje', { ascending: false });

      // Aplicar filtros de plataforma
      if (platforms && platforms.length > 0) {
        conversationsQuery.in('servicio_origen', platforms);
      }

      // Ejecutar consulta
      const { data: conversationsData, error } = await conversationsQuery
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error fetching conversations: ${error.message}`);
      }

      if (!conversationsData) {
        return {
          conversations: [],
          totalCount: 0,
          hasMore: false,
          filters: {
            platforms: platforms || [],
            priorities: priorityFilter || []
          }
        };
      }

      // Procesar conversaciones y calcular prioridades
      const processedConversations = await Promise.all(
        conversationsData.map(conv => this.processConversation(conv, usuarioId))
      );

      // Filtrar por prioridad si se especifica
      let filteredConversations = processedConversations;
      if (priorityFilter && priorityFilter.length > 0) {
        filteredConversations = processedConversations.filter(conv => 
          priorityFilter.includes(conv.priority)
        );
      }

      // Ordenar por prioridad y tiempo
      const sortedConversations = this.sortConversationsByPriority(filteredConversations);

      // Obtener count total para paginación
      const totalCount = await this.getTotalConversationsCount(usuarioId, platforms, priorityFilter);

      return {
        conversations: sortedConversations,
        totalCount,
        hasMore: offset + limit < totalCount,
        filters: {
          platforms: platforms || [],
          priorities: priorityFilter || []
        }
      };

    } catch (error) {
      console.error('Error in getPriorityConversations:', error);
      throw new Error('Failed to fetch priority conversations');
    }
  }

  // =====================================================
  // Procesar conversación individual y calcular prioridad
  // =====================================================

  private async processConversation(conversationData: any, usuarioId: string): Promise<PriorityConversation> {
    const lead = conversationData.leads;
    const messages = conversationData.mensajes_conversacion || [];
    
    // Obtener último mensaje
    const lastMessage = messages.length > 0 ? messages[0] : null;
    const lastMessageContent = lastMessage?.contenido || 'Sin mensajes';
    const lastMessageAt = lastMessage?.fecha_mensaje || conversationData.fecha_mensaje;

    // Calcular tiempo sin respuesta
    const timeSinceLastResponse = this.calculateTimeSinceLastResponse(messages);

    // Calcular mensajes no leídos (simplificado)
    const unreadCount = messages.filter((msg: any) => 
      msg.tipo === 'entrante' && 
      new Date(msg.fecha_mensaje) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    // Verificar si está marcada como importante
    const isMarkedImportant = await this.isConversationMarkedImportant(conversationData.id, usuarioId);

    // Calcular prioridad
    const priority = this.calculateConversationPriority(
      timeSinceLastResponse,
      lead?.valor_potencial || 0,
      unreadCount,
      isMarkedImportant,
      lead?.tags || []
    );

    // Mapear plataforma
    const platform = this.mapServiceToPlatform(conversationData.servicio_origen);

    return {
      id: conversationData.id,
      leadId: lead?.id || '',
      leadName: lead?.nombre || 'Lead sin nombre',
      platform,
      lastMessage: this.truncateMessage(lastMessageContent),
      lastMessageAt,
      timeSinceLastResponse,
      priority,
      isMarkedImportant,
      leadValue: lead?.valor_potencial || 0,
      unreadCount,
      tags: lead?.tags || [],
      status: lead?.estados_lead?.nombre || 'Sin estado',
      assignedTo: lead?.asignado_a
    };
  }

  // =====================================================
  // Calcular prioridad de conversación
  // =====================================================

  private calculateConversationPriority(
    timeSinceLastResponse: number,
    leadValue: number,
    unreadCount: number,
    isMarkedImportant: boolean,
    tags: string[]
  ): Priority {
    let score = 0;

    // Si está marcada como importante, prioridad alta automáticamente
    if (isMarkedImportant) {
      return 'urgent';
    }

    // Puntuación por tiempo sin respuesta (en minutos)
    if (timeSinceLastResponse > 480) { // 8 horas
      score += 40;
    } else if (timeSinceLastResponse > 240) { // 4 horas
      score += 30;
    } else if (timeSinceLastResponse > 120) { // 2 horas
      score += 20;
    } else if (timeSinceLastResponse > 60) { // 1 hora
      score += 10;
    }

    // Puntuación por valor del lead
    if (leadValue > 10000) {
      score += 30;
    } else if (leadValue > 5000) {
      score += 20;
    } else if (leadValue > 1000) {
      score += 10;
    }

    // Puntuación por mensajes no leídos
    score += Math.min(unreadCount * 5, 20); // Máximo 20 puntos

    // Puntuación por tags especiales
    const vipTags = ['vip', 'urgente', 'cliente', 'premium'];
    const hasVipTag = tags.some(tag => 
      vipTags.some(vipTag => tag.toLowerCase().includes(vipTag))
    );
    if (hasVipTag) {
      score += 25;
    }

    // Determinar prioridad basada en puntuación
    if (score >= 70) return 'urgent';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  // =====================================================
  // Calcular tiempo desde última respuesta
  // =====================================================

  private calculateTimeSinceLastResponse(messages: any[]): number {
    if (!messages || messages.length === 0) {
      return 0;
    }

    // Buscar el último mensaje saliente (respuesta nuestra)
    const lastOutgoingMessage = messages
      .filter(msg => msg.tipo === 'saliente')
      .sort((a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime())[0];

    // Buscar mensajes entrantes después de la última respuesta
    const lastOutgoingTime = lastOutgoingMessage ? new Date(lastOutgoingMessage.fecha_mensaje).getTime() : 0;
    
    const unrespondedMessages = messages.filter(msg => 
      msg.tipo === 'entrante' && 
      new Date(msg.fecha_mensaje).getTime() > lastOutgoingTime
    );

    if (unrespondedMessages.length === 0) {
      return 0;
    }

    // Tiempo desde el primer mensaje sin responder
    const firstUnrespondedMessage = unrespondedMessages
      .sort((a, b) => new Date(a.fecha_mensaje).getTime() - new Date(b.fecha_mensaje).getTime())[0];

    const timeDiff = Date.now() - new Date(firstUnrespondedMessage.fecha_mensaje).getTime();
    return Math.floor(timeDiff / (1000 * 60)); // Retornar en minutos
  }

  // =====================================================
  // Verificar si conversación está marcada como importante
  // =====================================================

  private async isConversationMarkedImportant(conversationId: string, usuarioId: string): Promise<boolean> {
    // Verificar en metadata de la conversación
    const { data } = await this.supabase
      .from('conversaciones')
      .select('metadata')
      .eq('id', conversationId)
      .eq('usuario_id', usuarioId)
      .single();

    return data?.metadata?.important === true;
  }

  // =====================================================
  // Marcar/desmarcar conversación como importante
  // =====================================================

  async markConversationImportant(
    conversationId: string, 
    usuarioId: string, 
    important: boolean
  ): Promise<boolean> {
    try {
      // Obtener metadata actual
      const { data: currentData } = await this.supabase
        .from('conversaciones')
        .select('metadata')
        .eq('id', conversationId)
        .eq('usuario_id', usuarioId)
        .single();

      const currentMetadata = currentData?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        important,
        important_marked_at: new Date().toISOString(),
        important_marked_by: usuarioId
      };

      // Actualizar conversación
      const { error } = await this.supabase
        .from('conversaciones')
        .update({ metadata: updatedMetadata })
        .eq('id', conversationId)
        .eq('usuario_id', usuarioId);

      if (error) {
        throw new Error(`Error updating conversation: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Error marking conversation as important:', error);
      return false;
    }
  }

  // =====================================================
  // Ordenar conversaciones por prioridad
  // =====================================================

  private sortConversationsByPriority(conversations: PriorityConversation[]): PriorityConversation[] {
    const priorityOrder: Record<Priority, number> = {
      'urgent': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    return conversations.sort((a, b) => {
      // Primero por prioridad
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Luego por tiempo sin respuesta
      const timeDiff = b.timeSinceLastResponse - a.timeSinceLastResponse;
      if (timeDiff !== 0) return timeDiff;

      // Finalmente por valor del lead
      return b.leadValue - a.leadValue;
    });
  }

  // =====================================================
  // Obtener count total para paginación
  // =====================================================

  private async getTotalConversationsCount(
    usuarioId: string, 
    platforms?: Platform[], 
    priorityFilter?: Priority[]
  ): Promise<number> {
    let query = this.supabase
      .from('conversaciones')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId);

    if (platforms && platforms.length > 0) {
      query = query.in('servicio_origen', platforms);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting total count:', error);
      return 0;
    }

    return count || 0;
  }

  // =====================================================
  // Métodos auxiliares
  // =====================================================

  private mapServiceToPlatform(servicioOrigen: string): Platform {
    const mapping: Record<string, Platform> = {
      'whatsapp': 'whatsapp',
      'telegram': 'telegram',
      'email': 'email',
      'gmail': 'email',
      'outlook': 'email'
    };

    return mapping[servicioOrigen.toLowerCase()] || 'email';
  }

  private truncateMessage(message: string, maxLength = 100): string {
    if (!message) return 'Sin contenido';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  // =====================================================
  // Obtener conversaciones que requieren seguimiento
  // =====================================================

  async getFollowUpConversations(usuarioId: string): Promise<PriorityConversation[]> {
    try {
      // Conversaciones sin respuesta por más de 24 horas
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await this.supabase
        .from('conversaciones')
        .select(`
          id,
          lead_id,
          servicio_origen,
          fecha_mensaje,
          leads!inner(
            id,
            nombre,
            valor_potencial,
            tags
          ),
          mensajes_conversacion!inner(
            tipo,
            fecha_mensaje
          )
        `)
        .eq('usuario_id', usuarioId)
        .eq('mensajes_conversacion.tipo', 'entrante')
        .lt('mensajes_conversacion.fecha_mensaje', oneDayAgo);

      if (!data) return [];

      const processedConversations = await Promise.all(
        data.map(conv => this.processConversation(conv, usuarioId))
      );

      return this.sortConversationsByPriority(processedConversations);

    } catch (error) {
      console.error('Error getting follow-up conversations:', error);
      return [];
    }
  }

  // =====================================================
  // Obtener estadísticas de conversaciones prioritarias
  // =====================================================

  async getPriorityStats(usuarioId: string): Promise<{
    urgent: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    averageResponseTime: number;
  }> {
    try {
      const conversations = await this.getPriorityConversations(usuarioId, { limit: 1000 });
      
      const stats = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: conversations.conversations.length,
        averageResponseTime: 0
      };

      let totalResponseTime = 0;

      conversations.conversations.forEach(conv => {
        stats[conv.priority]++;
        totalResponseTime += conv.timeSinceLastResponse;
      });

      stats.averageResponseTime = stats.total > 0 ? 
        Math.round(totalResponseTime / stats.total) : 0;

      return stats;

    } catch (error) {
      console.error('Error getting priority stats:', error);
      return {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
        averageResponseTime: 0
      };
    }
  }
}