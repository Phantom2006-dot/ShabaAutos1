import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Heart,
  Scale,
  Car,
  Plane,
  Ship,
  DollarSign,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  MessageSquare,
  Phone,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { ScreenId } from '../types';
import { ShabaAutosLogo } from './ShabaAutosLogo';
import { ThemeToggle } from './ThemeToggle';
import { useAuthUser } from '../context/AuthContext';
import { fetchVehiclesWithPagination } from '../services/api';
import { useBusinessContact } from '../hooks/useBusinessContact';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  currentScreen: ScreenId;
  savedCount: number;
  compareCount: number;
  isLoggedIn?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentScreen,
  savedCount,
  compareCount,
  isLoggedIn: propIsLoggedIn,
  triggerRef,
}) => {
  const { user, isSignedIn, signOut } = useAuthUser();
  const isLoggedIn = isSignedIn || Boolean(user) || propIsLoggedIn;
  const { phone } = useBusinessContact();
  const phoneDigits = phone.replace(/\D/g, '');
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  const phoneHref = normalizedPhone ? `tel:${normalizedPhone}` : '';
  const [inventoryTotal, setInventoryTotal] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState<string | null>('buy');

  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const toggleMobileSubmenu = (menuName: string) => {
    setMobileExpanded(mobileExpanded === menuName ? null : menuName);
  };

  const handleNavClick = (screenId: ScreenId) => {
    onNavigate(screenId);
    onClose();
  };

  const navigateToInventory = (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    window.history.pushState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    handleNavClick('buy-cars');
  };

  const handleDrawerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToInventory({ search: searchQuery.trim() });
  };

  useEffect(() => {
    let active = true;
    fetchVehiclesWithPagination({ page: 1, pageSize: 1 }).then((response) => {
      if (active && response.success && Number.isFinite(response.total)) {
        setInventoryTotal(response.total);
      }
    });
    return () => { active = false; };
  }, []);

  // Keyboard accessibility & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus when closed
    previousActiveElementRef.current = (document.activeElement as HTMLElement) || triggerRef?.current || null;

    // Prevent body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && sidebarRef.current) {
        const focusableElements = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = (Array.from(focusableElements) as HTMLElement[]).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to trigger button
      if (triggerRef?.current) {
        triggerRef.current.focus();
      } else if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation directory"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-default w-full h-full border-0 p-0"
        onClick={onClose}
        aria-label="Close navigation"
      />

      {/* Slide-out Sidebar Drawer Panel */}
      <aside
        ref={sidebarRef}
        className="absolute inset-y-0 right-0 w-[min(88vw,380px)] md:w-[420px] max-w-full h-full bg-white shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-right duration-250 z-10 overflow-hidden"
      >
        {/* Drawer Top Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#fbfcfa] shrink-0">
          <div
            className="cursor-pointer select-none"
            onClick={() => handleNavClick('home')}
            role="button"
            tabIndex={0}
            aria-label="Go to Home"
          >
            <ShabaAutosLogo size="sm" showDivider={true} />
          </div>

          <ThemeToggle compact />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        {/* Quick Search & Price Display */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 space-y-2.5 shrink-0">
          <form onSubmit={handleDrawerSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cars, makes, models, VIN..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[#12492f] transition-all font-medium text-gray-800 placeholder-gray-400 shadow-2xs"
            />
            <Search size={15} className="absolute left-3 top-3 text-gray-400" />
          </form>

          {/* Quick Actions Row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-gray-500">Prices shown in Nigerian naira</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('saved-compare')}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 hover:border-[#12492f] cursor-pointer"
              >
                <Heart size={12} className="text-emerald-700" />
                <span>Saved ({savedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('saved-compare')}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 hover:border-[#12492f] cursor-pointer"
              >
                <Scale size={12} className="text-emerald-700" />
                <span>Compare ({compareCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {/* Quick Navigation 4-Card Grid */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Primary Services
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('buy-cars')}
                className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100 text-left transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#12492f] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Car size={16} />
                </div>
                <div className="text-xs font-bold text-gray-900">Buy a Car</div>
                <div className="text-[10px] text-gray-500">{inventoryTotal !== null ? `${inventoryTotal} currently listed` : 'Browse current listings'}</div>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('rent-car')}
                className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100 text-left transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#12492f] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Plane size={16} />
                </div>
                <div className="text-xs font-bold text-gray-900">Rent a Car</div>
                <div className="text-[10px] text-gray-500">Lagos & Abuja fleet</div>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('import-landing')}
                className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100 text-left transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#12492f] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Ship size={16} />
                </div>
                <div className="text-xs font-bold text-gray-900">Import US</div>
                <div className="text-[10px] text-gray-500">Copart & Manheim</div>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('sell-car')}
                className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100 text-left transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#12492f] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <DollarSign size={16} />
                </div>
                <div className="text-xs font-bold text-gray-900">Sell Car</div>
                <div className="text-[10px] text-gray-500">Request a valuation</div>
              </button>
            </div>
          </div>

          {/* Detailed Navigation List with Accordions */}
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {/* Home */}
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                currentScreen === 'home'
                  ? 'bg-emerald-100/80 text-[#12492f]'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-emerald-700" />
                Home Overview
              </span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>

            {/* Buy Cars Accordion */}
            <div>
              <button
                type="button"
                onClick={() => toggleMobileSubmenu('buy')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Car size={15} className="text-emerald-700" />
                  Buy Vehicles
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 text-gray-500 ${
                    mobileExpanded === 'buy' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {mobileExpanded === 'buy' && (
                <div className="ml-5 pl-3 border-l-2 border-emerald-200 space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('buy-cars')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • All Current Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToInventory({ bodyType: 'SUV' })}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • SUVs & Crossovers (Toyota, Lexus, Benz)
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToInventory({ bodyType: 'Sedan' })}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Sedans & Luxury Saloons
                  </button>
                </div>
              )}
            </div>

            {/* Rent a Car Accordion */}
            <div>
              <button
                type="button"
                onClick={() => toggleMobileSubmenu('rent')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Plane size={15} className="text-emerald-700" />
                  Rent a Car
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 text-gray-500 ${
                    mobileExpanded === 'rent' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {mobileExpanded === 'rent' && (
                <div className="ml-5 pl-3 border-l-2 border-emerald-200 space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('rent-car')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Daily & Weekly Self-Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('rent-car')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Airport Transfers (Lagos & Abuja)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('rent-car')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Chauffeur & VIP Armed Escort
                  </button>
                </div>
              )}
            </div>

            {/* Import from US Accordion */}
            <div>
              <button
                type="button"
                onClick={() => toggleMobileSubmenu('import')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Ship size={15} className="text-emerald-700" />
                  Import from USA
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 text-gray-500 ${
                    mobileExpanded === 'import' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {mobileExpanded === 'import' && (
                <div className="ml-5 pl-3 border-l-2 border-emerald-200 space-y-1 py-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('import-landing')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Import Overview & Process
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('import-landing')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Customs Duty & Clearing Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('import-form')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-gray-600 hover:text-[#12492f] block cursor-pointer"
                  >
                    • Start 4-Step Import Wizard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('order-tracking')}
                    className="w-full text-left py-1.5 text-xs font-semibold text-emerald-800 font-bold block cursor-pointer"
                  >
                    • Track an order
                  </button>
                </div>
              )}
            </div>

            {/* Sell Your Car */}
            <button
              type="button"
              onClick={() => handleNavClick('sell-car')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                currentScreen === 'sell-car'
                  ? 'bg-emerald-100/80 text-[#12492f]'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <DollarSign size={15} className="text-emerald-700" />
                Sell Your Car (Instant Cash)
              </span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>

            {/* Find a Car for Me (Concierge) */}
            <button
              type="button"
              onClick={() => handleNavClick('find-car')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                currentScreen === 'find-car'
                  ? 'bg-emerald-100/80 text-[#12492f]'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Search size={15} className="text-emerald-700" />
                Find a Car for Me (Concierge)
              </span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>

            {/* Live Order Tracking */}
            <button
              type="button"
              onClick={() => handleNavClick('order-tracking')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                currentScreen === 'order-tracking'
                  ? 'bg-emerald-100/80 text-[#12492f]'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock size={15} className="text-emerald-700" />
                Order tracking
              </span>
            </button>

            {/* Saved & Compare */}
            <button
              type="button"
              onClick={() => handleNavClick('saved-compare')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                currentScreen === 'saved-compare'
                  ? 'bg-emerald-100/80 text-[#12492f]'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Heart size={15} className="text-emerald-700" />
                Saved Vehicles & Comparison
              </span>
              <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                {savedCount} saved
              </span>
            </button>
          </div>

          {/* Account Card & Support Direct Links */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            {/* Account Profile / Login button */}
            {isLoggedIn && user ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#12492f] text-white flex items-center justify-center text-xs font-bold uppercase">
                      {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'SA'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                        {user.fullName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'staff'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-[#12492f]'
                  }`}>
                    {user.role}
                  </span>
                </div>
                {(user.role === 'staff' || user.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('operations-dashboard')}
                    className="mb-2 w-full rounded-lg bg-[#12492f] px-2 py-2 text-[11px] font-bold text-white"
                  >
                    <span className="flex items-center justify-center gap-1"><LayoutDashboard size={12} /> {user.role === 'admin' ? 'Open Admin Operations' : 'Open Staff Workspace'}</span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('auth')}
                    className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 text-center cursor-pointer"
                  >
                    Security
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                    }}
                    className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <LogOut size={12} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('auth')}
                className="w-full p-3 bg-[#12492f] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <User size={15} />
                <span>Sign In / Register Account</span>
              </button>
            )}

            {/* Verified WhatsApp and phone contact buttons */}
            {phone && (
              <>
                <a
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-[#12492f] text-xs font-bold rounded-xl flex items-center justify-between border border-emerald-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-emerald-700" />
                    Chat with support on WhatsApp
                  </span>
                  <ChevronRight size={14} className="text-emerald-700" />
                </a>

                {/* Direct Phone Call */}
                <a
                  href={phoneHref}
                  className="w-full py-2.5 px-3.5 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-between border border-gray-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Phone size={15} className="text-gray-600" />
                    Direct Hotline: {phone}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500 font-medium shrink-0">
          ShabaAutos Nigeria Ltd • Location details available on request
        </div>
      </aside>
    </div>
  );
};
