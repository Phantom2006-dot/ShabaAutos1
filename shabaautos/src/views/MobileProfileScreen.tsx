import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Heart,
  Car,
  Ship,
  Sparkles,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  Copy,
  ChevronRight,
  Bell,
  Lock,
  Edit3,
  Check,
} from 'lucide-react';
import { ScreenId, AppUserRole } from '../types';
import { useAuthUser } from '../context/AuthContext';

interface MobileProfileScreenProps {
  onNavigate: (screen: ScreenId) => void;
  savedCount?: number;
}

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({
  onNavigate,
  savedCount = 0,
}) => {
  const { user, isSignedIn, signOut, switchDemoRole, isDemoMode } = useAuthUser();
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // If somehow reached when not signed in, show a quick sign in prompt
  if (!isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0e7c3a] border border-emerald-200 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-1">Sign In Required</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-xs">
          Please sign in to view and manage your ShabaAutos account, tracked orders, and saved vehicles.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="w-full max-w-xs py-3 rounded-xl bg-[#0e7c3a] text-white font-bold text-sm shadow-md"
        >
          Sign In / Create Account
        </button>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-3 text-xs text-slate-500 font-semibold"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24 font-sans sm:hidden">
      {/* Top Mobile App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#0e7c3a] block">
            ShabaAutos Account
          </span>
          <h1 className="text-base font-black text-slate-900 leading-tight">My Profile</h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('saved-compare')}
          className="relative w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer"
          aria-label="Saved vehicles"
        >
          <Heart className="w-4 h-4 text-emerald-700" />
          {savedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0e7c3a] text-white text-[9px] font-black flex items-center justify-center">
              {savedCount}
            </span>
          )}
        </button>
      </header>

      {/* Profile Hero Card */}
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-start gap-4 relative z-10">
            {/* Avatar with Online Indicator */}
            <div className="relative flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-18 h-18 rounded-full bg-gradient-to-br from-[#0e7c3a] to-[#12492f] text-white flex items-center justify-center text-xl font-black shadow-md uppercase">
                  {user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2) || 'SA'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 truncate">
                  {isEditing ? editName : user.fullName}
                </h2>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-1 font-medium">
                <Phone className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{isEditing ? editPhone : user.phone || ''}</span>
              </div>

              {/* Role & Verification Badge */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'staff'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-[#0e7c3a]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {user.role}
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Driver
                </span>
              </div>
            </div>
          </div>

          {/* User ID & Referral strip */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[190px]">
              ID: {user.id}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              {copiedId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy ID
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Persona Switcher (If in demo mode) */}
        {isDemoMode && (
          <div className="mt-3 bg-slate-900 text-white rounded-2xl p-3.5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Preview Persona Switcher
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Current: <strong className="text-white uppercase">{user.role}</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-2.5">
              Switch role to test customer, staff, or super-admin views:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['customer', 'staff', 'admin'] as AppUserRole[]).map((r) => {
                const active = user.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchDemoRole(r)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff / Admin Workspace Shortcut */}
        {(user.role === 'staff' || user.role === 'admin') && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onNavigate('operations-dashboard')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#0e7c3a] to-[#12492f] text-white flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <strong className="block text-sm font-black leading-tight">
                    {user.role === 'admin' ? 'Super Admin Operations' : 'Dealership Staff Workspace'}
                  </strong>
                  <span className="text-[11px] text-emerald-100 font-medium">
                    Inventory, inspections, bookings & duties
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </button>
          </div>
        )}

        {/* Quick Tabs: Overview vs Settings */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Activity &amp; Fleet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Account Details &amp; Security
          </button>
        </div>

        {/* Tab 1: Overview & Activity */}
        {activeTab === 'overview' && (
          <div className="mt-3 space-y-3">
            {/* Active Shipment / Order Tracking Card */}
            <article className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Active Tokunbo Import</h3>
                    <p className="text-[10px] text-slate-500 font-mono">SA-IMP-00078</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                  At Sea · In Transit
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                <div className="flex justify-between text-slate-700 font-semibold mb-1">
                  <span>2021 Toyota RAV4 XLE</span>
                  <span className="font-bold text-[#0e7c3a]">ETA: 8 Days</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Vessel MSC Auriga en route to Tin Can Island Port, Lagos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('order-tracking')}
                className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Track Live Milestone Status</span>
              </button>
            </article>

            {/* Saved Cars Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0e7c3a] flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Saved Vehicles &amp; Watchlist</h4>
                  <p className="text-[11px] text-slate-500">
                    {savedCount > 0 ? `${savedCount} vehicles bookmarked` : 'No vehicles saved yet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('saved-compare')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                View
              </button>
            </div>

            {/* Browse Rental Fleet */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Car Rentals &amp; Chauffeur</h4>
                  <p className="text-[11px] text-slate-500">Book luxury SUVs &amp; sedans in Lagos &amp; Abuja</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('rent-car')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Rent
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Settings & Information */}
        {activeTab === 'settings' && (
          <div className="mt-3 space-y-3">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0e7c3a] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Profile details updated successfully!
              </div>
            )}

            {/* Personal Details Form */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900">Personal Information</h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0e7c3a] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{editName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Email</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{user.email}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-bold text-slate-900">{editPhone}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Primary Hub</span>
                    <span className="font-bold text-slate-900">Lagos (Victoria Island)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Security & Password */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-2">Account Security</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Your session is secured with encrypted token authentication.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Manage Security &amp; Password</span>
              </button>
            </div>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of ShabaAutos</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Version 2.4 · ShabaAutos Nigeria
          </p>
        </div>
      </div>
    </div>
  );
};
