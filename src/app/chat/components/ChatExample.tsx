'use client';

import { useState } from 'react';
import { Button } from '@/app/componentes/ui/button';
import { Input } from '@/app/componentes/ui/input';
import { Textarea } from '@/app/componentes/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/componentes/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/componentes/ui/card';
import { toast } from '@/hooks/use-toast';

/**
 * Componente de ejemplo para mostrar cómo usar la nueva arquitectura unificada
 * El frontend no necesita saber si es WhatsApp Lite, Business, Telegram, etc.
 */
export default function ChatExample() {
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram' | 'email'>('whatsapp');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!to || !message) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          to,
          message,
          messageType: 'text'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Mensaje enviado",
          description: `Mensaje enviado exitosamente via ${platform}`,
        });
        setMessage('');
      } else {
        toast({
          title: "❌ Error",
          description: result.error || 'Error enviando mensaje',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast({
        title: "❌ Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlatformPlaceholder = () => {
    switch (platform) {
      case 'whatsapp':
        return '5491171277796';
      case 'telegram':
        return '@username o 123456789';
      case 'email':
        return 'usuario@ejemplo.com';
      default:
        return '';
    }
  };

  const getPlatformDescription = () => {
    switch (platform) {
      case 'whatsapp':
        return 'Enviar mensaje via WhatsApp (Lite o Business)';
      case 'telegram':
        return 'Enviar mensaje via Telegram Bot';
      case 'email':
        return 'Enviar mensaje via Email';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>💬 Enviar Mensaje</CardTitle>
        <CardDescription>
          Arquitectura unificada - El frontend no necesita saber la implementación específica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selección de plataforma */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Plataforma</label>
          <Select value={platform} onValueChange={(value: any) => setPlatform(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
              <SelectItem value="telegram">📨 Telegram</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {getPlatformDescription()}
          </p>
        </div>

        {/* Destinatario */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Destinatario</label>
          <Input
            placeholder={getPlatformPlaceholder()}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {/* Mensaje */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mensaje</label>
          <Textarea
            placeholder="Escribe tu mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {/* Botón de envío */}
        <Button 
          onClick={handleSendMessage} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Enviando...' : `Enviar via ${platform}`}
        </Button>

        {/* Información adicional */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔧 <strong>Beneficios de esta arquitectura:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Frontend simplificado - solo especifica plataforma</li>
            <li>Backend detecta automáticamente Lite vs Business</li>
            <li>Fácil agregar nuevas plataformas</li>
            <li>Manejo centralizado de errores</li>
            <li>Logging y métricas unificadas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 