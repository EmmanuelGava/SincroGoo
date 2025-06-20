"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export function SyncSupabaseUser() {
  const { data: session, status } = useSession();
  const synced = useRef(false);

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.email &&
      session.supabaseToken &&
      !synced.current // Evitar ejecuciones múltiples
    ) {
      synced.current = true; // Marcar como sincronizado para esta sesión
      fetch("/api/supabase/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_id: session.user.id,
          email: session.user.email,
          nombre: session.user.name,
          avatar_url: session.user.image,
          provider: session.provider,
          supabaseToken: session.supabaseToken,
        }),
      })
      .then(response => response.json())
      .then(data => console.log('[SyncSupabaseUser] Sincronización completada:', data))
      .catch(error => console.error('[SyncSupabaseUser] Error en la sincronización:', error));
    }
  }, [session, status]);

  return null; // Este componente no renderiza nada
} 