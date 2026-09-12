import React, { useState, useRef, useEffect } from 'react';
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
            <span>Track Order (SA-IMP-00078)</span>
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
                  <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.5 rounded">
                    56 Available
                  </span>
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
                        Browse full inventory with 150-point inspection
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('car-details-rav4')}
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
                    onClick={() => handleNavClick('car-details')}
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
                        <Clock size={14} /> Track Existing Order (SA-IMP-00078)
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
                        Free inspection & instant payout
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
          <a
            href="tel:+2348123456789"
            className="shabaautos-contact-btn"
            title="Call +234 812 345 6789"
          >
            <Phone size={13} className="text-[#158047]" />
            <span className="hidden xl:inline">+234 812 345 6789</span>
            <span className="inline xl:hidden text-[11px] font-bold">Call</span>
          </a>

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

        {/* Tablet Navigation Controls (768px - 1023px) */}
        <div className="hidden md:flex lg:hidden items-center gap-2 ml-auto">
          <a
            href="tel:+2348123456789"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#12492f] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors min-h-[44px]"
            aria-label="Call ShabaAutos Hotline"
          >
            <Phone size={14} className="text-[#158047]" />
            <span className="text-[11px]">Hotline</span>
          </a>

          <button
            onClick={() => handleNavClick('saved-compare')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#12492f] bg-emerald-50/70 hover:bg-emerald-100/70 rounded-lg transition-colors relative cursor-pointer min-h-[44px]"
            aria-label="Saved Cars"
          >
            <Heart size={15} className={savedCount > 0 ? 'fill-[#12492f]/20' : ''} />
            <span className="text-[11px]">Saved</span>
            {savedCount > 0 && (
              <span className="w-4 h-4 bg-[#12492f] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('saved-compare')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#12492f] bg-emerald-50/70 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            aria-label="Compare List"
          >
            <Scale size={15} />
            <span className="text-[11px]">Compare</span>
            {compareCount > 0 && (
              <span className="w-4 h-4 bg-[#12492f] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {compareCount}
              </span>
            )}
          </button>

          <div className="shabaautos-dropdown shabaautos-tablet-account-dropdown">
            <button
              onClick={(e) => {
                if (isLoggedIn && user) {
                  handleToggleDropdown('tablet-account', e);
                } else {
                  handleNavClick('auth');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#12492f] border border-emerald-300 hover:border-[#12492f] rounded-lg transition-colors cursor-pointer bg-white min-h-[44px]"
              aria-label={isLoggedIn ? 'Open account profile' : 'Account Login'}
              aria-expanded={isLoggedIn ? activeDropdown === 'tablet-account' : undefined}
            >
              <User size={14} />
              <span className="text-[11px]">{isLoggedIn ? 'Profile' : 'Sign In'}</span>
              {isLoggedIn && <ChevronDown size={11} />}
            </button>
            {renderAccountPanel('tablet-account')}
          </div>

          {/* Tablet Drawer Button */}
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 text-white bg-[#12492f] hover:bg-[#0e3b26] rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 min-h-[44px]"
            aria-label={isMenuOpen ? 'Close navigation directory' : 'Open navigation directory'}
            onClick={() => {
              if (onToggleMobileMenu) {
                onToggleMobileMenu();
              } else {
                setIsMenuOpen(!isMenuOpen);
              }
            }}
          >
            {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="text-[11px] font-bold uppercase tracking-wider">Directory</span>
          </button>
        </div>
      </div>

      {/* Tablet Dedicated Navigation Strip (768px - 1023px) */}
      <nav
        className="hidden md:flex lg:hidden bg-white/95 border-t border-[#e8ece7] px-4 py-1.5 items-center justify-between shadow-2xs backdrop-blur-md"
        aria-label="Tablet sub-navigation"
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 w-full">
          {/* Home */}
          <button
            onClick={() => handleNavClick('home')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'home'
                ? 'bg-[#12492f] text-white shadow-xs'
                : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
            }`}
          >
            <Home size={13} />
            <span>Home</span>
          </button>

          {/* Buy Cars with Tablet Dropdown */}
          <div className="relative shrink-0">
            <div
              className={`flex items-center rounded-lg text-xs font-bold transition-all ${
                currentScreen === 'buy-cars' || currentScreen === 'car-details' || currentScreen === 'car-details-rav4'
                  ? 'bg-[#12492f] text-white shadow-xs'
                  : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
              }`}
            >
              <button
                onClick={() => handleNavClick('buy-cars')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
              >
                <Car size={13} />
                <span>Buy Cars</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-black ${
                    currentScreen === 'buy-cars' || currentScreen === 'car-details' || currentScreen === 'car-details-rav4'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-[#12492f]'
                  }`}
                >
                  56
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleDropdown('tablet-buy', e)}
                className="pr-2 pl-0.5 py-1.5 cursor-pointer hover:opacity-80"
                aria-label="Toggle Buy Cars submenu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    activeDropdown === 'tablet-buy' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {activeDropdown === 'tablet-buy' && (
              <div className="absolute top-full left-0 mt-1.5 w-[270px] bg-white rounded-xl shadow-xl border border-[#e4e9e3] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleNavClick('buy-cars')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><Car size={14} className="text-[#158047]" /> All 56 Verified Cars</span>
                  <span className="text-[10px] bg-emerald-100 text-[#12492f] font-bold px-1.5 py-0.5 rounded">All</span>
                </button>
                <button
                  onClick={() => handleNavClick('car-details-rav4')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Compass size={14} className="text-[#158047]" />
                  <span>SUVs & Crossovers (RAV4, Lexus RX)</span>
                </button>
                <button
                  onClick={() => handleNavClick('car-details')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-[#158047]" />
                  <span>Sedans & Luxury (Camry, C-Class)</span>
                </button>
              </div>
            )}
          </div>

          {/* Rent a Car with Tablet Dropdown */}
          <div className="relative shrink-0">
            <div
              className={`flex items-center rounded-lg text-xs font-bold transition-all ${
                currentScreen === 'rent-car'
                  ? 'bg-[#12492f] text-white shadow-xs'
                  : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
              }`}
            >
              <button
                onClick={() => handleNavClick('rent-car')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
              >
                <Calendar size={13} />
                <span>Rent a Car</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleDropdown('tablet-rent', e)}
                className="pr-2 pl-0.5 py-1.5 cursor-pointer hover:opacity-80"
                aria-label="Toggle Rent a Car submenu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    activeDropdown === 'tablet-rent' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {activeDropdown === 'tablet-rent' && (
              <div className="absolute top-full left-0 mt-1.5 w-[260px] bg-white rounded-xl shadow-xl border border-[#e4e9e3] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleNavClick('rent-car')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Car size={14} className="text-[#158047]" />
                  <span>Daily & Weekly Self-Drive</span>
                </button>
                <button
                  onClick={() => handleNavClick('rent-car')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Plane size={14} className="text-[#158047]" />
                  <span>Airport Fast-Track Pickups</span>
                </button>
                <button
                  onClick={() => handleNavClick('rent-car')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <ShieldCheck size={14} className="text-[#158047]" />
                  <span>Chauffeur & Armed Escort</span>
                </button>
              </div>
            )}
          </div>

          {/* Import from US with Tablet Dropdown */}
          <div className="relative shrink-0">
            <div
              className={`flex items-center rounded-lg text-xs font-bold transition-all ${
                currentScreen === 'import-landing' || currentScreen === 'import-form'
                  ? 'bg-[#12492f] text-white shadow-xs'
                  : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
              }`}
            >
              <button
                onClick={() => handleNavClick('import-landing')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
              >
                <Ship size={13} />
                <span>Import US</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleDropdown('tablet-import', e)}
                className="pr-2 pl-0.5 py-1.5 cursor-pointer hover:opacity-80"
                aria-label="Toggle Import submenu"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    activeDropdown === 'tablet-import' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {activeDropdown === 'tablet-import' && (
              <div className="absolute top-full left-0 mt-1.5 w-[270px] bg-white rounded-xl shadow-xl border border-[#e4e9e3] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleNavClick('import-landing')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Ship size={14} className="text-[#158047]" />
                  <span>Direct Import Overview</span>
                </button>
                <button
                  onClick={() => handleNavClick('import-landing')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <Calculator size={14} className="text-[#158047]" />
                  <span>Customs & Duty Calculator</span>
                </button>
                <button
                  onClick={() => handleNavClick('import-form')}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-[#12492f] rounded-lg flex items-center gap-2"
                >
                  <FileText size={14} className="text-[#158047]" />
                  <span>Start Import Wizard</span>
                </button>
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={() => handleNavClick('order-tracking')}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-[#12492f] hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                  >
                    <Clock size={14} />
                    <span>Track Active Order (SA-IMP-00078)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sell Your Car */}
          <button
            onClick={() => handleNavClick('sell-car')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'sell-car'
                ? 'bg-[#12492f] text-white shadow-xs'
                : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
            }`}
          >
            <DollarSign size={13} />
            <span>Sell Car</span>
          </button>

          {/* Car Finder */}
          <button
            onClick={() => handleNavClick('find-car')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'find-car'
                ? 'bg-[#12492f] text-white shadow-xs'
                : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
            }`}
          >
            <Search size={13} />
            <span>Car Finder</span>
          </button>

          {/* Live Order Tracking */}
          <button
            onClick={() => handleNavClick('order-tracking')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'order-tracking'
                ? 'bg-[#12492f] text-white shadow-xs'
                : 'text-[#26372c] hover:bg-emerald-50 hover:text-[#12492f]'
            }`}
          >
            <Clock size={13} />
            <span>Track Order</span>
          </button>
        </div>
      </nav>

    </header>
  );
};
