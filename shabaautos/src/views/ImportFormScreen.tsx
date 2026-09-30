import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  Truck,
  Phone,
  MessageSquare,
  Lock,
  ChevronRight,
  ShieldCheck,
  Check,
  Loader2,
  Copy,
} from 'lucide-react';
import { ScreenId } from '../types';
import { TrustBadges } from '../components/TrustBadges';
import { submitImportOrder } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface ImportFormScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ImportFormScreen: React.FC<ImportFormScreenProps> = ({ onNavigate }) => {
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [vehicleType, setVehicleType] = useState('SUV');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('RAV4');
  const [yearMin, setYearMin] = useState('2021');
  const [yearMax, setYearMax] = useState('2024');
  const [budgetRange, setBudgetRange] = useState('₦20,000,000 - ₦40,000,000');
  const [fuelType, setFuelType] = useState('Petrol');
  const [transmission, setTransmission] = useState('Automatic');
  const [driveType, setDriveType] = useState('All Wheel Drive (AWD)');
  const [mileagePref, setMileagePref] = useState('Up to 60,000 miles');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'Leather seats',
    'Sunroof',
    'Backup camera',
    'Lane assist',
  ]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Prefill contact details from the real authenticated user — never a fake persona。


  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      setFullName((prev) => prev || user.fullName || '');
      setPhone((prev) => prev || user.phone || '');
      setEmail((prev) => prev || user.email || '');
    }
  }, [isLoaded, isSignedIn, user]);

  const availableFeatures = [
    'Leather seats',
    'Sunroof',
    'Backup camera',
    'Lane assist',
    'Apple CarPlay / Android Auto',
    'Third row seating (7 seats)',
    'Heated seats',
    'Blind spot monitor',
    'Tow hitch package',
  ];

  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await submitImportOrder({
        make,
        model,
        yearMin,
        yearMax,
        vehicleType,
        budgetRange,
        fuelType,
        transmission,
        driveType,
        mileagePref,
        features: selectedFeatures,
        fullName,
        phone,
        email,
        additionalNotes,
      });
      if (!res?.success || !res.trackingId) throw new Error(res?.message || 'Import request could not be submitted.');
      setTrackingId(res.trackingId);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Import request could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (trackingId) {
      navigator.clipboard?.writeText(trackingId);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <button onClick={() => onNavigate('home')} className="hover:text-[#0a502c]">
            Home
          </button>
          <span>&gt;</span>
          <button onClick={() => onNavigate('import-landing')} className="hover:text-[#0a502c]">
            Import from US
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900">Request Wizard</span>
        </nav>

        {/* 2-Column Layout: Left Stepper Sidebar + Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Import Process Stepper Card */}
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">
                Import Process
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0a502c]">Request Details</h4>
                    <p className="text-[11px] text-gray-500">Tell us what you need</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Review Options</h4>
                    <p className="text-[11px] text-gray-500">We find the best cars</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Confirm &amp; Pay</h4>
                    <p className="text-[11px] text-gray-500">Confirm and secure</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">We Import &amp; Deliver</h4>
                    <p className="text-[11px] text-gray-500">We handle the rest</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 mb-1">Need Assistance?</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                Not sure about customs duty rates or US auction procedures? Speak directly with our US import specialists.
              </p>
              <a
                href="https://wa.me/2348123456789"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors mb-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with an Expert
              </a>
              <div className="text-center text-[11px] text-gray-600 flex items-center justify-center gap-1.5 pt-1">
                <Phone className="w-3 h-3 text-[#0a502c]" />
                <span>+234 812 345 6789</span>
              </div>
            </div>
          </aside>

          {/* Main Form Center */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 sm:p-8 shadow-xs">
              {/* Header Title */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Import from US
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Tell us what you need and we&apos;ll source the best options for you from verified US auctions.
                </p>
              </div>

              {/* Horizontal Stepper Progress */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 pb-6 border-b border-gray-100">
                <div className="text-center">
                  <div className="h-1.5 bg-[#0a502c] rounded-full mb-2" />
                  <span className="text-[11px] font-bold text-[#0a502c]">1. Request Details</span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-2" />
                  <span className="text-[11px] font-medium text-gray-400">2. Review Options</span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-2" />
                  <span className="text-[11px] font-medium text-gray-400">3. Confirm &amp; Pay</span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-2" />
                  <span className="text-[11px] font-medium text-gray-400">4. Delivery</span>
                </div>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Import Sourcing Request Received!
                  </h3>

                  {/* Tracking ID Badge */}
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold mx-auto">
                    <span>Tracking ID: <span className="font-mono text-emerald-700">{trackingId}</span></span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer"
                      title="Copy Tracking ID"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                    Thank you, {fullName}. Our Houston and Lagos procurement teams have received your {yearMin}-{yearMax} {make} {model} specification. We will compile 3 verified clean-title options with full CarFax history and landed cost breakdown within 6 hours.
                  </p>

                  <div className="pt-4 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => onNavigate('order-tracking')}
                      className="px-5 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      Track Order #{trackingId || 'SHA-2026'}
                    </button>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-5 py-2.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-200 cursor-pointer"
                    >
                      Submit Another Request
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                      {submitError}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Section 1: Vehicle Requirements */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                      1. Vehicle Requirements
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Vehicle Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Vehicle Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        >
                          <option>SUV</option>
                          <option>Sedan</option>
                          <option>Truck / Pickup</option>
                          <option>Coupe / Sport</option>
                          <option>Hatchback</option>
                        </select>
                      </div>

                      {/* Make */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Make <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={make}
                          onChange={(e) => setMake(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        >
                          <option>Toyota</option>
                          <option>Lexus</option>
                          <option>Mercedes-Benz</option>
                          <option>Honda</option>
                          <option>BMW</option>
                          <option>Ford</option>
                        </select>
                      </div>

                      {/* Model */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Model (Optional)
                        </label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g. RAV4, Camry, RX 350"
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Year Range */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Year Range <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={yearMin}
                            onChange={(e) => setYearMin(e.target.value)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-2 text-xs text-gray-800"
                          >
                            <option>2018</option>
                            <option>2019</option>
                            <option>2020</option>
                            <option>2021</option>
                            <option>2022</option>
                          </select>
                          <select
                            value={yearMax}
                            onChange={(e) => setYearMax(e.target.value)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-2 text-xs text-gray-800"
                          >
                            <option>2022</option>
                            <option>2023</option>
                            <option>2024</option>
                            <option>2025</option>
                          </select>
                        </div>
                      </div>

                      {/* Budget Range */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Budget Range (Total Landed Cost in Nigeria) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={budgetRange}
                          onChange={(e) => setBudgetRange(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        >
                          <option>₦15,000,000 - ₦25,000,000</option>
                          <option>₦20,000,000 - ₦40,000,000</option>
                          <option>₦40,000,000 - ₦65,000,000</option>
                          <option>₦65,000,000 - ₦100,000,000</option>
                          <option>Above ₦100,000,000</option>
                        </select>
                      </div>

                      {/* Transmission & Fuel */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Transmission</label>
                        <select
                          value={transmission}
                          onChange={(e) => setTransmission(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>Automatic</option>
                          <option>Manual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Fuel Type</label>
                        <select
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>Petrol</option>
                          <option>Hybrid</option>
                          <option>Diesel</option>
                          <option>Electric</option>
                        </select>
                      </div>

                      {/* Drive Type & Mileage */}
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Drive Type</label>
                        <select
                          value={driveType}
                          onChange={(e) => setDriveType(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>All Wheel Drive (AWD)</option>
                          <option>Front Wheel Drive (FWD)</option>
                          <option>Four Wheel Drive (4WD)</option>
                          <option>Rear Wheel Drive (RWD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">Mileage Preference</label>
                        <select
                          value={mileagePref}
                          onChange={(e) => setMileagePref(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>Up to 30,000 miles</option>
                          <option>Up to 60,000 miles</option>
                          <option>Up to 90,000 miles</option>
                          <option>Any Mileage</option>
                        </select>
                      </div>
                    </div>

                    {/* Must-Have Features */}
                    <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-800 mb-2">
                        Must-Have Features (Optional)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableFeatures.map((feat) => {
                          const isSelected = selectedFeatures.includes(feat);
                          return (
                            <button
                              key={feat}
                              type="button"
                              onClick={() => toggleFeature(feat)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                isSelected
                                  ? 'bg-[#0a502c] text-white border-[#0a502c]'
                                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {feat} {isSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Information */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                      2. Your Contact Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Additional Notes */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-gray-800">
                        3. Additional Information / Specific Requests (Optional)
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {additionalNotes.length}/500
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="e.g. Specific exterior color preferences, clean Carfax 1-owner only, or link to a particular auction lot you want us to bid on..."
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Privacy Notice & Submit */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Lock className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span>Your information is safe and secure. We never share your data.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Review Options</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  </form>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Bottom Trust Badges */}
        <div className="mt-16">
          <TrustBadges variant="import" />
        </div>
      </div>
    </div>
  );
};
