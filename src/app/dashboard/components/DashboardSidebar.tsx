'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Badge } from '@/app/componentes/ui/badge';
import { cn } from '@/app/lib/utils';

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: any;
  isMobile: boolean;
}

export function DashboardSidebar({ onClose, preferences, isMobile }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('overview');
  const [conversationCount, setConversationCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const [convRes, taskRes] = await Promise.all([
          fetch('/api/chat/conversaciones'),
          fetch('/api/dashboard/tasks?limit=50'),
        ]);
        if (convRes.ok) {
          const convData = await convRes.json();
          const list = convData.conversaciones || convData || [];
          if (!cancelled) setConversationCount(Array.isArray(list) ? list.length : 0);
        }
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const pending = Array.isArray(taskData.tasks)
            ? taskData.tasks.filter((t: { status?: string }) => t.status === 'pending' || t.status === 'overdue').length
            : Number(taskData.totalCount || 0);
          if (!cancelled) setTaskCount(Number.isFinite(pending) ? pending : 0);
        }
      } catch {
        if (!cancelled) {
          setConversationCount(0);
          setTaskCount(0);
        }
      }
    };
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const sidebarItems = [
    { id: 'overview', label: 'Resumen', icon: LayoutDashboard, href: '/dashboard', badge: 0 },
    { id: 'conversations', label: 'Conversaciones', icon: MessageSquare, href: '/chat', badge: conversationCount },
    { id: 'tasks', label: 'Tareas', icon: ListTodo, href: '/dashboard?section=tasks', badge: taskCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard?section=analytics', badge: 0 },
    { id: 'settings', label: 'Configuración', icon: Settings, href: '/configuracion', badge: 0 },
  ];

  const handleItemClick = (item: (typeof sidebarItems)[0]) => {
    setActiveSection(item.id);
    if (item.href.startsWith('/dashboard?section=')) {
      const section = item.href.split('section=')[1];
      const element = document.getElementById(`section-${section}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(item.href);
    }
    if (isMobile) {
      onClose();
    }
  };

  React.useEffect(() => {
    if (pathname === '/dashboard') {
      setActiveSection('overview');
    } else if (pathname === '/chat') {
      setActiveSection('conversations');
    } else if (pathname === '/configuracion') {
      setActiveSection('settings');
    }
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      <nav className="space-y-1 p-3">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm',
                active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 ? (
                <Badge variant="secondary">{item.badge}</Badge>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Secciones activas
        </p>
        <div className="space-y-2">
          {(preferences?.visible_sections || []).map((section: string) => (
            <div key={section} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="capitalize">{section}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Actualización</span>
          <span>{preferences?.refresh_interval || 30}s</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Layout</span>
          <span className="capitalize">{preferences?.layout_type || 'expanded'}</span>
        </div>
      </div>
    </div>
  );
}
