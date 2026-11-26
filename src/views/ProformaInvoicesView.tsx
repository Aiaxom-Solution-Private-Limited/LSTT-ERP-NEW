import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Search,
  Printer,
  ShieldAlert,
  Landmark,
  CreditCard,
  X
} from 'lucide-react';
import { ProformaInvoice } from '../types';

export const ProformaInvoicesView: React.FC = () => {
  const {
    proformaInvoices,
    selectedDepartment,
    currentEmployee,
    uploadPaymentProof,
    verifyPaymentReceipt,
    createProformaInvoice,
    leads,
    taxConfigs
  } = useDmc();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<ProformaInvoice | null>(null);
  const [printToast, setPrintToast] = useState<string | null>(null);

  // Upload proof modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [proofUtr, setProofUtr] = useState('');
  const [proofFile, setProofFile] = useState('neft_transfer_receipt_6291.pdf');
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'upi' | 'cheque'>('bank_transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Accounts verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');

  // Create Proforma Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEnquiryId, setNewEnquiryId] = useState(leads[0]?.id || '');
  const [newTotalAmount, setNewTotalAmount] = useState<number>(100000);
  const [newTokenPercentage, setNewTokenPercentage] = useState<number>(30);

  const isAccountsRole = selectedDepartment === 'accounts' || selectedDepartment === 'executive';
  const activeTaxConfig = taxConfigs[0] || {
    ratePct: 5,
    applicableCategory: 'tour_package',
    taxName: 'GST on Tour Packages'
  };

  const filteredInvoices = proformaInvoices.filter(inv => {
    const matchesFilter = statusFilter === 'all' ? true : inv.status === statusFilter;
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.enquiryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.verifiedBankReference?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  const totalInvoiced = proformaInvoices.reduce((acc, curr) => acc + curr.totalAgreedSellingPrice, 0);
  const totalVerified = proformaInvoices
    .filter(i => i.status === 'verified_paid')
    .reduce((acc, curr) => acc + (curr.verifiedAmountReceived || curr.tokenAmountPayable), 0);
  const pendingVerificationCount = proformaInvoices.filter(i => i.status === 'proof_uploaded').length;

  const handleOpenUploadProof = (inv: ProformaInvoice) => {
    setSelectedInvoice(inv);
    setPaidAmount(inv.tokenAmountPayable);
    setProofUtr(`UTR${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setShowUploadModal(true);
  };

  const handleOpenVerification = (inv: ProformaInvoice) => {
    setSelectedInvoice(inv);
    setBankRefNo(`HDFC-STMT-${Math.floor(100000 + Math.random() * 900000)}`);
    setVerificationRemarks('Verified in HDFC Bank A/c 50200049219012. Token credited.');
    setShowVerifyModal(true);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    uploadPaymentProof(
      selectedInvoice.id,
      `/uploads/receipts/${proofFile}`,
      `Paid via ${paymentMode.toUpperCase()} | Ref/UTR: ${proofUtr} | Amount: Rs ${paidAmount}`
    );
    setShowUploadModal(false);
    setSelectedInvoice(null);
  };

  const handleVerifySubmit = (status: 'verified' | 'rejected') => {
    if (!selectedInvoice) return;
    const isVerified = status === 'verified';
    verifyPaymentReceipt(
      selectedInvoice.id,
      isVerified,
      verificationRemarks,
      selectedInvoice.tokenAmountPayable,
      bankRefNo,
      'NEFT/RTGS'
    );
    setShowVerifyModal(false);
    setSelectedInvoice(null);
  };

  const handleCreateProformaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find(l => l.id === newEnquiryId);
    if (!lead) return;

    const baseAmount = Number(newTotalAmount);
    const gstRate = 5;
    const gstAmount = Math.round(baseAmount * 0.05);
    const totalSelling = baseAmount + gstAmount;
    const tokenAmount = Math.round(totalSelling * (Number(newTokenPercentage) / 100));

    createProformaInvoice({
      enquiryId: lead.id,
      quotationId: lead.quotationIds[0] || 'QT-2026-0001',
      quotationVersionCode: 'V1',
      clientName: lead.clientName,
      contactEmail: lead.email,
      contactPhone: lead.phone,
      destination: lead.destination,
      travelDates: `${lead.travelStartDate} to ${lead.travelEndDate}`,
      paxCount: lead.adults + lead.children,
      totalAgreedSellingPrice: totalSelling,
      tokenPercentage: Number(newTokenPercentage),
      tokenAmountPayable: tokenAmount,
      gstRate: gstRate,
      gstAmount: gstAmount,
      paymentDueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      bankDetails: {
        accountName: "Let's See Tour & Travels Pvt. Ltd.",
        bankName: "HDFC Bank Ltd.",
        accountNumber: "50200049219012",
        ifscCode: "HDFC0000382",
        upiId: "letssee.guwahati@hdfcbank"
      },
      termsAndConditions: [
        "Token advance is non-refundable upon hotel confirmation voucher issuance.",
        "5% GST applicable under SAC Code 998555 (Tour Operator Services).",
        "Balance payment due 7 days prior to travel departure."
      ],
      issuedBy: currentEmployee?.name || 'Sales Executive'
    });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Maker-Checker Financial Controls · 5% GST Compliant
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Proforma Invoices & Payment Verification
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sales issues token proformas and uploads payment proof; Accounts verifies bank statements before final booking activation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shrink-0"
        >
          <Receipt className="w-4 h-4" />
          <span>New Proforma Invoice</span>
        </button>
      </div>

      {printToast && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{printToast}</span>
          <button onClick={() => setPrintToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pure KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Invoiced (Inc GST)</span>
            <Receipt className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
            ₹{totalInvoiced.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across issued proformas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Accounts Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-3 tabular-nums">
            ₹{totalVerified.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Bank receipts credited</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Pending Bank Audit</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-3 tabular-nums">{pendingVerificationCount}</div>
          <p className="text-xs text-slate-500 mt-1">Awaiting Accounts sign-off</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">GST Configuration</span>
            <Landmark className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-3 tabular-nums">{activeTaxConfig.ratePct}%</div>
          <p className="text-xs text-slate-500 mt-1">SAC 998555 Tour Operator</p>
        </div>
      </div>

      {/* Pure White Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['all', 'issued', 'proof_uploaded', 'verified_paid'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, client or bank ref..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-6">Invoice # & Date</th>
                <th className="py-3.5 px-6">Client & Destination</th>
                <th className="py-3.5 px-6">Total & 5% GST</th>
                <th className="py-3.5 px-6">Token Required</th>
                <th className="py-3.5 px-6">Proof & Bank Ref</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No proforma invoices found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const hasProof = !!inv.paymentProofUrl;
                  const isVerified = inv.status === 'verified_paid';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-slate-900">{inv.id}</div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {inv.issuedAt.split('T')[0]} · <span className="text-emerald-700 font-medium">{inv.enquiryId}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{inv.clientName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {inv.destination} · <span className="tabular-nums">{inv.contactPhone}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 tabular-nums">
                        <div className="font-bold text-slate-900">
                          ₹{inv.totalAgreedSellingPrice.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          GST {inv.gstRate}%: ₹{inv.gstAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-4 px-6 tabular-nums">
                        <div className="font-bold text-emerald-800">
                          ₹{inv.tokenAmountPayable.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {inv.tokenPercentage}% advance
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {hasProof ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="font-mono text-xs truncate max-w-[180px]">
                                {inv.paymentProofUrl ? inv.paymentProofUrl.replace('/uploads/receipts/', '') : 'Proof attached'}
                              </span>
                            </div>
                            {inv.verifiedBankReference && (
                              <div className="text-xs text-emerald-700 font-mono">
                                {inv.verifiedBankReference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No proof uploaded</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold capitalize ${
                          isVerified
                            ? 'text-emerald-700'
                            : inv.status === 'proof_uploaded'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}>
                          {inv.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'issued' && (
                            <button
                              onClick={() => handleOpenUploadProof(inv)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload Proof</span>
                            </button>
                          )}

                          {inv.status === 'proof_uploaded' && (
                            <button
                              onClick={() => handleOpenVerification(inv)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1"
                              disabled={!isAccountsRole}
                              title={!isAccountsRole ? 'Accounts verification required' : 'Verify bank credit'}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verify Receipt</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setPrintToast(`Prepared printable Proforma PDF for ${inv.id} (${inv.clientName})`);
                              setTimeout(() => setPrintToast(null), 4000);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                            title="Print / Download Proforma Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Payment Proof Modal */}
      {showUploadModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Sales Payment Submission</p>
                <h3 className="font-bold text-slate-900 text-base mt-0.5">
                  Upload Token Proof · {selectedInvoice.id}
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Client Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedInvoice.clientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Token Required</span>
                  <span className="font-bold text-emerald-800 text-sm tabular-nums">
                    ₹{selectedInvoice.tokenAmountPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bank_transfer', 'upi', 'cheque'] as const).map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMode(pm)}
                      className={`py-2 text-center rounded-lg border font-semibold capitalize transition-colors ${
                        paymentMode === pm
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pm.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Bank Transaction / UTR Reference #
                </label>
                <input
                  type="text"
                  value={proofUtr}
                  onChange={(e) => setProofUtr(e.target.value)}
                  placeholder="e.g. UTR928419201928"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Amount Credited (INR)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Attachment File Name</label>
                <input
                  type="text"
                  value={proofFile}
                  onChange={(e) => setProofFile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accounts Maker-Checker Verification Modal */}
      {showVerifyModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">
                  Accounts Bank Statement Verification
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 text-amber-800 border-b border-slate-100 pb-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  Only authorized Accounts personnel can verify bank deposits before enabling Operations hotel voucher issuance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-500">Invoice Ref</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedInvoice.id}</div>
                </div>
                <div>
                  <span className="text-slate-500">Guest Name</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedInvoice.clientName}</div>
                </div>
                <div>
                  <span className="text-slate-500">Token Due</span>
                  <div className="font-bold text-emerald-800 tabular-nums mt-0.5">
                    ₹{selectedInvoice.tokenAmountPayable.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Total Agreed</span>
                  <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                    ₹{selectedInvoice.totalAgreedSellingPrice.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Verified Bank Statement Reference #
                </label>
                <input
                  type="text"
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(e.target.value)}
                  placeholder="e.g. HDFC-STMT-918231"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Accounts Audit Remarks
                </label>
                <textarea
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 h-20 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleVerifySubmit('rejected')}
                  className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Receipt</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifySubmit('verified')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Verify</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Proforma Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">Issue New Proforma Invoice</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProformaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Select Client Enquiry</label>
                <select
                  value={newEnquiryId}
                  onChange={(e) => setNewEnquiryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} ({l.id} · {l.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Package Value (Excl. Tax)
                  </label>
                  <input
                    type="number"
                    value={newTotalAmount}
                    onChange={(e) => setNewTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Token Advance (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newTokenPercentage}
                    onChange={(e) => setNewTokenPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span>Base Amount</span>
                  <span className="font-semibold text-slate-900">₹{newTotalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (5% Tour Package)</span>
                  <span className="font-semibold text-emerald-700">₹{Math.round(newTotalAmount * 0.05).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                  <span>Total Payable</span>
                  <span>₹{Math.round(newTotalAmount * 1.05).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-800">
                  <span>Token Required ({newTokenPercentage}%)</span>
                  <span>₹{Math.round((newTotalAmount * 1.05) * (newTokenPercentage / 100)).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Generate Proforma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
