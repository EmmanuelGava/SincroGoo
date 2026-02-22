'use client';

import React, { useState } from 'react';
import { AlertTriangle, Phone, User, Clock, X } from 'lucide-react';

interface ActiveConnection {
  sessionId: string;
  phoneNumber: string;
  status: string;
  lastActivity: string;
  createdAt: string;
  user: {
    email?: string;
    nombre?: string;
  };
}

interface PhoneNumberWarningProps {
  phoneNumber: string;
  activeConnections: ActiveConnection[];
  onContinue: () => void;
  onCancel: () => void;
  onForceDisconnect: () => void;
}

export default function PhoneNumberWarning({
  phoneNumber,
  activeConnections,
  onContinue,
  onCancel,
  onForceDisconnect
}: PhoneNumberWarningProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleForceDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onForceDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Número ya conectado
              </h3>
              <p className="text-sm text-gray-500">
                Este número de WhatsApp ya tiene conexiones activas
              </p>
            </div>
          </div>

          {/* Phone Number */}
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-amber-600 mr-2" />
              <span className="font-medium text-amber-800">{phoneNumber}</span>
            </div>
          </div>

          {/* Active Connections */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Conexiones activas ({activeConnections.length}):
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activeConnections.map((connection, index) => (
                <div key={connection.sessionId} className="p-2 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-600">
                        {connection.user.email || connection.user.nombre || 'Usuario desconocido'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">
                        {formatDate(connection.lastActivity)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Sesión: {connection.sessionId.substring(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>⚠️ Advertencia:</strong> Conectar este número desconectará automáticamente 
              las otras sesiones activas. Esto puede interrumpir el servicio para otros usuarios.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancelar
            </button>
            
            <button
              onClick={handleForceDisconnect}
              disabled={isDisconnecting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline mr-1"></div>
                  Desconectando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Desconectar y continuar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}