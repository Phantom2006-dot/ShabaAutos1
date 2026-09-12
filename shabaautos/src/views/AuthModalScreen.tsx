import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Headphones,
  Car as CarIcon,
  CreditCard,
  Truck,
  Wrench,
  ArrowRight,
  X,
  AlertCircle,
  KeyRound,
  User,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { ScreenId, AppUserRole } from '../types';
import { useAuthUser } from '../context/AuthContext';

interface AuthModalScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onClose?: () => void;
  previousScreen?: ScreenId;
}

export const AuthModalScreen: React.FC<AuthModalScreenProps> = ({
  onNavigate,
  onClose,
  previousScreen = 'home',
}) => {
  const {
    user,
    isSignedIn,
    signInWithPassword,
    signUpWithEmail,
    verifyEmailOtp,
    requestPasswordReset,
    confirmPasswordReset,
    signOut,
    switchDemoRole,
    isDemoMode,
    pendingVerification,
    clearPendingVerification,
  } = useAuthUser();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSuccessfulAuth = () => {
    // Navigate back to the screen user came from, or saved-compare / home
    if (onClose) {
      onClose();
    } else {
      const destination = previousScreen === 'auth' ? 'saved-compare' : previousScreen;
      onNavigate(destination);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isResetMode) {
        if (resetStep === 'request') {
          const res = await requestPasswordReset(email);
          if (res.success) {
            setSuccessMessage('Password reset code sent! Please check your email inbox.');
            setResetStep('confirm');
          } else {
            setErrorMessage(res.error || 'Failed to send reset code');
          }
        } else {
          const res = await confirmPasswordReset(otpCode, newPassword);
          if (res.success) {
            setSuccessMessage('Password successfully updated! Signing in...');
            setTimeout(() => handleSuccessfulAuth(), 1200);
          } else {
            setErrorMessage(res.error || 'Failed to reset password');
          }
        }
        setLoading(false);
        return;
      }

      if (pendingVerification) {
        const res = await verifyEmailOtp(otpCode);
        if (res.success) {
          setSuccessMessage('Verification confirmed! Welcome to ShabaAutos.');
          setTimeout(() => handleSuccessfulAuth(), 800);
        } else {
          setErrorMessage(res.error || 'Invalid verification code');
        }
        setLoading(false);
        return;
      }

      if (isSignUp) {
        // Sign up
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name');
          setLoading(false);
          return;
        }
        if (!phone.trim()) {
          setErrorMessage('Please enter your Nigerian phone number (+234...)');
          setLoading(false);
          return;
        }

        const res = await signUpWithEmail({
          email: email.trim(),
          pass: password,
          fullName: fullName.trim(),
          phone: phone.trim(),
        });

        if (res.success) {
          if (res.requiresVerification) {
            setSuccessMessage('Verification code sent to your email. Enter code below.');
          } else {
            setSuccessMessage('Account created successfully!');
            setTimeout(() => handleSuccessfulAuth(), 800);
          }
        } else {
          setErrorMessage(res.error || 'Failed to register account');
        }
      } else {
        // Sign in
        const res = await signInWithPassword(email.trim(), password);
        if (res.success) {
          setSuccessMessage('Signed in successfully! Redirecting...');
          setTimeout(() => handleSuccessfulAuth(), 600);
        } else {
          setErrorMessage(res.error || 'Invalid email or password');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setErrorMessage('');
    // For demo or live Clerk OAuth
    try {
      if (isDemoMode) {
        await signInWithPassword(`google.user@shabaautos.com`, 'demo123456');
        setSuccessMessage(`Signed in via ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);
        setTimeout(() => handleSuccessfulAuth(), 600);
      } else {
        // In live mode Clerk handles OAuth redirect
        setErrorMessage('OAuth redirecting to provider authentication...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Social sign-in unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen auth-screen flex flex-col justify-between relative">
      {/* Top Banner: Navigation back / Close Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full flex items-center justify-between">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : onNavigate(previousScreen))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
          <span>Return to {previousScreen.replace('-', ' ')}</span>
        </button>

        {isDemoMode && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#0e7c3a]" />
            <span className="text-[11px] font-bold text-[#0e7c3a]">
              Clerk Test Environment Active
            </span>
          </div>
        )}
      </div>

      <div className="auth-mobile-brand sm:hidden">
        <img src="/assets/shabaautos-logo-new.png" alt="ShabaAutos - Your Car. Your Choice." />
        <span><ShieldCheck className="w-4 h-4" /> Safe &amp; Secure</span>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Automotive Showcase & Value Proposition */}
          <div className="lg:col-span-7 flex flex-col justify-between order-2 lg:order-1">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full mb-3 text-xs font-bold text-[#0e7c3a]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Nigeria's Verified Automotive Marketplace
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-950 tracking-tight leading-[1.1] mb-3">
                Welcome to <br />
                <span className="text-[#0e7c3a]">ShabaAutos</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base font-normal mb-6 max-w-xl leading-relaxed">
                Your one-stop platform to buy, rent, or import quality vehicles with guaranteed inspection and real-time shipment transparency.
              </p>

              {/* 3 Core Value Points */}
              <div className="space-y-3.5 mb-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/70 text-[#0e7c3a] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Verified 150-Point Inspection</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Every engine, chassis, and VIN authenticated before listing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/70 text-[#0e7c3a] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Secure Escrow & Clear Duty Pricing</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Transparent Nigeria Customs calculation and escrow milestone payouts.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/70 text-[#0e7c3a] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Dedicated Sourcing Concierge</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Direct WhatsApp & phone coordination with certified automotive specialists.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Automotive Showcase Image with Metrics Card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm bg-white mt-1">
              <img
                src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=85"
                alt="Silver Luxury SUV on Urban Promenade"
                className="w-full h-56 sm:h-64 lg:h-76 object-cover object-center"
              />

              {/* Floating Bottom Card: 3 Key Metrics */}
              <div className="bg-white/95 backdrop-blur-xs border-t border-slate-200/80 px-4 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0e7c3a] border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Trusted Platform</h4>
                    <p className="text-[11px] text-slate-500 leading-tight">Over 2,400+ satisfied Nigerian drivers</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 pt-2.5 sm:pt-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0e7c3a] border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Wide Inventory</h4>
                    <p className="text-[11px] text-slate-500 leading-tight">Tokunbo, Brand New & Fleet Rentals</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 pt-2.5 sm:pt-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0e7c3a] border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Lagos & Abuja Hubs</h4>
                    <p className="text-[11px] text-slate-500 leading-tight">Same-day inspection & handover</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Custom Auth Modal Card */}
          <div className="lg:col-span-5 flex flex-col justify-start order-1 lg:order-2">
            {/* Demo Personas Quick-Switcher */}
            {isDemoMode && (
              <div className="mb-4 bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Preview Persona Switcher
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Current: <strong className="text-white uppercase">{user?.role || 'Guest'}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  Test role-based access control (Customer, Dealership Staff, Super Admin):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['customer', 'staff', 'admin'] as AppUserRole[]).map((r) => {
                    const active = user?.role === r && isSignedIn;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          switchDemoRole(r);
                          setSuccessMessage(`Switched active profile to ${r.toUpperCase()}`);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer capitalize flex items-center justify-center gap-1 ${
                          active
                            ? 'bg-[#0e7c3a] text-white shadow-sm ring-2 ring-emerald-300'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                {isSignedIn && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate max-w-[190px]">
                      {user?.fullName} ({user?.email})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSuccessfulAuth()}
                      className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Continue <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Auth Form Card */}
            <div className="bg-white rounded-2xl border shaba-surface border-slate-200/90 shadow-sm p-6 sm:p-8">
              {/* Tabs: Sign In / Create Account (Hidden during reset or OTP) */}
              {!isResetMode && !pendingVerification && (
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 pb-3 text-center text-sm font-bold transition-all relative cursor-pointer ${
                      !isSignUp ? 'text-[#0e7c3a]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                    {!isSignUp && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0e7c3a] rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`flex-1 pb-3 text-center text-sm font-bold transition-all relative cursor-pointer ${
                      isSignUp ? 'text-[#0e7c3a]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Create Account
                    {isSignUp && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0e7c3a] rounded-full" />
                    )}
                  </button>
                </div>
              )}

              {/* Card Heading */}
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isResetMode
                    ? resetStep === 'request'
                      ? 'Reset Password'
                      : 'Create New Password'
                    : pendingVerification
                    ? 'Verify Your Email'
                    : isSignUp
                    ? 'Create Account'
                    : 'Sign In'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {isResetMode
                    ? resetStep === 'request'
                      ? 'Enter your registered email to receive a recovery code.'
                      : 'Enter the code received and choose a secure password.'
                    : pendingVerification
                    ? `Enter the 6-digit code sent to ${pendingVerification.identifier}.`
                    : isSignUp
                    ? 'Fill in your details to buy, rent, or import with confidence.'
                    : 'Welcome back! Please enter your credentials.'}
                </p>
              </div>

              {/* Status Alert Banners */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-[#0e7c3a] animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#0e7c3a]" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Verification Code Step */}
                {(pendingVerification || (isResetMode && resetStep === 'confirm')) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                      />
                    </div>
                  </div>
                )}

                {/* 2. New Password for Reset Mode */}
                {isResetMode && resetStep === 'confirm' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Normal Sign Up fields */}
                {isSignUp && !pendingVerification && !isResetMode && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tunde Adeyemi"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Nigerian Phone Number
                        </label>
                        <span className="text-[10px] text-slate-400">Accepts 080... or +234...</span>
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0803 123 4567 or +234 803 123 4567"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 4. Email address field (shown when not in OTP confirm) */}
                {!pendingVerification && !(isResetMode && resetStep === 'confirm') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Password field */}
                {!pendingVerification && !isResetMode && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20 focus:border-[#0e7c3a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Forgot Password link in Sign In mode */}
                {!isSignUp && !isResetMode && !pendingVerification && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setResetStep('request');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-xs font-bold text-[#0e7c3a] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Cancel Reset / Return to Login button */}
                {isResetMode && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}

                {/* Cancel pending verification */}
                {pendingVerification && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        clearPendingVerification();
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel & Change Details
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0a502c] hover:bg-[#07391f] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : isResetMode ? (
                    resetStep === 'request' ? 'Send Recovery Code' : 'Save New Password'
                  ) : pendingVerification ? (
                    'Confirm Code & Access Account'
                  ) : isSignUp ? (
                    'Create Account'
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Social Login Section (only on normal sign-in / sign-up) */}
              {!isResetMode && !pendingVerification && (
                <>
                  <div className="relative flex py-4 items-center my-1">
                    <div className="grow border-t border-slate-200" />
                    <span className="shrink mx-3 text-xs text-slate-400 font-medium">
                      or continue with
                    </span>
                    <div className="grow border-t border-slate-200" />
                  </div>

                  {/* Social Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSocialAuth('google')}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Google
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSocialAuth('facebook')}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                  </div>

                  {/* Bottom switch link */}
                  <p className="text-center text-xs text-slate-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="font-bold text-[#0e7c3a] hover:underline cursor-pointer"
                    >
                      {isSignUp ? 'Sign In' : 'Create Account'}
                    </button>
                  </p>
                </>
              )}
            </div>

            {/* 3 Security Badges Under Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Lock className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold leading-tight">Clerk Identity Protected</h5>
                  <p className="text-[10px] text-slate-500">256-bit encrypted sessions</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold leading-tight">Instant Verification</h5>
                  <p className="text-[10px] text-slate-500">Fast OTP authentication</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Headphones className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold leading-tight">Automotive Concierge</h5>
                  <p className="text-[10px] text-slate-500">+234 810 123 4567</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4-Pillar Trust Bar */}
      <div className="border-t border-slate-200 bg-white py-5 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#0e7c3a] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">7-Day Inspection Guarantee</h5>
              <p className="text-[11px] text-slate-500">Total peace of mind before purchase</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#0e7c3a] flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">Nationwide Delivery</h5>
              <p className="text-[11px] text-slate-500">Delivered directly to your residence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#0e7c3a] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">Flexible Financing & Escrow</h5>
              <p className="text-[11px] text-slate-500">Multiple secure payment options</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#0e7c3a] flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">After-Sales Hub Support</h5>
              <p className="text-[11px] text-slate-500">Maintenance & parts sourcing network</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
