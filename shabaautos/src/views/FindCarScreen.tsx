import React, { useEffect, useState } from 'react';
import {
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  Lock,
  ChevronRight,
  Star,
  Sparkles,
  ShieldCheck,
  Check,
  Loader2,
  Copy,
} from 'lucide-react';
import { ScreenId } from '../types';
import { TrustBadges } from '../components/TrustBadges';
import { submitConcierge } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface FindCarScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const FindCarScreen: React.FC<FindCarScreenProps> = ({ onNavigate }) => {
  const [carType, setCarType] = useState('SUV');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('RAV4 or Highlander');
  const [yearMin, setYearMin] = useState('2020');
  const [yearMax, setYearMax] = useState('2023');
  const [budget, setBudget] = useState('₦30,000,000 - ₦50,000,000');
  const [fuel, setFuel] = useState('Petrol');
  const [transmission, setTransmission] = useState('Automatic');
  const [colorPref, setColorPref] = useState('Black, Grey or Silver');
  const [interiorPref, setInteriorPref] = useState('Leather preferred');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string>('');
  const [submitError, setSubmitError] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);
  const { user: authUser } = useAuthUser();

  useEffect(() => {
    if (authUser?.primaryEmailAddress?.emailAddress) {
      setEmail(authUser.primaryEmailAddress.emailAddress);
      setFullName(authUser.fullName || authUser.firstName + ' ' + authUser.lastName || '');
    }
    if (authUser?.primaryPhoneNumber?.phoneNumber) {
      setPhone(authUser.primaryPhoneNumber.phoneNumber);
    }
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await submitConcierge({
        fullName,
        phone,
        email,
        bodyType: carType,
        make,
        model,
        yearRange: `${yearMin}-${yearMax}`,
        budgetRange: budget,
        notes: `${notes ? notes + '. ' : ''}Color: ${colorPref}. Interior: ${interiorPref}. Transmission: ${transmission}. Fuel: ${fuel}`,
      });
      if (res && res.data && res.data.id) {
        setTicketId(res.data.id);
      }
      if (!res?.success || !res.data?.id) throw new Error(res?.message || 'Your request could not be submitted.');
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Your request could not be submitted. Please try again.');
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
          <span className="font-semibold text-gray-900">Find a Car for Me</span>
        </nav>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: We Find You Relax (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Personalized Concierge
              </span>
              <h3 className="text-base font-black text-gray-900 mb-2">We Find. You Relax.</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Don&apos;t waste weekends visiting dusty car lots or worrying about fraudulent sellers. Our procurement agents do all the hard work for you.
              </p>

              <div className="space-y-2.5 text-xs text-gray-700 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0 mt-0.5" />
                  <span>Market research &amp; dealer sourcing</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0 mt-0.5" />
                  <span>Price negotiation for best value</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0 mt-0.5" />
                  <span>150-point diagnostic inspection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0 mt-0.5" />
                  <span>Customs paperwork verification</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0a502c] flex-shrink-0 mt-0.5" />
                  <span>Doorstep delivery anywhere in Nigeria</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <a
                  href="https://wa.me/2348123456789"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat with a Sourcing Agent
                </a>
                <div className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1.5 pt-1">
                  <Phone className="w-3.5 h-3.5 text-[#0a502c]" />
                  <span>+234 812 345 6789</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Main Form (6 Cols) */}
          <main className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 sm:p-8 shadow-xs">
              <div className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Find a Car for Me
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Tell us what you need and we&apos;ll find the perfect car that matches your exact requirements and budget.
                </p>
              </div>

              {/* 4-Step Progress Indicator */}
              <div className="grid grid-cols-4 gap-2 mb-8 pb-4 border-b border-gray-100">
                <div className="text-center">
                  <div className="h-1.5 bg-[#0a502c] rounded-full mb-1.5" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#0a502c]">
                    1. Tell Us
                  </span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-1.5" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                    2. We Search
                  </span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-1.5" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                    3. You Review
                  </span>
                </div>
                <div className="text-center">
                  <div className="h-1.5 bg-gray-200 rounded-full mb-1.5" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                    4. We Deliver
                  </span>
                </div>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0a502c] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Car Search Order Initiated!
                  </h3>

                  {/* Concierge Ticket */}
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold mx-auto">
                    <span>Concierge Ticket: <span className="font-mono text-emerald-700">{ticketId}</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(ticketId);
                        setCopiedTicket(true);
                        setTimeout(() => setCopiedTicket(false), 2000);
                      }}
                      className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer"
                      title="Copy Ticket ID"
                    >
                      {copiedTicket ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                    Thank you, <span className="font-semibold text-gray-900">{fullName}</span>. Our procurement team has commenced searching verified inventory across Lagos, Abuja, and US partner auctions for your <span className="font-semibold text-gray-900">{make} {model}</span> ({yearMin}–{yearMax}) within your budget of <span className="font-semibold text-gray-900">{budget}</span>. We will share 3 shortlisted vehicles with inspection reports within 24 hours.
                  </p>
                  <div className="pt-4 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => onNavigate('home')}
                      className="px-5 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Homepage
                    </button>
                    <button
                      onClick={() => onNavigate('buy-cars')}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Browse Current Stock
                    </button>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Submit Another Search
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
                  <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Section 1: Tell Us What You Need */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                      1. What kind of car are you looking for?
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Body Type *
                        </label>
                        <select
                          value={carType}
                          onChange={(e) => setCarType(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>SUV</option>
                          <option>Sedan</option>
                          <option>Hatchback</option>
                          <option>Pickup Truck</option>
                          <option>Luxury Coupe</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">Make *</label>
                        <select
                          value={make}
                          onChange={(e) => setMake(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>Toyota</option>
                          <option>Lexus</option>
                          <option>Mercedes-Benz</option>
                          <option>Honda</option>
                          <option>Range Rover</option>
                          <option>Hyundai</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Model Preference
                        </label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g. RAV4, Highlander, RX 350, Camry"
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Year Range
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

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Target Budget *
                        </label>
                        <select
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          <option>Under ₦20,000,000</option>
                          <option>₦20,000,000 - ₦35,000,000</option>
                          <option>₦30,000,000 - ₦50,000,000</option>
                          <option>₦50,000,000 - ₦80,000,000</option>
                          <option>Above ₦80,000,000</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Additional Preferences */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                      2. Additional Preferences
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Color Preference
                        </label>
                        <input
                          type="text"
                          value={colorPref}
                          onChange={(e) => setColorPref(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Interior Preference
                        </label>
                        <input
                          type="text"
                          value={interiorPref}
                          onChange={(e) => setInteriorPref(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Contact Info */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                      3. Your Contact Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-800">
                          Anything else we should know? (Optional)
                        </label>
                        <span className="text-[10px] text-gray-400">{notes.length}/500</span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Must have panoramic roof, need it within 2 weeks for family trip..."
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching Inventory...</span>
                        </>
                      ) : (
                        <>
                          <span>Start Finding My Car</span>
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

          {/* Right Column: How it Works & Testimonials (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            {/* How it Works */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                How It Works
              </h4>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">You Tell Us</span>
                    <p className="text-[11px] text-gray-500">Provide your specs and budget.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">We Search</span>
                    <p className="text-[11px] text-gray-500">
                      We scan nationwide dealer stocks and US auctions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">You Choose</span>
                    <p className="text-[11px] text-gray-500">
                      Review inspected shortlists and select the best car.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a502c] font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    4
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">We Deliver</span>
                    <p className="text-[11px] text-gray-500">
                      Full inspection, documentation &amp; doorstep handover.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-1 text-amber-500 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                &ldquo;ShabaAutos found me a pristine 2021 Lexus RX 350 within 4 days. The car was inspected and delivered to my house in Lekki. Truly exceptional service!&rdquo;
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-xs">
                  AT
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Adebayo T.</h5>
                  <p className="text-[10px] text-gray-500">Lekki Phase 1, Lagos</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom 5 Trust Badges */}
        <div className="mt-16">
          <TrustBadges variant="home" />
        </div>
      </div>
    </div>
  );
};
