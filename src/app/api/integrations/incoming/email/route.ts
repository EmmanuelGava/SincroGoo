import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmailMessage } from '../handlers/email-handler';

// Endpoint para recibir webhooks de Email
export async function POST(req: NextRequest) {
  // 1. Leer el body del webhook
  // const body = await req.json();

  // 2. Normalizar el mensaje usando el handler
  // const mensajeNormalizado = normalizeEmailMessage(body);

  // 3. Buscar o crear el lead correspondiente (por implementar)
  // 4. Guardar la conversación en la base de datos (por implementar)

  // 5. Responder al servicio de email
  return NextResponse.json({ status: 'ok' });
} 