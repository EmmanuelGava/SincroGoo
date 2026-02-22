'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWhatsAppStorage } from '@/lib/whatsapp-storage';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Chip, 
  Typography, 
  Box, 
  Stack,
  Divider
} from '@mui/material';

export default function WhatsAppStorageDebug() {
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const storage = useWhatsAppStorage(session?.user?.id || '');

  const refreshDebugInfo = () => {
    setDebugInfo(storage.debugInfo);
  };

  useEffect(() => {
    if (session?.user?.id) {
      refreshDebugInfo();
    }
  }, [session?.user?.id]);

  if (!session?.user?.id) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setIsVisible(!isVisible)}
        sx={{ mb: 2 }}
      >
        {isVisible ? 'Ocultar' : 'Mostrar'} Debug Storage
      </Button>

      {isVisible && (
        <Card sx={{ border: '2px dashed #e0e0e0' }}>
          <CardHeader sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                WhatsApp Storage Debug
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={refreshDebugInfo}
              >
                🔄 Actualizar
              </Button>
            </Box>
          </CardHeader>
          <CardContent>
            <Stack spacing={2}>
              {debugInfo ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Estado:</Typography>
                    <Chip 
                      label={debugInfo.hasCredentials ? 'Con credenciales' : 'Sin credenciales'}
                      color={debugInfo.hasCredentials ? 'primary' : 'default'}
                      size="small"
                    />
                    {debugInfo.expired && (
                      <Chip label="Expirado" color="error" size="small" />
                    )}
                  </Box>

                  {debugInfo.hasCredentials && (
                    <>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Session ID:</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {debugInfo.sessionId}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Teléfono:</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {debugInfo.phoneNumber || 'No disponible'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Antigüedad:</Typography>
                          <Typography variant="caption">{debugInfo.age}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Timestamp:</Typography>
                          <Typography variant="caption">{debugInfo.timestamp}</Typography>
                        </Box>
                      </Box>

                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Credenciales:</Typography>
                          <Chip 
                            label={debugInfo.hasCreds ? '✅' : '❌'}
                            color={debugInfo.hasCreds ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>Keys:</Typography>
                          <Chip 
                            label={debugInfo.hasKeys ? '✅' : '❌'}
                            color={debugInfo.hasKeys ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </Stack>

                      {debugInfo.credsKeys && debugInfo.credsKeys.length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Claves disponibles:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {debugInfo.credsKeys.slice(0, 5).map((key: string) => (
                              <Chip key={key} label={key} variant="outlined" size="small" />
                            ))}
                            {debugInfo.credsKeys.length > 5 && (
                              <Chip 
                                label={`+${debugInfo.credsKeys.length - 5} más`} 
                                variant="outlined" 
                                size="small" 
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                    </>
                  )}

                  <Divider />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        storage.clearCredentials();
                        refreshDebugInfo();
                      }}
                    >
                      🧹 Limpiar Storage
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        console.log('WhatsApp Storage Debug:', debugInfo);
                      }}
                    >
                      📋 Log a Consola
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Cargando información de debug...
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}