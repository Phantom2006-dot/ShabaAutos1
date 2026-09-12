import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Clock,
  ShieldCheck,
  CircleDollarSign,
  Phone,
  MessageSquare,
  Sparkles,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import { ScreenId } from '../types';
import { TrustBadges } from '../components/TrustBadges';
import { submitSellCarValuation } from '../services/api';

interface SellCarScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SellCarScreen: React.FC<SellCarScreenProps> = ({ onNavigate }) => {
  const [agreementChecked, setAgreementChecked] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');
  const [submitError, setSubmitError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Edit states for sections
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [isEditingCondition, setIsEditingCondition] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Form State
  const [carData, setCarData] = useState({
    make: 'Toyota',
    model: 'Camry',
    year: '2020',
    trim: 'XLE',
    mileage: '45000',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    location: 'Lekki, Lagos',
    askingPrice: '15000000',
  });

  const [conditionData, setConditionData] = useState({
    condition: 'Good',
    issues: 'No major issues reported. Regular servicing maintained.',
  });

  const [contactData, setContactData] = useState({
    fullName: 'John Doe',
    phone: '+234 810 123 4567',
    email: 'johndoe@gmail.com',
  });

  const handleSubmitValuation = async () => {
    if (!agreementChecked) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await submitSellCarValuation({
        year: parseInt(carData.year) || 2020,
        make: carData.make,
        model: carData.model,
        mileage: parseInt(carData.mileage) || 45000,
        condition: conditionData.condition,
        sellerName: contactData.fullName,
        phone: contactData.phone,
        email: contactData.email,
        location: carData.location,
        askingPriceNgn: parseInt(carData.askingPrice) || 15000000,
      });
      if (!res?.success || !res.data?.id) throw new Error(res?.message || 'Vehicle valuation could not be submitted.');
      setSubmissionId(res.data.id);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Vehicle valuation could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          <button onClick={() => onNavigate('sell-car')} className="hover:text-[#0a502c]">
            Sell Your Car
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900">Review &amp; Submit</span>
        </nav>

        {/* 3-Column Layout: Left Stepper / Center Content / Right Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar Stepper (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">
                Sell Your Car
              </h3>
              <div className="space-y-4">
                {/* Step 1 Done */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">1. Car Details</h4>
                    <p className="text-[11px] text-gray-500">Toyota Camry 2020</p>
                  </div>
                </div>

                {/* Step 2 Done */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">2. Condition</h4>
                    <p className="text-[11px] text-gray-500">Good Condition</p>
                  </div>
                </div>

                {/* Step 3 Done */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">3. Your Details</h4>
                    <p className="text-[11px] text-gray-500">John Doe (+234...)</p>
                  </div>
                </div>

                {/* Step 4 Active */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0a502c]">4. Review &amp; Submit</h4>
                    <p className="text-[11px] text-emerald-700 font-semibold">Almost there!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-gray-900 mb-1">Need help selling?</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
                Our vehicle appraisers can come directly to your office or home in Lagos, Abuja, or Port Harcourt.
              </p>
              <a
                href="https://wa.me/2348123456789"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with Appraiser
              </a>
            </div>
          </aside>

          {/* Center Main Content (6 Cols) */}
          <main className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 sm:p-7 shadow-xs">
              <div className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Review &amp; Submit
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Please review your information carefully before submitting for certified appraisal.
                </p>
              </div>

              {submitError && !submitted && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                  {submitError}
                </div>
              )}

              {submitted ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Vehicle Valuation Request Submitted!
                  </h3>

                  {/* Valuation Ticket Badge */}
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold mx-auto">
                    <span>Valuation Ticket: <span className="font-mono text-emerald-700">{submissionId}</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(submissionId);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer"
                      title="Copy Ticket ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                    We have registered your {carData.year} {carData.make} {carData.model} {carData.trim}. Our valuation team will review market comps and call you at {contactData.phone} within 2 hours with our firm cash purchase offer.
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => onNavigate('home')}
                      className="px-5 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Homepage
                    </button>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Edit Submission
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Card 1: Car Details */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Car Details
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingCar(!isEditingCar)}
                        className="text-xs font-semibold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isEditingCar ? (
                          <>
                            <Check className="w-3 h-3" /> Done
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-3 h-3" /> Edit
                          </>
                        )}
                      </button>
                    </div>

                    {isEditingCar ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Make</label>
                          <input
                            type="text"
                            value={carData.make}
                            onChange={(e) => setCarData({ ...carData, make: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Model</label>
                          <input
                            type="text"
                            value={carData.model}
                            onChange={(e) => setCarData({ ...carData, model: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Year</label>
                          <input
                            type="text"
                            value={carData.year}
                            onChange={(e) => setCarData({ ...carData, year: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Mileage (miles)</label>
                          <input
                            type="text"
                            value={carData.mileage}
                            onChange={(e) => setCarData({ ...carData, mileage: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Location</label>
                          <input
                            type="text"
                            value={carData.location}
                            onChange={(e) => setCarData({ ...carData, location: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Asking Price (₦)</label>
                          <input
                            type="text"
                            value={carData.askingPrice}
                            onChange={(e) => setCarData({ ...carData, askingPrice: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px] block">Make &amp; Model</span>
                          <span className="font-bold text-gray-900">{carData.make} {carData.model}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Year &amp; Trim</span>
                          <span className="font-bold text-gray-900">{carData.year} {carData.trim}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Mileage</span>
                          <span className="font-bold text-gray-900">{parseInt(carData.mileage || '0').toLocaleString()} miles</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Transmission</span>
                          <span className="font-bold text-gray-900">{carData.transmission}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Fuel Type</span>
                          <span className="font-bold text-gray-900">{carData.fuelType}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Location</span>
                          <span className="font-bold text-gray-900">{carData.location}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 text-[11px] block">Asking Price</span>
                          <span className="font-bold text-emerald-800">₦{parseInt(carData.askingPrice || '0').toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Condition */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Condition
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingCondition(!isEditingCondition)}
                        className="text-xs font-semibold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isEditingCondition ? (
                          <>
                            <Check className="w-3 h-3" /> Done
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-3 h-3" /> Edit
                          </>
                        )}
                      </button>
                    </div>

                    {isEditingCondition ? (
                      <div className="pt-3 space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Overall Condition</label>
                          <select
                            value={conditionData.condition}
                            onChange={(e) => setConditionData({ ...conditionData, condition: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-gray-900"
                          >
                            <option value="Excellent">Excellent (Like new, zero scratches)</option>
                            <option value="Good">Good (Minor wear, mechanically sound)</option>
                            <option value="Fair">Fair (Needs cosmetic touchups)</option>
                            <option value="Needs Work">Needs Work</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Damage / Notes</label>
                          <input
                            type="text"
                            value={conditionData.issues}
                            onChange={(e) => setConditionData({ ...conditionData, issues: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 font-medium text-gray-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Overall Condition</span>
                          <span className="font-bold text-gray-900 bg-emerald-100 text-[#0a502c] px-2 py-0.5 rounded-sm">
                            {conditionData.condition}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Damage or Issues</span>
                          <span className="font-semibold text-gray-800">{conditionData.issues}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Your Details */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Your Details
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(!isEditingContact)}
                        className="text-xs font-semibold text-[#0a502c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isEditingContact ? (
                          <>
                            <Check className="w-3 h-3" /> Done
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-3 h-3" /> Edit
                          </>
                        )}
                      </button>
                    </div>

                    {isEditingContact ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={contactData.fullName}
                            onChange={(e) => setContactData({ ...contactData, fullName: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={contactData.phone}
                            onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Email</label>
                          <input
                            type="email"
                            value={contactData.email}
                            onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 font-bold text-gray-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                        <div>
                          <span className="text-gray-500 text-[11px] block">Full Name</span>
                          <span className="font-bold text-gray-900">{contactData.fullName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Phone Number</span>
                          <span className="font-bold text-gray-900">{contactData.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[11px] block">Email Address</span>
                          <span className="font-bold text-gray-900">{contactData.email}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmation Checkbox */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreementChecked}
                      onChange={(e) => setAgreementChecked(e.target.checked)}
                      className="mt-0.5 rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      By submitting, you confirm that all information provided is accurate to the best of your knowledge. We&apos;ll use this information to give you the most accurate valuation offer.
                    </span>
                  </label>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => onNavigate('home')}
                      className="px-5 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button
                      type="button"
                      disabled={!agreementChecked || isSubmitting}
                      onClick={handleSubmitValuation}
                      className="px-8 py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Valuation...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Car for Valuation</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right Sidebar: Value Estimate & Timeline (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Expected Valuation Range Card */}
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Car Summary
              </span>
              <div className="mt-3 rounded-lg overflow-hidden h-32 bg-gray-100 mb-3">
                <img
                  src="https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=600&q=80"
                  alt="Toyota Camry 2020"
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-bold text-sm text-gray-900">Toyota Camry 2020</h4>
              <p className="text-xs text-gray-500 mt-0.5">45,000 miles • Condition: Good</p>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-600 block">Expected Offer Range:</span>
                <div className="text-lg font-black text-[#0a502c] mt-0.5">
                  ₦13,000,000 - ₦16,500,000
                </div>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Final offer will be confirmed after free on-site physical and diagnostic inspection.
                </p>
              </div>
            </div>

            {/* What Happens Next Timeline */}
            <div className="bg-white rounded-xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                What Happens Next?
              </h4>
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">We&apos;ll Review Your Details</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Our valuation team analyzes recent auction and dealer transaction prices.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">You&apos;ll Get a Formal Offer</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Receive an instant guaranteed price quote valid for 7 days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">Free Inspection</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      We inspect at your doorstep anywhere in Lagos, Abuja, or Port Harcourt.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">Get Paid Fast</h5>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Instant direct bank transfer within 30 minutes of document sign-off.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Trust Badges */}
        <div className="mt-16">
          <TrustBadges variant="home" />
        </div>
      </div>
    </div>
  );
};
