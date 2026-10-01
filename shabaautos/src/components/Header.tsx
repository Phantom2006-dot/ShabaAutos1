import React, { useState, useRef, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import {
  Phone,
  Heart,
  Scale,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Car,
  Compass,
  Ship,
  Sparkles,
  ShieldCheck,
  Plane,
  Calculator,
  Search,
  DollarSign,
  FileText,
  Clock,
  MessageSquare,
  Home,
  Calendar,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { ScreenId } from '../types';
import { ShabaAutosLogo } from './ShabaAutosLogo';
import { useAuthUser } from '../context/AuthContext';
import { fetchVehiclesWithPagination } from '../services/api';
import { useBusinessContact } from '../hooks/useBusinessContact';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  savedCount: number;
  compareCount: number;
  isLoggedIn?: boolean;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  savedCount,
  compareCount,
  isLoggedIn: propIsLoggedIn,
  mobileMenuOpen: externalMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) => {
  const { user, isSignedIn, signOut, isDemoMode, switchDemoRole } = useAuthUser();
  const isLoggedIn = isSignedIn || Boolean(user) || propIsLoggedIn;
  const { phone } = useBusinessContact();
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  const phoneHref = normalizedPhone ? `tel:${normalizedPhone}` : '';
  const [inventoryTotal, setInventoryTotal] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchVehiclesWithPagination({ page: 1, pageSize: 1 }).then((response) => {
      if (active && response.success && Number.isFinite(response.total)) {
        setInventoryTotal(response.total);
      }
    });
    return () => { active = false; };
  }, []);

  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;

  const setIsMenuOpen = (open: boolean) => {
    setInternalMenuOpen(open);
    if (!open && onCloseMobileMenu) {
      onCloseMobileMenu();
    } else if (open && onToggleMobileMenu) {
      onToggleMobileMenu();
    } else if (!open && onToggleMobileMenu && externalMenuOpen) {
      onToggleMobileMenu();
    }
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or touch
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        if (onCloseMobileMenu) {
          onCloseMobileMenu();
        } else {
          setIsMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCloseMobileMenu]);

  const handleMouseEnter = (name: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleToggleDropdown = (name: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const handleNavClick = (screenId: ScreenId) => {
    onNavigate(screenId);
    setActiveDropdown(null);
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    } else {
      setIsMenuOpen(false);
    }
  };

  const navigateToInventory = (filters: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const query = params.toString();
    window.history.pushState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    handleNavClick('buy-cars');
  };

  const renderAccountPanel = (dropdownName: string) => {
    if (activeDropdown !== dropdownName || !isLoggedIn || !user) return null;

    return (
      <div className="shabaautos-dropdown-panel shabaautos-account-dropdown-panel">
        <div className="px-3 py-2 border-b border-[#e4e9e3] mb-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#12492f] truncate min-w-0">
              {user.fullName}
            </span>
            <span className={`shabaautos-account-role text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
              user.role === 'admin'
                ? 'bg-purple-100 text-purple-800'
                : user.role === 'staff'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-emerald-100 text-[#12492f]'
            }`}>
              {user.role}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 truncate mt-0.5">
            {user.email}
          </div>
          {user.phone && (
            <div className="text-[10px] text-gray-400 font-mono mt-0.2 truncate">
              {user.phone}
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <button
            onClick={() => handleNavClick('order-tracking')}
            className="shabaautos-dropdown-item"
          >
            <Clock size={14} className="text-[#158047] shrink-0" />
            <span>Track an order</span>
          </button>

          <button
            onClick={() => handleNavClick('saved-compare')}
            className="shabaautos-dropdown-item justify-between"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Heart size={14} className="text-[#158047] shrink-0" />
              <span>Saved Vehicles</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.2 rounded shrink-0">
              {savedCount}
            </span>
          </button>

          <button
            onClick={() => handleNavClick('saved-compare')}
            className="shabaautos-dropdown-item justify-between"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Scale size={14} className="text-[#158047] shrink-0" />
              <span>Compare List</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.2 rounded shrink-0">
              {compareCount}
            </span>
          </button>

          {(user.role === 'staff' || user.role === 'admin') && (
            <button
              onClick={() => handleNavClick('operations-dashboard')}
              className="shabaautos-dropdown-item font-bold text-[#12492f]"
            >
              <LayoutDashboard size={14} className="text-[#158047] shrink-0" />
              <span>{user.role === 'admin' ? 'Admin Operations' : 'Staff Workspace'}</span>
            </button>
          )}

          {isDemoMode && (
            <div className="border-t border-[#e4e9e3] pt-1.5 mt-1.5 px-2">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Switch Demo Persona
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['customer', 'staff', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchDemoRole(r)}
                    className={`px-1.5 py-1 text-[10px] font-bold rounded capitalize cursor-pointer transition-all ${
                      user.role === r
                        ? 'bg-[#12492f] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#e4e9e3] pt-1 mt-1">
            <button
              onClick={() => handleNavClick('auth')}
              className="shabaautos-dropdown-item font-bold text-[#12492f]"
            >
              <User size={14} className="shrink-0" />
              <span>Account Details &amp; Security</span>
            </button>
            <button
              onClick={async () => {
                await signOut();
                setActiveDropdown(null);
              }}
              className="shabaautos-dropdown-item font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={14} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className="shabaautos-navbar" ref={navContainerRef}>
      <div className="shabaautos-navbar-inner">
        {/* Brand Logo */}
        <div
          className="shabaautos-brand cursor-pointer select-none"
          onClick={() => handleNavClick('home')}
          role="button"
          tabIndex={0}
          aria-label="ShabaAutos Home"
        >
          <div className="hidden sm:block">
            <ShabaAutosLogo size="md" showDivider={true} />
          </div>
          <div className="block sm:hidden">
            <ShabaAutosLogo size="sm" showDivider={true} />
          </div>
        </div>

        {/* Primary Desktop Navigation with Custom Dropdowns */}
        <nav className="shabaautos-nav hidden lg:flex items-stretch" aria-label="Primary navigation">
          {/* Home */}
          <button
            onClick={() => handleNavClick('home')}
            className={`shabaautos-nav-link ${currentScreen === 'home' ? 'active' : ''}`}
          >
            Home
            {currentScreen === 'home' && <span className="shabaautos-nav-indicator" />}
          </button>

          {/* Buy Cars Dropdown */}
          <div
            className="shabaautos-dropdown"
            onMouseEnter={() => handleMouseEnter('buy')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleNavClick('buy-cars')}
              className={`shabaautos-nav-link gap-1 ${
                currentScreen === 'buy-cars' ||
                currentScreen === 'car-details' ||
                currentScreen === 'car-details-rav4'
                  ? 'active'
                  : ''
              }`}
              aria-expanded={activeDropdown === 'buy'}
            >
              <span>Buy Cars</span>
              <span
                onClick={(e) => handleToggleDropdown('buy', e)}
                className="p-0.5 rounded hover:bg-emerald-100/50 cursor-pointer"
                title="Toggle Buy Cars Menu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-[#12492f] ${
                    activeDropdown === 'buy' ? 'rotate-180' : ''
                  }`}
                />
              </span>
              {(currentScreen === 'buy-cars' ||
                currentScreen === 'car-details' ||
                currentScreen === 'car-details-rav4') && (
                <span className="shabaautos-nav-indicator" />
              )}
            </button>

            {activeDropdown === 'buy' && (
              <div className="shabaautos-dropdown-panel w-[320px]">
                <div className="px-3 py-2 border-b border-[#e4e9e3] mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#12492f] uppercase tracking-wider">
                    Verified Car Inventory
                  </span>
                  {inventoryTotal !== null && (
                    <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.5 rounded">
                      {inventoryTotal} Available
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('buy-cars')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Car size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">All Available Cars</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Browse current listings and review details
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateToInventory({ bodyType: 'SUV' })}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Compass size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">SUVs & Crossovers</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        RAV4, Lexus RX 350, Mercedes GLE 450
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateToInventory({ bodyType: 'Sedan' })}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Sedans & Luxury Saloons</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Toyota Camry, Corolla, Mercedes C-Class
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-[#e4e9e3] pt-1 mt-1">
                    <button
                      onClick={() => handleNavClick('saved-compare')}
                      className="shabaautos-dropdown-item text-[#12492f] font-bold justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Scale size={14} /> Compare Vehicles
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rent a Car Dropdown */}
          <div
            className="shabaautos-dropdown"
            onMouseEnter={() => handleMouseEnter('rent')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleNavClick('rent-car')}
              className={`shabaautos-nav-link gap-1 ${currentScreen === 'rent-car' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'rent'}
            >
              <span>Rent a Car</span>
              <span
                onClick={(e) => handleToggleDropdown('rent', e)}
                className="p-0.5 rounded hover:bg-emerald-100/50 cursor-pointer"
                title="Toggle Rent Menu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-[#12492f] ${
                    activeDropdown === 'rent' ? 'rotate-180' : ''
                  }`}
                />
              </span>
              {currentScreen === 'rent-car' && <span className="shabaautos-nav-indicator" />}
            </button>

            {activeDropdown === 'rent' && (
              <div className="shabaautos-dropdown-panel w-[300px]">
                <div className="px-3 py-2 border-b border-[#e4e9e3] mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#12492f] uppercase tracking-wider">
                    Rental Fleet & VIP
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.5 rounded">
                    Lagos & Abuja
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('rent-car')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Car size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Daily & Weekly Self-Drive</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Clean, fueled sedans and SUVs
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('rent-car')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Plane size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Airport Fast-Track Pickups</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        LOS Murtala Muhammed & ABV Nnamdi Azikiwe
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('rent-car')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Chauffeur & Armed Escort</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        VIP executive protection & convoys
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import from US Dropdown */}
          <div
            className="shabaautos-dropdown"
            onMouseEnter={() => handleMouseEnter('import')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleNavClick('import-landing')}
              className={`shabaautos-nav-link gap-1 ${
                currentScreen === 'import-landing' || currentScreen === 'import-form'
                  ? 'active'
                  : ''
              }`}
              aria-expanded={activeDropdown === 'import'}
            >
              <span>Import from US</span>
              <span
                onClick={(e) => handleToggleDropdown('import', e)}
                className="p-0.5 rounded hover:bg-emerald-100/50 cursor-pointer"
                title="Toggle Import Menu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-[#12492f] ${
                    activeDropdown === 'import' ? 'rotate-180' : ''
                  }`}
                />
              </span>
              {(currentScreen === 'import-landing' || currentScreen === 'import-form') && (
                <span className="shabaautos-nav-indicator" />
              )}
            </button>

            {activeDropdown === 'import' && (
              <div className="shabaautos-dropdown-panel w-[320px]">
                <div className="px-3 py-2 border-b border-[#e4e9e3] mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#12492f] uppercase tracking-wider">
                    Direct USA Car Import
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.5 rounded">
                    Lagos Port Delivery
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('import-landing')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Ship size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Import Overview</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Copart & Manheim direct to Tin Can port
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('import-landing')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Calculator size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Duty & Cost Calculator</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Instant calculation of customs & shipping
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('import-form')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <FileText size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Start Import Wizard</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Submit vehicle specifications for bid
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-[#e4e9e3] pt-1 mt-1">
                    <button
                      onClick={() => handleNavClick('order-tracking')}
                      className="shabaautos-dropdown-item text-[#12492f] font-bold justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Clock size={14} /> Track an existing order
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Services Dropdown (Sell Your Car & Find a Car) */}
          <div
            className="shabaautos-dropdown"
            onMouseEnter={() => handleMouseEnter('services')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleNavClick('sell-car')}
              className={`shabaautos-nav-link gap-1 ${
                currentScreen === 'sell-car' || currentScreen === 'find-car' ? 'active' : ''
              }`}
              aria-expanded={activeDropdown === 'services'}
            >
              <span>Services</span>
              <span
                onClick={(e) => handleToggleDropdown('services', e)}
                className="p-0.5 rounded hover:bg-emerald-100/50 cursor-pointer"
                title="Toggle Services Menu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-[#12492f] ${
                    activeDropdown === 'services' ? 'rotate-180' : ''
                  }`}
                />
              </span>
              {(currentScreen === 'sell-car' || currentScreen === 'find-car') && (
                <span className="shabaautos-nav-indicator" />
              )}
            </button>

            {activeDropdown === 'services' && (
              <div className="shabaautos-dropdown-panel w-[280px]">
                <div className="px-3 py-2 border-b border-[#e4e9e3] mb-1.5">
                  <span className="text-[11px] font-bold text-[#12492f] uppercase tracking-wider">
                    Auto Concierge & Selling
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick('sell-car')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <DollarSign size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Sell Your Car</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Request an inspection and valuation
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('find-car')}
                    className="shabaautos-dropdown-item group"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-[#158047] flex items-center justify-center shrink-0 group-hover:bg-[#12492f] group-hover:text-white transition-colors">
                      <Search size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-[#26372c]">Find a Car for Me</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Let experts source your dream car
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Header Contact, Saved Wishlist & Sign In / Account Dropdown */}
        <div className="shabaautos-header-contact hidden lg:flex items-center">
          {/* Phone Contact */}
          {phone && (
            <a
              href={phoneHref}
              className="shabaautos-contact-btn"
              title={`Call ${phone}`}
            >
              <Phone size={13} className="text-[#158047]" />
              <span className="hidden xl:inline">{phone}</span>
              <span className="inline xl:hidden text-[11px] font-bold">Call</span>
            </a>
          )}

          {/* Wishlist Button */}
          <button
            className="shabaautos-badge-btn"
            onClick={() => handleNavClick('saved-compare')}
            title="View Saved Wishlist"
          >
            <Heart size={14} className={savedCount > 0 ? 'text-[#12492f] fill-[#12492f]/10' : ''} />
            <span className="hidden xl:inline">Wishlist</span>
            <b className="shabaautos-badge-count">{savedCount}</b>
          </button>

          {/* Compare Button */}
          <button
            className="shabaautos-badge-btn"
            onClick={() => handleNavClick('saved-compare')}
            title="Compare Vehicles"
          >
            <Scale size={14} />
            <span className="hidden xl:inline">Compare</span>
            <b className="shabaautos-badge-count">{compareCount}</b>
          </button>

          {/* Desktop Notification Bell */}
          <NotificationBell />

          {/* User Sign In / Profile with Dropdown */}
          <div
            className="shabaautos-dropdown shabaautos-account-dropdown"
            onMouseEnter={() => handleMouseEnter('account')}
            onMouseLeave={handleMouseLeave}
          >
            {isLoggedIn && user ? (
              <button
                onClick={(e) => handleToggleDropdown('account', e)}
                className="shabaautos-account-trigger flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full border border-emerald-300 hover:border-[#12492f] bg-white transition-all shadow-2xs cursor-pointer"
                title={`Logged in as ${user.fullName} (${user.role})`}
                aria-expanded={activeDropdown === 'account'}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#12492f] text-white flex items-center justify-center text-[9px] font-bold uppercase">
                    {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'SA'}
                  </div>
                )}
                <span className="shabaautos-account-name text-[11px] font-semibold text-[#12492f] hidden sm:inline max-w-[90px] truncate">
                  {user.fullName.split(' ')[0]}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === 'staff'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-[#12492f]'
                }`}>
                  {user.role}
                </span>
                <ChevronDown size={11} className="text-[#12492f]" />
              </button>
            ) : (
              <button
                className="shabaautos-signin flex items-center justify-center gap-1 cursor-pointer"
                onClick={() => handleNavClick('auth')}
                aria-expanded={activeDropdown === 'account'}
              >
                <span>Sign In</span>
                <User size={12} className="ml-0.5" />
              </button>
            )}

            {renderAccountPanel('account')}
          </div>
        </div>

        {/* Tablet Navigation Controls (640px - 1023px) - Exclusively User Profile path */}
        <div className="hidden sm:flex lg:hidden items-center ml-auto">
          {/* User Profile / Sign In */}
          <div className="shabaautos-dropdown shabaautos-tablet-account-dropdown">
            <button
              onClick={(e) => {
                if (isLoggedIn && user) {
                  handleToggleDropdown('tablet-account', e);
                } else {
                  handleNavClick('auth');
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#12492f] border border-emerald-300/80 hover:border-[#12492f] rounded-xl transition-all cursor-pointer bg-white hover:bg-emerald-50/50 shadow-2xs min-h-[42px]"
              aria-label={isLoggedIn ? `Account Profile (${user?.fullName || user?.name || 'User'})` : 'Sign in to account'}
              aria-expanded={isLoggedIn ? activeDropdown === 'tablet-account' : undefined}
            >
              {isLoggedIn && user ? (
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || user.name || 'User'}
                      className="w-6 h-6 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#12492f] text-white flex items-center justify-center text-[10px] font-black uppercase">
                      {(user.fullName || user.name || 'U').charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#12492f] max-w-[120px] truncate">
                    {(user.fullName || user.name || 'Profile').split(' ')[0]}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-[#0e5c33]">
                    {user.role}
                  </span>
                  <ChevronDown size={13} className="text-[#12492f]" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <User size={15} />
                  <span className="text-xs font-bold">Sign In</span>
                </div>
              )}
            </button>
            {renderAccountPanel('tablet-account')}
          </div>
        </div>
      </div>
    </header>
  );
};
