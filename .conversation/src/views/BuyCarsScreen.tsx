import React, { useState, useEffect } from 'react';
import {
  Search,
  Heart,
  Scale,
  X,
  LayoutGrid,
  List,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gauge,
  Fuel,
  MapPin,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Car, ScreenId } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { FreeCarSearchModal } from '../components/FreeCarSearchModal';
import { fetchVehicles } from '../services/api';

interface BuyCarsScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectCar: (carId: string, car?: Car) => void;
  savedCarIds?: string[];
  onToggleSaveCar?: (carId: string) => void;
  compareCount?: number;
}

export const BuyCarsScreen: React.FC<BuyCarsScreenProps> = ({
  onNavigate,
  onSelectCar,
  savedCarIds = [],
  onToggleSaveCar = (_carId: string) => {},
  compareCount = 3,
}) => {
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleLoadError, setVehicleLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState('All Makes');
  const [selectedModel, setSelectedModel] = useState('All Models');
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(1000000);
  const [priceMax, setPriceMax] = useState(100000000);
  const [minYear, setMinYear] = useState('Min Year');
  const [maxYear, setMaxYear] = useState('Max Year');
  const [mileageLimit, setMileageLimit] = useState('Any Mileage');
  const [sortBy, setSortBy] = useState('Newest First');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [freeCarModalOpen, setFreeCarModalOpen] = useState(false);
  const [saveSearchToast, setSaveSearchToast] = useState(false);

  useEffect(() => {
    let active = true;
    fetchVehicles({ limit: 100 })
      .then((data) => {
        if (!active) return;
        setVehicles(data);
        setVehicleLoadError('');
      })
      .catch(() => active && setVehicleLoadError('Live vehicle inventory is temporarily unavailable.'))
      .finally(() => active && setIsLoadingVehicles(false));
    return () => {
      active = false;
    };
  }, []);

  const handleSaveSearch = () => {
    setSaveSearchToast(true);
    setTimeout(() => setSaveSearchToast(false), 2500);
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter));
    if (filter === 'SUV') {
      setSelectedBodyTypes(selectedBodyTypes.filter((b) => b !== 'SUV'));
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSelectedBodyTypes([]);
    setSelectedMake('All Makes');
    setSearchQuery('');
  };

  // Filter calculations
  const filteredVehicles = vehicles.filter((car) => {
    if (selectedMake !== 'All Makes' && car.make.toLowerCase() !== selectedMake.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        car.make.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        `${car.year}`.includes(q) ||
        car.location.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (car.priceNgn < priceMin || car.priceNgn > priceMax) {
      return false;
    }
    return true;
  });

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.priceNgn - b.priceNgn;
    if (sortBy === 'Price: High to Low') return b.priceNgn - a.priceNgn;
    if (sortBy === 'Lowest Mileage') return a.mileage - b.mileage;
    return b.year - a.year;
  });

  const handleCarClick = (car: Car) => {
    onSelectCar(car.id, car);
    if (car.id === 'rav4-2022') {
      onNavigate('car-details-rav4');
    } else {
      onNavigate('car-details');
    }
  };

  const renderFilterContent = () => (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h3 className="font-bold text-sm text-gray-900">Filters</h3>
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-xs font-semibold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Make */}
      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Make</label>
        <select
          value={selectedMake}
          onChange={(e) => setSelectedMake(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        >
          <option value="All Makes">All Makes</option>
          <option value="Toyota">Toyota</option>
          <option value="Lexus">Lexus</option>
          <option value="Mercedes-Benz">Mercedes-Benz</option>
          <option value="Honda">Honda</option>
        </select>
      </div>

      {/* Model */}
      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        >
          <option value="All Models">All Models</option>
          <option value="RAV4">RAV4</option>
          <option value="Camry">Camry</option>
          <option value="Highlander">Highlander</option>
          <option value="Land Cruiser">Land Cruiser</option>
          <option value="4Runner">4Runner</option>
          <option value="Venza">Venza</option>
          <option value="C-HR">C-HR</option>
          <option value="Fortuner">Fortuner</option>
          <option value="Corolla Cross">Corolla Cross</option>
        </select>
      </div>

      {/* Body Type */}
      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2.5">Body Type</label>
        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBodyTypes.length === 0}
                onChange={() => setSelectedBodyTypes([])}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">All Body Types</span>
            </div>
            <span className="text-gray-400 text-[11px]">(128)</span>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBodyTypes.includes('SUV')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedBodyTypes([...selectedBodyTypes, 'SUV']);
                  } else {
                    setSelectedBodyTypes(selectedBodyTypes.filter((b) => b !== 'SUV'));
                  }
                }}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-900 font-medium">SUV</span>
            </div>
            <span className="text-gray-400 text-[11px]">(56)</span>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBodyTypes.includes('Sedan')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedBodyTypes([...selectedBodyTypes, 'Sedan']);
                  } else {
                    setSelectedBodyTypes(selectedBodyTypes.filter((b) => b !== 'Sedan'));
                  }
                }}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">Sedan</span>
            </div>
            <span className="text-gray-400 text-[11px]">(34)</span>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBodyTypes.includes('Hatchback')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedBodyTypes([...selectedBodyTypes, 'Hatchback']);
                  } else {
                    setSelectedBodyTypes(selectedBodyTypes.filter((b) => b !== 'Hatchback'));
                  }
                }}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">Hatchback</span>
            </div>
            <span className="text-gray-400 text-[11px]">(18)</span>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBodyTypes.includes('Pickup')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedBodyTypes([...selectedBodyTypes, 'Pickup']);
                  } else {
                    setSelectedBodyTypes(selectedBodyTypes.filter((b) => b !== 'Pickup'));
                  }
                }}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">Pickup</span>
            </div>
            <span className="text-gray-400 text-[11px]">(20)</span>
          </label>
        </div>
      </div>

      {/* Price Range */}
      <div className="py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-800">Price Range (₦)</label>
        </div>
        <input
          type="range"
          min="1000000"
          max="100000000"
          step="1000000"
          value={priceMax}
          onChange={(e) => setPriceMax(Number(e.target.value))}
          className="w-full accent-[#0a502c] cursor-pointer"
        />
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mt-1">
          <span>₦1,000,000</span>
          <span className="text-[#0a502c] font-bold">₦{priceMax.toLocaleString()}</span>
        </div>
      </div>

      {/* Year */}
      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Year</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={minYear}
            onChange={(e) => setMinYear(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700"
          >
            <option>Min Year</option>
            <option>2018</option>
            <option>2019</option>
            <option>2020</option>
            <option>2021</option>
            <option>2022</option>
          </select>
          <select
            value={maxYear}
            onChange={(e) => setMaxYear(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700"
          >
            <option>Max Year</option>
            <option>2022</option>
            <option>2023</option>
            <option>2024</option>
          </select>
        </div>
      </div>

      {/* Mileage */}
      <div className="pt-4">
        <label className="block text-xs font-bold text-gray-800 mb-2">Mileage</label>
        <select
          value={mileageLimit}
          onChange={(e) => setMileageLimit(e.target.value)}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden"
        >
          <option>Any Mileage</option>
          <option>Under 30,000 km</option>
          <option>Under 60,000 km</option>
          <option>Under 100,000 km</option>
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <button onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">
            Home
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900">Buy Cars</span>
        </nav>

        {/* Page Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Buy Cars</h1>
          <p className="text-sm text-gray-600 mt-1">
            Browse our wide selection of quality used cars at the best prices.
          </p>
        </div>

        {/* Search & Top Action Bar */}
        <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-4 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search make, model or keywords"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              {/* Mobile Filter Sheet Trigger */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-[#0a502c] rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</span>
              </button>

              {/* Free Car Specs & Image Search Button */}
              <button
                type="button"
                onClick={() => setFreeCarModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Search any car in the world using NHTSA and Wikimedia Free APIs"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Live Car &amp; Photo API</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSearch}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 border border-gray-300 hover:border-gray-400 rounded-lg text-xs font-semibold text-gray-700 bg-white shadow-xs transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 text-gray-500" />
                <span className="hidden sm:inline">Save Search</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('saved-compare')}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Scale className="w-4 h-4" />
                <span>Compare ({compareCount})</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {saveSearchToast && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Search criteria saved! We will alert you when matching vehicles arrive.
            </div>
          )}

          {/* Active Filter Badges Row */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Active Filters:</span>
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#0a502c] border border-emerald-200"
                >
                  {filter}
                  <button
                    onClick={() => removeFilter(filter)}
                    className="hover:text-red-500 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-emerald-800 hover:underline ml-2 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Results Header: Count & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="text-sm font-bold text-gray-900">
            <span>{sortedVehicles.length}</span>{' '}
            <span className="text-gray-500 font-normal">cars found in inventory</span>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold whitespace-nowrap">Sort by:</span>
              <CustomSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  'Newest First',
                  'Price: Low to High',
                  'Price: High to Low',
                  'Lowest Mileage',
                ]}
                className="w-40 sm:w-44"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center border border-gray-300 rounded-lg p-0.5 bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'grid' ? 'bg-gray-100 text-[#0a502c]' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'list' ? 'bg-gray-100 text-[#0a502c]' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: Left Filter Sidebar (Desktop) + Right Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Desktop Only */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              {renderFilterContent()}
            </div>
          </aside>

          {/* Right Inventory Grid */}
          <main className="lg:col-span-3">
            {isLoadingVehicles ? (
              <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-12 text-center text-sm text-gray-500">Loading live vehicle inventory…</div>
            ) : vehicleLoadError ? (
              <div className="bg-white rounded-2xl border shaba-surface border-amber-200 bg-amber-50 p-12 text-center space-y-3">
                <h3 className="text-base font-bold text-amber-900">Inventory unavailable</h3>
                <p className="text-xs text-amber-800">{vehicleLoadError}</p>
              </div>
            ) : sortedVehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-12 text-center space-y-4">
                <Search className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">No matching cars in live inventory</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  We could not find vehicles matching your specific filters in current Nigerian hub inventory. You can pull specs and live photos from our Global Vehicle API or place a direct US import order!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setFreeCarModalOpen(true)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Lookup in Global Database (Free API)
                  </button>
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {sortedVehicles.map((car) => {
                  const isSaved = Boolean(savedCarIds && savedCarIds.includes(car.id));
                  return (
                    <div
                      key={car.id}
                      className="bg-white rounded-xl border shaba-surface border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Image Area */}
                      <div className="relative h-44 bg-gray-100 overflow-hidden">
                        <img
                          src={car.images[0]}
                          alt={`${car.year} ${car.make} ${car.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => handleCarClick(car)}
                        />
                        {/* Verified Badge */}
                        {car.verified && (
                          <div className="absolute top-2.5 left-2.5 bg-[#0a502c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                        {/* Wishlist Heart */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSaveCar(car.id);
                          }}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-700 shadow-xs transition-colors cursor-pointer"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3
                            className="font-bold text-xs sm:text-sm text-gray-900 hover:text-[#0a502c] cursor-pointer line-clamp-1"
                            onClick={() => handleCarClick(car)}
                          >
                            {car.year} {car.make} {car.model}
                          </h3>

                          <div className="text-base font-extrabold text-[#0a502c] mt-1">
                            ₦{car.priceNgn.toLocaleString()}
                          </div>

                          {/* Quick Spec Line */}
                          <p className="text-[11px] text-gray-500 mt-2 font-medium">
                            {car.mileage.toLocaleString()} km • {car.transmission} • {car.fuelType}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                            <span className="flex items-center gap-1 text-gray-500 font-medium">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {car.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {car.listedTimeAgo}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => handleCarClick(car)}
                          className="w-full mt-3 py-2 bg-gray-100 hover:bg-[#0a502c] hover:text-white text-gray-800 text-xs font-bold rounded-lg transition-colors text-center cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
              <div className="flex items-center gap-1 text-xs">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center ${
                    currentPage === 1 ? 'bg-[#0a502c] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center ${
                    currentPage === 2 ? 'bg-[#0a502c] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setCurrentPage(3)}
                  className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center ${
                    currentPage === 3 ? 'bg-[#0a502c] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  3
                </button>
                <button
                  onClick={() => setCurrentPage(4)}
                  className="w-8 h-8 rounded-lg border border-gray-300 font-bold flex items-center justify-center text-gray-700 hover:bg-gray-100"
                >
                  4
                </button>
                <button
                  onClick={() => setCurrentPage(5)}
                  className="w-8 h-8 rounded-lg border border-gray-300 font-bold flex items-center justify-center text-gray-700 hover:bg-gray-100"
                >
                  5
                </button>
                <span className="px-1 text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(14)}
                  className="w-8 h-8 rounded-lg border border-gray-300 font-bold flex items-center justify-center text-gray-700 hover:bg-gray-100"
                >
                  14
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Show:</span>
                <select className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium text-gray-800">
                  <option>12 per page</option>
                  <option>24 per page</option>
                  <option>48 per page</option>
                </select>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom-Sheet Filter Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vehicle Filters"
            className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0a502c]" />
                <h3 className="font-bold text-sm text-gray-900">Filter Vehicles</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {renderFilterContent()}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-3 bg-[#0a502c] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Show {sortedVehicles.length} Vehicles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Car Specs & Genuine Photo Modal (Free API) */}
      <FreeCarSearchModal
        isOpen={freeCarModalOpen}
        onClose={() => setFreeCarModalOpen(false)}
        onNavigate={onNavigate}
        initialQuery={searchQuery}
      />
    </div>
  );
};
