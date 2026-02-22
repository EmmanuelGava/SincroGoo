const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Instancia global del servidor Socket.IO
let io = null;

// Función para inicializar Socket.IO
function initSocketIO(server) {
  if (!io) {
    console.log('🚀 Inicializando Socket.IO server...');
    
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('🔌 Cliente conectado:', socket.id);

      // ✅ SOLUCIÓN: Verificar autenticación antes de unir a sala
      socket.on('join-user-room', (userId) => {
        console.log(`🔍 [Socket.IO] Usuario ${userId} intentando unirse a su sala`);
        
        // ✅ SOLUCIÓN: Verificar que el userId sea válido
        if (!userId || typeof userId !== 'string' || userId.length < 10) {
          console.log(`❌ [Socket.IO] userId inválido: ${userId}`);
          socket.emit('auth-error', { message: 'Usuario no válido' });
          return;
        }
        
        // Unir al usuario a su sala personal
        socket.join(`user-${userId}`);
        console.log(`✅ [Socket.IO] Usuario ${userId} unido a su sala`);
        
        // Emitir confirmación
        socket.emit('room-joined', { userId, room: `user-${userId}` });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
      });
    });
  }

  return io;
}

// Función para emitir eventos a usuarios específicos
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
    console.log(`📡 Evento ${event} enviado a usuario ${userId}:`, data);
  }
}

// Función para emitir eventos a todos los usuarios
function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
    console.log(`📡 Evento ${event} enviado a todos los usuarios:`, data);
  }
}

// Exponer funciones globalmente para que puedan ser usadas desde otros módulos
global.emitToUser = emitToUser;
global.emitToAll = emitToAll;

// Preparar la aplicación Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Crear servidor HTTP
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Inicializar Socket.IO con el servidor HTTP
  initSocketIO(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('🚀 Socket.IO configurado en /api/socketio');
  });
}); 