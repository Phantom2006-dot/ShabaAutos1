import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Anchor,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  LockKeyhole,
  MapPin,
  Package,
  Search,
  Ship,
} from 'lucide-react';
import { ScreenId } from '../types';
import { fetchMyImports, trackOrderShipment } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface OrderTrackingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface ImportSummary {
  trackingId: string;
  make: string;
  model: string;
  year?: number;
  status?: string;
  createdAt?: string;
}

interface TrackingStep {
  step: number;
  title: string;
  desc?: string;
  date?: string;
  completed: boolean;
  current: boolean;
}

interface TrackingEvent {
  id?: string;
  eventTimestamp?: string;
  status?: string;
  location?: string;
  vesselName?: string;
  containerNo?: string;
  details?: string;
  createdAt?: string;
}

interface StatusHistoryEntry {
  id?: string;
  fromStatus?: string;
  toStatus: string;
  note?: string;
  createdAt?: string;
}

interface TrackingOrder {
  orderId: string;
  status: string;
  customerName?: string;
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  containerNo?: string;
  currentLocation?: string;
  car: {
    make: string;
    model: string;
    year?: number;
    vin?: string;
  };
  steps: TrackingStep[];
  events: TrackingEvent[];
  statusHistory: StatusHistoryEntry[];
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === 'object';

const stringValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const numberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const booleanValue = (value: unknown): boolean => value === true;

const formatDate = (value?: string): string => {
  if (!value) return 'Date not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

const formatShortDate = (value?: string): string => {
  if (!value) return 'Date not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
};

const mapImportSummary = (value: unknown): ImportSummary | null => {
  if (!isRecord(value)) return null;
  const trackingId = stringValue(value.trackingId) || stringValue(value.orderId);
  const make = stringValue(value.make);
  const model = stringValue(value.model);
  if (!trackingId || !make || !model) return null;
  return {
    trackingId,
    make,
    model,
    year: numberValue(value.year),
    status: stringValue(value.status),
    createdAt: stringValue(value.createdAt),
  };
};

const mapTrackingOrder = (value: unknown): TrackingOrder | null => {
  if (!isRecord(value)) return null;
  const orderId = stringValue(value.orderId);
  const status = stringValue(value.status);
  const car = isRecord(value.car) ? value.car : null;
  const make = car ? stringValue(car.make) : undefined;
  const model = car ? stringValue(car.model) : undefined;
  if (!orderId || !status || !make || !model) return null;

  const steps: TrackingStep[] = Array.isArray(value.steps)
    ? value.steps.flatMap((item, index) => {
        if (!isRecord(item) || !stringValue(item.title)) return [];
        return [{
          step: numberValue(item.step) || index + 1,
          title: stringValue(item.title) || `Step ${index + 1}`,
          desc: stringValue(item.desc),
          date: stringValue(item.date),
          completed: booleanValue(item.completed),
          current: booleanValue(item.current),
        }];
      })
    : [];

  const events: TrackingEvent[] = Array.isArray(value.events)
    ? value.events.filter(isRecord).map((event) => ({
        id: stringValue(event.id),
        eventTimestamp: stringValue(event.eventTimestamp),
        status: stringValue(event.status),
        location: stringValue(event.location),
        vesselName: stringValue(event.vesselName),
        containerNo: stringValue(event.containerNo),
        details: stringValue(event.details),
        createdAt: stringValue(event.createdAt),
      }))
    : [];

  const statusHistory: StatusHistoryEntry[] = Array.isArray(value.statusHistory)
    ? value.statusHistory.flatMap((item) => {
        if (!isRecord(item) || !stringValue(item.toStatus)) return [];
        return [{
          id: stringValue(item.id),
          fromStatus: stringValue(item.fromStatus),
          toStatus: stringValue(item.toStatus) || 'Status updated',
          note: stringValue(item.note),
          createdAt: stringValue(item.createdAt),
        }];
      })
    : [];

  return {
    orderId,
    status,
    customerName: stringValue(value.customerName),
    originPort: stringValue(value.originPort),
    destinationPort: stringValue(value.destinationPort),
    vesselName: stringValue(value.vesselName),
    containerNo: stringValue(value.containerNo),
    currentLocation: stringValue(value.currentLocation),
    car: {
      make,
      model,
      year: numberValue(car?.year),
      vin: stringValue(car?.vin),
    },
    steps,
    events,
    statusHistory,
  };
};

const getResponseMessage = (value: unknown, fallback: string): string => {
  return isRecord(value) && stringValue(value.message) ? stringValue(value.message) || fallback : fallback;
};

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ onNavigate }) => {
  const { isLoaded, isSignedIn } = useAuthUser();
  const [trackingId, setTrackingId] = useState('');
  const [orders, setOrders] = useState<ImportSummary[]>([]);
  const [currentOrder, setCurrentOrder] = useState<TrackingOrder | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'not-found' | 'error'>('idle');
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setOrders([]);
      setCurrentOrder(null);
      return;
    }

    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError('');
    fetchMyImports()
      .then((response) => {
        if (cancelled) return;
        const raw = response as unknown as UnknownRecord;
        if (raw.success !== true || !Array.isArray(raw.data)) {
          setOrdersError(getResponseMessage(raw, 'Your import requests could not be loaded.'));
          setOrders([]);
          return;
        }
        setOrders(raw.data.map(mapImportSummary).filter((item): item is ImportSummary => Boolean(item)));
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([]);
          setOrdersError('Your import requests could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const handleLookup = async (value: string) => {
    const normalizedId = value.trim();
    if (!normalizedId) {
      setLookupState('error');
      setLookupMessage('Enter a tracking ID to look up your import request.');
      setCurrentOrder(null);
      return;
    }

    setTrackingId(normalizedId);
    setIsSearching(true);
    setLookupState('idle');
    setLookupMessage('');
    setCurrentOrder(null);

    try {
      const response = (await trackOrderShipment(normalizedId)) as unknown as UnknownRecord;
      const mapped = response.success === true && response.found === true ? mapTrackingOrder(response.data) : null;
      if (mapped) {
        setCurrentOrder(mapped);
        return;
      }

      const notFound = response.found === false || response.code === 'TRACKING_NOT_FOUND';
      setLookupState(notFound ? 'not-found' : 'error');
      setLookupMessage(
        getResponseMessage(response, notFound ? 'No import request was found for that tracking ID.' : 'Tracking is temporarily unavailable. Please try again.')
      );
    } catch {
      setLookupState('error');
      setLookupMessage('Tracking is temporarily unavailable. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleLookup(trackingId);
  };

  const latestEvent = useMemo(() => {
    if (!currentOrder || currentOrder.events.length === 0) return undefined;
    return [...currentOrder.events].sort((a, b) => {
      const aTime = new Date(a.eventTimestamp || a.createdAt || '').getTime();
      const bTime = new Date(b.eventTimestamp || b.createdAt || '').getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })[0];
  }, [currentOrder]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          Checking your account…
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Private order tracking</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Sign in to track your import</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tracking is available to the account that submitted the import request. Sign in to see your requests and their recorded progress.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="mt-7 w-full rounded-xl bg-[#0a502c] px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Sign in / create account
          </button>
          <button type="button" onClick={() => onNavigate('home')} className="mt-4 text-sm font-semibold text-slate-500 hover:text-slate-900">
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => onNavigate('home')} className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </button>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Import tracking</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Follow your request</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Select one of your import requests or enter its tracking ID. Updates below reflect records currently available in your account.
            </p>
          </div>
          <button type="button" onClick={() => onNavigate('import-form')} className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50">
            Start another request
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">Your import requests</h2>
                {ordersLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />}
              </div>
              {ordersError && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-800">{ordersError}</p>}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <Package className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-xs font-bold text-slate-700">No active import requests</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Requests linked to this account will appear here.</p>
                </div>
              )}
              <div className="space-y-2">
                {orders.map((order) => {
                  const selected = trackingId.trim().toUpperCase() === order.trackingId.trim().toUpperCase();
                  return (
                    <button
                      type="button"
                      key={order.trackingId}
                      aria-pressed={selected}
                      onClick={() => setTrackingId(order.trackingId)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11px] font-bold text-emerald-800">{order.trackingId}</p>
                          <p className="mt-1 truncate text-sm font-bold text-slate-900">{order.year ? `${order.year} ` : ''}{order.make} {order.model}</p>
                        </div>
                        <ChevronRight className={`mt-1 h-4 w-4 shrink-0 ${selected ? 'text-emerald-700' : 'text-slate-400'}`} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>{order.status || 'Status not recorded'}</span>
                        {order.createdAt && <span>{formatShortDate(order.createdAt)}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-100 shadow-sm">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <h2 className="text-sm font-bold">Need help?</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-300">Use the tracking ID from your request confirmation. No documents or live vessel telemetry are shown unless the relevant record is available.</p>
                </div>
              </div>
            </section>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="tracking-id" className="sr-only">Tracking ID</label>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="tracking-id"
                    type="text"
                    value={trackingId}
                    onChange={(event) => setTrackingId(event.target.value)}
                    placeholder="Enter tracking ID"
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <button type="submit" disabled={isSearching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a502c] px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isSearching ? 'Looking up…' : 'Track request'}
                </button>
              </form>
              {lookupMessage && (
                <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${lookupState === 'not-found' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{lookupMessage}</span>
                </div>
              )}
            </section>

            {!currentOrder && !isSearching && !lookupMessage && (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Ship className="h-7 w-7" /></div>
                <h2 className="mt-4 text-xl font-black text-slate-900">No request selected</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose a request from the list or enter a tracking ID to view its recorded milestones, shipment details, and activity.</p>
              </section>
            )}

            {currentOrder && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-all text-xl font-black text-slate-950 sm:text-2xl">{currentOrder.car.year ? `${currentOrder.car.year} ` : ''}{currentOrder.car.make} {currentOrder.car.model}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900"><Ship className="h-3.5 w-3.5" />{currentOrder.status}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">{currentOrder.orderId}</span>
                        {currentOrder.customerName && <span>For {currentOrder.customerName}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(currentOrder.orderId);
                        setCopiedOrderId(true);
                        window.setTimeout(() => setCopiedOrderId(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {copiedOrderId ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedOrderId ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoCell label="Origin port" value={currentOrder.originPort} icon={<Anchor className="h-4 w-4" />} />
                    <InfoCell label="Destination port" value={currentOrder.destinationPort} icon={<MapPin className="h-4 w-4" />} />
                    <InfoCell label="Vessel" value={currentOrder.vesselName} icon={<Ship className="h-4 w-4" />} />
                    <InfoCell label="Container" value={currentOrder.containerNo} icon={<Package className="h-4 w-4" />} />
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Vehicle details</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <p className="font-bold text-slate-900">{currentOrder.car.year ? `${currentOrder.car.year} ` : ''}{currentOrder.car.make} {currentOrder.car.model}</p>
                      <p className="font-mono text-xs text-slate-600">VIN: {currentOrder.car.vin || 'Not recorded'}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Progress</p><h2 className="mt-1 text-lg font-black text-slate-950">Shipment milestones</h2></div>
                    <Clock3 className="h-5 w-5 text-slate-400" />
                  </div>
                  {currentOrder.steps.length === 0 ? (
                    <EmptySection text="Milestones have not been recorded yet." />
                  ) : (
                    <div className="mt-5 space-y-5">
                      {currentOrder.steps.map((step, index) => (
                        <div key={`${step.step}-${step.title}-${index}`} className="relative flex gap-4">
                          {index < currentOrder.steps.length - 1 && <span className="absolute left-3.5 top-8 h-[calc(100%+1.25rem)] w-px bg-slate-200" />}
                          <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step.completed ? 'bg-[#0a502c] text-white' : step.current ? 'bg-emerald-100 text-emerald-800 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-400'}`}>
                            {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.current ? <Circle className="h-3.5 w-3.5 fill-current" /> : <span className="text-xs font-bold">{step.step}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className={`text-sm font-bold ${step.completed || step.current ? 'text-slate-900' : 'text-slate-500'}`}>{step.title}</h3><span className="text-xs text-slate-400">{formatShortDate(step.date)}</span></div>
                            <p className={`mt-1 text-xs leading-5 ${step.current ? 'font-semibold text-emerald-800' : 'text-slate-500'}`}>{step.desc || 'No additional details recorded.'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Latest recorded event</p><h2 className="mt-1 text-lg font-black text-slate-950">Where things stand</h2></div>
                    <span className="max-w-xs text-right text-[11px] leading-4 text-slate-500">This is staff-recorded information, not live GPS or AIS telemetry.</span>
                  </div>
                  {latestEvent ? (
                    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">{latestEvent.status || currentOrder.status}</h3><p className="mt-1 text-xs text-slate-600">Recorded {formatDate(latestEvent.eventTimestamp || latestEvent.createdAt)}</p></div><Clock3 className="h-5 w-5 text-emerald-700" /></div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-800"><MapPin className="h-4 w-4 text-emerald-700" />{latestEvent.location || currentOrder.currentLocation || 'Location not recorded'}</span>{(latestEvent.location || currentOrder.currentLocation) && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(latestEvent.location || currentOrder.currentLocation || '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline">Open in Google Maps <ExternalLink className="h-3 w-3" /></a>}</div>
                      {latestEvent.details && <p className="mt-3 text-xs leading-5 text-slate-600">{latestEvent.details}</p>}
                    </div>
                  ) : (
                    <EmptySection text="No staff-recorded tracking event is available yet." />
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="border-b border-slate-100 pb-4"><p className="text-xs font-black uppercase tracking-wider text-emerald-700">History</p><h2 className="mt-1 text-lg font-black text-slate-950">Status history</h2></div>
                  {currentOrder.statusHistory.length === 0 ? <EmptySection text="No status history has been recorded yet." /> : <div className="mt-5 divide-y divide-slate-100">{currentOrder.statusHistory.map((entry, index) => <div key={entry.id || `${entry.toStatus}-${entry.createdAt}-${index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold text-slate-900">{entry.toStatus}</p><span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span></div>{entry.fromStatus && <p className="mt-1 text-xs text-slate-500">From {entry.fromStatus}</p>}{entry.note && <p className="mt-1 text-xs leading-5 text-slate-600">{entry.note}</p>}</div></div>)}</div>}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const InfoCell: React.FC<{ label: string; value?: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-200 p-3">
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{icon}{label}</div>
    <p className="mt-2 truncate text-sm font-bold text-slate-900">{value || 'Not recorded'}</p>
  </div>
);

const EmptySection: React.FC<{ text: string }> = ({ text }) => <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>;
