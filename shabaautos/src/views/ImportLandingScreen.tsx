import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Headphones,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { ScreenId } from '../types';
import { CustomSelect } from '../components/CustomSelect';
import { calculateCustomsImport } from '../services/api';

const IMPORT_DRAFT_KEY = 'shabaautos-import-draft';

const MODEL_OPTIONS: Record<string, string[]> = {
  Toyota: ['RAV4', 'Camry', 'Highlander', 'Corolla'],
  Lexus: ['RX 350', 'ES 350', 'GX 460', 'NX 300'],
  'Mercedes-Benz': ['GLE 350', 'C-Class', 'E-Class', 'GLC 300'],
  Honda: ['CR-V', 'Accord', 'Pilot', 'Civic'],
  BMW: ['X5', 'X3', '3 Series', '5 Series'],
  Ford: ['Explorer', 'Escape', 'F-150', 'Mustang'],
};

const DESTINATION_PORTS: Record<string, string> = {
  Lagos: 'Tin Can Island Container Terminal, Lagos',
  Abuja: 'Tin Can Island Container Terminal, Lagos',
  'Port Harcourt': 'Onne Port, Rivers State',
};

type ImportDraft = {
  make?: string;
  model?: string;
  yearMin?: string;
  yearMax?: string;
  maxPrice?: string;
  vin?: string;
  auctionLink?: string;
  deliveryCity?: string;
  destinationPort?: string;
  originPort?: string;
  estimatedBudgetUsd?: number;
};

type Estimate = {
  auctionPriceUsd: number;
  oceanFreightUsd: number;
  inlandTowingUsd: number;
  cifValueUsd: number;
  cifValueNgn: number;
  usdToNgnRate: number;
  dutyRate: number;
  levyRate: number;
  importDutyNgn: number;
  nacLevyNgn: number;
  vatNgn: number;
  terminalChargesNgn: number;
  clearingAgencyFeeNgn: number;
  totalCustomsClearanceNgn: number;
  vehicleLandedCostNgn: number;
  estimatedTransitDays?: string;
  calculationVersion?: string;
  ratesSource?: string;
  assumptions?: {
    originPort?: string;
    electricVehicleRatesConfigured?: boolean;
    disclaimer?: string;
  };
  calculatedAt: string;
};

function saveImportDraft(draft: ImportDraft) {
  if (typeof window === 'undefined') return;
  try {
    const previous = JSON.parse(window.sessionStorage.getItem(IMPORT_DRAFT_KEY) || '{}');
    window.sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify({ ...previous, ...draft }));
  } catch {
    // Session storage is optional; navigation still works when it is unavailable.
  }
}

function parseBudget(value: string) {
  const match = value.replace(/,/g, '').match(/\$([0-9]+)/);
  return match ? Number(match[1]) : undefined;
}

export interface ImportLandingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ImportLandingScreen: React.FC<ImportLandingScreenProps> = ({ onNavigate }) => {
  const [activeSearchTab, setActiveSearchTab] = useState<'make' | 'vin' | 'link'>('make');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [maxPrice, setMaxPrice] = useState('$25,000');
  const [yearFrom, setYearFrom] = useState('2019');
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear()));
  const [vinInput, setVinInput] = useState('');
  const [auctionLink, setAuctionLink] = useState('');
  const [searchError, setSearchError] = useState('');

  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');
  const [estimatorPriceUsd, setEstimatorPriceUsd] = useState(15000);
  const [originPort, setOriginPort] = useState('Port of Newark, NJ, USA');
  const [destination, setDestination] = useState('Lagos');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(true);
  const [estimateError, setEstimateError] = useState('');

  const yearOptions = Array.from({ length: new Date().getFullYear() - 2017 }, (_, index) => String(2018 + index));
  const modelOptions = MODEL_OPTIONS[make] || [];

  useEffect(() => {
    let active = true;
    setEstimateLoading(true);
    setEstimateError('');
    calculateCustomsImport({
      auctionPriceUsd: estimatorPriceUsd,
      year: Number(yearTo),
      originPort,
      isElectric: false,
    })
      .then((response) => {
        if (!active) return;
        if (!response?.success || !response.data) {
          setEstimate(null);
          setEstimateError(response?.message || 'The server estimate is currently unavailable.');
          return;
        }
        setEstimate({ ...response.data, calculatedAt: new Date().toISOString() });
      })
      .catch(() => {
        if (!active) return;
        setEstimate(null);
        setEstimateError('The server estimate is currently unavailable.');
      })
      .finally(() => {
        if (active) setEstimateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [estimatorPriceUsd, originPort, yearTo]);

  const goToRequestForm = (overrides: ImportDraft = {}) => {
    saveImportDraft({
      make,
      model,
      yearMin: yearFrom,
      yearMax: yearTo,
      maxPrice,
      estimatedBudgetUsd: parseBudget(maxPrice),
      vin: vinInput.trim().toUpperCase() || undefined,
      auctionLink: auctionLink.trim() || undefined,
      deliveryCity: destination,
      destinationPort: DESTINATION_PORTS[destination],
      originPort,
      ...overrides,
    });
    onNavigate('import-form');
  };

  const validateSearch = () => {
    setSearchError('');
    if (activeSearchTab === 'make') {
      if (!make || !model) return 'Select both a make and model.';
      if (Number(yearFrom) > Number(yearTo)) return 'Year From must be earlier than or equal to Year To.';
    }
    if (activeSearchTab === 'vin' && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vinInput.trim().toUpperCase())) {
      return 'Enter a valid 17-character VIN (letters I, O and Q are not used).';
    }
    if (activeSearchTab === 'link') {
      try {
        const parsed = new URL(auctionLink.trim());
        if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      } catch {
        return 'Enter a complete auction URL beginning with http:// or https://.';
      }
    }
    return '';
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateSearch();
    if (error) {
      setSearchError(error);
      return;
    }
    goToRequestForm();
  };

  const formatUsd = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const formatNgn = (value: number) => `₦${Math.round(value).toLocaleString()}`;
  const displayMoney = (usd?: number, ngn?: number) => {
    if (!estimate) return '—';
    if (currency === 'USD' && usd !== undefined) return formatUsd(usd);
    if (currency === 'NGN' && ngn !== undefined) return formatNgn(ngn);
    if (currency === 'NGN' && usd !== undefined) return formatNgn(usd * estimate.usdToNgnRate);
    if (currency === 'USD' && ngn !== undefined) return formatUsd(ngn / estimate.usdToNgnRate);
    return '—';
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef3f0] to-[#f4f7f5] pt-6 sm:pt-14 lg:pt-16 pb-9 sm:pb-20 border-b border-slate-200/80">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=2000&q=85" alt="Port skyline" className="w-full h-full object-cover object-center mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4f7f5] via-[#f4f7f5]/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-10 items-start">
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e7c3a] mb-3">Import request intake</p>
                <h1 className="text-[2.1rem] sm:text-4xl lg:text-[46px] font-black text-slate-950 tracking-tight leading-[1.12]">
                  <span className="sm:hidden">Import from the US, <span className="text-[#0e7c3a]">step by step.</span></span>
                  <span className="hidden sm:inline">Bring a US vehicle <span className="text-[#0e7c3a]">to Nigeria</span> with clear next steps.</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 max-w-xl">
                  Share the vehicle details you have. We&apos;ll review the request and respond with the information needed for the next stage.
                </p>
                <button type="button" onClick={() => onNavigate('order-tracking')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline underline-offset-4 sm:text-sm">Already requested a car? Track it <ArrowRight className="h-4 w-4" /></button>
              </div>

              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {[
                  [ShieldCheck, 'Estimate context', 'Server-calculated rates'],
                  [FileCheck, 'Request details', 'Capture the right fields'],
                  [Truck, 'Route context', 'Destination recorded'],
                  [Headphones, 'Human review', 'Questions are welcome'],
                ].map(([Icon, title, description]) => {
                  const IconComponent = Icon as typeof ShieldCheck;
                  return (
                    <div key={title as string} className="bg-white/90 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                      <IconComponent className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                      <div><span className="text-xs font-bold text-slate-900 block leading-tight">{title as string}</span><span className="text-[10px] text-slate-500 block">{description as string}</span></div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-sm">
                <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-2 mb-4 border-b border-slate-100 pb-3">
                  {[
                    ['make', 'Search by Make & Model', 'Make / model'],
                    ['vin', 'Start with a VIN', 'VIN'],
                    ['link', 'Add an Auction Link', 'Listing link'],
                  ].map(([tab, label, shortLabel]) => (
                    <button key={tab} type="button" onClick={() => { setActiveSearchTab(tab as typeof activeSearchTab); setSearchError(''); }} className={`min-h-11 px-1.5 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${activeSearchTab === tab ? 'bg-[#12492f] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      <span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {activeSearchTab === 'make' && (
                  <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <CustomSelect label="Make" value={make} onChange={(value) => { setMake(value); setModel(''); }} options={Object.keys(MODEL_OPTIONS)} placeholder="Select make" />
                    <CustomSelect label="Model" value={model} onChange={setModel} options={modelOptions} placeholder={make ? 'Select model' : 'Select make first'} />
                    <CustomSelect label="Max Price (USD)" value={maxPrice} onChange={setMaxPrice} options={['$15,000', '$25,000', '$35,000', '$50,000', 'Any Budget']} />
                    <CustomSelect label="Year From" value={yearFrom} onChange={setYearFrom} options={yearOptions} />
                    <CustomSelect label="Year To" value={yearTo} onChange={setYearTo} options={yearOptions} />
                    <button type="submit" className="w-full bg-[#12492f] hover:bg-[#0b3622] text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer h-[42px] self-end"><Search className="w-4 h-4" />Save search and continue</button>
                  </form>
                )}

                {activeSearchTab === 'vin' && (
                  <form onSubmit={handleSearch} className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="import-vin">17-character VIN</label>
                    <input id="import-vin" type="text" value={vinInput} onChange={(event) => setVinInput(event.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="e.g. 2T3P1RFV3NC123456" maxLength={17} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20" />
                    <button type="submit" className="w-full py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"><Search className="w-4 h-4" />Continue with VIN</button>
                  </form>
                )}

                {activeSearchTab === 'link' && (
                  <form onSubmit={handleSearch} className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="auction-link">Auction or listing URL</label>
                    <input id="auction-link" type="url" value={auctionLink} onChange={(event) => setAuctionLink(event.target.value)} placeholder="https://www.copart.com/lot/..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20" />
                    <button type="submit" className="w-full py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"><ExternalLink className="w-4 h-4" />Continue with listing link</button>
                  </form>
                )}
                {searchError && <p role="alert" className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-800">{searchError}</p>}
                <p className="text-[11px] text-slate-500 mt-4">This starts a request; it does not claim live auction availability or verify a vehicle history.</p>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-md">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-[#0e7c3a]" /><h2 className="font-bold text-base text-slate-900">Customs import estimate</h2></div>
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                    {(['USD', 'NGN'] as const).map((value) => <button key={value} type="button" onClick={() => setCurrency(value)} className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${currency === value ? 'bg-white text-[#0e7c3a] shadow-2xs' : 'text-slate-500'}`}>{value}</button>)}
                  </div>
                </div>
                <div className="bg-emerald-50 text-[#0e7c3a] border border-emerald-100 rounded-xl p-3 my-4 text-xs font-medium">The amounts below come from the server calculator and are estimates, not a quote or final customs assessment.</div>
                <div className="space-y-4 mb-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5"><span>Vehicle price (USD)</span><span className="text-[#0e7c3a] font-extrabold">${estimatorPriceUsd.toLocaleString()}</span></div>
                    <input aria-label="Vehicle price in US dollars" type="range" min="5000" max="60000" step="500" value={estimatorPriceUsd} onChange={(event) => setEstimatorPriceUsd(Number(event.target.value))} className="w-full accent-[#0e7c3a] cursor-pointer" />
                  </div>
                  <label className="block text-xs font-bold text-slate-700">Origin port<select value={originPort} onChange={(event) => setOriginPort(event.target.value)} className="mt-1.5 w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"><option>Port of Newark, NJ, USA</option><option>Houston</option></select></label>
                  <label className="block text-xs font-bold text-slate-700">Destination city<select value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-1.5 w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"><option>Lagos</option><option>Abuja</option><option>Port Harcourt</option></select></label>

                  {estimateLoading ? <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-semibold text-slate-500">Updating server estimate…</div> : estimate ? <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/80">
                    <div className="flex justify-between text-slate-600 font-medium"><span>Vehicle price</span><span className="font-bold text-slate-900">{displayMoney(estimate.auctionPriceUsd)}</span></div>
                    <div className="flex justify-between text-slate-600 font-medium"><span>Ocean freight</span><span className="font-bold text-slate-900">{displayMoney(estimate.oceanFreightUsd)}</span></div>
                    <div className="flex justify-between text-slate-600 font-medium"><span>Inland towing</span><span className="font-bold text-slate-900">{displayMoney(estimate.inlandTowingUsd)}</span></div>
                    <div className="flex justify-between text-slate-600 font-medium"><span>Import duty ({estimate.dutyRate}%)</span><span className="font-bold text-slate-900">{displayMoney(undefined, estimate.importDutyNgn)}</span></div>
                    <div className="flex justify-between text-slate-600 font-medium"><span>Levy, VAT &amp; port/clearing</span><span className="font-bold text-slate-900">{displayMoney(undefined, estimate.nacLevyNgn + estimate.vatNgn + estimate.terminalChargesNgn + estimate.clearingAgencyFeeNgn)}</span></div>
                    <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-sm text-[#0e7c3a]"><span>Estimated landed cost</span><span>{displayMoney(undefined, estimate.vehicleLandedCostNgn)}</span></div>
                  </div> : <div role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs font-semibold text-amber-900">Estimate unavailable. No client-side fallback price is shown.</div>}
                </div>
                {estimateError && !estimateLoading && <p className="text-[11px] text-amber-800 mb-4">{estimateError}</p>}
                {estimate && <div className="text-[10px] text-slate-500 space-y-1 mb-4"><p>Source: {estimate.ratesSource || 'server settings'} · Version: {estimate.calculationVersion || 'server estimate'}</p><p>Calculated: {new Date(estimate.calculatedAt).toLocaleString()} · Destination is recorded for the request; this calculator does not model destination-specific charges.</p><p>{estimate.assumptions?.disclaimer}</p></div>}
                <button type="button" onClick={() => goToRequestForm({ deliveryCity: destination, destinationPort: DESTINATION_PORTS[destination] })} className="w-full py-3 bg-[#0a502c] hover:bg-[#07391f] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer">Start import request <ArrowRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10"><h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">A clear request path</h2><p className="text-xs sm:text-sm text-slate-500 mt-1">Keep the next step grounded in the information available today.</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            ['1', 'Share vehicle details', 'Choose a make and model, provide a VIN, or attach a listing link.'],
            ['2', 'Add your route', 'Tell us the Nigerian delivery city and preferred destination port.'],
            ['3', 'Submit one request', 'Your request is saved with a server reference after submission.'],
            ['4', 'Receive a response', 'A specialist can follow up with the information and decisions still needed.'],
          ].map(([step, title, description]) => <div key={step} className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center"><div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 text-[#0e7c3a] font-black text-sm flex items-center justify-center mb-2 sm:mb-3 border border-emerald-100">{step}</div><h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">{title}</h3><p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">{description}</p></div>)}
        </div>
      </section>

      <section className="bg-white py-14 border-t border-b border-slate-200"><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"><CheckCircle2 className="w-8 h-8 text-[#0e7c3a] mx-auto mb-3" /><h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Need help choosing a vehicle?</h2><p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto">Start an import request with the details you have. It is okay if a VIN or listing link is not available yet.</p><button type="button" onClick={() => goToRequestForm()} className="mt-5 px-5 py-2.5 bg-[#12492f] text-white hover:bg-[#0b3622] font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">Open request form</button></div></section>

      <section className="bg-[#12492f] text-white py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6"><div><h2 className="text-xl sm:text-2xl font-black">Have a specific vehicle in mind?</h2><p className="text-xs sm:text-sm text-emerald-100 mt-1">Send the details and a specialist can review the request.</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => goToRequestForm()} className="px-5 py-2.5 bg-white text-[#12492f] hover:bg-slate-100 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">Submit request</button><button type="button" onClick={() => onNavigate('order-tracking')} className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all border border-emerald-600/50 cursor-pointer">Track an existing request</button></div></div></section>
    </div>
  );
};
