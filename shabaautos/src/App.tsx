import React, { useState, useRef, useEffect } from 'react';
import { fetchMySavedVehicles } from './services/api';
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
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [selectedCarId, setSelectedCarId] = useState<string>('car-1');
  const [selectedCar, setSelectedCar] = useState<Car | undefined>();
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [savedCarIds, setSavedCarIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetchMySavedVehicles().then((res) => {
      if (!active || !res.success) return;
      setSavedCarIds(Array.isArray(res.savedCarIds) ? res.savedCarIds : []);
    });
    return () => { active = false; };
  }, []);

  const handleToggleSaveCar = (carId: string) => {
    setSavedCarIds((prev) =>
      prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]
    );
  };

  const handleNavigate = (screen: ScreenId) => {
    setMobileMenuOpen(false);
    if (screen === 'car-details-rav4') {
      setSelectedCarId('rav4-2022');
      setCurrentScreen('car-details');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (screen === 'car-details') {
      setSelectedCarId('car-1');
      setCurrentScreen('car-details');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-clip min-h-screen flex flex-col bg-[#f8f9fa] text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Persistent Global Header with Mockup Switcher */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        savedCount={savedCarIds.length}
        compareCount={3}
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
            compareCount={3}
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
          <SavedCompareScreen onNavigate={handleNavigate} />
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
        compareCount={3}
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
        compareCount={3}
        triggerRef={menuButtonRef}
      />
    </div>
  );
}
