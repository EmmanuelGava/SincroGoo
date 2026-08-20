/**
 * Worker Baileys 24/7 para Railway.
 * Start: npx tsx worker/whatsapp.ts
 * Env: PORT, WORKER_SECRET, APP_URL (klosync.vercel.app), SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
 */
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { whatsappLiteService } from '../src/app/servicios/messaging/whatsapp/WhatsAppLiteService';
import { getSupabaseAdmin } from '../src/lib/supabase/client';
import { processOutboxBatch, type WhatsAppOutboxRow } from '../src/lib/chat/outbox';

const PORT = Number(process.env.PORT || 3001);
const WORKER_SECRET = process.env.WORKER_SECRET || '';
const APP_URL = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');

function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
}

function emitToAll(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}

(global as { emitToUser?: typeof emitToUser }).emitToUser = emitToUser;
(global as { emitToAll?: typeof emitToAll }).emitToAll = emitToAll;

let io: Server | null = null;

function unauthorized(res: ServerResponse) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'No autorizado' }));
}

const corsOrigins = [
  process.env.NEXTAUTH_URL,
  process.env.APP_URL,
  'https://klosync.vercel.app',
  'http://localhost:3000',
].filter(Boolean) as string[];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || corsOrigins[0] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-worker-secret, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!WORKER_SECRET) return true;
  return req.headers['x-worker-secret'] === WORKER_SECRET;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders(),
  });
  res.end(JSON.stringify(body));
}

async function toQrDataUrl(qr: string | null | undefined): Promise<string | null> {
  if (!qr) return null;
  if (qr.startsWith('data:image')) return qr;
  try {
    return await QRCode.toDataURL(qr);
  } catch {
    return qr;
  }
}

async function waitForQr(userId: string, timeoutMs = 12000): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = whatsappLiteService.getCurrentState(userId);
    if (state?.isConnected) return null;
    if (state?.currentQR) return toQrDataUrl(state.currentQR);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return toQrDataUrl(whatsappLiteService.getCurrentState(userId)?.currentQR);
}

function liteStatus(userId: string) {
  const live = whatsappLiteService.hasLiveSocket();
  const status = whatsappLiteService.getConnectionStatus();
  const state = whatsappLiteService.getCurrentState() || whatsappLiteService.getCurrentState(userId);
  return {
    success: true,
    data: {
      connected: live,
      phoneNumber: status.phoneNumber || state?.phoneNumber,
      lastActivity: status.lastActivity || state?.lastActivity,
      sessionId: state?.sessionId,
      qrCode: state?.currentQR,
    },
  };
}

async function liteStatusWithDb(userId: string) {
  const memory = liteStatus(userId);
  if (memory.data.connected && memory.data.phoneNumber) return memory;
  const db = await whatsappLiteService.getConnectionStatusFromDB(userId);
  if (db.phoneNumber && !memory.data.phoneNumber) {
    return {
      success: true,
      data: {
        ...memory.data,
        phoneNumber: db.phoneNumber,
        lastActivity: db.lastActivity || memory.data.lastActivity,
      },
    };
  }
  return memory;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/socket.io')) {
    return;
  }

  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (url.pathname === '/health') {
    json(res, 200, { ok: true });
    return;
  }

  if (!isAuthorized(req)) {
    unauthorized(res);
    return;
  }

  try {
    if (req.method === 'POST' && url.pathname === '/connect') {
      const body = await readBody(req);
      const userId = String(body.userId || req.headers['x-user-id'] || '');
      if (!userId) {
        json(res, 400, { success: false, error: 'userId requerido' });
        return;
      }
      const result = await whatsappLiteService.connect(userId);
      const { waitForLiteQr, toQrDataUrl } = await import('../src/lib/whatsapp/qrUtils');
      const qrCode =
        (await waitForLiteQr(() => whatsappLiteService.getCurrentState(userId)?.currentQR)) ||
        (await toQrDataUrl(result.qrCode));
      json(res, result.success ? 200 : 500, {
        success: result.success,
        data: {
          connected: Boolean(result.data?.connected),
          sessionId: result.sessionId || result.data?.sessionId,
          qrCode,
          message: result.data?.message || result.error,
          phoneNumber: whatsappLiteService.getConnectionStatus().phoneNumber,
        },
        error: result.error,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      const userId = String(url.searchParams.get('userId') || req.headers['x-user-id'] || '');
      json(res, 200, await liteStatusWithDb(userId));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/send') {
      const body = await readBody(req);
      const to = String(body.to || '');
      const message = String(body.message || '');
      const userId = String(body.userId || req.headers['x-user-id'] || '');
      const type = String(body.type || 'text');
      const filePath = body.filePath ? String(body.filePath) : undefined;
      const mimetype = body.mimetype ? String(body.mimetype) : undefined;
      const fileName = body.fileName ? String(body.fileName) : undefined;
      if (!to || (!message && !filePath)) {
        json(res, 400, { success: false, error: 'to y message o filePath requeridos' });
        return;
      }
      if (!whatsappLiteService.hasLiveSocket() && userId) {
        await whatsappLiteService.connect(userId);
        await whatsappLiteService.waitUntilConnected(25000);
      }
      if (!whatsappLiteService.hasLiveSocket()) {
        json(res, 503, { success: false, error: 'WhatsApp Lite no está conectado' });
        return;
      }
      const sent = await whatsappLiteService.sendMessage(to, message, {
        type,
        filePath,
        mimetype,
        fileName,
      });
      json(res, sent.success ? 200 : 503, {
        success: sent.success,
        waMessageId: sent.waMessageId,
        error: sent.success ? undefined : 'No se pudo enviar el mensaje',
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/disconnect') {
      const body = await readBody(req);
      const userId = String(body.userId || req.headers['x-user-id'] || '');
      // Desconectar desde la app significa desvincular: si quedan credenciales,
      // el siguiente connect reutiliza la sesión y nunca muestra el QR.
      if (userId) {
        await whatsappLiteService.resetSession(userId);
      } else {
        await whatsappLiteService.disconnect();
      }
      json(res, 200, { success: true, message: 'WhatsApp Lite desconectado' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/resolve-peer') {
      const body = await readBody(req);
      const userId = String(body.userId || req.headers['x-user-id'] || '');
      const jid = String(body.jid || body.to || '');
      if (!jid) {
        json(res, 400, { success: false, error: 'jid requerido' });
        return;
      }
      if (!whatsappLiteService.hasLiveSocket() && userId) {
        await whatsappLiteService.connect(userId);
        await whatsappLiteService.waitUntilConnected(25000);
      }
      if (!whatsappLiteService.hasLiveSocket()) {
        json(res, 503, { success: false, error: 'WhatsApp Lite no está conectado' });
        return;
      }
      const peer = await whatsappLiteService.resolvePeer(jid, { timeoutMs: 8000 });
      json(res, 200, { success: true, ...peer });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/reset') {
      const body = await readBody(req);
      const userId = String(body.userId || req.headers['x-user-id'] || '');
      if (!userId) {
        json(res, 400, { success: false, error: 'userId requerido' });
        return;
      }
      await whatsappLiteService.resetSession(userId);
      json(res, 200, { success: true, message: 'Sesión reiniciada, pedí el QR de nuevo' });
      return;
    }

    json(res, 404, { success: false, error: 'Ruta no encontrada' });
  } catch (error) {
    json(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Error en worker',
    });
  }
});

io = new Server(server, {
  cors: {
    origin: corsOrigins.length ? corsOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join-user-room', (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      socket.emit('auth-error', { message: 'Usuario no válido' });
      return;
    }
    socket.join(`user-${userId}`);
    socket.emit('room-joined', { userId, room: `user-${userId}` });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WhatsApp worker listening on ${PORT}`);
  if (!APP_URL) {
    console.warn('APP_URL no está definida: los mensajes entrantes no se reenviarán a Vercel');
  }
  whatsappLiteService.restoreConnectedSessions().catch((error) => {
    console.error('❌ Error restaurando sesiones Lite al arrancar:', error);
  });
  startOutboxLoop();
});

async function sendOutboxRow(row: WhatsAppOutboxRow) {
  const userId = row.usuario_id;
  if (!whatsappLiteService.hasLiveSocket() && userId) {
    await whatsappLiteService.connect(userId);
    await whatsappLiteService.waitUntilConnected(25000);
  }
  if (!whatsappLiteService.hasLiveSocket()) {
    return { success: false, error: 'WhatsApp Lite no está conectado' };
  }
  try {
    const sent = await whatsappLiteService.sendMessage(row.to_jid, row.contenido, {
      type: row.message_type,
      filePath: row.file_url || undefined,
      mimetype: row.mimetype || undefined,
      fileName: row.file_name || undefined,
    });
    return {
      success: sent.success,
      waMessageId: sent.waMessageId,
      error: sent.success ? undefined : 'No se pudo enviar el mensaje',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error enviando WhatsApp';
    return { success: false, error: message };
  }
}

function startOutboxLoop() {
  const tick = async () => {
    try {
      const result = await processOutboxBatch(getSupabaseAdmin(), sendOutboxRow, 10);
      if (result.processed > 0) {
        console.log(`📬 Outbox: procesados ${result.processed}, enviados ${result.sent}`);
      }
    } catch (error) {
      console.error('❌ Loop outbox:', error);
    }
  };
  setInterval(tick, 2000);
  tick();
}
