const WORKER_URL = process.env.WHATSAPP_WORKER_URL;
const WORKER_SECRET = process.env.WORKER_SECRET || '';

function useRemoteWorker(): boolean {
  if (process.env.USE_WHATSAPP_WORKER === 'true') return Boolean(WORKER_URL);
  if (process.env.NODE_ENV === 'development') return false;
  return Boolean(WORKER_URL);
}

export function isWhatsAppWorkerConfigured(): boolean {
  return useRemoteWorker();
}

export function shouldUseLocalLite(): boolean {
  return !process.env.VERCEL && !useRemoteWorker();
}

export async function callWhatsAppWorker(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    userId?: string;
  } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!WORKER_URL) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'WhatsApp worker no configurado. Definí WHATSAPP_WORKER_URL.',
        connected: false,
        data: { connected: false },
      },
    };
  }

  const method = options.method || 'GET';
  const url = new URL(path, `${WORKER_URL.replace(/\/$/, '')}/`);
  if (method === 'GET' && options.userId) {
    url.searchParams.set('userId', options.userId);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-worker-secret': WORKER_SECRET,
  };
  if (options.userId) {
    headers['x-user-id'] = options.userId;
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(options.body || {}),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok && !body.error) {
      body.error = 'No se pudo contactar el worker de WhatsApp (Railway).';
      body.data = { connected: false, ...(typeof body.data === 'object' && body.data ? body.data : {}) };
    }
    return { status: response.status, body };
  } catch {
    return {
      status: 503,
      body: {
        success: false,
        error: 'No se pudo contactar el worker de WhatsApp (Railway).',
        connected: false,
        data: { connected: false },
      },
    };
  }
}

async function localLite() {
  const { whatsappLiteService } = await import(
    '@/app/servicios/messaging/whatsapp/WhatsAppLiteService'
  );
  return whatsappLiteService;
}

export async function liteConnect(userId: string) {
  if (isWhatsAppWorkerConfigured()) {
    return callWhatsAppWorker('/connect', {
      method: 'POST',
      body: { userId },
      userId,
    });
  }
  if (process.env.VERCEL) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'WhatsApp personal corre en Railway. Configurá WHATSAPP_WORKER_URL.',
        data: { connected: false },
      },
    };
  }
  const service = await localLite();
  const result = await service.connect(userId);
  const { waitForLiteQr, toQrDataUrl } = await import('@/lib/whatsapp/qrUtils');
  const resolvedQr =
    (await waitForLiteQr(() => service.getCurrentState(userId)?.currentQR)) ||
    (await toQrDataUrl(result.qrCode));
  return {
    status: result.success ? 200 : 500,
    body: {
      success: result.success,
      data: {
        connected: Boolean(result.data?.connected),
        sessionId: result.sessionId || result.data?.sessionId,
        qrCode: resolvedQr || undefined,
        message: result.data?.message || result.error,
        phoneNumber: service.getConnectionStatus().phoneNumber,
      },
      error: result.error,
    },
  };
}

export async function liteStatus(userId: string) {
  if (isWhatsAppWorkerConfigured()) {
    return callWhatsAppWorker('/status', { method: 'GET', userId });
  }
  if (process.env.VERCEL) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          connected: false,
          error: 'Worker de WhatsApp no configurado o caído.',
        },
      },
    };
  }
  const service = await localLite();
  const status = service.getConnectionStatus();
  const state = service.getCurrentState(userId);
  return {
    status: 200,
    body: {
      success: true,
      data: {
        connected: status.connected,
        phoneNumber: status.phoneNumber,
        lastActivity: status.lastActivity,
        sessionId: state?.sessionId,
        qrCode: state?.currentQR,
      },
    },
  };
}

export async function liteSend(userId: string, to: string, message: string) {
  if (isWhatsAppWorkerConfigured()) {
    return callWhatsAppWorker('/send', {
      method: 'POST',
      body: { userId, to, message },
      userId,
    });
  }
  if (process.env.VERCEL) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'WhatsApp Lite no está conectado (falta worker en Railway).',
      },
    };
  }
  const service = await localLite();
  const success = await service.sendMessage(to, message);
  return {
    status: success ? 200 : 503,
    body: {
      success,
      error: success ? undefined : 'WhatsApp Lite no está conectado',
    },
  };
}

export async function liteDisconnect(userId: string) {
  if (isWhatsAppWorkerConfigured()) {
    return callWhatsAppWorker('/disconnect', {
      method: 'POST',
      body: { userId },
      userId,
    });
  }
  if (process.env.VERCEL) {
    return {
      status: 503,
      body: { success: false, error: 'Worker de WhatsApp no configurado.' },
    };
  }
  const service = await localLite();
  await service.disconnect();
  return {
    status: 200,
    body: { success: true, message: 'WhatsApp Lite desconectado' },
  };
}
