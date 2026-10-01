import React, { useEffect, useMemo, useState } from 'react';
import type { Car } from '../types';
import {
  Heart, Scale, Trash2, CheckSquare, Square, X, MessageSquare,
  CheckCircle2, LayoutDashboard, FileText, Calendar, Package, User,
  LogOut, MapPin, Lock,
} from 'lucide-react';
import { ScreenId } from '../types';
import { useAuthUser } from '../context/AuthContext';
import { useBusinessContact } from '../hooks/useBusinessContact';
import {
  fetchMySavedVehicles,
  fetchMyComparison,
  saveVehicleToAccount,
  removeSavedVehicleFromAccount,
  updateMyComparison,
} from '../services/api';

interface SavedCompareScreenProps {
  onNavigate: (screen: ScreenId) => void;
  /** Optional until the application router wires selected vehicle state. */
  onSelectCar?: (carId: string, car?: Car) => void;
}

const MAX_COMPARISON = 3;
const carImage = (car: Car) => car.images?.[0] || '';
const errorMessage = (response: { message?: string }, fallback: string) => response.message || fallback;

export const SavedCompareScreen: React.FC<SavedCompareScreenProps> = ({ onNavigate, onSelectCar }) => {
  const { user, isLoaded, isSignedIn, signOut } = useAuthUser();
  const businessContact = useBusinessContact();
  const [savedCars, setSavedCars] = useState<Car[]>([]);
  const [comparisonCars, setComparisonCars] = useState<Car[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [savedError, setSavedError] = useState('');
  const [comparisonError, setComparisonError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);

  const comparisonIds = useMemo(() => comparisonCars.map((car) => car.id), [comparisonCars]);
  const selectedCount = comparisonIds.length;

  useEffect(() => {
    let active = true;
    if (!isLoaded || !isSignedIn || !user) {
      setSavedCars([]);
      setComparisonCars([]);
      return () => { active = false; };
    }

    setSavedLoading(true);
    setComparisonLoading(true);
    setSavedError('');
    setComparisonError('');
    // These are deliberately separate account resources: saved vehicles and comparison are not the same list.
    fetchMySavedVehicles().then((response) => {
      if (!active) return;
      if (response.success) setSavedCars(Array.isArray(response.vehicles) ? response.vehicles : []);
      else setSavedError('Saved vehicles could not be loaded. Please try again.');
    }).catch(() => {
      if (active) setSavedError('Saved vehicles could not be loaded. Please try again.');
    }).finally(() => { if (active) setSavedLoading(false); });

    fetchMyComparison().then((response) => {
      if (!active) return;
      if (response.success) setComparisonCars(Array.isArray(response.vehicles) ? response.vehicles.slice(0, MAX_COMPARISON) : []);
      else setComparisonError('Comparison vehicles could not be loaded. Please try again.');
    }).catch(() => {
      if (active) setComparisonError('Comparison vehicles could not be loaded. Please try again.');
    }).finally(() => { if (active) setComparisonLoading(false); });

    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id]);

  const setComparison = async (vehicleIds: string[]) => {
    const nextIds = Array.from(new Set(vehicleIds));
    if (nextIds.length > MAX_COMPARISON) {
      setMutationError('You can compare up to 3 vehicles. Remove one before adding another.');
      return false;
    }
    const previous = comparisonCars;
    setMutationError('');
    setMutatingId('comparison');
    try {
      const response = await updateMyComparison(nextIds);
      if (!response.success) {
        setMutationError(errorMessage(response as { message?: string }, 'Comparison could not be updated. Please try again.'));
        return false;
      }
      const responseCars = Array.isArray(response.vehicles) ? response.vehicles : [];
      const available = new Map([...savedCars, ...previous, ...responseCars].map((car) => [car.id, car]));
      setComparisonCars(nextIds.map((id) => available.get(id)).filter((car): car is Car => Boolean(car)));
      return true;
    } catch {
      setMutationError('Comparison could not be updated. Please try again.');
      return false;
    } finally {
      setMutatingId(null);
    }
  };

  const saveComparisonCar = async (car: Car) => {
    if (savedCars.some((savedCar) => savedCar.id === car.id)) return;
    setMutationError('');
    setMutatingId(`save-${car.id}`);
    try {
      const response = await saveVehicleToAccount(car.id);
      if (!response.success) {
        setMutationError(errorMessage(response, 'Vehicle could not be saved. Please try again.'));
        return;
      }
      setSavedCars((cars) => cars.some((savedCar) => savedCar.id === car.id) ? cars : [...cars, car]);
    } catch {
      setMutationError('Vehicle could not be saved. Please try again.');
    } finally {
      setMutatingId(null);
    }
  };

  const toggleCompare = (id: string) => {
    const nextIds = comparisonIds.includes(id)
      ? comparisonIds.filter((comparisonId) => comparisonId !== id)
      : [...comparisonIds, id];
    void setComparison(nextIds);
  };

  const toggleSelectAll = () => {
    const allSavedAreCompared = savedCars.length > 0 && savedCars.every((car) => comparisonIds.includes(car.id));
    void setComparison(allSavedAreCompared ? [] : savedCars.slice(0, MAX_COMPARISON).map((car) => car.id));
  };

  const removeSaved = async (id: string) => {
    setMutationError('');
    setMutatingId(id);
    try {
      const response = await removeSavedVehicleFromAccount(id);
      if (!response.success) {
        setMutationError(errorMessage(response, 'Vehicle could not be removed from saved vehicles.'));
        return;
      }
      setSavedCars((cars) => cars.filter((car) => car.id !== id));
      if (comparisonIds.includes(id)) await setComparison(comparisonIds.filter((comparisonId) => comparisonId !== id));
    } catch {
      setMutationError('Vehicle could not be removed from saved vehicles.');
    } finally {
      setMutatingId(null);
    }
  };

  const deleteSelected = async () => {
    const ids = savedCars.filter((car) => comparisonIds.includes(car.id)).map((car) => car.id);
    if (!ids.length) return;
    setMutationError('');
    setMutatingId('saved');
    const results = await Promise.all(ids.map((id) => removeSavedVehicleFromAccount(id)));
    const failed = results.some((result) => !result.success);
    if (failed) {
      setMutationError('Some saved vehicles could not be removed. Please try again.');
    } else {
      setSavedCars((cars) => cars.filter((car) => !ids.includes(car.id)));
      await setComparison([]);
    }
    setMutatingId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-sm text-gray-500">Loading account…</div>;
  }

  if (!isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0e7c3a] border border-emerald-200 flex items-center justify-center mb-4"><Lock className="w-8 h-8" /></div>
        <h2 className="text-xl font-black text-slate-900 mb-1">Sign In Required</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-xs">Please sign in to view your saved vehicles and comparison list.</p>
        <button type="button" onClick={() => onNavigate('auth')} className="w-full max-w-xs py-3 rounded-xl bg-[#0e7c3a] text-white font-bold text-sm shadow-md">Sign In / Create Account</button>
        <button type="button" onClick={() => onNavigate('home')} className="mt-3 text-xs text-slate-500 font-semibold">Return to Home</button>
      </div>
    );
  }

  const allSavedAreCompared = savedCars.length > 0 && savedCars.every((car) => comparisonIds.includes(car.id));

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 shadow-xs">
              <div className="flex items-center gap-3 p-3 border-b border-gray-100 pb-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-sm">{user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0"><h4 className="text-xs font-bold text-gray-900 truncate">{user.fullName}</h4><p className="text-[10px] text-gray-500 truncate">ID: {user.id}</p></div>
              </div>
              <nav className="space-y-1 text-xs font-medium">
                <button onClick={() => onNavigate('home')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"><LayoutDashboard className="w-4 h-4 text-gray-400" />Dashboard</button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 text-[#0a502c] font-bold"><Heart className="w-4 h-4 text-[#0a502c]" />Saved &amp; Compare ({savedCars.length})</button>
                <button onClick={() => onNavigate('import-form')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"><FileText className="w-4 h-4 text-gray-400" />Sourcing Requests</button>
                <button onClick={() => onNavigate('rent-car')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"><Calendar className="w-4 h-4 text-gray-400" />Rental Bookings</button>
                <button onClick={() => onNavigate('order-tracking')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"><Package className="w-4 h-4 text-gray-400" />My Import Orders</button>
                <button onClick={() => onNavigate('profile')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"><User className="w-4 h-4 text-gray-400" />Profile &amp; Settings</button>
                <div className="pt-4 border-t border-gray-100"><button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"><LogOut className="w-4 h-4" />Log Out</button></div>
              </nav>
            </div>
          </aside>

          <main className="lg:col-span-6 space-y-8">
            {showAlert && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900"><span>Prices are indicative and may change based on currency fluctuations. Contact us for the latest real-time offers.</span><button onClick={() => setShowAlert(false)} className="text-emerald-700 ml-3" aria-label="Dismiss notice"><X className="w-4 h-4" /></button></div>}
            <div><h1 className="text-2xl font-black text-gray-900 tracking-tight">Saved &amp; Compare Cars</h1><p className="text-xs text-gray-600 mt-1">View your bookmarked cars and compare up to 3 vehicles side by side.</p></div>
            {(savedError || comparisonError || mutationError) && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">{savedError || comparisonError || mutationError}</div>}

            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Saved Cars ({savedCars.length})</h3>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={toggleSelectAll} disabled={savedLoading || Boolean(mutatingId) || !savedCars.length} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-semibold disabled:opacity-40">{allSavedAreCompared ? <CheckSquare className="w-4 h-4 text-[#0a502c]" /> : <Square className="w-4 h-4 text-gray-400" />} Select All</button>
                  <button onClick={() => void deleteSelected()} disabled={!selectedCount || Boolean(mutatingId)} className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" />Delete Compared</button>
                  <button onClick={() => void setComparison(comparisonIds)} disabled={!selectedCount || Boolean(mutatingId)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a502c] text-white font-bold shadow-xs disabled:opacity-40"><Scale className="w-3.5 h-3.5" />Compare ({selectedCount})</button>
                </div>
              </div>
              {savedLoading ? <p className="py-8 text-center text-xs text-gray-500">Loading saved vehicles…</p> : savedCars.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">You have no saved vehicles yet.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">{savedCars.map((car) => {
                const compared = comparisonIds.includes(car.id);
                return <div key={car.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-gray-50 flex flex-col justify-between"><div><div className="relative h-36 bg-gray-200">{carImage(car) && <img src={carImage(car)} alt={car.name || `${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover" />}<button onClick={() => toggleCompare(car.id)} disabled={Boolean(mutatingId)} aria-label={compared ? 'Remove from comparison' : 'Add to comparison'} className="absolute top-2 left-2 w-6 h-6 rounded-md bg-white/90 flex items-center justify-center shadow-xs disabled:opacity-40">{compared ? <CheckSquare className="w-4 h-4 text-[#0a502c]" /> : <Square className="w-4 h-4 text-gray-400" />}</button><button onClick={() => void removeSaved(car.id)} disabled={mutatingId === car.id || Boolean(mutatingId)} aria-label="Remove saved vehicle" className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-xs disabled:opacity-40"><Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /></button></div><div className="p-3"><h4 className="font-bold text-xs text-gray-900 line-clamp-1">{car.name || `${car.year} ${car.make} ${car.model}`}</h4><div className="text-sm font-black text-[#0a502c] mt-1">₦{car.priceNgn.toLocaleString()}</div><p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 text-gray-400" />{car.location}</p></div></div><div className="p-3 pt-0"><button onClick={() => { onSelectCar ? onSelectCar(car.id, car) : onNavigate('buy-cars'); }} className="w-full py-1.5 bg-white border border-gray-300 hover:bg-[#0a502c] hover:text-white text-gray-800 text-[11px] font-bold rounded-lg transition-colors">View Details</button></div></div>;
              })}</div>}
            </div>

            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Compare Cars ({comparisonCars.length}/{MAX_COMPARISON})</h3><button onClick={() => void setComparison([])} disabled={comparisonLoading || Boolean(mutatingId) || !comparisonCars.length} className="text-xs font-semibold text-emerald-800 hover:underline disabled:opacity-40">Clear Comparison</button></div>
              {comparisonLoading ? <p className="py-8 text-center text-xs text-gray-500">Loading comparison…</p> : comparisonCars.length === 0 ? <p className="py-8 text-center text-xs text-gray-500">Select saved vehicles to compare them here.</p> : <div className="overflow-x-auto mt-4"><table className="w-full text-xs text-left min-w-[540px]"><thead><tr className="border-b border-gray-200"><th className="py-3 px-2 text-gray-400 font-bold uppercase text-[10px] w-28">Specification</th>{comparisonCars.map((car) => <th key={car.id} className="py-3 px-3 w-1/3"><div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-gray-100">{carImage(car) && <img src={carImage(car)} alt={car.name || `${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover" />}</div><span className="font-bold text-gray-900 block">{car.name || `${car.year} ${car.make} ${car.model}`}</span><span className="text-[10px] text-gray-500">{car.trim || '—'}</span></th>)}</tr></thead><tbody className="divide-y divide-gray-100">{[['Price', (car: Car) => `₦${car.priceNgn.toLocaleString()}`], ['Location', (car: Car) => car.location], ['Mileage', (car: Car) => `${car.mileage} ${car.mileageUnit || ''}`], ['Transmission', (car: Car) => car.transmission], ['Engine', (car: Car) => car.engine], ['Fuel Type', (car: Car) => car.fuelType], ['Body Type', (car: Car) => car.bodyType]].map(([label, value]) => <tr key={label as string}><td className="py-2.5 px-2 text-gray-500 font-medium">{label as string}</td>{comparisonCars.map((car) => <td key={car.id} className="py-2.5 px-3 text-gray-800">{(value as (car: Car) => string)(car)}</td>)}</tr>)}<tr><td className="py-3 px-2" />{comparisonCars.map((car) => <td key={car.id} className="py-3 px-3"><div className="space-y-1.5"><button onClick={() => { onSelectCar ? onSelectCar(car.id, car) : onNavigate('buy-cars'); }} className="w-full py-2 bg-[#0a502c] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors">Choose Vehicle</button>{!savedCars.some((savedCar) => savedCar.id === car.id) && <button onClick={() => void saveComparisonCar(car)} disabled={Boolean(mutatingId)} className="w-full py-1.5 border border-emerald-700 text-emerald-800 font-bold rounded-lg text-[11px] disabled:opacity-40">Save Vehicle</button>}</div></td>)}</tr></tbody></table></div>}
            </div>
          </main>

          <aside className="lg:col-span-3 space-y-6"><div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Need Help Deciding?</h4><p className="text-xs text-gray-500 leading-relaxed mb-4">Our automotive consultants can compare long-term maintenance costs, fuel consumption, and insurance rates for you.</p>{businessContact.phone ? <a href={`https://wa.me/${businessContact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"><MessageSquare className="w-3.5 h-3.5" />Chat with the team</a> : <p className="text-xs text-slate-500">For questions, submit a sourcing request with your contact details.</p>}</div><div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Comparison notes</h4><p className="text-xs text-gray-700 leading-relaxed">Compare up to three vehicles using the specifications returned for your saved cars.</p><div className="flex items-center gap-2 mt-3 text-xs text-[#0a502c] font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Your list is account-backed</div></div></aside>
        </div>
      </div>
    </div>
  );
};
