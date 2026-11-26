import React from 'react';
import { useDmc, PrintableDocParams } from '../context/DmcContext';
import { Printer, X, Download } from 'lucide-react';

interface PrintableDocModalProps {
  params: PrintableDocParams;
  onClose: () => void;
}

export const PrintableDocumentModal: React.FC<PrintableDocModalProps> = ({ params, onClose }) => {
  const {
    confirmedTours,
    quotations,
    receipts,
    supplierBookings,
    fleet,
    agents,
    suppliers
  } = useDmc();

  const handlePrint = () => {
    window.print();
  };

  const tour = params.tourCode ? confirmedTours.find(t => t.tourCode === params.tourCode) : null;
  const quotation = params.quotationId ? quotations.find(q => q.id === params.quotationId) : null;
  const targetRevision = quotation
    ? (params.version ? quotation.revisions.find(r => r.version === params.version) : quotation.revisions[quotation.revisions.length - 1])
    : null;
  const receipt = params.receiptId ? receipts.find(r => r.id === params.receiptId) : null;
  const vehicle = tour?.allocatedVehicleId ? fleet.find(f => f.id === tour.allocatedVehicleId) : null;
  const hotelBooking = params.supplierBookingId
    ? supplierBookings.find(b => b.id === params.supplierBookingId)
    : (tour ? supplierBookings.find(b => b.tourCode === tour.tourCode && b.category === 'Hotel') : null);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Action Bar in Emerald Green (No-Print) */}
        <div className="no-print px-6 py-3.5 bg-emerald-800 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-tight uppercase text-white">
              Document Preview · {params.type.replace('_', ' ').toUpperCase()}
            </span>
            {tour && <span className="font-mono text-xs text-emerald-100 font-bold">({tour.tourCode})</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-white text-slate-800 print:p-0">
          {/* Header Branding */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-base">
                  LS
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                    Let's See Tour & Travels Pvt. Ltd.
                  </h1>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">
                    Premier Destination Management Company (DMC) · Northeast India & International
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 space-y-0.5 leading-relaxed">
                <p>Registered Office: G.S. Road, Christian Basti, Guwahati - 781005, Assam, India</p>
                <p>Phone: +91 361 2348890 / +91 98640 12345 · Email: bookings@letsseetourandtravels.com</p>
                <p>GSTIN: 18AABCL9901M1ZP · IATA & Ministry of Tourism Recognised</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider block">
                {params.type === 'quotation' && 'Commercial Tour Quotation'}
                {params.type === 'invoice' && 'Customer Tax Invoice'}
                {params.type === 'receipt' && 'Official Money Receipt'}
                {params.type === 'hotel_voucher' && 'Hotel Reservation Voucher'}
                {params.type === 'driver_sheet' && 'Driver Tour Instruction Sheet'}
                {params.type === 'closure_report' && 'Tour Closure Statement'}
              </span>
              <div className="mt-2 text-xs font-mono text-slate-600">
                <div>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                {tour && <div className="font-bold text-slate-900 mt-1">Tour Code: {tour.tourCode}</div>}
              </div>
            </div>
          </div>

          {/* DOCUMENT: HOTEL VOUCHER */}
          {params.type === 'hotel_voucher' && hotelBooking && tour && (
            <div className="space-y-6 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs text-emerald-800 font-bold block uppercase tracking-wider">
                    Official Hotel Confirmation Voucher
                  </span>
                  <span className="text-slate-600 text-xs">
                    Please accommodate the following esteemed guests against confirmed voucher.
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400 block">Confirmation Code</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {hotelBooking.confirmationReference || 'CONF-88910'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-1">Hotel Details:</span>
                  <div className="font-bold text-slate-900 text-sm">{hotelBooking.supplierName}</div>
                  <div className="text-slate-600 mt-1">{hotelBooking.details}</div>
                  <div className="text-slate-500 mt-1">Destination: {hotelBooking.destination}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-1">Stay Schedule:</span>
                  <div className="text-slate-800">Check-in: <strong>{hotelBooking.checkInDate || tour.startDate}</strong> (14:00 hrs)</div>
                  <div className="text-slate-800">Check-out: <strong>{hotelBooking.checkOutDate || tour.endDate}</strong> (11:00 hrs)</div>
                  <div className="text-slate-800 mt-1">Total Guests: <strong>{tour.adults} Adults {tour.children > 0 ? `, ${tour.children} Children` : ''}</strong></div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 font-bold text-slate-700 border-b">
                  Guest Name(s) as per Reservation
                </div>
                <div className="p-4 space-y-1">
                  {tour.travellers.map((g, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{idx + 1}. {g.fullName} ({g.gender}, {g.age} yrs)</span>
                      <span className="font-mono text-slate-500">ID: {g.idProofType} ({g.idNumber})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800 block">Billing & Settlement Terms:</span>
                <p className="text-slate-600">
                  Room rent and included meals are billed directly to <strong>Let's See Tour & Travels Pvt. Ltd.</strong>
                </p>
                <p className="text-slate-600">
                  All personal incidentals (room service, beverages, laundry, telephone) must be settled by guest directly upon check-out.
                </p>
              </div>
            </div>
          )}

          {/* DOCUMENT: DRIVER INSTRUCTION SHEET */}
          {params.type === 'driver_sheet' && tour && (
            <div className="space-y-6 text-xs">
              <div className="p-4 bg-slate-100 rounded-xl flex justify-between items-center border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">
                    Driver Trip Movement & Guest Pickup Sheet
                  </span>
                  <span className="text-slate-600">
                    Vehicle: {vehicle ? `${vehicle.model} (${vehicle.registrationNumber})` : 'Toyota Innova Crysta'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Driver Name</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {tour.allocatedDriverName || 'Ramen Das'} ({tour.allocatedDriverPhone || '+91 98640 12345'})
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-slate-800 block uppercase tracking-wider">
                  Pickup & Flight Details
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block">Lead Guest Contact:</span>
                    <span className="font-bold text-slate-900">{tour.travellers[0]?.fullName || tour.clientName}</span>
                    <span className="block text-slate-600">{tour.travellers[0]?.contactNumber || '+91 98205 11920'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Signage Placard Text:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded inline-block border border-emerald-200">
                      "LET'S SEE DMC - DR. ANIRUDDHA SEN"
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 font-bold text-slate-700 border-b">
                  Day-by-Day Movement Plan
                </div>
                <div className="divide-y divide-slate-100">
                  {tour.itinerary.map(day => (
                    <div key={day.dayNumber} className="p-3">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Day {day.dayNumber}: {day.title}</span>
                        <span className="font-mono text-slate-500">{day.startLocation} → {day.endLocation}</span>
                      </div>
                      <p className="text-slate-600 mt-1">Activities: {day.activities.join(' · ')}</p>
                      {day.hotelName && (
                        <p className="text-slate-500 mt-0.5">Night Halt: <strong>{day.hotelName}</strong></p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT: INVOICE / QUOTATION */}
          {(params.type === 'invoice' || params.type === 'quotation') && (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-6 p-4 border border-slate-200 rounded-xl bg-slate-50/40">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block mb-1">Billed To:</span>
                  <div className="font-bold text-slate-900 text-sm">{tour ? tour.clientName : quotation?.clientName}</div>
                  <div className="text-slate-600 mt-1">
                    Destination: {tour ? tour.destination : quotation?.destination}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Dates: {tour ? `${tour.startDate} to ${tour.endDate}` : `${quotation?.startDate} to ${quotation?.endDate}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase font-semibold block mb-1">Invoice / Reference:</span>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {tour ? `INV-2026-${tour.tourCode.substring(9)}` : quotation?.activeVersionCode}
                  </div>
                  <div className="text-slate-500 mt-1">
                    GST Treatment: SAC 998555 (Tour Operator Services)
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Package Description & Service Scope</th>
                      <th className="p-3">Pax</th>
                      <th className="p-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-mono text-slate-400">1</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {tour ? tour.packageName : 'Customised Tour Package Proposal'}
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Includes accommodation, dedicated private transport, sightseeing, tolls, driver allowance, and specified meals.
                        </p>
                      </td>
                      <td className="p-3 font-mono">{tour ? tour.adults : quotation?.paxCount}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        ₹{(tour ? tour.sellingPrice : (targetRevision?.subtotalSellingPrice || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">
                      ₹{(tour ? tour.sellingPrice : (targetRevision?.subtotalSellingPrice || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5% Composite):</span>
                    <span className="font-mono font-semibold">
                      ₹{(tour ? tour.gstAmount : (targetRevision?.gstAmount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-800">
                      ₹{(tour ? tour.totalReceivable : (targetRevision?.finalSellingPrice || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {tour && (
                    <div className="flex justify-between pt-1 text-emerald-700 text-xs">
                      <span>Amount Received:</span>
                      <span className="font-mono">₹{tour.totalCollected.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {tour && tour.outstandingBalance > 0 && (
                    <div className="flex justify-between text-amber-700 text-xs font-semibold">
                      <span>Balance Outstanding:</span>
                      <span className="font-mono">₹{tour.outstandingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT: RECEIPT */}
          {params.type === 'receipt' && (
            <div className="space-y-6 text-xs">
              <div className="p-6 border-2 border-slate-200 rounded-2xl bg-slate-50/60 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-slate-400 uppercase text-xs font-semibold block">Receipt Number</span>
                    <span className="text-base font-bold font-mono text-emerald-800">
                      {receipt?.receiptNumber || 'LST-REC-2026-0041'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 uppercase text-xs font-semibold block">Amount Received</span>
                    <span className="text-xl font-bold font-mono text-slate-900">
                      ₹{(receipt?.amount || tour?.totalCollected || 100000).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                  <p>
                    Received with thanks from: <strong>{receipt?.clientName || tour?.clientName}</strong>
                  </p>
                  <p>
                    Against Tour Code: <strong className="font-mono">{receipt?.tourCode || tour?.tourCode}</strong>
                  </p>
                  <p>
                    Payment Mode: <strong>{receipt?.paymentMode || 'Bank Transfer (NEFT/RTGS)'}</strong> · Bank Txn Ref: <strong className="font-mono">{receipt?.transactionReference || 'NEFT-889104'}</strong>
                  </p>
                  <p>
                    Deposited To: <strong>{receipt?.bankAccount || 'HDFC Bank Current A/c 502000088912'}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Signature Block */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <p>Generated by Let's See Destination Management ERP System</p>
              <p className="text-slate-400 text-xs mt-0.5">This document is electronically verified.</p>
            </div>
            <div className="text-right">
              <div className="w-40 border-b border-slate-400 pb-1 mb-1"></div>
              <span className="font-semibold text-slate-800 block">Authorised Signatory</span>
              <span className="text-slate-400 text-xs">Let's See Tour & Travels Pvt. Ltd.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
