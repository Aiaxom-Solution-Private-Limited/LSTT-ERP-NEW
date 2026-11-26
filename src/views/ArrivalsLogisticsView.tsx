import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  PlaneTakeoff,
  PlaneLanding,
  Car,
  UserCheck,
  Printer,
  Search,
  FileText,
  MapPin,
  Luggage,
  X
} from 'lucide-react';
import { ArrivalDepartureInfo } from '../types';

export const ArrivalsLogisticsView: React.FC = () => {
  const {
    arrivalDepartures,
    saveArrivalDeparture,
    fleet,
    currentEmployee
  } = useDmc();

  const [activeTab, setActiveTab] = useState<'all' | 'arrival' | 'departure'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ArrivalDepartureInfo | null>(null);

  // Edit/assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editVehiclePlate, setEditVehiclePlate] = useState('AS-01-EC-4021');
  const [editDriverName, setEditDriverName] = useState('Ramen Das');
  const [editDriverPhone, setEditDriverPhone] = useState('+91 94350 11982');
  const [editStatus, setEditStatus] = useState<ArrivalDepartureInfo['status']>('pending_assignment');
  const [editInstructions, setEditInstructions] = useState('');

  // Signage Board Modal
  const [showSignagePreview, setShowSignagePreview] = useState<ArrivalDepartureInfo | null>(null);

  // Driver Duty Slip Modal
  const [showDutySlip, setShowDutySlip] = useState<ArrivalDepartureInfo | null>(null);

  const filteredLogistics = arrivalDepartures.filter(item => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'arrival'
        ? Boolean(item.arrivalFlightOrTrain)
        : Boolean(item.departureFlightOrTrain);
    const matchesSearch =
      item.tourCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.leadGuestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.arrivalFlightOrTrain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.assignedDriverName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (item.assignedVehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesTab && matchesSearch;
  });

  const totalLogistics = arrivalDepartures.length;
  const driversAssigned = arrivalDepartures.filter(
    a => a.status === 'vehicle_assigned' || a.status === 'completed' || a.status === 'in_transit'
  ).length;

  const handleOpenAssign = (record: ArrivalDepartureInfo) => {
    setSelectedRecord(record);
    setEditVehiclePlate(record.assignedVehiclePlate || 'AS-01-EC-4021');
    setEditDriverName(record.assignedDriverName || 'Ramen Das');
    setEditDriverPhone(record.assignedDriverPhone || '+91 94350 11982');
    setEditStatus(record.status);
    setEditInstructions(record.specialInstructions || '');
    setShowAssignModal(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    saveArrivalDeparture({
      ...selectedRecord,
      assignedVehiclePlate: editVehiclePlate,
      assignedDriverName: editDriverName,
      assignedDriverPhone: editDriverPhone,
      status: editStatus,
      specialInstructions: editInstructions,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: currentEmployee?.name || 'Operations Lead'
    });
    setShowAssignModal(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div>
        <p className="text-xs font-semibold text-emerald-700">
          Operations Logistics & Dispatch · Northeast Airport & Station Protocol
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Arrival & Departure Logistics
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Coordinate flight and rail transfers, chauffeur assignments, airport welcome signage placards, and driver duty slips.
        </p>
      </div>

      {/* Pure KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Scheduled Transfers</span>
            <PlaneTakeoff className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">{totalLogistics}</div>
          <p className="text-xs text-slate-500 mt-1">Active tour movements</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Arrivals (GAU / DIB)</span>
            <PlaneLanding className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-3 tabular-nums">{totalLogistics}</div>
          <p className="text-xs text-slate-500 mt-1">Airport & station pickups</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Departures</span>
            <PlaneTakeoff className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">{totalLogistics}</div>
          <p className="text-xs text-slate-500 mt-1">Return drops scheduled</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Chauffeur Assigned</span>
            <UserCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-3 tabular-nums">{driversAssigned}</div>
          <p className="text-xs text-slate-500 mt-1">Vehicles & drivers locked</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(['all', 'arrival', 'departure'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab === 'all' ? 'All Movements' : `${tab}s`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tour code, guest, flight #..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-600 text-slate-900"
          />
        </div>
      </div>

      {/* Pure White Logistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLogistics.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
            No arrival or departure logistics records match your search.
          </div>
        ) : (
          filteredLogistics.map(item => (
            <div
              key={item.tourCode}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 hover:border-emerald-300 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-700 shrink-0">
                    <PlaneLanding className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{item.leadGuestName}</span>
                      <span className="font-mono text-xs font-semibold text-emerald-700">{item.tourCode}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      <span className="font-semibold text-slate-700 uppercase">{item.arrivalFlightOrTrain}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>{item.arrivalDate} at {item.arrivalTime}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>{item.paxCount} Pax</span>
                    </p>
                  </div>
                </div>

                <span className={`text-xs font-semibold capitalize shrink-0 ${
                  item.status === 'completed'
                    ? 'text-emerald-700'
                    : item.status === 'vehicle_assigned' || item.status === 'in_transit'
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Route Details (hairline separated, zero nested card) */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Pickup: </span>
                    <span>{item.pickupAddress} ({item.arrivalPoint})</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Return Drop: </span>
                    <span>{item.dropAddress} ({item.departureFlightOrTrain})</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Luggage className="w-3.5 h-3.5 text-slate-400" />
                    {item.luggageDetails || 'Standard Baggage'}
                  </span>
                  {item.specialInstructions && (
                    <span className="text-amber-700 font-medium truncate max-w-full">
                      Note: {item.specialInstructions}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer: Vehicle & Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-slate-900">{item.assignedVehiclePlate || 'Unassigned'}</span>
                    <span className="text-slate-500 ml-2">
                      {item.assignedDriverName || 'No Driver'} {item.assignedDriverPhone ? `· ${item.assignedDriverPhone}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSignagePreview(item)}
                    className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 font-semibold flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3 text-emerald-700" />
                    <span>Signage</span>
                  </button>

                  <button
                    onClick={() => setShowDutySlip(item)}
                    className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 font-semibold flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3 text-emerald-700" />
                    <span>Duty Slip</span>
                  </button>

                  <button
                    onClick={() => handleOpenAssign(item)}
                    className="px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Driver & Vehicle Assignment Modal */}
      {showAssignModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Chauffeur & Fleet Dispatch</p>
                <h3 className="font-bold text-slate-900 text-base mt-0.5">
                  {selectedRecord.leadGuestName} ({selectedRecord.tourCode})
                </h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Company Fleet Vehicle</label>
                <select
                  value={editVehiclePlate}
                  onChange={(e) => {
                    setEditVehiclePlate(e.target.value);
                    const matchedFleet = fleet.find(f => f.registrationNumber === e.target.value);
                    if (matchedFleet) {
                      setEditDriverName(matchedFleet.driverName);
                      setEditDriverPhone(matchedFleet.driverPhone);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-mono font-medium focus:outline-none focus:border-emerald-600"
                >
                  {fleet.map(f => (
                    <option key={f.id} value={f.registrationNumber}>
                      {f.registrationNumber} · {f.model} ({f.driverName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Driver Name</label>
                  <input
                    type="text"
                    value={editDriverName}
                    onChange={(e) => setEditDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Driver Phone</label>
                  <input
                    type="text"
                    value={editDriverPhone}
                    onChange={(e) => setEditDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Operational Movement Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="pending_assignment">Pending Assignment</option>
                  <option value="vehicle_assigned">Vehicle Assigned</option>
                  <option value="in_transit">In Transit / Picked Up</option>
                  <option value="completed">Completed / Dropped</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Special Dispatch Notes</label>
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="e.g. Meet guest near Terminal 1 Exit Gate 2 with welcome placard."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 h-20 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Airport Signage Board Preview */}
      {showSignagePreview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 p-6 sm:p-8 space-y-6 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  LS
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Let's See Tour & Travels</div>
                  <div className="text-xs text-emerald-700 font-medium">Guwahati, Assam · Northeast DMC</div>
                </div>
              </div>
              <button
                onClick={() => setShowSignagePreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-2 border-emerald-700 rounded-xl p-10 bg-white space-y-5">
              <div className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
                Warm Welcome
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                WELCOME {showSignagePreview.leadGuestName.toUpperCase()} & PARTY
              </div>
              <div className="text-sm font-medium text-slate-600">
                {showSignagePreview.paxCount} Guests · {showSignagePreview.arrivalFlightOrTrain}
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-8 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 block">Tour Code</span>
                  <span className="font-mono font-bold text-emerald-800">{showSignagePreview.tourCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Chauffeur Contact</span>
                  <span className="font-semibold text-slate-900">
                    {showSignagePreview.assignedDriverName || 'Ramen Das'} ({showSignagePreview.assignedDriverPhone || '+91 94350 11982'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Vehicle</span>
                  <span className="font-mono font-semibold text-slate-900">{showSignagePreview.assignedVehiclePlate || 'AS-01-EC-4021'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSignagePreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Placard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Chauffeur Duty Slip Modal */}
      {showDutySlip && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 p-6 space-y-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Chauffeur Duty Slip</h3>
                  <div className="text-xs text-emerald-700 font-mono font-semibold">
                    Slip # DS-{showDutySlip.tourCode.replace('LST-', '')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDutySlip(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-500 block">Chauffeur Name</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{showDutySlip.assignedDriverName || 'Ramen Das'}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Vehicle Registration</span>
                  <div className="font-mono font-bold text-emerald-800 mt-0.5">{showDutySlip.assignedVehiclePlate || 'AS-01-EC-4021'}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Duty Date & Time</span>
                  <div className="font-semibold text-slate-900 mt-0.5 tabular-nums">{showDutySlip.arrivalDate} at {showDutySlip.arrivalTime}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Guest & Pax</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{showDutySlip.leadGuestName} ({showDutySlip.paxCount} Pax)</div>
                </div>
              </div>

              <div className="space-y-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="font-semibold text-slate-900">Pickup Location: </span>
                  <span className="text-slate-700">{showDutySlip.pickupAddress}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Drop Destination: </span>
                  <span className="text-slate-700">{showDutySlip.dropAddress}</span>
                </div>
              </div>

              <div className="text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-1">Chauffeur Instructions</span>
                Maintain clean upholstery and vehicle AC. Collect airport parking slip for company reimbursement. Emergency Operations Desk: {showDutySlip.emergencyContact}.
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
                <div className="border border-dashed border-slate-200 rounded-lg p-4">
                  <span className="text-slate-400 block mb-4">Starting KM & Time</span>
                  <div className="text-slate-300 font-mono">___________ KM</div>
                </div>
                <div className="border border-dashed border-slate-200 rounded-lg p-4">
                  <span className="text-slate-400 block mb-4">Guest Signature</span>
                  <div className="text-slate-300">_____________________</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDutySlip(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Duty Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
