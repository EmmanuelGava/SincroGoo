'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import WhatsAppConnect from '@/app/configuracion/mensajeria/components/WhatsAppConnect';

const STEPS = [
  {
    title: 'KloSync junta mensajes y ventas',
    body: 'El valor es el inbox de WhatsApp (el del celular, no un número Business) y el Kanban de leads. Las herramientas de Sheets y Slides quedan a un lado. Más adelante, un asistente puede ayudarte a responder; hoy el primer paso es ver un mensaje real.',
  },
  {
    title: 'Conectá tu WhatsApp personal',
    body: 'Escaneá el QR como en WhatsApp Web. No es la API oficial de Meta: si la sesión se cae, volvé a escanear. En producción el QR vive en un server siempre encendido (Railway).',
  },
  {
    title: 'Listo para el inbox',
    body: 'Cuando entre un mensaje, aparece en Chat y podés mover el lead en el CRM.',
  },
];

export default function OnboardingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', type: 'lite' }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const connected = data?.data?.connected || data?.connected;
        if (!cancelled && connected) {
          router.replace('/chat');
        }
      } catch {
        // seguir onboarding
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  if (status === 'loading' || checking) {
    return (
      <>
        <EncabezadoSistema />
        <div className="flex min-h-[60vh] items-center justify-center pt-28 text-sm text-muted-foreground">
          Cargando…
        </div>
      </>
    );
  }

  const current = STEPS[step];

  return (
    <>
      <EncabezadoSistema />
      <main className="mx-auto max-w-2xl px-4 pb-10 pt-28">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Paso {step + 1} de {STEPS.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{current.body}</p>

        {step === 1 && (
          <div className="mt-6 rounded-lg border p-4">
            <WhatsAppConnect
              onConnected={() => {
                setStep(2);
              }}
            />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 && (
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Atrás
            </button>
          )}
          {step < STEPS.length - 1 && step !== 1 && (
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => setStep((s) => s + 1)}
            >
              Continuar
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm"
              onClick={() => setStep(2)}
            >
              Saltar por ahora
            </button>
          )}
          {step === STEPS.length - 1 && (
            <>
              <Link
                href="/chat"
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Ir al Chat
              </Link>
              <Link href="/crm" className="rounded-md border px-4 py-2 text-sm">
                Ir al Kanban
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
