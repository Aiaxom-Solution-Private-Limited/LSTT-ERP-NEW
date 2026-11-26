import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { CustomerReceipt, SupplierPaymentVoucher } from '../types';
import { Plus, X } from 'lucide-react';

export const AccountsLedgerView: React.FC = () => {
  const {
    confirmedTours,
    receipts,
    supplierPayments,
    suppliers,
    recordCustomerReceipt,
    approveSupplierPayment,
    setSelectedTourCode,
    setPrintableDocument
  } = useDmc();

  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'receipts' | 'supplier_vouchers' | 'supplier_ledgers'>('summary');

  const [showNewReceiptModal, setShowNewReceiptModal] = useState(false);
  const [receiptTourCode, setReceiptTourCode] = useState(confirmedTours[0]?.tourCode || '');
  const [receiptAmount, setReceiptAmount] = useState(25000);
  const [receiptMode, setReceiptMode] = useState<CustomerReceipt['paymentMode']>('Bank Transfer (NEFT/RTGS)');
  const [receiptRef, setReceiptRef] = useState('NEFT-SBI-441209');
  const [receiptBank, setReceiptBank] = useState('HDFC Bank Current A/c 502000088912');

  const [approvingVoucher, setApprovingVoucher] = useState<SupplierPaymentVoucher | null>(null);
  const [disburseRef, setDisburseRef] = useState('HDFC-RTGS-990142');
  const [disburseMode] = useState('NEFT/RTGS');

  const pendingVouchers = supplierPayments.filter(p => p.status === 'pending_approval');
  const totalReceivables = confirmedTours.reduce((sum, t) => sum + t.outstandingBalance, 0);
  const totalCollections = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalSupplierDisbursements = supplierPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  const handleRecordReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tour = confirmedTours.find(t => t.tourCode === receiptTourCode);
    recordCustomerReceipt({
      tourCode: receiptTourCode,
      clientName: tour?.clientName || 'Direct Client',
      agentId: tour?.agentId,
      amount: receiptAmount,
      receivedDate: new Date().toISOString().substring(0, 10),
      paymentMode: receiptMode,
      transactionReference: receiptRef,
      bankAccount: receiptBank,
      verified: true,
      notes: 'Mid-tour balance collection'
    });
    setShowNewReceiptModal(false);
  };

  const handleDisburseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (approvingVoucher) {
      approveSupplierPayment(approvingVoucher.id, disburseRef, disburseMode);
      setApprovingVoucher(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Financial Controls & Ledgers · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Accounts, Receivables & Payables
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tour-wise collection schedules, maker-checker payment approvals, and destination vendor ledgers.
          </p>
        </div>

        <button
          onClick={() => setShowNewReceiptModal(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Customer Receipt</span>
        </button>
      </div>

      {/* Pure KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <span className="text-slate-500 font-semibold text-xs block">Customer Receipts</span>
          <div className="text-2xl font-bold text-emerald-800 mt-3 tabular-nums">
            ₹{totalCollections.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Verified bank credits</p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <span className="text-slate-500 font-semibold text-xs block">Customer Outstanding</span>
          <div className="text-2xl font-bold text-amber-700 mt-3 tabular-nums">
            ₹{totalReceivables.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">B2B credit + direct clients</p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <span className="text-slate-500 font-semibold text-xs block">Supplier Advances Paid</span>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
            ₹{totalSupplierDisbursements.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Disbursed to vendors</p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <span className="text-slate-500 font-semibold text-xs block">Pending Approvals</span>
          <div className="text-2xl font-bold text-rose-700 mt-3 tabular-nums">
            {pendingVouchers.length} Vouchers
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1 tabular-nums">
            ₹{pendingVouchers.reduce((s, v) => s + v.amount, 0).toLocaleString('en-IN')} due
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3 text-xs">
        {[
          { id: 'summary', label: 'Tour Financial Overview' },
          { id: 'supplier_vouchers', label: `Supplier Payments (${supplierPayments.length})` },
          { id: 'receipts', label: `Customer Receipts (${receipts.length})` },
          { id: 'supplier_ledgers', label: `Supplier Ledgers (${suppliers.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-2 font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: TOUR FINANCIAL MASTER */}
      {activeSubTab === 'summary' && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-base text-slate-900">Tour Financial Master</h2>
            <span className="text-xs text-slate-500">Click any row for 360° breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Tour Code</th>
                  <th className="py-3.5 px-6">Package & Client</th>
                  <th className="py-3.5 px-6 text-right">Selling Price</th>
                  <th className="py-3.5 px-6 text-right">Collected</th>
                  <th className="py-3.5 px-6 text-right">Outstanding</th>
                  <th className="py-3.5 px-6 text-right">Actual Cost</th>
                  <th className="py-3.5 px-6 text-right">Gross Profit</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {confirmedTours.map(t => (
                  <tr
                    key={t.tourCode}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setSelectedTourCode(t.tourCode)}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700">{t.tourCode}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{t.packageName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.clientName}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">₹{t.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-emerald-700 font-semibold">₹{t.totalCollected.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-amber-700 font-semibold">₹{t.outstandingBalance.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-slate-700">₹{t.actualTotalCost.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-emerald-800 font-bold">₹{t.actualGrossProfit.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintableDocument({ type: 'invoice', tourCode: t.tourCode });
                        }}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold"
                      >
                        Tax Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SUPPLIER VOUCHERS */}
      {activeSubTab === 'supplier_vouchers' && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-base text-slate-900">Supplier Payment Vouchers</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Voucher Ref</th>
                  <th className="py-3.5 px-6">Supplier</th>
                  <th className="py-3.5 px-6">Tour Code</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6">Due By</th>
                  <th className="py-3.5 px-6">Bank Ref</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {supplierPayments.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{v.id}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{v.supplierName}</td>
                    <td className="py-4 px-6 font-mono text-emerald-700 font-bold">{v.tourCode}</td>
                    <td className="py-4 px-6 capitalize text-slate-600">{v.paymentType}</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">₹{v.amount.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-slate-600">{v.dueBy}</td>
                    <td className="py-4 px-6 font-mono text-slate-500">{v.bankReference || '—'}</td>
                    <td className="py-4 px-6">
                      <span className={`font-semibold capitalize ${
                        v.status === 'paid'
                          ? 'text-emerald-700'
                          : v.status === 'approved'
                          ? 'text-emerald-800'
                          : 'text-amber-700'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {v.status === 'pending_approval' ? (
                        <button
                          onClick={() => setApprovingVoucher(v)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                        >
                          Approve & Pay
                        </button>
                      ) : (
                        <span className="text-slate-400">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CUSTOMER RECEIPTS */}
      {activeSubTab === 'receipts' && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Receipt #</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Tour Code</th>
                  <th className="py-3.5 px-6">Client / Agent</th>
                  <th className="py-3.5 px-6">Mode</th>
                  <th className="py-3.5 px-6">Bank Ref</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {receipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700">{r.receiptNumber}</td>
                    <td className="py-4 px-6 text-slate-600">{r.receivedDate}</td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{r.tourCode}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{r.clientName}</td>
                    <td className="py-4 px-6 text-slate-600">{r.paymentMode}</td>
                    <td className="py-4 px-6 font-mono text-slate-500">{r.transactionReference}</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">₹{r.amount.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setPrintableDocument({ type: 'receipt', tourCode: r.tourCode, receiptId: r.id })}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: SUPPLIER LEDGERS */}
      {activeSubTab === 'supplier_ledgers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {suppliers.map(sup => (
            <div key={sup.id} className="border border-slate-200 rounded-xl bg-white p-6 space-y-4 text-xs">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{sup.name}</h3>
                  <p className="text-slate-500 mt-0.5">
                    {sup.category} · {sup.destination}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-slate-500 block">Balance Payable</span>
                  <span className="text-base font-bold text-amber-700">
                    ₹{sup.currentBalancePayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs text-slate-600">
                <div>Bank: {sup.bankDetails.bankName}</div>
                <div>A/c: {sup.bankDetails.accountNumber} ({sup.bankDetails.ifscCode})</div>
                <div>Account Name: {sup.bankDetails.accountName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Receipt Modal */}
      {showNewReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Record Customer Receipt</h3>
              <button onClick={() => setShowNewReceiptModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordReceiptSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Target Tour Code *</label>
                <select
                  value={receiptTourCode}
                  onChange={(e) => setReceiptTourCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                >
                  {confirmedTours.map(t => (
                    <option key={t.tourCode} value={t.tourCode}>
                      {t.tourCode} - {t.clientName} (Due: ₹{t.outstandingBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Amount Collected (INR) *</label>
                <input
                  type="number"
                  required
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Payment Mode</label>
                  <select
                    value={receiptMode}
                    onChange={(e) => setReceiptMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Bank UTR Ref</label>
                  <input
                    type="text"
                    required
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Deposited Bank Account</label>
                <input
                  type="text"
                  value={receiptBank}
                  onChange={(e) => setReceiptBank(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewReceiptModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Supplier Advance Modal */}
      {approvingVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Approve Supplier Voucher</h3>
              <button onClick={() => setApprovingVoucher(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDisburseSubmit} className="p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payee</span>
                  <span className="font-semibold text-slate-900">{approvingVoucher.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tour Code</span>
                  <span className="font-mono font-bold text-emerald-700">{approvingVoucher.tourCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900 text-sm tabular-nums">
                    ₹{approvingVoucher.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Bank UTR Reference *</label>
                <input
                  type="text"
                  required
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingVoucher(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Approve & Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
