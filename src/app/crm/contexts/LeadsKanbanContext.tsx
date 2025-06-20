"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

export interface LeadsKanbanContextProps {
  leads: Lead[];
  estados: Estado[];
  leadsPorEstado: Record<string, Lead[]>;
  agregarLead: (lead: Partial<Lead>) => Promise<void>;
  actualizarLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  moverLead: (leadId: string, nuevoEstadoId: string) => Promise<void>;
  eliminarLead: (id: string) => Promise<void>;
  agregarEstado: (estado: Partial<Estado>) => Promise<void>;
  actualizarEstado: (id: string, estado: Partial<Estado>) => Promise<void>;
  eliminarEstado: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  refrescarLeads: () => void;
}

const LeadsKanbanContext = createContext<LeadsKanbanContextProps | undefined>(undefined);

export function LeadsKanbanProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const { data: session } = useSession();

  const leadsPorEstado = leads.reduce((acc, lead) => {
    const estadoId = lead.estado_id;
    if (!acc[estadoId]) {
      acc[estadoId] = [];
    }
    acc[estadoId].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

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

  // Fetch estados y leads
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [estadosRes, leadsRes] = await Promise.all([
        fetch("/api/supabase/estados_lead").then(r => r.json()),
        fetch("/api/supabase/leads").then(r => r.json()),
      ]);
      if (estadosRes.error) throw new Error(estadosRes.error);
      if (leadsRes.error) throw new Error(leadsRes.error);
      setEstados(estadosRes);
      setLeads(leadsRes);
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const refrescarLeads = () => {
    fetchAll();
  };

  const agregarLead = async (lead: Partial<Lead>) => {
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
  };

  const actualizarLead = async (id: string, lead: Partial<Lead>) => {
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
  };

  const moverLead = async (leadId: string, nuevoEstadoId: string) => {
    await actualizarLead(leadId, { estado_id: nuevoEstadoId });
  };

  const eliminarLead = async (id: string) => {
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
  };

  const agregarEstado = async (estado: Partial<Estado>) => {
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
  };

  const actualizarEstado = async (id: string, estado: Partial<Estado>) => {
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
  };

  const eliminarEstado = async (id: string) => {
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
  };

  return (
    <LeadsKanbanContext.Provider
      value={{
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
        loading,
        error,
        refrescarLeads
      }}
    >
      {children}
    </LeadsKanbanContext.Provider>
  );
}

export function useLeadsKanbanContext() {
  const context = useContext(LeadsKanbanContext);
  if (context === undefined) {
    throw new Error('useLeadsKanbanContext must be used within a LeadsKanbanProvider');
  }
  return context;
} 