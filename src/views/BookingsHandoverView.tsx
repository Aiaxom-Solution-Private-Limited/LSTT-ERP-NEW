import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { ConfirmedTour } from '../types';
import { ArrowRight, Search } from 'lucide-react';

export const BookingsHandoverView: React.FC = () => {
  const {
    confirmedTours,
    handovers,
    reviewSalesHandover,
    setSelectedTourCode
  } = useDmc();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTour, setSelectedTour] = useState<ConfirmedTour>(confirmedTours[0]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const filteredTours = confirmedTours.filter(t =>
    t.tourCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handover = selectedTour
    ? handovers.find(h => h.tourCode === selectedTour.tourCode)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-emerald-700">
          Sales-to-Operations Governance · Let's See Tour & Travels
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Bookings & Handovers
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review confirmed client commitments, flight schedules, rooming notes, and operational readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pure Confirmed Tours Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tour code or client..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredTours.map(t => {
              const isSelected = selectedTour?.tourCode === t.tourCode;
              const h = handovers.find(x => x.tourCode === t.tourCode);

              return (
                <button
                  key={t.tourCode}
                  onClick={() => setSelectedTour(t)}
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-emerald-700 text-xs">{t.tourCode}</span>
                    <span className={`text-xs font-semibold capitalize ${
                      h?.status === 'accepted' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {h?.status ? h.status.replace('_', ' ') : 'Pending'}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-900 text-sm mt-1 truncate">
                    {t.clientName}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex justify-between tabular-nums">
                    <span>{t.destination}</span>
                    <span>{t.startDate}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Pure Selected Tour Handover Detail Card */}
        {selectedTour && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-emerald-700">
                      {selectedTour.tourCode}
                    </span>
                    <span className="text-slate-300">·</span>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedTour.packageName}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {selectedTour.startDate} to {selectedTour.endDate} · {selectedTour.adults} Adults
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTourCode(selectedTour.tourCode)}
                  className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>Open Tour 360°</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {handover ? (
                <div className="space-y-6 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Handover Status</span>
                      <span className="font-semibold text-slate-900 text-sm capitalize mt-0.5 block">
                        {handover.status.replace('_', ' ')} · Submitted by {handover.submittedBy}
                      </span>
                    </div>

                    {handover.status === 'pending_review' && (
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
                      >
                        Operations Manager Sign-Off
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-semibold block">Flight Arrival</span>
                      <p className="font-mono text-slate-900 font-medium">{handover.flightArrivalDetails}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 font-semibold block">Flight Departure</span>
                      <p className="font-mono text-slate-900 font-medium">{handover.flightDepartureDetails}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pb-4 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold block">
                      Special Guest Requests & Driver Instructions
                    </span>
                    <p className="text-slate-800 leading-relaxed text-sm">{handover.specialRequests}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-slate-500 font-semibold block">
                      Sales Commitments & Inclusions Promised
                    </span>
                    <p className="text-slate-800 leading-relaxed text-sm">{handover.salesCommitments}</p>
                  </div>

                  {handover.reviewerNotes && (
                    <div className="pt-4 border-t border-slate-100 space-y-1">
                      <span className="font-semibold text-emerald-800 block">
                        Operations Reviewer Notes ({handover.reviewedBy})
                      </span>
                      <p className="text-slate-700">{handover.reviewerNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No sales handover submitted yet for {selectedTour.tourCode}.
                </div>
              )}
            </div>

            {showReviewModal && (
              <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4 text-xs">
                <h3 className="font-bold text-slate-900 text-sm">
                  Operations Manager Handover Review · {selectedTour.tourCode}
                </h3>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Enter confirmation notes or specify clarifications needed from sales..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-600"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => {
                      reviewSalesHandover(selectedTour.tourCode, 'clarification_required', reviewerNotes || 'Clarification required.');
                      setShowReviewModal(false);
                    }}
                    className="px-3.5 py-2 bg-white border border-rose-200 text-rose-700 font-semibold rounded-lg hover:bg-rose-50"
                  >
                    Request Clarification
                  </button>
                  <button
                    onClick={() => {
                      reviewSalesHandover(selectedTour.tourCode, 'accepted', reviewerNotes || 'Handover accepted. Fleet and hotels verified.');
                      setShowReviewModal(false);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                  >
                    Accept Handover & Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
