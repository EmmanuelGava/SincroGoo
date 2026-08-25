"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { useSession } from 'next-auth/react';
import { Lead } from '@/app/tipos/lead';

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

export interface LeadsKanbanContextProps {
  leads: Lead[];
  estados: Estado[];
  leadsPorEstado: Record<string, Lead[]>;
  agregarLead: (lead: Partial<Lead>) => Promise<void>;
  actualizarLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  moverLead: (leadId: string, nuevoEstadoId: string, motivo?: string) => Promise<void>;
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
  const { data: session } = useSession();

  const registerIncomingPreviews = useCallback((items: IncomingPreview[]) => {
    setIncomingPreviews((prev) => {
      const next = { ...prev };
      for (const item of items) next[item.id] = item;
      return next;
    });
  }, []);

  const leadsPorEstado = useMemo(() => leads.reduce((acc, lead) => {
    const estadoId = lead.estado_id;
    if (!acc[estadoId]) {
      acc[estadoId] = [];
    }
    acc[estadoId].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>), [leads]);

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
      setLeads(leadsRes);
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

  const convertirIncomingEnLead = useCallback(async (
    conversationId: string,
    estadoId: string,
    extra?: ConvertirIncomingExtra
  ) => {
    setError(null);
    const preview = extra?.preview || incomingPreviews[conversationId];
    const tempId = optimisticIncomingLeadId(conversationId);
    const now = new Date().toISOString();
    const optimisticLead: Lead = {
      id: tempId,
      nombre: extra?.preview?.nombre
        || preview?.display_name
        || preview?.remitente
        || 'Nuevo lead',
      telefono: extra?.preview?.telefono ?? preview?.display_phone ?? undefined,
      estado_id: estadoId,
      ultimo_mensaje: extra?.preview?.ultimo_mensaje
        || preview?.ultimo_mensaje
        || preview?.contenido,
      conversacion_id: conversationId,
      fecha_creacion: now,
      fecha_actualizacion: now,
    };

    // Igual que mover entre columnas: UI primero, API después.
    setIncomingHiddenIds((prev) => (
      prev.includes(conversationId) ? prev : [...prev, conversationId]
    ));
    setLeads((prev) => {
      const withoutTemp = prev.filter((l) => l.id !== tempId);
      return [...withoutTemp, optimisticLead];
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
        setLeads((prev) => {
          const withoutTemp = prev.filter((l) => l.id !== tempId && l.id !== data.lead.id);
          return [...withoutTemp, data.lead];
        });
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
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const moverLead = useCallback(async (leadId: string, nuevoEstadoId: string, motivo?: string) => {
    setError(null);
    try {
      const res = await fetch("/api/supabase/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          estado_id: nuevoEstadoId,
          ...(motivo ? { motivo } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al mover lead");
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...data } : l));
    } catch (e: any) {
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