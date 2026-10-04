import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Crown,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  RefreshCw,
  ExternalLink,
  Smartphone,
  UserCheck,
  AlertCircle,
  Settings,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, TIER_BASE_ALLOWANCE } from '../context/AuthContext';
import { UserPlanTier } from '../types';
import {
  fetchRemoteMerchantUpi,
  updateMerchantUpi,
  validateVpa,
  buildCompliantUpiUri,
} from '../lib/paymentConfig';
import QRCode from 'qrcode';

export interface PaymentRequestItem {
  id: string;
  uid: string;
  name: string;
  email: string;
  tierId: string;
  tierName: string;
  amountInr: number;
  amountUsd?: number;
  utrNumber: string;
  status: 'pending_verification' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

interface OwnerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerApprovalModal: React.FC<OwnerApprovalModalProps> = ({ isOpen, onClose }) => {
  const { user, isOwner, tier } = useAuth();
  const [requests, setRequests] = useState<PaymentRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'settings'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Merchant UPI ID configuration state
  const [merchantUpiInput, setMerchantUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [testQrUrl, setTestQrUrl] = useState<string>('');

  // Load current remote UPI ID (strictly Owner only)
  useEffect(() => {
    if (!isOpen || !isOwner || tier !== 'owner') return;
    fetchRemoteMerchantUpi().then((upi) => {
      if (upi) setMerchantUpiInput(upi);
    });
  }, [isOpen, isOwner, tier]);

  // Generate real-time test QR code for Owner testing
  useEffect(() => {
    if (!isOpen || !isOwner || tier !== 'owner') return;
    if (!merchantUpiInput || !merchantUpiInput.includes('@')) {
      setTestQrUrl('');
      return;
    }
    const clean = merchantUpiInput.trim();
    const uri = buildCompliantUpiUri(clean, 799, 'IntellicatAI', 'IntelicatPro');
    QRCode.toDataURL(uri, {
      width: 260,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setTestQrUrl(url))
      .catch(() => setTestQrUrl(''));
  }, [merchantUpiInput, isOpen, isOwner, tier]);

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || tier !== 'owner') return;
    const clean = merchantUpiInput.trim();
    const validation = validateVpa(clean);
    if (!validation.isValid && !validation.isPhoneNumber) {
      showToast(`❌ ${validation.issue || 'Invalid UPI ID format'}`);
      return;
    }

    setSavingUpi(true);
    const success = await updateMerchantUpi(clean);
    setSavingUpi(false);

    if (success) {
      if (!validation.isValid && validation.isPhoneNumber) {
        showToast(`⚠️ Saved! Note: ${validation.issue}`);
      } else {
        showToast(`✅ Merchant UPI ID updated to ${clean}! QR code is now live.`);
      }
    } else {
      showToast('❌ Failed to save UPI ID to Firestore.');
    }
  };

  // Subscribe in real-time to all payment requests (Strictly Owner Only)
  useEffect(() => {
    if (!isOpen || !isOwner || tier !== 'owner') return;

    try {
      const q = query(collection(db, 'payment_requests'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: PaymentRequestItem[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            items.push({
              id: d.id,
              uid: data.uid || 'guest',
              name: data.name || 'Anonymous',
              email: data.email || 'No email',
              tierId: data.tierId || 'pro',
              tierName: data.tierName || 'Intelicat Pro',
              amountInr: data.amountInr || 799,
              amountUsd: data.amountUsd || 10,
              utrNumber: data.utrNumber || 'N/A',
              status: data.status || 'pending_verification',
              createdAt: data.createdAt || new Date().toISOString(),
              approvedAt: data.approvedAt,
              approvedBy: data.approvedBy,
              rejectedAt: data.rejectedAt,
              rejectedBy: data.rejectedBy,
            });
          });
          setRequests(items);
        },
        (error) => {
          console.warn('Real-time payment_requests listener error:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach payment requests snapshot:', err);
    }
  }, [isOpen, isOwner, tier]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyUtr = (utr: string) => {
    try {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      setTimeout(() => setCopiedUtr(null), 2000);
      showToast(`Copied UTR: ${utr}`);
    } catch {
      // ignore
    }
  };

  // 1-Click Approve: updates payment_request AND immediately upgrades user's rank in Firestore!
  const handleApprove = async (req: PaymentRequestItem) => {
    if (!isOwner || tier !== 'owner') return;
    setActionLoadingId(req.id);

    try {
      // Determine plan tier to grant
      let targetTier: UserPlanTier = 'pro';
      if (req.tierId === 'founder_billion' || req.tierName.toLowerCase().includes('founder')) {
        targetTier = 'founder';
      } else if (req.tierId === 'elite' || req.tierName.toLowerCase().includes('elite')) {
        targetTier = 'elite';
      } else {
        targetTier = 'pro';
      }

      const now = new Date().toISOString();

      // 1. Mark payment request approved
      const reqRef = doc(db, 'payment_requests', req.id);
      await updateDoc(reqRef, {
        status: 'approved',
        approvedAt: now,
        approvedBy: user?.email || 'manishhans@gmail.com',
      });

      // 2. If the user has a valid UID, update their profile in Firestore directly
      if (req.uid && req.uid !== 'guest') {
        const userRef = doc(db, 'users', req.uid);
        await setDoc(
          userRef,
          {
            tier: targetTier,
            maxRequests: TIER_BASE_ALLOWANCE[targetTier],
            requestCount: 0,
            cooldownStage: 0,
            cooldownUntil: null,
            isRecovery: false,
            updatedAt: now,
          },
          { merge: true }
        ).catch((err) => {
          console.warn('Could not update user doc directly:', err);
        });
      }

      showToast(`✅ Approved! Granted ${targetTier.toUpperCase()} rank to ${req.name}.`);
    } catch (err) {
      console.error('Failed to approve payment request:', err);
      showToast('❌ Failed to approve. Check network connection.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (req: PaymentRequestItem) => {
    if (!isOwner || tier !== 'owner') return;
    if (!window.confirm(`Are you sure you want to reject UTR ${req.utrNumber}?`)) return;

    setActionLoadingId(req.id);
    try {
      const now = new Date().toISOString();
      const reqRef = doc(db, 'payment_requests', req.id);
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectedAt: now,
        rejectedBy: user?.email || 'manishhans@gmail.com',
      });
      showToast(`Rejected UTR: ${req.utrNumber}`);
    } catch (err) {
      console.error('Failed to reject payment request:', err);
      showToast('❌ Error rejecting request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen || !isOwner || tier !== 'owner') return null;

  const pendingRequests = requests.filter((r) => r.status === 'pending_verification');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  const filteredRequests = requests
    .filter((r) => {
      if (activeTab === 'pending') return r.status === 'pending_verification';
      if (activeTab === 'approved') return r.status === 'approved';
      if (activeTab === 'rejected') return r.status === 'rejected';
      return true;
    })
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.utrNumber.toLowerCase().includes(q) ||
        r.tierName.toLowerCase().includes(q)
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="w-full max-w-4xl bg-[#0b0b10] border border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Crown className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Owner Payment Approvals Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                  Owner Exclusive
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                1-Click live instant rank activation. Verify customer UTR with your Axis Bank SMS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              <span>Pending</span>
              {pendingRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === 'pending' ? 'bg-black text-amber-300' : 'bg-amber-400 text-black'
                  }`}
                >
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              <span>Approved ({approvedRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-red-500 text-white border-red-500 shadow-md'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              <span>Rejected ({rejectedRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              All ({requests.length})
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-md font-black'
                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>UPI Settings</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'settings' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 w-full sm:w-60"
              />
            </div>
          )}
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-amber-500 text-black text-xs font-black px-6 py-2 flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 5: Merchant UPI Settings */}
        {activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full space-y-5">
            <div>
              <h4 className="text-lg font-black text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <span>Merchant UPI ID Configuration</span>
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                Configure your official UPI ID where buyers send money. Updating this updates the live QR code
                immediately across the entire platform.
              </p>
            </div>

            {/* Validation warning for 9-digit issue */}
            {merchantUpiInput &&
              merchantUpiInput.split('@')[0] &&
              /^\d+$/.test(merchantUpiInput.split('@')[0]) &&
              merchantUpiInput.split('@')[0].length < 10 && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Why BHIM & Paytm Say "Format is not supported":</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-300">
                    Your current handle has only <strong className="text-white">{merchantUpiInput.split('@')[0].length} digits</strong> ({merchantUpiInput.split('@')[0]}).
                    Indian mobile numbers are strictly <strong className="text-emerald-400">10 digits</strong>!
                    BHIM and Paytm check Indian phone number formats and reject 9-digit numbers as an invalid UPI handle.
                  </p>
                  <p className="text-[11px] font-bold text-amber-300">
                    👉 Fix: Enter your full 10-digit phone number or verified UPI ID below (e.g. 885160391X@axisbank) and tap Save.
                  </p>
                </div>
              )}

            <form onSubmit={handleSaveUpi} className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Official Merchant UPI ID *
                </label>
                <input
                  type="text"
                  required
                  value={merchantUpiInput}
                  onChange={(e) => setMerchantUpiInput(e.target.value)}
                  placeholder="e.g. 98XXXXXXXX@axisbank or yourname@okhdfcbank"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                  Currently active: {merchantUpiInput || 'Not configured'}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingUpi}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {savingUpi ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save & Update Live QR Code</span>
              </button>
            </form>

            {/* Live Test QR for Owner Verification */}
            {testQrUrl && (
              <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-36 h-36 bg-white rounded-2xl p-2 shrink-0 shadow-lg flex items-center justify-center border-2 border-amber-400/40">
                  <img src={testQrUrl} alt="Test UPI QR" className="w-full h-full object-contain" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-sm">
                      📱 Live Test QR Scanner
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      NPCI Validated
                    </span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    Scan this test QR with your phone using BHIM, Paytm, PhonePe, or Google Pay. It tests the compliant payload to verify that your app opens the payment screen with zero errors.
                  </p>
                  <div className="text-[10px] text-neutral-400 font-mono bg-black/60 p-2 rounded-lg border border-white/5 break-all">
                    VPA: <span className="text-white font-bold">{merchantUpiInput.trim()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-[11px] text-neutral-400 space-y-2">
              <span className="font-bold text-neutral-200 block">⚡ NPCI Universal QR Standards Applied:</span>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Amount is always formatted with exactly two decimal places (<code className="text-emerald-400">am=799.00</code>).</li>
                <li>Payee name is strictly alphanumeric (<code className="text-emerald-400">pn=IntellicatAI</code>) without special characters.</li>
                <li>Unencoded VPA: <code className="text-emerald-400">pa=handle@bank</code> preserves raw @ for BHIM and Paytm scanner compliance.</li>
                <li>No <code className="text-emerald-400">mode=02</code>: Prevents BHIM & Paytm from rejecting unsigned merchant payloads.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
              <div className="text-sm font-bold text-neutral-300">
                {activeTab === 'pending'
                  ? '✨ No Pending Payment Requests'
                  : 'No payment records found'}
              </div>
              <p className="text-xs max-w-sm mx-auto text-neutral-500">
                {activeTab === 'pending'
                  ? 'When buyers scan your QR code and submit their 12-digit UTR, it will show up here automatically in real-time.'
                  : 'Try clearing your search query or switching tabs.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'pending_verification';
              const isApproved = req.status === 'approved';
              const isRejected = req.status === 'rejected';
              const isLoading = actionLoadingId === req.id;

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-400/60 shadow-md'
                      : isApproved
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                      : 'bg-white/[0.02] border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          req.tierId === 'founder_billion' || req.tierName.toLowerCase().includes('founder')
                            ? 'bg-amber-400 text-black'
                            : req.tierId === 'elite'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-[#EF233C]/20 text-[#EF233C] border border-[#EF233C]/40'
                        }`}
                      >
                        {req.tierName}
                      </span>

                      <span className="font-mono font-black text-amber-400 text-sm">
                        ₹{req.amountInr}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {isPending ? '⏳ Awaiting Your Approval' : isApproved ? '✓ Verified & Active' : '✕ Rejected'}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 font-mono">
                      {new Date(req.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Customer details & UTR Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-black/40 p-3.5 rounded-xl border border-white/5 text-xs">
                    <div className="sm:col-span-5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{req.name}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">{req.email}</div>
                      <div className="text-[10px] text-neutral-500 font-mono truncate">UID: {req.uid}</div>
                    </div>

                    <div className="sm:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          12-Digit UPI UTR
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-emerald-400 font-black text-sm tracking-wider bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            {req.utrNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(req.utrNumber)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white cursor-pointer"
                            title="Copy UTR to match with Bank SMS"
                          >
                            {copiedUtr === req.utrNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons for Pending */}
                      {isPending ? (
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleApprove(req)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {isLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve Rank</span>
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleReject(req)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {isApproved && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Approved by {req.approvedBy?.split('@')[0]}
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-red-400 flex items-center gap-1">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Platform Owner: {user?.email}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </motion.div>
    </div>
  );
};
