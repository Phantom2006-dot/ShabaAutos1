import React, { useEffect, useState } from 'react';
import type { Car } from '../types';
import {
  Heart,
  Scale,
  Trash2,
  CheckSquare,
  Square,
  X,
  MessageSquare,
  Phone,
  CheckCircle2,
  LayoutDashboard,
  FileText,
  Calendar,
  Package,
  User,
  Settings,
  LogOut,
  MapPin,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ScreenId } from '../types';
import { fetchMyComparison } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface SavedCompareScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SavedCompareScreen: React.FC<SavedCompareScreenProps> = ({ onNavigate }) => {
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    let active = true;
    fetchMyComparison().then((res) => {
      if (!active || !res.success) return;
      setCars(Array.isArray(res.vehicles) ? res.vehicles.map((v) => ({ ...v, selected: true })) : []);
    });
    return () => { active = false; };
  }, []);
  const [showAlert, setShowAlert] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('saved');

  const selectedCount = cars.filter((c) => c.selected).length;

  const toggleSelect = (id: string) => {
    setCars(
      cars.map((c) => {
        if (c.id === id) {
          return { ...c, selected: !c.selected };
        }
        return c;
      })
    );
  };

  const toggleSelectAll = () => {
    const allSelected = cars.every((c) => c.selected);
    setCars(cars.map((c) => ({ ...c, selected: !allSelected })));
  };

  const deleteSelected = () => {
    setCars(cars.filter((c) => !c.selected));
  };

  const comparedCars = cars.filter((c) => c.selected);

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left User Dashboard Navigation Sidebar (2.5 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 shadow-xs">
              <div className="flex items-center gap-3 p-3 border-b border-gray-100 pb-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-sm">
                  {isSignedIn ? ((user?.fullName || user?.email || 'G').charAt(0).toUpperCase()) : 'G'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{isSignedIn ? (user?.fullName || user?.email || 'ShabaAutos Customer') : 'Guest'}</h4>
                  <p className="text-[10px] text-gray-500">Customer Portal</p>
                </div>
              </div>

              <nav className="space-y-1 text-xs font-medium">
                <button
                  onClick={() => onNavigate('home')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-400" />
                  Dashboard
                </button>

                <button
                  onClick={() => setSidebarTab('saved')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 text-[#0a502c] font-bold"
                >
                  <Heart className="w-4 h-4 text-[#0a502c]" />
                  Saved &amp; Compare ({cars.length})
                </button>

                <button
                  onClick={() => onNavigate('import-form')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  Sourcing Requests
                </button>

                <button
                  onClick={() => onNavigate('rent-car')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Rental Bookings
                </button>

                <button
                  onClick={() => onNavigate('order-tracking')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Package className="w-4 h-4 text-gray-400" />
                  My Import Orders
                </button>

                <button
                  onClick={() => onNavigate('auth')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile &amp; Settings
                </button>

                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => onNavigate('auth')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Area (6.5 Cols) */}
          <main className="lg:col-span-6 space-y-8">
            {/* Alert Notification */}
            {showAlert && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
                <span>
                  Prices are indicative and may change based on currency fluctuations. Contact us for the latest real-time offers.
                </span>
                <button
                  onClick={() => setShowAlert(false)}
                  className="text-emerald-700 hover:text-emerald-900 ml-3"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header */}
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Saved &amp; Compare Cars
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                View your bookmarked cars and compare up to 3 vehicles side by side.
              </p>
            </div>

            {/* Section 1: Saved Cars (4 Cards) */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  Saved Cars ({cars.length})
                </h3>

                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-semibold"
                  >
                    {cars.every((c) => c.selected) ? (
                      <CheckSquare className="w-4 h-4 text-[#0a502c]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    Select All
                  </button>

                  <button
                    onClick={deleteSelected}
                    disabled={selectedCount === 0}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>

                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a502c] text-white font-bold shadow-xs">
                    <Scale className="w-3.5 h-3.5" />
                    Compare ({selectedCount})
                  </button>
                </div>
              </div>

              {/* Saved Cars 4-card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                {cars.map((car) => (
                  <div
                    key={car.id}
                    className="border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-gray-50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-36 bg-gray-200">
                        <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(car.id)}
                          className="absolute top-2 left-2 w-6 h-6 rounded-md bg-white/90 flex items-center justify-center shadow-xs"
                        >
                          {car.selected ? (
                            <CheckSquare className="w-4 h-4 text-[#0a502c]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {/* Red Heart */}
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-xs">
                          <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                        </div>
                      </div>

                      <div className="p-3">
                        <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{car.name}</h4>
                        <div className="text-sm font-black text-[#0a502c] mt-1">
                          ₦{car.priceNgn.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {car.location}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 pt-0">
                      <button
                        onClick={() => onNavigate('car-details')}
                        className="w-full py-1.5 bg-white border border-gray-300 hover:bg-[#0a502c] hover:text-white hover:border-[#0a502c] text-gray-800 text-[11px] font-bold rounded-lg transition-colors text-center"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Compare Cars Table (3 Columns) */}
            {comparedCars.length > 0 && (
              <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">
                    Compare Cars ({comparedCars.length}/3)
                  </h3>
                  <button
                    onClick={() => setCars(cars.map((c) => ({ ...c, selected: false })))}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    Clear Comparison
                  </button>
                </div>

                {/* Comparison Matrix Table */}
                <div className="overflow-x-auto mt-4 -mx-1 sm:mx-0">
                  <table className="w-full text-xs text-left min-w-[540px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-2 text-gray-400 font-bold uppercase text-[10px] w-28">
                          Specification
                        </th>
                        {comparedCars.map((car) => (
                          <th key={car.id} className="py-3 px-3 w-1/3">
                            <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-gray-100">
                              <img
                                src={car.image}
                                alt={car.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-bold text-gray-900 block">{car.name}</span>
                            <span className="text-[10px] text-gray-500">{car.trim}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Price</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 font-bold text-[#0a502c]">
                            ₦{c.priceNgn.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Location</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.location}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Mileage</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.mileage}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Transmission</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.transmission}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Engine</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.engine}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Fuel Type</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.fuel}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 text-gray-500 font-medium">Body Type</td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-2.5 px-3 text-gray-800">
                            {c.bodyType}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-2"></td>
                        {comparedCars.map((c) => (
                          <td key={c.id} className="py-3 px-3">
                            <button
                              onClick={() => onNavigate('car-details')}
                              className="w-full py-2 bg-[#0a502c] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors"
                            >
                              Choose Vehicle
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar: Expert advice & Why compare (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Need Help Deciding?
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Our automotive consultants can compare long-term maintenance costs, fuel consumption, and insurance rates for you.
              </p>
              <a
                href="https://wa.me/2348123456789"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with an Expert
              </a>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                Why Compare with Us?
              </h4>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a502c] flex-shrink-0" />
                  <span>Transparent spec matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a502c] flex-shrink-0" />
                  <span>Verified mileage authenticity</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a502c] flex-shrink-0" />
                  <span>Fair market valuation index</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a502c] flex-shrink-0" />
                  <span>Zero hidden broker fees</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
