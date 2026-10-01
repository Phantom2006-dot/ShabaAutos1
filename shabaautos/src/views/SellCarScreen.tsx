import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Edit2, Check, Loader2 } from 'lucide-react';
import { ScreenId } from '../types';
import { TrustBadges } from '../components/TrustBadges';
import { submitSellCarValuation } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface SellCarScreenProps { onNavigate: (screen: ScreenId) => void; }
const SELL_DRAFT_KEY = 'shabaautos.sell-car-draft';

type CarData = {
  make: string; model: string; year: string; trim: string; mileage: string;
  mileageUnit: 'km' | 'miles'; transmission: string; fuelType: string;
  location: string; askingPrice: string;
};

export const SellCarScreen: React.FC<SellCarScreenProps> = ({ onNavigate }) => {
  const { user, isLoaded, isSignedIn } = useAuthUser();
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateReceivedAt, setEstimateReceivedAt] = useState<string | null>(null);
  const [isEditingCar, setIsEditingCar] = useState(true);
  const [isEditingCondition, setIsEditingCondition] = useState(true);
  const [isEditingContact, setIsEditingContact] = useState(true);
  const [carData, setCarData] = useState<CarData>({
    make: '', model: '', year: '', trim: '', mileage: '', mileageUnit: 'km',
    transmission: '', fuelType: '', location: '', askingPrice: '',
  });
  const [conditionData, setConditionData] = useState({ condition: '', issues: '' });
  const [contactData, setContactData] = useState({ fullName: '', phone: '', email: '' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELL_DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.carData) setCarData((current) => ({ ...current, ...draft.carData }));
        if (draft.conditionData) setConditionData((current) => ({ ...current, ...draft.conditionData }));
        if (draft.contactData) setContactData((current) => ({ ...current, ...draft.contactData }));
      }
    } catch { /* Draft recovery is best effort. */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    setContactData((current) => ({
      fullName: current.fullName || user.fullName || '',
      phone: current.phone || user.phone || '',
      email: current.email || user.email || '',
    }));
  }, [user]);

  const saveDraft = () => {
    try { localStorage.setItem(SELL_DRAFT_KEY, JSON.stringify({ carData, conditionData, contactData })); } catch { /* ignore */ }
  };

  const handleSubmitValuation = async () => {
    setSubmitError('');
    const year = Number(carData.year);
    const mileage = Number(carData.mileage);
    const askingPriceNgn = Number(carData.askingPrice);
    const errors: string[] = [];
    if (!isLoaded) errors.push('Authentication is still loading. Please try again in a moment.');
    if (!isSignedIn) {
      saveDraft();
      onNavigate('auth');
      return;
    }
    if (!carData.make.trim() || !carData.model.trim()) errors.push('Enter the vehicle make and model.');
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) errors.push('Enter a valid vehicle year.');
    if (!Number.isFinite(mileage) || mileage < 0) errors.push('Enter a valid mileage.');
    if (!carData.trim.trim()) errors.push('Enter the vehicle trim.');
    if (!carData.transmission || !carData.fuelType) errors.push('Select the transmission and fuel type.');
    if (!conditionData.condition) errors.push('Select the vehicle condition.');
    if (!carData.location.trim()) errors.push('Enter the vehicle location.');
    if (!Number.isFinite(askingPriceNgn) || askingPriceNgn <= 0) errors.push('Enter an asking price greater than zero.');
    if (!contactData.fullName.trim() || !contactData.phone.trim()) errors.push('Enter your name and phone number.');
    if (contactData.email && !/^\S+@\S+\.\S+$/.test(contactData.email)) errors.push('Enter a valid email address or leave it blank.');
    if (!agreementChecked) errors.push('Confirm that the information is accurate before submitting.');
    if (errors.length) { setSubmitError(errors[0]); return; }

    setIsSubmitting(true);
    try {
      const res = await submitSellCarValuation({
        year, make: carData.make.trim(), model: carData.model.trim(), trim: carData.trim.trim(),
        mileage, condition: conditionData.condition, sellerName: contactData.fullName.trim(),
        phone: contactData.phone.trim(), email: contactData.email.trim() || undefined,
        location: carData.location.trim(), askingPriceNgn,
        transmission: carData.transmission, fuelType: carData.fuelType,
        // The current API interface does not expose these fields, but the server accepts
        // issues and the JSON request should retain the unit and reviewed vehicle details.
        ...({ issues: `Mileage unit: ${carData.mileageUnit}. ${conditionData.issues.trim()}`.trim(), mileageUnit: carData.mileageUnit } as unknown as Record<string, unknown>),
      });
      if (!res?.success || !res.data?.id) throw new Error(res?.message || 'Vehicle valuation could not be submitted.');
      setSubmissionId(res.data.id);
      if (typeof res.estimatedValueNgn === 'number') {
        setEstimate(res.estimatedValueNgn);
        setEstimateReceivedAt(new Date().toISOString());
      }
      setSubmitted(true);
      try { localStorage.removeItem(SELL_DRAFT_KEY); } catch { /* ignore */ }
    } catch (err: any) {
      const message = String(err?.message || 'Vehicle valuation could not be submitted. Please try again.');
      setSubmitError(/401|unauthori[sz]ed|sign.?in|auth/i.test(message) ? 'Please sign in to submit. Your entries are saved on this device.' : message);
      saveDraft();
    } finally { setIsSubmitting(false); }
  };

  const formatNgn = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;
  const summaryVehicle = [carData.year, carData.make, carData.model, carData.trim].filter(Boolean).join(' ') || 'Vehicle details not yet provided';

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6"><button onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">Home</button><span>&gt;</span><span className="font-semibold text-gray-900">Sell Your Car</span></nav>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs"><h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">Sell Your Car</h3><div className="space-y-4 text-xs"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold">1</div><div><h4 className="font-bold">1. Car Details</h4><p className="text-[11px] text-gray-500">Provide the vehicle information</p></div></div><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold">2</div><div><h4 className="font-bold">2. Condition</h4><p className="text-[11px] text-gray-500">Tell us what you know</p></div></div><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold">3</div><div><h4 className="font-bold">3. Your Details</h4><p className="text-[11px] text-gray-500">Use your own contact details</p></div></div><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold">4</div><div><h4 className="font-bold text-[#0a502c]">4. Review &amp; Submit</h4><p className="text-[11px] text-emerald-700 font-semibold">Review before sending</p></div></div></div></div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><h4 className="text-xs font-bold text-gray-900 mb-1">Need help?</h4><p className="text-[11px] text-gray-600 leading-relaxed">Submit your details and a ShabaAutos specialist can follow up after review. Any inspection or offer is subject to confirmation.</p></div>
          </aside>

          <main className="lg:col-span-6"><div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-xs"><div className="mb-6"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Sell Your Car</h1><p className="text-xs sm:text-sm text-gray-600 mt-1">Share accurate details for a preliminary valuation review. Required fields are not filled with sample data.</p></div>
            {submitError && !submitted && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{submitError}</div>}
            {submitted ? <div className="py-10 text-center space-y-4"><div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div><h3 className="text-xl font-bold text-gray-900">Valuation request received</h3><div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold"><span>Valuation ticket: <span className="font-mono text-emerald-700">{submissionId}</span></span><button type="button" onClick={() => { navigator.clipboard?.writeText(submissionId); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }} className="p-1 hover:bg-emerald-200 rounded" title="Copy ticket ID">{copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button></div><p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">Your {summaryVehicle} request is recorded for review. A specialist will contact you using the details provided after assessing the submission. This is not a cash offer or a guaranteed valuation.</p><button onClick={() => setSubmitted(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg">Edit submission</button></div> : <div className="space-y-6">
              <section className="border border-gray-200 rounded-xl p-4 bg-gray-50/60"><div className="flex items-center justify-between pb-3 border-b border-gray-200"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Car details</h4><button type="button" onClick={() => setIsEditingCar(!isEditingCar)} className="text-xs font-semibold text-[#0a502c] flex items-center gap-1">{isEditingCar ? <><Check className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit</>}</button></div>{isEditingCar ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">{([['Make','make','text'],['Model','model','text'],['Year','year','number'],['Trim','trim','text'],['Mileage','mileage','number'],['Location','location','text'],['Asking price (₦)','askingPrice','number']] as const).map(([label,key,type]) => <div key={key}><label className="block text-[11px] font-medium text-gray-600 mb-1">{label} *</label><input type={type} min={type === 'number' ? '0' : undefined} value={carData[key]} onChange={(e) => setCarData({ ...carData, [key]: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2 font-medium text-gray-900" /></div>)}<div><label className="block text-[11px] font-medium text-gray-600 mb-1">Mileage unit *</label><select value={carData.mileageUnit} onChange={(e) => setCarData({ ...carData, mileageUnit: e.target.value as 'km' | 'miles' })} className="w-full bg-white border border-gray-300 rounded-lg p-2"><option value="km">Kilometres (km)</option><option value="miles">Miles</option></select></div><div><label className="block text-[11px] font-medium text-gray-600 mb-1">Transmission *</label><select value={carData.transmission} onChange={(e) => setCarData({ ...carData, transmission: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2"><option value="">Select transmission</option><option>Automatic</option><option>Manual</option><option>CVT</option></select></div><div><label className="block text-[11px] font-medium text-gray-600 mb-1">Fuel type *</label><select value={carData.fuelType} onChange={(e) => setCarData({ ...carData, fuelType: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2"><option value="">Select fuel type</option><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></div></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">{[['Vehicle',summaryVehicle],['Mileage',carData.mileage ? `${Number(carData.mileage).toLocaleString()} ${carData.mileageUnit}` : '—'],['Transmission',carData.transmission || '—'],['Fuel type',carData.fuelType || '—'],['Location',carData.location || '—'],['Asking price',carData.askingPrice ? formatNgn(Number(carData.askingPrice)) : '—']].map(([label,value]) => <div key={label}><span className="text-gray-500 text-[11px] block">{label}</span><span className="font-bold text-gray-900">{value}</span></div>)}</div>}</section>
              <section className="border border-gray-200 rounded-xl p-4 bg-gray-50/60"><div className="flex items-center justify-between pb-3 border-b border-gray-200"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Condition</h4><button type="button" onClick={() => setIsEditingCondition(!isEditingCondition)} className="text-xs font-semibold text-[#0a502c] flex items-center gap-1">{isEditingCondition ? <><Check className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit</>}</button></div>{isEditingCondition ? <div className="pt-3 space-y-3 text-xs"><div><label className="block text-[11px] font-medium text-gray-600 mb-1">Overall condition *</label><select value={conditionData.condition} onChange={(e) => setConditionData({ ...conditionData, condition: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2"><option value="">Select condition</option><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs Work</option></select></div><div><label className="block text-[11px] font-medium text-gray-600 mb-1">Damage / notes (optional)</label><textarea rows={2} value={conditionData.issues} onChange={(e) => setConditionData({ ...conditionData, issues: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2" /></div></div> : <div className="pt-3 text-xs"><span className="font-bold">{conditionData.condition || '—'}</span><p className="text-gray-600 mt-1">{conditionData.issues || 'No notes provided.'}</p></div>}</section>
              <section className="border border-gray-200 rounded-xl p-4 bg-gray-50/60"><div className="flex items-center justify-between pb-3 border-b border-gray-200"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Your details</h4><button type="button" onClick={() => setIsEditingContact(!isEditingContact)} className="text-xs font-semibold text-[#0a502c] flex items-center gap-1">{isEditingContact ? <><Check className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit</>}</button></div>{isEditingContact ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">{([['Full name','fullName','text'],['Phone number','phone','tel'],['Email (optional)','email','email']] as const).map(([label,key,type]) => <div key={key}><label className="block text-[11px] font-medium text-gray-600 mb-1">{label}{key !== 'email' ? ' *' : ''}</label><input type={type} value={contactData[key]} onChange={(e) => setContactData({ ...contactData, [key]: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg p-2" /></div>)}</div> : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">{[['Full name',contactData.fullName],['Phone',contactData.phone],['Email',contactData.email || '—']].map(([label,value]) => <div key={label}><span className="text-gray-500 text-[11px] block">{label}</span><span className="font-bold break-words">{value || '—'}</span></div>)}</div>}</section>
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer"><input type="checkbox" checked={agreementChecked} onChange={(e) => setAgreementChecked(e.target.checked)} className="mt-0.5 rounded-sm" /><span className="text-xs text-gray-600 leading-relaxed">I confirm these are my details and the information is accurate to the best of my knowledge. ShabaAutos may contact me about this request; any estimate is preliminary and subject to review and inspection.</span></label>
              {!isSignedIn && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">Sign in is required to submit. Your form will be saved on this device and restored after sign-in.</p>}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100"><button type="button" onClick={() => onNavigate('home')} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5"><ChevronLeft className="w-4 h-4" /> Back</button><button type="button" disabled={isSubmitting} onClick={handleSubmitValuation} className="px-8 py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit valuation request <ChevronRight className="w-4 h-4" /></>}</button></div>
            </div>}
          </div></main>

          <aside className="lg:col-span-3 space-y-6"><div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Request summary</span><h4 className="font-bold text-sm text-gray-900 mt-3">{summaryVehicle}</h4><p className="text-xs text-gray-500 mt-1">{carData.mileage ? `${Number(carData.mileage).toLocaleString()} ${carData.mileageUnit}` : 'Mileage not provided'} · {conditionData.condition || 'Condition not selected'}</p><div className="mt-4 pt-4 border-t border-gray-100">{estimate !== null ? <><span className="text-xs text-gray-600 block">Preliminary estimate</span><div className="text-lg font-black text-[#0a502c] mt-0.5">{formatNgn(estimate)}</div><p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Returned by the valuation service on {estimateReceivedAt ? new Date(estimateReceivedAt).toLocaleString() : 'submission'}. Algorithmic estimate, subject to review and inspection; not an offer.</p></> : <p className="text-[11px] text-gray-500 leading-relaxed">No estimate is shown until the backend receives and evaluates a complete submission.</p>}</div></div><div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs"><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">What happens next</h4><div className="space-y-4 text-xs">{[['1','Request received','A specialist reviews the information you submitted.'],['2','Details confirmed','If needed, the team will contact you to clarify the vehicle details.'],['3','Inspection or offer','Any inspection and any offer are subject to eligibility, availability, and separate confirmation.'],['4','Next steps agreed','Terms, fees, timing, and payment arrangements are explained before you decide.']].map(([step,title,copy]) => <div className="flex items-start gap-3" key={step}><div className="w-6 h-6 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center flex-shrink-0">{step}</div><div><h5 className="font-bold text-gray-900">{title}</h5><p className="text-[11px] text-gray-500 leading-relaxed">{copy}</p></div></div>)}</div></div></aside>
        </div><div className="mt-16"><TrustBadges variant="home" /></div>
      </div>
    </div>
  );
};
