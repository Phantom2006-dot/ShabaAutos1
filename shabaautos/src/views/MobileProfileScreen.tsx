import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ShieldCheck, Phone, Mail, MapPin, Clock, Heart, Car,
  Ship, Sparkles, LogOut, LayoutDashboard, Copy, ChevronRight, Lock,
  Edit3, Check,
} from 'lucide-react';
import { ScreenId, AppUserRole } from '../types';
import { useAuthUser } from '../context/AuthContext';
import { fetchMyImports, updateMyProfile } from '../services/api';

interface MobileProfileScreenProps {
  onNavigate: (screen: ScreenId) => void;
  savedCount?: number;
}

type ImportRecord = Record<string, unknown>;
const stringValue = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const importTrackingId = (record: ImportRecord) => stringValue(record.trackingId || record.tracking_id || record.orderId || record.id);
const importVehicle = (record: ImportRecord) => [stringValue(record.year), stringValue(record.make), stringValue(record.model)].filter(Boolean).join(' ') || 'Import request';

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({ onNavigate, savedCount = 0 }) => {
  const { user, isLoaded, isSignedIn, signOut, switchDemoRole, isDemoMode } = useAuthUser();
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [importsLoading, setImportsLoading] = useState(false);
  const [importsError, setImportsError] = useState('');

  useEffect(() => {
    if (!user || isEditing) return;
    setEditName(user.fullName || '');
    setEditPhone(user.phone || '');
  }, [user?.id, user?.fullName, user?.phone]);

  useEffect(() => {
    let active = true;
    if (!isLoaded || !isSignedIn || !user) {
      setImports([]);
      return () => { active = false; };
    }
    setImportsLoading(true);
    setImportsError('');
    fetchMyImports().then((response) => {
      if (!active) return;
      if (response.success) setImports(Array.isArray(response.data) ? response.data as ImportRecord[] : []);
      else setImportsError(response.message || 'Import requests could not be loaded. Please try again.');
    }).catch(() => {
      if (active) setImportsError('Import requests could not be loaded. Please try again.');
    }).finally(() => { if (active) setImportsLoading(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id]);

  const handleCopyId = () => {
    if (!user) return;
    void navigator.clipboard?.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const fullName = editName.trim();
    const phone = editPhone.trim();
    const nextErrors: { fullName?: string; phone?: string } = {};
    if (!fullName) nextErrors.fullName = 'Full name is required.';
    if (!phone) nextErrors.phone = 'Phone number is required.';
    setFieldErrors(nextErrors);
    setSaveError('');
    setSaveSuccess('');
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    try {
      const response = await updateMyProfile({ fullName, phone });
      if (!response.success) {
        const details = response as typeof response & { fieldErrors?: { fullName?: string; phone?: string } };
        setFieldErrors(details.fieldErrors || (response.message?.toLowerCase().includes('phone') ? { phone: response.message } : {}));
        setSaveError(response.message || 'Profile changes were not saved. Please try again.');
        return;
      }
      const savedUser = response.user as { fullName?: string; phone?: string } | undefined;
      setEditName(savedUser?.fullName || fullName);
      setEditPhone(savedUser?.phone || phone);
      setIsEditing(false);
      setSaveSuccess('Profile details saved to your account.');
    } catch {
      setSaveError('Profile changes could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-sm text-slate-500">Loading account…</div>;
  if (!isSignedIn || !user) {
    return <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center"><div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0e7c3a] border border-emerald-200 flex items-center justify-center mb-4"><Lock className="w-8 h-8" /></div><h2 className="text-xl font-black text-slate-900 mb-1">Sign In Required</h2><p className="text-xs text-slate-500 mb-6 max-w-xs">Please sign in to view and manage your ShabaAutos account, import requests, and saved vehicles.</p><button type="button" onClick={() => onNavigate('auth')} className="w-full max-w-xs py-3 rounded-xl bg-[#0e7c3a] text-white font-bold text-sm shadow-md">Sign In / Create Account</button><button type="button" onClick={() => onNavigate('home')} className="mt-3 text-xs text-slate-500 font-semibold">Return to Home</button></div>;
  }

  return <div className="min-h-screen bg-[#f8f9fa] pb-24 font-sans sm:hidden">
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between"><button type="button" onClick={() => onNavigate('home')} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700" aria-label="Back to Home"><ArrowLeft className="w-5 h-5" /></button><div className="text-center"><span className="text-[10px] font-black uppercase tracking-wider text-[#0e7c3a] block">ShabaAutos Account</span><h1 className="text-base font-black text-slate-900 leading-tight">My Profile</h1></div><button type="button" onClick={() => onNavigate('saved-compare')} className="relative w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700" aria-label="Saved vehicles"><Heart className="w-4 h-4 text-emerald-700" />{savedCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0e7c3a] text-white text-[9px] font-black flex items-center justify-center">{savedCount}</span>}</button></header>
    <div className="p-4"><div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden"><div className="flex items-start gap-4 relative z-10"><div className="relative flex-shrink-0">{user.avatarUrl ? <img src={user.avatarUrl} alt={user.fullName} referrerPolicy="no-referrer" className="w-18 h-18 rounded-full object-cover border-2 border-emerald-500 shadow-md" /> : <div className="w-18 h-18 rounded-full bg-gradient-to-br from-[#0e7c3a] to-[#12492f] text-white flex items-center justify-center text-xl font-black shadow-md uppercase">{user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'SA'}</div>}</div><div className="flex-1 min-w-0"><h2 className="text-lg font-black text-slate-900 truncate">{isEditing ? editName : user.fullName}</h2><p className="text-xs text-slate-500 truncate mt-0.5"><Mail className="inline w-3 h-3 mr-1" />{user.email}</p><div className="flex items-center gap-1 text-xs text-slate-600 mt-1 font-medium"><Phone className="w-3 h-3 text-emerald-600" /><span className="truncate">{isEditing ? editPhone : user.phone || 'No phone number provided'}</span></div><div className="flex flex-wrap items-center gap-1.5 mt-2.5"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#0e7c3a]"><ShieldCheck className="w-3 h-3" />{user.role}</span></div></div></div><div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"><span className="font-mono text-[11px] text-slate-400 truncate max-w-[190px]">ID: {user.id}</span><button type="button" onClick={handleCopyId} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">{copiedId ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy ID</>}</button></div></div>
      {isDemoMode && <div className="mt-3 bg-slate-900 text-white rounded-2xl p-3.5 shadow-sm border border-slate-800"><div className="flex items-center justify-between mb-2"><span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Preview Persona Switcher</span><span className="text-[10px] text-slate-400 font-mono">Current: <strong className="text-white uppercase">{user.role}</strong></span></div><p className="text-[11px] text-slate-300 mb-2.5">Demo-only role preview; this does not grant authorization.</p><div className="grid grid-cols-3 gap-1.5">{(['customer', 'staff', 'admin'] as AppUserRole[]).map((role) => <button key={role} type="button" onClick={() => switchDemoRole(role)} className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize ${user.role === role ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{role}</button>)}</div></div>}
      {(user.role === 'staff' || user.role === 'admin') && <div className="mt-3"><button type="button" onClick={() => onNavigate('operations-dashboard')} className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#0e7c3a] to-[#12492f] text-white flex items-center justify-between shadow-md"><div className="flex items-center gap-3"><LayoutDashboard className="w-5 h-5" /><strong className="block text-sm font-black">{user.role === 'admin' ? 'Super Admin Operations' : 'Dealership Staff Workspace'}</strong></div><ChevronRight className="w-5 h-5" /></button></div>}
      <div className="flex bg-slate-200/80 p-1 rounded-xl mt-4"><button type="button" onClick={() => setActiveTab('overview')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>My Activity &amp; Fleet</button><button type="button" onClick={() => setActiveTab('settings')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>Account Details &amp; Security</button></div>
      {activeTab === 'overview' && <div className="mt-3 space-y-3"><article className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs"><div className="flex items-center gap-2 mb-2.5"><div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center"><Ship className="w-4 h-4" /></div><div><h3 className="text-xs font-bold text-slate-900">My Import Requests</h3><p className="text-[10px] text-slate-500">Only requests returned for this account are shown.</p></div></div>{importsLoading ? <p className="py-4 text-xs text-slate-500">Loading import requests…</p> : importsError ? <p role="alert" className="py-4 text-xs text-red-700">{importsError}</p> : imports.length === 0 ? <p className="py-4 text-xs text-slate-500">No import requests or active shipments found.</p> : <div className="space-y-2">{imports.map((record, index) => { const trackingId = importTrackingId(record); return <div key={trackingId || index} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs"><div className="flex justify-between gap-2 text-slate-700 font-semibold"><span>{importVehicle(record)}</span><span className="font-bold text-[#0e7c3a]">{stringValue(record.status) || 'Request received'}</span></div>{trackingId && <><p className="text-[11px] text-slate-500 mt-1 font-mono">Tracking: {trackingId}</p><a href={`/order-tracking?trackingId=${encodeURIComponent(trackingId)}`} onClick={() => onNavigate('order-tracking')} className="inline-flex mt-2 text-[11px] font-bold text-emerald-700 hover:underline">View tracking details <ChevronRight className="w-3 h-3" /></a></>}</div>; })}</div>}<button type="button" onClick={() => onNavigate('order-tracking')} className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"><Clock className="w-3.5 h-3.5" /><span>Open Tracking</span></button></article><div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0e7c3a] flex items-center justify-center"><Heart className="w-5 h-5" /></div><div><h4 className="text-xs font-bold text-slate-900">Saved Vehicles &amp; Watchlist</h4><p className="text-[11px] text-slate-500">{savedCount > 0 ? `${savedCount} vehicles bookmarked` : 'No vehicles saved yet'}</p></div></div><button type="button" onClick={() => onNavigate('saved-compare')} className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs">View</button></div><div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><Car className="w-5 h-5" /></div><div><h4 className="text-xs font-bold text-slate-900">Car Rentals &amp; Chauffeur</h4><p className="text-[11px] text-slate-500">Book vehicles from the available fleet.</p></div></div><button type="button" onClick={() => onNavigate('rent-car')} className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs">Rent</button></div></div>}
      {activeTab === 'settings' && <div className="mt-3 space-y-3">{saveSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0e7c3a] text-xs font-bold flex items-center gap-2"><Check className="w-4 h-4" />{saveSuccess}</div>}{saveError && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{saveError}</div>}<div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs"><div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-slate-900">Personal Information</h3><button type="button" onClick={() => { setIsEditing(!isEditing); setSaveError(''); setFieldErrors({}); }} className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" />{isEditing ? 'Cancel' : 'Edit'}</button></div>{isEditing ? <form onSubmit={handleSaveProfile} className="space-y-3"><div><label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label><input type="text" value={editName} onChange={(event) => setEditName(event.target.value)} aria-invalid={Boolean(fieldErrors.fullName)} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-medium text-slate-900 ${fieldErrors.fullName ? 'border-red-400' : 'border-slate-300'}`} />{fieldErrors.fullName && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.fullName}</p>}</div><div><label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label><input type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-medium text-slate-900 ${fieldErrors.phone ? 'border-red-400' : 'border-slate-300'}`} />{fieldErrors.phone && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.phone}</p>}</div><button type="submit" disabled={isSaving} className="w-full py-2 bg-[#0e7c3a] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60">{isSaving ? 'Saving…' : 'Save Changes'}</button></form> : <div className="space-y-2.5 text-xs"><div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Full Name</span><span className="font-bold text-slate-900">{editName}</span></div><div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Email</span><span className="font-bold text-slate-900 truncate max-w-[200px]">{user.email}</span></div><div className="flex justify-between py-1.5"><span className="text-slate-500">Phone</span><span className="font-bold text-slate-900">{editPhone || 'Not provided'}</span></div></div>}</div><div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs"><h3 className="text-xs font-bold text-slate-900 mb-2">Account Security</h3><p className="text-[11px] text-slate-500 mb-3">Manage authentication through your configured sign-in provider.</p><button type="button" onClick={() => onNavigate('auth')} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"><Lock className="w-3.5 h-3.5 text-slate-600" />Manage Security &amp; Password</button></div></div>}
      <div className="mt-5"><button type="button" onClick={handleSignOut} className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs"><LogOut className="w-4 h-4" />Sign Out of ShabaAutos</button><p className="text-center text-[10px] text-slate-400 mt-2">ShabaAutos Nigeria</p></div>
    </div>
  </div>;
};
