import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { MapPin } from 'lucide-react';

export const ReportsMisView: React.FC = () => {
  const { confirmedTours, agents, setSelectedTourCode } = useDmc();

  const [activeReport, setActiveReport] = useState<'tour_pnl' | 'destination' | 'agent_perf'>('tour_pnl');

  const totalRevenue = confirmedTours.reduce((sum, t) => sum + t.sellingPrice, 0);
  const totalCost = confirmedTours.reduce((sum, t) => sum + t.totalEstimatedCost, 0);
  const totalGrossProfit = confirmedTours.reduce((sum, t) => sum + t.projectedGrossProfit, 0);
  const overallMarginPct = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const destMap: Record<string, { tours: number; revenue: number; cost: number; profit: number }> = {};
  confirmedTours.forEach(t => {
    if (!destMap[t.destination]) {
      destMap[t.destination] = { tours: 0, revenue: 0, cost: 0, profit: 0 };
    }
    destMap[t.destination].tours += 1;
    destMap[t.destination].revenue += t.sellingPrice;
    destMap[t.destination].cost += t.totalEstimatedCost;
    destMap[t.destination].profit += t.projectedGrossProfit;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            MIS & Profitability Reports
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tour-wise P&L statements, destination margins, and B2B agent performance.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveReport('tour_pnl')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'tour_pnl'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Tour-Wise P&L
          </button>
          <button
            onClick={() => setActiveReport('destination')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'destination'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Destination Margins
          </button>
          <button
            onClick={() => setActiveReport('agent_perf')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'agent_perf'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            B2B Agent Performance
          </button>
        </div>
      </div>

      {/* Pure KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <span className="text-xs font-medium text-slate-500 block">Total Tour Invoiced</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">{confirmedTours.length} confirmed tours</span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <span className="text-xs font-medium text-slate-500 block">Total Direct Cost</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            ₹{totalCost.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Hotels, transport & guides</span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <span className="text-xs font-medium text-slate-500 block">Net Realised Gross Profit</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            ₹{totalGrossProfit.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-emerald-700 font-medium mt-1 block tabular-nums">
            Avg margin: {overallMarginPct.toFixed(1)}%
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <span className="text-xs font-medium text-slate-500 block">Average Booking Value</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            ₹{Math.round(totalRevenue / Math.max(1, confirmedTours.length)).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Per confirmed booking</span>
        </div>
      </div>

      {/* REPORT 1: TOUR-WISE P&L */}
      {activeReport === 'tour_pnl' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tour-by-Tour Profit & Loss
            </h3>
            <span className="text-xs text-slate-400">
              Based on verified vendor costs & customer receipts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Tour Code</th>
                  <th className="py-3.5 px-4">Destination & Client</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Direct Cost</th>
                  <th className="py-3.5 px-4 text-right">Gross Profit</th>
                  <th className="py-3.5 px-4 text-right">Margin %</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmedTours.map(t => (
                  <tr key={t.tourCode} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{t.tourCode}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{t.destination}</div>
                      <span className="text-xs text-slate-500">{t.clientName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                      ₹{t.sellingPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">
                      ₹{t.totalEstimatedCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 tabular-nums">
                      ₹{t.projectedGrossProfit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800 tabular-nums">
                      {t.projectedMarginPct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-600">{t.status.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTourCode(t.tourCode)}
                        className="text-xs text-emerald-700 hover:underline font-semibold"
                      >
                        P&L Statement →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: DESTINATION PROFITABILITY */}
      {activeReport === 'destination' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(destMap).map(([dest, data]) => {
            const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
            return (
              <div key={dest} className="border border-slate-200 rounded-xl bg-white p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-900 text-sm">{dest}</h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tabular-nums">
                    {data.tours} Tours
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between py-2 text-slate-600">
                    <span>Total Revenue</span>
                    <span className="font-semibold text-slate-900 tabular-nums">₹{data.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 text-slate-600">
                    <span>Direct Sourcing Cost</span>
                    <span className="text-slate-800 tabular-nums">₹{data.cost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 text-emerald-700 font-bold">
                    <span>Gross Profit</span>
                    <span className="tabular-nums">₹{data.profit.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Gross Margin</span>
                  <span className="text-base font-bold text-emerald-700 tabular-nums">{margin.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT 3: B2B AGENT PERFORMANCE */}
      {activeReport === 'agent_perf' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Agent / Company</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4 text-right">Bookings</th>
                  <th className="py-3.5 px-4 text-right">Total Revenue</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-4 text-right">Credit Limit</th>
                  <th className="py-3.5 px-4">Credit Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{a.companyName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{a.city}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800 tabular-nums">{a.totalBookings}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 tabular-nums">
                      ₹{a.totalRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-700 font-semibold tabular-nums">
                      ₹{a.currentOutstanding.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 tabular-nums">
                      ₹{a.creditLimit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {a.creditAllowed ? `${a.creditDays} Days Credit` : 'Advance Only'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
