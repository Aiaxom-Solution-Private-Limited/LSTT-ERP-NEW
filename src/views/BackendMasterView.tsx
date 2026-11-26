import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  Building2,
  Truck,
  Receipt,
  ShieldCheck,
  Plus,
  Save,
  FileText,
  Upload,
  Lock,
  Zap,
  X
} from 'lucide-react';
import {
  MasterHotelRecord,
  MasterTransportRecord,
  RateChangeAudit,
  TaxConfiguration,
  DestinationRegion
} from '../types';

export const BackendMasterView: React.FC = () => {
  const {
    masterHotels,
    masterTransports,
    sourcingRules,
    taxConfigs,
    rateAudits,
    integrations,
    saveMasterHotel,
    saveMasterTransport,
    updateTaxConfig,
    requestRateChange,
    approveRateChange,
    updateSourcingRule,
    selectedDepartment,
    currentEmployee,
    packages
  } = useDmc();

  const [activeTab, setActiveTab] = useState<
    'itineraries' | 'hotels' | 'transport' | 'sourcing' | 'tax_rates' | 'integrations'
  >('itineraries');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hotel modal
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<MasterHotelRecord | null>(null);
  const [hotelName, setHotelName] = useState('');
  const [hotelDestination, setHotelDestination] = useState<DestinationRegion>('Meghalaya');
  const [hotelCategory, setHotelCategory] = useState<MasterHotelRecord['category']>('Deluxe (4-Star)');
  const [hotelRoomCategory, setHotelRoomCategory] = useState('Deluxe Valley View');
  const [hotelContractRate, setHotelContractRate] = useState<number>(4500);

  // Transport modal
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<MasterTransportRecord | null>(null);
  const [transCategory, setTransCategory] = useState<MasterTransportRecord['category']>('SUV');
  const [transModel, setTransModel] = useState('Innova Crysta');
  const [transCapacity, setTransCapacity] = useState<number>(6);
  const [transDestination, setTransDestination] = useState<DestinationRegion>('Meghalaya');
  const [transDailyRate, setTransDailyRate] = useState<number>(4500);
  const [transIsOwnFleet, setTransIsOwnFleet] = useState(true);

  // Tax config state
  const activeTaxConfig: TaxConfiguration = taxConfigs[0] || {
    id: 'TAX-001',
    taxName: 'GST on Tour Packages (Inbound & Domestic DMC)',
    ratePct: 5,
    cgstPct: 2.5,
    sgstPct: 2.5,
    igstPct: 5,
    applicableCategory: 'tour_package',
    calculationMethod: 'tax_exclusive',
    effectiveDate: '2026-04-01',
    verifiedByTaxAdvisor: true,
    notes: 'Tour Operator Services under SAC 998555',
    updatedBy: 'Manash Bora',
    updatedAt: '2026-11-01'
  };

  const [editGstRate, setEditGstRate] = useState(activeTaxConfig.ratePct);
  const [editCgst, setEditCgst] = useState(activeTaxConfig.cgstPct);
  const [editSgst, setEditSgst] = useState(activeTaxConfig.sgstPct);
  const [editIgst, setEditIgst] = useState(activeTaxConfig.igstPct);

  // Rate Change Request Modal
  const [showRateChangeModal, setShowRateChangeModal] = useState(false);
  const [serviceType, setServiceType] = useState<RateChangeAudit['serviceType']>('hotel');
  const [serviceName, setServiceName] = useState('');
  const [supplierName] = useState('Hotel Polo Towers Management');
  const [serviceDest] = useState<DestinationRegion>('Meghalaya');
  const [oldRate, setOldRate] = useState<number>(4000);
  const [newProposedRate, setNewProposedRate] = useState<number>(4500);
  const [rateReason, setRateReason] = useState('Peak winter season supplier contract update');

  const isAccountsUser = selectedDepartment === 'accounts' || selectedDepartment === 'executive';

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSaveHotel = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: MasterHotelRecord = {
      id: selectedHotel?.id || `MH-${Date.now()}`,
      hotelName,
      destination: hotelDestination,
      address: `${hotelDestination}, Northeast India`,
      contactPerson: 'Reservations Desk',
      phone: '+91 361 2938102',
      email: 'reservations@hotel.in',
      category: hotelCategory,
      roomCategories: [hotelRoomCategory],
      mealPlans: ['CP', 'MAP'],
      contractRatePerNight: Number(hotelContractRate),
      peakSeasonSurchargePct: 15,
      cancellationPolicy: 'Free cancellation up to 7 days prior to check-in',
      supplierId: selectedHotel?.supplierId || 'SUP-001',
      active: true
    };
    saveMasterHotel(newRecord);
    setShowHotelModal(false);
    setSelectedHotel(null);
  };

  const handleSaveTransport = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: MasterTransportRecord = {
      id: selectedTransport?.id || `MT-${Date.now()}`,
      category: transCategory,
      model: transModel,
      seatingCapacity: Number(transCapacity),
      destination: transDestination,
      isCompanyFleet: transIsOwnFleet,
      internalDailyRate: Number(transDailyRate),
      vendorContractRatePerDay: transIsOwnFleet ? undefined : Number(transDailyRate),
      fuelIncluded: true,
      driverAllowanceIncluded: true,
      active: true
    };
    saveMasterTransport(newRecord);
    setShowTransportModal(false);
    setSelectedTransport(null);
  };

  const handleSaveTaxConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaxConfig(activeTaxConfig.id, {
      ratePct: Number(editGstRate),
      cgstPct: Number(editCgst),
      sgstPct: Number(editSgst),
      igstPct: Number(editIgst),
      updatedBy: currentEmployee?.name || 'Tax Admin',
      updatedAt: new Date().toISOString().split('T')[0]
    });
    notify('GST & Tax configuration updated.');
  };

  const handleRateChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestRateChange({
      serviceType,
      serviceName,
      supplierName,
      destination: serviceDest,
      oldPrice: Number(oldRate),
      newPrice: Number(newProposedRate),
      reasonForChange: rateReason,
      changedBy: currentEmployee?.name || 'Backend Executive',
      approvedByAccounts: ''
    });
    setShowRateChangeModal(false);
    notify('Rate change submitted for Accounts approval.');
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Backend Master & Governance · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Data, Rates & Sourcing Policy
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage master itineraries, contracted hotels, transport catalogs, NE own-fleet sourcing rules, and 5% GST rules.
          </p>
        </div>

        <button
          onClick={() => setShowRateChangeModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors shrink-0"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>Request Rate Change</span>
        </button>
      </div>

      {toastMsg && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clean Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3">
        {[
          { id: 'itineraries', label: 'Master Itineraries', icon: FileText },
          { id: 'hotels', label: 'Hotel Catalog', icon: Building2 },
          { id: 'transport', label: 'Transport Catalog', icon: Truck },
          { id: 'sourcing', label: 'NE Fleet Policy', icon: ShieldCheck },
          { id: 'tax_rates', label: '5% GST & Rate Audit', icon: Receipt },
          { id: 'integrations', label: 'Integrations', icon: Zap }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab 1: Master Itineraries */}
      {activeTab === 'itineraries' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Master Itinerary Library ({packages.length} Templates)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Updates create new template versions and never alter already confirmed bookings.
              </p>
            </div>
            <button
              onClick={() => notify('Master itinerary upload wizard ready.')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Master Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map(pkg => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-emerald-700">
                      PKG-{pkg.id.substring(0, 8)}
                    </span>
                    <span className="text-slate-400">v1.2</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{pkg.name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{pkg.shortSummary}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Duration & Sector</span>
                    <span className="font-semibold text-slate-900">
                      {pkg.days}D/{pkg.nights}N · {pkg.destination}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Approved Rate</span>
                    <span className="font-bold text-emerald-800 tabular-nums">
                      ₹{pkg.standardSellingPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>PDF / DOCX</span>
                  <button
                    onClick={() => notify(`Downloaded Master Itinerary for ${pkg.name}`)}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    Download Master
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 2: Hotel Catalog */}
      {activeTab === 'hotels' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Contracted Hotel Catalog</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Backend manages inventory; contract rate revisions require Accounts approval.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedHotel(null);
                setHotelName('');
                setHotelDestination('Meghalaya');
                setHotelCategory('Deluxe (4-Star)');
                setHotelRoomCategory('Deluxe Room');
                setHotelContractRate(4500);
                setShowHotelModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hotel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Hotel Name</th>
                  <th className="py-3.5 px-6">Destination</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Rooms & Plans</th>
                  <th className="py-3.5 px-6">Contract Rate</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {masterHotels.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{h.hotelName}</td>
                    <td className="py-4 px-6 text-slate-600">{h.destination}</td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{h.category}</td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900">{h.roomCategories.join(', ')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{h.mealPlans.join(' / ')}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-800 tabular-nums">
                      ₹{h.contractRatePerNight.toLocaleString('en-IN')} / night
                    </td>
                    <td className="py-4 px-6 font-semibold text-emerald-700">Active</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedHotel(h);
                          setHotelName(h.hotelName);
                          setHotelDestination(h.destination);
                          setHotelCategory(h.category);
                          setHotelRoomCategory(h.roomCategories[0] || 'Deluxe Room');
                          setHotelContractRate(h.contractRatePerNight);
                          setShowHotelModal(true);
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Transport Catalog */}
      {activeTab === 'transport' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Transport Catalog & Fleet Costing</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Company-owned fleet defaults for Northeast India; external vendors outside NE routes.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTransport(null);
                setTransCategory('SUV');
                setTransModel('Toyota Fortuner');
                setTransCapacity(6);
                setTransDestination('Meghalaya');
                setTransDailyRate(6500);
                setTransIsOwnFleet(true);
                setShowTransportModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle Category</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Vehicle Model</th>
                  <th className="py-3.5 px-6">Capacity</th>
                  <th className="py-3.5 px-6">Sector</th>
                  <th className="py-3.5 px-6">Sourcing</th>
                  <th className="py-3.5 px-6">Daily Rate</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {masterTransports.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{t.model} ({t.category})</td>
                    <td className="py-4 px-6 tabular-nums">{t.seatingCapacity} Pax</td>
                    <td className="py-4 px-6 text-slate-600">{t.destination}</td>
                    <td className="py-4 px-6">
                      <span className={`font-semibold ${t.isCompanyFleet ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {t.isCompanyFleet ? 'Company Own Fleet' : 'External Vendor'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 tabular-nums">
                      ₹{t.internalDailyRate.toLocaleString('en-IN')} / day
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedTransport(t);
                          setTransCategory(t.category);
                          setTransModel(t.model);
                          setTransCapacity(t.seatingCapacity);
                          setTransDestination(t.destination);
                          setTransDailyRate(t.internalDailyRate);
                          setTransIsOwnFleet(t.isCompanyFleet);
                          setShowTransportModal(true);
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 4: Northeast Fleet Sourcing Rules */}
      {activeTab === 'sourcing' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Northeast India Company Fleet Policy</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                For tours in Assam, Meghalaya, Arunachal Pradesh, and Northeast sectors, company-owned fleet vehicles are enforced by default. External hiring requires an admin exception toggle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sourcingRules.map(rule => (
              <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{rule.destination}</span>
                  <span className={`text-xs font-semibold uppercase ${
                    rule.defaultTransportSource === 'own_fleet' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {rule.defaultTransportSource.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Northeast Territory</span>
                    <span className="font-semibold text-slate-900">
                      {rule.isNortheastIndia ? 'Yes (Own Fleet Default)' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>External Vendor Exception</span>
                    <span className="font-semibold text-slate-900">
                      {rule.allowExternalVendorException ? 'Allowed' : 'Strict Policy'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Approval Required</span>
                    <span className="font-semibold text-slate-900">
                      {rule.requiresAdminApprovalForExternal ? 'Operations Head' : 'None'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Peak overflow override</span>
                  <button
                    onClick={() => updateSourcingRule(rule.id, { allowExternalVendorException: !rule.allowExternalVendorException })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      rule.allowExternalVendorException
                        ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                        : 'text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    {rule.allowExternalVendorException ? 'Revoke Exception' : 'Allow 3P Exception'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 5: 5% GST & Rate Audits */}
      {activeTab === 'tax_rates' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">GST Configuration (Tour Packages)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  SAC 998555: Tour Operator Services baseline is 5% without input tax credit.
                </p>
              </div>
              <button
                onClick={handleSaveTaxConfig}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Tax Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Total Package GST (%)</label>
                <input
                  type="number"
                  value={editGstRate}
                  onChange={(e) => setEditGstRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">CGST Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editCgst}
                  onChange={(e) => setEditCgst(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">SGST Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editSgst}
                  onChange={(e) => setEditSgst(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">IGST Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editIgst}
                  onChange={(e) => setEditIgst(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base">Rate Change Audit Trail & Approvals</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supplier contract rate changes require Accounts sign-off before entering costing formulas.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Service</th>
                    <th className="py-3.5 px-6">Old Rate</th>
                    <th className="py-3.5 px-6">Proposed Rate</th>
                    <th className="py-3.5 px-6">Requested By</th>
                    <th className="py-3.5 px-6">Reason</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Accounts Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {rateAudits.map(audit => (
                    <tr key={audit.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{audit.serviceName}</div>
                        <div className="text-xs text-slate-500 capitalize mt-0.5">
                          {audit.serviceType} · {audit.destination}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 tabular-nums">
                        ₹{audit.oldPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 tabular-nums">
                        ₹{audit.newPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">{audit.changedBy}</td>
                      <td className="py-4 px-6 text-slate-600 max-w-xs">{audit.reasonForChange}</td>
                      <td className="py-4 px-6">
                        <span className={`font-semibold capitalize ${
                          audit.status === 'approved'
                            ? 'text-emerald-700'
                            : audit.status === 'rejected'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}>
                          {audit.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {audit.status === 'pending_accounts_approval' && isAccountsUser ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approveRateChange(audit.id, false, currentEmployee?.name || 'Accounts Head')}
                              className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => approveRateChange(audit.id, true, currentEmployee?.name || 'Accounts Head')}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {audit.approvedByAccounts ? `Signed by ${audit.approvedByAccounts}` : 'Pending'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 6: External Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {integrations.map(integ => (
            <div key={integ.id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{integ.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">{integ.provider}</span>
                  </div>
                  <span className={`text-xs font-semibold capitalize ${
                    integ.status === 'configured' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {integ.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{integ.estimatedCost}</p>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Setup Checklist</div>
                  {integ.setupGuide.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-700 font-mono font-semibold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Connectivity check</span>
                <button
                  onClick={() => notify(`Ping OK for ${integ.name} (${integ.provider})`)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-800 font-semibold rounded-lg"
                >
                  Test Connection
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotel Add/Edit Modal */}
      {showHotelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {selectedHotel ? 'Edit Contracted Hotel' : 'Add Contracted Hotel'}
              </h3>
              <button onClick={() => setShowHotelModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveHotel} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Hotel Name</label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Sector</label>
                  <select
                    value={hotelDestination}
                    onChange={(e) => setHotelDestination(e.target.value as DestinationRegion)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Kaziranga">Kaziranga</option>
                    <option value="Tawang">Tawang</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Bhutan">Bhutan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Category</label>
                  <select
                    value={hotelCategory}
                    onChange={(e) => setHotelCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Standard (3-Star)">Standard (3-Star)</option>
                    <option value="Deluxe (4-Star)">Deluxe (4-Star)</option>
                    <option value="Luxury (5-Star)">Luxury (5-Star)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Room Type</label>
                  <input
                    type="text"
                    value={hotelRoomCategory}
                    onChange={(e) => setHotelRoomCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Rate / Night (INR)</label>
                  <input
                    type="number"
                    value={hotelContractRate}
                    onChange={(e) => setHotelContractRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowHotelModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg">
                  Save Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transport Add/Edit Modal */}
      {showTransportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {selectedTransport ? 'Edit Transport Category' : 'Add Vehicle Category'}
              </h3>
              <button onClick={() => setShowTransportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTransport} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Vehicle Model</label>
                  <input
                    type="text"
                    value={transModel}
                    onChange={(e) => setTransModel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Seating Capacity</label>
                  <input
                    type="number"
                    value={transCapacity}
                    onChange={(e) => setTransCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Sector</label>
                  <select
                    value={transDestination}
                    onChange={(e) => setTransDestination(e.target.value as DestinationRegion)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Kaziranga">Kaziranga</option>
                    <option value="Tawang">Tawang</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Bhutan">Bhutan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Daily Rate (INR)</label>
                  <input
                    type="number"
                    value={transDailyRate}
                    onChange={(e) => setTransDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={transIsOwnFleet}
                  onChange={(e) => setTransIsOwnFleet(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                <span>Company-owned fleet vehicle</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowTransportModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg">
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate Change Request Modal */}
      {showRateChangeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">Request Supplier Rate Change</h3>
              </div>
              <button
                onClick={() => setShowRateChangeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRateChangeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Service Category</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                >
                  <option value="hotel">Hotel Accommodation</option>
                  <option value="transport">Transportation / Vehicle</option>
                  <option value="activity">Activity / Safari / Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Supplier / Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Hotel Polo Towers Executive Suite"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Current Rate (INR)</label>
                  <input
                    type="number"
                    value={oldRate}
                    onChange={(e) => setOldRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Proposed Rate (INR)</label>
                  <input
                    type="number"
                    value={newProposedRate}
                    onChange={(e) => setNewProposedRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Justification</label>
                <textarea
                  value={rateReason}
                  onChange={(e) => setRateReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 h-20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRateChangeModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
