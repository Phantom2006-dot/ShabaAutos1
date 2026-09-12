import React, { FormEvent, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  CarFront,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuthUser } from '../context/AuthContext';
import {
  approveOperationsVehicle,
  createOperationsVehicle,
  fetchOperationsAudit,
  fetchOperationsNotifications,
  fetchOperationsSummary,
  fetchOperationsVehicles,
  OperationsAuditEntry,
  OperationsMetrics,
  OperationsNotification,
  OperationsVehicle,
} from '../services/api';
import { ScreenId } from '../types';

interface OperationsDashboardScreenProps { onNavigate: (screen: ScreenId) => void; }

type Tab = 'overview' | 'inventory' | 'notifications' | 'audit';

const emptyMetrics: OperationsMetrics = { totalVehicles: 0, pendingApproval: 0, available: 0, reserved: 0, sold: 0, delisted: 0, unreadNotifications: 0 };

export const OperationsDashboardScreen: React.FC<OperationsDashboardScreenProps> = ({ onNavigate }) => {
  const { user, role, getToken, isDemoMode } = useAuthUser();
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<OperationsMetrics>(emptyMetrics);
  const [vehicles, setVehicles] = useState<OperationsVehicle[]>([]);
  const [notifications, setNotifications] = useState<OperationsNotification[]>([]);
  const [audit, setAudit] = useState<OperationsAuditEntry[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ make: '', model: '', year: '2024', priceNgn: '', mileage: '', stockId: '', location: 'Lagos', bodyType: 'SUV', fuelType: 'Petrol', transmission: 'Automatic', description: '', images: '' });

  const load = async () => {
    setLoading(true);
    try {
      const token = (await getToken()) || (isDemoMode ? `demo_token_${role}` : null);
      const [summaryResult, inventoryResult, inboxResult] = await Promise.allSettled([
        fetchOperationsSummary(token || undefined),
        fetchOperationsVehicles(statusFilter || undefined, token || undefined),
        fetchOperationsNotifications(token || undefined),
      ]);
      if (summaryResult.status === 'fulfilled') setMetrics(summaryResult.value.metrics);
      if (inventoryResult.status === 'fulfilled') setVehicles(inventoryResult.value.data || []);
      if (inboxResult.status === 'fulfilled') setNotifications(inboxResult.value.data || []);
      if (role === 'admin') {
        const auditResult = await fetchOperationsAudit(token || undefined).catch(() => null);
        if (auditResult) setAudit(auditResult.data || []);
      }
      if ([summaryResult, inventoryResult, inboxResult].every((result) => result.status === 'rejected')) {
        setMessage('The operations service could not be reached. Please try again.');
      } else {
        setMessage('');
      }
    } catch {
      setMessage('The operations service could not be reached. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [statusFilter, role]);

  const submitVehicle = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const result = await createOperationsVehicle({ ...form, year: Number(form.year), priceNgn: Number(form.priceNgn), mileage: Number(form.mileage), images: form.images.split(',').map((item) => item.trim()).filter(Boolean) }, (await getToken()) || (isDemoMode ? `demo_token_${role}` : undefined));
    if (!result.success) { setMessage(result.message || 'Vehicle could not be submitted.'); return; }
    setMessage('Vehicle submitted. It is now waiting for inspection and admin approval.');
    setShowVehicleForm(false);
    setForm({ make: '', model: '', year: '2024', priceNgn: '', mileage: '', stockId: '', location: 'Lagos', bodyType: 'SUV', fuelType: 'Petrol', transmission: 'Automatic', description: '', images: '' });
    await load();
  };

  const approve = async (vehicle: OperationsVehicle) => {
    const result = await approveOperationsVehicle(vehicle.id, (await getToken()) || (isDemoMode ? `demo_token_${role}` : undefined));
    setMessage(result.success ? `${vehicle.make} ${vehicle.model} is now approved and verified.` : (result.message || 'Approval failed.'));
    await load();
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'inventory', label: 'Inventory', icon: <CarFront size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    ...(role === 'admin' ? [{ id: 'audit' as Tab, label: 'Audit log', icon: <FileCheck2 size={16} /> }] : []),
  ];

  if (role !== 'staff' && role !== 'admin') {
    return <div className="min-h-[70vh] flex items-center justify-center p-6"><div className="shaba-premium-card rounded-2xl bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-[#0e7c3a]" /><h1 className="text-xl font-black">Operations access required</h1><p className="mt-2 text-sm text-slate-500">This workspace is limited to authorized ShabaAutos staff and administrators.</p><button className="mt-5 rounded-xl bg-[#12492f] px-5 py-3 text-sm font-bold text-white" onClick={() => onNavigate('home')}>Return home</button></div></div>;
  }

  return (
    <div className="operations-dashboard min-h-screen bg-[#f5f8f5] px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#0e7c3a]">ShabaAutos operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Good morning, {user?.fullName.split(' ')[0]}</h1><p className="mt-1 text-sm text-slate-500">Manage inventory, approvals, and operational signals from one controlled workspace.</p></div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{role} workspace</span><button type="button" onClick={() => setShowVehicleForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#12492f] px-4 py-2.5 text-xs font-black text-white shadow-sm"><Plus size={15} /> Add vehicle</button></div>
        </header>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[['Total inventory', metrics.totalVehicles, CarFront], ['Awaiting approval', metrics.pendingApproval, Clock3], ['Verified available', metrics.available, CheckCircle2], ['Reserved', metrics.reserved, ClipboardCheck], ['Sold', metrics.sold, ShieldCheck], ['Unread alerts', metrics.unreadNotifications, Bell]].map(([label, value, Icon]) => <div key={String(label)} className="shaba-premium-card rounded-2xl bg-white p-4"><Icon className="text-[#0e7c3a]" size={18} /><div className="mt-3 text-2xl font-black text-slate-950">{value as number}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{label as string}</div></div>)}
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">{navItems.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold lg:w-full ${tab === item.id ? 'bg-[#12492f] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-emerald-50'}`}>{item.icon}{item.label}{item.id === 'notifications' && metrics.unreadNotifications > 0 && <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-[#12492f]">{metrics.unreadNotifications}</span>}</button>)}</nav>
          <section className="min-w-0">
            {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900">{message}</div>}
            {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading operations workspace…</div> : tab === 'overview' ? <Overview metrics={metrics} vehicles={vehicles} onInventory={() => setTab('inventory')} /> : tab === 'inventory' ? <Inventory vehicles={vehicles} filter={statusFilter} setFilter={setStatusFilter} canApprove={role === 'admin'} onApprove={approve} onAdd={() => setShowVehicleForm(true)} /> : tab === 'notifications' ? <Notifications items={notifications} /> : <Audit items={audit} />}
          </section>
        </div>
      </div>
      {showVehicleForm && <VehicleForm form={form} setForm={setForm} onClose={() => setShowVehicleForm(false)} onSubmit={submitVehicle} />}
    </div>
  );
};

const Overview: React.FC<{ metrics: OperationsMetrics; vehicles: OperationsVehicle[]; onInventory: () => void }> = ({ metrics, vehicles, onInventory }) => <div className="space-y-5"><div className="rounded-2xl bg-[#123f2a] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-200">Control centre</p><h2 className="mt-2 text-2xl font-black">Keep every vehicle moving through the right gate.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100">New intake starts as an unverified draft. Staff can submit the evidence; only an administrator can approve a listing for customer discovery.</p></div><ShieldCheck className="hidden text-emerald-200 sm:block" size={36} /></div><button type="button" onClick={onInventory} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#123f2a]">Review inventory queue</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Latest intake</p><h2 className="mt-1 text-lg font-black">Vehicles needing attention</h2></div><button type="button" onClick={onInventory} className="text-xs font-black text-[#0e7c3a]">Open queue</button></div><div className="mt-4 space-y-2">{vehicles.filter((vehicle) => !vehicle.verified).slice(0, 4).map((vehicle) => <div key={vehicle.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"><div><p className="text-sm font-black text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p><p className="mt-0.5 text-[11px] text-slate-500">{vehicle.stockId} · {vehicle.location}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">Review</span></div>)}{vehicles.filter((vehicle) => !vehicle.verified).length === 0 && <p className="py-5 text-center text-sm text-slate-500">No pending vehicles in this view.</p>}</div></div></div>;

const Inventory: React.FC<{ vehicles: OperationsVehicle[]; filter: string; setFilter: (value: string) => void; canApprove: boolean; onApprove: (vehicle: OperationsVehicle) => void; onAdd: () => void }> = ({ vehicles, filter, setFilter, canApprove, onApprove, onAdd }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Inventory control</p><h2 className="mt-1 text-lg font-black">Vehicle listings</h2></div><div className="flex gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><option value="">All status</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="delisted">Delisted</option></select><button type="button" onClick={onAdd} className="rounded-lg bg-[#12492f] px-3 py-2 text-xs font-black text-white">Add</button></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Vehicle</th><th className="px-3 py-3">Stock ID</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">State</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{vehicles.map((vehicle) => <tr key={vehicle.id}><td className="px-3 py-3"><div className="font-black text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</div><div className="mt-1 text-[10px] text-slate-500">{vehicle.bodyType} · {vehicle.location}</div></td><td className="px-3 py-3 font-mono text-[10px] text-slate-500">{vehicle.stockId}</td><td className="px-3 py-3 font-black text-[#0e7c3a]">₦{vehicle.priceNgn.toLocaleString()}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${vehicle.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{vehicle.verified ? 'Verified' : 'Pending review'}</span></td><td className="px-3 py-3">{canApprove && !vehicle.verified ? <button type="button" onClick={() => onApprove(vehicle)} className="rounded-lg bg-[#12492f] px-3 py-2 text-[10px] font-black text-white">Approve</button> : <span className="text-[10px] text-slate-400">{vehicle.verified ? 'Published gate passed' : 'Awaiting admin'}</span>}</td></tr>)}</tbody></table>{vehicles.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No vehicles match this filter.</p>}</div></div>;

const Notifications: React.FC<{ items: OperationsNotification[] }> = ({ items }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">In-app inbox</p><h2 className="mt-1 text-lg font-black">Operational notifications</h2><div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3"><Bell className="mt-0.5 shrink-0 text-[#0e7c3a]" size={16} /><div><p className="text-sm font-black text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()} · {item.status}</p></div></div>)}{items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No notifications yet.</p>}</div></div>;

const Audit: React.FC<{ items: OperationsAuditEntry[] }> = ({ items }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Administrator view</p><h2 className="mt-1 text-lg font-black">Audit trail</h2><div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3"><div><p className="text-xs font-black text-slate-900">{item.action}</p><p className="mt-1 text-[10px] text-slate-500">{item.resourceType} · {item.resourceId} · {item.actorRole}</p></div><time className="shrink-0 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div>)}{items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No audit entries yet.</p>}</div></div>;

interface VehicleFormProps { form: Record<string, string>; setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>; onClose: () => void; onSubmit: (event: FormEvent) => void; }
const VehicleForm: React.FC<VehicleFormProps> = ({ form, setForm, onClose, onSubmit }) => { const update = (key: string, value: string) => setForm((previous) => ({ ...previous, [key]: value })); return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Inventory intake</p><h2 className="mt-1 text-xl font-black">Submit a vehicle for approval</h2></div><button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2"><X size={16} /></button></div><form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Make" value={form.make} onChange={(value) => update('make', value)} required /><Field label="Model" value={form.model} onChange={(value) => update('model', value)} required /><Field label="Year" type="number" value={form.year} onChange={(value) => update('year', value)} required /><Field label="Price (₦)" type="number" value={form.priceNgn} onChange={(value) => update('priceNgn', value)} required /><Field label="Mileage (km)" type="number" value={form.mileage} onChange={(value) => update('mileage', value)} required /><Field label="Stock ID" value={form.stockId} onChange={(value) => update('stockId', value)} required /><Field label="Location" value={form.location} onChange={(value) => update('location', value)} /><Field label="Body type" value={form.bodyType} onChange={(value) => update('bodyType', value)} /><Field label="Fuel type" value={form.fuelType} onChange={(value) => update('fuelType', value)} /><Field label="Transmission" value={form.transmission} onChange={(value) => update('transmission', value)} /><div className="sm:col-span-2"><label className="text-xs font-bold text-slate-700">Description<textarea required value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label></div><div className="sm:col-span-2"><Field label="Image URLs (comma separated)" value={form.images} onChange={(value) => update('images', value)} /></div><div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-xs font-black text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-[#12492f] px-5 py-3 text-xs font-black text-white">Submit for review</button></div></form></div></div>; };

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }> = ({ label, value, onChange, type = 'text', required }) => <label className="text-xs font-bold text-slate-700">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0e7c3a]" /></label>;
