import React, { useState, useRef, useEffect } from 'react';
import { fetchMySavedVehicles, fetchMyComparison, removeSavedVehicleFromAccount, saveVehicleToAccount } from './services/api';
import { useAuthUser } from './context/AuthContext';
import { Car, ScreenId } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeScreen } from './views/HomeScreen';
import { BuyCarsScreen } from './views/BuyCarsScreen';
import { CarDetailScreen } from './views/CarDetailScreen';
import { RentCarScreen } from './views/RentCarScreen';
import { ImportLandingScreen } from './views/ImportLandingScreen';
import { ImportFormScreen } from './views/ImportFormScreen';
import { SellCarScreen } from './views/SellCarScreen';
import { FindCarScreen } from './views/FindCarScreen';
import { SavedCompareScreen } from './views/SavedCompareScreen';
import { OrderTrackingScreen } from './views/OrderTrackingScreen';
import { AuthModalScreen } from './views/AuthModalScreen';
import { OperationsDashboardScreen } from './views/OperationsDashboardScreen';
import { MobileProfileScreen } from './views/MobileProfileScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileSidebar } from './components/MobileSidebar';

export default function App() {
  const initialCarId = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('carId');
  const initialTrackingId = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('trackingId');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(initialCarId ? 'car-details' : initialTrackingId ? 'order-tracking' : 'home');
  const [selectedCarId, setSelectedCarId] = useState<string>(initialCarId || '');
  const [selectedCar, setSelectedCar] = useState<Car | undefined>();
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [savedCarIds, setSavedCarIds] = useState<string[]>([]);
  const [compareCount, setCompareCount] = useState(0);
  const [savedError, setSavedError] = useState('');
  const { user, isSignedIn, isLoaded } = useAuthUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      setSavedCarIds([]);
      setCompareCount(0);
      return;
    }
    let active = true;
    fetchMySavedVehicles().then((res) => {
      if (!active || !res.success) return;
      setSavedCarIds(Array.isArray(res.savedCarIds) ? res.savedCarIds : []);
    });
    fetchMyComparison().then((res) => {
      if (!active || !res.success) return;
      setCompareCount(Array.isArray(res.vehicles) ? res.vehicles.length : 0);
    });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id, currentScreen]);

  const handleToggleSaveCar = async (carId: string) => {
    if (!isSignedIn) { handleNavigate('auth'); return; }
    const wasSaved = savedCarIds.includes(carId);
    setSavedError('');
    setSavedCarIds((prev) => wasSaved ? prev.filter((id) => id !== carId) : [...prev, carId]);
    try {
      const result = wasSaved ? await removeSavedVehicleFromAccount(carId) : await saveVehicleToAccount(carId);
      if (!result.success) throw new Error(result.message || 'Could not update saved vehicles.');
      if (Array.isArray(result.savedCarIds)) setSavedCarIds(result.savedCarIds);
    } catch (error) {
      setSavedCarIds((prev) => wasSaved ? [...new Set([...prev, carId])] : prev.filter((id) => id !== carId));
      setSavedError(error instanceof Error ? error.message : 'Could not update saved vehicles.');
    }
  };

  const handleNavigate = (screen: ScreenId) => {
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('carId')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (screen !== 'order-tracking' && screen !== 'auth' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('trackingId')) {
        url.searchParams.delete('trackingId');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
    if (screen === 'car-details-rav4') {
      window.history.replaceState(null, '', `${window.location.pathname}?search=RAV4`);
      setCurrentScreen('buy-cars');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (screen === 'car-details') {
      setCurrentScreen(selectedCarId ? 'car-details' : 'buy-cars');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (screen === 'auth') {
      setPreviousScreen(currentScreen);
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCar = (carId: string, car?: Car) => {
    setMobileMenuOpen(false);
    setSelectedCarId(carId);
    setSelectedCar(car);
    setCurrentScreen('car-details');
    window.history.replaceState(null, '', `${window.location.pathname}?carId=${encodeURIComponent(carId)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-clip min-h-screen flex flex-col bg-[#f8f9fa] text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {savedError && <div role="alert" className="fixed right-4 top-24 z-[90] max-w-sm rounded-xl border border-red-200 bg-white p-4 text-sm font-semibold text-red-800 shadow-lg">{savedError}<button type="button" className="ml-3 text-xs underline" onClick={() => setSavedError('')}>Dismiss</button></div>}
      {/* Persistent Global Header with Mockup Switcher */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        savedCount={savedCarIds.length}
        compareCount={compareCount}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* Main Screen Views with bottom safe padding on mobile and tablet for the bottom nav bar */}
      <main key={currentScreen} className="shaba-page-transition flex-1 pb-20 lg:pb-0 min-w-0 w-full max-w-full">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            onSelectCar={handleSelectCar}
            savedCarIds={savedCarIds}
            onToggleSaveCar={handleToggleSaveCar}
          />
        )}

        {currentScreen === 'buy-cars' && (
          <BuyCarsScreen
            onNavigate={handleNavigate}
            onSelectCar={handleSelectCar}
            savedCarIds={savedCarIds}
            onToggleSaveCar={handleToggleSaveCar}
            compareCount={compareCount}
          />
        )}

        {currentScreen === 'car-details' && (
          <CarDetailScreen
            car={selectedCar}
            carId={selectedCarId}
            onNavigate={handleNavigate}
            isSaved={savedCarIds.includes(selectedCarId)}
            onToggleSave={() => handleToggleSaveCar(selectedCarId)}
          />
        )}

        {currentScreen === 'rent-car' && (
          <RentCarScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'import-landing' && (
          <ImportLandingScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'import-form' && (
          <ImportFormScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'sell-car' && (
          <SellCarScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'find-car' && (
          <FindCarScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'saved-compare' && (
          <SavedCompareScreen onNavigate={handleNavigate} onSelectCar={handleSelectCar} />
        )}

        {currentScreen === 'order-tracking' && (
          <OrderTrackingScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'operations-dashboard' && (
          <OperationsDashboardScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'auth' && (
          <AuthModalScreen
            onNavigate={handleNavigate}
            onClose={() => setCurrentScreen(previousScreen)}
            previousScreen={previousScreen}
          />
        )}

        {currentScreen === 'profile' && (
          <MobileProfileScreen
            onNavigate={handleNavigate}
            savedCount={savedCarIds.length}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Advanced Native-Style Mobile Bottom Navigation (Mobile only, desktop untouched) */}
      <MobileBottomNav
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        savedCount={savedCarIds.length}
        compareCount={compareCount}
        isMenuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen(true)}
        menuButtonRef={menuButtonRef}
      />

      {/* Responsive Slide-Out Mobile Navigation Drawer */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        currentScreen={currentScreen}
        savedCount={savedCarIds.length}
        compareCount={compareCount}
        triggerRef={menuButtonRef}
      />
    </div>
  );
}
