import React from 'react';
import { Phone, Mail, ShieldCheck, CheckCircle2, Award, Clock, MessageSquare } from 'lucide-react';
import { ScreenId } from '../types';
import { ShabaAutosLogo } from './ShabaAutosLogo';
import { useBusinessContact, formatContactPhone, toDialNumber } from '../hooks/useBusinessContact';

interface FooterProps {
  onNavigate: (screen: ScreenId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { phone, email, address } = useBusinessContact();
  const emailHref = email ? `mailto:${encodeURIComponent(email)}` : '';
  const inspectionEmailHref = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Vehicle inspection records')}`
    : '';
  const enquiryEmailHref = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('ShabaAutos vehicle enquiry')}`
    : '';
  const directionsHref = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : '';
  const phoneDisplay = formatContactPhone(phone);
  const dialNumber = toDialNumber(phone);
  const phoneHref = dialNumber ? `tel:${dialNumber}` : '';
  const whatsappHref = dialNumber
    ? `https://wa.me/${dialNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ShabaAutos, I would like to ask about a vehicle.')}`
    : '';

  return (
    <footer className="bg-[#0b1310] text-gray-300">
      {/* Upper Features Strip */}
      <div className="border-b border-gray-800 bg-[#08100d] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Return terms</p>
                <p className="text-gray-400">Ask about applicable return terms</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Vehicle inspection information</p>
                <p className="text-gray-400">Scope and evidence vary by vehicle</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Import documentation</p>
                <p className="text-gray-400">Documentation can be reviewed with your quote</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Delivery options</p>
                <p className="text-gray-400">Confirm destination, timing and fees</p>
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
              An automotive marketplace serving customers in Nigeria. Browse local and foreign used cars, rent vehicles for personal or corporate travel, or request guided import support from the USA.
            </p>
            <div className="space-y-2 text-xs text-gray-400 pt-2">
              {phone && <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <a href={phoneHref} className="hover:text-emerald-400 transition-colors">{phoneDisplay}</a>
              </div>}
              {email && <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <a href={emailHref} className="hover:text-emerald-400 transition-colors">{email}</a>
              </div>}
              {address && <div className="space-y-1">
                <div>{address}</div>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:text-emerald-400 transition-colors"
                >
                  Get directions on Google Maps
                </a>
              </div>}
              {!phone && !email && !address && (
                <p>Business contact details are being confirmed. Use request forms on site to connect.</p>
              )}
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
                  Browse Available Cars
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
              {email && <li>
                <a href={inspectionEmailHref} className="hover:text-emerald-400 transition-colors">
                  Ask about inspection records
                </a>
              </li>}
            </ul>
          </div>

          {/* Col 4: Contact alternative */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Stay in touch</h4>
            <p className="text-xs text-gray-400 mb-3">
              Have a question about a vehicle or a new arrival? Contact the team directly.
            </p>
            <div className="space-y-2">
              {email && (
                <a
                  href={enquiryEmailHref}
                  className="inline-flex w-full items-center justify-center gap-2 py-2 bg-[#0a502c] hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email {email}
                </a>
              )}
              {phone && (
                <a
                  href={phoneHref}
                  className="inline-flex w-full items-center justify-center gap-2 py-2 border border-gray-700 hover:border-emerald-500 hover:text-emerald-400 text-gray-200 font-semibold rounded-lg text-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call {phoneDisplay}
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 py-2 bg-[#128c7e] hover:bg-[#0f7a6d] text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat on WhatsApp
                </a>
              )}
              {!email && !phone && (
                <p className="text-xs text-gray-400">Business contact details are being confirmed. Use request forms on site to connect.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 pb-6 md:pb-0 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} ShabaAutos Nigeria Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {email && <a href={emailHref} className="hover:text-gray-400">{email}</a>}
            {phone && <a href={phoneHref} className="hover:text-gray-400">{phoneDisplay}</a>}
          </div>
        </div>
      </div>
    </footer>
  );
};
