import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService, Usuario } from '@/app/lib/supabase/auth-service';
import { supabase, supabaseAdmin } from '@/app/lib/supabase/config';

// Mock de los clientes de Supabase
vi.mock('@/app/lib/supabase/config', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn()
  },
  supabaseAdmin: {
    from: vi.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = AuthService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('debería devolver siempre la misma instancia', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sincronizarUsuario', () => {
    it('debería sincronizar un usuario existente por auth_id', async () => {
      const mockUser = {
        id: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg'
      };

      const mockUsuarioExistente: Usuario = {
        id: 'db123',
        auth_id: 'google123',
        email: 'test@example.com',
        nombre: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        fecha_creacion: '2024-01-01T00:00:00Z',
        fecha_actualizacion: '2024-01-01T00:00:00Z'
      };

      // Mock de la búsqueda por auth_id
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUsuarioExistente,
              error: null
            })
          })
        })
      } as any);

      // Mock de la actualización
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockUsuarioExistente,
                  fecha_actualizacion: expect.any(String)
                },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await authService.sincronizarUsuario(mockUser);

      expect(result).toBeDefined();
      expect(result?.auth_id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
      expect(result?.nombre).toBe(mockUser.name);
      expect(result?.avatar_url).toBe(mockUser.image);
    });

    it('debería crear un nuevo usuario si no existe', async () => {
      const mockUser = {
        id: 'google123',
        email: 'new@example.com',
        name: 'New User',
        image: 'https://example.com/new-avatar.jpg'
      };

      // Mock de búsqueda sin resultados
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      } as any);

      // Mock de la inserción
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new123',
                auth_id: mockUser.id,
                email: mockUser.email,
                nombre: mockUser.name,
                avatar_url: mockUser.image,
                fecha_creacion: expect.any(String),
                fecha_actualizacion: expect.any(String)
              },
              error: null
            })
          })
        })
      } as any);

      const result = await authService.sincronizarUsuario(mockUser);

      expect(result).toBeDefined();
      expect(result?.auth_id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
      expect(result?.nombre).toBe(mockUser.name);
      expect(result?.avatar_url).toBe(mockUser.image);
    });

    it('debería manejar errores correctamente', async () => {
      const mockUser = {
        id: 'google123',
        email: 'error@example.com'
      };

      // Mock de error en la búsqueda
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Error de base de datos'))
          })
        })
      } as any);

      await expect(authService.sincronizarUsuario(mockUser)).rejects.toThrow();
    });
  });

  describe('eventos de autenticación', () => {
    it('debería manejar el evento SIGNED_IN', () => {
      const mockCallback = vi.fn();
      const mockSession = {
        user: {
          id: 'google123',
          email: 'test@example.com'
        }
      };

      // Simular el evento de inicio de sesión
      vi.mocked(supabase.auth.onAuthStateChange).mock.calls[0][0]('SIGNED_IN', mockSession);

      expect(vi.mocked(supabase.auth.onAuthStateChange)).toHaveBeenCalled();
    });

    it('debería manejar el evento SIGNED_OUT', () => {
      const mockCallback = vi.fn();

      // Simular el evento de cierre de sesión
      vi.mocked(supabase.auth.onAuthStateChange).mock.calls[0][0]('SIGNED_OUT', null);

      expect(vi.mocked(supabase.auth.onAuthStateChange)).toHaveBeenCalled();
    });
  });
}); 