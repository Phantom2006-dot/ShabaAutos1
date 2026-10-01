import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { useAuthUser } from '../context/AuthContext';
import {
  fetchOperationsAnalytics,
  fetchOperationsQueue,
  fetchOperationsSettings,
  OperationsQueue,
  OperationsSetting,
  recordOperationsImportEvent,
  saveOperationsSetting,
  updateOperationsQueue,
} from '../services/api';

export interface OperationsWorkflowsProps {
  section: 'sell' | 'concierge' | 'imports' | 'rentals' | 'analytics' | 'settings';
  role: 'staff' | 'admin';
}

type QueueRecord = Record<string, unknown>;
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type AnalyticsData = {
  since: string;
  totalEvents: number;
  eventTotals: { event_type: string; count: number }[];
  topPages: { path: string; views: number }[];
  topVehicles: { entity_id: string; views: number }[];
  daily: { day: string; events: number }[];
};

const SELL_STATUSES = ['pending', 'approved', 'rejected', 'needs_info'] as const;
const CONCIERGE_STATUSES = ['Request Received', 'Agent Assigned', 'Options Presented', 'Fulfilled', 'Closed'] as const;
const IMPORT_STATUSES = ['Sourcing Started', 'Inspection Passed', 'Shipped from USA', 'Port Arrival', 'Customs Clearance', 'Delivered', 'Cancelled'] as const;
const RENTAL_STATUSES = ['Active Reservation', 'Completed', 'Cancelled'] as const;
const SETTING_GROUPS = [
  { key: 'contact', label: 'Contact', prefixes: ['site.'] },
  { key: 'fees', label: 'Fees', prefixes: ['rental.', 'sell.'] },
  { key: 'import', label: 'Import', prefixes: ['import.'] },
  { key: 'valuation', label: 'Valuation', prefixes: ['valuation.'] },
  { key: 'other', label: 'Other configured settings', prefixes: [] },
] as const;

const titleForSection: Record<OperationsWorkflowsProps['section'], { title: string; description: string }> = {
  sell: { title: 'Sell-your-car review', description: 'Review customer submissions against the persisted moderation status. Approval does not claim an inspection took place.' },
  concierge: { title: 'Concierge requests', description: 'Move requests through the service workflow and keep contact evidence with assignment or options updates.' },
  imports: { title: 'Import requests', description: 'Record only confirmed shipment checkpoints and supporting evidence; this view does not invent vessel or milestone data.' },
  rentals: { title: 'Rental bookings', description: 'Track booking lifecycle from the persisted reservation record.' },
  analytics: { title: 'Measured activity analytics', description: 'Review captured backend activity events only. This is not an estimate of total traffic.' },
  settings: { title: 'Site settings', description: 'Review configured contact, fee, import and valuation values. Rates and estimates require independent verification before customer use.' },
};

const asText = (value: unknown): string => (value === null || value === undefined ? '' : String(value));
const firstText = (record: QueueRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = asText(record[key]).trim();
    if (value) return value;
  }
  return '';
};
const statusFor = (kind: OperationsQueue, record: QueueRecord): string => {
  if (kind === 'sell') return firstText(record, ['reviewStatus', 'status']) || 'pending';
  return firstText(record, ['status']) || 'Unknown';
};
const idFor = (kind: OperationsQueue, record: QueueRecord): string => firstText(record, kind === 'imports' ? ['trackingId', 'id'] : kind === 'rentals' ? ['id', 'bookingId'] : ['id']);
const customerFor = (kind: OperationsQueue, record: QueueRecord): string => firstText(record, kind === 'sell' ? ['sellerName', 'name'] : kind === 'concierge' ? ['fullName', 'customerName'] : ['customerName', 'fullName', 'name']) || 'Unnamed customer';
const contactFor = (record: QueueRecord): string => firstText(record, ['phone', 'email']) || 'No contact recorded';
const vehicleFor = (kind: OperationsQueue, record: QueueRecord): string => {
  if (kind === 'rentals') return firstText(record, ['carName', 'vehicleName']) || 'Rental vehicle not recorded';
  const make = firstText(record, ['make', 'desiredMake']);
  const model = firstText(record, ['model', 'desiredModel']);
  const year = firstText(record, ['year', 'yearRange']);
  return [year, make, model].filter(Boolean).join(' ') || (kind === 'concierge' ? 'Vehicle preference not recorded' : 'Vehicle not recorded');
};
const dateFor = (kind: OperationsQueue, record: QueueRecord): string => firstText(record, kind === 'rentals' ? ['pickupDate', 'createdAt', 'updatedAt'] : ['createdAt', 'updatedAt', 'date']);
const formatDate = (value: string): string => {
  if (!value) return 'Date not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
const labelize = (value: string): string => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const isSecretSetting = (key: string): boolean => /(secret|token|password|api[_-]?key|private)/i.test(key);

const statusOptionsFor = (kind: OperationsQueue): readonly string[] => {
  if (kind === 'sell') return SELL_STATUSES;
  if (kind === 'concierge') return CONCIERGE_STATUSES;
  if (kind === 'imports') return IMPORT_STATUSES;
  return RENTAL_STATUSES;
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
    <h3 className="font-semibold text-slate-800">{title}</h3>
    <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">{detail}</p>
  </div>
);

const LoadState: React.FC<{ loading: boolean; error: string | null; onRetry: () => void }> = ({ loading, error, onRetry }) => {
  if (loading) {
    return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-emerald-700" />Loading current data…</div>;
  }
  if (error) {
    return <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div><button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"><RefreshCw className="h-4 w-4" />Retry</button></div>;
  }
  return null;
};

export const OperationsWorkflows: React.FC<OperationsWorkflowsProps> = ({ section, role }) => {
  const { getToken } = useAuthUser();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [queue, setQueue] = useState<QueueRecord[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [settings, setSettings] = useState<OperationsSetting[] | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState({ trackingId: '', status: IMPORT_STATUSES[0], location: '', details: '' });
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [settingBusy, setSettingBusy] = useState<string | null>(null);

  const definition = titleForSection[section];
  const kind = section === 'sell' || section === 'concierge' || section === 'imports' || section === 'rentals' ? section : null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setFeedback(null);
      setQueue(null);
      setAnalytics(null);
      setSettings(null);
      try {
        const token = await getToken();
        if (cancelled) return;
        if (kind) {
          const result = await fetchOperationsQueue(kind, token || undefined);
          if (!result.success) throw new Error(result.message || 'The queue could not be loaded.');
          if (!cancelled) setQueue(Array.isArray(result.data) ? result.data : []);
        } else if (section === 'analytics') {
          const result = await fetchOperationsAnalytics(days, token || undefined);
          if (!result.success || !result.data) throw new Error(result.message || 'Analytics could not be loaded.');
          if (!cancelled) setAnalytics(result.data);
        } else {
          const result = await fetchOperationsSettings(token || undefined);
          if (!result.success) throw new Error(result.message || 'Settings could not be loaded.');
          if (!cancelled) {
            const rows = Array.isArray(result.data) ? result.data : [];
            setSettings(rows);
            setSettingDrafts(rows.reduce<Record<string, string>>((draft, row) => ({ ...draft, [row.settingKey]: row.settingValue }), {}));
          }
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'The service could not be reached.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [section, kind, days, reloadKey, getToken]);

  const filteredQueue = useMemo(() => {
    if (!queue) return [];
    const normalized = query.trim().toLowerCase();
    return queue.filter((record) => {
      const matchesStatus = !statusFilter || statusFor(kind as OperationsQueue, record) === statusFilter;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return [customerFor(kind as OperationsQueue, record), contactFor(record), vehicleFor(kind as OperationsQueue, record), idFor(kind as OperationsQueue, record), statusFor(kind as OperationsQueue, record)].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [queue, query, statusFilter, kind]);

  const updateQueueRecord = async (record: QueueRecord, nextStatus: string) => {
    if (!kind) return;
    if (kind === 'sell' && role !== 'admin') {
      setFeedback({ kind: 'error', text: 'Only administrators can change sell review status.' });
      return;
    }
    const id = idFor(kind, record);
    if (!id) {
      setFeedback({ kind: 'error', text: 'This record has no server reference, so it cannot be updated.' });
      return;
    }
    const note = notes[id]?.trim() || '';
    if (kind === 'concierge' && (nextStatus === 'Agent Assigned' || nextStatus === 'Options Presented') && !note) {
      setFeedback({ kind: 'error', text: 'Add a supporting contact note before assigning an agent or presenting options.' });
      return;
    }
    setBusyId(id);
    setFeedback(null);
    try {
      const token = await getToken();
      const payload: Record<string, unknown> = kind === 'sell' ? { reviewStatus: nextStatus, adminNotes: note || undefined } : { status: nextStatus, ...(note ? { note } : {}) };
      const result = await updateOperationsQueue(kind, id, payload, token || undefined);
      if (!result.success) throw new Error(result.message || 'The status change was rejected by the server.');
      setFeedback({ kind: 'success', text: 'Status updated. The queue is being refreshed from the server.' });
      setReloadKey((value) => value + 1);
    } catch (caught) {
      setFeedback({ kind: 'error', text: caught instanceof Error ? caught.message : 'The status change could not be saved.' });
    } finally {
      setBusyId(null);
    }
  };

  const submitImportEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trackingId = eventDraft.trackingId.trim();
    const location = eventDraft.location.trim();
    const details = eventDraft.details.trim();
    if (!trackingId || !eventDraft.status || (!location && !details)) {
      setFeedback({ kind: 'error', text: 'Select an import, choose a status, and provide a confirmed location or event detail as evidence.' });
      return;
    }
    setBusyId(`event:${trackingId}`);
    setFeedback(null);
    try {
      const token = await getToken();
      const result = await recordOperationsImportEvent(trackingId, { status: eventDraft.status, location: location || undefined, details: details || undefined }, token || undefined);
      if (!result.success) throw new Error(result.message || 'The tracking event could not be recorded.');
      setFeedback({ kind: 'success', text: 'Tracking event recorded. The import queue is being refreshed.' });
      setEventDraft((draft) => ({ ...draft, location: '', details: '' }));
      setReloadKey((value) => value + 1);
    } catch (caught) {
      setFeedback({ kind: 'error', text: caught instanceof Error ? caught.message : 'The tracking event could not be saved.' });
    } finally {
      setBusyId(null);
    }
  };

  const validateSetting = (row: OperationsSetting, value: string): string => {
    const key = row.settingKey;
    if (row.valueType === 'number') {
      const numeric = Number(value);
      if (!value.trim() || !Number.isFinite(numeric) || numeric < 0 || numeric > 100000000) return 'Enter a finite number from 0 to 100,000,000.';
      if (key.includes('rate') && key !== 'import.usd_to_ngn' && numeric > 1) return 'Rates must be between 0 and 1 (for example, 0.35 for 35%).';
    }
    if (key === 'site.contact_phone' && value && !/^\+?[0-9\s()\-]{7,25}$/.test(value)) return 'Enter a valid public contact number.';
    if (key === 'site.contact_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid public contact email.';
    if (key === 'site.address' && value.length > 250) return 'Address must be 250 characters or fewer.';
    if (key === 'valuation.base_prices') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.values(parsed as Record<string, unknown>).some((item) => typeof item !== 'number' || !Number.isFinite(item) || item <= 0 || item > 1000000000)) return 'Base prices must map makes to positive amounts in naira.';
      } catch {
        return 'Vehicle base prices must be valid JSON.';
      }
    }
    return '';
  };

  const saveSetting = async (row: OperationsSetting) => {
    if (role !== 'admin') return;
    const value = settingDrafts[row.settingKey] ?? row.settingValue;
    const validationError = validateSetting(row, value);
    if (validationError) {
      setFeedback({ kind: 'error', text: `${row.settingKey}: ${validationError}` });
      return;
    }
    setSettingBusy(row.settingKey);
    setFeedback(null);
    try {
      const token = await getToken();
      const result = await saveOperationsSetting(row.settingKey, value, token || undefined);
      if (!result.success) throw new Error(result.message || 'The setting could not be saved.');
      setFeedback({ kind: 'success', text: `${row.label || row.settingKey} saved.` });
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setFeedback({ kind: 'error', text: caught instanceof Error ? caught.message : 'The setting could not be saved.' });
    } finally {
      setSettingBusy(null);
    }
  };

  const renderQueue = () => {
    if (!kind) return null;
    if (!queue) return <LoadState loading={loading} error={error} onRetry={() => setReloadKey((value) => value + 1)} />;
    const options = statusOptionsFor(kind);
    return (
      <>
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search queue</span><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, contact, vehicle, reference…" className="w-full border bg-white py-2 pl-10 pr-3 text-sm" /></label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><span className="whitespace-nowrap">Filter status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{options.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></label>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Reload</button>
        </div>
        {loading || error ? <LoadState loading={loading} error={error} onRetry={() => setReloadKey((value) => value + 1)} /> : filteredQueue.length === 0 ? <EmptyState title={queue.length === 0 ? 'No records in this queue' : 'No matching records'} detail={queue.length === 0 ? 'The server returned no operational records for this workflow.' : 'Try another search or status filter. No fallback records are shown.'} /> : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Customer / contact</th><th className="px-4 py-3 font-semibold">Vehicle / request</th><th className="px-4 py-3 font-semibold">Reference</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Action / evidence</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.map((record, index) => {
                    const id = idFor(kind, record) || `record-${index}`;
                    const currentStatus = statusFor(kind, record);
                    const note = notes[id] || '';
                    const canEdit = !(kind === 'sell' && role !== 'admin');
                    return <tr key={id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4"><div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><div className="font-semibold text-slate-800">{customerFor(kind, record)}</div><div className="mt-1 text-xs text-slate-500">{contactFor(record)}</div></div></div></td>
                      <td className="px-4 py-4 text-slate-700">{vehicleFor(kind, record)}</td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">{id || 'Reference not recorded'}</td>
                      <td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{labelize(currentStatus)}</span></td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600">{formatDate(dateFor(kind, record))}</td>
                      <td className="min-w-[260px] px-4 py-4">
                        {kind === 'sell' && !canEdit ? <span className="text-xs text-slate-500">Staff read-only: moderation changes are administrator-only.</span> : <div className="space-y-2">
                          <label className="block"><span className="sr-only">New status for {id}</span><select disabled={!canEdit || busyId === id} value={currentStatus} onChange={(event) => void updateQueueRecord(record, event.target.value)} className="w-full border bg-white px-3 py-2 text-sm"><option value={currentStatus}>{labelize(currentStatus)}</option>{options.filter((status) => status !== currentStatus).map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></label>
                          {(kind === 'concierge' || kind === 'imports' || kind === 'sell') && <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{kind === 'concierge' ? 'Contact / evidence note' : kind === 'imports' ? 'Transition note (optional)' : 'Admin note (optional)'}</span><textarea value={note} onChange={(event) => setNotes((previous) => ({ ...previous, [id]: event.target.value }))} rows={2} placeholder={kind === 'concierge' ? 'Required for assignment or presented options.' : 'Record the supporting context.'} className="w-full border bg-white px-3 py-2 text-xs" /></label>}
                          {busyId === id && <span className="inline-flex items-center gap-2 text-xs text-emerald-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span>}
                        </div>}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {kind === 'imports' && queue.length > 0 && <form onSubmit={submitImportEvent} className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"><div className="mb-4 flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" /><div><h3 className="font-semibold text-slate-800">Record a confirmed tracking event</h3><p className="mt-1 text-xs text-slate-600">Location or detail is required as evidence. Do not enter an unverified vessel, container, ETA, or milestone.</p></div></div><div className="grid gap-3 md:grid-cols-4"><label className="md:col-span-1"><span className="mb-1 block text-xs font-semibold text-slate-600">Import reference</span><select value={eventDraft.trackingId || idFor('imports', queue[0])} onChange={(event) => setEventDraft((draft) => ({ ...draft, trackingId: event.target.value }))} className="w-full border bg-white px-3 py-2 text-sm"><option value="" disabled>Select an import</option>{queue.map((record, index) => <option key={idFor('imports', record) || index} value={idFor('imports', record)}>{idFor('imports', record)} — {customerFor('imports', record)}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Event status</span><select value={eventDraft.status} onChange={(event) => setEventDraft((draft) => ({ ...draft, status: event.target.value }))} className="w-full border bg-white px-3 py-2 text-sm">{IMPORT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Confirmed location</span><input value={eventDraft.location} onChange={(event) => setEventDraft((draft) => ({ ...draft, location: event.target.value }))} placeholder="Port or city, if confirmed" className="w-full border bg-white px-3 py-2 text-sm" /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Details / source note</span><input value={eventDraft.details} onChange={(event) => setEventDraft((draft) => ({ ...draft, details: event.target.value }))} placeholder="What was confirmed?" className="w-full border bg-white px-3 py-2 text-sm" /></label></div><button type="submit" disabled={busyId?.startsWith('event:')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{busyId?.startsWith('event:') ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}Save tracking event</button></form>}
      </>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return <LoadState loading={loading} error={error} onRetry={() => setReloadKey((value) => value + 1)} />;
    const measured = analytics.totalEvents > 0;
    return <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">Measured event window</p><p className="mt-1 text-xs text-slate-500">Since {formatDate(analytics.since)} · {measured ? 'captured events only' : 'no captured events returned'}</p></div><label className="flex items-center gap-2 text-sm text-slate-600"><span>Timeframe</span><select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)} className="border bg-white px-3 py-2"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div>
      {loading || error ? <LoadState loading={loading} error={error} onRetry={() => setReloadKey((value) => value + 1)} /> : <>
        <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Captured events</p><p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.totalEvents.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Backend activity events in the selected window</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800"><AlertTriangle className="h-4 w-4" />Measurement disclosure</p><p className="mt-2 text-sm leading-6 text-amber-900">{measured ? 'These figures describe recorded events, not guaranteed visitors or sessions.' : 'No captured activity events were returned. If tracking is disabled or not configured, traffic is not reported here.'}</p></div></div>
        <div className="grid gap-5 lg:grid-cols-3"><AnalyticsList title="Event totals" icon={<BarChart3 className="h-4 w-4" />} rows={analytics.eventTotals.map((row) => ({ label: row.event_type, value: row.count }))} empty="No event totals were captured." /><AnalyticsList title="Top pages" icon={<FileText className="h-4 w-4" />} rows={analytics.topPages.map((row) => ({ label: row.path, value: row.views }))} empty="No page-view events were captured." /><AnalyticsList title="Top vehicles" icon={<Truck className="h-4 w-4" />} rows={analytics.topVehicles.map((row) => ({ label: row.entity_id, value: row.views }))} empty="No vehicle-view events were captured." /></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="flex items-center gap-2 font-semibold text-slate-800"><BarChart3 className="h-4 w-4 text-emerald-700" />Events by day</h3>{analytics.daily.length === 0 ? <p className="mt-4 text-sm text-slate-500">No daily event counts were captured.</p> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{analytics.daily.map((row) => <div key={row.day} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{row.day}</p><p className="mt-1 text-lg font-semibold text-slate-800">{row.events.toLocaleString()}</p></div>)}</div>}</div>
      </>}
    </div>;
  };

  const renderSettings = () => {
    if (!settings) return <LoadState loading={loading} error={error} onRetry={() => setReloadKey((value) => value + 1)} />;
    const visibleSettings = settings.filter((row) => !isSecretSetting(row.settingKey));
    const protectedCount = settings.length - visibleSettings.length;
    return <div className="space-y-5"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Verify before publishing.</strong> Configured estimates, fees, exchange rates, duty rates, and levy rates may be jurisdiction- or date-sensitive. Confirm them with the appropriate source; this screen does not imply live market or customs data. {role === 'admin' ? 'You can edit the returned settings as an administrator.' : 'Staff access is read-only.'}</div></div></div>{protectedCount > 0 && <p className="text-xs text-slate-500">{protectedCount} protected setting{protectedCount === 1 ? '' : 's'} omitted from display.</p>}{visibleSettings.length === 0 ? <EmptyState title="No visible settings returned" detail="The server returned no non-sensitive site settings." /> : SETTING_GROUPS.map((group) => { const rows = visibleSettings.filter((row) => group.key === 'other' ? !SETTING_GROUPS.slice(0, -1).some((candidate) => candidate.prefixes.some((prefix) => row.settingKey.startsWith(prefix))) : group.prefixes.some((prefix) => row.settingKey.startsWith(prefix))); if (rows.length === 0) return null; return <section key={group.key} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Settings2 className="h-5 w-5 text-emerald-700" /><h3 className="font-semibold text-slate-800">{group.label}</h3></div><div className="space-y-4">{rows.map((row) => { const value = settingDrafts[row.settingKey] ?? row.settingValue; const isJson = row.valueType === 'json' || row.settingKey === 'valuation.base_prices'; return <div key={row.settingKey} className="grid gap-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,1.4fr)_auto] md:items-start"><div><p className="font-medium text-slate-800">{row.label || labelize(row.settingKey)}</p><p className="mt-1 font-mono text-[11px] text-slate-400">{row.settingKey}</p>{row.description && <p className="mt-1 text-xs text-slate-500">{row.description}</p>}</div><div>{isJson ? <textarea rows={5} value={value} readOnly={role !== 'admin'} onChange={(event) => setSettingDrafts((previous) => ({ ...previous, [row.settingKey]: event.target.value }))} className="w-full border bg-white px-3 py-2 font-mono text-xs" aria-label={row.label || row.settingKey} /> : <input type={row.valueType === 'number' ? 'number' : 'text'} step={row.valueType === 'number' ? 'any' : undefined} value={value} readOnly={role !== 'admin'} onChange={(event) => setSettingDrafts((previous) => ({ ...previous, [row.settingKey]: event.target.value }))} className="w-full border bg-white px-3 py-2 text-sm" aria-label={row.label || row.settingKey} />}</div><div className="flex items-center gap-2 md:justify-end">{role === 'admin' ? <button type="button" onClick={() => void saveSetting(row)} disabled={settingBusy === row.settingKey} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{settingBusy === row.settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save</button> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4" />Read-only</span>}</div></div>; })}</div></section>; })}</div>;
  };

  return <main className="shaba-screen min-h-full px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1500px]"><header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Operations / {role}</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{definition.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{definition.description}</p></div><div className="flex flex-wrap items-center gap-2 self-start sm:self-auto"><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-700" />{role === 'admin' ? 'Administrator controls' : 'Staff access'}</div><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Reload</button></div></header>{feedback && <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${feedback.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">{feedback.kind === 'error' ? <X className="mt-0.5 h-5 w-5 shrink-0" /> : <Check className="mt-0.5 h-5 w-5 shrink-0" />}{feedback.text}</div>}{section === 'analytics' ? renderAnalytics() : section === 'settings' ? renderSettings() : renderQueue()}</div></main>;
};

const AnalyticsList: React.FC<{ title: string; icon: React.ReactNode; rows: { label: string; value: number }[]; empty: string }> = ({ title, icon, rows, empty }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="flex items-center gap-2 font-semibold text-slate-800">{icon}{title}</h3>{rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">{empty}</p> : <ul className="mt-4 space-y-3">{rows.map((row) => <li key={row.label} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-600" title={row.label}>{row.label}</span><span className="shrink-0 font-semibold text-slate-800">{row.value.toLocaleString()}</span></li>)}</ul>}</div>;

export default OperationsWorkflows;
