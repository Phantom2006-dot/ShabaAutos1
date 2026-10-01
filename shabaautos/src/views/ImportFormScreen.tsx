import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { ScreenId } from '../types';
import { submitImportOrder } from '../services/api';
import { useAuthUser } from '../context/AuthContext';
import { useBusinessContact } from '../hooks/useBusinessContact';

const IMPORT_DRAFT_KEY = 'shabaautos-import-draft';
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
  estimatedBudgetUsd?: number;
  vin?: string;
  auctionLink?: string;
  deliveryCity?: string;
  destinationPort?: string;
  originPort?: string;
  vehicleType?: string;
  budgetRange?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  mileagePref?: string;
  features?: string[];
  fullName?: string;
  phone?: string;
  email?: string;
  additionalNotes?: string;
};

function readImportDraft(): ImportDraft {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(IMPORT_DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeImportDraft(draft: ImportDraft) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Draft persistence is best effort.
  }
}

function isAuthFailure(response: any) {
  const message = String(response?.message || '').toLowerCase();
  return response?.code === 'AUTH_REQUIRED' || response?.status === 401 || message.includes('authentication required') || message.includes('unauthorized');
}

export interface ImportFormScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ImportFormScreen: React.FC<ImportFormScreenProps> = ({ onNavigate }) => {
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const businessContact = useBusinessContact();
  const contactDigits = businessContact.phone.replace(/\D/g, '');
  const [draft] = useState<ImportDraft>(() => readImportDraft());

  const [vehicleType, setVehicleType] = useState(draft.vehicleType || 'SUV');
  const [make, setMake] = useState(draft.make || '');
  const [model, setModel] = useState(draft.model || '');
  const [yearMin, setYearMin] = useState(draft.yearMin || '2019');
  const [yearMax, setYearMax] = useState(draft.yearMax || String(new Date().getFullYear()));
  const [budgetRange, setBudgetRange] = useState(draft.budgetRange || draft.maxPrice || '');
  const [estimatedBudgetUsd] = useState(draft.estimatedBudgetUsd);
  const [vin, setVin] = useState(draft.vin || '');
  const [auctionLink] = useState(draft.auctionLink || '');
  const [deliveryCity, setDeliveryCity] = useState(draft.deliveryCity || 'Lagos');
  const [destinationPort, setDestinationPort] = useState(draft.destinationPort || DESTINATION_PORTS[draft.deliveryCity || 'Lagos']);
  const [fuelType, setFuelType] = useState(draft.fuelType || 'Petrol');
  const [transmission, setTransmission] = useState(draft.transmission || 'Automatic');
  const [driveType, setDriveType] = useState(draft.driveType || 'All Wheel Drive (AWD)');
  const [mileagePref, setMileagePref] = useState(draft.mileagePref || 'Up to 60,000 miles');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(draft.features || []);

  const [fullName, setFullName] = useState(draft.fullName || '');
  const [phone, setPhone] = useState(draft.phone || '');
  const [email, setEmail] = useState(draft.email || '');
  const [additionalNotes, setAdditionalNotes] = useState(draft.additionalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);

  const availableFeatures = ['Leather seats', 'Sunroof', 'Backup camera', 'Lane assist', 'Apple CarPlay / Android Auto', 'Third row seating (7 seats)', 'Heated seats', 'Blind spot monitor', 'Tow hitch package'];
  const yearOptions = Array.from({ length: new Date().getFullYear() - 2017 }, (_, index) => String(2018 + index));

  useEffect(() => {
    if (!user) return;
    if (!fullName && user.fullName) setFullName(user.fullName);
    if (!phone && user.phone) setPhone(user.phone);
    if (!email && user.email) setEmail(user.email);
  }, [email, fullName, phone, user]);

  useEffect(() => {
    writeImportDraft({ make, model, yearMin, yearMax, budgetRange, estimatedBudgetUsd, vin, auctionLink, deliveryCity, destinationPort, vehicleType, fuelType, transmission, driveType, mileagePref, features: selectedFeatures, fullName, phone, email, additionalNotes });
  }, [additionalNotes, auctionLink, budgetRange, deliveryCity, destinationPort, driveType, email, estimatedBudgetUsd, fuelType, fullName, make, mileagePref, model, phone, selectedFeatures, transmission, vehicleType, vin, yearMax, yearMin]);

  const toggleFeature = (feature: string) => setSelectedFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]);

  const validate = () => {
    if (!make.trim() || !model.trim()) return 'Make and model are required.';
    if (Number(yearMin) > Number(yearMax)) return 'Year From must be earlier than or equal to Year To.';
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin.trim().toUpperCase())) return 'VIN must be exactly 17 characters and cannot contain I, O or Q.';
    if (!fullName.trim()) return 'Enter your full name.';
    if (!phone.trim()) return 'Enter a phone number.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!deliveryCity || !destinationPort) return 'Select a delivery city and destination port.';
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError('');
    if (!isLoaded || !isSignedIn) {
      setSubmitError('Please sign in to submit this request. Your draft is saved on this device.');
      onNavigate('auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const notes = [additionalNotes.trim(), auctionLink.trim() ? `Auction or listing link: ${auctionLink.trim()}` : ''].filter(Boolean).join('\n');
      const response = await submitImportOrder({
        make: make.trim(),
        model: model.trim(),
        yearMin: Number(yearMin),
        yearMax: Number(yearMax),
        vehicleType,
        budgetRange: budgetRange || undefined,
        estimatedBudgetUsd,
        vin: vin.trim().toUpperCase() || undefined,
        deliveryCity,
        destinationPort,
        fuelType,
        transmission,
        driveType,
        mileagePref,
        features: selectedFeatures,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        additionalNotes: notes || undefined,
      });
      if (isAuthFailure(response)) {
        setSubmitError('Your sign-in is required to submit this request. The draft is still saved.');
        onNavigate('auth');
        return;
      }
      const serverReference = response?.trackingId || response?.data?.trackingId;
      if (!response?.success || !serverReference) throw new Error(response?.message || 'The import request could not be submitted.');
      setTrackingId(String(serverReference));
      setSubmitted(true);
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(IMPORT_DRAFT_KEY);
    } catch (error: any) {
      setSubmitError(error?.message || 'The import request could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!trackingId) return;
    navigator.clipboard?.writeText(trackingId);
    setCopiedTracking(true);
    window.setTimeout(() => setCopiedTracking(false), 2000);
  };

  const viewSubmittedRequest = () => {
    if (!trackingId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('trackingId', trackingId);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    onNavigate('order-tracking');
  };

  const inputClass = 'w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-5 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6"><button type="button" onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">Home</button><span>&gt;</span><button type="button" onClick={() => onNavigate('import-landing')} className="hover:text-[#0a502c]">Import from US</button><span>&gt;</span><span className="font-semibold text-gray-900">Request details</span></nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 lg:gap-8">
          <aside className="order-2 lg:order-1 lg:col-span-1 space-y-4 lg:space-y-6">
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">Request intake</h2>
              <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">1</div><div><h3 className="text-xs font-bold text-[#0a502c]">Request details</h3><p className="text-[11px] text-gray-500">Vehicle, route and contact information</p></div></div>
              <p className="mt-5 pt-4 border-t border-gray-100 text-[11px] leading-relaxed text-gray-500">This form records a sourcing request. Any later quote, purchase decision or logistics status must be based on a separate confirmed record.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-xs"><h3 className="text-xs font-bold text-gray-900 mb-1">Need assistance?</h3><p className="text-[11px] text-gray-600 leading-relaxed mb-4">If you are unsure which details to provide, send what you know; our team can clarify missing information.</p>{contactDigits && <a href={`https://wa.me/${contactDigits}`} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors mb-2"><MessageSquare className="w-3.5 h-3.5" />Chat with support</a>}{businessContact.phone && <div className="text-center text-[11px] text-gray-600 flex items-center justify-center gap-1.5 pt-1"><Phone className="w-3 h-3 text-[#0a502c]" /><span>{businessContact.phone}</span></div>}{businessContact.email && <a className="block text-center text-[11px] text-emerald-800" href={`mailto:${businessContact.email}`}>{businessContact.email}</a>}</div>
          </aside>

          <main className="order-1 min-w-0 lg:order-2 lg:col-span-3"><div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 sm:p-8 shadow-xs">
            <div className="mb-6"><div className="flex items-center gap-2 text-[#0a502c] mb-2"><FileText className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-wider">One-step request</span></div><h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Import from the US</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Provide the details available to you. Required fields are marked clearly.</p></div>
            <div className="mb-8 pb-6 border-b border-gray-100"><div className="h-1.5 bg-[#0a502c] rounded-full mb-2" /><span className="text-[11px] font-bold text-[#0a502c]">Request details</span></div>

            {submitted ? <div className="py-12 text-center space-y-4"><div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center mx-auto"><CheckCircle className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-900">Request received</h2><div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold mx-auto"><span>Server reference: <span className="font-mono text-emerald-700">{trackingId}</span></span><button type="button" onClick={copyToClipboard} className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer" title="Copy server reference" aria-label="Copy server reference">{copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}</button></div><p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">Your import request has been recorded. A specialist can review the details and contact you using the information provided.</p><div className="pt-4 flex flex-wrap justify-center gap-3"><button type="button" onClick={viewSubmittedRequest} className="px-5 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer">View request status</button><button type="button" onClick={() => { setSubmitted(false); setTrackingId(''); }} className="px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-200 cursor-pointer">Submit another request</button></div></div> : <>
              {submitError && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{submitError}</div>}
              <form onSubmit={handleSubmit} className="space-y-8">
                <section><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">1. Vehicle details</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-bold text-gray-800">Vehicle type <span className="text-red-500">*</span><select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} className={`${inputClass} mt-1.5`}><option>SUV</option><option>Sedan</option><option>Truck / Pickup</option><option>Coupe / Sport</option><option>Hatchback</option></select></label>
                  <label className="block text-xs font-bold text-gray-800">Make <span className="text-red-500">*</span><input required value={make} onChange={(event) => setMake(event.target.value)} placeholder="e.g. Toyota" className={`${inputClass} mt-1.5`} /></label>
                  <label className="block text-xs font-bold text-gray-800">Model <span className="text-red-500">*</span><input required value={model} onChange={(event) => setModel(event.target.value)} placeholder="e.g. RAV4" className={`${inputClass} mt-1.5`} /></label>
                  <div><span className="block text-xs font-bold text-gray-800 mb-1.5">Year range <span className="text-red-500">*</span></span><div className="grid grid-cols-2 gap-2"><select required value={yearMin} onChange={(event) => setYearMin(event.target.value)} className={inputClass}>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select><select required value={yearMax} onChange={(event) => setYearMax(event.target.value)} className={inputClass}>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></div></div>
                  <label className="block text-xs font-bold text-gray-800 sm:col-span-2">Budget context (optional)<select value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} className={`${inputClass} mt-1.5`}><option value="">Not specified</option><option>$15,000</option><option>$25,000</option><option>$35,000</option><option>$50,000</option><option>Any Budget</option></select></label>
                  <label className="block text-xs font-bold text-gray-800">VIN (optional)<input value={vin} onChange={(event) => setVin(event.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={17} placeholder="17-character VIN" className={`${inputClass} mt-1.5 font-mono`} /></label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">A VIN or listing link is recorded as supplied. It is not a vehicle-history, title or auction-availability verification.</div>
                </div><div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-xs font-bold text-gray-800">Transmission<select value={transmission} onChange={(event) => setTransmission(event.target.value)} className={`${inputClass} mt-1.5`}><option>Automatic</option><option>Manual</option></select></label><label className="block text-xs font-bold text-gray-800">Fuel type<select value={fuelType} onChange={(event) => setFuelType(event.target.value)} className={`${inputClass} mt-1.5`}><option>Petrol</option><option>Hybrid</option><option>Diesel</option><option>Electric</option></select></label><label className="block text-xs font-bold text-gray-800">Drive type<select value={driveType} onChange={(event) => setDriveType(event.target.value)} className={`${inputClass} mt-1.5`}><option>All Wheel Drive (AWD)</option><option>Front Wheel Drive (FWD)</option><option>Four Wheel Drive (4WD)</option><option>Rear Wheel Drive (RWD)</option></select></label><label className="block text-xs font-bold text-gray-800">Mileage preference<select value={mileagePref} onChange={(event) => setMileagePref(event.target.value)} className={`${inputClass} mt-1.5`}><option>Up to 30,000 miles</option><option>Up to 60,000 miles</option><option>Up to 90,000 miles</option><option>Any Mileage</option></select></label></div>
                <div className="mt-4"><span className="block text-xs font-bold text-gray-800 mb-2">Preferred features (optional)</span><div className="flex flex-wrap gap-2">{availableFeatures.map((feature) => <button key={feature} type="button" onClick={() => toggleFeature(feature)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedFeatures.includes(feature) ? 'bg-[#0a502c] text-white border-[#0a502c]' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}>{feature}{selectedFeatures.includes(feature) && ' ✓'}</button>)}</div></div></section>

                <section><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">2. Destination</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-xs font-bold text-gray-800">Delivery city <span className="text-red-500">*</span><select required value={deliveryCity} onChange={(event) => { const city = event.target.value; setDeliveryCity(city); setDestinationPort(DESTINATION_PORTS[city] || ''); }} className={`${inputClass} mt-1.5`}><option>Lagos</option><option>Abuja</option><option>Port Harcourt</option></select></label><label className="block text-xs font-bold text-gray-800">Destination port <span className="text-red-500">*</span><select required value={destinationPort} onChange={(event) => setDestinationPort(event.target.value)} className={`${inputClass} mt-1.5`}><option>Tin Can Island Container Terminal, Lagos</option><option>Onne Port, Rivers State</option></select></label></div></section>

                <section><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">3. Contact information</h2><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><label className="block text-xs font-bold text-gray-800">Full name <span className="text-red-500">*</span><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-xs font-bold text-gray-800">Phone number <span className="text-red-500">*</span><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-xs font-bold text-gray-800">Email address <span className="text-red-500">*</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-1.5`} /></label></div></section>

                <section><div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-gray-800" htmlFor="import-notes">Additional information (optional)</label><span className="text-[10px] text-gray-400">{additionalNotes.length}/500</span></div><textarea id="import-notes" rows={3} maxLength={500} value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} placeholder="Colour, trim, timing or other requirements…" className={`${inputClass} p-3`} />{auctionLink && <p className="mt-2 text-[11px] text-slate-500 break-all">Listing link carried from search: {auctionLink}</p>}</section>

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4"><div className="flex items-center gap-2 text-xs text-gray-500"><Lock className="w-4 h-4 text-emerald-700 flex-shrink-0" /><span>Your details are used to process this request and may be shared with operational service providers as needed.</span></div><button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting request…</> : <>Submit request<ChevronRight className="w-4 h-4" /></>}</button></div>
              </form>
            </>}
          </div></main>
        </div>
      </div>
    </div>
  );
};
