import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { TourStatus } from '../types';
import { X, Printer } from 'lucide-react';

interface TourMasterModalProps {
  tourCode: string;
  onClose: () => void;
}

export const TourMasterModal: React.FC<TourMasterModalProps> = ({ tourCode, onClose }) => {
  const {
    confirmedTours,
    agents,
    fleet,
    handovers,
    supplierBookings,
    receipts,
    supplierPayments,
    expenses,
    incidents,
    operationsTasks,
    updateTourStatus,
    setPrintableDocument,
    closeTourAndReconcile
  } = useDmc();

  const tour = confirmedTours.find(t => t.tourCode === tourCode);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'travellers'
    | 'itinerary'
    | 'handover'
    | 'hotels'
    | 'transport'
    | 'suppliers'
    | 'accounts'
    | 'payments'
    | 'expenses'
    | 'incidents'
    | 'profitability'
  >('overview');

  const [closureNotes, setClosureNotes] = useState('');
  const [showClosurePrompt, setShowClosurePrompt] = useState(false);

  if (!tour) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200">
          <div className="text-slate-900 font-bold text-base mb-2">Tour Code Not Found</div>
          <p className="text-xs text-slate-500 mb-4">No confirmed record found for "{tourCode}".</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const agent = tour.agentId ? agents.find(a => a.id === tour.agentId) : null;
  const tourHandovers = handovers.filter(h => h.tourCode === tourCode);
  const tourBookings = supplierBookings.filter(b => b.tourCode === tourCode);
  const tourReceipts = receipts.filter(r => r.tourCode === tourCode);
  const tourPayments = supplierPayments.filter(p => p.tourCode === tourCode);
  const tourExpenses = expenses.filter(e => e.tourCode === tourCode);
  const tourIncidents = incidents.filter(i => i.tourCode === tourCode);
  const tourTasks = operationsTasks.filter(t => t.tourCode === tourCode);
  const vehicle = tour.allocatedVehicleId ? fleet.find(f => f.id === tour.allocatedVehicleId) : null;

  const totalSupplierPaid = tourPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalDirectExpenses = tourExpenses.reduce((sum, e) => sum + e.amount, 0);

  const tabs = [
    { id: 'overview', label: 'Tour 360°' },
    { id: 'travellers', label: `Guests (${tour.travellers.length})` },
    { id: 'itinerary', label: `Itinerary (${tour.days}D)` },
    { id: 'handover', label: 'Sales Handover' },
    { id: 'hotels', label: `Hotels (${tourBookings.filter(b => b.category === 'Hotel').length})` },
    { id: 'transport', label: 'Transport & Fleet' },
    { id: 'suppliers', label: `Supplier Bookings (${tourBookings.length})` },
    { id: 'accounts', label: 'Accounts & Receivables' },
    { id: 'payments', label: `Supplier Advances (${tourPayments.length})` },
    { id: 'expenses', label: `On-Tour Expenses (${tourExpenses.length})` },
    { id: 'incidents', label: `Incidents (${tourIncidents.length})` },
    { id: 'profitability', label: 'Final P&L' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[92vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
        {/* Master Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white text-emerald-900 font-bold tracking-wider">
              {tour.tourCode}
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {tour.packageName}
                </h2>
                <span className="text-xs text-emerald-200 capitalize font-medium">
                  · {tour.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-emerald-100 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Client: <strong className="text-white">{tour.clientName}</strong></span>
                <span>·</span>
                <span>{tour.destination}</span>
                <span>·</span>
                <span className="tabular-nums">{tour.startDate} to {tour.endDate} ({tour.nights}N/{tour.days}D)</span>
                <span>·</span>
                <span>{tour.adults} Adults{tour.children > 0 ? `, ${tour.children} Children` : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintableDocument({ type: 'hotel_voucher', tourCode: tour.tourCode })}
              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 border border-emerald-600 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-100" />
              <span>Hotel Voucher</span>
            </button>

            <button
              onClick={() => setPrintableDocument({ type: 'driver_sheet', tourCode: tour.tourCode })}
              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 border border-emerald-600 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-100" />
              <span>Driver Sheet</span>
            </button>

            <button
              onClick={() => setPrintableDocument({ type: 'invoice', tourCode: tour.tourCode })}
              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 border border-emerald-600 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-100" />
              <span>Tax Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clean Tab Bar */}
        <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-1 overflow-x-auto shrink-0 py-2 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {/* TAB 1: OVERVIEW 360 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-medium text-slate-500 block">
                    Total Selling Price
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                    ₹{tour.sellingPrice.toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block tabular-nums">
                    + ₹{tour.gstAmount.toLocaleString('en-IN')} GST = ₹{tour.totalReceivable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-medium text-slate-500 block">
                    Customer Collected
                  </span>
                  <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                    ₹{tour.totalCollected.toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-emerald-700 mt-1 block tabular-nums">
                    {((tour.totalCollected / tour.totalReceivable) * 100).toFixed(0)}% of receivable
                  </span>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-medium text-slate-500 block">
                    Outstanding Receivable
                  </span>
                  <div className="text-xl font-bold text-amber-700 mt-1 tabular-nums">
                    ₹{tour.outstandingBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {agent ? `Covered by ${agent.companyName}` : 'Direct collection due'}
                  </span>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-medium text-slate-500 block">
                    Projected Gross Margin
                  </span>
                  <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                    ₹{tour.projectedGrossProfit.toLocaleString('en-IN')} ({tour.projectedMarginPct.toFixed(1)}%)
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block tabular-nums">
                    Est. direct cost: ₹{tour.totalEstimatedCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status Action Bar */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">Tour Status</span>
                  <select
                    value={tour.status}
                    onChange={(e) => updateTourStatus(tour.tourCode, e.target.value as TourStatus)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-emerald-700"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="operations_prep">Operations Prep</option>
                    <option value="vouchers_issued">Vouchers Issued</option>
                    <option value="on_tour">On Tour (Active)</option>
                    <option value="completed">Completed</option>
                    <option value="reconciled">Reconciled</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  {tour.status !== 'closed' ? (
                    <button
                      onClick={() => setShowClosurePrompt(true)}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors"
                    >
                      Finalise Tour Closure & Reconcile
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700">
                      Tour Formally Closed & Reconciled
                    </span>
                  )}
                </div>
              </div>

              {showClosurePrompt && (
                <div className="p-5 rounded-xl border border-emerald-200 bg-white text-xs space-y-3">
                  <div className="font-bold text-slate-900">
                    Mandatory Tour Closure & Financial Reconciliation
                  </div>
                  <p className="text-slate-600">
                    Confirm that all destination hotel nights, transport, and excursions were completed. Unresolved liabilities will be locked.
                  </p>
                  <textarea
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    placeholder="Enter tour closure remarks, client feedback summary, and final accounts sign-off notes..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-700"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowClosurePrompt(false)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        closeTourAndReconcile(tour.tourCode, closureNotes || 'Standard closure completed.');
                        setShowClosurePrompt(false);
                      }}
                      className="px-4 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                    >
                      Authorize Closure & Lock P&L
                    </button>
                  </div>
                </div>
              )}

              {/* Departmental Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Sales & Commercial Agreement
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Quotation Reference</span>
                      <span className="font-mono font-semibold text-slate-900">{tour.quotationCode}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Salesperson</span>
                      <span className="font-medium text-slate-900">{tour.assignedSalesperson}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">B2B Agent / Partner</span>
                      <span className="font-medium text-slate-900">{agent ? agent.companyName : 'Direct Customer'}</span>
                    </div>
                    {agent && (
                      <div className="flex justify-between py-2.5">
                        <span className="text-slate-500">Agent Credit Terms</span>
                        <span className="font-medium text-emerald-700 tabular-nums">
                          {agent.creditDays} Days (Limit: ₹{agent.creditLimit.toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Booking ID</span>
                      <span className="font-mono text-slate-700">{tour.bookingId}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Ground Operations & Fleet
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Operations Lead</span>
                      <span className="font-medium text-slate-900">{tour.assignedOperationsLead}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Transport Source</span>
                      <span className="font-medium text-slate-900 capitalize">
                        {tour.transportSource === 'own_fleet' ? 'Company Owned Fleet' : 'External Hired Transport'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Assigned Vehicle</span>
                      <span className="font-mono font-medium text-slate-900">
                        {vehicle ? `${vehicle.model} (${vehicle.registrationNumber})` : 'To be allocated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Assigned Driver</span>
                      <span className="font-medium text-slate-900">
                        {tour.allocatedDriverName ? `${tour.allocatedDriverName} (${tour.allocatedDriverPhone})` : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-slate-500">Operational Tasks</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {tourTasks.filter(t => t.status === 'completed').length} / {tourTasks.length} Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAVELLERS */}
          {activeTab === 'travellers' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Guest Manifest & Identity Details ({tour.travellers.length} Pax)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">ID Proof Type</th>
                      <th className="py-3 px-4">ID Number</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Room Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tour.travellers.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{g.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">{g.age} yrs · {g.gender}</td>
                        <td className="py-3 px-4 text-slate-600">{g.idProofType}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{g.idNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{g.contactNumber || '—'}</td>
                        <td className="py-3 px-4 text-slate-700">{g.roomAllocation || 'Double Sharing'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ITINERARY */}
          {activeTab === 'itinerary' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Locked Operational Itinerary ({tour.days} Days / {tour.nights} Nights)
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {tour.itinerary.map(day => (
                  <div key={day.dayNumber} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs tabular-nums shrink-0">
                          {day.dayNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {day.title}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {day.startLocation} → {day.endLocation} {day.distanceKm ? `(${day.distanceKm} km)` : ''}
                      </div>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-8">
                      {day.activities.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                    <div className="mt-2 ml-8 pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Meals: {day.mealsIncluded.join(', ') || 'None'}</span>
                      {day.hotelName && (
                        <span>Night Stay: <strong className="text-slate-800">{day.hotelName} ({day.hotelCity})</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SALES HANDOVER */}
          {activeTab === 'handover' && (
            <div className="space-y-4">
              {tourHandovers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                  No formal handover filed for this tour yet.
                </div>
              ) : (
                tourHandovers.map((h, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Submitted By</span>
                        <span className="font-semibold text-slate-900">{h.submittedBy} on {h.submittedAt}</span>
                      </div>
                      <span className={`font-semibold capitalize ${
                        h.status === 'accepted' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {h.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-1">
                      <div>
                        <span className="text-slate-400 block mb-1">Flight Arrival Details</span>
                        <div className="text-slate-800 font-mono">
                          {h.flightArrivalDetails || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Flight Departure Details</span>
                        <div className="text-slate-800 font-mono">
                          {h.flightDepartureDetails || 'Not specified'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-slate-400 block mb-1">Special Guest Instructions & Dietary Requests</span>
                      <div className="text-slate-800">
                        {h.specialRequests || 'No special requests.'}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-slate-400 block mb-1">Sales Commitments to Client</span>
                      <div className="text-slate-800">
                        {h.salesCommitments}
                      </div>
                    </div>

                    {h.reviewerNotes && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="font-semibold text-emerald-800 block mb-1">
                          Operations Reviewer Feedback ({h.reviewedBy})
                        </span>
                        <p className="text-slate-700">{h.reviewerNotes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: HOTELS */}
          {activeTab === 'hotels' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hotel Reservations & Booking Vouchers
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {tourBookings.filter(b => b.category === 'Hotel').map(hotel => (
                  <div key={hotel.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{hotel.supplierName}</span>
                        <span className="font-mono text-xs text-slate-500">
                          · Ref: {hotel.confirmationReference || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{hotel.details}</p>
                      <div className="text-xs text-slate-400 mt-1 tabular-nums">
                        Check-in: {hotel.checkInDate || 'TBD'} · Check-out: {hotel.checkOutDate || 'TBD'}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-xs font-bold text-slate-900 tabular-nums">
                        ₹{hotel.agreedAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        Paid: ₹{hotel.advancePaid.toLocaleString('en-IN')} · Balance: ₹{hotel.balancePayable.toLocaleString('en-IN')}
                      </div>
                      <span className={`inline-block mt-1 text-xs capitalize font-medium ${
                        hotel.status === 'fully_paid' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {hotel.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TRANSPORT & FLEET */}
          {activeTab === 'transport' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Transport & Fleet Allocation
              </h3>
              {tour.transportSource === 'own_fleet' ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-semibold text-emerald-700">
                      Company Owned Fleet Vehicle
                    </span>
                    <span className="font-bold text-emerald-700 tabular-nums">
                      Internal Cost: ₹{tour.estimatedOwnFleetCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-slate-400 block mb-1">Assigned Vehicle</span>
                      <span className="font-semibold text-slate-900">{vehicle?.model || 'Toyota Innova Crysta'}</span>
                      <span className="block font-mono text-slate-500 mt-0.5">{vehicle?.registrationNumber || 'AS-01-EC-4021'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Assigned Driver</span>
                      <span className="font-semibold text-slate-900">{tour.allocatedDriverName || 'Ramen Das'}</span>
                      <span className="block font-mono text-slate-500 mt-0.5">{tour.allocatedDriverPhone || '+91 98640 12345'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Accounting Treatment</span>
                      <span className="text-slate-600 block leading-snug">
                        Internal operational allocation only. No external supplier advance created.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-2">
                  <span className="font-semibold text-slate-800 block">
                    External Hired Transport
                  </span>
                  <p className="text-slate-600">
                    Vehicle arranged via transport vendor. Vendor contract and payment vouchers are tracked under Supplier Bookings.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SUPPLIER BOOKINGS */}
          {activeTab === 'suppliers' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  External Supplier Reservations & Liabilities
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Ref</th>
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Agreed Cost</th>
                      <th className="py-3 px-4 text-right">Advance Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tourBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-slate-500">{b.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{b.supplierName}</td>
                        <td className="py-3 px-4 text-slate-600">{b.category}</td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">₹{b.agreedAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">₹{b.advancePaid.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-amber-700 tabular-nums">₹{b.balancePayable.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">{b.dueDate}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{b.status.replace('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: ACCOUNTS & RECEIVABLES */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer Payment Receipts & Invoices
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Received Date</th>
                        <th className="py-3 px-4">Client / Agent</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4">Bank Reference</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tourReceipts.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{r.receiptNumber}</td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">{r.receivedDate}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{r.clientName}</td>
                          <td className="py-3 px-4 text-slate-600">{r.paymentMode}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{r.transactionReference}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                            ₹{r.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-semibold">Verified</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 block tabular-nums">Total Invoiced: ₹{tour.totalReceivable.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500 block tabular-nums">Total Collected: ₹{tour.totalCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Outstanding Receivable</span>
                  <span className="text-base font-bold text-amber-700 tabular-nums">
                    ₹{tour.outstandingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SUPPLIER PAYMENTS & ADVANCES */}
          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Supplier Payment Vouchers & Disbursements
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Voucher ID</th>
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Due By</th>
                      <th className="py-3 px-4">Paid Date</th>
                      <th className="py-3 px-4">Bank Ref</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tourPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{p.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{p.supplierName}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{p.paymentType}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">{p.dueBy}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">{p.paidDate || '—'}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.bankReference || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`capitalize font-medium ${
                            p.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: ON-TOUR EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Driver & Field Operational Expenses
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Expense ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Claimed By</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tourExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-slate-500">{e.id}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">{e.spentDate}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{e.category}</td>
                        <td className="py-3 px-4 text-slate-600">{e.description}</td>
                        <td className="py-3 px-4 text-slate-600">{e.spentBy}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          ₹{e.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 capitalize text-emerald-700 font-medium">{e.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: INCIDENTS */}
          {activeTab === 'incidents' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Operational Issues & Incident Log
                </h3>
              </div>
              {tourIncidents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No issues or complaints reported. Clean tour execution.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tourIncidents.map(inc => (
                    <div key={inc.id} className="px-6 py-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{inc.incidentType}</span>
                        <span className="font-mono text-slate-400">{inc.reportedAt}</span>
                      </div>
                      <p className="text-slate-600">{inc.description}</p>
                      <div className="text-slate-700 pt-1">
                        <span className="font-semibold text-slate-800">Resolution: </span>
                        {inc.actionTaken}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 12: PROFITABILITY & RECONCILIATION */}
          {activeTab === 'profitability' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
                Tour Commercial Reconciliation & P&L Statement
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                <div className="divide-y divide-slate-100">
                  <h4 className="font-bold text-slate-900 pb-2">1. Tour Revenue (Receivables)</h4>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-600">Quoted Tour Package Price</span>
                    <span className="font-semibold tabular-nums">₹{tour.sellingPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-600">Applicable GST (5%)</span>
                    <span className="font-semibold tabular-nums">₹{tour.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5 font-bold text-slate-900">
                    <span>Total Invoice Amount</span>
                    <span className="tabular-nums">₹{tour.totalReceivable.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-emerald-700">
                    <span>Actual Customer Realisation</span>
                    <span className="font-bold tabular-nums">₹{tour.totalCollected.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <h4 className="font-bold text-slate-900 pb-2">2. Direct Tour Costs</h4>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-600">External Hotel & Supplier Disbursements</span>
                    <span className="font-semibold text-rose-700 tabular-nums">₹{totalSupplierPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-600">Company Fleet Operational Allocation</span>
                    <span className="font-semibold text-rose-700 tabular-nums">₹{tour.estimatedOwnFleetCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-600">Driver Fuel, Tolls & On-Tour Expenses</span>
                    <span className="font-semibold text-rose-700 tabular-nums">₹{totalDirectExpenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2.5 font-bold text-slate-900">
                    <span>Total Direct Cost</span>
                    <span className="tabular-nums">
                      ₹{(totalSupplierPaid + tour.estimatedOwnFleetCost + totalDirectExpenses).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-slate-900 font-bold block text-sm">
                    Actual Realised Gross Profit
                  </span>
                  <span className="text-slate-500 text-xs tabular-nums">
                    Baseline projection was ₹{tour.projectedGrossProfit.toLocaleString('en-IN')} ({tour.projectedMarginPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-xl font-bold text-emerald-700 tabular-nums">
                    ₹{(tour.sellingPrice - (totalSupplierPaid + tour.estimatedOwnFleetCost + totalDirectExpenses)).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-emerald-700 block font-semibold tabular-nums">
                    {(((tour.sellingPrice - (totalSupplierPaid + tour.estimatedOwnFleetCost + totalDirectExpenses)) / tour.sellingPrice) * 100).toFixed(1)}% Gross Margin
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
