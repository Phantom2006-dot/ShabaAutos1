import React from 'react';
import {
  Home,
  Car,
  Calendar,
  Ship,
  Menu,
} from 'lucide-react';
import { ScreenId } from '../types';

interface MobileBottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  savedCount?: number;
  compareCount?: number;
  isLoggedIn?: boolean;
  isMenuOpen?: boolean;
  onOpenMenu?: () => void;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  onNavigate,
  savedCount = 0,
  isMenuOpen = false,
  onOpenMenu,
  menuButtonRef,
}) => {
  // Tab mapping & active logic
  const isHomeActive = currentScreen === 'home';
  const isBuyActive =
    currentScreen === 'buy-cars' ||
    currentScreen === 'car-details' ||
    currentScreen === 'car-details-rav4';
  const isRentActive = currentScreen === 'rent-car';
  const isImportActive =
    currentScreen === 'import-landing' || currentScreen === 'import-form';
  const isMenuActive = isMenuOpen;

  return (
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] min-h-[58px] w-full max-w-full overflow-hidden"
      aria-label="Mobile application bottom navigation"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto w-full">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] min-w-[44px] active:scale-95 ${
            isHomeActive
              ? 'text-[#0e7c3a]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <div className="relative">
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-colors ${
                isHomeActive ? 'bg-emerald-100/70' : 'bg-transparent'
              }`}
            >
              <Home
                className={`w-5 h-5 transition-transform ${
                  isHomeActive ? 'stroke-[2.5px] scale-105 text-[#0e7c3a]' : 'stroke-2 text-slate-500'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
              isHomeActive ? 'font-black text-[#0e7c3a]' : 'font-semibold text-slate-500'
            }`}
          >
            Home
          </span>
        </button>

        {/* Tab 2: Buy */}
        <button
          type="button"
          onClick={() => onNavigate('buy-cars')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] min-w-[44px] active:scale-95 ${
            isBuyActive
              ? 'text-[#0e7c3a]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Buy"
          aria-current={isBuyActive ? 'page' : undefined}
        >
          <div className="relative">
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-colors ${
                isBuyActive ? 'bg-emerald-100/70' : 'bg-transparent'
              }`}
            >
              <Car
                className={`w-5 h-5 transition-transform ${
                  isBuyActive ? 'stroke-[2.5px] scale-105 text-[#0e7c3a]' : 'stroke-2 text-slate-500'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
              isBuyActive ? 'font-black text-[#0e7c3a]' : 'font-semibold text-slate-500'
            }`}
          >
            Buy
          </span>
        </button>

        {/* Tab 3: Rent */}
        <button
          type="button"
          onClick={() => onNavigate('rent-car')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] min-w-[44px] active:scale-95 ${
            isRentActive
              ? 'text-[#0e7c3a]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Rent"
          aria-current={isRentActive ? 'page' : undefined}
        >
          <div className="relative">
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-colors ${
                isRentActive ? 'bg-emerald-100/70' : 'bg-transparent'
              }`}
            >
              <Calendar
                className={`w-5 h-5 transition-transform ${
                  isRentActive ? 'stroke-[2.5px] scale-105 text-[#0e7c3a]' : 'stroke-2 text-slate-500'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
              isRentActive ? 'font-black text-[#0e7c3a]' : 'font-semibold text-slate-500'
            }`}
          >
            Rent
          </span>
        </button>

        {/* Tab 4: Import */}
        <button
          type="button"
          onClick={() => onNavigate('import-landing')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] min-w-[44px] active:scale-95 ${
            isImportActive
              ? 'text-[#0e7c3a]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Import"
          aria-current={isImportActive ? 'page' : undefined}
        >
          <div className="relative">
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-colors ${
                isImportActive ? 'bg-emerald-100/70' : 'bg-transparent'
              }`}
            >
              <Ship
                className={`w-5 h-5 transition-transform ${
                  isImportActive ? 'stroke-[2.5px] scale-105 text-[#0e7c3a]' : 'stroke-2 text-slate-500'
                }`}
              />
            </div>
          </div>
          <span
            className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
              isImportActive ? 'font-black text-[#0e7c3a]' : 'font-semibold text-slate-500'
            }`}
          >
            Import
          </span>
        </button>

        {/* Tab 5: Menu */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => {
            if (onOpenMenu) {
              onOpenMenu();
            }
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] min-w-[44px] active:scale-95 ${
            isMenuActive
              ? 'text-[#0e7c3a]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Open Navigation Menu"
          aria-expanded={isMenuActive}
        >
          <div className="relative">
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-colors ${
                isMenuActive ? 'bg-emerald-100/70' : 'bg-transparent hover:bg-emerald-100/50'
              }`}
            >
              <Menu
                className={`w-5 h-5 transition-transform ${
                  isMenuActive ? 'stroke-[2.5px] scale-105 text-[#0e7c3a]' : 'stroke-2 text-slate-600'
                }`}
              />
            </div>
            {savedCount > 0 && (
              <span className="absolute -top-0.5 right-0 bg-[#12492f] text-white text-[9px] font-black rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center shadow-xs">
                {savedCount}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-tight leading-tight mt-0.5 whitespace-nowrap ${
              isMenuActive ? 'font-black text-[#0e7c3a]' : 'font-bold text-slate-700'
            }`}
          >
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
