'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  Skeleton,
  Alert,
  Stack,
  Link as MuiLink,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AlarmIcon from '@mui/icons-material/Alarm';
import { useRouter } from 'next/navigation';
import LeadEtapaTimeline from '@/app/crm/componentes/LeadEtapaTimeline';
import RecordatorioLeadModal from '@/app/crm/componentes/RecordatorioLeadModal';
import { isPlaceholderLeadEmail, leadFormPhone } from '@/lib/chat/conversationIdentity';

type DealRow = {
  id: string;
  nombre?: string | null;
  estado_id?: string | null;
  estados_lead?: { nombre?: string | null; color?: string | null } | Array<{ nombre?: string | null; color?: string | null }> | null;
  valor_potencial?: number | null;
};

type ContactoData = {
  id: string;
  nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  empresa?: string | null;
  notas?: string | null;
  etiquetas?: string[] | null;
};

type ContactDealDrawerProps = {
  open: boolean;
  onClose: () => void;
  contactoId?: string | null;
  activeLeadId?: string | null;
  conversationId?: string | null;
  fallbackNombre?: string;
  fallbackTelefono?: string | null;
  onRefresh?: () => void;
};

function estadoNombre(deal: DealRow): string {
  const estado = Array.isArray(deal.estados_lead) ? deal.estados_lead[0] : deal.estados_lead;
  return String(estado?.nombre || 'Sin etapa');
}

function estadoColor(deal: DealRow): string | undefined {
  const estado = Array.isArray(deal.estados_lead) ? deal.estados_lead[0] : deal.estados_lead;
  return estado?.color || undefined;
}

export default function ContactDealDrawer({
  open,
  onClose,
  contactoId,
  activeLeadId,
  conversationId,
  fallbackNombre,
  fallbackTelefono,
  onRefresh,
}: ContactDealDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacto, setContacto] = useState<ContactoData | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [resolvedLeadId, setResolvedLeadId] = useState<string | null>(activeLeadId || null);
  const [recordatorioOpen, setRecordatorioOpen] = useState(false);
  const [creatingPedido, setCreatingPedido] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (contactoId) {
          const res = await fetch(`/api/contactos/${encodeURIComponent(contactoId)}`, { cache: 'no-store' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo cargar el contacto');
          if (cancelled) return;
          setContacto(data.contacto || null);
          setDeals(Array.isArray(data.leads) ? data.leads : []);
          if (!activeLeadId && data.leads?.length === 1) {
            setResolvedLeadId(data.leads[0].id);
          } else {
            setResolvedLeadId(activeLeadId || null);
          }
          return;
        }

        if (conversationId) {
          const res = await fetch(`/api/chat/conversaciones/${encodeURIComponent(conversationId)}/lead`, {
            cache: 'no-store',
          });
          const data = await res.json();
          if (cancelled) return;
          if (data.leadId) {
            setResolvedLeadId(data.leadId);
            const leadRes = await fetch(`/api/leads/${encodeURIComponent(data.leadId)}`, { cache: 'no-store' });
            const leadData = await leadRes.json();
            if (leadRes.ok && leadData.lead) {
              setDeals([{
                id: leadData.lead.id,
                nombre: leadData.lead.nombre,
                estados_lead: { nombre: leadData.lead.estado_lead },
                valor_potencial: leadData.lead.valor_estimado,
              }]);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar datos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, contactoId, conversationId, activeLeadId]);

  useEffect(() => {
    if (activeLeadId) setResolvedLeadId(activeLeadId);
  }, [activeLeadId]);

  const displayNombre = contacto?.nombre || fallbackNombre || 'Contacto';
  const displayTelefono = leadFormPhone(contacto?.telefono) || fallbackTelefono || null;

  const handleNuevoPedido = async () => {
    if (!contactoId) return;
    setCreatingPedido(true);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(contactoId)}/nuevo-pedido`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.lead?.id) {
        router.push(`/crm?lead=${encodeURIComponent(data.lead.id)}`);
      }
    } finally {
      setCreatingPedido(false);
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        width: 360,
        minWidth: 360,
        maxWidth: 360,
        height: '100%',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={600}>Contacto y deals</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar panel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton height={28} />
            <Skeleton height={20} />
            <Skeleton height={80} />
          </Stack>
        ) : error ? (
          <Alert severity="warning">{error}</Alert>
        ) : (
          <>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutlineIcon fontSize="small" />
                {displayNombre}
              </Typography>
              {displayTelefono ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon sx={{ fontSize: 16 }} /> {displayTelefono}
                </Typography>
              ) : null}
              {contacto?.email && !isPlaceholderLeadEmail(contacto.email) ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 16 }} /> {contacto.email}
                </Typography>
              ) : null}
              {contacto?.empresa ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon sx={{ fontSize: 16 }} /> {contacto.empresa}
                </Typography>
              ) : null}
              {(contacto?.etiquetas || []).length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(contacto?.etiquetas || []).map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              ) : null}
              {contacto?.notas ? (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {contacto.notas}
                </Typography>
              ) : null}
            </Stack>

            {!contactoId ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Sin contacto vinculado. Podés vincularlo desde la ficha de contactos.
              </Alert>
            ) : (
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => router.push(`/contactos/${contactoId}`)}
                >
                  Abrir ficha
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShoppingBagOutlinedIcon />}
                  disabled={creatingPedido}
                  onClick={() => void handleNuevoPedido()}
                >
                  Nuevo pedido
                </Button>
              </Stack>
            )}

            <Typography variant="subtitle2" gutterBottom>Deals</Typography>
            {deals.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sin deals vinculados
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {deals.map((deal) => {
                  const active = deal.id === resolvedLeadId;
                  return (
                    <Box
                      key={deal.id}
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: active ? 'primary.main' : 'divider',
                        bgcolor: active ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>{deal.nombre || 'Deal'}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={estadoNombre(deal)}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: estadoColor(deal) || undefined,
                          }}
                        />
                        {deal.valor_potencial != null ? (
                          <Typography variant="caption" color="text.secondary">
                            ${Number(deal.valor_potencial).toLocaleString('es-AR')}
                          </Typography>
                        ) : null}
                      </Box>
                      <MuiLink
                        component="button"
                        variant="caption"
                        sx={{ mt: 0.5, display: 'inline-block' }}
                        onClick={() => router.push(`/crm?lead=${encodeURIComponent(deal.id)}`)}
                      >
                        Ver en Kanban
                      </MuiLink>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {resolvedLeadId ? (
              <>
                <Button
                  size="small"
                  startIcon={<AlarmIcon />}
                  onClick={() => setRecordatorioOpen(true)}
                  sx={{ mb: 1.5 }}
                >
                  Recordarme
                </Button>
                <LeadEtapaTimeline leadId={resolvedLeadId} compact />
              </>
            ) : null}
          </>
        )}
      </Box>

      {resolvedLeadId ? (
        <RecordatorioLeadModal
          open={recordatorioOpen}
          onClose={() => setRecordatorioOpen(false)}
          leadId={resolvedLeadId}
          leadNombre={displayNombre}
          conversationId={conversationId}
          onCreated={() => onRefresh?.()}
        />
      ) : null}
    </Box>
  );
}
