import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Check, ChevronDown, ChevronUp, Copy, Loader2, X } from 'lucide-react';
import { useAuthUser } from '../context/AuthContext';
import { fetchMyNotifications, markMyNotificationRead, markMyNotificationsRead, MyNotification } from '../services/api';

function presentValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const { user, getToken } = useAuthUser();
  const [items, setItems] = useState<MyNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleItem = async (item: MyNotification) => {
    const willExpand = !expandedIds[item.id];
    setExpandedIds((previous) => ({ ...previous, [item.id]: willExpand }));
    if (willExpand && item.status !== 'read') {
      const token = await getToken();
      await markMyNotificationRead(item.id, token ?? undefined).catch(() => undefined);
      setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, status: 'read' } : entry));
    }
  };

  const copyNotification = async (item: MyNotification) => {
    try {
      const text = Object.entries(item).map(([key, value]) => `${key}: ${presentValue(value)}`).join('\n');
      await navigator.clipboard.writeText(text);
      setError('Notification details copied to clipboard.');
    } catch {
      setError('Could not copy notification details.');
    }
  };

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    try {
      const token = await getToken();
      const json = await fetchMyNotifications(token ?? undefined);
      if (json?.success && Array.isArray(json.data)) {
        setItems(json.data);
        setError(null);
      }
    } catch {
      setError('Could not load notifications.');
    }
  }, [user, getToken]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const unreadCount = items.filter((item) => item.status !== 'read').length;

  const markAllRead = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      await markMyNotificationsRead(token ?? undefined);
      await refresh();
    } catch {
      setError('Could not mark notifications as read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="shabaautos-badge-btn"
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
        aria-label="Notifications"
        aria-expanded={open}
      >
        {unreadCount > 0 ? <BellRing size={14} className="text-[#12492f]" /> : <Bell size={14} />}
        <span className="hidden xl:inline">Alerts</span>
        {unreadCount > 0 && <b className="shabaautos-badge-count">{unreadCount > 99 ? '99+' : unreadCount}</b>}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={busy}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Mark all read
              </button>
            )}
          </div>
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto space-y-1">
              {items.slice(0, 12).map((item) => {
                const unread = item.status !== 'read';
                return (
                  <li key={item.id} className={`rounded-xl border p-2.5 ${unread ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}>
                    <button type="button" onClick={() => void toggleItem(item)} className="w-full text-left" aria-expanded={Boolean(expandedIds[item.id])}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-5 ${unread ? 'text-[#12492f]' : 'text-slate-700'}`}>{item.title}</p>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">{formatTime(item.createdAt)}</span>
                          {expandedIds[item.id] ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.message}</p>
                      {unread && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#158047]" />}
                      {!expandedIds[item.id] && <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-700">Tap to read full details</span>}
                    </button>
                    {expandedIds[item.id] && (
                      <div className="mt-2 border-t border-slate-200 pt-2">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Full notification record</p>
                          <button type="button" onClick={() => void copyNotification(item)} className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Copy size={11} />Copy details</button>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {Object.entries(item).map(([key, value]) => (
                            <div key={key} className="min-w-0">
                              <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{key}</dt>
                              <dd className="text-[11px] text-slate-700 [overflow-wrap:anywhere]" title={presentValue(value)}>{presentValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}