import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { initSocket, getSocket, disconnectSocket } from '@/lib/socket';
import PhoneNumberWarning from './PhoneNumberWarning';
import WhatsAppStorageDebug from './WhatsAppStorageDebug';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  TextField,
  DialogActions
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCodeIcon from '@mui/icons-material/QrCode';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MessageIcon from '@mui/icons-material/Message';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import { toast } from '@/hooks/use-toast';

interface WhatsAppConnectProps {
  onConnected: (config: any) => void;
}

export default function WhatsAppConnect({ onConnected }: WhatsAppConnectProps) {
  const { data: session } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [connectionType, setConnectionType] = useState<'business' | 'lite'>('lite');
  const [qrCode, setQrCode] = useState<string | null>(null);
  // ✅ SOLUCIÓN: Inicializar connectionStatus con un estado por defecto
  const [connectionStatus, setConnectionStatus] = useState<any>({
    connected: false,
    phoneNumber: null,
    lastActivity: null
  });
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [cleaningSessions, setCleaningSessions] = useState(false);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);
  const [duplicatePhoneData, setDuplicatePhoneData] = useState<{
    phoneNumber: string;
    activeConnections: any[];
  } | null>(null);

  // ✅ SOLUCIÓN: Socket.IO solo se inicializa cuando se conecta WhatsApp
  const [socketInitialized, setSocketInitialized] = useState(false);
  const notifiedConnected = useRef(false);

  // Función para inicializar Socket.IO solo cuando sea necesario
  const initializeSocketIO = useCallback(() => {
    if (socketInitialized) {
      console.log('🔌 Socket.IO ya está inicializado');
      return;
    }

    if (!session?.user?.id) {
      console.log('⚠️ No hay sesión de usuario, no se puede inicializar Socket.IO');
      return;
    }
    
    console.log('🔍 Inicializando Socket.IO solo para WhatsApp...');

    try {
      console.log('🔌 Inicializando Socket.IO para WhatsApp...');
      const socket = initSocket();
      setSocketInitialized(true);
      
      // ✅ SOLUCIÓN: Verificar que el socket esté conectado
      if (!socket.connected) {
        console.log('⚠️ Socket.IO no está conectado, esperando conexión...');
        socket.on('connect', () => {
          console.log('✅ Socket.IO conectado, uniendo usuario a sala...');
          if (session.user.id) {
            joinUserToRoom(socket, session.user.id);
          }
        });
      } else {
        console.log('✅ Socket.IO ya está conectado, uniendo usuario a sala...');
        if (session.user.id) {
          joinUserToRoom(socket, session.user.id);
        }
      }
      
      // ✅ SOLUCIÓN: Escuchar eventos de WhatsApp con verificación de conexión
      const setupWhatsAppListeners = () => {
        console.log('🔧 Configurando listeners de WhatsApp...');
        
        // ✅ SOLUCIÓN: Unir usuario a su sala ANTES de configurar listeners
        if (session?.user?.id) {
          joinUserToRoom(socket, session.user.id);
        } else {
          console.log('⚠️ [Frontend] No hay session.user.id disponible para unir a sala');
        }

        socket.on('whatsapp-status', (data: any) => {
          console.log('📡 Estado de WhatsApp actualizado via Socket.IO:', data);
          
          if (data.connected && data.phoneNumber) {
            console.log('📡 Estado actualizado (conectado):', data);
            setConnectionStatus({
              connected: true,
              phoneNumber: data.phoneNumber,
              lastActivity: data.lastActivity || new Date()
            });
            setStep(3);
            setQrCode(null);
            setShowQRDialog(false);
            notifiedConnected.current = true;
            onConnected({
              tipo_conexion: 'lite',
              session_id: 'connected',
              phone_number: data.phoneNumber,
              status: 'connected'
            });
          } else {
            console.log('📡 Estado actualizado (no conectado):', data);
            // No pisar un estado ya conectado con updates transitorios (connecting / 515).
            setConnectionStatus((prev: { connected?: boolean; phoneNumber?: string | null }) => {
              if (prev?.connected && prev.phoneNumber) return prev;
              return {
                connected: false,
                phoneNumber: null,
                lastActivity: null
              };
            });
          }
        });

        socket.on('whatsapp-qr', (data: { qrCode: string; sessionId: string }) => {
          console.log('📱 [Frontend] QR code recibido via Socket.IO');
          console.log('📱 [Frontend] Datos del QR:', {
            qrCodeLength: data.qrCode ? data.qrCode.length : 0,
            sessionId: data.sessionId,
            hasQrCode: !!data.qrCode,
            qrCodePreview: data.qrCode ? data.qrCode.substring(0, 50) + '...' : 'No QR'
          });
          
          if (data.qrCode) {
            console.log('📱 [Frontend] Estableciendo QR code en el estado...');
            setQrCode(data.qrCode);
            setStep(1);
            setShowQRDialog(true);
            console.log('📱 [Frontend] QR code establecido, modal abierto');
          } else {
            console.log('⚠️ [Frontend] QR code está vacío o undefined');
          }
        });

        socket.on('whatsapp-connected', (data: { phoneNumber: string }) => {
          console.log('🎉 WhatsApp conectado via Socket.IO:', data.phoneNumber);
          setConnectionStatus({
            connected: true,
            phoneNumber: data.phoneNumber,
            lastActivity: new Date()
          });
          setStep(3);
          setQrCode(null);
          setShowQRDialog(false);
          
          onConnected({
            tipo_conexion: 'lite',
            session_id: 'connected',
            phone_number: data.phoneNumber,
            status: 'connected'
          });
        });

        socket.on('whatsapp-message', (data: any) => {
          console.log('📨 Mensaje recibido via Socket.IO:', data);
        });
      };

      // Configurar listeners cuando el socket se conecte
      if (socket.connected) {
        setupWhatsAppListeners();
      } else {
        socket.on('connect', setupWhatsAppListeners);
      }

    } catch (error) {
      console.error('❌ Error inicializando Socket.IO:', error);
    }
  }, [session?.user?.id, socketInitialized, connectionStatus?.connected, connectionStatus?.phoneNumber, onConnected]);

  // ✅ SOLUCIÓN: Limpiar Socket.IO cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (socketInitialized) {
        console.log('🧹 Limpiando Socket.IO al desmontar componente...');
        const socket = getSocket();
        if (socket) {
          socket.off('whatsapp-status');
          socket.off('whatsapp-connected');
          socket.off('whatsapp-qr');
          socket.off('whatsapp-message');
          socket.off('connect');
        }
        setSocketInitialized(false);
      }
    };
  }, [socketInitialized]);

  // Verificar estado de WhatsApp (poll) para avanzar aunque se pierda el evento de Socket.IO
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', type: 'lite' }),
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const connected = Boolean(data?.data?.connected || data?.connected);
        const phoneNumber = data?.data?.phoneNumber || data?.phoneNumber;
        if (connected && phoneNumber && !notifiedConnected.current) {
          notifiedConnected.current = true;
          setConnectionStatus({
            connected: true,
            phoneNumber,
            lastActivity: data?.data?.lastActivity || new Date(),
          });
          setStep(3);
          setQrCode(null);
          setShowQRDialog(false);
          onConnected({
            tipo_conexion: 'lite',
            session_id: data?.data?.sessionId || 'connected',
            phone_number: phoneNumber,
            status: 'connected',
          });
        }
      } catch {
        // el poll reintenta
      }
    };

    checkStatus();
    const id = setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.user?.id, onConnected]);

  // ✅ SOLUCIÓN: Monitorear cambios en el estado del QR
  useEffect(() => {
    console.log('📱 [Frontend] Estado del QR actualizado:', {
      hasQrCode: !!qrCode,
      qrCodeLength: qrCode ? qrCode.length : 0,
      showQRDialog,
      step
    });
  }, [qrCode, showQRDialog, step]);

  // ✅ SOLUCIÓN: Función para unir usuario a sala
  const joinUserToRoom = (socket: any, userId: string) => {
    try {
      console.log('🔍 [Frontend] Intentando unir usuario a sala:', userId);
      
      if (!socket || !socket.connected) {
        console.log('⚠️ [Frontend] Socket no está conectado');
        return;
      }
      
      if (!userId) {
        console.log('⚠️ [Frontend] userId no válido:', userId);
        return;
      }
      
      // Unir al usuario a su sala personal
      socket.emit('join-user-room', userId);
      console.log('✅ [Frontend] Solicitud de unión a sala enviada para usuario:', userId);
      
      // Escuchar confirmación
      socket.once('room-joined', (data: any) => {
        console.log('✅ [Frontend] Usuario unido exitosamente a sala:', data);
      });
      
      // Escuchar errores de autenticación
      socket.once('auth-error', (error: any) => {
        console.error('❌ [Frontend] Error de autenticación Socket.IO:', error);
      });
      
    } catch (error) {
      console.error('❌ [Frontend] Error uniendo usuario a sala:', error);
    }
  };

  const businessSteps = [
    'Autorizar WhatsApp Business',
    'Seleccionar número de teléfono',
    'Configurar webhook',
    'Completar conexión'
  ];

  const liteSteps = [
    'Generar código QR',
    'Escanear con WhatsApp',
    'Verificar conexión',
    'Completar configuración'
  ];

  const steps = connectionType === 'business' ? businessSteps : liteSteps;

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setStep(0);

    try {
      if (connectionType === 'business') {
        await handleBusinessConnect();
      } else {
        await handleLiteConnect();
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      setError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setConnecting(false);
    }
  };

  const handleBusinessConnect = async () => {
    // 1. Iniciar flujo OAuth de WhatsApp Business
    const authUrl = await initiateWhatsAppOAuth();
    
    // 2. Abrir ventana de autorización
    const authWindow = window.open(
      authUrl,
      'whatsapp-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    // 3. Escuchar el callback
    const result = await waitForAuthCallback(authWindow);
    
    if (result.success) {
      setStep(3);
      onConnected({
        ...result.config,
        tipo_conexion: 'business'
      });
    } else {
      throw new Error(result.error);
    }
  };

  const handleLiteConnect = async () => {
    setStep(0);
    // ✅ SOLUCIÓN: Usar estado por defecto en lugar de null
    setConnectionStatus({
      connected: false,
      phoneNumber: null,
      lastActivity: null
    });
    setQrCode(null);
    
    try {
      // ✅ SOLUCIÓN: Inicializar Socket.IO solo cuando se intenta conectar
      console.log('🔌 Inicializando Socket.IO para la conexión de WhatsApp...');
      initializeSocketIO();
      
      // Esperar un momento para que Socket.IO se conecte
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 1. Primero verificar si ya está conectado
      console.log('🔍 Verificando estado actual de WhatsApp Lite...');
      const statusResponse = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'status',
          type: 'lite'
        })
      });

      if (statusResponse.status === 503) {
        const statusData = await statusResponse.json().catch(() => ({}));
        throw new Error(statusData.error || 'Worker de WhatsApp no disponible. En producción Railway tiene que estar encendido.');
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('📊 Estado actual:', statusData);
        
        if (statusData.success && statusData.data?.connected) {
          console.log('🎉 WhatsApp ya está conectado!');
          setStep(3);
          setConnectionStatus(statusData.data);
          onConnected({
            tipo_conexion: 'lite',
            session_id: statusData.data.sessionId || 'connected',
            phone_number: statusData.data.phoneNumber || 'Conectado',
            status: 'connected'
          });
          return;
        }
      }

      // 2. Si no está conectado, intentar conectar
      console.log('🔄 WhatsApp no está conectado, iniciando conexión...');
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'connect',
          type: 'lite'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error conectando WhatsApp Lite');
      }

      const responseData = await response.json();
      console.log('📡 Respuesta de conexión:', responseData);
      console.log('🔍 Debugging respuesta:');
      console.log('  - success:', responseData.success);
      console.log('  - data:', responseData.data);
      console.log('  - data keys:', responseData.data ? Object.keys(responseData.data) : 'data es null/undefined');
      
      // ✅ SOLUCIÓN: Acceder a la estructura anidada correctamente
      const actualData = responseData.data?.data || responseData.data;
      console.log('  - actualData:', actualData);
      console.log('  - sessionId:', actualData?.sessionId);
      console.log('  - connected:', actualData?.connected);
      console.log('  - message:', actualData?.message);
      console.log('  - data completo:', JSON.stringify(actualData, null, 2));
      
      // ✅ SOLUCIÓN: Verificar si la conexión se inició correctamente
      if (responseData.success && actualData?.sessionId) {
        console.log('✅ Conexión iniciada exitosamente');
        console.log('📡 Datos de respuesta:', responseData.data);
        
        // Si ya está conectado, actualizar estado inmediatamente
        if (responseData.data?.connected) {
          console.log('🎉 ¡Ya conectado!');
          setConnectionStatus({
            connected: true,
            phoneNumber: responseData.data.phoneNumber,
            lastActivity: new Date()
          });
          setStep(3);
          setShowQRDialog(false);
          
          onConnected({
            tipo_conexion: 'lite',
            session_id: 'connected',
            phone_number: responseData.data.phoneNumber,
            status: 'connected'
          });
        } else {
          console.log('⏳ Conexión iniciada, esperando QR code...');
          console.log('📱 SessionId:', actualData.sessionId);

          if (actualData.qrCode) {
            console.log('📱 QR recibido en respuesta HTTP');
            setQrCode(actualData.qrCode);
          }

          setShowQRDialog(true);
          setStep(1);
          setIsPolling(true);
          pollConnectionStatus();
        }
      } else {
        console.log('❌ No se pudo iniciar la conexión');
        console.log('📡 Respuesta completa:', responseData);
        throw new Error('No se pudo iniciar la conexión');
      }
      
    } catch (error) {
      console.error('❌ Error en handleLiteConnect:', error);
      // Mostrar error pero permitir reintento
      setStep(0);
      setIsPolling(false); // Desactivar polling en caso de error
      throw error;
    }
  };

  const pollConnectionStatus = useCallback(async () => {
    console.log('⚠️ Polling DESHABILITADO temporalmente para debugging');
    return;
    
    // CÓDIGO ORIGINAL COMENTADO
    /*
    // Solo detener si ya estamos conectados (step === 3) o no estamos polling
    if (step === 3 || !isPolling) {
      console.log('✅ Polling detenido - Ya conectado o polling desactivado');
      return;
    }

    try {
      console.log('🔍 Verificando estado de conexión...');
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'status',
          type: 'lite'
        })
      });
      if (!response.ok) {
        console.log('❌ Error en respuesta del servidor:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📡 Respuesta completa del servidor:', data);
      
      if (data.success && data.data) {
        const newStatus = data.data;
        console.log('📊 Estado procesado:', newStatus);
        
        // Si se conectó exitosamente
        if (newStatus.connected) {
          console.log('🎉 ¡WhatsApp detectado como conectado!');
          console.log('📱 Número:', newStatus.phoneNumber);
          console.log('🕐 Última actividad:', newStatus.lastActivity);
          console.log('🔄 Cerrando QR dialog y actualizando UI...');
          
          setConnectionStatus(newStatus);
          setStep(3); // Paso de éxito
          setShowQRDialog(false);
          setIsPolling(false); // Desactivar polling
          const configData = {
            tipo_conexion: 'lite',
            session_id: 'connected',
            phone_number: newStatus.phoneNumber || 'Conectado',
            status: 'connected',
            fecha_conexion: new Date().toISOString()
          };
          console.log('📤 Llamando onConnected con:', configData);
          onConnected(configData);
          console.log('✅ Conexión completada, polling detenido');
          return; // Detener polling
        } else {
          // Actualizar estado pero continuar polling
          console.log('📊 Aún no conectado, estado actual:', newStatus);
          console.log('🔄 Continuando polling en 1 segundo...');
          setConnectionStatus(newStatus);
        }
      }
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
    }

    // Continuar polling mientras esté activo y no conectado
    if (isPolling && step !== 3) {
      setTimeout(pollConnectionStatus, 1000); // Polling cada 1 segundo
    }
    */
  }, [showQRDialog, onConnected]);

  const initiateWhatsAppOAuth = async (): Promise<string> => {
    const res = await fetch('/api/integrations/whatsapp/oauth/init', {
      method: 'POST'
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    return data.authUrl;
  };

  const waitForAuthCallback = (authWindow: Window | null): Promise<any> => {
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          reject(new Error('Autorización cancelada'));
        }
      }, 1000);

      // Escuchar mensaje del callback
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'whatsapp-auth-success') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          authWindow?.close();
          resolve(event.data);
        } else if (event.data.type === 'whatsapp-auth-error') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          authWindow?.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
    });
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError(null);
    setStep(0);

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'disconnect',
          type: 'lite'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconectando WhatsApp Lite');
      }

      const data = await response.json();
      setConnectionStatus(null);
      setQrCode(null);
      setShowQRDialog(false);
      setStep(0);
      onConnected({
        tipo_conexion: 'lite',
        session_id: null,
        phone_number: null,
        status: 'disconnected'
      });
    } catch (error) {
      console.error('Error desconectando WhatsApp:', error);
      setError(error instanceof Error ? error.message : 'Error desconectando');
    } finally {
      setConnecting(false);
    }
  };

  const handleCleanSessions = async () => {
    try {
      setCleaningSessions(true);
      console.log('🧹 Iniciando limpieza de sesiones...');

      const response = await fetch('/api/whatsapp/clean-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error limpiando sesiones');
      }

      const data = await response.json();
      console.log('✅ Sesiones limpiadas:', data);
      
      setSessionStats(data.stats);
      
      // Mostrar mensaje de éxito
      alert('Sesiones limpiadas correctamente');
      
    } catch (error) {
      console.error('❌ Error limpiando sesiones:', error);
      alert('Error limpiando sesiones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setCleaningSessions(false);
    }
  };

  const handleGetSessionStats = async () => {
    try {
      console.log('📊 Obteniendo estadísticas de sesiones...');

      const response = await fetch('/api/whatsapp/clean-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error obteniendo estadísticas');
      }

      const data = await response.json();
      console.log('📈 Estadísticas obtenidas:', data);
      
      setSessionStats(data.stats);
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      alert('Error obteniendo estadísticas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send',
          type: 'lite',
          to: testPhone,
          message: testMessage,
          messageType: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error enviando mensaje de prueba');
      }

      const data = await response.json();
      alert('Mensaje de prueba enviado con éxito!');
      console.log('Mensaje de prueba enviado:', data);
    } catch (error) {
      console.error('Error enviando mensaje de prueba:', error);
      setError(error instanceof Error ? error.message : 'Error enviando mensaje de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  const handleCleanTempFiles = async () => {
    try {
      console.log('🧹 Limpiando archivos temporales...');
      
      const response = await fetch('/api/whatsapp/cleanup-temp-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Archivos temporales limpiados:', data);
        
        // Mostrar notificación de éxito
        toast({
          title: "Limpieza completada",
          description: "Los archivos temporales han sido eliminados exitosamente.",
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Error limpiando archivos temporales:', errorData);
        
        toast({
          title: "Error en limpieza",
          description: errorData.details || "Error limpiando archivos temporales",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error en handleCleanTempFiles:', error);
      
      toast({
        title: "Error en limpieza",
        description: "Error inesperado limpiando archivos temporales",
        variant: "destructive",
      });
    }
  };

  const handleReconnect = async () => {
    try {
      console.log('🔄 Reconectando WhatsApp...');
      
      const response = await fetch('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Reconexión iniciada:', data);
        
        // Mostrar notificación de éxito
        toast({
          title: "Reconexión iniciada",
          description: "Se está intentando reconectar WhatsApp. Revisa el QR code.",
        });
        
        // ✅ SOLUCIÓN: Actualizar estado local con verificación de null
        if (data.status) {
          setConnectionStatus(data.status);
        } else {
          // Si no hay status, establecer un estado por defecto
          setConnectionStatus({
            connected: false,
            phoneNumber: null,
            lastActivity: null
          });
        }
        
      } else {
        const errorData = await response.json();
        console.error('❌ Error en reconexión:', errorData);
        
        toast({
          title: "Error en reconexión",
          description: errorData.details || "Error reconectando WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error en handleReconnect:', error);
      
      toast({
        title: "Error en reconexión",
        description: "Error inesperado reconectando WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleVerifyStatus = async () => {
    try {
      console.log('🔍 Verificando estado real de WhatsApp...');
      
      const response = await fetch('/api/whatsapp/verify-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Estado real vs reportado:', data);
        
        // Mostrar notificación con el resultado
        if (data.isConsistent) {
          toast({
            title: "Estado consistente",
            description: `WhatsApp está ${data.realStatus.isReallyConnected ? 'conectado' : 'desconectado'} correctamente.`,
          });
        } else {
          toast({
            title: "Estado inconsistente",
            description: `Reportado: ${data.reportedStatus.connected ? 'Conectado' : 'Desconectado'}, Real: ${data.realStatus.isReallyConnected ? 'Conectado' : 'Desconectado'}`,
            variant: "destructive",
          });
        }
        
        // Actualizar estado local con el estado real
        if (data.realStatus.isReallyConnected) {
          setConnectionStatus({
            connected: true,
            phoneNumber: data.realStatus.phoneNumber,
            lastActivity: new Date()
          });
        } else {
          setConnectionStatus({
            connected: false,
            phoneNumber: null,
            lastActivity: null
          });
        }
        
      } else {
        const errorData = await response.json();
        console.error('❌ Error verificando estado:', errorData);
        
        toast({
          title: "Error verificando estado",
          description: errorData.details || "Error verificando estado de WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error en handleVerifyStatus:', error);
      
      toast({
        title: "Error verificando estado",
        description: "Error inesperado verificando estado de WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleVerifySocketIO = async () => {
    try {
      console.log('🔍 Verificando estado de Socket.IO...');
      
      const response = await fetch('/api/socketio/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Estado de Socket.IO:', data);
        
        // Mostrar notificación con el resultado
        if (data.socketServer.status === 'online') {
          toast({
            title: "Socket.IO Online",
            description: `Servidor Socket.IO está funcionando correctamente en ${data.socketServer.url}`,
          });
        } else {
          toast({
            title: "Socket.IO Offline",
            description: `Servidor Socket.IO no está disponible. ${data.recommendations.join(', ')}`,
            variant: "destructive",
          });
        }
        
      } else {
        const errorData = await response.json();
        console.error('❌ Error verificando Socket.IO:', errorData);
        
        toast({
          title: "Error verificando Socket.IO",
          description: errorData.details || "Error verificando estado de Socket.IO",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error en handleVerifySocketIO:', error);
      
      toast({
        title: "Error verificando Socket.IO",
        description: "Error inesperado verificando Socket.IO",
        variant: "destructive",
      });
    }
  };

  const handleCleanSocketIO = () => {
    try {
      console.log('🧹 Limpiando Socket.IO...');
      disconnectSocket();
      setSocketInitialized(false);
      
      toast({
        title: "Socket.IO Limpiado",
        description: "Socket.IO ha sido desconectado y limpiado",
      });
    } catch (error) {
      console.error('❌ Error limpiando Socket.IO:', error);
      
      toast({
        title: "Error limpiando Socket.IO",
        description: "Error inesperado limpiando Socket.IO",
        variant: "destructive",
      });
    }
  };

  const handleDebugConnection = async () => {
    try {
      console.log('🐛 Iniciando debug de conexión...');
      const response = await fetch('/api/whatsapp/debug-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🐛 Estado de conexión (debug):', data);
        toast({
          title: "Debug de Conexión",
          description: `Estado de conexión (debug): ${data.message}`,
        });
      } else {
        const errorData = await response.json();
        console.error('🐛 Error en debug de conexión:', errorData);
        toast({
          title: "Error de Debug",
          description: errorData.details || "Error en debug de conexión",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🐛 Error en handleDebugConnection:', error);
      toast({
        title: "Error de Debug",
        description: "Error inesperado en debug de conexión",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />
          <Box>
            <Typography variant="h6">WhatsApp</Typography>
            <Typography variant="body2" color="text.secondary">
              Conecta tu cuenta de WhatsApp
            </Typography>
          </Box>
        </Box>

        {/* Selector de tipo de conexión */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Conexión</InputLabel>
            <Select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as 'business' | 'lite')}
              disabled={connecting}
            >
              <MenuItem value="lite">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCodeIcon />
                  WhatsApp Lite (Personal)
                </Box>
              </MenuItem>
              <MenuItem value="business">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon />
                  WhatsApp Business API
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Información del tipo seleccionado */}
        <Box sx={{ mb: 2 }}>
          {connectionType === 'lite' ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="span">
                <strong>WhatsApp Lite:</strong> Conecta tu WhatsApp personal usando un código QR. 
                No requiere cuenta de negocio verificada.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="span">
                <strong>WhatsApp Business API:</strong> Conecta tu cuenta de WhatsApp Business verificada. 
                Requiere cuenta de negocio y permisos de administrador.
              </Typography>
            </Alert>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {connecting && (
          <Box sx={{ mb: 2 }}>
            <Stepper activeStep={step} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Estado conectado */}
        {connectionStatus && connectionStatus.connected && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CheckCircleOutlineIcon color="success" />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  WhatsApp {connectionType === 'lite' ? 'Lite' : 'Business'} Conectado
                </Typography>
                <Typography variant="body2" color="text.secondary" component="span">
                  Teléfono: {connectionStatus.phoneNumber || 'No disponible'}
                </Typography>
                <Typography variant="body2" color="text.secondary" component="span">
                  Última actividad: {connectionStatus.lastActivity 
                    ? new Date(connectionStatus.lastActivity).toLocaleString()
                    : 'No disponible'
                  }
                </Typography>
              </Box>
            </Stack>
            
            {/* Acciones disponibles cuando está conectado */}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Abrir chat o gestión de conversaciones
                  window.open('/chat', '_blank');
                }}
                startIcon={<MessageIcon />}
              >
                Gestionar Conversaciones
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={handleDisconnect}
                startIcon={<CancelIcon />}
              >
                Desconectar
              </Button>
            </Stack>
            
            {connectionType === 'lite' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" component="span">
                  <strong>WhatsApp Lite activo:</strong> Los mensajes entrantes se están sincronizando automáticamente con tu CRM. 
                  Asegúrate de mantener la ventana de WhatsApp Web abierta para recibir mensajes.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Test de envío de mensaje */}
        {connectionStatus && connectionStatus.connected && connectionType === 'lite' && (
          <Box sx={{ mt: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Prueba de Envío
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Número de teléfono (con código de país)"
                placeholder="+5491123456789"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                size="small"
                helperText="Formato: +[código país][número]"
              />
              <TextField
                label="Mensaje de prueba"
                placeholder="Hola, este es un mensaje de prueba desde Klosync"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                multiline
                rows={2}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleSendTestMessage}
                disabled={!testPhone || !testMessage || sendingTest}
                startIcon={sendingTest ? <CircularProgress size={16} /> : <SendIcon />}
              >
                {sendingTest ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
              </Button>
            </Stack>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={connecting ? <CircularProgress size={16} /> : <WhatsAppIcon />}
            onClick={handleConnect}
            disabled={connecting}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#1DA851' }
            }}
          >
            {connecting ? 'Conectando...' : `Conectar WhatsApp ${connectionType === 'lite' ? 'Lite' : 'Business'}`}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setShowInstructions(true)}
          >
            Ver Instrucciones
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={cleaningSessions ? <CircularProgress size={16} /> : <CancelIcon />}
            onClick={handleCleanSessions}
            disabled={cleaningSessions}
          >
            {cleaningSessions ? 'Limpiando...' : 'Limpiar Sesiones'}
          </Button>

          <Button
            variant="outlined"
            color="info"
            onClick={handleGetSessionStats}
          >
            Ver Estadísticas
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleCleanTempFiles}
            disabled={false} // No hay estado de limpieza de archivos temporales
          >
            Limpiar Archivos Temporales
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleReconnect}
            disabled={connectionStatus.connected}
          >
            Reconectar WhatsApp
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleVerifyStatus}
            disabled={false}
          >
            Verificar Estado Real
          </Button>

          <Button
            variant="outlined"
            color="info"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleVerifySocketIO}
            disabled={false}
          >
            Verificar Socket.IO
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<CancelIcon />}
            onClick={handleCleanSocketIO}
            disabled={!socketInitialized}
          >
            Limpiar Socket.IO
          </Button>

          <Button
            onClick={handleReconnect}
            variant="outlined"
            size="small"
            className="text-xs"
          >
            🔄 Reintentar Conexión
          </Button>

          <Button
            onClick={handleDebugConnection}
            variant="outlined"
            size="small"
            className="text-xs"
          >
            🐛 Debug Conexión
          </Button>
        </Box>

        {/* Mostrar estadísticas si están disponibles */}
        {sessionStats && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Estadísticas de Sesiones
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip 
                label={`Total: ${sessionStats.totalSessions}`} 
                color="default" 
                variant="outlined" 
              />
              <Chip 
                label={`Activas: ${sessionStats.activeSessions}`} 
                color="success" 
                variant="outlined" 
              />
              <Chip 
                label={`Expiradas: ${sessionStats.expiredSessions}`} 
                color="warning" 
                variant="outlined" 
              />
            </Stack>
          </Box>
        )}

        {/* Modal de instrucciones */}
        <Dialog 
          open={showInstructions} 
          onClose={() => setShowInstructions(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Cómo Conectar WhatsApp {connectionType === 'lite' ? 'Lite' : 'Business'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {connectionType === 'lite' ? (
                <>
                  <Alert severity="info">
                    <Typography variant="body2" component="span">
                      WhatsApp Lite te permite conectar tu WhatsApp personal usando un código QR.
                    </Typography>
                  </Alert>

                  <Typography variant="h6">Pasos para WhatsApp Lite:</Typography>
                  <Box component="ol" sx={{ pl: 2 }}>
                    <li>
                      <Typography variant="body2">
                        Haz clic en "Conectar WhatsApp Lite"
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Se generará un código QR en tu pantalla
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Abre WhatsApp en tu teléfono
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Ve a Configuración → Dispositivos Vinculados → Vincular un Dispositivo
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Escanea el código QR con tu teléfono
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        La conexión se completará automáticamente
                      </Typography>
                    </li>
                  </Box>

                  <Alert severity="warning">
                    <Typography variant="body2" component="span">
                      <strong>Nota:</strong>
                      <br />• Mantén tu teléfono conectado a internet
                      <br />• No cierres WhatsApp en tu teléfono
                      <br />• La sesión puede expirar si no se usa por mucho tiempo
                    </Typography>
                  </Alert>
                </>
              ) : (
                <>
                  <Alert severity="info">
                    <Typography variant="body2" component="span">
                      Para usar WhatsApp Business necesitas tener una cuenta verificada de WhatsApp Business.
                    </Typography>
                  </Alert>

                  <Typography variant="h6">Pasos para WhatsApp Business:</Typography>
                  <Box component="ol" sx={{ pl: 2 }}>
                    <li>
                      <Typography variant="body2">
                        Haz clic en "Conectar WhatsApp Business"
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Autoriza la aplicación en Meta Business
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        Selecciona tu número de WhatsApp Business
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        La configuración se completará automáticamente
                      </Typography>
                    </li>
                  </Box>

                  <Alert severity="warning">
                    <Typography variant="body2" component="span">
                      <strong>Requisitos:</strong>
                      <br />• Cuenta de WhatsApp Business verificada
                      <br />• Acceso a Meta Business Manager
                      <br />• Permisos de administrador en la cuenta
                    </Typography>
                  </Alert>
                </>
              )}
            </Box>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog 
          open={showQRDialog} 
          onClose={() => setShowQRDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <QrCodeIcon color="primary" />
              <Typography variant="h6">
                Conectar WhatsApp Lite
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {qrCode ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }} 
                />
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  1. Abre WhatsApp en tu móvil
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  2. Ve a Menú → Dispositivos vinculados
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  3. Escanea este código QR
                </Typography>
                
                {/* Estado de conexión */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    🔍 Esperando conexión...
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    El sistema detectará automáticamente cuando escanees el QR
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    Estado: {connectionStatus.connected ? 
                      '🟢 Conectado' : 
                      connectionStatus.error ? '🔴 ' + connectionStatus.error : '🟡 Conectando...'
                    }
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    Socket.IO: {socketInitialized ? '🟢 Inicializado' : '🔴 No inicializado'}
                  </Typography>
                  {connectionStatus.lastActivity && (
                    <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                      Última actividad: {new Date(connectionStatus.lastActivity).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Generando código QR...
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowQRDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                // Recargar QR
                handleLiteConnect();
              }}
              disabled={connecting}
            >
              Generar Nuevo QR
            </Button>
          </DialogActions>
        </Dialog>
        </CardContent>
      </Card>
      
      {/* Debug component - solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <WhatsAppStorageDebug />
      )}
    </>
  );
}