import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Gauge,
  Fuel,
  Star,
  Building,
  Headphones,
  CreditCard,
  Truck,
  Wrench,
  Car as CarIcon,
  X,
  Check,
  Loader2,
  Copy,
  ArrowLeft,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { ScreenId } from '../types';
import { bookVehicleRental, RentalVehicleApiRecord, fetchPublicSettings } from '../services/api';
import { useAuthUser } from '../context/AuthContext';
import bmwHeroBlack from '../assets/images/bmw_hero_coupe_1789257165323.jpg';
import bmwHeroSilver from '../assets/images/bmw_silver_coupe_1789257180258.jpg';

interface RentCarScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const RentCarScreen: React.FC<RentCarScreenProps> = ({ onNavigate }) => {
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const [pickupLocation, setPickupLocation] = useState('Lagos - Murtala Muhammed Airport (LOS)');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [dropoffDate, setDropoffDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toISOString().slice(0, 10);
  });
  const [dropoffTime, setDropoffTime] = useState('10:00 AM');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [rentalCars, setRentalCars] = useState<RentalVehicleApiRecord[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(true);
  const [rentalLoadError, setRentalLoadError] = useState('');

  // Booking Modal State
  const [activeCarForBooking, setActiveCarForBooking] = useState<any | null>(null);
  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterEmail, setRenterEmail] = useState('');
  const [withChauffeur, setWithChauffeur] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<any | null>(null);
  const [copiedBookingId, setCopiedBookingId] = useState(false);

  // Prefill renter contact from the real authenticated user — never a fake persona。


  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      setRenterName((prev) => prev || user.fullName || '');
      setRenterPhone((prev) => prev || user.phone || '');
      setRenterEmail((prev) => prev || user.email || '');
    }
  }, [isLoaded, isSignedIn, user]);

  // Hero Carousel State
  const [heroSlide, setHeroSlide] = useState(0);
  const [isHeroCarouselHovered, setIsHeroCarouselHovered] = useState(false);
  const [chauffeurFeePerDay, setChauffeurFeePerDay] = useState<number>(25000);

  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((settings) => {
      if (!active) return;
      const raw = settings['rental.chauffeur_fee_day']?.value;
      if (typeof raw === 'number') setChauffeurFeePerDay(raw);
      else if (typeof raw === 'string' && !Number.isNaN(Number(raw))) setChauffeurFeePerDay(Number(raw));
    });
    return () => { active = false; };
  }, []);

  const heroSlides = [
    {
      image: bmwHeroBlack,
      alt: 'Black Futuristic BMW Concept Coupe for Rent',
      title: 'BMW Vision Concept Coupe',
      subtitle: 'VIP Chauffeur & Daily Executive Rental',
      tag: 'Executive Fleet',
    },
    {
      image: bmwHeroSilver,
      alt: 'Silver BMW M-Series Sports Coupe for Rent',
      title: 'BMW M-Series Coupe',
      subtitle: 'Precision Performance for Special Events',
      tag: 'Premium Rental',
    },
  ];

  useEffect(() => {
    if (isHeroCarouselHovered) return;
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isHeroCarouselHovered, heroSlides.length]);

  useEffect(() => {
    let active = true;
    setIsLoadingCars(true);
    fetch('/api/rentals/vehicles')
      .then(async (response) => {
        const payload = await response.json();
        const data = Array.isArray(payload.data) ? payload.data : [];
        if (!active || data.length === 0) throw new Error('Rental inventory unavailable');
        setRentalCars(data);
        setRentalLoadError('');
      })
      .catch(() => {
        if (active) setRentalLoadError('Rental inventory is temporarily unavailable. Please try again.');
      })
      .finally(() => active && setIsLoadingCars(false));
    return () => {
      active = false;
    };
  }, []);

  // Calculate rental duration in days
  const calculateDays = () => {
    try {
      const d1 = new Date(pickupDate).getTime();
      const d2 = new Date(dropoffDate).getTime();
      const diff = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const days = calculateDays();

  const handleStartBooking = (car: any) => {
    setActiveCarForBooking(car);
    setBookingResult(null);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCarForBooking) return;
    setIsSubmittingBooking(true);
    try {
      const res = await bookVehicleRental({
        carId: activeCarForBooking.id,
        carName: activeCarForBooking.name,
        dailyRateNgn: activeCarForBooking.pricePerDayNgn,
        pickupDate,
        dropoffDate,
        pickupLocation,
        withChauffeur,
        renterName,
        phone: renterPhone,
        email: renterEmail,
        days,
      });
      if (!res.success) throw new Error(res.message || 'Rental booking failed');
      setBookingResult(res.data || res);
    } catch (err: any) {
      setBookingResult({ error: err.message || 'The rental booking could not be completed. Please try again.' });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleSearchScroll = () => {
    const el = document.getElementById('rental-inventory-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredCars = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rentalCars.filter((car) => {
      const matchesCategory = selectedCategory === 'All' || car.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesQuery = !query || `${car.name} ${car.category} ${car.fuel} ${car.location}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery && car.status !== 'retired' && car.available !== false;
    });
  }, [rentalCars, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen rent-screen font-sans">
      <section className="rent-mobile-page sm:hidden font-sans">
        <div className="rent-mobile-topbar">
          <button type="button" onClick={() => onNavigate('home')} aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></button>
          <div><small>SHABAAUTOS RENTALS</small><strong>Find your ride</strong></div>
          <button type="button" onClick={() => onNavigate('find-car')} aria-label="Need help"><Headphones className="w-5 h-5" /></button>
        </div>
        <div className="rent-mobile-intro"><p>READY WHEN YOU ARE</p><h1>Move freely.<br /><span>Rent with ease.</span></h1><small>Comfortable, well-maintained cars for every kind of day.</small></div>
        <div className="rent-mobile-booking-card">
          <div className="rent-mobile-booking-label"><Calendar className="w-4 h-4" /> Plan your trip</div>
          <label><span>Pick-up location</span><select value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}><option>Lagos - Airport (LOS)</option><option>Lagos - Victoria Island / Lekki</option><option>Abuja - Airport (ABV)</option></select></label>
          <div className="rent-mobile-date-grid"><label><span>Pick-up</span><input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} /></label><label><span>Return</span><input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} /></label></div>
          <button type="button" onClick={handleSearchScroll}><Search className="w-4 h-4" /> Find available cars</button>
        </div>
        <div className="rent-mobile-section-head"><div><small>CHOOSE YOUR STYLE</small><h2>Browse by category</h2></div><SlidersHorizontal className="w-4 h-4" /></div>
        <div className="rent-mobile-categories">{['All', 'SUV', 'Sedan', 'Luxury', 'Executive'].map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={selectedCategory === category ? 'is-active' : ''}>{category}</button>)}</div>
        <div id="rent-mobile-inventory" className="rent-mobile-inventory-head"><div><small>AVAILABLE NOW</small><h2>Popular rentals</h2></div><span>{filteredCars.length} cars</span></div>
        {isLoadingCars ? <div className="rent-mobile-loading">Loading the rental fleet...</div> : rentalLoadError ? <div className="rent-mobile-loading">{rentalLoadError}</div> : <div className="rent-mobile-car-list">{filteredCars.map((car) => <article key={car.id} className="rent-mobile-car-card"><div className="rent-mobile-car-image"><img src={car.imageUrl} alt={car.name} /><span>{car.category}</span><b><Star className="w-3 h-3 fill-current" /> {car.rating}</b></div><div className="rent-mobile-car-body"><div><h3>{car.name}</h3><p>{car.transmission} · {car.fuel} · {car.seats} seats</p></div><strong>₦{car.pricePerDayNgn.toLocaleString()}<small>/day</small></strong></div><div className="rent-mobile-car-footer"><span><ShieldCheck className="w-3 h-3" /> Insured &amp; verified</span><button type="button" onClick={() => handleStartBooking(car)}>Book now</button></div></article>)}</div>}
        <div className="rent-mobile-trust"><CheckCircle2 className="w-5 h-5" /><div><strong>Everything you need, included</strong><small>Transparent rates, roadside support and flexible cancellation.</small></div></div>
      </section>
      {/* Daylight Hero Section matching Web8.png */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef3f0] to-[#f4f7f5] pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-20 border-b border-slate-200/80">
        <div className="shaba-ambient shaba-ambient--one" aria-hidden="true" />
        {/* Background Scenic Landscape */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2000&q=80"
            alt="Scenic City Skyline"
            className="w-full h-full object-cover object-center mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4f7f5] via-[#f4f7f5]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-5">
              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black text-slate-950 tracking-tight leading-[1.15] sm:leading-[1.1]">
                Rent the <span className="text-[#0e7c3a]">Perfect Car</span> <br className="hidden sm:inline" />
                for Any Occasion
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Affordable rates, flexible plans and quality vehicles delivered to you.
              </p>

              {/* 3 Badges matching Web8.png */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-2xs">
                  <Calendar className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Flexible Rental Plans
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Daily, weekly or monthly
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Insurance Included
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Your safety is our priority
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-2xs">
                  <MapPin className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      Doorstep Delivery
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      We bring the car to you
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Car Carousel (BMW Coupe Edition) - Compact & Proportional */}
            <div className="lg:col-span-6 flex justify-center relative">
              <div
                className="relative w-full max-w-[540px] aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-900 group"
                onMouseEnter={() => setIsHeroCarouselHovered(true)}
                onMouseLeave={() => setIsHeroCarouselHovered(false)}
              >
                {/* Slides with Cross-Fade Transition */}
                {heroSlides.map((slide, index) => {
                  const isActive = heroSlide === index;
                  return (
                    <div
                      key={slide.title}
                      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      <img
                        src={slide.image}
                        alt={slide.alt}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${
                          isActive ? 'scale-100' : 'scale-105'
                        }`}
                      />

                      {/* Subtle Gradient for Depth & Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

                      {/* Top Right Tag Badge */}
                      <div className="absolute top-3.5 right-3.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-black/60 backdrop-blur-md text-emerald-400 border border-white/15 shadow-sm">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          {slide.tag}
                        </span>
                      </div>

                      {/* Bottom Caption Overlay */}
                      <div className="absolute bottom-3 left-4 right-16 pointer-events-none">
                        <h3 className="text-white text-sm sm:text-base font-black tracking-tight drop-shadow-sm leading-snug">
                          {slide.title}
                        </h3>
                        <p className="text-white/80 text-[11px] sm:text-xs font-medium drop-shadow-xs truncate mt-0.5">
                          {slide.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Navigation Arrows */}
                <button
                  type="button"
                  onClick={() =>
                    setHeroSlide((curr) => (curr === 0 ? heroSlides.length - 1 : curr - 1))
                  }
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-xs text-white border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                  aria-label="Previous rental car image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroSlide((curr) => (curr + 1) % heroSlides.length)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-xs text-white border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
                  aria-label="Next rental car image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Bottom Pagination Dots */}
                <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => setHeroSlide(idx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        heroSlide === idx
                          ? 'w-5 h-2 bg-emerald-400 shadow-sm'
                          : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Search Box matching Web8.png */}
          <div className="mt-8 sm:mt-10 bg-white rounded-2xl shadow-lg border border-slate-200/80 p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
              <label className="relative block">
                <span className="sr-only">Search rental cars</span>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by make, model, fuel or location"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                />
              </label>
              <label>
                <span className="sr-only">Rental category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                >
                  <option value="All">All rental categories</option>
                  <option value="SUV">SUVs</option>
                  <option value="Sedan">Sedans</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Executive">Executive</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
              {/* Pick-up Location */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pick-up Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                  >
                    <option value="Lagos - Murtala Muhammed Airport (LOS)">Lagos - Airport (LOS)</option>
                    <option value="Lagos - Victoria Island / Lekki">Lagos - Victoria Island / Lekki</option>
                    <option value="Abuja - Nnamdi Azikiwe Airport (ABV)">Abuja - Airport (ABV)</option>
                    <option value="Abuja - Central Business District">Abuja - Central Area</option>
                    <option value="Port Harcourt - International Airport">Port Harcourt - Airport</option>
                  </select>
                </div>
              </div>

              {/* Pick-up Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pick-up Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                />
              </div>

              {/* Pick-up Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pick-up Time
                </label>
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                >
                  <option>08:00 AM</option>
                  <option>10:00 AM</option>
                  <option>12:00 PM</option>
                  <option>02:00 PM</option>
                  <option>04:00 PM</option>
                  <option>06:00 PM</option>
                </select>
              </div>

              {/* Drop-off Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Drop-off Date
                </label>
                <input
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0e7c3a]/20"
                />
              </div>

              {/* Search Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSearchScroll}
                  className="w-full bg-[#12492f] hover:bg-[#0b3622] text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer h-[42px]"
                >
                  <Search className="w-4 h-4" />
                  Search Cars
                </button>
              </div>
            </div>

            {/* More Filters Toggle */}
            <div className="mt-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="text-xs font-semibold text-slate-600 hover:text-[#0e7c3a] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showMoreFilters ? 'Fewer Filters' : 'More Filters (Chauffeur, SUV, Fuel)'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Rental Cars Section matching Web8.png */}
      <section id="rental-inventory-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Popular Rental Cars
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Maintained to the highest standard with chauffeur and self-drive options
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              handleSearchScroll();
            }}
            className="text-xs sm:text-sm font-bold text-[#0e7c3a] hover:text-[#0b5c2a] flex items-center gap-1 group cursor-pointer"
          >
            Show all rentals
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {rentalLoadError && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {rentalLoadError}
          </div>
        )}
        {isLoadingCars && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Loading rental fleet…</div>
        )}
        {!isLoadingCars && !rentalLoadError && filteredCars.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">No rental vehicles match your search.</div>
        )}
        {/* Rental Cars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {filteredCars.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-2xl border shaba-surface border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={car.imageUrl}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {car.category}
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-white/90 text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {car.rating}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{car.name}</h3>

                  <div className="text-base sm:text-lg font-black text-[#0e7c3a] mt-1">
                    ₦{car.pricePerDayNgn.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">/ day</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {car.seats} Seats
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      {car.transmission}
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-slate-400" />
                      {car.fuel}
                    </span>
                    <span className="flex items-center gap-1 text-[#0e7c3a] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      Insured
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={() => handleStartBooking(car)}
                  className="w-full py-2.5 bg-[#12492f] hover:bg-[#0b3622] text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer text-center"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5-Pillar Trust Bar matching Web8.png */}
      <section className="bg-white border-t border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">Well Maintained Cars</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">Transparent Pricing</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">24/7 Roadside Assistance</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">Easy Booking &amp; Cancellation</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Headphones className="w-4 h-4 text-[#0e7c3a] flex-shrink-0" />
            <span className="text-xs font-bold text-slate-800">Customer Support</span>
          </div>
        </div>
      </section>

      {/* Corporate Long-Term Rental Banner matching Web8.png */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-[#12492f] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h3 className="text-xl sm:text-2xl font-black">
              Need a long-term rental for your business?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
              We provide special rates for companies, embassies, executive transport and corporate clients.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('find-car')}
            className="px-6 py-3 bg-white text-[#12492f] hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer flex-shrink-0"
          >
            Contact Sales Team
          </button>
        </div>
      </section>

      {/* Rental Booking Modal */}
      {activeCarForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Book Rental Vehicle"
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-[#0e7c3a]" />
                <h3 className="font-black text-gray-900 text-base">Book Rental Vehicle</h3>
              </div>
              <button
                onClick={() => setActiveCarForBooking(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingResult?.error ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Booking could not be completed</h3>
                <p className="text-sm text-gray-600">{bookingResult.error}</p>
                <button type="button" onClick={() => setBookingResult(null)} className="w-full py-3 bg-[#12492f] text-white font-bold text-xs rounded-xl cursor-pointer">
                  Try Again
                </button>
              </div>
            ) : bookingResult ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0e7c3a] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Rental Reservation Confirmed!</h3>

                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs text-emerald-900 font-bold mx-auto">
                  <span>Reservation ID: <span className="font-mono text-emerald-700">{bookingResult.id || 'RNT-74921'}</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(bookingResult.id || 'RNT-74921');
                      setCopiedBookingId(true);
                      setTimeout(() => setCopiedBookingId(false), 2000);
                    }}
                    className="p-1 hover:bg-emerald-200 rounded text-emerald-800 cursor-pointer"
                  >
                    {copiedBookingId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-left text-xs space-y-2 border border-gray-200">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-500">Vehicle:</span>
                    <span className="font-bold text-gray-900">{activeCarForBooking.name}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-500">Pick-up Date:</span>
                    <span className="text-gray-800">{pickupDate} ({pickupTime})</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-500">Drop-off Date:</span>
                    <span className="text-gray-800">{dropoffDate} ({dropoffTime})</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-500">Pickup Location:</span>
                    <span className="text-gray-800">{pickupLocation}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-gray-200 pt-2 text-sm font-black text-[#0e7c3a]">
                    <span>Total Cost ({days} {days === 1 ? 'day' : 'days'}):</span>
                    <span>₦{(bookingResult.totalNgn || ((activeCarForBooking.pricePerDayNgn + (withChauffeur ? chauffeurFeePerDay : 0)) * days)).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  A confirmation SMS &amp; voucher have been dispatched to {renterPhone}. Our concierge will contact you 2 hours prior to pickup.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveCarForBooking(null)}
                  className="w-full py-3 bg-[#0e7c3a] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="mt-4 space-y-4">
                {/* Vehicle Header Card */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <img
                    src={activeCarForBooking.imageUrl}
                    alt={activeCarForBooking.name}
                    className="w-16 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-900">{activeCarForBooking.name}</h4>
                    <p className="text-xs font-black text-[#0e7c3a]">
                      ₦{activeCarForBooking.pricePerDayNgn.toLocaleString()} <span className="font-normal text-gray-500 text-[10px]">/ day</span>
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Pick-up Date</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Drop-off Date</label>
                    <input
                      type="date"
                      value={dropoffDate}
                      onChange={(e) => setDropoffDate(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Pickup Hub / Location</label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium text-gray-900"
                  >
                    <option value="Lagos - Murtala Muhammed Airport (LOS)">Lagos - Airport (LOS)</option>
                    <option value="Lagos - Victoria Island / Lekki">Lagos - Victoria Island / Lekki Hub</option>
                    <option value="Abuja - Nnamdi Azikiwe Airport (ABV)">Abuja - Airport (ABV)</option>
                    <option value="Abuja - Central Business District">Abuja - Central Hub</option>
                    <option value="Port Harcourt - International Airport">Port Harcourt - Airport Hub</option>
                  </select>
                </div>

                {/* Chauffeur Toggle */}
                <label className="flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withChauffeur}
                    onChange={(e) => setWithChauffeur(e.target.checked)}
                    className="w-4 h-4 text-[#0e7c3a] rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-gray-900 block">Include Professional Chauffeur Driver</span>
                    <span className="text-[10px] text-gray-600 block">+₦15,000 / day (vetted, uniformed, executive security trained)</span>
                  </div>
                </label>

                {/* Personal Information */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={renterName}
                    onChange={(e) => setRenterName(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={renterPhone}
                      onChange={(e) => setRenterPhone(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={renterEmail}
                      onChange={(e) => setRenterEmail(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-medium text-gray-900"
                    />
                  </div>
                </div>

                {/* Total Cost Breakdown */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Base rate ({days} days):</span>
                    <span>₦{(activeCarForBooking.pricePerDayNgn * days).toLocaleString()}</span>
                  </div>
                  {withChauffeur && (
                    <div className="flex justify-between text-gray-600">
                      <span>Chauffeur fee ({days} days):</span>
                      <span>₦{(chauffeurFeePerDay * days).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Rental Amount:</span>
                    <span className="text-[#0e7c3a]">
                      ₦{((activeCarForBooking.pricePerDayNgn + (withChauffeur ? chauffeurFeePerDay : 0)) * days).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="w-full py-3 bg-[#12492f] hover:bg-[#0b3622] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Reservation...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Book Vehicle (Pay at Pickup)</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
