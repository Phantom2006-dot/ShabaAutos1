import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Ship,
  Car as CarIcon,
  Fuel,
  Gauge,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { lookupCarWithImage, ExternalCarLookupResult, fetchManufacturerModels } from '../services/api';
import { ScreenId } from '../types';

interface FreeCarSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  initialQuery?: string;
}

export const FreeCarSearchModal: React.FC<FreeCarSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExternalCarLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popularSearches] = useState([
    'Toyota RAV4',
    'Lexus RX 350',
    'Mercedes-Benz GLE 450',
    'Toyota Camry',
    'Toyota Prado',
    'Honda Accord',
    'BMW X5',
    'Toyota Hilux',
    'Ford Explorer',
    'Hyundai Tucson',
  ]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery, isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const data = await lookupCarWithImage(q);
      if (data) {
        setResult(data);
      } else {
        setError('No vehicle data found for that query. Please try another make or model.');
      }
    } catch (err: any) {
      setError('Failed to pull vehicle data from external API. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportThis = () => {
    onClose();
    onNavigate('import-form');
  };

  const handleFindThis = () => {
    onClose();
    onNavigate('find-car');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#12492f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-tight">
                Live Car Database &amp; Image Lookup
              </h2>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                Free Vehicle Specs &amp; Genuine Photos from NHTSA &amp; Wikimedia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type ANY vehicle (e.g., Toyota Camry, Lexus RX 350, Mercedes GLE)..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#12492f]/20 focus:border-[#12492f]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-[#12492f] hover:bg-[#0b3622] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Pull Specs &amp; Image</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Popular Pills */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Popular:</span>
            {popularSearches.map((carName) => (
              <button
                key={carName}
                type="button"
                onClick={() => {
                  setQuery(carName);
                  handleSearch(carName);
                }}
                className="text-[11px] font-medium bg-white hover:bg-emerald-50 hover:text-[#12492f] hover:border-emerald-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
              >
                {carName}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#12492f] animate-spin" />
              <p className="text-sm font-bold text-slate-800">
                Fetching vehicle metadata and live image...
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Querying the NHTSA vehicle specifications catalog and pulling high-resolution media from Wikimedia Commons.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Lookup Notice</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CarIcon className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">Search Any Car in the World</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Type any manufacturer and model above or click a suggestion pill to retrieve genuine vehicle technical specs and automotive photography from our free API engine.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Vehicle Title & Verified Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{result.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Live Verified
                    </span>
                    <span className="text-xs text-slate-500">
                      Market Estimate: <strong className="text-slate-800">{result.specs.estimatedNigeriaPriceNgn}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  {result.verifiedSource}
                </div>
              </div>

              {/* Large Image Pulled Directly from Free API */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video max-h-[300px]">
                <img
                  src={result.imageUrl}
                  alt={result.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-1 rounded-md">
                  Wikimedia Commons Media
                </div>
              </div>

              {/* Summary Description */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed">
                {result.description}
              </div>

              {/* Technical Specifications Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Engine</span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{result.specs.engine}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Transmission</span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{result.specs.transmission}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Drivetrain</span>
                    <span className="text-xs font-bold text-slate-800">{result.specs.drivetrain}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fuel Type</span>
                    <span className="text-xs font-bold text-slate-800">{result.specs.fuelType}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for this vehicle */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleImportThis}
                  className="w-full sm:w-1/2 py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Ship className="w-4 h-4" />
                  Import This Car from USA
                </button>
                <button
                  type="button"
                  onClick={handleFindThis}
                  className="w-full sm:w-1/2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#12492f] border border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Find Me This Car in Nigeria
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
