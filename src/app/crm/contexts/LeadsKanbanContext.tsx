"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { useSession } from 'next-auth/react';
import { Lead } from '@/app/tipos/lead';
import { supabase as supabaseBrowser } from '@/lib/supabase/browserClient';
import { inboxChannelName } from '@/lib/chat/inboxChannel';
import { initSocket, shouldInitializeSocket } from '@/lib/socket';
import {
  applyKanbanReorderUpdates,
  buildLeadsPorEstado,
  computeKanbanReorderUpdates,
} from '@/lib/crm/kanbanOrder';
import {
  extractStockDeduction,
  stripStockDeduction,
  toastStockDeduction,
} from '@/lib/catalogo/stockDeductionToast';

// Tipos
export interface Estado {
  id: string;
  nombre: string;
  color?: string;
  orden: number;
  usuario_id?: string;
  is_default?: boolean;
  icono?: string;
}

export type ConvertirIncomingExtra = {
  reuseLeadId?: string;
  forceNewLead?: boolean;
  /** Índice destino dentro de la columna del Kanban. */
  destIndex?: number;
  /** Preview para card optimista (nombre / último mensaje) */
  preview?: {
    nombre?: string;
    telefono?: string | null;
    ultimo_mensaje?: string;
  };
};

export type ConvertirIncomingResult = {
  needsChoice: true;
  openLead: { id: string; nombre: string; estado_id: string };
  contactoId: string;
};

export type IncomingPreview = {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  ultimo_mensaje?: string;
  contenido?: string;
};

function optimisticIncomingLeadId(conversationId: string) {
  return `optimistic:${conversationId}`;
}

function incomingPreviewFields(
  extraPreview?: ConvertirIncomingExtra['preview'],
  cached?: IncomingPreview,
) {
  return {
    nombre: extraPreview?.nombre || cached?.display_name || cached?.remitente || 'Nuevo lead',
    telefono: extraPreview?.telefono ?? cached?.display_phone ?? undefined,
    ultimo_mensaje: extraPreview?.ultimo_mensaje || cached?.ultimo_mensaje || cached?.contenido,
  };
}

export interface LeadsKanbanContextProps {
  leads: Lead[];
  estados: Estado[];
  leadsPorEstado: Record<string, Lead[]>;
  agregarLead: (lead: Partial<Lead>) => Promise<void>;
  actualizarLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  moverLead: (
    leadId: string,
    nuevoEstadoId: string,
    options?: { destIndex?: number; motivo?: string; sourceEstadoId?: string },
  ) => Promise<void>;
  eliminarLead: (id: string) => Promise<void>;
  agregarEstado: (estado: Partial<Estado>) => Promise<void>;
  actualizarEstado: (id: string, estado: Partial<Estado>) => Promise<void>;
  eliminarEstado: (id: string) => Promise<void>;
  convertirIncomingEnLead: (
    conversationId: string,
    estadoId: string,
    extra?: ConvertirIncomingExtra
  ) => Promise<ConvertirIncomingResult | void>;
  registerIncomingPreviews: (items: IncomingPreview[]) => void;
  loading: boolean;
  error: string | null;
  refrescarLeads: () => void;
  incomingTick: number;
  /** Chats quitados del sidebar en optimista tras pasarlos al Kanban */
  incomingHiddenIds: string[];
  /** Evita que un fetchAll pise el tablero mientras hay un drag activo */
  setDragLock: (locked: boolean) => void;
}

const LeadsKanbanContext = createContext<LeadsKanbanContextProps | undefined>(undefined);

export function LeadsKanbanProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [incomingTick, setIncomingTick] = useState(0);
  const [incomingHiddenIds, setIncomingHiddenIds] = useState<string[]>([]);
  const [incomingPreviews, setIncomingPreviews] = useState<Record<string, IncomingPreview>>({});
  const dragLockRef = useRef(false);
  const { data: session, status } = useSession();

  const setDragLock = useCallback((locked: boolean) => {
    dragLockRef.current = locked;
  }, []);

  const registerIncomingPreviews = useCallback((items: IncomingPreview[]) => {
    setIncomingPreviews((prev) => {
      const next = { ...prev };
      for (const item of items) next[item.id] = item;
      return next;
    });
  }, []);

  const leadsPorEstado = useMemo(
    () => buildLeadsPorEstado(leads, estados.map((estado) => estado.id)),
    [leads, estados],
  );

  // Obtener usuario_id de Supabase
  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/supabase/users?auth_id=${session.user.id}`);
        const data = await res.json();
        if (data?.user?.id) setUsuarioId(data.user.id);
      } catch (e) {
        setError('No se pudo obtener el usuario_id de Supabase');
      }
    };
    if (session?.user?.id && !usuarioId) fetchUsuarioId();
  }, [session?.user?.id, usuarioId]);

  // Fetch estados y leads. silent=true evita desmontar el tablero (p.ej. tras drag).
  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [estadosRes, leadsRes] = await Promise.all([
        fetch("/api/supabase/estados_lead", { cache: 'no-store' }).then(r => r.json()),
        fetch("/api/supabase/leads", { cache: 'no-store' }).then(r => r.json()),
      ]);
      if (estadosRes.error) throw new Error(estadosRes.error);
      if (leadsRes.error) throw new Error(leadsRes.error);
      setEstados(estadosRes);
      // No pisar cards optimistas / drag en curso.
      if (!dragLockRef.current) {
        setLeads(leadsRes);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refrescarLeads = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  const refrescarInboxLive = useCallback(() => {
    setIncomingTick((tick) => tick + 1);
    void fetchAll({ silent: true });
  }, [fetchAll]);

  // Mismo canal broadcast que /chat: mensajes nuevos sin ir a la página de chat.
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || !supabaseBrowser) return;
    const client = supabaseBrowser;
    const channel = client
      .channel(inboxChannelName(session.user.id))
      .on('broadcast', { event: 'new_message' }, () => {
        refrescarInboxLive();
      })
      .subscribe((subStatus) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Realtime inbox CRM:', subStatus);
        }
      });
    return () => {
      client.removeChannel(channel);
    };
  }, [status, session?.user?.id, refrescarInboxLive]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    if (typeof window !== 'undefined' && !shouldInitializeSocket()) return;
    const socket = initSocket();
    const onMessage = () => refrescarInboxLive();
    const join = () => socket.emit('join-user-room', session.user.id);
    socket.on('whatsapp-message', onMessage);
    socket.on('connect', join);
    if (socket.connected) join();
    return () => {
      socket.off('whatsapp-message', onMessage);
      socket.off('connect', join);
    };
  }, [status, session?.user?.id, refrescarInboxLive]);

  // Poll + foco de pestaña (igual patrón que useChat).
  useEffect(() => {
    if (status !== 'authenticated') return;
    const poll = () => setIncomingTick((tick) => tick + 1);
    const id = setInterval(poll, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status]);

  const convertirIncomingEnLead = useCallback(async (
    conversationId: string,
    estadoId: string,
    extra?: ConvertirIncomingExtra
  ) => {
    setError(null);
    const destIndex = extra?.destIndex ?? 0;
    const cached = incomingPreviews[conversationId];
    const fields = incomingPreviewFields(extra?.preview, cached);
    const tempId = optimisticIncomingLeadId(conversationId);
    const now = new Date().toISOString();
    const optimisticLead: Lead = {
      id: tempId,
      nombre: fields.nombre,
      telefono: fields.telefono,
      estado_id: estadoId,
      ultimo_mensaje: fields.ultimo_mensaje,
      conversacion_id: conversationId,
      fecha_creacion: now,
      fecha_actualizacion: now,
      orden: destIndex,
    };

    // Igual que mover entre columnas: UI primero, API después.
    setIncomingHiddenIds((prev) => (
      prev.includes(conversationId) ? prev : [...prev, conversationId]
    ));
    setLeads((prev) => {
      const withoutTemp = prev.filter((l) => l.id !== tempId);
      const withTemp = [...withoutTemp, optimisticLead];
      const updates = computeKanbanReorderUpdates(withTemp, tempId, estadoId, estadoId, destIndex);
      return applyKanbanReorderUpdates(withTemp, updates);
    });

    const revertOptimistic = () => {
      setIncomingHiddenIds((prev) => prev.filter((id) => id !== conversationId));
      setLeads((prev) => prev.filter((l) => l.id !== tempId));
    };

    try {
      const res = await fetch('/api/crm/conversaciones/entrantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          estadoId,
          destIndex,
          ...(extra?.reuseLeadId ? { reuseLeadId: extra.reuseLeadId } : {}),
          ...(extra?.forceNewLead ? { forceNewLead: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al pasar el chat al Kanban');

      if (data.needsChoice && data.openLead && data.contactoId) {
        revertOptimistic();
        return {
          needsChoice: true as const,
          openLead: data.openLead as { id: string; nombre: string; estado_id: string },
          contactoId: data.contactoId as string,
        };
      }

      if (data.lead) {
        let reorderUpdates: ReturnType<typeof computeKanbanReorderUpdates> = [];
        setLeads((prev) => {
          const withoutTemp = prev.filter((l) => l.id !== tempId && l.id !== data.lead.id);
          const withReal = [...withoutTemp, { ...data.lead, estado_id: estadoId }];
          reorderUpdates = computeKanbanReorderUpdates(withReal, data.lead.id, estadoId, estadoId, destIndex);
          return applyKanbanReorderUpdates(withReal, reorderUpdates);
        });

        if (reorderUpdates.length > 0) {
          await fetch('/api/supabase/leads/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: reorderUpdates }),
          });
        }
      }

      // Reconciliar en background (no bloquear la fluidez del drag).
      void fetchAll({ silent: true }).then(() => {
        setIncomingTick((tick) => tick + 1);
      });
    } catch (e: any) {
      revertOptimistic();
      setError(e.message || 'Error al pasar el chat al Kanban');
      throw e;
    }
  }, [fetchAll, incomingPreviews]);

  const agregarLead = useCallback(async (lead: Partial<Lead>) => {
    setError(null);
    try {
      const res = await fetch("/api/supabase/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear lead");
      setLeads(prev => [...prev, data]);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const actualizarLead = useCallback(async (id: string, lead: Partial<Lead>) => {
    setError(null);
    try {
      const res = await fetch("/api/supabase/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...lead }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar lead");
      const stockDeduction = extractStockDeduction(data);
      toastStockDeduction(stockDeduction);
      const leadPatch = stripStockDeduction(data);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...leadPatch } : l));
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const moverLead = useCallback(async (
    leadId: string,
    nuevoEstadoId: string,
    options?: { destIndex?: number; motivo?: string; sourceEstadoId?: string },
  ) => {
    setError(null);
    let snapshot: Lead[] = [];
    let updates: ReturnType<typeof computeKanbanReorderUpdates> = [];

    setLeads((prev) => {
      snapshot = prev;
      const lead = prev.find((item) => item.id === leadId);
      const sourceEstadoId = options?.sourceEstadoId || lead?.estado_id;
      if (!sourceEstadoId) return prev;

      const destIndex = options?.destIndex ?? buildLeadsPorEstado(prev, [nuevoEstadoId])[nuevoEstadoId]?.length ?? 0;
      updates = computeKanbanReorderUpdates(prev, leadId, sourceEstadoId, nuevoEstadoId, destIndex);
      return applyKanbanReorderUpdates(prev, updates);
    });

    if (updates.length === 0) return;

    const sourceEstadoId = options?.sourceEstadoId || snapshot.find((item) => item.id === leadId)?.estado_id;
    const crossColumn = sourceEstadoId && sourceEstadoId !== nuevoEstadoId;

    try {
      if (crossColumn) {
        const res = await fetch("/api/supabase/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: leadId,
            estado_id: nuevoEstadoId,
            ...(options?.motivo ? { motivo: options.motivo } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al mover lead");
        const stockDeduction = extractStockDeduction(data);
        toastStockDeduction(stockDeduction);
        const leadPatch = stripStockDeduction(data);
        if (leadPatch.id) {
          setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...leadPatch } : l)));
        }
      }

      const res = await fetch("/api/supabase/leads/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reordenar lead");
    } catch (e: any) {
      setLeads(snapshot);
      setError(e.message);
      throw e;
    }
  }, []);

  const eliminarLead = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/supabase/leads?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar lead");
      }
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const agregarEstado = useCallback(async (estado: Partial<Estado>) => {
    setError(null);
    if (!usuarioId) {
        const err = new Error("No se ha podido identificar al usuario.");
        setError(err.message);
        throw err;
    }
    try {

      const nuevoEstado = {
        ...estado,
        usuario_id: usuarioId,
        is_default: false,
      };

      const res = await fetch("/api/supabase/estados_lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoEstado),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear estado");
      setEstados(prev => [...prev, data]);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [usuarioId]);

  const actualizarEstado = useCallback(async (id: string, estado: Partial<Estado>) => {
    setError(null);
    try {
      const res = await fetch("/api/supabase/estados_lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado");
      setEstados(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const eliminarEstado = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/supabase/estados_lead?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar estado");
      }
      setEstados(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const value = useMemo(() => ({
    leads,
    estados,
    leadsPorEstado,
    agregarLead,
    actualizarLead,
    moverLead,
    eliminarLead,
    agregarEstado,
    actualizarEstado,
    eliminarEstado,
    convertirIncomingEnLead,
    registerIncomingPreviews,
    loading,
    error,
    refrescarLeads,
    incomingTick,
    incomingHiddenIds,
    setDragLock,
  }), [
    leads,
    estados,
    leadsPorEstado,
    agregarLead,
    actualizarLead,
    moverLead,
    eliminarLead,
    agregarEstado,
    actualizarEstado,
    eliminarEstado,
    convertirIncomingEnLead,
    registerIncomingPreviews,
    loading,
    error,
    refrescarLeads,
    incomingTick,
    incomingHiddenIds,
    setDragLock,
  ]);

  return <LeadsKanbanContext.Provider value={value}>{children}</LeadsKanbanContext.Provider>;
}

export function useLeadsKanbanContext() {
  const context = useContext(LeadsKanbanContext);
  if (context === undefined) {
    throw new Error('useLeadsKanbanContext must be used within a LeadsKanbanProvider');
  }
  return context;
} 