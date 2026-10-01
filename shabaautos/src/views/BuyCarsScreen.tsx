import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  createSavedSearch,
  fetchVehicleFacets,
  fetchVehiclesWithPagination,
  VehicleFacets,
  VehicleSearchParams,
} from '../services/api';

interface BuyCarsScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectCar: (carId: string, car?: Car) => void;
  savedCarIds?: string[];
  onToggleSaveCar?: (carId: string) => void;
  compareCount?: number;
}

type UrlFilters = {
  make: string;
  model: string;
  bodyType: string;
  search: string;
  city: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'mileage-asc', label: 'Lowest Mileage' },
];

const parseNumber = (value: string | null) => {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return undefined;
  return Number(value);
};

const getInitialUrlFilters = (): UrlFilters => {
  if (typeof window === 'undefined') {
    return { make: 'All Makes', model: 'All Models', bodyType: '', search: '', city: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    make: params.get('make') || 'All Makes',
    model: params.get('model') || 'All Models',
    bodyType: params.get('bodyType') || '',
    search: params.get('search') || '',
    city: params.get('city') || '',
    minPrice: parseNumber(params.get('minPrice')),
    maxPrice: parseNumber(params.get('maxPrice')),
    minYear: parseNumber(params.get('minYear')),
    maxYear: parseNumber(params.get('maxYear')),
  };
};

const formatPrice = (value: number) => `₦${value.toLocaleString()}`;

export const BuyCarsScreen: React.FC<BuyCarsScreenProps> = ({
  onNavigate,
  onSelectCar,
  savedCarIds = [],
  onToggleSaveCar = (_carId: string) => {},
  compareCount = 3,
}) => {
  const [urlFilters] = useState(getInitialUrlFilters);
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [facets, setFacets] = useState<VehicleFacets | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleLoadError, setVehicleLoadError] = useState('');
  const [searchInput, setSearchInput] = useState(urlFilters.search);
  const [searchQuery, setSearchQuery] = useState(urlFilters.search);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedMake, setSelectedMake] = useState(urlFilters.make);
  const [selectedModel, setSelectedModel] = useState(urlFilters.model);
  const [selectedBodyType, setSelectedBodyType] = useState(urlFilters.bodyType);
  const [priceMin, setPriceMin] = useState<number | undefined>(urlFilters.minPrice);
  const [priceMax, setPriceMax] = useState<number | undefined>(urlFilters.maxPrice);
  const [minYear, setMinYear] = useState<number | undefined>(urlFilters.minYear);
  const [maxYear, setMaxYear] = useState<number | undefined>(urlFilters.maxYear);
  const [mileageLimit, setMileageLimit] = useState<number | undefined>();
  const [city, setCity] = useState(urlFilters.city);
  const [sortBy, setSortBy] = useState('newest');
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [freeCarModalOpen, setFreeCarModalOpen] = useState(false);
  const [saveSearchState, setSaveSearchState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveSearchMessage, setSaveSearchMessage] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    fetchVehicleFacets().then((data) => {
      if (active && data) setFacets(data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const requestParams = useMemo<VehicleSearchParams>(
    () => ({
      make: selectedMake !== 'All Makes' ? selectedMake : undefined,
      model: selectedModel !== 'All Models' ? selectedModel : undefined,
      bodyType: selectedBodyType || undefined,
      minPrice: priceMin,
      maxPrice: priceMax,
      minYear,
      maxYear,
      maxMileage: mileageLimit,
      city: city || undefined,
      search: searchQuery || undefined,
      sort: sortBy,
      page: currentPage,
      pageSize,
    }),
    [selectedMake, selectedModel, selectedBodyType, priceMin, priceMax, minYear, maxYear, mileageLimit, city, searchQuery, sortBy, currentPage, pageSize]
  );

  useEffect(() => {
    const activeRequest = ++requestId.current;
    setIsLoadingVehicles(true);
    setVehicleLoadError('');

    fetchVehiclesWithPagination(requestParams)
      .then((response) => {
        if (activeRequest !== requestId.current) return;
        if (!response.success) throw new Error('Live vehicle inventory is temporarily unavailable.');
        setVehicles(response.data);
        setPagination(response.pagination);
        setImageErrors([]);
        if (response.pagination.page !== currentPage) setCurrentPage(response.pagination.page);
      })
      .catch((error: unknown) => {
        if (activeRequest !== requestId.current) return;
        setVehicles([]);
        setPagination(null);
        setVehicleLoadError(error instanceof Error ? error.message : 'Live vehicle inventory is temporarily unavailable.');
      })
      .finally(() => {
        if (activeRequest === requestId.current) setIsLoadingVehicles(false);
      });
  }, [requestParams, retryToken, currentPage]);

  const priceBounds = facets?.priceBounds || { min: 0, max: 100000000 };
  const yearBounds = facets?.yearBounds || { min: new Date().getFullYear() - 15, max: new Date().getFullYear() };
  const mileageBounds = facets?.mileageBounds || { min: 0, max: 200000 };
  const yearOptions = useMemo(() => {
    const min = Math.max(1900, Math.floor(yearBounds.min));
    const max = Math.min(new Date().getFullYear() + 1, Math.ceil(yearBounds.max));
    return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => max - index);
  }, [yearBounds.min, yearBounds.max]);
  const mileageOptions = useMemo(
    () => [30000, 60000, 100000].filter((value) => value >= mileageBounds.min && value <= mileageBounds.max),
    [mileageBounds.min, mileageBounds.max]
  );

  const makeOptions = useMemo(() => {
    const values = facets?.makes || [];
    return selectedMake !== 'All Makes' && !values.includes(selectedMake) ? [selectedMake, ...values] : values;
  }, [facets?.makes, selectedMake]);
  const modelOptions = useMemo(() => {
    const values = facets?.models || [];
    return selectedModel !== 'All Models' && !values.includes(selectedModel) ? [selectedModel, ...values] : values;
  }, [facets?.models, selectedModel]);
  const bodyTypeOptions = facets?.bodyTypes || [];

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string }[] = [];
    if (selectedMake !== 'All Makes') filters.push({ key: 'make', label: selectedMake });
    if (selectedModel !== 'All Models') filters.push({ key: 'model', label: selectedModel });
    if (selectedBodyType) filters.push({ key: 'bodyType', label: selectedBodyType });
    if (minYear !== undefined) filters.push({ key: 'minYear', label: `From ${minYear}` });
    if (maxYear !== undefined) filters.push({ key: 'maxYear', label: `To ${maxYear}` });
    if (mileageLimit !== undefined) filters.push({ key: 'maxMileage', label: `Under ${mileageLimit.toLocaleString()} ${'km'}` });
    if (priceMin !== undefined) filters.push({ key: 'minPrice', label: `From ${formatPrice(priceMin)}` });
    if (priceMax !== undefined) filters.push({ key: 'maxPrice', label: `Up to ${formatPrice(priceMax)}` });
    if (searchQuery) filters.push({ key: 'search', label: `Search: ${searchQuery}` });
    if (city) filters.push({ key: 'city', label: city });
    return filters;
  }, [selectedMake, selectedModel, selectedBodyType, minYear, maxYear, mileageLimit, priceMin, priceMax, searchQuery, city]);

  const clearAllFilters = () => {
    setSelectedMake('All Makes');
    setSelectedModel('All Models');
    setSelectedBodyType('');
    setPriceMin(undefined);
    setPriceMax(undefined);
    setMinYear(undefined);
    setMaxYear(undefined);
    setMileageLimit(undefined);
    setCity('');
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const removeFilter = (filter: string) => {
    if (filter === 'make') setSelectedMake('All Makes');
    if (filter === 'model') setSelectedModel('All Models');
    if (filter === 'bodyType') setSelectedBodyType('');
    if (filter === 'minYear') setMinYear(undefined);
    if (filter === 'maxYear') setMaxYear(undefined);
    if (filter === 'maxMileage') setMileageLimit(undefined);
    if (filter === 'minPrice') setPriceMin(undefined);
    if (filter === 'maxPrice') setPriceMax(undefined);
    if (filter === 'search') {
      setSearchInput('');
      setSearchQuery('');
    }
    if (filter === 'city') setCity('');
    setCurrentPage(1);
  };

  const criteria = useMemo(
    () => ({
      make: selectedMake !== 'All Makes' ? selectedMake : undefined,
      model: selectedModel !== 'All Models' ? selectedModel : undefined,
      bodyType: selectedBodyType || undefined,
      minPrice: priceMin,
      maxPrice: priceMax,
      minYear,
      maxYear,
      maxMileage: mileageLimit,
      city: city || undefined,
      search: searchQuery || undefined,
      sort: sortBy,
    }),
    [selectedMake, selectedModel, selectedBodyType, priceMin, priceMax, minYear, maxYear, mileageLimit, city, searchQuery, sortBy]
  );

  const handleSaveSearch = async () => {
    setSaveSearchState('saving');
    setSaveSearchMessage('');
    const response = await createSavedSearch('Buy cars search', criteria, false, false);
    if (response?.success) {
      setSaveSearchState('saved');
      setSaveSearchMessage('Search saved to your account.');
    } else {
      const serverMessage = String(response?.message || '').toLowerCase();
      setSaveSearchState('error');
      setSaveSearchMessage(
        serverMessage.includes('auth') || serverMessage.includes('sign in') || serverMessage.includes('unauthorized')
          ? 'Please sign in to save searches, then try again.'
          : response?.message || 'We could not save this search. Please try again.'
      );
    }
  };

  const handleCarClick = (car: Car) => {
    onSelectCar(car.id, car);
  };

  const handleImageError = (carId: string) => {
    setImageErrors((current) => (current.includes(carId) ? current : [...current, carId]));
  };

  const renderFilterContent = () => (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h3 className="font-bold text-sm text-gray-900">Filters</h3>
        <button type="button" onClick={clearAllFilters} className="text-xs font-semibold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Make</label>
        <select value={selectedMake} onChange={(event) => { setSelectedMake(event.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500">
          <option>All Makes</option>
          {makeOptions.map((make) => <option key={make} value={make}>{make}</option>)}
        </select>
      </div>

      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Model</label>
        <select value={selectedModel} onChange={(event) => { setSelectedModel(event.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500">
          <option>All Models</option>
          {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
        </select>
      </div>

      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Body Type</label>
        <select value={selectedBodyType} onChange={(event) => { setSelectedBodyType(event.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500">
          <option value="">All Body Types</option>
          {bodyTypeOptions.map((bodyType) => <option key={bodyType} value={bodyType}>{bodyType}</option>)}
        </select>
      </div>

      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Price Range (₦)</label>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={priceBounds.min} max={priceBounds.max} value={priceMin ?? ''} placeholder={priceBounds.min.toLocaleString()} onChange={(event) => { setPriceMin(event.target.value ? Number(event.target.value) : undefined); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700" aria-label="Minimum price" />
          <input type="number" min={priceBounds.min} max={priceBounds.max} value={priceMax ?? ''} placeholder={priceBounds.max.toLocaleString()} onChange={(event) => { setPriceMax(event.target.value ? Number(event.target.value) : undefined); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700" aria-label="Maximum price" />
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1"><span>{formatPrice(priceBounds.min)}</span><span>{formatPrice(priceBounds.max)}</span></div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <label className="block text-xs font-bold text-gray-800 mb-2">Year</label>
        <div className="grid grid-cols-2 gap-2">
          <select value={minYear ?? ''} onChange={(event) => { setMinYear(event.target.value ? Number(event.target.value) : undefined); setCurrentPage(1); }} className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700"><option value="">Min Year</option>{yearOptions.map((year) => <option key={`min-${year}`} value={year}>{year}</option>)}</select>
          <select value={maxYear ?? ''} onChange={(event) => { setMaxYear(event.target.value ? Number(event.target.value) : undefined); setCurrentPage(1); }} className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700"><option value="">Max Year</option>{yearOptions.map((year) => <option key={`max-${year}`} value={year}>{year}</option>)}</select>
        </div>
      </div>

      <div className="pt-4">
        <label className="block text-xs font-bold text-gray-800 mb-2">Mileage</label>
        <select value={mileageLimit ?? ''} onChange={(event) => { setMileageLimit(event.target.value ? Number(event.target.value) : undefined); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden">
          <option value="">Any Mileage</option>
          {mileageOptions.map((mileage) => <option key={mileage} value={mileage}>Under {mileage.toLocaleString()} km</option>)}
        </select>
      </div>
    </>
  );

  const totalPages = pagination?.totalPages || 0;
  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4"><button onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">Home</button><span>&gt;</span><span className="font-semibold text-gray-900">Buy Cars</span></nav>
        <div className="mb-6"><h1 className="text-3xl font-black text-gray-900 tracking-tight">Buy Cars</h1><p className="text-sm text-gray-600 mt-1">Browse our wide selection of quality used cars at the best prices.</p></div>

        <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-4 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search make, model or keywords" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" /></div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <button type="button" onClick={() => setMobileFiltersOpen(true)} className="lg:hidden flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-[#0a502c] rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"><SlidersHorizontal className="w-4 h-4" /><span>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</span></button>
              <button type="button" onClick={() => setFreeCarModalOpen(true)} className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer" title="Search any car in the world using NHTSA and Wikimedia Free APIs"><Sparkles className="w-4 h-4 text-emerald-200" /><span>Live Car &amp; Photo API</span></button>
              <button type="button" onClick={handleSaveSearch} disabled={saveSearchState === 'saving'} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 border border-gray-300 hover:border-gray-400 rounded-lg text-xs font-semibold text-gray-700 bg-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"><Heart className="w-4 h-4 text-gray-500" /><span className="hidden sm:inline">{saveSearchState === 'saving' ? 'Saving…' : 'Save Search'}</span></button>
              <button type="button" onClick={() => onNavigate('saved-compare')} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"><Scale className="w-4 h-4" /><span>Compare ({compareCount})</span></button>
            </div>
          </div>
          {saveSearchState !== 'idle' && saveSearchMessage && <div className={`mt-3 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${saveSearchState === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>{saveSearchState === 'saved' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : null}{saveSearchMessage}</div>}
          {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100"><span className="text-xs font-semibold text-gray-500">Active Filters:</span>{activeFilters.map((filter) => <span key={filter.key} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#0a502c] border border-emerald-200">{filter.label}<button onClick={() => removeFilter(filter.key)} className="hover:text-red-500 ml-0.5 cursor-pointer" aria-label={`Remove ${filter.label}`}><X className="w-3 h-3" /></button></span>)}<button onClick={clearAllFilters} className="text-xs font-semibold text-emerald-800 hover:underline ml-2 cursor-pointer">Clear All</button></div>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="text-sm font-bold text-gray-900"><span>{pagination?.total ?? 0}</span> <span className="text-gray-500 font-normal">matching cars in inventory</span></div>
          <div className="flex items-center justify-between sm:justify-start gap-4"><div className="flex items-center gap-2 text-xs text-gray-600"><span className="font-semibold whitespace-nowrap">Sort by:</span><CustomSelect value={sortBy} onChange={(value) => { setSortBy(value); setCurrentPage(1); }} options={SORT_OPTIONS} className="w-40 sm:w-44" /></div><div className="hidden sm:flex items-center border border-gray-300 rounded-lg p-0.5 bg-white"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-gray-100 text-[#0a502c]' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View"><LayoutGrid className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-100 text-[#0a502c]' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><List className="w-4 h-4" /></button></div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="hidden lg:block lg:col-span-1"><div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">{renderFilterContent()}</div></aside>
          <main className="lg:col-span-3">
            {isLoadingVehicles ? <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-12 text-center text-sm text-gray-500">Loading live vehicle inventory…</div> : vehicleLoadError ? <div className="bg-white rounded-2xl border shaba-surface border-amber-200 bg-amber-50 p-12 text-center space-y-3"><h3 className="text-base font-bold text-amber-900">Inventory unavailable</h3><p className="text-xs text-amber-800">{vehicleLoadError}</p><button type="button" onClick={() => setRetryToken((value) => value + 1)} className="px-4 py-2 bg-[#0a502c] text-white rounded-lg text-xs font-bold cursor-pointer">Try again</button></div> : vehicles.length === 0 ? <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-12 text-center space-y-4"><Search className="w-12 h-12 text-gray-300 mx-auto" /><h3 className="text-base font-bold text-gray-900">No matching cars in live inventory</h3><p className="text-xs text-gray-500 max-w-md mx-auto">We could not find vehicles matching your filters in current Nigerian hub inventory.</p><button onClick={clearAllFilters} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer">Reset Filters</button></div> : <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}>{vehicles.map((car) => {
              const isSaved = savedCarIds.includes(car.id);
              const hasImage = Boolean(car.images?.[0]) && !imageErrors.includes(car.id);
              return <div key={car.id} className={`bg-white rounded-xl border shaba-surface border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all group ${viewMode === 'list' ? 'sm:flex' : 'flex flex-col'}`}>
                <div className={`relative bg-gray-100 overflow-hidden ${viewMode === 'list' ? 'sm:w-64 h-44 shrink-0' : 'h-44'}`}>
                  {hasImage ? <img src={car.images[0]} alt={`${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer" onError={() => handleImageError(car.id)} onClick={() => handleCarClick(car)} /> : <button type="button" onClick={() => handleCarClick(car)} className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-xs cursor-pointer"><span className="text-2xl">—</span><span>Photo coming soon</span></button>}
                  {car.verified && <div className="absolute top-2.5 left-2.5 bg-[#0a502c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"><ShieldCheck className="w-3 h-3" />Verified</div>}
                  <button onClick={(event) => { event.stopPropagation(); onToggleSaveCar(car.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-700 shadow-xs transition-colors cursor-pointer" aria-label={isSaved ? 'Remove from saved cars' : 'Save car'}><Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} /></button>
                </div>
                <div className="p-3.5 flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-xs sm:text-sm text-gray-900 hover:text-[#0a502c] cursor-pointer line-clamp-1" onClick={() => handleCarClick(car)}>{car.year} {car.make} {car.model}</h3><div className="text-base font-extrabold text-[#0a502c] mt-1">{formatPrice(car.priceNgn)}</div><p className="text-[11px] text-gray-500 mt-2 font-medium">{car.mileage.toLocaleString()} {car.mileageUnit || 'unit not provided'} • {car.transmission} • {car.fuelType}</p><div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100"><span className="flex items-center gap-1 text-gray-500 font-medium"><MapPin className="w-3 h-3 text-gray-400" />{car.location}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{car.listedTimeAgo}</span></div></div><button onClick={() => handleCarClick(car)} className="w-full mt-3 py-2 bg-gray-100 hover:bg-[#0a502c] hover:text-white text-gray-800 text-xs font-bold rounded-lg transition-colors text-center cursor-pointer">View Details</button></div>
              </div>;
            })}</div>}

            {pagination && <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">{totalPages > 1 && <div className="flex items-center gap-1 text-xs"><button disabled={!pagination.hasPrevPage} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><div className="flex items-center gap-1">{Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1).map((page, index, pages) => <React.Fragment key={page}>{index > 0 && pages[index - 1] !== page - 1 && <span className="px-1 text-gray-400">…</span>}<button onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center ${currentPage === page ? 'bg-[#0a502c] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>{page}</button></React.Fragment>)}</div><button disabled={!pagination.hasNextPage} onClick={() => setCurrentPage((page) => page + 1)} className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div>}<div className="flex items-center gap-2 text-xs text-gray-600"><span>Show:</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium text-gray-800"><option value={12}>12 per page</option><option value={24}>24 per page</option><option value={48}>48 per page</option></select></div></div>}
          </main>
        </div>
      </div>

      {mobileFiltersOpen && <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end"><div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileFiltersOpen(false)} aria-hidden="true" /><div role="dialog" aria-modal="true" aria-label="Vehicle Filters" className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"><div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" /><div className="p-4 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#0a502c]" /><h3 className="font-bold text-sm text-gray-900">Filter Vehicles</h3></div><button type="button" onClick={() => setMobileFiltersOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"><X className="w-4 h-4" /></button></div><div className="p-5 overflow-y-auto space-y-4 flex-1">{renderFilterContent()}</div><div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3"><button type="button" onClick={clearAllFilters} className="px-4 py-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white cursor-pointer">Reset</button><button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex-1 py-3 bg-[#0a502c] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer">Show {pagination?.total ?? 0} Vehicles</button></div></div></div>}

      <FreeCarSearchModal isOpen={freeCarModalOpen} onClose={() => setFreeCarModalOpen(false)} onNavigate={onNavigate} initialQuery={searchInput} />
    </div>
  );
};
