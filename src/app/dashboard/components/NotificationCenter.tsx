// Notification Center - Centro de notificaciones del dashboard
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Alert as MuiAlert,
  AlertTitle,
  Button,
  IconButton,
  Badge,
  FormControl,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from './mui-components';
import { NotificationCenterProps, NotificationEvent, Alert, Priority } from '../../../types/dashboard';

// =====================================================
// Componente principal del centro de notificaciones
// =====================================================

export function NotificationCenter({ 
  notifications, 
  alerts, 
  onNotificationRead, 
  onAlertDismiss 
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'notifications'>('all');
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  // =====================================================
  // Filtrar notificaciones y alertas
  // =====================================================

  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'important':
        filtered = filtered.filter(n => ['new_message', 'task_due'].includes(n.type));
        break;
      // 'all' no necesita filtro
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, filter]);

  const filteredAlerts = React.useMemo(() => {
    return alerts
      .filter(alert => !alert.dismissed)
      .sort((a, b) => {
        // Ordenar por prioridad y luego por timestamp
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [alerts]);

  // =====================================================
  // Contar elementos por categoría
  // =====================================================

  const counts = React.useMemo(() => {
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const activeAlerts = alerts.filter(a => !a.dismissed).length;
    
    return {
      all: notifications.length + alerts.length,
      notifications: notifications.length,
      alerts: activeAlerts,
      unread: unreadNotifications
    };
  }, [notifications, alerts]);

  // =====================================================
  // Render principal
  // =====================================================

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Centro de Notificaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {counts.unread > 0 ? `${counts.unread} sin leer` : 'Todo al día'}
          </Typography>
        </Box>

        {/* Filtros */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'important')}
            variant="outlined"
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="unread">Sin leer</MenuItem>
            <MenuItem value="important">Importantes</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabs */}
      <NotificationTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Contenido */}
      <Box>
        {activeTab === 'all' && (
          <AllNotifications 
            notifications={filteredNotifications}
            alerts={filteredAlerts}
            onNotificationRead={onNotificationRead}
            onAlertDismiss={onAlertDismiss}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsList 
            alerts={filteredAlerts}
            onAlertDismiss={onAlertDismiss}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsList 
            notifications={filteredNotifications}
            onNotificationRead={onNotificationRead}
          />
        )}
      </Box>

      {/* Estado vacío */}
      {((activeTab === 'all' && filteredNotifications.length === 0 && filteredAlerts.length === 0) ||
        (activeTab === 'alerts' && filteredAlerts.length === 0) ||
        (activeTab === 'notifications' && filteredNotifications.length === 0)) && (
        <EmptyState tab={activeTab} filter={filter} />
      )}

      {/* Acciones rápidas */}
      {counts.unread > 0 && (
        <QuickActions 
          unreadCount={counts.unread}
          onMarkAllRead={() => {
            notifications.forEach(n => {
              if (!n.read) {
                onNotificationRead(n.id);
              }
            });
          }}
        />
      )}
    </Box>
  );
}

// =====================================================
// Tabs de navegación
// =====================================================

interface NotificationTabsProps {
  activeTab: 'all' | 'alerts' | 'notifications';
  onTabChange: (tab: 'all' | 'alerts' | 'notifications') => void;
  counts: Record<string, number>;
}

function NotificationTabs({ activeTab, onTabChange, counts }: NotificationTabsProps) {
  const tabs = [
    { id: 'all', label: 'Todo', count: counts.all },
    { id: 'alerts', label: 'Alertas', count: counts.alerts, urgent: counts.alerts > 0 },
    { id: 'notifications', label: 'Notificaciones', count: counts.notifications }
  ] as const;

  const getTabIndex = (tabId: string) => {
    return tabs.findIndex(tab => tab.id === tabId);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs 
        value={getTabIndex(activeTab)} 
        onChange={(_, newValue) => onTabChange(tabs[newValue].id)}
        variant="fullWidth"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{tab.label}</Typography>
                {tab.count > 0 && (
                  <Chip
                    label={tab.count}
                    size="small"
                    color={'urgent' in tab && tab.urgent ? 'error' : 'default'}
                    sx={{ 
                      height: 20, 
                      fontSize: '0.75rem',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
              </Box>
            }
            sx={{ textTransform: 'none' }}
          />
        ))}
      </Tabs>
    </Box>
  );
}

// =====================================================
// Vista combinada (todas las notificaciones)
// =====================================================

function AllNotifications({ 
  notifications, 
  alerts, 
  onNotificationRead, 
  onAlertDismiss 
}: {
  notifications: NotificationEvent[];
  alerts: Alert[];
  onNotificationRead: (id: string) => void;
  onAlertDismiss: (id: string) => void;
}) {
  // Combinar y ordenar por timestamp
  const combined = [
    ...alerts.map(alert => ({ ...alert, itemType: 'alert' as const })),
    ...notifications.map(notification => ({ ...notification, itemType: 'notification' as const }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {combined.map((item) => (
        <Box key={item.id}>
          {item.itemType === 'alert' ? (
            <AlertCard 
              alert={item as Alert} 
              onDismiss={onAlertDismiss}
            />
          ) : (
            <NotificationCard 
              notification={item as NotificationEvent} 
              onRead={onNotificationRead}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

// =====================================================
// Lista de alertas
// =====================================================

function AlertsList({ alerts, onAlertDismiss }: {
  alerts: Alert[];
  onAlertDismiss: (id: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {alerts.map((alert) => (
        <AlertCard 
          key={alert.id}
          alert={alert} 
          onDismiss={onAlertDismiss}
        />
      ))}
    </Box>
  );
}

// =====================================================
// Lista de notificaciones
// =====================================================

function NotificationsList({ notifications, onNotificationRead }: {
  notifications: NotificationEvent[];
  onNotificationRead: (id: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {notifications.map((notification) => (
        <NotificationCard 
          key={notification.id}
          notification={notification} 
          onRead={onNotificationRead}
        />
      ))}
    </Box>
  );
}

// =====================================================
// Card de alerta individual
// =====================================================

function AlertCard({ alert, onDismiss }: {
  alert: Alert;
  onDismiss: (id: string) => void;
}) {
  const getSeverity = (type: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <MuiAlert 
      severity={getSeverity(alert.type)}
      sx={{ 
        '& .MuiAlert-message': { width: '100%' },
        borderRadius: 2
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {alert.title}
          </Typography>
          <PriorityBadge priority={alert.priority} />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {alert.message}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(alert.timestamp)}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {alert.actionable && alert.action && (
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  if (alert.action?.callback) {
                    alert.action.callback();
                  } else if (alert.action?.url) {
                    window.open(alert.action.url, '_blank');
                  }
                }}
              >
                {alert.action.label}
              </Button>
            )}
            
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => onDismiss(alert.id)}
            >
              Descartar
            </Button>
          </Box>
        </Box>
      </Box>
    </MuiAlert>
  );
}

// =====================================================
// Card de notificación individual
// =====================================================

function NotificationCard({ notification, onRead }: {
  notification: NotificationEvent;
  onRead: (id: string) => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        bgcolor: notification.read ? 'grey.50' : 'primary.50',
        borderColor: notification.read ? 'grey.200' : 'primary.200',
        '&:hover': {
          bgcolor: notification.read ? 'grey.100' : 'primary.100',
          boxShadow: 1
        }
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <NotificationIcon type={notification.type} read={notification.read} />
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 'medium',
                  color: notification.read ? 'text.secondary' : 'text.primary'
                }}
              >
                {notification.title}
              </Typography>
              {!notification.read && (
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    bgcolor: 'primary.main', 
                    borderRadius: '50%',
                    flexShrink: 0
                  }} 
                />
              )}
            </Box>
            
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2,
                color: notification.read ? 'text.secondary' : 'text.primary'
              }}
            >
              {notification.message}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(notification.timestamp)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Componentes auxiliares
// =====================================================

function AlertIcon({ type }: { type: string }) {
  const getIconColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
        return 'info.main';
      case 'success':
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  const iconSx = { width: 20, height: 20, color: getIconColor(type) };
  
  switch (type) {
    case 'error':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </Box>
      );
    case 'warning':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </Box>
      );
    case 'info':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </Box>
      );
    case 'success':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </Box>
      );
    default:
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
        </Box>
      );
  }
}

function NotificationIcon({ type, read }: { type: string; read: boolean }) {
  const iconSx = { 
    width: 20, 
    height: 20, 
    color: read ? 'grey.400' : 'primary.main' 
  };
  
  switch (type) {
    case 'new_message':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </Box>
      );
    case 'task_due':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </Box>
      );
    case 'lead_update':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </Box>
      );
    case 'system_alert':
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </Box>
      );
    default:
      return (
        <Box component="svg" sx={iconSx} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
        </Box>
      );
  }
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = {
    urgent: { color: 'error', label: 'Urgente' },
    high: { color: 'warning', label: 'Alta' },
    medium: { color: 'info', label: 'Media' },
    low: { color: 'default', label: 'Baja' }
  } as const;

  const { color, label } = config[priority];

  return (
    <Chip
      label={label}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontSize: '0.75rem' }}
    />
  );
}

// =====================================================
// Estado vacío
// =====================================================

function EmptyState({ tab, filter }: { tab: string; filter: string }) {
  const messages = {
    all: 'No hay notificaciones ni alertas',
    alerts: 'No hay alertas activas',
    notifications: 'No hay notificaciones'
  };

  const filterMessages = {
    unread: 'No hay elementos sin leer',
    important: 'No hay elementos importantes',
    all: ''
  };

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Box 
        sx={{ 
          width: 48, 
          height: 48, 
          bgcolor: 'grey.100', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mx: 'auto',
          mb: 2
        }}
      >
        <Box sx={{ width: 24, height: 24, color: 'grey.400' }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          </svg>
        </Box>
      </Box>
      
      <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 1 }}>
        {filter !== 'all' ? filterMessages[filter as keyof typeof filterMessages] : messages[tab as keyof typeof messages]}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        {filter !== 'all' 
          ? 'Prueba cambiando el filtro para ver más elementos'
          : 'Las notificaciones y alertas aparecerán aquí cuando tengas actividad'
        }
      </Typography>
    </Box>
  );
}

// =====================================================
// Acciones rápidas
// =====================================================

function QuickActions({ unreadCount, onMarkAllRead }: {
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  return (
    <Box 
      sx={{ 
        bgcolor: 'primary.50', 
        border: 1, 
        borderColor: 'primary.200', 
        borderRadius: 2, 
        p: 2 
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.800' }}>
          {unreadCount} elementos sin leer
        </Typography>
        
        <Button
          size="small"
          variant="text"
          color="primary"
          onClick={onMarkAllRead}
          sx={{ fontWeight: 'medium' }}
        >
          Marcar todo como leído
        </Button>
      </Box>
    </Box>
  );
}

// =====================================================
// Función auxiliar
// =====================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Ahora';
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours}h`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays}d`;
  } else {
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}