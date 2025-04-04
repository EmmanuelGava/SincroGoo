import { ResultadoAPI } from '@/types/servicios';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error al obtener item del storage:', error);
      return null;
    }
  }

  public setItem(key: string, value: string): ResultadoAPI<void> {
    try {
      localStorage.setItem(key, value);
      return { exito: true };
    } catch (error) {
      console.error('Error al guardar item en storage:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }

  public removeItem(key: string): ResultadoAPI<void> {
    try {
      localStorage.removeItem(key);
      return { exito: true };
    } catch (error) {
      console.error('Error al eliminar item del storage:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }
} 