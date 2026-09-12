import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, CheckCircle2, Award, Clock } from 'lucide-react';
import { ScreenId } from '../types';
import { ShabaAutosLogo } from './ShabaAutosLogo';

interface FooterProps {
  onNavigate: (screen: ScreenId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0b1310] text-gray-300">
      {/* Upper Features Strip */}
      <div className="border-b border-gray-800 bg-[#08100d] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">7-Day Return Policy</p>
                <p className="text-gray-400">100% peace of mind guarantee</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">150+ Inspection Points</p>
                <p className="text-gray-400">Certified by top engineers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Customs Cleared</p>
                <p className="text-gray-400">All duty documents authentic</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Fast Doorstep Delivery</p>
                <p className="text-gray-400">Across all 36 Nigerian states</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="cursor-pointer select-none inline-block" onClick={() => onNavigate('home')}>
              <ShabaAutosLogo variant="dark" size="lg" showDivider={false} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Nigeria&apos;s most trusted automotive marketplace. Buy verified local and foreign used cars, rent vehicles for personal or corporate travel, or import clean-title cars directly from the USA with zero hassle.
            </p>
            <div className="space-y-2 text-xs text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Admiralty Way, Lekki Phase 1, Lagos, Nigeria</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>+234 812 345 6789 / +234 810 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>support@shabaautos.com</span>
              </div>
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('buy-cars')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Buy Verified Cars
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('rent-car')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Car Rental Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('import-landing')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Import from USA
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('sell-car')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Sell Your Car
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('find-car')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Find a Car for Me
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Portal */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Customer Portal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('saved-compare')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Saved & Compare Cars
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('order-tracking')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Track Import Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('auth')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Account Login / Register
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('import-form')}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  Request Import Quote
                </button>
              </li>
              <li>
                <a href="#inspection" className="hover:text-emerald-400 transition-colors">
                  Vehicle Inspection Reports
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Stay Updated</h4>
            <p className="text-xs text-gray-400 mb-3">
              Get notified of new car arrivals and special US import price drops.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                className="w-full py-2 bg-[#0a502c] hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 pb-6 md:pb-0 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} ShabaAutos Nigeria Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-400 cursor-pointer">Vehicle Disclaimer</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
