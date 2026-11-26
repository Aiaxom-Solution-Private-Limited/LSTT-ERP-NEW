import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  CostComponent,
  DestinationRegion,
  CustomerReceipt
} from '../types';
import {
  Plus,
  Trash2,
  FileCheck,
  Truck
} from 'lucide-react';

interface CostingQuotationViewProps {
  initialLead?: any;
  initialItinerary?: any;
}

export const CostingQuotationView: React.FC<CostingQuotationViewProps> = ({
  initialLead,
  initialItinerary
}) => {
  const {
    suppliers,
    fleet,
    agents,
    createQuotation,
    confirmBookingAndGenerateTourCode,
    setSelectedTourCode
  } = useDmc();

  const [clientName, setClientName] = useState(
    initialLead?.clientName || 'TravelPlanners India (For Dr. Rajesh Singhal)'
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialLead ? (initialLead.agentId || '') : 'AGT-101'
  );
  const [enquiryId] = useState<string>(initialLead?.id || 'ENQ-2026-0045');
  const [destination] = useState<DestinationRegion>(
    initialItinerary?.destination || initialLead?.destination || 'Meghalaya'
  );
  const [startDate] = useState(initialLead?.travelStartDate || '2026-11-20');
  const [endDate] = useState(initialLead?.travelEndDate || '2026-11-25');
  const [paxCount, setPaxCount] = useState(initialLead?.adults || 4);

  const [costComponents, setCostComponents] = useState<CostComponent[]>([
    {
      id: 'COMP-1',
      category: 'hotel',
      description: 'Hotel Polo Towers Shillong - 2x Executive Rooms (3 Nights MAPAI)',
      supplierId: 'SUP-H-01',
      supplierName: 'Hotel Polo Towers Shillong',
      sourceType: 'external_supplier',
      quantity: 2,
      daysOrNights: 3,
      unitCost: 5500,
      totalCost: 33000,
      advancePercentageRequired: 50,
      advanceAmountRequired: 16500
    },
    {
      id: 'COMP-2',
      category: 'hotel',
      description: 'Polo Orchid Resort Cherrapunjee - 2x Valley View Rooms (2 Nights MAPAI)',
      supplierId: 'SUP-H-01',
      supplierName: 'Hotel Polo Towers Shillong',
      sourceType: 'external_supplier',
      quantity: 2,
      daysOrNights: 2,
      unitCost: 6000,
      totalCost: 24000,
      advancePercentageRequired: 50,
      advanceAmountRequired: 12000
    },
    {
      id: 'COMP-3',
      category: 'transport',
      description: 'Company Fleet Innova Crysta (6 Days Guwahati - Shillong - Cherrapunjee)',
      vehicleId: 'FLT-01',
      sourceType: 'own_fleet',
      quantity: 1,
      daysOrNights: 6,
      unitCost: 3800,
      totalCost: 22800,
      advancePercentageRequired: 0,
      advanceAmountRequired: 0,
      notes: 'Internal fleet operating cost (driver allowance, wear, fuel allocation).'
    },
    {
      id: 'COMP-4',
      category: 'guide',
      description: 'Tribal trek guide for Double Decker Living Root Bridge & Dawki boat assistance',
      supplierId: 'SUP-A-01',
      supplierName: 'Cherrapunjee Treks & Caving Association',
      sourceType: 'external_supplier',
      quantity: 1,
      daysOrNights: 2,
      unitCost: 2500,
      totalCost: 5000,
      advancePercentageRequired: 0,
      advanceAmountRequired: 0
    }
  ]);

  const [markupPct, setMarkupPct] = useState(38);
  const [gstPct] = useState(5);
  const [revisionNotes] = useState('Initial standard quotation for client review');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [advanceCollected, setAdvanceCollected] = useState(40000);
  const [paymentMode, setPaymentMode] = useState<CustomerReceipt['paymentMode']>('Bank Transfer (NEFT/RTGS)');
  const [transactionRef, setTransactionRef] = useState('NEFT-HDFC-882109');
  const [allowCreditException, setAllowCreditException] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const ownFleetCost = costComponents
    .filter(c => c.sourceType === 'own_fleet')
    .reduce((sum, c) => sum + c.totalCost, 0);

  const externalSupplierCost = costComponents
    .filter(c => c.sourceType === 'external_supplier')
    .reduce((sum, c) => sum + c.totalCost, 0);

  const totalDirectCost = ownFleetCost + externalSupplierCost;
  const markupAmount = Math.round((totalDirectCost * markupPct) / 100);
  const subtotalSellingPrice = totalDirectCost + markupAmount;
  const gstAmount = Math.round((subtotalSellingPrice * gstPct) / 100);
  const finalSellingPrice = subtotalSellingPrice + gstAmount;

  const handleAddComponent = (sourceType: 'external_supplier' | 'own_fleet') => {
    const newComp: CostComponent = {
      id: `COMP-${Date.now()}`,
      category: sourceType === 'own_fleet' ? 'transport' : 'hotel',
      description: sourceType === 'own_fleet' ? 'Company Fleet Vehicle Daily Rate' : 'New External Hotel / Excursion',
      sourceType,
      supplierId: sourceType === 'external_supplier' ? suppliers[0]?.id : undefined,
      supplierName: sourceType === 'external_supplier' ? suppliers[0]?.name : undefined,
      vehicleId: sourceType === 'own_fleet' ? fleet[0]?.id : undefined,
      quantity: 1,
      daysOrNights: 1,
      unitCost: 3500,
      totalCost: 3500,
      advancePercentageRequired: sourceType === 'own_fleet' ? 0 : 50,
      advanceAmountRequired: sourceType === 'own_fleet' ? 0 : 1750
    };
    setCostComponents([...costComponents, newComp]);
  };

  const handleUpdateComponent = (id: string, updates: Partial<CostComponent>) => {
    setCostComponents(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        updated.totalCost = (updated.quantity || 1) * (updated.daysOrNights || 1) * (updated.unitCost || 0);
        if (updated.sourceType === 'own_fleet') {
          updated.advancePercentageRequired = 0;
          updated.advanceAmountRequired = 0;
        } else {
          updated.advanceAmountRequired = (updated.totalCost * (updated.advancePercentageRequired || 0)) / 100;
        }
        return updated;
      }
      return c;
    }));
  };

  const handleDeleteComponent = (id: string) => {
    setCostComponents(costComponents.filter(c => c.id !== id));
  };

  const handleConfirmAndGenerateTourCode = () => {
    const createdQuoteId = createQuotation({
      enquiryId,
      clientName,
      agentId: selectedAgentId || undefined,
      destination,
      startDate,
      endDate,
      paxCount,
      revisions: [
        {
          version: 1,
          versionCode: 'QT-TEMP-V1',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          createdBy: 'Ritu Sharma',
          costComponents,
          totalDirectCost,
          externalSupplierPayables: externalSupplierCost,
          ownFleetInternalCost: ownFleetCost,
          markupAmount,
          markupPercentage: markupPct,
          subtotalSellingPrice,
          gstPercentage: gstPct,
          gstAmount,
          finalSellingPrice,
          changeReason: revisionNotes,
          itinerarySnapshot: initialItinerary?.daysList || [],
          inclusions: initialItinerary?.inclusions || [],
          exclusions: initialItinerary?.exclusions || [],
          paymentTerms: '30% advance on booking, balance on arrival or approved credit',
          status: 'accepted'
        }
      ]
    });

    const res = confirmBookingAndGenerateTourCode(
      createdQuoteId,
      1,
      advanceCollected,
      paymentMode,
      transactionRef,
      allowCreditException
    );

    if (res.success && res.tourCode) {
      setConfirmationMessage(res.message);
      setTimeout(() => {
        setShowConfirmModal(false);
        setSelectedTourCode(res.tourCode!);
      }, 1200);
    } else {
      setConfirmationMessage(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Tour Costing & Pricing Engine
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Component costing separating own fleet and external vendors with commercial markup.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleAddComponent('external_supplier')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>External Supplier Item</span>
          </button>

          <button
            onClick={() => handleAddComponent('own_fleet')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Company Fleet Vehicle</span>
          </button>
        </div>
      </div>

      {/* Client & Travel Details Pure Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Client / B2B Agent</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-emerald-700"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">B2B Agent Account</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-700"
          >
            <option value="">Direct / Custom Source</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>
                {a.companyName} (Credit: ₹{(a.creditLimit / 100000).toFixed(1)}L)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Destination & Dates</label>
          <div className="py-1.5 text-xs font-medium text-slate-800 tabular-nums">
            {destination} · {startDate}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Travellers (Pax)</label>
          <input
            type="number"
            min="1"
            value={paxCount}
            onChange={(e) => setPaxCount(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 tabular-nums outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {initialItinerary && (
        <div className="px-5 py-3.5 bg-white border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-emerald-700">Linked Itinerary: </span>
            <span className="font-bold text-slate-900">{initialItinerary.title}</span>
          </div>
          <span className="text-slate-500 tabular-nums">
            {initialItinerary.nights}N / {initialItinerary.days}D · {initialItinerary.daysList?.length || 0} days mapped
          </span>
        </div>
      )}

      {/* Cost Components Pure Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Cost Components ({costComponents.length})
          </h3>
          <span className="text-xs text-slate-400">
            Own fleet allocations generate zero external supplier payment vouchers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Component Description</th>
                <th className="py-3 px-4">Supplier / Vehicle</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-center">Days</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-right">Advance Req</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costComponents.map(comp => (
                <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className={`font-semibold text-xs ${
                      comp.sourceType === 'own_fleet' ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {comp.sourceType === 'own_fleet' ? 'Own Fleet' : 'Vendor'}
                    </div>
                    <div className="text-xs capitalize text-slate-400">
                      {comp.category}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 min-w-[200px]">
                    <input
                      type="text"
                      value={comp.description}
                      onChange={(e) => handleUpdateComponent(comp.id, { description: e.target.value })}
                      className="w-full py-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-700 outline-none font-medium text-slate-900"
                    />
                  </td>

                  <td className="py-3.5 px-4 min-w-[180px]">
                    {comp.sourceType === 'own_fleet' ? (
                      <select
                        value={comp.vehicleId}
                        onChange={(e) => {
                          const v = fleet.find(f => f.id === e.target.value);
                          handleUpdateComponent(comp.id, {
                            vehicleId: v?.id,
                            unitCost: v?.internalDailyRate || 3800
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-emerald-800 outline-none focus:border-emerald-700"
                      >
                        {fleet.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.model} ({f.registrationNumber})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={comp.supplierId}
                        onChange={(e) => {
                          const sup = suppliers.find(s => s.id === e.target.value);
                          handleUpdateComponent(comp.id, {
                            supplierId: sup?.id,
                            supplierName: sup?.name,
                            advancePercentageRequired: sup?.standardAdvanceRequirementPct || 50
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-emerald-700"
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="py-3.5 px-3 w-16">
                    <input
                      type="number"
                      min="1"
                      value={comp.quantity}
                      onChange={(e) => handleUpdateComponent(comp.id, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-center tabular-nums outline-none focus:border-emerald-700"
                    />
                  </td>

                  <td className="py-3.5 px-3 w-16">
                    <input
                      type="number"
                      min="1"
                      value={comp.daysOrNights}
                      onChange={(e) => handleUpdateComponent(comp.id, { daysOrNights: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-center tabular-nums outline-none focus:border-emerald-700"
                    />
                  </td>

                  <td className="py-3.5 px-4 w-28 text-right">
                    <input
                      type="number"
                      value={comp.unitCost}
                      onChange={(e) => handleUpdateComponent(comp.id, { unitCost: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium tabular-nums outline-none focus:border-emerald-700"
                    />
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 w-28 tabular-nums">
                    ₹{comp.totalCost.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 text-right w-32 tabular-nums">
                    {comp.sourceType === 'own_fleet' ? (
                      <span className="text-emerald-700 font-medium">₹0 (Internal)</span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        ₹{comp.advanceAmountRequired.toLocaleString('en-IN')} ({comp.advancePercentageRequired}%)
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center w-12">
                    <button
                      onClick={() => handleDeleteComponent(comp.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercials & Quotation Summary Cards (2 Pure White Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
            Direct Cost Separation
          </h4>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600">External Hotel & Vendor Payables</span>
              <span className="font-semibold text-slate-900 tabular-nums">₹{externalSupplierCost.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-2.5">
              <span className="text-slate-600">Company Fleet Internal Operating Cost</span>
              <span className="font-semibold text-emerald-700 tabular-nums">₹{ownFleetCost.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between pt-3 font-bold text-slate-900 text-sm">
              <span>Total Direct Cost</span>
              <span className="tabular-nums">₹{totalDirectCost.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-emerald-800">Cash Flow Advantage: </span>
            Own fleet allocation (₹{ownFleetCost.toLocaleString('en-IN')}) requires zero cash advance to external vendors.
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
            Commercial Quotation & Margin
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-600">Target Markup Percentage</span>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min="15"
                  max="75"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(parseInt(e.target.value) || 20)}
                  className="w-28 accent-emerald-700"
                />
                <span className="font-bold text-slate-900 w-10 text-right tabular-nums">{markupPct}%</span>
              </div>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Gross Margin Amount</span>
              <span className="font-semibold text-emerald-700 tabular-nums">₹{markupAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Subtotal Selling Price</span>
              <span className="font-semibold text-slate-900 tabular-nums">₹{subtotalSellingPrice.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-600">Tour Operator GST (5%)</span>
              <span className="font-medium text-slate-600 tabular-nums">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100 font-bold text-slate-900 text-sm">
              <span>Final Quoted Price (Group)</span>
              <span className="text-emerald-700 text-lg tabular-nums">₹{finalSellingPrice.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500 text-xs tabular-nums">
              <span>Per Person ({paxCount} Pax)</span>
              <span className="font-semibold text-slate-900">₹{Math.round(finalSellingPrice / paxCount).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Confirm Client Booking & Generate Tour Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight">Client Confirmation & Tour Code</h3>
                <span className="text-xs text-emerald-100">Lock commercial version and dispatch to Operations & Accounts</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-emerald-100 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg px-4">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Agreed Selling Price</span>
                  <span className="font-bold text-slate-900 tabular-nums">₹{finalSellingPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Required 25% Minimum Advance</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    ₹{Math.round(finalSellingPrice * 0.25).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">
                  Customer Advance Amount Received (INR) *
                </label>
                <input
                  type="number"
                  value={advanceCollected}
                  onChange={(e) => setAdvanceCollected(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm tabular-nums outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                  >
                    <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Bank Txn / UTR Reference</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={allowCreditException}
                  onChange={(e) => setAllowCreditException(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span className="font-medium text-slate-700">
                  Authorise B2B Credit Exception (if advance is below required 25%)
                </span>
              </label>

              {confirmationMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                  {confirmationMessage}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndGenerateTourCode}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
                >
                  Confirm & Generate Tour Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
