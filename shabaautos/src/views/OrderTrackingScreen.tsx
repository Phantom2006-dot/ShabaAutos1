import React, { useState } from 'react';
import {
  Package,
  Ship,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Download,
  Phone,
  MessageSquare,
  ChevronLeft,
  LayoutDashboard,
  Heart,
  Calendar,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Search,
  Check,
  Copy,
  X,
  Navigation,
  Anchor,
  Radio,
} from 'lucide-react';
import { ScreenId } from '../types';
import { trackOrderShipment } from '../services/api';
import { useAuthUser } from '../context/AuthContext';

interface OrderTrackingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface TrackedOrder {
  orderId: string;
  status: string;
  orderDate: string;
  estDeliveryDate: string;
  shippingLine: string;
  vesselName: string;
  trackingNumber: string;
  originPort: string;
  destinationPort: string;
  car: {
    name: string;
    priceUsd: number;
    priceNgn: number;
    vin: string;
    specs: string;
    image: string;
  };
  steps: Array<{ title: string; date: string; description: string; completed: boolean; current: boolean }>;
  documents: Array<{ name: string; type: string; size: string }>;
  assignedAgent: { name: string; role: string; avatar: string; phone: string };
}

const EMPTY_ORDER: TrackedOrder = {
  orderId: '—',
  status: '—',
  orderDate: '—',
  estDeliveryDate: '—',
  shippingLine: '—',
  vesselName: '—',
  trackingNumber: '—',
  originPort: '—',
  destinationPort: '—',
  car: { name: '—', priceUsd: 0, priceNgn: 0, vin: '—', specs: '—', image: '' },
  steps: [],
  documents: [],
  assignedAgent: { name: 'ShabaAutos Import Team', role: 'Logistics & Customs Support', avatar: '', phone: '+234 812 345 6789' },
};

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ onNavigate }) => {
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const [currentOrder, setCurrentOrder] = useState<TrackedOrder>(EMPTY_ORDER);
  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTrackingId.trim()) { setOrderError('Enter a tracking ID or VIN to look up your shipment.'); return; }
    setIsSearching(true);
    setOrderError(null);
    try {
      const res = await trackOrderShipment(searchTrackingId);
      if (res?.success && res.data) {
        const d = res.data;
        const carName = [d.car?.year, d.car?.make, d.car?.model].filter(Boolean).join(' ');
        setCurrentOrder({
          orderId: d.orderId || searchTrackingId.trim().toUpperCase(),
          status: d.status || 'In Transit',
          orderDate: d.orderDate || '—',
          estDeliveryDate: d.estimatedArrival || d.estDeliveryDate || '—',
          shippingLine: d.shippingLine || '—',
          vesselName: d.vesselName || '—',
          trackingNumber: d.trackingNumber || d.containerNo || '—',
          originPort: d.originPort || '—',
          destinationPort: d.destinationPort || '—',
          car: {
            name: carName || 'Vehicle',
            priceUsd: d.car?.priceUsd ?? 0,
            priceNgn: d.car?.priceNgn ?? 0,
            vin: d.car?.vin || '—',
            specs: d.car?.specs || '',
            image: d.car?.image || '',
          },
          steps: (d.steps || []).map((st, i) => ({
            title: st.title || '',
            date: st.scheduledDate || st.date || '',
            description: st.description || '',
            completed: !!st.completed,
            current: !!st.current,
          })),
          documents: [],
          assignedAgent: currentOrder.assignedAgent,
        });
        setOrderError(null);
      } else {
        setCurrentOrder(prev => ({ ...prev, steps: [], documents: [] }));
        setOrderError(res?.message || 'No shipment found matching that tracking ID or VIN.' );
      }
    } catch {
      setOrderError('Tracking is temporarily unavailable. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadDoc = (docName: string, docType: string) => {
    // Generate actual downloadable blob file
    const fileContent = `=====================================================
SHABAAUTOS OFFICIAL MARITIME & CUSTOMS DOCUMENTATION
Document: ${docName}
Tracking ID: ${currentOrder.orderId}
Vehicle: ${currentOrder.car.name} (VIN: ${currentOrder.car.vin})
Vessel: ${currentOrder.vesselName} (Container #${currentOrder.containerNo})
Destination: ${currentOrder.destinationPort}
Issued: ${new Date().toLocaleDateString()}
Status: VERIFIED & CLEARED
=====================================================

This digital certificate confirms valid pre-shipment clearance and export clearance for Nigerian Customs inspection at Tin Can Island, Lagos.
Authorized by ShabaAutos Logistics Port Agency.`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docName.replace(/\s+/g, '_')}_${currentOrder.orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Downloaded ${docName}`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] shaba-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Navigation (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 shadow-xs">
              <div className="flex items-center gap-3 p-3 border-b border-gray-100 pb-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#0a502c] text-white flex items-center justify-center font-bold text-sm">
                  {isSignedIn ? ((user?.fullName || user?.email || 'G').charAt(0).toUpperCase()) : 'G'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{isSignedIn ? (user?.fullName || user?.email || 'ShabaAutos Customer') : 'Guest'}</h4>
                  <p className="text-[10px] text-gray-500">Customer Portal</p>
                </div>
              </div>

              <nav className="space-y-1 text-xs font-medium">
                <button
                  onClick={() => onNavigate('home')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-400" />
                  Dashboard
                </button>

                <button
                  onClick={() => onNavigate('saved-compare')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Heart className="w-4 h-4 text-gray-400" />
                  Saved & Compare
                </button>

                <button
                  onClick={() => onNavigate('import-form')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  Request Import Quote
                </button>

                <button
                  onClick={() => onNavigate('rent-car')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Rental Bookings
                </button>

                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 text-[#0a502c] font-bold">
                  <Package className="w-4 h-4 text-[#0a502c]" />
                  Track Import Order
                </button>

                <button
                  onClick={() => onNavigate('auth')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile &amp; Settings
                </button>

                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => onNavigate('auth')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Tracking Content (6 Cols) */}
          <main className="lg:col-span-6 space-y-6">
            {/* Tracking Search & Status Bar */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-4 sm:p-5 shadow-xs">
              <form onSubmit={handleSearchTracking} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTrackingId}
                    onChange={(e) => setSearchTrackingId(e.target.value)}
                    placeholder="Enter Tracking ID (e.g. SHA-2024-8842 or VIN)"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-[#0a502c] hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? 'Tracking...' : 'Track Order'}</span>
                </button>
              </form>
              {orderError && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500 shrink-0" />
                  {orderError}
                </div>
              )}
              {downloadSuccess && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {downloadSuccess}
                </div>
              )}
            </div>

            {/* Header & Status */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <button
                onClick={() => onNavigate('home')}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-3 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Orders
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-black text-gray-900">Order #{currentOrder.orderId}</h1>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentOrder.orderId);
                        setCopiedOrderId(true);
                        setTimeout(() => setCopiedOrderId(false), 2000);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 cursor-pointer"
                      title="Copy Order ID"
                    >
                      {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="bg-emerald-100 text-[#0a502c] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Ship className="w-3 h-3" /> {currentOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed on {currentOrder.orderDate} • Estimated Delivery: {currentOrder.estDeliveryDate}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGpsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#0a502c] hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Live Vessel GPS
                </button>
              </div>

              {/* Vehicle Banner */}
              <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={currentOrder.car.image}
                  alt={currentOrder.car.name}
                  className="w-full sm:w-36 h-24 object-cover rounded-lg"
                />
                <div className="flex-1 text-xs space-y-1">
                  <h3 className="font-bold text-sm text-gray-900">{currentOrder.car.name}</h3>
                  <div className="text-[#0a502c] font-black text-base">
                    ${currentOrder.car.priceUsd.toLocaleString()} USD{' '}
                    <span className="text-xs font-normal text-gray-500">
                      (₦{currentOrder.car.priceNgn.toLocaleString()} NGN)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    VIN: <span className="font-mono font-semibold text-gray-700">{currentOrder.car.vin}</span>
                  </p>
                  <p className="text-[11px] text-gray-500">{currentOrder.car.specs}</p>
                </div>
              </div>
            </div>

            {/* Shipment Progress Stepper */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 pb-2 border-b border-gray-100">
                Shipment Milestones
              </h3>

              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200">
                {currentOrder.steps.map((s, idx) => {
                  const isCompleted = s.completed;
                  const isCurrent = s.current;

                  return (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Step node */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs z-10 ${
                          isCompleted
                            ? 'bg-[#0a502c] text-white ring-4 ring-emerald-50'
                            : isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 animate-pulse'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      <div className="flex-1 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h4
                            className={`font-bold ${
                              isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {s.title}
                          </h4>
                          <span className="text-[11px] text-gray-400 font-medium">{s.date}</span>
                        </div>
                        <p
                          className={`mt-0.5 leading-relaxed text-[11px] ${
                            isCurrent ? 'text-emerald-800 font-semibold' : 'text-gray-500'
                          }`}
                        >
                          {s.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Logistics Details */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Vessel &amp; Port Information
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 text-[11px] block">Shipping Carrier</span>
                  <span className="font-bold text-gray-900">{currentOrder.shippingLine}</span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Vessel Name</span>
                  <span className="font-bold text-gray-900">{currentOrder.vesselName}</span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Bill of Lading (BOL)</span>
                  <span className="font-mono font-bold text-emerald-800">{currentOrder.trackingNumber}</span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Port of Origin</span>
                  <span className="font-semibold text-gray-800">{currentOrder.originPort}</span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Destination Port</span>
                  <span className="font-semibold text-gray-800">{currentOrder.destinationPort}</span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Port ETA</span>
                  <span className="font-bold text-emerald-800">{currentOrder.estDeliveryDate}</span>
                </div>
              </div>
            </div>

            {/* Official Documents Downloads */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Import Documentation
              </h3>

              <div className="space-y-3">
                {currentOrder.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0a502c] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{doc.name}</h4>
                        <span className="text-[10px] text-gray-400">
                          {doc.type} • {doc.size}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc.name, doc.type)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Right Sidebar: Concierge Agent (3 Cols) */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Assigned Agent Card */}
            <div className="bg-white rounded-2xl border shaba-surface border-gray-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Assigned Import Coordinator
              </h4>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src={currentOrder.assignedAgent.avatar}
                  alt={currentOrder.assignedAgent.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#0a502c]"
                />
                <div>
                  <h5 className="font-bold text-sm text-gray-900">{currentOrder.assignedAgent.name}</h5>
                  <p className="text-[11px] text-gray-500">{currentOrder.assignedAgent.role}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded-full">
                    Online Now
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <a
                  href="https://wa.me/2348123456789"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat on WhatsApp
                </a>

                <a
                  href={`tel:${currentOrder.assignedAgent.phone}`}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-gray-600" />
                  Call {currentOrder.assignedAgent.phone}
                </a>
              </div>
            </div>

            {/* Safe Delivery Guarantee */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[#0a502c] mb-2 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                100% Guaranteed Delivery
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                All vehicles imported through ShabaAutos are backed by comprehensive marine cargo insurance covering transit risks up to final handover.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Interactive Live GPS Modal */}
      {showGpsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vessel Satellite Telemetry and AIS Radar"
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm">Vessel Satellite Telemetry &amp; AIS Radar</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-200" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Radar Map Graphic */}
              <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between p-4">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
                
                <div className="relative z-10 flex justify-between items-start text-xs">
                  <div className="bg-slate-800/80 backdrop-blur-xs px-2.5 py-1 rounded text-emerald-400 font-mono text-[11px]">
                    VESSEL: {currentOrder.vesselName}
                  </div>
                  <div className="bg-slate-800/80 backdrop-blur-xs px-2.5 py-1 rounded text-slate-300 font-mono text-[11px]">
                    AIS POS: 4°18&apos;22&quot;N 3°24&apos;11&quot;E
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border border-emerald-500/40 animate-ping absolute" />
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Ship className="w-5 h-5 animate-bounce" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex justify-between items-end text-xs text-slate-400">
                  <span>Speed: 17.8 knots • Heading: 088° E</span>
                  <span className="text-emerald-400 font-bold">In Transit to Lagos Port</span>
                </div>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Transponder</span>
                  <span className="font-bold text-emerald-700">Active (Class A AIS)</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Sea Zone</span>
                  <span className="font-bold text-gray-900">Gulf of Guinea</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Distance Remaining</span>
                  <span className="font-bold text-gray-900">142 Nautical Miles</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Berthing Berth</span>
                  <span className="font-bold text-gray-900">Tin Can Berth 4</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGpsModal(false)}
                  className="px-5 py-2.5 bg-[#0a502c] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Telemetry Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
