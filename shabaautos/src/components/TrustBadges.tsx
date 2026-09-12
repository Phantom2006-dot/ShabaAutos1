import React from 'react';
import { ShieldCheck, CircleDollarSign, Truck, Headphones, CheckCircle2, Clock, Award } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'home' | 'footer' | 'rental' | 'import';
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ variant = 'home' }) => {
  if (variant === 'rental') {
    const rentalBadges = [
      {
        icon: <ShieldCheck className="w-6 h-6 text-[#0a502c]" />,
        title: 'Well Maintained Cars',
        desc: 'All rental vehicles are regularly serviced and cleaned.',
      },
      {
        icon: <CircleDollarSign className="w-6 h-6 text-[#0a502c]" />,
        title: 'Transparent Pricing',
        desc: 'No hidden charges. Clear daily rates and insurance coverage.',
      },
      {
        icon: <Clock className="w-6 h-6 text-[#0a502c]" />,
        title: '24/7 Roadside Assistance',
        desc: 'On-demand emergency support wherever your trip takes you.',
      },
      {
        icon: <CheckCircle2 className="w-6 h-6 text-[#0a502c]" />,
        title: 'Easy Booking & Cancellation',
        desc: 'Quick online reservation with flexible modification policies.',
      },
      {
        icon: <Headphones className="w-6 h-6 text-[#0a502c]" />,
        title: 'Customer Support',
        desc: 'Dedicated concierge team to ensure seamless rental service.',
      },
    ];

    return (
      <div className="bg-white py-10 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {rentalBadges.map((badge, idx) => (
              <div key={idx} className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                  {badge.icon}
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">{badge.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'import') {
    const importBadges = [
      {
        icon: <Award className="w-6 h-6 text-[#0a502c]" />,
        title: 'Expert Sourcing',
        desc: 'Access to top US dealer & auction networks (Copart, IAAI, Manheim).',
      },
      {
        icon: <CircleDollarSign className="w-6 h-6 text-[#0a502c]" />,
        title: 'Transparent Process',
        desc: 'Clear cost estimation before purchase with no surprise expenses.',
      },
      {
        icon: <Truck className="w-6 h-6 text-[#0a502c]" />,
        title: 'Hassle-Free Logistics',
        desc: 'Complete handling of ocean freight, customs clearance, and clearing.',
      },
      {
        icon: <ShieldCheck className="w-6 h-6 text-[#0a502c]" />,
        title: 'Secure & Trusted',
        desc: 'Verified VIN reports, condition inspection, and safe escrow payments.',
      },
    ];

    return (
      <div className="bg-white py-8 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {importBadges.map((badge, idx) => (
              <div key={idx} className="flex items-start gap-3.5 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0 flex items-center justify-center">
                  {badge.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{badge.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default Home / Global Badges
  const defaultBadges = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#0a502c]" />,
      title: '100% Verified',
      desc: 'All vehicles are thoroughly inspected and verified for quality.',
    },
    {
      icon: <CircleDollarSign className="w-6 h-6 text-[#0a502c]" />,
      title: 'Transparent Pricing',
      desc: 'No hidden fees. What you see is what you pay across all listings.',
    },
    {
      icon: <Truck className="w-6 h-6 text-[#0a502c]" />,
      title: 'Doorstep Delivery',
      desc: 'We deliver safely to your doorstep anywhere in Nigeria.',
    },
    {
      icon: <Headphones className="w-6 h-6 text-[#0a502c]" />,
      title: 'Expert Support',
      desc: 'Our dedicated team is here to help you at every single step.',
    },
  ];

  return (
    <div className="bg-white py-8 border-t border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {defaultBadges.map((b, idx) => (
            <div key={idx} className="flex items-center gap-4 p-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0 flex items-center justify-center">
                {b.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{b.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
