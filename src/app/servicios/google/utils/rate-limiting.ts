import { RateLimitConfig } from '@/types/servicios';

export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, { lastCall: number; count: number }>;
  private defaultWindow = 1000; // 1 segundo en ms
  private defaultLimit = 10; // 10 llamadas por ventana

  private constructor() {
    this.limits = new Map();
  }

  public static getInstance(): RateLimiter {
    if (!this.instance) {
      this.instance = new RateLimiter();
    }
    return this.instance;
  }

  public async checkLimit(
    operation: string,
    config = { window: this.defaultWindow, limit: this.defaultLimit }
  ): Promise<void> {
    const now = Date.now();
    const entry = this.limits.get(operation) || { lastCall: 0, count: 0 };

    // Si estamos en una nueva ventana de tiempo
    if (now - entry.lastCall > config.window) {
      entry.count = 1;
      entry.lastCall = now;
    } else {
      // Si excedemos el límite, esperamos
      if (entry.count >= config.limit) {
        const waitTime = config.window - (now - entry.lastCall);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        entry.count = 1;
        entry.lastCall = Date.now();
      } else {
        entry.count++;
      }
    }

    this.limits.set(operation, entry);
  }

  public reset(operation: string): void {
    this.limits.delete(operation);
  }

  public resetAll(): void {
    this.limits.clear();
  }
}

export const rateLimiter = RateLimiter.getInstance();
