import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { FleetVehicle } from '../types';
import { ArrowRight } from 'lucide-react';

export const TransportFleetView: React.FC = () => {
  const {
    fleet,
    confirmedTours,
    assignVehicleToTour,
    setSelectedTourCode
  } = useDmc();

  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle>(fleet[0]);
  const [assignTourCode, setAssignTourCode] = useState(confirmedTours[0]?.tourCode || '');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const activeToursNeedTransport = confirmedTours.filter(t => t.status !== 'closed' && t.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Transport & Company Fleet Management
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Internal fleet scheduling, driver allocations, vehicle compliance, and movement logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Fleet Registry Pure Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden self-start">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fleet Registry ({fleet.length})
            </h3>
            <span className="text-xs text-emerald-700 font-semibold tabular-nums">
              {fleet.filter(f => f.currentStatus === 'on_tour').length} On-Road
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {fleet.map(v => {
              const isSelected = selectedVehicle.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {v.registrationNumber}
                    </span>
                    <span className={`text-xs font-semibold capitalize ${
                      v.currentStatus === 'on_tour' ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {v.currentStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 text-sm mt-1">
                    {v.model}
                  </div>

                  <div className="mt-1.5 text-xs text-slate-500 flex justify-between">
                    <span>Driver: {v.driverName}</span>
                    <span className="font-semibold text-slate-800 tabular-nums">₹{v.internalDailyRate}/day</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 spans): Vehicle Details & Movement Sheet */}
        {selectedVehicle && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="text-xs font-mono font-semibold text-emerald-700">
                    {selectedVehicle.registrationNumber}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {selectedVehicle.model}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Capacity: {selectedVehicle.seatingCapacity} Passengers · Category: {selectedVehicle.category}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Internal Daily Rate</span>
                  <span className="text-lg font-bold text-emerald-700 tabular-nums">
                    ₹{selectedVehicle.internalDailyRate.toLocaleString('en-IN')}/day
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">Operating Allocation</span>
                </div>
              </div>

              {/* Driver & Compliance Details via Clean Hairline Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="divide-y divide-slate-100">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block pb-2">
                    Assigned Driver Profile
                  </span>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Driver Name</span>
                    <span className="font-semibold text-slate-900">{selectedVehicle.driverName}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Contact Number</span>
                    <span className="font-mono text-slate-900">{selectedVehicle.driverPhone}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Commercial License</span>
                    <span className="font-mono text-slate-900">{selectedVehicle.driverLicenseNumber}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block pb-2">
                    Compliance & Fitness Certificates
                  </span>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Commercial Insurance</span>
                    <span className="text-emerald-700 font-semibold tabular-nums">Valid till {selectedVehicle.insuranceValidTill}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Fitness Certificate</span>
                    <span className="text-emerald-700 font-semibold tabular-nums">Valid till {selectedVehicle.fitnessValidTill}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Active Assignment</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedVehicle.currentTourCode || 'Unallocated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {selectedVehicle.currentTourCode ? (
                    <button
                      onClick={() => setSelectedTourCode(selectedVehicle.currentTourCode!)}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Open Tour {selectedVehicle.currentTourCode} Master File</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Ready for upcoming tour assignment</span>
                  )}
                </div>

                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Assign to Confirmed Tour
                </button>
              </div>
            </div>

            {/* Inline Assignment Card */}
            {showAssignModal && (
              <div className="p-5 bg-white border border-emerald-200 rounded-xl space-y-3 text-xs">
                <span className="font-semibold text-slate-900 block">
                  Assign {selectedVehicle.registrationNumber} ({selectedVehicle.model}) to Tour:
                </span>
                <select
                  value={assignTourCode}
                  onChange={(e) => setAssignTourCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold text-slate-900 outline-none focus:border-emerald-700"
                >
                  {activeToursNeedTransport.map(t => (
                    <option key={t.tourCode} value={t.tourCode}>
                      {t.tourCode} - {t.packageName} ({t.destination})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      assignVehicleToTour(assignTourCode, selectedVehicle.id);
                      setShowAssignModal(false);
                    }}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-colors"
                  >
                    Confirm Allocation
                  </button>
                </div>
              </div>
            )}

            {/* Fleet Movement Pure Card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fleet Movement & Schedule
                </h4>
              </div>
              <div className="divide-y divide-slate-100">
                {confirmedTours.filter(t => t.allocatedVehicleId).map(t => (
                  <div key={t.tourCode} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700">{t.tourCode}</span>
                        <span className="font-semibold text-slate-900">{t.packageName}</span>
                      </div>
                      <span className="text-slate-500 mt-1 block tabular-nums">
                        {t.startDate} to {t.endDate} · Route: {t.destination}
                      </span>
                    </div>

                    <div className="sm:text-right">
                      <span className="font-semibold text-slate-800 block">Driver: {t.allocatedDriverName}</span>
                      <span className="text-xs text-slate-400 capitalize">{t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
