import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  Clock,
  Send,
  Bot,
  Sparkles,
  CheckCircle2,
  Settings,
  Search,
  Play,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { ItineraryShareRecord, AIIntentAnalysis } from '../types';

export const FollowUpsView: React.FC = () => {
  const {
    itineraryShares,
    followUpConfig,
    updateFollowUpConfig,
    recordFollowUpActivity,
    triggerAutomaticFollowUps,
    analyzeClientSnippet,
    applyAiIntentStage,
    aiIntentAnalyses,
    leads,
    currentEmployee
  } = useDmc();

  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedShare, setSelectedShare] = useState<ItineraryShareRecord | null>(null);
  const [cadenceToast, setCadenceToast] = useState<string | null>(null);

  // Manual Follow-up modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [manualChannel, setManualChannel] = useState<'email' | 'whatsapp' | 'call'>('whatsapp');
  const [clientResponseSummary, setClientResponseSummary] = useState('');

  // AI Scanner state
  const [aiSnippet, setAiSnippet] = useState('');
  const [aiSelectedEnquiryId, setAiSelectedEnquiryId] = useState(itineraryShares[0]?.enquiryId || leads[0]?.id || '');
  const [aiResult, setAiResult] = useState<AIIntentAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Config form state
  const [firstFollowUpDays, setFirstFollowUpDays] = useState(followUpConfig.firstFollowUpDays);
  const [secondFollowUpDays, setSecondFollowUpDays] = useState(followUpConfig.secondFollowUpDays);
  const [thirdFollowUpDays, setThirdFollowUpDays] = useState(followUpConfig.thirdFollowUpDays);
  const [maxFollowUpAttempts, setMaxFollowUpAttempts] = useState(followUpConfig.maxFollowUpAttempts);
  const [quietHoursStart, setQuietHoursStart] = useState(followUpConfig.quietHoursStart);
  const [quietHoursEnd, setQuietHoursEnd] = useState(followUpConfig.quietHoursEnd);

  const filteredShares = itineraryShares.filter(share => {
    const matchesFilter = filterStage === 'all' ? true : share.enquiryStatus === filterStage;
    const matchesSearch =
      share.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      share.enquiryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      share.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      share.recipientEmailOrPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      share.salespersonName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalShares = itineraryShares.length;
  const awaitingReply = itineraryShares.filter(s => s.enquiryStatus === 'Quotation Sent' || s.enquiryStatus === 'Follow-up').length;
  const highIntentCount = aiIntentAnalyses.filter(a => a.detectedIntent === 'Converted').length;
  const convertedCount = itineraryShares.filter(s => s.enquiryStatus === 'Won' || s.enquiryStatus === 'Confirmation Received').length;

  const handleRunAiScanner = () => {
    if (!aiSnippet.trim() || !aiSelectedEnquiryId) return;
    setAiLoading(true);
    setTimeout(() => {
      const result = analyzeClientSnippet(aiSnippet, aiSelectedEnquiryId);
      setAiResult(result);
      setAiLoading(false);
    }, 400);
  };

  const handleApplyAiAction = () => {
    if (!aiResult) return;
    applyAiIntentStage(aiResult.id);
    setShowAiModal(false);
    setAiSnippet('');
    setAiResult(null);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateFollowUpConfig({
      firstFollowUpDays: Number(firstFollowUpDays),
      secondFollowUpDays: Number(secondFollowUpDays),
      thirdFollowUpDays: Number(thirdFollowUpDays),
      maxFollowUpAttempts: Number(maxFollowUpAttempts),
      quietHoursStart,
      quietHoursEnd
    });
    setShowConfigModal(false);
  };

  const handleManualFollowUpSubmit = () => {
    if (!selectedShare) return;
    recordFollowUpActivity({
      enquiryId: selectedShare.enquiryId,
      itineraryShareId: selectedShare.id,
      type: manualChannel,
      isAutomated: false,
      scheduledFor: new Date().toISOString().split('T')[0],
      status: 'completed',
      performedBy: currentEmployee?.name || 'Sales Staff',
      notes: manualNote || `Manual ${manualChannel} follow-up logged`,
      clientResponseSummary: clientResponseSummary || 'Reviewed proposal with client'
    });
    setShowFollowUpModal(false);
    setManualNote('');
    setClientResponseSummary('');
    setSelectedShare(null);
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Sales Cadence & Automation · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Itinerary Sharing & Follow-ups
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track sent itinerary snapshots, schedule automated follow-ups, and detect buying intent from client replies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Intent Scanner</span>
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Cadence Rules</span>
          </button>

          <button
            onClick={() => {
              const res = triggerAutomaticFollowUps();
              setCadenceToast(`Scheduler executed: ${res.triggeredCount} dispatched · ${res.skippedCount} skipped`);
              setTimeout(() => setCadenceToast(null), 5000);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-700" />
            <span>Run Cadence Now</span>
          </button>
        </div>
      </div>

      {cadenceToast && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{cadenceToast}</span>
          <button onClick={() => setCadenceToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pure KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Shared</span>
            <Send className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">{totalShares}</div>
          <p className="text-xs text-slate-500 mt-1">Email & WhatsApp proposals</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Awaiting Client</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-3 tabular-nums">{awaitingReply}</div>
          <p className="text-xs text-slate-500 mt-1">Active follow-up cadence</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">AI High Intent</span>
            <Sparkles className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-3 tabular-nums">{highIntentCount}</div>
          <p className="text-xs text-slate-500 mt-1">Strong buying signals</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Converted Tours</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-3 tabular-nums">{convertedCount}</div>
          <p className="text-xs text-slate-500 mt-1">Moved to booking handover</p>
        </div>
      </div>

      {/* Main Table Card with Integrated Filters & Protocol Line */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Cadence protocol: Day {followUpConfig.firstFollowUpDays}, Day {followUpConfig.secondFollowUpDays}, Day {followUpConfig.thirdFollowUpDays} · Max {followUpConfig.maxFollowUpAttempts} attempts · Quiet hours {followUpConfig.quietHoursStart}–{followUpConfig.quietHoursEnd}
            </span>
          </div>
          <span className="text-emerald-700 font-semibold">Auto-halt on confirmation</span>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['all', 'Quotation Sent', 'Follow-up', 'Negotiation', 'Confirmation Received', 'Won'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStage(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                  filterStage === st
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, enquiry ID, phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-6">Client & Enquiry</th>
                <th className="py-3.5 px-6">Destination & Quote</th>
                <th className="py-3.5 px-6">Channel & Sent</th>
                <th className="py-3.5 px-6">Next Due</th>
                <th className="py-3.5 px-6">Stage</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredShares.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No itinerary shares found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredShares.map(share => {
                  const isWon = share.enquiryStatus === 'Won' || share.enquiryStatus === 'Confirmation Received';

                  return (
                    <tr key={share.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 text-sm">{share.clientName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          <span className="font-mono font-semibold text-emerald-700">{share.enquiryId}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span>{share.recipientEmailOrPhone}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Staff: {share.salespersonName}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-900">{share.destination}</div>
                        <div className="text-xs text-emerald-800 font-semibold mt-0.5 tabular-nums">
                          ₹{share.quotedAmount.toLocaleString('en-IN')} · v{share.itineraryVersion}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {share.travelDates} · {share.guestCount} Pax
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-900">
                          {share.channel} <span className="text-slate-400 font-normal">· {share.deliveryStatus}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          Sent {share.sentAt.split('T')[0]}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-xs font-semibold text-amber-700 tabular-nums">
                          {share.followUpDate}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold ${
                          isWon
                            ? 'text-emerald-700'
                            : share.enquiryStatus === 'Follow-up'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                        }`}>
                          {share.enquiryStatus}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedShare(share);
                              setShowFollowUpModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors"
                          >
                            Follow Up
                          </button>

                          <button
                            onClick={() => {
                              setAiSelectedEnquiryId(share.enquiryId);
                              setShowAiModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Analyze client response snippet"
                          >
                            <Bot className="w-4 h-4" />
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

      {/* Manual Follow-up Modal */}
      {showFollowUpModal && selectedShare && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Record Follow-Up</p>
                <h3 className="font-bold text-slate-900 text-base mt-0.5">
                  {selectedShare.clientName} ({selectedShare.enquiryId})
                </h3>
              </div>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Communication Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['whatsapp', 'email', 'call'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setManualChannel(ch)}
                      className={`py-2 text-center rounded-lg border font-semibold capitalize transition-colors ${
                        manualChannel === ch
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Client Response Summary</label>
                <input
                  type="text"
                  value={clientResponseSummary}
                  onChange={(e) => setClientResponseSummary(e.target.value)}
                  placeholder="e.g. Client requested 4-star hotel option in Kaziranga"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Detailed Remarks</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Discussed travel plan with guest. Sent updated revised itinerary."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 h-24 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualFollowUpSubmit}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Save Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Conversion Intent Scanner Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">AI Intent & Sentiment Scanner</h3>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setAiResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Select Client Enquiry</label>
                <select
                  value={aiSelectedEnquiryId}
                  onChange={(e) => setAiSelectedEnquiryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} ({l.id} · {l.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Client WhatsApp / Email Snippet
                </label>
                <textarea
                  value={aiSnippet}
                  onChange={(e) => setAiSnippet(e.target.value)}
                  placeholder="Paste message e.g.: 'We like the itinerary. Please share bank account details to pay the token advance of Rs 25,000.'"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 h-24 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAiSnippet("Looks good! Please share proforma invoice and bank details for advance payment.")}
                    className="text-xs text-emerald-800 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 font-medium"
                  >
                    Sample: Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSnippet("Price is slightly high. Can we change Kaziranga resort to a 3-star?")}
                    className="text-xs text-slate-700 hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-medium"
                  >
                    Sample: Revision
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiScanner}
                  disabled={aiLoading || !aiSnippet.trim()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  <span>Scan Snippet</span>
                </button>
              </div>

              {aiResult && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Detection Result</span>
                    <span className="text-xs font-semibold text-emerald-800 tabular-nums">
                      {(aiResult.confidenceScore * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 text-xs">Detected Intent</span>
                      <div className="font-semibold text-slate-900 mt-0.5">{aiResult.detectedIntent}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Suggested Stage</span>
                      <div className="font-semibold text-slate-900 mt-0.5">{aiResult.suggestedLeadStage}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-xs">Recommended Action</span>
                    <div className="font-medium text-emerald-900 mt-0.5">{aiResult.suggestedAction}</div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyAiAction}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply Stage ({aiResult.suggestedLeadStage})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cadence Rules Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">Follow-up Schedule & Safeguards</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">1st Follow-up</label>
                  <input
                    type="number"
                    min="1"
                    value={firstFollowUpDays}
                    onChange={(e) => setFirstFollowUpDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Days</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">2nd Follow-up</label>
                  <input
                    type="number"
                    min="2"
                    value={secondFollowUpDays}
                    onChange={(e) => setSecondFollowUpDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Days</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">3rd Follow-up</label>
                  <input
                    type="number"
                    min="3"
                    value={thirdFollowUpDays}
                    onChange={(e) => setThirdFollowUpDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Days</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Maximum Cadence Attempts</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxFollowUpAttempts}
                  onChange={(e) => setMaxFollowUpAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Quiet Hours Start</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Quiet Hours End</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
