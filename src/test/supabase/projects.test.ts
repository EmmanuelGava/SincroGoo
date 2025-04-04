import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projectsService } from '@/lib/supabase/services/projects';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/lib/supabase/types/projects';

// Mock del cliente Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Datos de prueba
const mockProjects: Project[] = [{
  id: 'test-1',
  nombre: 'Proyecto Test',
  descripcion: 'Descripción de prueba',
  usuario_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  metadata: {}
}];

describe('ProjectsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('debería listar los proyectos correctamente', async () => {
      // Configurar el mock de Supabase
      const mockSelect = vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProjects,
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any);

      // Ejecutar la función
      const result = await projectsService.listProjects({
        usuario_id: 'user-1'
      });

      // Verificar el resultado
      expect(result).toEqual(mockProjects);

      // Verificar que se llamaron los métodos correctos
      expect(supabase.from).toHaveBeenCalledWith('proyectos');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('debería manejar errores correctamente', async () => {
      // Configurar el mock para simular un error
      const mockError = new Error('Error de prueba');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      } as any);

      // Ejecutar la función
      const result = await projectsService.listProjects({
        usuario_id: 'user-1'
      });

      // Verificar que retorna un array vacío en caso de error
      expect(result).toEqual([]);
    });
  });

  describe('getProjectById', () => {
    it('debería obtener un proyecto por ID correctamente', async () => {
      // Configurar el mock de Supabase
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProjects[0],
              error: null
            })
          })
        })
      } as any);

      // Ejecutar la función
      const result = await projectsService.getProjectById('test-1');

      // Verificar el resultado
      expect(result).toEqual(mockProjects[0]);

      // Verificar que se llamaron los métodos correctos
      expect(supabase.from).toHaveBeenCalledWith('proyectos');
    });

    it('debería manejar el caso de proyecto no encontrado', async () => {
      // Configurar el mock para simular que no se encontró el proyecto
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      } as any);

      // Ejecutar la función
      const result = await projectsService.getProjectById('no-existe');

      // Verificar que retorna null cuando no se encuentra el proyecto
      expect(result).toBeNull();
    });
  });
}); 