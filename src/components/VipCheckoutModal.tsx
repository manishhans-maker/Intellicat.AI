import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  ShieldCheck,
  Zap,
  Crown,
  Copy,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  QrCode,
  Smartphone,
  Clock,
  Send,
  AlertCircle,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { INTELLICAT_LOGO_URL } from '../constants';
import { UserPlanTier } from '../types';

export interface VipData {
  name: string;
  email: string;
  tierId: string;
  tierName: string;
  serialId: string;
  purchaseDate: string;
  amountPaid: string;
  paymentMethod: string;
  isFounder?: boolean;
}

interface VipCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVipPurchased?: (vipData: VipData) => void;
  initialTier?: 'pro' | 'elite' | 'founder_billion';
  onOpenAiAssistant?: (prompt?: string) => void;
}

import {
  getStoredMerchantUpi,
  fetchRemoteMerchantUpi,
  maskUpiId,
  buildCompliantUpiUri,
  buildUniversalP2pUri,
} from '../lib/paymentConfig';

const ADMIN_EMAIL = 'manishhans@gmail.com';

interface PlanTier {
  id: string;
  name: string;
  usdPrice: number;
  inrPrice: number;
  displayPrice: string;
  displayInr: string;
  badge?: string;
  description: string;
  perks: string[];
  popular?: boolean;
  isFounder?: boolean;
}

const TIERS: PlanTier[] = [
  {
    id: 'pro',
    name: 'Intelicat Pro',
    usdPrice: 10,
    inrPrice: 799,
    displayPrice: '$10',
    displayInr: '₹799',
    badge: 'Popular ⚡',
    description: '25 chats every 3 hours with flagship Gemini 3.8 Flash reasoning unlocked!',
    perks: [
      '⚡ 25 chats per 3-hour cycle',
      '🚀 Unlocks Flagship Gemini 3.8 Flash reasoning',
      '🛡️ 12 recovery chats after 3-hour cooldown',
      '🐾 Cyber Cat Code synthesis & live preview',
      '⚡ Ultra-fast response with high-speed GPU routing',
    ],
    popular: true,
    isFounder: false,
  },
  {
    id: 'elite',
    name: 'Intelicat Elite / VIP',
    usdPrice: 50,
    inrPrice: 3999,
    displayPrice: '$50',
    displayInr: '₹3,999',
    badge: 'Power User 👑',
    description: '50 chats every 3 hours with Gemini 3.8 Flash and Gemini 3.1 Pro unlocked!',
    perks: [
      '⚡ 50 chats per 3-hour cycle',
      '👑 Unlocks Gemini 3.8 Flash & Gemini 3.1 Pro (Preview)',
      '🚀 25 recovery chats after 3-hour cooldown',
      '⚡ Priority GPU queue dispatch ahead of free users',
      '🌐 Full Google Web Search Grounding & Deep Research',
    ],
    popular: false,
    isFounder: false,
  },
  {
    id: 'founder_billion',
    name: 'Founder Sovereign Partner',
    usdPrice: 1200,
    inrPrice: 99999,
    displayPrice: '$1,200',
    displayInr: '₹99,999',
    badge: '👑 SOVEREIGN FOUNDER',
    description:
      'Supreme VIP Partner access with dedicated compute and truly unlimited inferences forever.',
    perks: [
      '♾️ Truly UNLIMITED inferences across all current and future AI models',
      '🏢 Zero rate limits, zero timeouts, zero cooldowns forever',
      '🔐 Sovereign VPC & Private On-Premises Isolated Deployment',
      '🛠️ Direct 1-on-1 Engineering & AI Architect hotline with 99.999% SLA',
      '📜 Cryptographically verified Lifetime Founder Certificate #001',
      '🤝 Priority access to all future frontier intelligence models',
    ],
    popular: false,
    isFounder: true,
  },
];

export const VipCheckoutModal: React.FC<VipCheckoutModalProps> = ({
  isOpen,
  onClose,
  initialTier = 'pro',
}) => {
  const { user, upgradeToTier } = useAuth();
  const [selectedTierId, setSelectedTierId] = useState<string>(initialTier || 'pro');

  // Multi-step navigation: 'plans' -> 'upi_payment' -> 'submitted'
  const [currentStep, setCurrentStep] = useState<'plans' | 'upi_payment' | 'submitted'>('plans');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);

  // QR Code State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedUtr, setSubmittedUtr] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [submittedDocId, setSubmittedDocId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'pending_verification' | 'approved' | 'rejected'>('pending_verification');

  useEffect(() => {
    if (initialTier) {
      setSelectedTierId(initialTier);
    }
  }, [initialTier]);

  // Reset step to 'plans' whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('plans');
      setUtrError(null);
    }
  }, [isOpen]);

  // Real-time listener for live instant activation by Owner (like ChatGPT)
  useEffect(() => {
    if (!submittedDocId || currentStep !== 'submitted') return;

    try {
      const unsubscribe = onSnapshot(doc(db, 'payment_requests', submittedDocId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'approved') {
            setLiveStatus('approved');
            let targetTier: UserPlanTier = 'pro';
            if (data.tierId === 'founder_billion' || data.tierName?.toLowerCase().includes('founder')) {
              targetTier = 'founder';
            } else if (data.tierId === 'elite' || data.tierName?.toLowerCase().includes('elite')) {
              targetTier = 'elite';
            }
            upgradeToTier(targetTier);
          } else if (data.status === 'rejected') {
            setLiveStatus('rejected');
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Real-time payment snapshot error:', e);
    }
  }, [submittedDocId, currentStep, upgradeToTier]);

  // Pre-fill user information if signed in
  useEffect(() => {
    if (user) {
      if (user.displayName && !name) setName(user.displayName);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  const activeTier = TIERS.find((t) => t.id === selectedTierId) || TIERS[0];
  const [merchantUpi, setMerchantUpi] = useState<string>(getStoredMerchantUpi());
  const [qrFormat, setQrFormat] = useState<'standard' | 'universal'>('standard');

  useEffect(() => {
    fetchRemoteMerchantUpi().then((remoteUpi) => {
      if (remoteUpi && remoteUpi.includes('@')) {
        setMerchantUpi(remoteUpi);
      }
    });
  }, []);

  const maskedUpiDisplay = maskUpiId(merchantUpi);

  // Dynamic 100% NPCI compliant UPI payment link
  const upiDeepLink =
    qrFormat === 'universal'
      ? buildUniversalP2pUri(merchantUpi, 'IntellicatAI')
      : buildCompliantUpiUri(
          merchantUpi,
          activeTier.inrPrice,
          'IntellicatAI',
          'IntelicatPlan'
        );

  // Generate QR Code dynamically when in payment step
  useEffect(() => {
    if (currentStep !== 'upi_payment' || !merchantUpi) return;

    let isMounted = true;
    QRCode.toDataURL(upiDeepLink, {
      width: 380,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn('Failed to generate dynamic QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiDeepLink, currentStep, merchantUpi]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText(merchantUpi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopyReference = () => {
    const text = `🐾 IntelicatAI Payment Verification\nPlan: ${activeTier.name} (${activeTier.displayInr})\nPayee: ${maskedUpiDisplay}\nUTR Reference: ${submittedUtr}\nName: ${name}\nEmail: ${email}`;
    try {
      navigator.clipboard.writeText(text);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim().replace(/\s+/g, '');

    if (!cleanUtr) {
      setUtrError('Please enter your 12-digit UPI Reference / UTR Number.');
      return;
    }

    if (cleanUtr.length < 6) {
      setUtrError('Invalid UTR / Transaction ID. UPI reference numbers are usually 12 digits.');
      return;
    }

    setUtrError(null);
    setSubmitting(true);

    const paymentRecord = {
      uid: user?.uid || 'guest',
      name: name.trim() || 'Anonymous User',
      email: email.trim() || user?.email || 'unspecified@email.com',
      tierId: activeTier.id,
      tierName: activeTier.name,
      amountInr: activeTier.inrPrice,
      amountUsd: activeTier.usdPrice,
      utrNumber: cleanUtr,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
    };

    try {
      // Persist to Firestore payment_requests collection
      const docRef = await addDoc(collection(db, 'payment_requests'), paymentRecord);
      setSubmittedDocId(docRef.id);
      try {
        localStorage.setItem('intelicat_last_payment_request', JSON.stringify({ ...paymentRecord, docId: docRef.id }));
      } catch {}
    } catch (err) {
      console.warn('Firestore payment_requests sync warning:', err);
    }

    setSubmittedUtr(cleanUtr);
    setLiveStatus('pending_verification');
    setCurrentStep('submitted');
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="relative w-full max-w-4xl rounded-[32px] bg-[#0c0c10] border border-white/15 shadow-[0_0_80px_rgba(239,35,60,0.35)] p-5 sm:p-8 text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: MAIN PLANS SCREEN (QR Code completely hidden here) */}
        {currentStep === 'plans' && (
          <div>
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-6">
              <div className="flex items-center justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.5)] bg-black">
                  <img
                    src={INTELLICAT_LOGO_URL}
                    alt="IntellicatAI"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF233C]/10 border border-[#EF233C]/30 text-[#EF233C] text-xs font-semibold uppercase tracking-wider mb-2">
                <Crown className="w-3.5 h-3.5" />
                <span>Verified Access & Intelligence Infrastructure</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                IntelicatAI Official Access Passes
              </h2>
              <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                Select your pass below to upgrade inference throughput and eliminate standard cooldown restrictions.
              </p>
            </div>

            {/* Plan Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
              {TIERS.map((t) => {
                const isSelected = selectedTierId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTierId(t.id)}
                    className={`relative rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? t.isFounder
                          ? 'bg-gradient-to-b from-[#2a1b08] via-[#1a1208] to-[#120d06] border-amber-400 shadow-xl shadow-amber-500/30 ring-2 ring-amber-400'
                          : 'bg-gradient-to-b from-[#1f1013] to-[#121218] border-[#EF233C] shadow-lg shadow-red-600/20 ring-1 ring-[#EF233C]'
                        : t.isFounder
                        ? 'bg-gradient-to-b from-[#18130a] to-[#100d08] border-amber-500/30 hover:border-amber-400/60'
                        : 'bg-[#14141a] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {t.badge && (
                      <span
                        className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                          t.isFounder
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black'
                            : t.popular
                            ? 'bg-[#EF233C] text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}

                    <div>
                      <h3 className={`font-bold text-sm ${t.isFounder ? 'text-amber-300' : 'text-white'}`}>
                        {t.name}
                      </h3>

                      <div className="my-2 flex items-baseline gap-2">
                        <span
                          className={`font-black tracking-tight text-xl sm:text-2xl ${
                            t.isFounder
                              ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : 'text-[#EF233C]'
                          }`}
                        >
                          {t.displayInr}
                        </span>
                        <span className="text-xs text-neutral-400">({t.displayPrice})</span>
                      </div>

                      <p className="text-[11px] text-neutral-400 mb-3 leading-relaxed">
                        {t.description}
                      </p>

                      <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                        {t.perks.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                            <Check
                              className={`w-3 h-3 shrink-0 mt-0.5 ${
                                t.isFounder ? 'text-amber-400' : 'text-[#EF233C]'
                              }`}
                            />
                            <span className="leading-tight">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? t.isFounder
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-[#EF233C] bg-[#EF233C]'
                            : 'border-white/30'
                        }`}
                      >
                        {isSelected && (
                          <Check className={`w-2.5 h-2.5 ${t.isFounder ? 'text-black' : 'text-white'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Action Footer */}
            <div className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-neutral-400">Selected Plan:</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{activeTier.name}</span>
                  <span className="text-[#EF233C] font-mono">{activeTier.displayInr}</span>
                  <span className="text-xs text-neutral-400 font-normal">({activeTier.displayPrice})</span>
                </div>
              </div>

              {/* Pay with UPI Trigger Button */}
              <button
                type="button"
                onClick={() => setCurrentStep('upi_payment')}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  activeTier.isFounder
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-amber-500/40 hover:scale-[1.02] active:scale-95'
                    : 'red-cta-btn text-white shadow-red-600/30 hover:scale-[1.02] active:scale-95'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay with UPI ({activeTier.displayInr})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-neutral-400 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Direct Bank UPI Settlement • Zero Card Data Stored • Instant UTR Verification</span>
            </div>
          </div>
        )}

        {/* STEP 2: INSIDE UPI PAYMENT SCREEN (Shown only after clicking "Pay with UPI") */}
        {currentStep === 'upi_payment' && (
          <div>
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => setCurrentStep('plans')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Plans</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full font-mono">
                <Lock className="w-3.5 h-3.5" />
                <span>Secure Payment Gateway</span>
              </div>
            </div>

            {/* Header info */}
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Scan & Pay for <span className="text-amber-400">{activeTier.name}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Scan the QR code in any UPI app (GPay, PhonePe, Paytm, BHIM) or tap the direct payment button.
              </p>
            </div>

            {/* QR Code & Verification Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: QR Code Card */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[320px] bg-white rounded-3xl p-5 text-black shadow-2xl flex flex-col items-center text-center border-2 border-amber-400/40 relative">
                  <div className="w-full flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                      Merchant UPI QR
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-black text-amber-300">
                      {activeTier.displayInr}
                    </span>
                  </div>

                  {/* QR Format Selector for Maximum App Compatibility (BHIM, Paytm, PhonePe, GPay) */}
                  <div className="w-full grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-xl mb-3 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setQrFormat('standard')}
                      className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                        qrFormat === 'standard'
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Pre-filled ({activeTier.displayInr})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrFormat('universal')}
                      className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                        qrFormat === 'universal'
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Universal (BHIM/Paytm)
                    </button>
                  </div>

                  {/* QR Code Container */}
                  <div className="w-56 h-56 rounded-2xl overflow-hidden bg-white p-1 flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt={`Scan to Pay ${activeTier.displayInr}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                        Generating QR Code...
                      </div>
                    )}
                  </div>

                  {/* Protected Masked UPI Display with Copy button */}
                  <div
                    onClick={handleCopyUpi}
                    className="mt-3 w-full flex items-center justify-center gap-2 font-mono font-bold text-xs sm:text-sm text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors py-2 px-3 rounded-xl cursor-pointer select-all border border-neutral-300 shadow-sm"
                    title="Click to copy Merchant UPI ID"
                  >
                    <span>{maskedUpiDisplay}</span>
                    <span className="p-1 rounded bg-white text-neutral-700 shadow-xs">
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </span>
                  </div>

                  {copiedUpi && (
                    <span className="text-[11px] text-emerald-600 font-bold mt-1.5 animate-pulse">
                      Merchant UPI ID Copied!
                    </span>
                  )}

                  {/* Direct Mobile App Deeplink */}
                  <a
                    href={upiDeepLink}
                    className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#EF233C] to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pay with GPay / PhonePe / Paytm / BHIM</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  {/* BHIM / Paytm Help Notice */}
                  <div className="mt-2.5 text-[10px] text-neutral-600 bg-neutral-100 border border-neutral-200 p-2.5 rounded-xl text-left flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div className="leading-tight">
                      <span className="font-bold text-neutral-900 block">BHIM & Paytm Friendly:</span>
                      If your app scanner shows any format warning, tap <strong>Universal</strong> above or tap <strong>Copy UPI ID</strong> to pay directly.
                    </div>
                  </div>

                  {/* Supported Apps */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-200 w-full text-[10px] text-neutral-500 flex flex-wrap items-center justify-center gap-2">
                    <span className="font-semibold text-neutral-700">Google Pay</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-700">PhonePe</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-700">Paytm</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-700">BHIM</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-700">Cred</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Verification Submission Form */}
              <div className="lg:col-span-7 space-y-4">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enter UPI Transaction Reference (UTR)</span>
                </div>

                <form
                  onSubmit={handleSubmitVerification}
                  className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-4"
                >
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold block">Verification Process:</span>
                      <span className="text-neutral-300 text-[11px] leading-relaxed">
                        After completing payment in your UPI app, copy the 12-digit UPI Reference / UTR Number
                        from your receipt and enter it below. Our team verifies the transaction and activates your pass.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Full Name"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-[#EF233C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Account Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-[#EF233C]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-neutral-300 font-bold">
                        12-Digit UPI Reference Number (UTR / Ref ID) *
                      </label>
                      <span className="text-[10px] text-neutral-400 font-mono">e.g. 429817293812</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={utrNumber}
                      onChange={(e) => {
                        setUtrNumber(e.target.value);
                        if (utrError) setUtrError(null);
                      }}
                      placeholder="Enter 12-digit UTR from your GPay / PhonePe / Paytm receipt"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    {utrError && <p className="text-[11px] text-red-400 mt-1">{utrError}</p>}
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-neutral-400">
                      <span>Selected Plan:</span>
                      <span className="font-bold text-white">{activeTier.name}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Amount Payable:</span>
                      <span className="font-bold text-amber-400 text-sm">{activeTier.displayInr}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeTier.isFounder
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-amber-500/40 hover:scale-[1.02] active:scale-95'
                        : 'red-cta-btn text-white shadow-red-600/30 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Submitting Verification...</span>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>I Have Paid {activeTier.displayInr} • Submit UTR for Activation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 text-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Protected UPI Merchant Verification • Direct Clearance</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE (Payment Proof Submitted & Live Instant Activation) */}
        {currentStep === 'submitted' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center max-w-xl mx-auto space-y-6"
          >
            {liveStatus === 'approved' ? (
              /* INSTANT APPROVAL CELEBRATION (Like ChatGPT) */
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-4 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.6)] animate-bounce">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 bg-emerald-500 text-black shadow-lg shadow-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rank Instantly Activated</span>
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Payment Verified & Rank Activated!
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-md mx-auto leading-relaxed">
                    Congratulations, <span className="text-white font-bold">{name}</span>! The Owner has confirmed your
                    payment in Axis Bank. Your <span className="text-emerald-400 font-bold">{activeTier.name}</span> pass
                    is now officially live and active.
                  </p>
                </div>

                {/* Activated Pass Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-black to-emerald-950/40 border border-emerald-500/40 text-left font-mono text-xs space-y-2.5 shadow-xl">
                  <div className="flex justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-neutral-400">Live Status</span>
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ACTIVE & UNLOCKED
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Granted Rank</span>
                    <span className="text-white font-bold">{activeTier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Verified UTR</span>
                    <span className="text-emerald-300 font-bold">{submittedUtr}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-sm font-black transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95"
                >
                  🚀 Launch IntelicatAI with {activeTier.name}
                </button>
              </div>
            ) : liveStatus === 'rejected' ? (
              /* REJECTED STATE */
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,35,60,0.4)]">
                  <X className="w-8 h-8 stroke-[3]" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-red-500/20 border border-red-500/40 text-red-400">
                    Verification Unsuccessful
                  </span>
                  <h2 className="text-2xl font-black text-white">UTR Could Not Be Verified</h2>
                  <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto">
                    The submitted UTR number could not be matched against our Axis Bank statement. Please
                    re-check your banking receipt or contact the Owner.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('upi_payment')}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Re-enter Correct UTR
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl red-cta-btn text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* PENDING & LIVE LISTENING STATE (Awaiting 1-Click Owner Approval) */
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.4)] relative">
                  <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
                  </span>
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-amber-500/20 border border-amber-400/40 text-amber-300">
                    Live Real-Time Verification
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Awaiting Owner Approval...
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md mx-auto">
                    Your UTR reference for <span className="text-amber-300 font-bold">{activeTier.name} ({activeTier.displayInr})</span> has
                    been delivered to the Platform Owner.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="p-5 rounded-2xl bg-neutral-900 border border-white/15 text-left font-mono text-xs space-y-2.5">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-neutral-400">Live Status</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      LISTENING FOR APPROVAL...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Selected Plan</span>
                    <span className="text-white font-bold">{activeTier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Amount</span>
                    <span className="text-white font-bold">{activeTier.displayInr} ({activeTier.displayPrice})</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="text-neutral-400">Submitted UTR</span>
                    <span className="text-emerald-400 font-bold text-sm tracking-wider">{submittedUtr}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-left space-y-1 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Instant Activation Enabled:</span>
                  </p>
                  <p className="text-neutral-300 text-[11px]">
                    Leave this window open. As soon as the Owner confirms your transaction in Axis Bank and taps
                    Approve, your screen will automatically unlock your pass in real time!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRef ? 'Copied Details!' : 'Copy Reference Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl red-cta-btn text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-600/30"
                  >
                    Return to IntelicatAI
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
