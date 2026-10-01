import React, { useEffect, useState } from 'react';
import {
  Heart,
  Share2,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Star,
  Building2,
  MapPin,
  Calendar,
  X,
  Send,
  Calculator,
  Loader2,
} from 'lucide-react';
import { Car, ScreenId } from '../types';
import { useAuthUser } from '../context/AuthContext';
import { useBusinessContact } from '../hooks/useBusinessContact';
import { submitPriceOffer, bookVehicleInspection, fetchPublicSettings, fetchVehicleById } from '../services/api';

interface CarDetailScreenProps {
  car?: Car;
  carId?: string;
  onNavigate: (screen: ScreenId) => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  isImportVariant?: boolean; // For RAV4 Web4 view
}

export const CarDetailScreen: React.FC<CarDetailScreenProps> = ({
  car: propCar,
  carId,
  onNavigate,
  isSaved = false,
  onToggleSave = () => {},
}) => {
  const resolvedCarId = carId || propCar?.id || '';
  const { user, isSignedIn } = useAuthUser();
  const businessContact = useBusinessContact();
  const contactDigits = businessContact.phone.replace(/\D/g, '');
  const [serverCar, setServerCar] = useState<Car | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(Boolean(resolvedCarId));
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setServerCar(null);
    setVehicleNotFound(false);
    setVehicleLoadError(false);

    if (!resolvedCarId) {
      setVehicleLoading(false);
      return () => { active = false; };
    }

    setVehicleLoading(true);
    fetchVehicleById(resolvedCarId)
      .then((result) => {
        if (!active) return;
        const matchesRequestedVehicle = result && (result.id === resolvedCarId || result.stockId === resolvedCarId);
        if (matchesRequestedVehicle) {
          setServerCar(result);
        } else {
          setVehicleNotFound(true);
        }
      })
      .catch(() => {
        if (active) setVehicleLoadError(true);
      })
      .finally(() => {
        if (active) setVehicleLoading(false);
      });

    return () => { active = false; };
  }, [resolvedCarId, reloadNonce]);

  // Keep an explicitly passed listing visible while the requested ID is being verified.
  // Once the request resolves, only the server response is used as the source of truth.
  const car = serverCar || (vehicleLoading ? propCar : undefined);
  const isVerifiedCar = Boolean(serverCar);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [sellFees, setSellFees] = useState<{ docFee: number; deliveryFee: number }>({ docFee: 150000, deliveryFee: 300000 });

  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((settings) => {
      if (!active) return;
      const docRaw = settings['sell.doc_fee_ngn']?.value;
      const delRaw = settings['sell.delivery_fee_ngn']?.value;
      const toNum = (v: unknown, fallback: number): number => typeof v === 'number' ? v : typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : fallback;
      setSellFees({ docFee: toNum(docRaw, 150000), deliveryFee: toNum(delRaw, 300000) });
    });
    return () => { active = false; };
  }, []);

  // Purchase/Offer Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [offerAmount, setOfferAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Direct Bank Transfer');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerResult, setOfferResult] = useState<{ id: string; message: string } | null>(null);

  // Inspection request state starts blank; authenticated details are filled below.
  const [inspDate, setInspDate] = useState('');
  const [inspTime, setInspTime] = useState('');
  const [inspHub, setInspHub] = useState('');
  const [inspType, setInspType] = useState<'Physical Inspection' | 'Live Video Tour' | 'Mechanic Verification'>('Physical Inspection');
  const [inspSubmitting, setInspSubmitting] = useState(false);
  const [inspResult, setInspResult] = useState<{ id: string; message: string } | null>(null);

  // Financing Calculator State
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [loanTenureMonths, setLoanTenureMonths] = useState(24);

  useEffect(() => {
    if (isSignedIn && user) {
      setBuyerName((current) => current || user.fullName || '');
      setBuyerPhone((current) => current || user.phone || '');
      setBuyerEmail((current) => current || user.email || '');
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    if (serverCar) {
      setOfferAmount(serverCar.priceNgn);
      setSelectedImageIndex(0);
    }
  }, [serverCar]);

  const images = car?.images?.filter(Boolean) || [];
  const shareUrl = car && typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?carId=${encodeURIComponent(car.id)}`
    : '';
  const mapsUrl = car ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(car.location)}` : '';

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch {
      setCopiedNotification(false);
    }
  };

  // Cost breakdown is an estimate; destination-dependent charges remain subject to confirmation.
  const serviceFee = car ? Math.round(car.priceNgn * 0.02) : 0;
  const docFee = sellFees.docFee;
  const deliveryFee = sellFees.deliveryFee;
  const totalCost = car ? car.priceNgn + serviceFee + docFee + deliveryFee : 0;

  // Loan calculation is illustrative only; lender terms and eligibility vary.
  const downPaymentAmount = car ? Math.round(car.priceNgn * (downPaymentPercent / 100)) : 0;
  const loanPrincipal = car ? car.priceNgn - downPaymentAmount : 0;
  const annualInterestRate = 0.18;
  const totalInterest = Math.round(loanPrincipal * annualInterestRate * (loanTenureMonths / 12));
  const totalLoanRepayable = loanPrincipal + totalInterest;
  const monthlyRepayment = Math.round(totalLoanRepayable / loanTenureMonths);

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverCar) return;
    setOfferSubmitting(true);
    const res = await submitPriceOffer({
      carId: serverCar.id,
      carName: `${serverCar.year} ${serverCar.make} ${serverCar.model}`,
      name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      offerAmountNgn: offerAmount,
      paymentMethod,
      notes: purchaseNotes,
    });
    setOfferSubmitting(false);
    if (res.success) {
      setOfferResult({
        id: res.data?.id || 'Pending assignment',
        message: res.message || 'Offer registered successfully!',
      });
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverCar) return;
    setInspSubmitting(true);
    const res = await bookVehicleInspection({
      carId: serverCar.id,
      carName: `${serverCar.year} ${serverCar.make} ${serverCar.model}`,
      name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      date: inspDate,
      timeSlot: inspTime,
      hubLocation: inspHub,
      inspectionType: inspType,
    });
    setInspSubmitting(false);
    if (res.success) {
      setInspResult({
        id: res.data?.id || 'Pending assignment',
        message: res.message || 'Our team will follow up to confirm availability and next steps.',
      });
    }
  };

  const whatsappMessage = car
    ? encodeURIComponent(
        `Hello ShabaAutos! I am interested in the ${car.year} ${car.make} ${car.model} (Stock ID: ${car.stockId}). Please share current availability and inspection details.`
      )
    : '';

  if (vehicleLoading && !car) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] shaba-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs max-w-md w-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#0a502c] mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900">Loading vehicle listing</h1>
          <p className="text-sm text-gray-600 mt-2">We are verifying this vehicle with the live inventory.</p>
        </div>
      </div>
    );
  }

  if (vehicleLoadError) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] shaba-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs max-w-md w-full">
          <h1 className="text-lg font-bold text-gray-900">We could not load this listing</h1>
          <p className="text-sm text-gray-600 mt-2">Please check your connection and try again, or browse current inventory.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button onClick={() => setReloadNonce((value) => value + 1)} className="px-4 py-2 rounded-lg bg-[#0a502c] text-white text-xs font-bold">Try again</button>
            <button onClick={() => onNavigate('buy-cars')} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold">Browse cars</button>
          </div>
        </div>
      </div>
    );
  }

  if (vehicleNotFound || !car) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] shaba-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs max-w-md w-full">
          <h1 className="text-lg font-bold text-gray-900">Vehicle listing not found</h1>
          <p className="text-sm text-gray-600 mt-2">This listing may have been removed or the link may be out of date. We will not substitute another vehicle.</p>
          <button onClick={() => onNavigate('buy-cars')} className="mt-6 px-5 py-2.5 rounded-lg bg-[#0a502c] text-white text-xs font-bold">Browse available cars</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <button onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">
            Home
          </button>
          <span>&gt;</span>
          <button onClick={() => onNavigate('buy-cars')} className="hover:text-[#0a502c]">
            Buy Cars
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900 truncate">
            {car.year} {car.make} {car.model}
          </span>
        </nav>

        {/* Top Title & Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {car.year} {car.make} {car.model}
              </h1>
              {car.verified && (
                <span className="bg-emerald-100 text-[#0a502c] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Vehicle
                </span>
              )}
            </div>

            {/* Spec & Meta line */}
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {car.mileage.toLocaleString()} {car.mileageUnit || 'km'} • {car.transmission} • {car.fuelType} • {car.location}
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#0a502c] font-semibold mt-1 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              View listing area on Google Maps
            </a>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Listed {car.listedTimeAgo} • Stock ID: <span className="font-mono text-gray-600">{car.stockId}</span>
            </p>
          </div>

          {/* Action buttons (Wishlist & Share) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                isSaved
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              {isSaved ? 'Saved in Wishlist' : 'Add to Wishlist'}
            </button>

            <button
              onClick={handleShare}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-gray-300 bg-white text-gray-700 hover:border-gray-400 transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4 text-gray-500" />
              Share
              {copiedNotification && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-sm shadow-md whitespace-nowrap">
                  Link Copied!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Main Layout: Left Gallery + Details / Right Price & Order */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols wide) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery Area */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 shadow-xs">
              {/* Main Image: only real vehicle media is shown. */}
              <div className="relative h-80 sm:h-[420px] rounded-xl overflow-hidden bg-gray-100">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[selectedImageIndex]}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          aria-label="Previous vehicle photo"
                          onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          aria-label="Next vehicle photo"
                          onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <FileText className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="text-sm font-bold text-gray-700">Photos coming soon</p>
                    <p className="text-xs text-gray-500 mt-1">No vehicle photos have been published for this listing.</p>
                  </div>
                )}
              </div>

              {/* Thumbnails Row: the count matches the actual published media. */}
              {images.length > 0 && (
                <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img + idx}
                      aria-label={`View vehicle photo ${idx + 1}`}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-[#0a502c] ring-2 ring-emerald-200'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Vehicle thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Summary: 6 Metric Blocks */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                Vehicle Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Mileage</span>
                  <span className="block text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                    {car.mileage.toLocaleString()} {car.mileageUnit || 'km'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Transmission</span>
                  <span className="block text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                    {car.transmission}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Fuel Type</span>
                  <span className="block text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                    {car.fuelType}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Engine</span>
                  <span className="block text-xs sm:text-sm font-black text-gray-900 mt-0.5 truncate">
                    {car.engine.split(' ')[0]}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Color</span>
                  <span className="block text-xs sm:text-sm font-black text-gray-900 mt-0.5 truncate">
                    {car.color.split(' ')[0]}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <span className="block text-[11px] text-gray-500 font-medium">Condition</span>
                  <span className="block text-xs sm:text-sm font-black text-emerald-800 mt-0.5 truncate">
                    {(car.condition || '').includes('Tokunbo') ? 'Tokunbo' : 'Nig. Used'}
                  </span>
                </div>
              </div>
            </div>

            {/* Inspection status is limited to the evidence available on this listing. */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {car.inspectionPassed ? 'Inspection status recorded' : 'Inspection available on request'}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed max-w-xl">
                    {car.inspectionPassed
                      ? 'The listing records an inspection status. Ask our team for supporting details before purchase.'
                      : 'No published inspection report is attached to this listing. You can request an inspection before purchase.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectionModalOpen(true)}
                disabled={!isVerifiedCar}
                className="whitespace-nowrap px-4 py-2 bg-white border border-emerald-600 hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-[#0a502c] text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                Request an inspection
              </button>
            </div>

            {/* About This Vehicle */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-base font-bold text-gray-900 mb-3">About This Vehicle</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {car.description}
              </p>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  Vehicle Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {car.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Specifications Table */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-base font-bold text-gray-900 mb-4">Technical Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Make</span>
                  <span className="font-bold text-gray-900">{car.make}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Model</span>
                  <span className="font-bold text-gray-900">{car.model}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Year</span>
                  <span className="font-bold text-gray-900">{car.year}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Mileage</span>
                  <span className="font-bold text-gray-900">
                    {car.mileage.toLocaleString()} {car.mileageUnit || 'km'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Transmission</span>
                  <span className="font-bold text-gray-900">{car.transmission}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Fuel Type</span>
                  <span className="font-bold text-gray-900">{car.fuelType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Engine Capacity</span>
                  <span className="font-bold text-gray-900">{car.engine}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Drive Type</span>
                  <span className="font-bold text-gray-900">{car.driveType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Color</span>
                  <span className="font-bold text-gray-900">{car.color}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Seats</span>
                  <span className="font-bold text-gray-900">{car.seats} Passengers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Checkout & Dealer */}
          <div className="space-y-6">
            {/* Price & Action Box */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs sticky top-28">
              <div className="pb-4 border-b border-gray-100">
                <span className="text-xs text-gray-500 font-semibold block">Listed vehicle price</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[#0a502c]">
                    ₦{car.priceNgn.toLocaleString()}
                  </span>
                  {car.priceUsd && (
                    <span className="text-xs font-bold text-gray-500">
                      (approx. ${car.priceUsd.toLocaleString()} USD reference)
                    </span>
                  )}
                </div>
              </div>

              <div className="my-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Listed price and estimated charges are shown for transparency; confirm the final quote and destination costs with our team.</span>
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(true)}
                  disabled={!isVerifiedCar}
                  className="w-full py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  Start Purchase / Make Offer
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionModalOpen(true)}
                  disabled={!isVerifiedCar}
                  className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#0a502c]" />
                  Request Inspection &amp; Test Drive
                </button>

                {contactDigits && <a
                  href={`https://wa.me/${contactDigits}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-white border border-[#0a502c] text-[#0a502c] hover:bg-emerald-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-center"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat on WhatsApp
                </a>}
              </div>

              {/* Need Financing Card */}
              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h4 className="text-xs font-bold text-gray-900 mb-1">Need Vehicle Financing?</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-2">
                  Use the calculator for an illustrative estimate. Lender rates, fees, eligibility, and timing vary; this is not a pre-approval.
                </p>
                <button
                  type="button"
                  onClick={() => setFinanceModalOpen(true)}
                  className="text-xs font-bold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calculate Monthly Installment &gt;
                </button>
              </div>

              {/* Estimated Cost Breakdown */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-xs">
                <h4 className="font-bold text-gray-800 mb-1">Illustrative cost breakdown</h4>
                <p className="text-[11px] text-gray-500 mb-3">Fees and delivery assumptions should be confirmed for your destination before purchase.</p>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Vehicle Price</span>
                    <span className="font-semibold text-gray-900">
                      ₦{car.priceNgn.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated service fee</span>
                    <span className="font-semibold text-gray-900">
                      ₦{serviceFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated documentation fee</span>
                    <span className="font-semibold text-gray-900">
                      ₦{docFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated delivery fee ({car.location})</span>
                    <span className="font-semibold text-gray-900">
                      ₦{deliveryFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-[#0a502c]">
                    <span>Estimated total</span>
                    <span>₦{totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Seller / Dealer Info (Featured in Web4) */}
              {car.seller && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-3">
                    Dealer Information
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">{car.seller.name}</span>
                        {car.seller.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#0a502c]" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <div className="flex items-center text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span className="ml-1">{car.seller.rating}</span>
                        </div>
                        <span>•</span>
                        <span>{car.seller.reviewsCount} reviews</span>
                      </div>
                    </div>
                  </div>
                  {contactDigits && <a
                    href={`https://wa.me/${contactDigits}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask about this dealer
                  </a>}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Share Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Vehicle listing link copied to clipboard!
        </div>
      )}

      {/* Modal 1: Purchase / Make Offer Modal */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Purchase or Make Offer"
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0a502c]" />
                <h3 className="font-bold text-base text-gray-900">Purchase / Make An Offer</h3>
              </div>
              <button
                onClick={() => {
                  setPurchaseModalOpen(false);
                  setOfferResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {offerResult ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Offer Submitted Successfully!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {offerResult.message} Reference ID:{' '}
                  <strong className="font-mono text-emerald-800">{offerResult.id}</strong>.
                </p>
                <button
                  onClick={() => {
                    setPurchaseModalOpen(false);
                    setOfferResult(null);
                  }}
                  className="mt-4 px-6 py-2.5 bg-[#0a502c] text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleOfferSubmit} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Vehicle</span>
                    <span className="text-xs font-bold text-slate-900">{car.year} {car.make} {car.model}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Listed Price</span>
                    <span className="text-xs font-black text-[#0a502c]">₦{car.priceNgn.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Offer Amount (₦ NGN)</label>
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="Direct Bank Transfer">Direct bank transfer (requested method)</option>
                    <option value="Vehicle Financing">Vehicle financing enquiry</option>
                    <option value="Bank Draft">Manager&apos;s Cheque / Bank Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Inspection Requests</label>
                  <textarea
                    rows={2}
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    placeholder="e.g., I would like to inspect on Saturday morning in Lekki..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {offerSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Purchase Offer
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Inspection Booking Modal */}
      {inspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Schedule Physical Inspection"
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0a502c]" />
                <h3 className="font-bold text-base text-gray-900">Schedule Physical Inspection</h3>
              </div>
              <button
                onClick={() => {
                  setInspectionModalOpen(false);
                  setInspResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspResult ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Inspection request received</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {inspResult.message} Request reference:{' '}
                  <strong className="font-mono text-emerald-800">{inspResult.id}</strong>.
                </p>
                <button
                  onClick={() => {
                    setInspectionModalOpen(false);
                    setInspResult(null);
                  }}
                  className="mt-4 px-6 py-2.5 bg-[#0a502c] text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInspectionSubmit} className="space-y-3.5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Request a physical inspection or live diagnostic video tour for stock{' '}
                  <strong className="font-mono text-gray-800">{car.stockId}</strong>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Physical Inspection', 'Live Video Tour', 'Mechanic Verification'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setInspType(type)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                          inspType === type
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={inspDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setInspDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                    <select
                      value={inspTime}
                      onChange={(e) => setInspTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    >
                      <option value="">Select a preferred time</option>
                      <option value="10:00 AM - 12:00 PM">Morning: 10:00 AM - 12:00 PM</option>
                      <option value="01:00 PM - 03:00 PM">Afternoon: 01:00 PM - 03:00 PM</option>
                      <option value="04:00 PM - 06:00 PM">Evening: 04:00 PM - 06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred inspection location</label>
                  <input
                    type="text"
                    value={inspHub}
                    onChange={(e) => setInspHub(e.target.value)}
                    placeholder="Tell us where you would prefer the inspection"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inspSubmitting || !isVerifiedCar}
                  className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {inspSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Submit inspection request
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Auto Financing Calculator Modal */}
      {financeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vehicle Auto Financing Calculator"
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#0a502c]" />
                <h3 className="font-bold text-base text-gray-900">Vehicle Auto Financing Calculator</h3>
              </div>
              <button
                onClick={() => setFinanceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900">Vehicle Price:</span>
              <span className="text-sm font-black text-emerald-900">₦{car.priceNgn.toLocaleString()}</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Down Payment: {downPaymentPercent}%</span>
                  <span className="text-emerald-800">₦{downPaymentAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full accent-[#0a502c] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Repayment Tenure</span>
                  <span className="text-emerald-800">{loanTenureMonths} Months ({loanTenureMonths / 12} Years)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setLoanTenureMonths(months)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        loanTenureMonths === months
                          ? 'bg-[#0a502c] text-white border-[#0a502c]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {months}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Results */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  Estimated Monthly Repayment
                </span>
                <div className="text-2xl font-black text-emerald-400">
                  ₦{monthlyRepayment.toLocaleString()} <span className="text-xs font-normal text-slate-300">/ month</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
                  <span>Financed Amount: ₦{loanPrincipal.toLocaleString()}</span>
                  <span>Illustrative rate: 18.0%</span>
                </div>
                <p className="text-[11px] text-slate-400">This estimate is not a pre-approval. Final lender terms, fees, and eligibility are determined separately.</p>
              </div>

              <button
                onClick={() => {
                  setFinanceModalOpen(false);
                  setPurchaseModalOpen(true);
                  setPaymentMethod('Vehicle Financing');
                }}
                className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Submit financing enquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
