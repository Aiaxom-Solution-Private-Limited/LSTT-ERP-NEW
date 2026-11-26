import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { TourExpense, TourIncident } from '../types';
import {
  AlertTriangle,
  Receipt
} from 'lucide-react';

export const TourExecutionView: React.FC = () => {
  const {
    confirmedTours,
    fleet,
    incidents,
    expenses,
    reportTourIncident,
    recordTourExpense,
    setSelectedTourCode
  } = useDmc();

  const onTourList = confirmedTours.filter(t => t.status === 'on_tour');
  const [selectedTourCode, setTourCode] = useState<string>(onTourList[0]?.tourCode || 'LST-2026-00001');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCat, setExpenseCat] = useState<TourExpense['category']>('Driver Fuel');
  const [expenseAmt, setExpenseAmt] = useState(2500);
  const [expenseDesc, setExpenseDesc] = useState('Fuel fill-up at Shillong Indian Oil pump');
  const [expenseSpentBy, setExpenseSpentBy] = useState('Ramen Das (Driver)');

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState<TourIncident['incidentType']>('Hotel Room Issue');
  const [incidentSeverity, setIncidentSeverity] = useState<TourIncident['severity']>('medium');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentAction, setIncidentAction] = useState('');

  const currentTour = confirmedTours.find(t => t.tourCode === selectedTourCode);
  const vehicle = currentTour?.allocatedVehicleId ? fleet.find(f => f.id === currentTour.allocatedVehicleId) : null;
  const tourIncidents = incidents.filter(i => i.tourCode === selectedTourCode);
  const tourExpenses = expenses.filter(e => e.tourCode === selectedTourCode);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordTourExpense({
      tourCode: selectedTourCode,
      category: expenseCat,
      amount: expenseAmt,
      spentDate: new Date().toISOString().substring(0, 10),
      spentBy: expenseSpentBy,
      billAttached: true,
      description: expenseDesc,
      status: 'approved'
    });
    setShowExpenseModal(false);
  };

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportTourIncident({
      tourCode: selectedTourCode,
      reportedBy: 'Operations Field Coordinator',
      incidentType,
      severity: incidentSeverity,
      description: incidentDesc,
      actionTaken: incidentAction || 'Under active coordination with supplier',
      costImpact: 0
    });
    setIncidentDesc('');
    setIncidentAction('');
    setShowIncidentModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Live Tour Execution & Field Operations
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            On-ground tracking, driver fuel logs, guest assistance, and incident resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Record Driver Expense</span>
          </button>

          <button
            onClick={() => setShowIncidentModal(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Log Field Incident</span>
          </button>
        </div>
      </div>

      {/* Tour Selector Pure Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-semibold text-slate-600 whitespace-nowrap">Active Tour</span>
          <select
            value={selectedTourCode}
            onChange={(e) => setTourCode(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-emerald-800 outline-none focus:border-emerald-700 max-w-md w-full"
          >
            {confirmedTours.map(t => (
              <option key={t.tourCode} value={t.tourCode}>
                {t.tourCode} - {t.packageName} ({t.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {currentTour && (
          <button
            onClick={() => setSelectedTourCode(currentTour.tourCode)}
            className="text-xs font-semibold text-emerald-700 hover:underline self-start sm:self-auto"
          >
            Open Master File →
          </button>
        )}
      </div>

      {currentTour && (
        <div className="space-y-6">
          {/* Active Tour Summary Pure White Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-emerald-700">
                    {currentTour.tourCode}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="capitalize font-semibold text-emerald-700">
                    {currentTour.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {currentTour.packageName}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Lead Guest: <strong className="text-slate-900">{currentTour.travellers[0]?.fullName || currentTour.clientName}</strong> · {currentTour.adults} Adults
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-xs text-slate-400 block uppercase font-medium">Travel Period</span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {currentTour.startDate} to {currentTour.endDate}
                </span>
              </div>
            </div>

            {/* Clean Hairline Contact Row (No Nested Subcards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Assigned Driver & Vehicle</span>
                <div className="font-semibold text-slate-900 mt-1">
                  {currentTour.allocatedDriverName || 'Ramen Das'} ({currentTour.allocatedDriverPhone || '+91 98640 12345'})
                </div>
                <div className="text-slate-500 mt-0.5">
                  {vehicle ? `${vehicle.model} (${vehicle.registrationNumber})` : 'Toyota Innova Crysta'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Lead Guest Contact</span>
                <div className="font-mono font-semibold text-slate-900 mt-1">
                  {currentTour.travellers[0]?.contactNumber || '+91 98205 11920'}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {currentTour.clientName}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Operations Emergency Line</span>
                <div className="font-mono font-semibold text-emerald-700 mt-1">
                  +91 98640 99999 (Guwahati HQ 24x7)
                </div>
                <div className="text-slate-500 mt-0.5">
                  Lead: {currentTour.assignedOperationsLead}
                </div>
              </div>
            </div>
          </div>

          {/* Incidents & On-Ground Expenses Pure Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Field Incidents ({tourIncidents.length})</span>
                </h4>
              </div>

              {tourIncidents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No operational incidents or complaints on this tour.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tourIncidents.map(inc => (
                    <div key={inc.id} className="px-6 py-4 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900">{inc.incidentType}</span>
                        <span className={`text-xs font-semibold uppercase ${
                          inc.severity === 'high' || inc.severity === 'critical'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}>
                          {inc.severity}
                        </span>
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

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>Driver & Tour Expenses ({tourExpenses.length})</span>
                </h4>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  Total: ₹{tourExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {tourExpenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No driver or on-tour expenses recorded yet.
                  </div>
                ) : (
                  tourExpenses.map(exp => (
                    <div key={exp.id} className="px-6 py-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/70 transition-colors">
                      <div>
                        <div className="font-semibold text-slate-900">{exp.category}</div>
                        <span className="text-slate-600 block mt-0.5">{exp.description}</span>
                        <div className="text-slate-400 mt-1 tabular-nums">
                          {exp.spentBy} · {exp.spentDate}
                        </div>
                      </div>
                      <div className="text-right font-bold text-slate-900 tabular-nums shrink-0">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight">Record On-Ground Tour Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-emerald-100 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Expense Category *</label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
                >
                  <option value="Driver Fuel">Driver Fuel</option>
                  <option value="Toll & Parking">Toll & Parking</option>
                  <option value="Entry Permits">Monument / Entry Permits</option>
                  <option value="Local Purchases">Local Purchases / Welcome Drinks</option>
                  <option value="Emergency Repair">Emergency Repair</option>
                  <option value="Guide Tip">Guide Tip</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  required
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm tabular-nums outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Spent By (Driver/Coordinator)</label>
                <input
                  type="text"
                  value={expenseSpentBy}
                  onChange={(e) => setExpenseSpentBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight">Log Field Incident / Guest Issue</h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-emerald-100 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleIncidentSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Incident Classification *</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
                >
                  <option value="Hotel Room Issue">Hotel Room Issue</option>
                  <option value="Vehicle Delay / Breakdown">Vehicle Delay / Breakdown</option>
                  <option value="Weather & Road Blockage">Weather & Road Blockage</option>
                  <option value="Guest Health / Medical">Guest Health / Medical</option>
                  <option value="Itinerary Modification">Itinerary Modification</option>
                  <option value="Service Quality Complaint">Service Quality Complaint</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Severity</label>
                <select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
                >
                  <option value="low">Low - Minor Inconvenience</option>
                  <option value="medium">Medium - Action Needed</option>
                  <option value="high">High - Urgent Escalation</option>
                  <option value="critical">Critical - Emergency / Medical</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Incident Details *</label>
                <textarea
                  required
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Describe the situation as reported by guest or driver..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Immediate Action Taken</label>
                <textarea
                  value={incidentAction}
                  onChange={(e) => setIncidentAction(e.target.value)}
                  placeholder="e.g. Coordinated with hotel duty manager to change room..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Log Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
