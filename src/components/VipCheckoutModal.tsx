import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Zap,
  Download,
  Copy,
  ArrowRight,
  Cat,
  Coins,
  QrCode,
  CheckCircle2,
  Rocket,
  Flame,
  Globe,
  Radio,
  FileText,
  BadgePercent,
  Laugh,
  DollarSign,
  Share2,
} from 'lucide-react';
import { INTELLICAT_LOGO_URL } from '../constants';

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
  initialTier?: string;
}

export const VipCheckoutModal: React.FC<VipCheckoutModalProps> = ({
  isOpen,
  onClose,
  onVipPurchased,
  initialTier = 'pro',
}) => {
  const [selectedTier, setSelectedTier] = useState<string>(initialTier || 'pro');
  const [name, setName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex@catcode.ai');
  const [paymentMethod, setPaymentMethod] = useState<
    'card' | 'apple' | 'crypto' | 'mars_wire' | 'black_card' | 'tokens' | 'paw_iou'
  >('card');

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [fixedDiscount, setFixedDiscount] = useState<number | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Processing & Success
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('Encrypting payment token...');
  const [purchasedVip, setPurchasedVip] = useState<VipData | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    if (initialTier) {
      setSelectedTier(initialTier);
    }
  }, [initialTier]);

  if (!isOpen) return null;

  const tiers = [
    {
      id: 'starter',
      name: 'Cyber Cat VIP',
      price: 29,
      displayPrice: '$29',
      badge: 'Fast Track',
      description: 'Instant priority access to IntelicatAI Cat Code & smart debugging.',
      perks: [
        'Guaranteed Alpha Cohort Spot (#048)',
        'Unlimited Cyber Cat Code Generation',
        'Sub-15ms Low-Latency Cloud Compute',
        'Exclusive Discord Cyber Cat Badge',
      ],
      popular: false,
      isFounderJoke: false,
    },
    {
      id: 'pro',
      name: 'Feline Pro VIP',
      price: 79,
      displayPrice: '$79',
      badge: 'Most Popular',
      description: 'Full feline coder power with priority GPU streaming & architectural design.',
      perks: [
        'Everything in Cyber Cat VIP, plus:',
        'High-speed Gemini 3.6 Flash streaming token boost',
        'Multi-language code refactoring engine',
        'Cryptographic Digital Pass #048 with Verified Hash',
        'Direct 1-on-1 Developer Support channel',
      ],
      popular: true,
      isFounderJoke: false,
    },
    {
      id: 'lifetime',
      name: 'Cat Lifetime VIP',
      price: 199,
      displayPrice: '$199',
      badge: 'Lifetime Key',
      description: 'Permanent VIP status, custom fine-tuning & early drops with zero subscriptions.',
      perks: [
        'Everything in Feline Pro VIP, plus:',
        'Permanent Lifetime VIP Status & Zero Subscription',
        'Custom Intelicat AI system prompt overrides',
        'Exclusive Holographic Pass with VIP Token',
        'Priority feature voting & roadmapping input',
      ],
      popular: false,
      isFounderJoke: false,
    },
    {
      id: 'founder_billion',
      name: 'Founder God-Tier Access',
      price: 1000000000,
      displayPrice: '$1,000,000,000',
      badge: '👑 $1 BILLION (JOKE TIER)',
      description:
        'Acquire supreme god-tier planetary ownership of the cat metaverse. Includes 51% hypothetical equity in catnip, a direct red rotary telephone to Intellicat, and 24K gold cat ears delivered to your submarine.',
      perks: [
        '✨ 1-on-1 direct dial red rotary hotline to Chief Cyber Cat',
        '🐱 Solid 24k Gold Cat Ears & Titanium Collar shipped to your secret bunker',
        '🪙 50.0001% hypothetical controlling stake in intergalactic catnip futures',
        '⚡ Oregon Cloud Datacenter GPU #001 permanently laser-engraved with your name',
        '🪐 VIP Priority ahead of Elon Musk, NASA, and the Galactic Cat Federation',
        '📜 Hand-transcribed thank you poem written in raw binary on authentic papyrus',
        '🍗 Unlimited digital tuna treats served with 0.0001ms quantum latency',
      ],
      popular: false,
      isFounderJoke: true,
    },
  ];

  const activeTierObj = tiers.find((t) => t.id === selectedTier) || tiers[1];
  const isFounder = activeTierObj.isFounderJoke;
  const basePrice = activeTierObj.price;

  // Calculate price with discounts
  let finalPrice = basePrice;
  let discountAmount = 0;

  if (fixedDiscount !== null) {
    discountAmount = fixedDiscount;
    finalPrice = Math.max(0, basePrice - fixedDiscount);
  } else if (discountPercent > 0) {
    discountAmount = Math.round(basePrice * (discountPercent / 100));
    finalPrice = Math.max(0, basePrice - discountAmount);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'BILLIONAIRE' || code === 'RICH' || code === 'DISCOUNT') {
      if (isFounder) {
        setFixedDiscount(999999950); // Leaves $50
        setPromoApplied(true);
        setPromoError(null);
      } else {
        setDiscountPercent(90);
        setFixedDiscount(null);
        setPromoApplied(true);
        setPromoError(null);
      }
    } else if (code === 'JOKE' || code === 'MEOW100' || code === 'FREEPASS' || code === 'FOUNDER') {
      setDiscountPercent(100);
      setFixedDiscount(null);
      setPromoApplied(true);
      setPromoError(null);
    } else if (code === 'CATCODE' || code === 'MEOW' || code === 'VIP50') {
      setDiscountPercent(50);
      setFixedDiscount(null);
      setPromoApplied(true);
      setPromoError(null);
    } else if (code === 'ALPHA' || code === 'CAT20') {
      setDiscountPercent(20);
      setFixedDiscount(null);
      setPromoApplied(true);
      setPromoError(null);
    } else {
      setPromoError('Invalid promo code. Try "JOKE", "BILLIONAIRE", or "CATCODE"');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setProcessing(true);

    if (isFounder) {
      setProcessingStep('Contacting the Federal Reserve for $1,000,000,000 clearance...');
      setTimeout(() => {
        setProcessingStep('Minting 24K Solid Gold Holographic Pass #001...');
      }, 700);
      setTimeout(() => {
        setProcessingStep('Laser-engraving your name onto Oregon GPU Mainframe #001...');
      }, 1400);
      setTimeout(() => {
        setProcessingStep('Notifying the Galactic Cat Council of your supreme ownership...');
      }, 2100);
      setTimeout(() => {
        const serial = `FOUNDER-TRILLION-CAT-#001-GODTIER`;
        const vipData: VipData = {
          name,
          email,
          tierId: activeTierObj.id,
          tierName: activeTierObj.name,
          serialId: serial,
          purchaseDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          amountPaid: `$1,000,000,000.00 (SIMULATED JOKE)`,
          paymentMethod: paymentMethod.toUpperCase().replace('_', ' '),
          isFounder: true,
        };

        setProcessing(false);
        setPurchasedVip(vipData);
        onVipPurchased?.(vipData);
      }, 2800);
    } else {
      setProcessingStep('Encrypting cryptographic credentials...');
      setTimeout(() => {
        setProcessingStep('Connecting to Intelicat Edge VIP network...');
      }, 600);
      setTimeout(() => {
        setProcessingStep('Generating verified VIP Alpha Pass #048...');
      }, 1200);
      setTimeout(() => {
        const serial = `CAT-VIP-2026-${Math.floor(1000 + Math.random() * 9000)}-#048`;
        const vipData: VipData = {
          name,
          email,
          tierId: activeTierObj.id,
          tierName: activeTierObj.name,
          serialId: serial,
          purchaseDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          amountPaid: `$${finalPrice}.00`,
          paymentMethod: paymentMethod.toUpperCase(),
          isFounder: false,
        };

        setProcessing(false);
        setPurchasedVip(vipData);
        onVipPurchased?.(vipData);
      }, 1800);
    }
  };

  const handleCopyCredentials = () => {
    if (!purchasedVip) return;
    const text = `🐾 INTELICATAI VIP VERIFIED CREDENTIAL\nPassholder: ${purchasedVip.name}\nEmail: ${purchasedVip.email}\nTier: ${purchasedVip.tierName}\nVIP Serial: ${purchasedVip.serialId}\nIssuance: ${purchasedVip.purchaseDate}\nStatus: ACTIVE & VERIFIED\nAmount: ${purchasedVip.amountPaid}\nSpecial: ${purchasedVip.isFounder ? '👑 1 BILLION DOLLAR FOUNDER' : 'ALPHA COHORT #048'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadPass = () => {
    if (!purchasedVip) return;
    const content =
      `===================================================\n` +
      `🐾 INTELICATAI OFFICIAL DIGITAL VIP PASS\n` +
      `===================================================\n\n` +
      `👑 PASSHOLDER:   ${purchasedVip.name}\n` +
      `📧 EMAIL:        ${purchasedVip.email}\n` +
      `🏆 TIER:         ${purchasedVip.tierName}\n` +
      `🔑 VIP SERIAL:   ${purchasedVip.serialId}\n` +
      `📅 DATE ISSUED:  ${purchasedVip.purchaseDate}\n` +
      `💳 TOTAL PAID:   ${purchasedVip.amountPaid} via ${purchasedVip.paymentMethod}\n` +
      `🔒 STATUS:       CRYPTOGRAPHICALLY SIGNED & ACTIVE\n\n` +
      `---------------------------------------------------\n` +
      `OFFICIAL PRIVILEGES & PERKS:\n` +
      (purchasedVip.isFounder
        ? `- 50.0001% hypothetical controlling stake in intergalactic catnip\n- 24K Solid Gold Cat Ears delivered to your bunker\n- Direct red rotary hotline to Chief Cyber Cat\n- Oregon Cloud Datacenter GPU #001 permanently laser-engraved with your name\n- Unlimited 0.0001ms quantum latency Cat Code access\n`
        : `- Unlimited Cyber Cat Code generation with Gemini 3.6 Flash acceleration\n- Sub-12ms priority inference dispatch\n- Guaranteed Alpha Cohort spot (#048)\n- Verified Discord Cyber Cat Badge\n`) +
      `---------------------------------------------------\n` +
      `IntellicatAI Systems • Technology Crafted for AI Not Machines\n` +
      `Cryptographic Proof Hash: 0xCAT_9971_B1LL10N_FD782`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellicat-${purchasedVip.isFounder ? 'founder-billion-pass' : 'vip-pass'}-${purchasedVip.serialId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="relative w-full max-w-5xl rounded-[32px] bg-[#0c0c10] border border-white/15 shadow-[0_0_80px_rgba(239,35,60,0.4)] p-5 sm:p-8 text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State: Checkout Form VS Success Confirmation */}
        {!purchasedVip ? (
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
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EF233C]/20 border border-[#EF233C]/40 text-[#EF233C] text-xs font-bold uppercase tracking-wider mb-2">
                <Crown className="w-3.5 h-3.5" />
                VIP Priority Access Pass
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Unlock <span className="text-[#EF233C]">IntellicatAI VIP</span> Membership
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Choose your official tier below — from fast-track Alpha developer passes to the supreme $1 Billion Founder joke tier!
              </p>
            </div>

            {/* Step 1: 4 Tier Selector Cards (including $1 Billion Joke Tier) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {tiers.map((t) => {
                const isSelected = selectedTier === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTier(t.id)}
                    className={`relative rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? t.isFounderJoke
                          ? 'bg-gradient-to-b from-[#2a1b08] via-[#1a1208] to-[#120d06] border-amber-400 shadow-xl shadow-amber-500/30 ring-2 ring-amber-400'
                          : 'bg-gradient-to-b from-[#1f1013] to-[#121218] border-[#EF233C] shadow-lg shadow-red-600/20 ring-1 ring-[#EF233C]'
                        : t.isFounderJoke
                        ? 'bg-gradient-to-b from-[#18130a] to-[#100d08] border-amber-500/30 hover:border-amber-400/60'
                        : 'bg-[#14141a] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Badge */}
                    {t.badge && (
                      <span
                        className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                          t.isFounderJoke
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black animate-pulse'
                            : t.popular
                            ? 'bg-[#EF233C] text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-bold text-sm ${t.isFounderJoke ? 'text-amber-300' : 'text-white'}`}>
                          {t.name}
                        </h3>
                      </div>
                      <div className="mb-2">
                        <span
                          className={`font-black tracking-tight ${
                            t.isFounderJoke
                              ? 'text-lg sm:text-xl text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : 'text-xl sm:text-2xl text-[#EF233C]'
                          }`}
                        >
                          {t.displayPrice}
                        </span>
                        {t.isFounderJoke && (
                          <span className="text-[10px] text-amber-300/80 block font-semibold">
                            (100% Free Joke Checkout)
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-400 mb-3 leading-relaxed line-clamp-3">
                        {t.description}
                      </p>

                      <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                        {t.perks.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                            <Check
                              className={`w-3 h-3 shrink-0 mt-0.5 ${
                                t.isFounderJoke ? 'text-amber-400' : 'text-[#EF233C]'
                              }`}
                            />
                            <span className="leading-tight line-clamp-2">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? t.isFounderJoke
                              ? 'border-amber-400 bg-amber-400'
                              : 'border-[#EF233C] bg-[#EF233C]'
                            : 'border-white/30'
                        }`}
                      >
                        {isSelected && (
                          <Check className={`w-2.5 h-2.5 ${t.isFounderJoke ? 'text-black' : 'text-white'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Founder Tier Special Banner If Selected */}
            {isFounder && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    <Crown className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-2">
                      <span>THE $1,000,000,000 FOUNDER JOKE CHECKOUT</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
                        FUNNY MODE
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-200/80">
                      You are purchasing supreme cosmic ownership of IntellicatAI! No real money is charged — hit "Simulate Billionaire Checkout" below for instant $1B founder status!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPromoCode('JOKE');
                      setDiscountPercent(100);
                      setPromoApplied(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer shadow-md"
                  >
                    Apply "JOKE" 100% Off
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Checkout Form & Summary */}
            <form onSubmit={handlePay} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Form: Passholder Details & Payment Selection (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-[#EF233C]" />
                    Passholder Identity
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-[#EF233C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Email (For VIP License)</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@catcode.ai"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-[#EF233C]"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Switcher */}
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#EF233C]" />
                      Payment Method
                    </span>
                    {isFounder && (
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Billionaire Options Active
                      </span>
                    )}
                  </h4>

                  {/* Standard Payment Methods vs Founder Joke Methods */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-[#EF233C]/20 border-[#EF233C] text-white'
                          : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[#EF233C]" />
                      <span>Credit Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('apple')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'apple'
                          ? 'bg-white/20 border-white text-white'
                          : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-white" />
                      <span>Apple Pay / GPay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('crypto')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                        paymentMethod === 'crypto'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Crypto (SOL/ETH)</span>
                    </button>
                  </div>

                  {/* Additional Joke Options for $1B Founder */}
                  {isFounder && (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mars_wire')}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          paymentMethod === 'mars_wire'
                            ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                            : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Rocket className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mars Wire</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('tokens')}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          paymentMethod === 'tokens'
                            ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                            : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>1B Arcade Tokens</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paw_iou')}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          paymentMethod === 'paw_iou'
                            ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                            : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Cat className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sign With Paw (IOU)</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#EF233C]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Expiry</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#EF233C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">CVC</label>
                          <input
                            type="text"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#EF233C]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'apple' && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-neutral-300">
                      ⚡ One-touch instant checkout with Apple Pay / Google Pay authorized.
                    </div>
                  )}

                  {paymentMethod === 'crypto' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-200">
                      🪙 Instant Web3 checkout supported for Solana (SOL), Ethereum (ETH), and USDC.
                    </div>
                  )}

                  {paymentMethod === 'mars_wire' && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-center text-xs text-amber-200">
                      🚀 Direct SWIFT wire from Olympus Mons Central Martian Bank selected. No transaction fee.
                    </div>
                  )}

                  {paymentMethod === 'tokens' && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-center text-xs text-amber-200">
                      🪙 1,000,000,000 Chuck E. Cheese / Cyber Arcade Tokens accepted with instant redemption.
                    </div>
                  )}

                  {paymentMethod === 'paw_iou' && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-center text-xs text-amber-200">
                      🐾 Legally binding Cat Paw Signature recorded into blockchain feline court ledger.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Summary Card (5 cols) */}
              <div
                className={`lg:col-span-5 rounded-2xl p-5 border space-y-4 ${
                  isFounder
                    ? 'bg-gradient-to-b from-[#1c140a] to-[#120e06] border-amber-400/50 shadow-xl shadow-amber-500/10'
                    : 'bg-[#14141c] border-white/15'
                }`}
              >
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className={isFounder ? 'text-amber-400 text-[11px] font-bold' : 'text-[#EF233C] text-[11px]'}>
                    {isFounder ? '👑 Billionaire Founder' : 'Instant Activation'}
                  </span>
                </h4>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>{activeTierObj.name}</span>
                    <span className="font-mono">{formatCurrency(basePrice)}</span>
                  </div>

                  {isFounder && (
                    <>
                      <div className="flex justify-between text-neutral-400 text-[11px]">
                        <span>24K Solid Gold Cat Ears</span>
                        <span className="text-amber-300 font-semibold">Included ($0)</span>
                      </div>
                      <div className="flex justify-between text-neutral-400 text-[11px]">
                        <span>Submarine GPU Delivery</span>
                        <span className="text-amber-300 font-semibold">Free Delivery</span>
                      </div>
                      <div className="flex justify-between text-neutral-400 text-[11px]">
                        <span>Convenience Joke Fee</span>
                        <span className="text-neutral-400">$4.20 (Waived)</span>
                      </div>
                    </>
                  )}

                  {promoApplied && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>
                        Promo Discount {discountPercent > 0 ? `(${discountPercent}%)` : '(Billionaire Cut)'}
                      </span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-baseline font-bold text-white">
                    <span>Total Due Now</span>
                    <span className={`text-xl font-mono ${isFounder ? 'text-amber-400 font-black' : 'text-[#EF233C]'}`}>
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                </div>

                {/* Promo Code Box */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={isFounder ? 'Promo (e.g. "JOKE" / "RICH")' : 'Promo (e.g. "CATCODE")'}
                      className={`flex-1 px-3 py-1.5 rounded-xl bg-neutral-900 border text-white text-xs focus:outline-none ${
                        isFounder ? 'border-amber-400/40 focus:border-amber-400' : 'border-white/15 focus:border-[#EF233C]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-[11px] text-red-400 mt-1">{promoError}</p>}
                  {promoApplied && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Code applied! Discount activated.
                    </p>
                  )}
                </div>

                {/* Submit Buy Button */}
                <button
                  type="submit"
                  disabled={processing}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                    isFounder
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-amber-500/40'
                      : 'red-cta-btn text-white shadow-red-600/30'
                  }`}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs sm:text-sm">{processingStep}</span>
                    </div>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>
                        {isFounder
                          ? `Simulate $1B Founder Checkout (${formatCurrency(finalPrice)})`
                          : `Buy VIP Pass (${formatCurrency(finalPrice)})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
                  <ShieldCheck className={`w-3.5 h-3.5 ${isFounder ? 'text-amber-400' : 'text-[#EF233C]'}`} />
                  <span>
                    {isFounder
                      ? '100% Joke Simulated • Instant Billionaire Founder Pass'
                      : '256-Bit Encrypted • Instant Digital Pass Delivery'}
                  </span>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* SUCCESS STATE: VIP CONFIRMED & BADGE ACTIVATED */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4 text-center max-w-2xl mx-auto space-y-6"
          >
            {/* Celebration Icon */}
            <div className="relative inline-block">
              <div
                className={`w-20 h-20 rounded-3xl text-white flex items-center justify-center mx-auto ${
                  purchasedVip.isFounder
                    ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-[0_0_60px_rgba(245,158,11,0.8)] text-black'
                    : 'bg-gradient-to-tr from-[#EF233C] to-amber-500 shadow-[0_0_40px_rgba(239,35,60,0.5)]'
                }`}
              >
                <Crown className={`w-10 h-10 animate-bounce ${purchasedVip.isFounder ? 'text-black' : 'text-white'}`} />
              </div>
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
            </div>

            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold mb-2 ${
                  purchasedVip.isFounder
                    ? 'bg-amber-500/30 border border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                {purchasedVip.isFounder
                  ? '👑 1 BILLION DOLLAR FOUNDER CONFIRMED • COSMIC CAT OWNERSHIP ACTIVE'
                  : 'PAYMENT CONFIRMED • VIP STATUS ACTIVE'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                {purchasedVip.isFounder
                  ? `Hail the Supreme Founder, ${purchasedVip.name}!`
                  : `Welcome to the VIP Alpha Cohort, ${purchasedVip.name}!`}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-lg mx-auto">
                {purchasedVip.isFounder
                  ? 'Your $1,000,000,000 Founder Access pass is live! 24K gold cat ears and a direct red rotary telephone to the chief cyber cat are now bound to your account.'
                  : 'Your VIP digital pass and Cat Code unlimited privileges are now permanently activated.'}
              </p>
            </div>

            {/* Holographic VIP Member Pass Card (Interactive Flip) */}
            <div
              onClick={() => setCardFlipped(!cardFlipped)}
              className={`relative rounded-3xl p-6 text-left cursor-pointer transition-all duration-500 overflow-hidden border-2 select-none group ${
                purchasedVip.isFounder
                  ? 'bg-gradient-to-br from-[#2a1c06] via-[#1a1208] to-[#0c0803] border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)] ring-1 ring-amber-300'
                  : 'bg-gradient-to-br from-[#1c1214] via-[#121218] to-[#0c0c10] border-[#EF233C] shadow-2xl'
              }`}
            >
              {/* Corner Watermark Badge */}
              <div
                className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md ${
                  purchasedVip.isFounder ? 'bg-amber-400 text-black' : 'bg-[#EF233C] text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{purchasedVip.isFounder ? 'FOUNDER #001 ($1B)' : 'VIP #048'}</span>
              </div>

              {!cardFlipped ? (
                /* Card Front */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl overflow-hidden border flex items-center justify-center bg-black shrink-0 ${
                        purchasedVip.isFounder
                          ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                          : 'border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      }`}
                    >
                      <img
                        src={INTELLICAT_LOGO_URL}
                        alt="IntellicatAI"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-black text-lg ${
                          purchasedVip.isFounder ? 'text-amber-300' : 'text-white'
                        }`}
                      >
                        IntellicatAI Cyber Pass
                      </h3>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          purchasedVip.isFounder ? 'text-amber-400' : 'text-[#EF233C]'
                        }`}
                      >
                        {purchasedVip.tierName}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Passholder</span>
                      <span className="text-white font-bold truncate block">{purchasedVip.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Serial Code</span>
                      <span
                        className={`font-bold truncate block ${
                          purchasedVip.isFounder ? 'text-amber-400' : 'text-[#EF233C]'
                        }`}
                      >
                        {purchasedVip.serialId}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Date Issued</span>
                      <span className="text-neutral-200 truncate block">{purchasedVip.purchaseDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Status</span>
                      <span className="text-emerald-400 font-bold block">VERIFIED & LIVE</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>
                      {purchasedVip.isFounder
                        ? '👑 Supreme Founder Privileges Active'
                        : '🐾 Unlimited Cat Code & Sub-12ms SLA'}
                    </span>
                    <span className="text-neutral-400 group-hover:text-white transition-colors">
                      Click to flip card ↺
                    </span>
                  </div>
                </div>
              ) : (
                /* Card Back */
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400">AUTHENTICATION HASH</span>
                    <span className="text-xs text-amber-400 font-bold">PASS-SIGNATURE-2026</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/80 font-mono text-[11px] text-neutral-300 space-y-1">
                    <p className="text-neutral-400">// CRYPTOGRAPHIC VERIFICATION // </p>
                    <p>SHA-256: 9f8a2b3c...cat_founder_1billion</p>
                    <p>INFERENCE SLA: 0.0001ms QUANTUM PRIORITY</p>
                    <p>COHORT: SUPREME FOUNDER #001</p>
                  </div>
                  <div className="text-center text-[11px] text-neutral-400">
                    Click to flip back ↺
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Copy, Download, Return */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCopyCredentials}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId ? 'Copied to Clipboard!' : 'Copy VIP Credentials'}</span>
              </button>

              <button
                onClick={handleDownloadPass}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                {downloadSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                <span>{downloadSuccess ? 'Downloaded!' : 'Download Digital Pass (.txt)'}</span>
              </button>

              <button
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg ${
                  purchasedVip.isFounder
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/40 hover:scale-105'
                    : 'red-cta-btn text-white shadow-red-600/30'
                }`}
              >
                Return to IntellicatAI
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
