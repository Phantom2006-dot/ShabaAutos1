import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ArrowDown,
  ArrowUp,
  Bell,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { OperationsWorkflows } from './OperationsWorkflows';
import { useAuthUser } from '../context/AuthContext';
import {
  approveOperationsVehicle,
  createOperationsVehicle,
  deleteOperationsVehicle,
  fetchOperationsAudit,
  fetchOperationsNotifications,
  markOperationsNotificationRead,
  fetchOperationsSummary,
  fetchOperationsVehicleImages,
  fetchOperationsVehicles,
  OperationsAuditEntry,
  OperationsMetrics,
  OperationsNotification,
  OperationsVehicle,
  OperationsVehicleImage,
  reorderOperationsVehicleImages,
  updateOperationsVehicle,
  updateOperationsVehicleImage,
  uploadOperationsVehicleImages,
  deleteOperationsVehicleImage,
} from '../services/api';
import { ScreenId } from '../types';

interface OperationsDashboardScreenProps { onNavigate: (screen: ScreenId) => void; }
type Tab = 'overview' | 'inventory' | 'notifications' | 'audit' | 'sell' | 'concierge' | 'imports' | 'rentals' | 'analytics' | 'settings';
type Role = 'staff' | 'admin';
type VehicleFormState = Record<string, string>;
type PanelErrors = { summary?: string; inventory?: string; notifications?: string; audit?: string };

type FilePreview = { file: File; url: string };
const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const emptyForm: VehicleFormState = {
  make: '', model: '', trim: '', year: '', priceNgn: '', mileage: '', stockId: '', location: '',
  condition: '', bodyType: '', fuelType: '', transmission: '', engine: '', driveType: '', color: '', seats: '', description: '', status: 'available',
};

const makeForm = (vehicle?: OperationsVehicle): VehicleFormState => vehicle ? {
  make: vehicle.make || '', model: vehicle.model || '', trim: vehicle.trim || '', year: String(vehicle.year || ''), priceNgn: String(vehicle.priceNgn || ''), mileage: String(vehicle.mileage || ''), stockId: vehicle.stockId || '', location: vehicle.location || '',
  condition: vehicle.condition || '', bodyType: vehicle.bodyType || '', fuelType: vehicle.fuelType || '', transmission: vehicle.transmission || '', engine: vehicle.engine || '', driveType: vehicle.driveType || '', color: vehicle.color || '', seats: String(vehicle.seats || ''), description: vehicle.description || '', status: vehicle.status || 'available',
} : { ...emptyForm };

const tokenFor = async (getToken: () => Promise<string | null>, isDemoMode: boolean, role: string) => (await getToken()) || (isDemoMode ? `demo_token_${role}` : undefined);

const lifecycleLabel = (status: OperationsVehicle['status']) => status.charAt(0).toUpperCase() + status.slice(1);
const badgeForStatus = (status: OperationsVehicle['status']) => ({ available: 'bg-emerald-100 text-emerald-800', reserved: 'bg-blue-100 text-blue-800', sold: 'bg-slate-200 text-slate-700', delisted: 'bg-red-100 text-red-800' }[status]);

export const OperationsDashboardScreen: React.FC<OperationsDashboardScreenProps> = ({ onNavigate }) => {
  const { role, getToken, isDemoMode } = useAuthUser();
  const operatorRole = role as Role;
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [vehicles, setVehicles] = useState<OperationsVehicle[]>([]);
  const [notifications, setNotifications] = useState<OperationsNotification[]>([]);
  const [audit, setAudit] = useState<OperationsAuditEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [panelErrors, setPanelErrors] = useState<PanelErrors>({});
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<OperationsVehicle | undefined>();
  const [form, setForm] = useState<VehicleFormState>(emptyForm);
  const [images, setImages] = useState<OperationsVehicleImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImageAction, setPendingImageAction] = useState<string | null>(null);
  const [draftVehicleId, setDraftVehicleId] = useState<string | null>(null);
  const previewUrls = useRef<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const token = await tokenFor(getToken, isDemoMode, role);
    const nextErrors: PanelErrors = {};
    const [summaryResult, inventoryResult, inboxResult] = await Promise.allSettled([
      fetchOperationsSummary(token),
      fetchOperationsVehicles(statusFilter || undefined, token),
      fetchOperationsNotifications(token),
    ]);
    if (summaryResult.status === 'fulfilled' && summaryResult.value.success && summaryResult.value.metrics) setMetrics(summaryResult.value.metrics);
    else nextErrors.summary = summaryResult.status === 'fulfilled' ? 'Summary data is unavailable.' : 'Could not load summary data.';
    if (inventoryResult.status === 'fulfilled' && inventoryResult.value.success) setVehicles(inventoryResult.value.data || []);
    else nextErrors.inventory = inventoryResult.status === 'fulfilled' ? 'Inventory data is unavailable.' : 'Could not load inventory.';
    if (inboxResult.status === 'fulfilled' && inboxResult.value.success) setNotifications(inboxResult.value.data || []);
    else nextErrors.notifications = inboxResult.status === 'fulfilled' ? 'Notification data is unavailable.' : 'Could not load notifications.';
    if (operatorRole === 'admin') {
      const auditResult = await fetchOperationsAudit(token).catch(() => null);
      if (auditResult?.success) setAudit(auditResult.data || []);
      else nextErrors.audit = 'Could not load the audit trail.';
    }
    setPanelErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) setMessage({ kind: 'error', text: 'Some operations data could not be loaded. Review the affected panel and retry.' });
    else setMessage(null);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [statusFilter, operatorRole]);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((vehicle) => [vehicle.make, vehicle.model, vehicle.stockId, vehicle.location, String(vehicle.year)].some((value) => value?.toLowerCase().includes(query)));
  }, [vehicles, searchQuery]);

  const openCreate = () => {
    setEditingVehicle(undefined); setDraftVehicleId(null); setForm(makeForm()); setImages([]); setImageError(''); setFilePreviews([]); setShowVehicleForm(true); setMessage(null);
  };
  const openEdit = async (vehicle: OperationsVehicle) => {
    setEditingVehicle(vehicle); setDraftVehicleId(vehicle.id); setForm(makeForm(vehicle)); setImages([]); setImageError(''); setFilePreviews([]); setShowVehicleForm(true); setMessage(null); setImagesLoading(true);
    try {
      const result = await fetchOperationsVehicleImages(vehicle.id, await tokenFor(getToken, isDemoMode, role));
      if (result.success) setImages(result.data || []); else setImageError(result.message || 'Images could not be loaded. Retry before changing the gallery.');
    } catch { setImageError('Images could not be loaded because the service could not be reached. Retry before changing the gallery.'); }
    setImagesLoading(false);
  };
  const closeForm = (force = false) => {
    if ((!force && (saving || uploading)) || (!force && filePreviews.length > 0 && !window.confirm('Selected files have not been uploaded. Close and discard them?'))) return;
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setShowVehicleForm(false); setEditingVehicle(undefined); setDraftVehicleId(null); setFilePreviews([]); setImages([]); setImageError('');
  };

  const validateFiles = (files: File[], existingCount: number) => {
    if (existingCount + files.length > MAX_IMAGE_COUNT) return `Choose no more than ${MAX_IMAGE_COUNT} images in total.`;
    const invalidType = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (invalidType) return `${invalidType.name} is not supported. Use JPEG, PNG, or WebP.`;
    const tooLarge = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) return `${tooLarge.name} is larger than 8 MB. Choose a smaller image.`;
    return '';
  };
  const onFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    event.target.value = '';
    const validationError = validateFiles(files, images.length + filePreviews.length);
    if (validationError) { setImageError(validationError); return; }
    const nextPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    nextPreviews.forEach((preview) => previewUrls.current.add(preview.url));
    setImageError(''); setFilePreviews((previous) => [...previous, ...nextPreviews]);
  };
  const removeSelectedFile = (url: string) => {
    URL.revokeObjectURL(url); previewUrls.current.delete(url);
    setFilePreviews((previous) => previous.filter((preview) => preview.url !== url));
  };

  const uploadFiles = async (vehicleId: string, previews: FilePreview[]) => {
    if (previews.length === 0) return true;
    setUploading(true); setImageError('');
    try {
      const result = await uploadOperationsVehicleImages(vehicleId, previews.map((preview) => preview.file), await tokenFor(getToken, isDemoMode, role));
      if (!result.success) { setImageError(result.message || 'Image upload failed. The draft was kept; retry the upload.'); return false; }
      const refreshed = await fetchOperationsVehicleImages(vehicleId, await tokenFor(getToken, isDemoMode, role));
      if (refreshed.success) setImages(refreshed.data || []);
      else setImageError('Images uploaded, but the gallery could not be refreshed. Reopen this listing to see them.');
      previews.forEach((preview) => { URL.revokeObjectURL(preview.url); previewUrls.current.delete(preview.url); });
      setFilePreviews([]); return true;
    } catch { setImageError('Image upload failed because the service could not be reached. The draft was kept; retry the upload.'); return false; }
    finally { setUploading(false); }
  };

  const buildPayload = (): Record<string, unknown> => ({
    make: form.make.trim(), model: form.model.trim(), trim: form.trim.trim() || undefined, year: Number(form.year), priceNgn: Number(form.priceNgn), mileage: Number(form.mileage), stockId: form.stockId.trim(), location: form.location.trim(), condition: form.condition, bodyType: form.bodyType, fuelType: form.fuelType, transmission: form.transmission, engine: form.engine.trim(), driveType: form.driveType, color: form.color.trim(), seats: Number(form.seats), description: form.description.trim(), ...(operatorRole === 'admin' ? { status: form.status } : {}),
  });
  const validateForm = () => {
    const numeric = [['year', form.year], ['price', form.priceNgn], ['mileage', form.mileage], ['seats', form.seats]];
    if (!form.make.trim() || !form.model.trim() || !form.stockId.trim() || !form.location.trim() || !form.description.trim()) return 'Make, model, stock ID, location, and description are required.';
    if ([form.condition, form.bodyType, form.fuelType, form.transmission, form.driveType].some((value) => !value)) return 'Complete each vehicle specification before saving.';
    if (numeric.some(([, value]) => !value || !Number.isFinite(Number(value)) || Number(value) < 0)) return 'Year, price, mileage, and seats must be valid non-negative numbers.';
    if (Number(form.year) < 1886 || Number(form.year) > new Date().getFullYear() + 1) return 'Enter a realistic model year.';
    return '';
  };
  const submitVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) { setMessage({ kind: 'error', text: validationError }); return; }
    setSaving(true); setMessage(null); setImageError('');
    const token = await tokenFor(getToken, isDemoMode, role);
    try {
      let vehicleId = editingVehicle?.id || draftVehicleId;
      if (vehicleId) {
        const result = await updateOperationsVehicle(vehicleId, buildPayload(), token);
        if (!result.success) { setMessage({ kind: 'error', text: result.message || 'Vehicle changes could not be saved.' }); return; }
        if (result.data) { setEditingVehicle(result.data); setForm(makeForm(result.data)); }
      } else {
        // Intentionally create the database draft before sending any binary files.
        const result = await createOperationsVehicle(buildPayload(), token);
        if (!result.success || !result.data?.id) { setMessage({ kind: 'error', text: result.message || 'Vehicle draft could not be created.' }); return; }
        vehicleId = result.data.id; setDraftVehicleId(vehicleId); setEditingVehicle(result.data);
      }
      const uploaded = await uploadFiles(vehicleId, filePreviews);
      if (!uploaded) { setMessage({ kind: 'info', text: 'Draft saved. The selected files remain available in this form; retry the upload when ready.' }); await load(); return; }
      setMessage({ kind: 'success', text: editingVehicle ? 'Vehicle changes saved.' : 'Vehicle draft saved and submitted for review.' });
      await load();
      closeForm(true);
    } catch { setMessage({ kind: 'error', text: 'The vehicle could not be saved because the service could not be reached. Retry without leaving this form.' }); }
    finally { setSaving(false); }
  };

  const refreshImages = async (vehicleId: string) => {
    setImagesLoading(true);
    try {
      const result = await fetchOperationsVehicleImages(vehicleId, await tokenFor(getToken, isDemoMode, role));
      if (result.success) { setImages(result.data || []); setImageError(''); } else setImageError(result.message || 'Images could not be refreshed.');
    } catch { setImageError('Images could not be refreshed because the service could not be reached.'); }
    setImagesLoading(false);
  };
  const updateImage = async (image: OperationsVehicleImage, payload: { isPrimary?: boolean; caption?: string; displayOrder?: number }) => {
    if (!draftVehicleId) return; setPendingImageAction(image.id); setImageError('');
    try {
      const result = await updateOperationsVehicleImage(draftVehicleId, image.id, payload, await tokenFor(getToken, isDemoMode, role));
      if (result.success) await refreshImages(draftVehicleId);
      else setImageError(result.message || 'Image changes could not be saved.');
    } catch { setImageError('Image changes could not be saved because the service could not be reached.'); }
    setPendingImageAction(null);
  };
  const moveImage = async (index: number, direction: -1 | 1) => {
    if (!draftVehicleId || index + direction < 0 || index + direction >= images.length) return;
    const next = [...images]; const [item] = next.splice(index, 1); next.splice(index + direction, 0, item); setPendingImageAction(item.id);
    try {
      const result = await reorderOperationsVehicleImages(draftVehicleId, next.map((image) => image.id), await tokenFor(getToken, isDemoMode, role));
      if (result.success && result.data) setImages(result.data); else { setImageError(result.message || 'Image order could not be saved.'); await refreshImages(draftVehicleId); }
    } catch { setImageError('Image order could not be saved because the service could not be reached.'); await refreshImages(draftVehicleId); }
    setPendingImageAction(null);
  };
  const removeImage = async (image: OperationsVehicleImage) => {
    if (!draftVehicleId || !window.confirm(`Remove this image from ${form.stockId || 'the listing'}? This cannot be undone.`)) return;
    setPendingImageAction(image.id);
    try {
      const result = await deleteOperationsVehicleImage(draftVehicleId, image.id, await tokenFor(getToken, isDemoMode, role));
      if (result.success) setImages((current) => current.filter((item) => item.id !== image.id)); else setImageError(result.message || 'Image could not be removed.');
    } catch { setImageError('Image could not be removed because the service could not be reached.'); }
    setPendingImageAction(null);
  };
  const approve = async (vehicle: OperationsVehicle) => {
    if (!window.confirm(`Approve ${vehicle.year} ${vehicle.make} ${vehicle.model} for customer discovery? Approval does not claim that an inspection was completed.`)) return;
    setPendingImageAction(`approve-${vehicle.id}`);
    try { const result = await approveOperationsVehicle(vehicle.id, await tokenFor(getToken, isDemoMode, role)); setMessage({ kind: result.success ? 'success' : 'error', text: result.success ? 'Listing approved. Inspection status remains separate.' : (result.message || 'Approval failed.') }); if (result.success) await load(); } catch { setMessage({ kind: 'error', text: 'Approval could not be completed because the service could not be reached.' }); }
    setPendingImageAction(null);
  };
  const removeVehicle = async (vehicle: OperationsVehicle) => {
    if (!window.confirm(`Permanently delete ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.stockId}) and its images?`)) return;
    setPendingImageAction(`delete-${vehicle.id}`);
    try { const result = await deleteOperationsVehicle(vehicle.id, await tokenFor(getToken, isDemoMode, role)); setMessage({ kind: result.success ? 'success' : 'error', text: result.success ? 'Vehicle deleted.' : (result.message || 'Vehicle deletion failed.') }); if (result.success) await load(); } catch { setMessage({ kind: 'error', text: 'Vehicle deletion could not be completed because the service could not be reached.' }); }
    setPendingImageAction(null);
  };

  const markNotificationRead = async (item: OperationsNotification) => {
    setPendingImageAction(`notification-${item.id}`);
    try {
      const result = await markOperationsNotificationRead(item.id, await tokenFor(getToken, isDemoMode, role));
      if (!result.success) throw new Error(result.message || 'Could not mark notification as read.');
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'read' } : entry));
      setMetrics((current) => current ? { ...current, unreadNotifications: Math.max(0, current.unreadNotifications - 1) } : current);
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update notification.' }); }
    finally { setPendingImageAction(null); }
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'inventory', label: 'Inventory', icon: <CarFront size={16} /> },
    { id: 'sell', label: 'Seller reviews', icon: <ClipboardList size={16} /> },
    { id: 'concierge', label: 'Concierge', icon: <Search size={16} /> },
    { id: 'imports', label: 'Imports', icon: <Truck size={16} /> },
    { id: 'rentals', label: 'Rentals', icon: <CarFront size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'settings', label: 'Site settings', icon: <Settings2 size={16} /> },
    ...(operatorRole === 'admin' ? [{ id: 'audit' as Tab, label: 'Audit log', icon: <FileCheck2 size={16} /> }] : []),
  ];
  if (role !== 'staff' && role !== 'admin') return <div className="min-h-[70vh] flex items-center justify-center p-6"><div className="shaba-premium-card rounded-2xl bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-[#0e7c3a]" /><h1 className="text-xl font-black">Operations access required</h1><p className="mt-2 text-sm text-slate-500">This workspace is limited to authorized ShabaAutos staff and administrators.</p><button className="mt-5 rounded-xl bg-[#12492f] px-5 py-3 text-sm font-bold text-white" onClick={() => onNavigate('home')}>Return home</button></div></div>;

  return <div className="operations-dashboard min-h-screen bg-[#f5f8f5] px-4 py-5 sm:px-6 lg:px-10"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#0e7c3a]">ShabaAutos operations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Inventory control centre</h1><p className="mt-1 text-sm text-slate-500">Review listing state, evidence, and media without conflating approval with inspection.</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${operatorRole === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{operatorRole} workspace</span><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#12492f] px-4 py-2.5 text-xs font-black text-white shadow-sm"><Plus size={15} /> Add vehicle</button></div></header>
    {metrics ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[['Total inventory', metrics.totalVehicles, CarFront], ['Awaiting approval', metrics.pendingApproval, Clock3], ['Verified available', metrics.available, CheckCircle2], ['Reserved', metrics.reserved, ClipboardCheck], ['Sold', metrics.sold, CarFront], ['Unread alerts', metrics.unreadNotifications, Bell]].map(([label, value, Icon]) => <div key={String(label)} className="shaba-premium-card rounded-2xl bg-white p-4"><Icon className="text-[#0e7c3a]" size={18} /><div className="mt-3 text-2xl font-black text-slate-950">{value as number}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{label as string}</div></div>)}</div> : panelErrors.summary && <PanelError message={panelErrors.summary} onRetry={load} />}
    <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]"><nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">{navItems.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold lg:w-full ${tab === item.id ? 'bg-[#12492f] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-emerald-50'}`}>{item.icon}{item.label}{item.id === 'notifications' && metrics?.unreadNotifications ? <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-[#12492f]">{metrics.unreadNotifications}</span> : null}</button>)}</nav><section className="min-w-0">{message && <div className={`mb-4 rounded-xl border px-4 py-3 text-xs font-bold ${message.kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : message.kind === 'info' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message.text}</div>}{loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading operations workspace…</div> : tab === 'overview' ? <Overview metrics={metrics} vehicles={vehicles} onInventory={() => setTab('inventory')} /> : tab === 'inventory' ? <Inventory vehicles={filteredVehicles} filter={statusFilter} setFilter={setStatusFilter} search={searchQuery} setSearch={setSearchQuery} inventoryError={panelErrors.inventory} onRetry={load} canApprove={operatorRole === 'admin'} pendingAction={pendingImageAction} onApprove={approve} onDelete={operatorRole === 'admin' ? removeVehicle : undefined} onEdit={openEdit} onAdd={openCreate} /> : tab === 'notifications' ? <Notifications items={notifications} error={panelErrors.notifications} onRetry={load} onMarkRead={markNotificationRead} pendingAction={pendingImageAction} /> : tab === 'audit' ? <Audit items={audit} error={panelErrors.audit} onRetry={load} /> : <OperationsWorkflows section={tab} role={operatorRole} />}</section></div>
  </div>{showVehicleForm && <VehicleForm role={operatorRole} form={form} setForm={setForm} editing={editingVehicle} images={images} imagesLoading={imagesLoading} imageError={imageError} filePreviews={filePreviews} saving={saving} uploading={uploading} pendingImageAction={pendingImageAction} onFilesSelected={onFilesSelected} removeSelectedFile={removeSelectedFile} onImageUpdate={updateImage} onMoveImage={moveImage} onRemoveImage={removeImage} onClose={closeForm} onSubmit={submitVehicle} />}</div>;
};

const Overview: React.FC<{ metrics: OperationsMetrics | null; vehicles: OperationsVehicle[]; onInventory: () => void }> = ({ metrics, vehicles, onInventory }) => <div className="space-y-5"><div className="rounded-2xl bg-[#123f2a] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-200">Control centre</p><h2 className="mt-2 text-2xl font-black">Keep each listing at the right gate.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100">Approval is an administrative review. It is not evidence that a mechanical inspection passed; those states are shown separately in inventory.</p></div><ShieldCheck className="hidden text-emerald-200 sm:block" size={36} /></div><button type="button" onClick={onInventory} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#123f2a]">Review inventory queue</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Latest intake</p><h2 className="mt-1 text-lg font-black">Listings needing attention</h2></div><button type="button" onClick={onInventory} className="text-xs font-black text-[#0e7c3a]">Open queue</button></div><div className="mt-4 space-y-2">{vehicles.filter((vehicle) => !vehicle.verified).slice(0, 4).map((vehicle) => <div key={vehicle.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"><div><p className="text-sm font-black text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p><p className="mt-0.5 text-[11px] text-slate-500">{vehicle.stockId} · {vehicle.location}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">Awaiting approval</span></div>)}{vehicles.filter((vehicle) => !vehicle.verified).length === 0 && <p className="py-5 text-center text-sm text-slate-500">No pending vehicles in this view.</p>}</div></div></div>;

interface InventoryProps { vehicles: OperationsVehicle[]; filter: string; setFilter: (value: string) => void; search: string; setSearch: (value: string) => void; inventoryError?: string; onRetry: () => void; canApprove: boolean; pendingAction: string | null; onApprove: (vehicle: OperationsVehicle) => void; onDelete?: (vehicle: OperationsVehicle) => void; onEdit: (vehicle: OperationsVehicle) => void; onAdd: () => void; }
const Inventory: React.FC<InventoryProps> = ({ vehicles, filter, setFilter, search, setSearch, inventoryError, onRetry, canApprove, pendingAction, onApprove, onDelete, onEdit, onAdd }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Inventory control</p><h2 className="mt-1 text-lg font-black">Vehicle listings</h2><p className="mt-1 text-xs text-slate-500">Lifecycle, approval, and inspection are independent signals.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search make, model, stock ID" className="min-h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#0e7c3a]" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><option value="">All lifecycle states</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="delisted">Delisted</option></select><button type="button" onClick={onAdd} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#12492f] px-3 py-2 text-xs font-black text-white"><Plus size={14} /> Add</button></div></div>{inventoryError && <PanelError message={inventoryError} onRetry={onRetry} />}{!inventoryError && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Vehicle</th><th className="px-3 py-3">Stock ID</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Lifecycle</th><th className="px-3 py-3">Approval</th><th className="px-3 py-3">Inspection</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{vehicles.map((vehicle) => <tr key={vehicle.id}><td className="px-3 py-3"><div className="font-black text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</div><div className="mt-1 text-[10px] text-slate-500">{vehicle.bodyType} · {vehicle.location}</div></td><td className="px-3 py-3 font-mono text-[10px] text-slate-500">{vehicle.stockId}</td><td className="px-3 py-3 font-black text-[#0e7c3a]">₦{Number(vehicle.priceNgn || 0).toLocaleString()}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${badgeForStatus(vehicle.status)}`}>{lifecycleLabel(vehicle.status)}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${vehicle.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{vehicle.verified ? 'Approved' : 'Awaiting approval'}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${vehicle.inspectionPassed === true ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-600'}`}>{vehicle.inspectionPassed === true ? 'Inspection recorded' : 'Not recorded'}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onEdit(vehicle)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-700"><Pencil size={12} /> Edit</button>{canApprove && !vehicle.verified && <button type="button" title={vehicle.images.length ? 'Approve listing' : 'Upload a real vehicle photo before approval'} disabled={!vehicle.images.length || pendingAction === `approve-${vehicle.id}`} onClick={() => onApprove(vehicle)} className="rounded-lg bg-[#12492f] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">{pendingAction === `approve-${vehicle.id}` ? 'Approving…' : 'Approve'}</button>}{onDelete && <button type="button" disabled={pendingAction === `delete-${vehicle.id}`} onClick={() => onDelete(vehicle)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black text-red-700 disabled:opacity-50">Delete</button>}</div></td></tr>)}</tbody></table>{vehicles.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No vehicles match this view.</p>}</div>}</div>;

const Notifications: React.FC<{ items: OperationsNotification[]; error?: string; onRetry: () => void; onMarkRead: (item: OperationsNotification) => void; pendingAction: string | null }> = ({ items, error, onRetry, onMarkRead, pendingAction }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">In-app inbox</p><h2 className="mt-1 text-lg font-black">Operational notifications</h2>{error ? <PanelError message={error} onRetry={onRetry} /> : <div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3"><Bell className="mt-0.5 shrink-0 text-[#0e7c3a]" size={16} /><div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()} · {item.status === 'read' ? 'Read' : 'Unread'}</p></div>{item.status !== 'read' && <button type="button" disabled={pendingAction === `notification-${item.id}`} onClick={() => onMarkRead(item)} className="self-start shrink-0 rounded-lg border border-emerald-200 px-3 py-1.5 text-[10px] font-bold text-emerald-800 disabled:opacity-50">Mark read</button>}</div>)}{items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No notifications yet.</p>}</div>}</div>;
const Audit: React.FC<{ items: OperationsAuditEntry[]; error?: string; onRetry: () => void }> = ({ items, error, onRetry }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">Administrator view</p><h2 className="mt-1 text-lg font-black">Audit trail</h2>{error ? <PanelError message={error} onRetry={onRetry} /> : <div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3"><div><p className="text-xs font-black text-slate-900">{item.action}</p><p className="mt-1 text-[10px] text-slate-500">{item.resourceType} · {item.resourceId} · {item.actorRole}</p></div><time className="shrink-0 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div>)}{items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No audit entries yet.</p>}</div>}</div>;
const PanelError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-900"><span className="inline-flex items-center gap-2"><AlertTriangle size={15} /> {message}</span><button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-black"><RefreshCw size={12} /> Retry</button></div>;

interface VehicleFormProps { role: Role; form: VehicleFormState; setForm: React.Dispatch<React.SetStateAction<VehicleFormState>>; editing?: OperationsVehicle; images: OperationsVehicleImage[]; imagesLoading: boolean; imageError: string; filePreviews: FilePreview[]; saving: boolean; uploading: boolean; pendingImageAction: string | null; onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void; removeSelectedFile: (url: string) => void; onImageUpdate: (image: OperationsVehicleImage, payload: { isPrimary?: boolean; caption?: string; displayOrder?: number }) => void; onMoveImage: (index: number, direction: -1 | 1) => void; onRemoveImage: (image: OperationsVehicleImage) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; }
const VehicleForm: React.FC<VehicleFormProps> = ({ role, form, setForm, editing, images, imagesLoading, imageError, filePreviews, saving, uploading, pendingImageAction, onFilesSelected, removeSelectedFile, onImageUpdate, onMoveImage, onRemoveImage, onClose, onSubmit }) => {
  const update = (key: string, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5"><div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0e7c3a]">{editing ? 'Listing editor' : 'Inventory intake'}</p><h2 className="mt-1 text-xl font-black">{editing ? `Edit ${editing.make} ${editing.model}` : 'Create a vehicle draft'}</h2><p className="mt-1 text-xs text-slate-500">{editing ? 'Staff can edit listing facts and media. Only administrators can change lifecycle status.' : 'Save the draft first; image files are uploaded only after a vehicle ID exists.'}</p></div><button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2" aria-label="Close"><X size={16} /></button></div><form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Make" value={form.make} onChange={(value) => update('make', value)} required /><Field label="Model" value={form.model} onChange={(value) => update('model', value)} required /><Field label="Trim" value={form.trim} onChange={(value) => update('trim', value)} /><Field label="Model year" type="number" min="1886" max={String(new Date().getFullYear() + 1)} value={form.year} onChange={(value) => update('year', value)} required /><Field label="Price (₦)" type="number" min="0" value={form.priceNgn} onChange={(value) => update('priceNgn', value)} required /><Field label="Mileage (km)" type="number" min="0" value={form.mileage} onChange={(value) => update('mileage', value)} required /><Field label="Stock ID" value={form.stockId} onChange={(value) => update('stockId', value)} required /><Field label="Location" value={form.location} onChange={(value) => update('location', value)} required /><Field label="Engine" value={form.engine} onChange={(value) => update('engine', value)} /><Field label="Colour" value={form.color} onChange={(value) => update('color', value)} /><Field label="Seats" type="number" min="1" value={form.seats} onChange={(value) => update('seats', value)} required /><SelectField label="Condition" value={form.condition} onChange={(value) => update('condition', value)} options={['Brand New', 'Foreign Used (Tokunbo)', 'Nigeria Used']} /><SelectField label="Body type" value={form.bodyType} onChange={(value) => update('bodyType', value)} options={['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Coupe']} /><SelectField label="Fuel type" value={form.fuelType} onChange={(value) => update('fuelType', value)} options={['Petrol', 'Diesel', 'Hybrid', 'Electric']} /><SelectField label="Transmission" value={form.transmission} onChange={(value) => update('transmission', value)} options={['Automatic', 'Manual']} /><SelectField label="Drive type" value={form.driveType} onChange={(value) => update('driveType', value)} options={['FWD', 'AWD', '4WD', 'RWD']} />{role === 'admin' && <SelectField label="Lifecycle status (admin)" value={form.status} onChange={(value) => update('status', value)} options={['available', 'reserved', 'sold', 'delisted']} />}<div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-bold text-slate-700">Description<textarea required value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0e7c3a]" /></label></div><div className="sm:col-span-2 lg:col-span-3"><ImageManager images={images} imagesLoading={imagesLoading} imageError={imageError} filePreviews={filePreviews} uploading={uploading} pendingImageAction={pendingImageAction} canUpload={true} onFilesSelected={onFilesSelected} removeSelectedFile={removeSelectedFile} onImageUpdate={onImageUpdate} onMoveImage={onMoveImage} onRemoveImage={onRemoveImage} /></div><div className="flex justify-end gap-2 pt-2 sm:col-span-2 lg:col-span-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-xs font-black text-slate-600">Cancel</button><button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-[#12492f] px-5 py-3 text-xs font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}</button></div></form></div></div>;
};

const ImageManager: React.FC<{ images: OperationsVehicleImage[]; imagesLoading: boolean; imageError: string; filePreviews: FilePreview[]; uploading: boolean; pendingImageAction: string | null; canUpload: boolean; onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void; removeSelectedFile: (url: string) => void; onImageUpdate: (image: OperationsVehicleImage, payload: { isPrimary?: boolean; caption?: string; displayOrder?: number }) => void; onMoveImage: (index: number, direction: -1 | 1) => void; onRemoveImage: (image: OperationsVehicleImage) => void; }> = ({ images, imagesLoading, imageError, filePreviews, uploading, pendingImageAction, canUpload, onFilesSelected, removeSelectedFile, onImageUpdate, onMoveImage, onRemoveImage }) => <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-900"><ImagePlus size={16} className="text-[#0e7c3a]" /> Listing photos</h3><p className="mt-1 text-[11px] text-slate-500">JPEG, PNG, or WebP · up to {MAX_IMAGE_COUNT} images · 8 MB each. Set one primary image and keep captions factual.</p></div>{canUpload ? <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#12492f] px-3 py-2 text-[10px] font-black text-white"><Upload size={13} /> Choose photos<input type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} multiple onChange={onFilesSelected} className="sr-only" /></label> : <span className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">Save the draft before uploading</span>}</div>{imageError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-800">{imageError}</div>}{uploading && <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800"><Loader2 className="animate-spin" size={14} /> Uploading photos… Keep this window open.</div>}{filePreviews.length > 0 && <div className="mt-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ready to upload</p><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{filePreviews.map((preview) => <div key={preview.url} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"><img src={preview.url} alt={`Selected ${preview.file.name}`} className="h-24 w-full object-cover" /><button type="button" onClick={() => removeSelectedFile(preview.url)} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white" aria-label={`Remove ${preview.file.name}`}><X size={12} /></button><p className="truncate px-2 py-1 text-[10px] text-slate-500">{preview.file.name}</p></div>)}</div></div>}{imagesLoading ? <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><Loader2 className="animate-spin" size={16} /> Loading gallery…</div> : images.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{images.map((image, index) => <div key={image.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-2"><img src={image.url} alt={image.caption || `Vehicle image ${index + 1}`} className="h-24 w-28 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${image.isPrimary ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{image.isPrimary ? 'Primary' : `Photo ${index + 1}`}</span><button type="button" disabled={pendingImageAction === image.id} onClick={() => onRemoveImage(image)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label="Delete image"><Trash2 size={14} /></button></div><input defaultValue={image.caption || ''} onBlur={(event) => { if (event.target.value !== (image.caption || '')) onImageUpdate(image, { caption: event.target.value }); }} placeholder="Caption (optional)" className="mt-2 min-h-8 w-full rounded-lg border border-slate-200 px-2 text-[11px] outline-none focus:border-[#0e7c3a]" /><div className="mt-2 flex flex-wrap items-center gap-1"><button type="button" disabled={image.isPrimary || pendingImageAction === image.id} onClick={() => onImageUpdate(image, { isPrimary: true })} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-50">Set primary</button><button type="button" disabled={index === 0 || pendingImageAction === image.id} onClick={() => onMoveImage(index, -1)} className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40" aria-label="Move image up"><ArrowUp size={13} /></button><button type="button" disabled={index === images.length - 1 || pendingImageAction === image.id} onClick={() => onMoveImage(index, 1)} className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40" aria-label="Move image down"><ArrowDown size={13} /></button></div></div></div>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center text-xs text-slate-500">No uploaded photos yet. Add a clear, representative vehicle image before publishing.</div>}</div>;

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; required?: boolean }> = ({ label, value, onChange, type = 'text', min, max, required }) => <label className="text-xs font-bold text-slate-700">{label}<input required={required} type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0e7c3a]" /></label>;
const SelectField: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: string[] }> = ({ label, value, onChange, options }) => <label className="text-xs font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0e7c3a]"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
