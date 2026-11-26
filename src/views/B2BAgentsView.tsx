import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { B2BAgent } from '../types';
import { Phone, Mail, Search } from 'lucide-react';

export const B2BAgentsView: React.FC = () => {
  const { agents, confirmedTours, setSelectedTourCode } = useDmc();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<B2BAgent | null>(agents[0]);

  const filteredAgents = agents.filter(a =>
    a.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const agentTours = selectedAgent
    ? confirmedTours.filter(t => t.agentId === selectedAgent.id)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-emerald-700">
          Partner Agencies · Let's See Tour & Travels
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          B2B Agent Directory & Credit
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Credit limits, payment terms, outstanding balances, and partner booking ledgers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pure Agent List Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter agents by name or city..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredAgents.map(a => {
              const isSelected = selectedAgent?.id === a.id;
              const creditPct = a.creditLimit > 0 ? (a.currentOutstanding / a.creditLimit) * 100 : 0;
              const isNearLimit = creditPct > 80;

              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgent(a)}
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm truncate">
                      {a.companyName}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{a.city}</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{a.contactPerson}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      ₹{a.currentOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {a.creditAllowed && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 tabular-nums">
                        <span>Credit Used</span>
                        <span>{creditPct.toFixed(0)}% of ₹{(a.creditLimit / 100000).toFixed(1)}L</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full ${isNearLimit ? 'bg-rose-500' : 'bg-emerald-600'}`}
                          style={{ width: `${Math.min(100, creditPct)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Pure Agent Profile & Ledger */}
        {selectedAgent && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">{selectedAgent.companyName}</h2>
                    <span className="text-xs font-semibold text-emerald-700">Active Partner</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    GSTIN: <span className="font-mono text-slate-700">{selectedAgent.gstNumber || 'Unregistered'}</span> · Sales Owner: <span className="font-medium text-slate-800">{selectedAgent.assignedSalesperson}</span>
                  </p>
                </div>

                <div className="sm:text-right tabular-nums">
                  <span className="text-xs text-slate-500 block">Outstanding Balance</span>
                  <span className="text-xl font-bold text-slate-900">
                    ₹{selectedAgent.currentOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Credit Facility</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {selectedAgent.creditAllowed ? `Approved (${selectedAgent.creditDays} Days)` : 'Advance Only'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Credit Limit</span>
                  <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
                    ₹{selectedAgent.creditLimit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Available Headroom</span>
                  <span className="font-bold text-emerald-700 tabular-nums mt-0.5 block">
                    ₹{Math.max(0, selectedAgent.creditLimit - selectedAgent.currentOutstanding).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{selectedAgent.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedAgent.email}</span>
                </div>
                <div>
                  {selectedAgent.city}, {selectedAgent.state}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Tours Booked by {selectedAgent.companyName} ({agentTours.length})
                </h3>
              </div>

              {agentTours.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">
                  No confirmed tours recorded under this agent yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-3.5 px-6">Tour Code</th>
                        <th className="py-3.5 px-6">Package</th>
                        <th className="py-3.5 px-6">Start Date</th>
                        <th className="py-3.5 px-6 text-right">Selling Price</th>
                        <th className="py-3.5 px-6 text-right">Collected</th>
                        <th className="py-3.5 px-6 text-right">Outstanding</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {agentTours.map(t => (
                        <tr
                          key={t.tourCode}
                          className="hover:bg-slate-50/70 cursor-pointer"
                          onClick={() => setSelectedTourCode(t.tourCode)}
                        >
                          <td className="py-4 px-6 font-mono font-bold text-emerald-700">{t.tourCode}</td>
                          <td className="py-4 px-6 font-medium text-slate-900">{t.packageName}</td>
                          <td className="py-4 px-6 text-slate-600">{t.startDate}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-900">₹{t.sellingPrice.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-6 text-right text-emerald-700">₹{t.totalCollected.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-6 text-right text-amber-700 font-semibold">₹{t.outstandingBalance.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-6 capitalize text-slate-600">{t.status.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
