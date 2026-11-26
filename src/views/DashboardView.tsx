import React from 'react';
import { useDmc } from '../context/DmcContext';
import {
  CalendarCheck,
  Users2,
  CreditCard,
  TrendingUp,
  Truck,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onOpenAi: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAi }) => {
  const {
    selectedDepartment,
    leads,
    confirmedTours,
    supplierPayments,
    fleet,
    setSelectedTourCode
  } = useDmc();

  const activeTours = confirmedTours.filter(t => t.status === 'on_tour' || t.status === 'operations_prep');
  const pipelineLeads = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost');
  const urgentVouchers = supplierPayments.filter(p => p.status === 'pending_approval');

  const totalReceivables = confirmedTours.reduce((sum, t) => sum + t.outstandingBalance, 0);
  const totalBookingsValue = confirmedTours.reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalRealisedGrossProfit = confirmedTours.reduce((sum, t) => sum + t.actualGrossProfit, 0);

  const getDeptLabel = () => {
    switch (selectedDepartment) {
      case 'sales': return 'Sales & Client Proposals';
      case 'operations': return 'Operations Ground Control & Fleet';
      case 'accounts': return 'Accounts, Collections & Payables';
      default: return 'Executive Operations Control';
    }
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            {getDeptLabel()} · Guwahati Head Office
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Let's See Tour & Travels Operating System
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Unified DMC workspace connecting lead intake, itineraries, costing, tour codes, ground logistics, and financial reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {selectedDepartment !== 'operations' && selectedDepartment !== 'accounts' && (
            <button
              onClick={() => onNavigate('crm')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              + New Lead Enquiry
            </button>
          )}

          {selectedDepartment !== 'operations' && (
            <button
              onClick={() => onNavigate('costing')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Costing & Quotations
            </button>
          )}

          {selectedDepartment === 'operations' && (
            <button
              onClick={() => onNavigate('operations')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Destination Tasks Board
            </button>
          )}

          {selectedDepartment === 'accounts' && (
            <button
              onClick={() => onNavigate('accounts')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Tour Financials & Receipts
            </button>
          )}

          <button
            onClick={onOpenAi}
            className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>AI Insights</span>
          </button>
        </div>
      </div>

      {/* Pure KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Confirmed Tours</span>
            <CalendarCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {confirmedTours.length}
            </span>
            <span className="text-xs font-medium text-emerald-700">
              {activeTours.length} active on-road
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Total value ₹{totalBookingsValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Pipeline Inbound</span>
            <Users2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {pipelineLeads.length}
            </span>
            <span className="text-xs font-medium text-slate-600">
              active enquiries
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Northeast, Bhutan, Nepal & Thailand
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Customer Receivables</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              ₹{totalReceivables.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Across B2B agents & direct clients
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Net Gross Margin</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-800 tabular-nums">
              ₹{totalRealisedGrossProfit.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-700 font-medium">
            Avg gross margin 33.4%
          </p>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Tours Pure Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Tours in Execution & Operations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any tour row to open its 360° operational master file.
              </p>
            </div>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 shrink-0"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {confirmedTours.map(tour => (
              <div
                key={tour.tourCode}
                onClick={() => setSelectedTourCode(tour.tourCode)}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-800">
                      {tour.tourCode}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {tour.packageName}
                    </span>
                    <span className={`text-xs font-semibold capitalize ${
                      tour.status === 'on_tour'
                        ? 'text-emerald-700'
                        : tour.status === 'closed'
                        ? 'text-slate-500'
                        : 'text-amber-700'
                    }`}>
                      {tour.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">{tour.clientName}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span>{tour.destination}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="tabular-nums">{tour.startDate} to {tour.endDate} ({tour.days}D/{tour.nights}N)</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="tabular-nums">{tour.adults} Pax</span>
                  </p>

                  <p className="text-xs text-slate-500">
                    Transport: {tour.transportSource === 'own_fleet' ? 'Own Innova Crysta (Ramen Das)' : 'External Hired Vehicle'}
                  </p>
                </div>

                <div className="sm:text-right shrink-0 space-y-0.5 tabular-nums">
                  <div className="text-sm font-bold text-slate-900">
                    ₹{tour.sellingPrice.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    Recd ₹{tour.totalCollected.toLocaleString('en-IN')}
                  </div>
                  {tour.outstandingBalance > 0 && (
                    <div className="text-xs text-amber-700 font-semibold">
                      Due ₹{tour.outstandingBalance.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Supplier Advances & Fleet Status */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Supplier Advances Due</h2>
              </div>
              <span className="text-xs font-semibold text-amber-700 tabular-nums">
                {urgentVouchers.length} pending
              </span>
            </div>

            {urgentVouchers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                All supplier advances are reconciled and approved.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {urgentVouchers.map(v => (
                  <div key={v.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{v.supplierName}</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        ₹{v.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{v.tourCode} · Due {v.dueBy}</span>
                      <button
                        onClick={() => onNavigate('accounts')}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold"
                      >
                        Review →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">Company Fleet Status</h2>
              </div>
              <button
                onClick={() => onNavigate('fleet')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                Fleet Hub →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {fleet.map(v => (
                <div key={v.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 font-mono">{v.registrationNumber}</div>
                    <div className="text-xs text-slate-500 truncate">{v.model} · {v.driverName}</div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${
                    v.currentStatus === 'on_tour' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {v.currentStatus === 'on_tour' ? `On ${v.currentTourCode}` : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
