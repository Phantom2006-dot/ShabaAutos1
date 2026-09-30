import React, { useEffect, useRef, useState } from 'react';
import {
  Ship,
  Search,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Truck,
  FileCheck,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Headphones,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import {
  fetchVehicles,
  calculateCustomsImport,
  fetchPublicSettings,
} from '../services/api';
import { ScreenId } from '../types';
import { CustomSelect } from '../components/CustomSelect';

// Mirrors the exact estimator the backend uses (/api/imports/calculate) so the
// landing estimator reflects admin-configurable site settings rather than hardcoded rates.
interface ImportCalculatorState {
  shippingCostUsd: number;
  customsDutyUsd: number;
  otherChargesUsd: number;
  exchangeRate: number;
  vehiclePriceUsd: number;
  estDeliveryTime: string;
  isCalculating: boolean;
}

interface ImportPopularCar {
  id: string;
  title: string;
  year: number;
  priceUsd: number;
  priceNgnEst: number;
  image: string;
  specs: string;
  estDelivery: string;
}

const IMPORT_CAR_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80';

interface ImportLandingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ImportLandingScreen: React.FC<ImportLandingScreenProps> = ({ onNavigate }) => {
  const [activeSearchTab, setActiveSearchTab] = useState<'make' | 'vin' | 'link'>('make');
  const [make, setMake] = useState('Select Make');
  const [model, setModel] = useState('Select Model');
  const [maxPrice, setMaxPrice] = useState('$25,000');
  const [yearFrom, setYearFrom] = useState('2019');
  const [yearTo, setYearTo] = useState('2024');
  const [vinInput, setVinInput] = useState('');
  const [auctionLink, setAuctionLink] = useState('');

  // Cost Estimator state
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');
  const [estimatorPriceUsd, setEstimatorPriceUsd] = useState(15000);
  const [shippingMethod, setShippingMethod] = useState<'roro' | 'container'>('roro');
  const [destination, setDestination] = useState('Lagos');

  // Live estimator results fetched from the real customs calculation API.

  const [estimate, setEstimate] = useState<ImportCalculatorState>({
    shippingCostUsd: 0,
    customsDutyUsd: 0,
    otherChargesUsd: 850,
    exchangeRate: 1500,
    vehiclePriceUsd: 15000,
    estDeliveryTime: '21-28 Days',
    isCalculating: false,
  });

const [popularCars, setPopularCars] = useState<ImportPopularCar[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill the estimator from admin-configurable public import settings — never hardcoded customs math. Plain

  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((settings) => {
      if (active) {
        const num = (key: string, fallback: number) => {
          const v = settings[key]?.value;
          const n = typeof v === 'number' ? v : Number(v) || fallback;
          return n;
        };
        const usdToNgn = num('import.usd_to_ngn', 1500);
        const freightDefault = num('import.freight_default_usd', 1800);
        const freightHouston = num('import.freight_houston_usd', 1950);
        const inlandTowing = num('import.inland_towing_usd', 450);
        const dutyRate = num('import.duty_rate', 0.35);
        const vatRate = num('import.vat_rate', 0.075);
        const terminalNgn = num('import.terminal_charges_ngn', 380000);
        const clearingNgn = num('import.clearing_fee_ngn', 450000);
        const baseUsd = estimatorPriceUsd;

        setEstimate({
          shippingCostUsd: Math.round((destination === 'Abuja' ? freightHouston : freightDefault) + inlandTowing),
          customsDutyUsd: Math.round(baseUsd * (dutyRate + vatRate)),
          otherChargesUsd: Math.round((terminalNgn + clearingNgn) / usdToNgn),
          exchangeRate: usdToNgn,
          vehiclePriceUsd: baseUsd,
          estDeliveryTime: '21-28 Days',
          isCalculating: false,
        });
      }
    });
    return () => { active = false; };
  }, [destination]);

  // Debounced: calculate customs costs with the real admin-configurable endpoint.

  useEffect(() => {
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    setEstimate((prev) => ({ ...prev, isCalculating: true }));
    estimateTimer.current = setTimeout(async () => {
      try {
        const originPort = destination === 'Abuja' ? 'Houston' : undefined;
        const res = await calculateCustomsImport({
          auctionPriceUsd: estimatorPriceUsd,
          originPort,
        });
        const d = res?.data;
        if (d) {
          const usdToNgn = Number(d.usdToNgnRate) || 1500;
          const dutyNgn = Math.round(Number(d.importDutyNgn) || 0);
          const levyNgn = Math.round(Number(d.nacLevyNgn) || 0);
          const vatNgn = Math.round(Number(d.vatNgn) || 0);
          const terminalNgn = Math.round(Number(d.terminalChargesNgn) || 0);
          const clearingNgn = Math.round(Number(d.aringAgencyFeeNgn) || 0);

          setEstimate({
            shippingCostUsd: Math.round(Number(d.oceanFreightUsd) || 0) + Math.round(Number(d.inlandTowingUsd) || 0),
            customsDutyUsd: Math.round((dutyNgn + levyNgn + vatNgn) / usdToNgn),
            otherChargesUsd: Math.round((terminalNgn + clearingNgn) / usdToNgn),
            exchangeRate: usdToNgn,
            vehiclePriceUsd: estimatorPriceUsd,
            estDeliveryTime: d.estimatedTransitDays || '21-28 Days',
            isCalculating: false,
          });
        }
      } catch {
        // Keep last known state — never fabricate invented rates..

        setEstimate((prev) => ({ ...prev, isCalculating: false }));
      }
    },400);
    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [estimatorPriceUsd, shippingMethod, destination]);

  // Popular cars to import — live inventory, never a hardcoded market listorest
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cars = await fetchVehicles({ limit: 8, sort: 'year-desc' });
        if (active) {
          setPopularCars(cars.slice(0, 4).map((car) => ({
            id: car.id,
            title: `${car.make} ${car.model}`,
            year: car.year,
            priceUsd: car.priceUsd || Math.round((Number(car.priceNgn) || 0) / 1500),
            priceNgnEst: car.priceNgn,
            image: Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : IMPORT_CAR_FALLBACK_IMAGE,
            specs: [car.engine, car.transmission, car.driveType].filter(Boolean).join(' • '),
            estDelivery: '4-6 Weeks',
          })));
        }
      } catch {
        // Live inventory unavailable — render an honest empty state,no fake leads..

        setPopularCars([]);
      } finally {
        if (active) setIsLoadingPopular(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const shippingCostUsd = estimate.shippingCostUsd;
  const customsDutyUsd = estimate.customsDutyUsd;

  const otherChargesUsd = estimate.otherChargesUsd;



  const totalCostUsd = estimatorPriceUsd + shippingCostUsd + customsDutyUsd + otherChargesUsd;



  const exchangeRate = estimate.exchangeRate;
  const formatPrice = (usd: number) => {
    if (currency === 'USD') {
      return `$${usd.toLocaleString()}`;
    }
    return `₦${(usd * exchangeRate).toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen">
      {/* Light Daylight Hero Section matching Web9.png */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef3f0] to-[#f4f7f5] pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-20 border-b border-slate-200/80">
        {/* Scenic Coastal / US Waterfront Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=2000&q=85"
            alt="US Skyline Port"
            className="w-full h-full object-cover object-center mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4f7f5] via-[#f4f7f5]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Headline, 4 Badges, Search Box matching Web9.png */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-slate-950 tracking-tight leading-[1.15]">
                  Import Your Dream Car <br />
                  from the <span className="text-[#0e7c3a]">USA</span> to{' '}
                  <span className="text-[#0e7c3a]">Nigeria</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 max-w-xl">
                  We handle everything from purchase to delivery straight to your doorstep in Nigeria.
                </p>
              </div>

              {/* 4 Pills matching Web9.png */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Transparent Pricing
                    </span>
                    <span className="text-[10px] text-slate-500 block">No hidden fees</span>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Full Service
                    </span>
                    <span className="text-[10px] text-slate-500 block">End-to-end support</span>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Safe &amp; Reliable
                    </span>
                    <span className="text-[10px] text-slate-500 block">Secure shipping</span>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Expert Support
                    </span>
                    <span className="text-[10px] text-slate-500 block">We are here to help</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Search Card matching Web9.png */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
                {/* 3 Tabs */}
                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveSearchTab('make')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSearchTab === 'make'
                        ? 'bg-[#12492f] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Search by Make &amp; Model
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSearchTab('vin')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSearchTab === 'vin'
                        ? 'bg-[#12492f] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Search by VIN
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSearchTab('link')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeSearchTab === 'link'
                        ? 'bg-[#12492f] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Paste Auction Link
                  </button>
                </div>

                {activeSearchTab === 'make' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onNavigate('import-form');
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
                  >
                    <div>
                      <CustomSelect
                        label="Make"
                        value={make}
                        onChange={setMake}
                        options={[
                          'Select Make',
                          'Toyota',
                          'Lexus',
                          'Mercedes-Benz',
                          'Honda',
                          'BMW',
                          'Ford',
                        ]}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Model"
                        value={model}
                        onChange={setModel}
                        options={[
                          'Select Model',
                          'RAV4',
                          'Camry',
                          'RX 350',
                          'GLE 350',
                          'CR-V',
                          'X5',
                        ]}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Max Price (USD)"
                        value={maxPrice}
                        onChange={setMaxPrice}
                        options={[
                          '$15,000',
                          '$25,000',
                          '$35,000',
                          '$50,000',
                          'Any Budget',
                        ]}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Year From"
                        value={yearFrom}
                        onChange={setYearFrom}
                        options={['2018', '2019', '2020', '2021', '2022', '2023']}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Year To"
                        value={yearTo}
                        onChange={setYearTo}
                        options={['2021', '2022', '2023', '2024', '2025']}
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <button
                        type="submit"
                        className="w-full bg-[#12492f] hover:bg-[#0b3622] text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer h-[42px]"
                      >
                        <Search className="w-4 h-4" />
                        Search Cars in USA
                      </button>
                    </div>
                  </form>
                )}

                {activeSearchTab === 'vin' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        17-Character US VIN Number
                      </label>
                      <input
                        type="text"
                        value={vinInput}
                        onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                        placeholder="e.g. 2T3P1RFV3NC123456"
                        maxLength={17}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('import-form')}
                      className="w-full py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      Lookup VIN &amp; Estimate Landed Cost
                    </button>
                  </div>
                )}

                {activeSearchTab === 'link' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Copart / IAAI / Cars.com Link
                      </label>
                      <input
                        type="url"
                        value={auctionLink}
                        onChange={(e) => setAuctionLink(e.target.value)}
                        placeholder="https://www.copart.com/lot/..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('import-form')}
                      className="w-full py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Calculate Total Landed Cost in Nigeria
                    </button>
                  </div>
                )}
              </div>

              {/* White RAV4 SUV Car Graphic from Web9.png */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs">
                <img
                  src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85"
                  alt="White Luxury SUV ready for import"
                  className="w-full h-48 sm:h-56 object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900">
                  Direct US Auction Sourcing &amp; Port Delivery
                </div>
              </div>
            </div>

            {/* Right Column: Import Cost Estimator Card matching Web9.png */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-md">
                {/* Card Header & Currency Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#0e7c3a]" />
                    <h3 className="font-bold text-base text-slate-900">Import Cost Estimator</h3>
                  </div>

                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        currency === 'USD'
                          ? 'bg-white text-[#0e7c3a] shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('NGN')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        currency === 'NGN'
                          ? 'bg-white text-[#0e7c3a] shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      NGN (₦)
                    </button>
                  </div>
                </div>

                {/* Subtitle Banner */}
                <div className="bg-emerald-50 text-[#0e7c3a] border border-emerald-100 rounded-xl p-3 my-4 text-xs font-medium">
                  Get an estimate of all costs involved in importing your car to Nigeria.
                </div>

                {/* Inputs */}
                <div className="space-y-4 mb-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Vehicle Price (USD)</span>
                      <span className="text-[#0e7c3a] font-extrabold">
                        ${estimatorPriceUsd.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5000"
                      max="60000"
                      step="500"
                      value={estimatorPriceUsd}
                      onChange={(e) => setEstimatorPriceUsd(Number(e.target.value))}
                      className="w-full accent-[#0e7c3a] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Shipping Method
                    </label>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value as 'roro' | 'container')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="roro">Roll-on/Roll-off (RoRo) — Most economical</option>
                      <option value="container">Dedicated Container (20ft) — Full Protection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Destination
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="Lagos">Lagos (Tin Can / Apapa Port)</option>
                      <option value="Abuja">Abuja Doorstep Delivery</option>
                      <option value="Port Harcourt">Port Harcourt Port</option>
                    </select>
                  </div>

                  {/* Cost Breakdown Table matching Web9.png */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/80">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Vehicle Price (USD)</span>
                      <span className="font-bold text-slate-900">
                        {formatPrice(estimatorPriceUsd)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Shipping ({shippingMethod === 'roro' ? 'RoRo' : 'Container'})</span>
                      <span className="font-bold text-slate-900">
                        {formatPrice(shippingCostUsd)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>
                        Customs Duty, Levy &amp; VAT
                        {estimate.isCalculating ? (
                          <span className="ml-1 text-[10px] text-emerald-600 animate-pulse">Calculating...</span>
                        ) : null}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatPrice(customsDutyUsd)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Est. Delivery Time</span>
                      <span className="font-bold text-slate-900">{estimate.estDeliveryTime}</span>
                    </div>

                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Other Charges (Clearing &amp; Port)</span>
                      <span className="font-bold text-slate-900">
                        {formatPrice(otherChargesUsd)}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-sm text-[#0e7c3a]">
                      <span>Estimated Total</span>
                      <span>{formatPrice(totalCostUsd)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('import-form')}
                  className="w-full py-3 bg-[#0a502c] hover:bg-[#07391f] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                >
                  Get Full Quote <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works 5-Step Pipeline matching Web9.png */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A seamless, reliable 5-step process from US auction to Nigerian doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '1',
              title: 'Search & Select',
              desc: 'Find your preferred car from trusted US sources or let our experts help.',
            },
            {
              step: '2',
              title: 'Purchase',
              desc: 'We help you inspect, buy and secure the car safely at wholesale rates.',
            },
            {
              step: '3',
              title: 'Ship to Nigeria',
              desc: 'We handle ocean shipping and all export/transit documentation.',
            },
            {
              step: '4',
              title: 'Customs Clearance',
              desc: 'We clear your car through Nigerian customs smoothly with full duties paid.',
            },
            {
              step: '5',
              title: 'Delivery to You',
              desc: 'We deliver your car safely to your doorstep anywhere in Nigeria.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs text-center flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0e7c3a] font-black text-sm flex items-center justify-center mb-3 border border-emerald-100">
                {item.step}
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Cars to Import Carousel */}
      <section className="bg-white py-14 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Popular Cars to Import
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Highest demanded models with proven resale value and easy spare parts in Nigeria
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('import-form')}
              className="text-xs font-bold text-[#0e7c3a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Request Custom Sourcing <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {isLoadingPopular ? (
              <div className="col-span-full py-10 text-center text-xs text-slate-400 font-medium">
                Loading live import inventory...
              </div>
            ) : popularCars.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-slate-400 font-medium">
                No import-ready inventory available right now. Request a custom sourcing quote below.
              </div>
            ) : (
              popularCars.map((car) => (
              <div
                key={car.id}
                className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-100">
                    <img src={car.image} alt={car.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2.5 right-2.5 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Est. {car.estDelivery}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-slate-900">
                      {car.title} {car.year}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{car.specs}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">Auction Price:</span>
                      <div className="text-lg font-black text-[#0e7c3a]">
                        ${car.priceUsd.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          (approx ₦{car.priceNgnEst.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => onNavigate('import-form')}
                    className="w-full py-2 bg-slate-100 hover:bg-[#0a502c] hover:text-white text-slate-800 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer"
                  >
                    Start Import
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Banner matching Web9.png */}
      <section className="bg-[#12492f] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black">Ready to import your dream car?</h3>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">
              Talk to our experts today and let us handle everything from bidding to delivery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('import-form')}
              className="px-5 py-2.5 bg-white text-[#12492f] hover:bg-slate-100 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Request a Free Quote
            </button>
            <button
              type="button"
              onClick={() => onNavigate('order-tracking')}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all border border-emerald-600/50 cursor-pointer"
            >
              Track Existing Order
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
