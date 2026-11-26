import React, { useState, useMemo, useRef } from 'react';
import { useDmc } from '../context/DmcContext';
import { CustomQuotationBuilder } from '../components/CustomQuotationBuilder';
import {
  LeadEnquiry,
  LeadStage,
  LeadSource,
  DestinationRegion,
  ItineraryDay,
  TourPackage,
  Quotation
} from '../types';
import {
  Plus,
  Search,
  MapPin,
  ArrowLeft,
  Upload,
  Inbox,
  Pencil,
  Calendar,
  Users,
  User,
  Phone,
  Mail,
  MessageSquare,
  Info,
  X,
  Check,
  MoreVertical,
  ArrowRight,
  Sparkles,
  Car,
  Ticket,
  Share2,
  MessageCircle,
  Printer,
  Building2,
  CheckCircle2,
  Send
} from 'lucide-react';

interface CrmLeadsViewProps {
  onNavigateToCostingWithLead?: (lead: LeadEnquiry, itineraryData?: any) => void;
}

type ViewMode = 'list' | 'new_query' | 'detail';

const AVAILABLE_TAGS = [
  'Enquiry',
  'Honeymoon',
  'Family',
  'Corporate',
  'VIP',
  'Group',
  'Luxury',
  'Urgent',
  'B2B Priority'
];

const DESTINATIONS: DestinationRegion[] = [
  'Meghalaya',
  'Assam',
  'Arunachal Pradesh',
  'Sikkim & Darjeeling',
  'Nagaland & Manipur',
  'Bhutan',
  'Nepal',
  'Thailand',
  'Vietnam',
  'Central Asia',
  'Other'
];

const DIRECT_SOURCES: LeadSource[] = [
  'Website',
  'WhatsApp',
  'Email',
  'Google Ads',
  'Meta Ads',
  'Referral',
  'Walk-in',
  'Corporate'
];

const STAGES: LeadStage[] = [
  'New Enquiry',
  'Assigned',
  'Contacted',
  'Requirement Understood',
  'Itinerary Preparation',
  'Costing',
  'Quotation Sent',
  'Follow-up',
  'Negotiation',
  'Revision Requested',
  'Awaiting Confirmation',
  'Confirmation Received',
  'Won',
  'Lost',
  'On Hold'
];

function addDaysToDateStr(dateStr: string, nights: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + Math.max(1, nights));
  return d.toISOString().substring(0, 10);
}

function formatReadableDate(dateStr: string): string {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function deriveCityNightsFromItinerary(days: ItineraryDay[]): Array<{ city: string; nights: number }> {
  const stays: Array<{ city: string; nights: number }> = [];
  days.forEach((day, idx) => {
    const isLast = idx === days.length - 1;
    if (isLast && !day.hotelName && !day.hotelCity) return;
    const city = (day.hotelCity || day.endLocation || '').trim();
    if (!city) return;
    const last = stays[stays.length - 1];
    if (last && last.city.toLowerCase() === city.toLowerCase()) {
      last.nights += 1;
    } else {
      stays.push({ city, nights: 1 });
    }
  });
  return stays;
}

export const CrmLeadsView: React.FC<CrmLeadsViewProps> = ({ onNavigateToCostingWithLead }) => {
  const {
    leads,
    agents,
    packages,
    quotations,
    employees,
    currentEmployee,
    createLead,
    updateLead,
    sendInternalMessage,
    sendItinerary,
    setPrintableDocument,
    setSelectedTourCode
  } = useDmc();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinationFilter, setSelectedDestinationFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // ============================================
  // NEW QUERY FORM STATE (matching user reference)
  // ============================================
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Section 1: Query Source
  const [querySourceInput, setQuerySourceInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [selectedSourceType, setSelectedSourceType] = useState<LeadSource>('B2B Agent');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [sourceTouched, setSourceTouched] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [salesAssignee, setSalesAssignee] = useState<string>(currentEmployee.name);
  const [editingSalesAssignee, setEditingSalesAssignee] = useState(false);
  const [tags, setTags] = useState<string[]>(['Enquiry']);
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Section 2: Destination and Duration
  const [formDestination, setFormDestination] = useState<DestinationRegion>('Meghalaya');
  const [formStartDate, setFormStartDate] = useState('2026-12-22');
  const [formNights, setFormNights] = useState<number>(5);
  const [formAdults, setFormAdults] = useState<number>(2);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [focCount, setFocCount] = useState<number>(0);

  // Section 3: Guest Details
  const [salutation, setSalutation] = useState('');
  const [guestName, setGuestName] = useState('');
  const [countryCode, setCountryCode] = useState('91-IN');
  const [phone, setPhone] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [showEmailField, setShowEmailField] = useState(false);
  const [email, setEmail] = useState('');
  const [showCityField, setShowCityField] = useState(false);
  const [guestCity, setGuestCity] = useState('');

  // Section 4: Comments or Notes
  const [comments, setComments] = useState('');

  // ============================================
  // DETAIL VIEW STATE
  // ============================================
  const [editingDetailTags, setEditingDetailTags] = useState(false);
  const [detailTagInput, setDetailTagInput] = useState('');
  const [editingDetailSalesTeam, setEditingDetailSalesTeam] = useState(false);
  const [showDetailActionsMenu, setShowDetailActionsMenu] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [cardTabs, setCardTabs] = useState<Record<string, 'itinerary' | 'hotels' | 'details'>>({});

  // Custom Quotation Mode (opens CustomQuotationBuilder in-place inside Trip Details)
  const [quotationMode, setQuotationMode] = useState<'none' | 'create_custom' | 'from_package'>('none');
  const [seedPackageForQuote, setSeedPackageForQuote] = useState<TourPackage | null>(null);

  // Inline Request Package Form
  const [showRequestPackageForm, setShowRequestPackageForm] = useState(false);
  const [packageRequestNotes, setPackageRequestNotes] = useState('');
  const [packageRequestSentId, setPackageRequestSentId] = useState<string | null>(null);

  const salesTeamMembers = useMemo(() => {
    const filtered = employees.filter(e => e.department === 'sales' || e.department === 'executive');
    return filtered.length > 0 ? filtered : employees;
  }, [employees]);

  const activeLead = useMemo(
    () => leads.find(l => l.id === activeLeadId) || null,
    [leads, activeLeadId]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.clientName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        (l.referenceId && l.referenceId.toLowerCase().includes(q)) ||
        l.contactPerson.toLowerCase().includes(q) ||
        (l.sourceDetail && l.sourceDetail.toLowerCase().includes(q)) ||
        (l.confirmedTourCode && l.confirmedTourCode.toLowerCase().includes(q));
      const matchesDest = selectedDestinationFilter === 'all' || l.destination === selectedDestinationFilter;
      const matchesStage = selectedStageFilter === 'all' || l.stage === selectedStageFilter;
      return matchesSearch && matchesDest && matchesStage;
    });
  }, [leads, searchQuery, selectedDestinationFilter, selectedStageFilter]);

  // Existing tourist profile matches in Section 3
  const existingProfileMatches = useMemo(() => {
    const nameQ = guestName.trim().toLowerCase();
    const phoneQ = phone.replace(/\D/g, '');
    const emailQ = email.trim().toLowerCase();

    if (!nameQ && phoneQ.length < 4 && !emailQ) return [];

    return leads.filter(l => {
      const matchName = nameQ.length >= 2 && (
        l.contactPerson.toLowerCase().includes(nameQ) ||
        l.clientName.toLowerCase().includes(nameQ)
      );
      const matchPhone = phoneQ.length >= 4 && l.phone.replace(/\D/g, '').includes(phoneQ);
      const matchEmail = emailQ.length >= 3 && l.email.toLowerCase().includes(emailQ);
      return matchName || matchPhone || matchEmail;
    }).slice(0, 3);
  }, [leads, guestName, phone, email]);

  // Source search suggestions (B2B Agents + Direct Sources)
  const sourceSuggestions = useMemo(() => {
    const q = querySourceInput.trim().toLowerCase();
    const agentOpts = agents.map(a => ({
      kind: 'agent' as const,
      id: a.id,
      label: a.companyName,
      sub: `B2B Agent · ${a.city} · ${a.contactPerson}`,
      source: 'B2B Agent' as LeadSource
    }));
    const directOpts = DIRECT_SOURCES.map(src => ({
      kind: 'direct' as const,
      id: src,
      label: src,
      sub: 'Direct / Inbound Channel',
      source: src
    }));
    const combined = [...agentOpts, ...directOpts];
    if (!q) return combined;
    return combined.filter(
      opt => opt.label.toLowerCase().includes(q) || opt.sub.toLowerCase().includes(q)
    );
  }, [agents, querySourceInput]);

  const resetNewQueryForm = () => {
    setQuerySourceInput('');
    setSelectedAgentId(undefined);
    setSelectedSourceType('B2B Agent');
    setSourceTouched(false);
    setReferenceId('');
    setSalesAssignee(currentEmployee.name);
    setEditingSalesAssignee(false);
    setTags(['Enquiry']);
    setTagInput('');
    setFormDestination('Meghalaya');
    setFormStartDate('2026-12-22');
    setFormNights(5);
    setFormAdults(2);
    setChildAges([]);
    setFocCount(0);
    setSalutation('');
    setGuestName('');
    setCountryCode('91-IN');
    setPhone('');
    setAdditionalPhones([]);
    setShowEmailField(false);
    setEmail('');
    setShowCityField(false);
    setGuestCity('');
    setComments('');
  };

  const openNewQueryForm = () => {
    resetNewQueryForm();
    setViewMode('new_query');
  };

  const openLeadDetail = (leadId: string) => {
    setActiveLeadId(leadId);
    setQuotationMode('none');
    setSeedPackageForQuote(null);
    setShowRequestPackageForm(false);
    setPackageRequestSentId(null);
    setEditingDetailTags(false);
    setEditingDetailSalesTeam(false);
    setShowDetailActionsMenu(false);
    setViewMode('detail');
  };

  const handleSelectSourceOption = (opt: {
    kind: 'agent' | 'direct';
    id: string;
    label: string;
    source: LeadSource;
  }) => {
    setQuerySourceInput(opt.label);
    setSelectedSourceType(opt.source);
    setSelectedAgentId(opt.kind === 'agent' ? opt.id : undefined);
    setShowSourceDropdown(false);
    setSourceTouched(false);
  };

  const handleSaveNewQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSource = querySourceInput.trim();
    if (!trimmedSource) {
      setSourceTouched(true);
      return;
    }

    const matchedAgent = selectedAgentId
      ? agents.find(a => a.id === selectedAgentId)
      : agents.find(a => a.companyName.toLowerCase() === trimmedSource.toLowerCase());

    const isDirectKnown = DIRECT_SOURCES.some(
      s => s.toLowerCase() === trimmedSource.toLowerCase()
    );

    const resolvedSource: LeadSource = matchedAgent
      ? 'B2B Agent'
      : isDirectKnown
      ? (DIRECT_SOURCES.find(s => s.toLowerCase() === trimmedSource.toLowerCase()) || 'Website')
      : selectedSourceType;

    const fullGuestName = [salutation.trim(), guestName.trim()].filter(Boolean).join(' ');
    const displayClientName = fullGuestName || trimmedSource;
    const nightsVal = Math.max(1, formNights || 1);
    const daysVal = nightsVal + 1;
    const endDate = addDaysToDateStr(formStartDate, nightsVal);

    const cleanPhone = phone.trim()
      ? (phone.trim().startsWith('+') ? phone.trim() : `+${countryCode.split('-')[0]} ${phone.trim()}`)
      : matchedAgent?.phone || '+91 98000 00000';

    const newLeadId = createLead({
      leadDate: new Date().toISOString().substring(0, 10),
      referenceId: referenceId.trim() || undefined,
      tags: tags.length > 0 ? tags : ['Enquiry'],
      source: resolvedSource,
      sourceDetail: trimmedSource,
      agentId: matchedAgent?.id,
      salutation: salutation.trim() || undefined,
      clientName: displayClientName,
      contactPerson: guestName.trim() || 'N/A',
      countryCode,
      phone: cleanPhone,
      additionalPhones: additionalPhones.filter(Boolean),
      email: email.trim() || matchedAgent?.email || 'guest@example.com',
      guestCity: guestCity.trim() || undefined,
      destination: formDestination,
      travelStartDate: formStartDate,
      travelEndDate: endDate,
      nights: nightsVal,
      days: daysVal,
      flexibleDates: false,
      adults: Math.max(1, formAdults || 1),
      children: childAges.length,
      childAges,
      infants: 0,
      focCount: Math.max(0, focCount || 0),
      roomCount: Math.max(1, Math.ceil((formAdults || 1) / 2)),
      hotelCategoryPreference: 'Deluxe (4-Star)',
      transportPreference: 'SUV (Innova)',
      assignedTo: salesAssignee || currentEmployee.name,
      createdBy: currentEmployee.name,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      stage: 'New Enquiry',
      priority: 'High',
      notes: comments.trim()
    });

    setBannerMessage(`Query ${newLeadId} created by ${currentEmployee.name}.`);
    openLeadDetail(newLeadId);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const lines = content
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        setBannerMessage('CSV uploaded, but no query rows were found after the header row.');
        return;
      }
      let importedCount = 0;
      let lastCreatedId: string | null = null;
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) return;
        const [csvSource, csvDest, csvGuest, csvPhone, csvNights, csvAdults, csvNotes] = cols;
        const nightsNum = parseInt(csvNights || '4', 10) || 4;
        const adultsNum = parseInt(csvAdults || '2', 10) || 2;
        const matchedDest = DESTINATIONS.find(
          d => d.toLowerCase() === (csvDest || '').toLowerCase()
        ) || 'Meghalaya';
        const id = createLead({
          leadDate: new Date().toISOString().substring(0, 10),
          tags: ['Enquiry', 'CSV Import'],
          source: 'B2B Agent',
          sourceDetail: csvSource || 'CSV Partner Upload',
          clientName: csvGuest || csvSource || 'CSV Query',
          contactPerson: csvGuest || 'N/A',
          phone: csvPhone || '+91 98000 00000',
          email: 'bookings@letsseetourandtravels.com',
          destination: matchedDest,
          travelStartDate: formStartDate,
          travelEndDate: addDaysToDateStr(formStartDate, nightsNum),
          nights: nightsNum,
          days: nightsNum + 1,
          flexibleDates: false,
          adults: adultsNum,
          children: 0,
          infants: 0,
          roomCount: Math.max(1, Math.ceil(adultsNum / 2)),
          hotelCategoryPreference: 'Deluxe (4-Star)',
          transportPreference: 'SUV (Innova)',
          assignedTo: currentEmployee.name,
          createdBy: currentEmployee.name,
          stage: 'New Enquiry',
          priority: 'Medium',
          notes: csvNotes || `Imported via CSV (${file.name})`
        });
        lastCreatedId = id;
        importedCount += 1;
      });
      if (importedCount > 0) {
        setBannerMessage(`Imported ${importedCount} queries from ${file.name}.`);
        if (lastCreatedId && importedCount === 1) {
          openLeadDetail(lastCreatedId);
        } else {
          setViewMode('list');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Suggested itineraries for active query
  const suggestedPackages = useMemo(() => {
    if (!activeLead) return [];
    const matchingDest = packages.filter(
      p => p.active && p.destination.toLowerCase() === activeLead.destination.toLowerCase()
    );
    const sortedMatching = [...matchingDest].sort(
      (a, b) => Math.abs(a.nights - activeLead.nights) - Math.abs(b.nights - activeLead.nights)
    );
    if (showAllPackages || sortedMatching.length === 0) {
      const others = packages.filter(
        p => p.active && p.destination.toLowerCase() !== activeLead.destination.toLowerCase()
      );
      return [...sortedMatching, ...others];
    }
    return sortedMatching;
  }, [activeLead, packages, showAllPackages]);

  const handleOpenCustomQuotation = (pkg?: TourPackage | null) => {
    setSeedPackageForQuote(pkg || null);
    setQuotationMode(pkg ? 'from_package' : 'create_custom');
    setShowRequestPackageForm(false);
  };

  const handleSubmitPackageRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    const msgId = sendInternalMessage({
      senderEmployeeId: currentEmployee.id,
      senderName: currentEmployee.name,
      senderLogin: currentEmployee.loginId,
      senderDepartment: currentEmployee.department,
      targetDepartment: 'backend',
      message: `[Package Request · ${activeLead.destination} ${activeLead.nights}N/${activeLead.days}D · ${activeLead.clientName}] ${
        packageRequestNotes.trim() ||
        `Please prepare a contracted package & net rates for Query ${activeLead.id} (${activeLead.adults} Adults${activeLead.children ? `, ${activeLead.children} Children` : ''}, ${activeLead.hotelCategoryPreference}).`
      }`,
      linkedType: 'enquiry_id',
      linkedId: activeLead.id,
      isActionableTask: true
    });
    setPackageRequestSentId(msgId);
    setPackageRequestNotes('');
    setShowRequestPackageForm(false);
    setBannerMessage(`Package request (${msgId}) sent to Backend Contracting team.`);
  };

  const handleQuickShareQuotation = (quote: Quotation, channel: 'Email' | 'WhatsApp') => {
    if (!activeLead) return;
    const latestRev = quote.revisions[quote.revisions.length - 1];
    if (!latestRev) return;
    const recipient = channel === 'Email' ? activeLead.email : activeLead.phone;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);
    const shareText = [
      `Quotation ${latestRev.versionCode} — Let's See Tour & Travels Pvt. Ltd.`,
      `Client: ${activeLead.clientName} | ${activeLead.destination} (${activeLead.nights}N/${activeLead.days}D)`,
      `Total Quoted Price: ₹${latestRev.finalSellingPrice.toLocaleString('en-IN')} (₹${Math.round(latestRev.finalSellingPrice / Math.max(1, quote.paxCount)).toLocaleString('en-IN')}/pax)`,
      `Itinerary:`,
      ...(latestRev.itinerarySnapshot || []).map(
        d => `Day ${d.dayNumber}: ${d.title} (${d.mealsIncluded.join(', ') || 'No meals'}${d.hotelName ? ` | Stay: ${d.hotelName}` : ''})`
      )
    ].join('\n');

    const shareId = sendItinerary({
      enquiryId: activeLead.id,
      clientName: activeLead.clientName,
      recipientEmailOrPhone: recipient,
      channel,
      salespersonId: currentEmployee.id,
      salespersonLogin: currentEmployee.loginId,
      salespersonName: currentEmployee.name,
      itineraryId: activeLead.selectedItinerary?.packageId || quote.id,
      itineraryVersion: latestRev.version,
      quotationId: quote.id,
      quotationVersionCode: latestRev.versionCode,
      destination: activeLead.destination,
      travelDates: `${activeLead.travelStartDate} to ${activeLead.travelEndDate}`,
      guestCount: quote.paxCount,
      quotedAmount: latestRev.finalSellingPrice,
      followUpDate: tomorrow,
      enquiryStatus: 'Quotation Sent',
      itinerarySnapshot: latestRev.itinerarySnapshot || [],
      messageBody: shareText
    });

    setBannerMessage(
      `Quotation ${latestRev.versionCode} shared via ${channel} to ${recipient} (Ref: ${shareId}) & Follow-up scheduled.`
    );
  };

  // =========================================================================
  // VIEW 1: NEW QUERY FORM (Matching user screenshot 1 & 2 in Pure Green & White)
  // =========================================================================
  if (viewMode === 'new_query') {
    const showSourceError = sourceTouched && !querySourceInput.trim();

    return (
      <div className="space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
              title="Back to Queries"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">New Query</h1>
              <span className="text-slate-300">|</span>
              <nav className="text-xs text-slate-500 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="hover:text-emerald-700 transition-colors"
                >
                  Trips
                </button>
                <span>›</span>
                <span className="text-slate-800 font-medium">New Query</span>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Via CSV</span>
            </button>
          </div>
        </div>

        {/* Pure White Multi-Section Card */}
        <form
          onSubmit={handleSaveNewQuery}
          className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100"
        >
          {/* SECTION 1: QUERY SOURCE */}
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Inbox className="w-4 h-4 text-emerald-700" />
                <span>Query Source</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Please specify the query source, e.g., whether it came via B2B or from another source.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-5">
              {/* Query Source Searchable Field */}
              <div className="relative max-w-md">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Query Source *
                </label>
                <input
                  type="text"
                  value={querySourceInput}
                  onFocus={() => setShowSourceDropdown(true)}
                  onBlur={() => {
                    setSourceTouched(true);
                    setTimeout(() => setShowSourceDropdown(false), 180);
                  }}
                  onChange={(e) => {
                    setQuerySourceInput(e.target.value);
                    setSelectedAgentId(undefined);
                    setShowSourceDropdown(true);
                  }}
                  placeholder="Type to search B2B agent or channel (e.g. Sachin International)..."
                  className={`w-full px-3.5 py-2 bg-white rounded-lg text-xs text-slate-900 outline-none border transition-colors ${
                    showSourceError
                      ? 'border-rose-500 focus:border-rose-600'
                      : 'border-slate-200 focus:border-emerald-700'
                  }`}
                />
                {showSourceError && (
                  <div className="mt-1.5 inline-block px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold">
                    Query Source is required
                  </div>
                )}

                {showSourceDropdown && sourceSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {sourceSuggestions.map(opt => (
                      <button
                        key={`${opt.kind}-${opt.id}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSourceOption(opt);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition-colors"
                      >
                        <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                        <div className="text-xs text-slate-500">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference ID & Sales Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Reference ID <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="e.g. 4333785"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700 font-mono"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">
                    A custom ID for your reference regarding the query
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Sales Team
                  </label>
                  {!editingSalesAssignee ? (
                    <button
                      type="button"
                      onClick={() => setEditingSalesAssignee(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-600 rounded-lg text-xs font-semibold text-emerald-700 transition-colors"
                    >
                      <span>
                        {salesAssignee === currentEmployee.name
                          ? `You (${currentEmployee.name})`
                          : salesAssignee}
                      </span>
                      <Pencil className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <select
                      value={salesAssignee}
                      onChange={(e) => {
                        setSalesAssignee(e.target.value);
                        setEditingSalesAssignee(false);
                      }}
                      onBlur={() => setEditingSalesAssignee(false)}
                      autoFocus
                      className="w-full px-3 py-2 bg-white border border-emerald-700 rounded-lg text-xs font-medium text-slate-900 outline-none"
                    >
                      {salesTeamMembers.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} ({emp.roleTitle})
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="text-xs text-slate-400 mt-1 block">
                    Created by: {currentEmployee.name}
                  </span>
                </div>
              </div>

              {/* Tags (optional) */}
              <div className="max-w-md relative">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tags <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={tagInput}
                  onFocus={() => setShowTagDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTagDropdown(false), 180)}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      const next = tagInput.trim();
                      if (!tags.includes(next)) setTags([...tags, next]);
                      setTagInput('');
                    }
                  }}
                  placeholder="Search & select tag(s)..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
                />
                {showTagDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {AVAILABLE_TAGS.filter(
                      t => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
                    ).map(t => (
                      <button
                        key={t}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTags(prev => [...prev, t]);
                          setTagInput('');
                          setShowTagDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 font-medium"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: DESTINATION AND DURATION */}
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Destination and Duration</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Please provide basic details such as destination, duration etc. along with number of adults and children with ages.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Destinations *
                  </label>
                  <select
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value as DestinationRegion)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-emerald-700"
                  >
                    {DESTINATIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    No. of Nights
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formNights}
                    onChange={(e) => setFormNights(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700 tabular-nums font-semibold"
                  />
                  <span className="text-xs text-slate-500 mt-1 block font-medium tabular-nums">
                    {formNights} {formNights === 1 ? 'Night' : 'Nights'}, {formNights + 1} Days
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    No. of Adults
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formAdults}
                    onChange={(e) => setFormAdults(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700 tabular-nums font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Add Children and their Ages
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildAges(prev => [...prev, 6])}
                      className="w-9 h-8 rounded-lg border border-slate-200 hover:border-emerald-600 bg-white flex items-center justify-center text-emerald-700 transition-colors"
                      title="Add Child"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {childAges.map((age, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 border border-slate-200 rounded-lg bg-white text-xs"
                      >
                        <span className="text-slate-500">Ch {idx + 1}:</span>
                        <input
                          type="number"
                          min={0}
                          max={17}
                          value={age}
                          onChange={(e) => {
                            const next = [...childAges];
                            next[idx] = Math.min(17, Math.max(0, parseInt(e.target.value, 10) || 0));
                            setChildAges(next);
                          }}
                          className="w-10 text-center border-b border-slate-200 outline-none font-semibold text-slate-900 tabular-nums"
                        />
                        <span className="text-slate-400">yrs</span>
                        <button
                          type="button"
                          onClick={() => setChildAges(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                    <span>Total FOC</span>
                    <span title="Free of cost travellers (e.g. Tour Escort)">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={focCount}
                    onChange={(e) => setFocCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700 tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: GUEST DETAILS */}
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Guest Details</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Please provide name and phone number(s).
              </p>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Salutation
                  </label>
                  <input
                    type="text"
                    list="salutation-options"
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    placeholder="e.g. Mr."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
                  />
                  <datalist id="salutation-options">
                    <option value="Mr." />
                    <option value="Ms." />
                    <option value="Mrs." />
                    <option value="Dr." />
                    <option value="Prof." />
                  </datalist>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Anoop Rai"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Phone Number(s)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-700 bg-white">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-2.5 py-2 bg-white border-r border-slate-200 text-xs font-medium text-slate-700 outline-none"
                    >
                      <option value="91-IN">91-IN</option>
                      <option value="975-BT">975-BT</option>
                      <option value="977-NP">977-NP</option>
                      <option value="66-TH">66-TH</option>
                      <option value="1-US">1-US</option>
                      <option value="44-UK">44-UK</option>
                    </select>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 98640 12345"
                      className="px-3 py-2 text-xs text-slate-900 outline-none w-44 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdditionalPhones(prev => [...prev, ''])}
                    className="w-9 h-9 rounded-lg border border-slate-200 hover:border-emerald-600 bg-white flex items-center justify-center text-emerald-700 transition-colors"
                    title="Add Secondary Phone Number"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmailField(v => !v)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                      showEmailField || email
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-emerald-700 hover:border-emerald-600'
                    }`}
                    title="Add Guest Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCityField(v => !v)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                      showCityField || guestCity
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-emerald-700 hover:border-emerald-600'
                    }`}
                    title="Add Guest City"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>

                {/* Extra phone inputs if added */}
                {additionalPhones.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {additionalPhones.map((ap, idx) => (
                      <div key={idx} className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <input
                          type="text"
                          value={ap}
                          onChange={(e) => {
                            const copy = [...additionalPhones];
                            copy[idx] = e.target.value;
                            setAdditionalPhones(copy);
                          }}
                          placeholder={`Alt Phone ${idx + 1}`}
                          className="px-3 py-1.5 text-xs font-mono text-slate-900 outline-none w-40"
                        />
                        <button
                          type="button"
                          onClick={() => setAdditionalPhones(prev => prev.filter((_, i) => i !== idx))}
                          className="px-2 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(showEmailField || showCityField) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    {showEmailField && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Guest Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="guest@example.com"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
                        />
                      </div>
                    )}
                    {showCityField && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Origin City</label>
                        <input
                          type="text"
                          value={guestCity}
                          onChange={(e) => setGuestCity(e.target.value)}
                          placeholder="e.g. Mumbai / Kolkata"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Existing Tourist Profile Check Banner */}
              <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {existingProfileMatches.length > 0
                      ? `Found ${existingProfileMatches.length} matching existing profile(s):`
                      : 'Enter a name, phone number or email address to check for existing tourist profiles.'}
                  </span>
                </div>
                {existingProfileMatches.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {existingProfileMatches.map(match => (
                      <div key={match.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-800">
                          {match.clientName} · <span className="font-mono text-slate-500">{match.phone}</span> ({match.destination})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setGuestName(match.contactPerson || match.clientName);
                            setPhone(match.phone);
                            setEmail(match.email);
                            setShowEmailField(true);
                          }}
                          className="text-emerald-700 font-semibold hover:underline shrink-0"
                        >
                          Use profile
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: COMMENTS OR NOTES */}
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span>Comments or Notes</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Please provide any comments or notes regarding this query which may be useful for sales process.
              </p>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Comments <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Only 5 star hotels, elderly passengers, honeymoon decor, etc."
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Form Footer Actions */}
          <div className="px-6 py-4 bg-white flex items-center justify-start lg:justify-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Save Details
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TRIP DETAILS (Matching user screenshot 3 + Suggested & Custom Itinerary)
  // =========================================================================
  if (viewMode === 'detail' && activeLead) {
    const linkedAgent = activeLead.agentId ? agents.find(a => a.id === activeLead.agentId) : null;
    const sourceDisplay = activeLead.sourceDetail || linkedAgent?.companyName || activeLead.source;
    const displayGuestName =
      activeLead.contactPerson && activeLead.contactPerson !== 'N/A'
        ? [activeLead.salutation, activeLead.contactPerson].filter(Boolean).join(' ')
        : 'N/A';

    const displayStageLabel =
      activeLead.stage === 'New Enquiry' ? 'Initiated' : activeLead.stage;

    return (
      <div className="space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
              title="Back to Queries"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Trip Details</h1>
              <span className="text-slate-300">|</span>
              <nav className="text-xs text-slate-500 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="hover:text-emerald-700 transition-colors"
                >
                  Trips
                </button>
                <span>›</span>
                <span className="text-slate-800 font-medium">Current</span>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeLead.confirmedTourCode ? (
              <button
                onClick={() => setSelectedTourCode(activeLead.confirmedTourCode!)}
                className="px-4 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold font-mono transition-colors"
              >
                Open Tour {activeLead.confirmedTourCode} →
              </button>
            ) : (
              <button
                onClick={() => onNavigateToCostingWithLead && onNavigateToCostingWithLead(activeLead)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Proceed to Costing & Quote</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {bannerMessage && (
          <div className="px-4 py-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <span>{bannerMessage}</span>
            <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* QUERY / TRIP SUMMARY CARD (Clean Pure White Card matching screenshot 3) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {/* Headline Row: # ID • Client • Destination • Source • Status • Menu */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
              <span className="text-slate-400 font-normal">#</span>
              <span className="font-mono text-slate-900">{activeLead.referenceId || activeLead.id}</span>
              <span className="text-slate-300">•</span>
              <span>{activeLead.clientName}</span>
              <span className="text-slate-300">•</span>
              <span>{activeLead.destination}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-semibold text-slate-700">{sourceDisplay}</span>
              <span className="text-slate-300">•</span>

              {/* Editable Stage Chip */}
              <select
                value={activeLead.stage}
                onChange={(e) => updateLead(activeLead.id, { stage: e.target.value as LeadStage })}
                className="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-white text-emerald-800 outline-none focus:border-emerald-700 cursor-pointer"
                title={`Current Stage: ${displayStageLabel}`}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>
                    {s === 'New Enquiry' ? 'Initiated (New Enquiry)' : s}
                  </option>
                ))}
              </select>

              {/* More actions menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDetailActionsMenu(v => !v)}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
                  title="Query Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showDetailActionsMenu && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailActionsMenu(false);
                        handleOpenCustomQuotation(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Create Custom Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailActionsMenu(false);
                        onNavigateToCostingWithLead && onNavigateToCostingWithLead(activeLead);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-emerald-700 font-semibold"
                    >
                      Open Costing Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateLead(activeLead.id, { stage: 'On Hold' });
                        setShowDetailActionsMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-amber-700"
                    >
                      Put Query On Hold
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3-Column Metadata Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100 text-xs">
            {/* Column 1: Dates, Pax, Guest, Source Contact */}
            <div className="space-y-2.5 text-slate-700">
              <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="tabular-nums">{formatReadableDate(activeLead.travelStartDate)}</span>
                <span className="text-slate-300">·</span>
                <span className="tabular-nums font-semibold">{activeLead.nights}N, {activeLead.days}D</span>
                <span className="text-slate-300">·</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="tabular-nums">
                  {activeLead.adults} {activeLead.adults === 1 ? 'Adult' : 'Adults'}
                  {activeLead.children > 0
                    ? `, ${activeLead.children} Child${activeLead.children > 1 ? 'ren' : ''}${
                        activeLead.childAges && activeLead.childAges.length > 0
                          ? ` (${activeLead.childAges.map(a => `${a}y`).join(', ')})`
                          : ''
                      }`
                    : ''}
                  {activeLead.focCount && activeLead.focCount > 0 ? `, ${activeLead.focCount} FOC` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Guest: <strong className="text-slate-800">{displayGuestName}</strong></span>
                {activeLead.guestCity && (
                  <span className="text-slate-400">· {activeLead.guestCity}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-slate-700">
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">{activeLead.clientName}</span>
                <a
                  href={`tel:${activeLead.phone}`}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 transition-colors"
                  title={activeLead.phone}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono">{activeLead.phone}</span>
                </a>
                <a
                  href={`mailto:${activeLead.email}`}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 transition-colors"
                  title={activeLead.email}
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Column 2: Tags + Notes */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1.5">
                  <span>Tags</span>
                  <button
                    type="button"
                    onClick={() => setEditingDetailTags(v => !v)}
                    className="text-slate-400 hover:text-emerald-700"
                    title="Edit Tags"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(activeLead.tags && activeLead.tags.length > 0 ? activeLead.tags : ['Enquiry']).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700"
                    >
                      <span>{tag}</span>
                      {editingDetailTags && (
                        <button
                          type="button"
                          onClick={() =>
                            updateLead(activeLead.id, {
                              tags: (activeLead.tags || ['Enquiry']).filter(t => t !== tag)
                            })
                          }
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}

                  {editingDetailTags && (
                    <input
                      type="text"
                      value={detailTagInput}
                      onChange={(e) => setDetailTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && detailTagInput.trim()) {
                          e.preventDefault();
                          const existing = activeLead.tags || ['Enquiry'];
                          if (!existing.includes(detailTagInput.trim())) {
                            updateLead(activeLead.id, { tags: [...existing, detailTagInput.trim()] });
                          }
                          setDetailTagInput('');
                        }
                      }}
                      placeholder="Add tag + Enter"
                      className="px-2 py-1 border border-emerald-600 rounded-md text-xs w-28 outline-none"
                    />
                  )}
                </div>
              </div>

              {activeLead.notes && (
                <div className="text-slate-600">
                  <span className="text-slate-400 font-medium block">Notes / Preferences</span>
                  <span className="text-slate-700">{activeLead.notes}</span>
                </div>
              )}
            </div>

            {/* Column 3: Sales Team & Creator Audit ("with who created everything") */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                  <span>Sales Team</span>
                  <button
                    type="button"
                    onClick={() => setEditingDetailSalesTeam(v => !v)}
                    className="text-slate-400 hover:text-emerald-700"
                    title="Reassign Salesperson"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>

                {!editingDetailSalesTeam ? (
                  <div className="font-semibold text-slate-900 text-sm">
                    {activeLead.assignedTo}
                  </div>
                ) : (
                  <select
                    value={activeLead.assignedTo}
                    onChange={(e) => {
                      updateLead(activeLead.id, { assignedTo: e.target.value });
                      setEditingDetailSalesTeam(false);
                    }}
                    onBlur={() => setEditingDetailSalesTeam(false)}
                    autoFocus
                    className="px-2.5 py-1.5 bg-white border border-emerald-700 rounded-lg text-xs font-medium text-slate-900 outline-none"
                  >
                    {salesTeamMembers.map(emp => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-500">
                <div>
                  Created by: <strong className="text-slate-800">{activeLead.createdBy || activeLead.assignedTo}</strong>
                </div>
                <div className="tabular-nums">
                  Created on: {activeLead.createdAt || activeLead.leadDate} · Query ID: <span className="font-mono text-slate-700">{activeLead.id}</span>
                </div>
                <div>
                  Source: <span className="text-slate-700 font-medium">{activeLead.source}</span>
                  {activeLead.sourceDetail && activeLead.sourceDetail !== activeLead.source
                    ? ` (${activeLead.sourceDetail})`
                    : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WHEN CUSTOM QUOTATION BUILDER IS OPEN (In-place Standard DMC Quotation Form) */}
        {quotationMode !== 'none' ? (
          <CustomQuotationBuilder
            lead={activeLead}
            seedPackage={seedPackageForQuote}
            onCancel={() => {
              setQuotationMode('none');
              setSeedPackageForQuote(null);
            }}
            onQuotationCreated={(_qId, vCode) => {
              setBannerMessage(
                `Quotation ${vCode} created for ${activeLead.clientName}. Share directly via Email or WhatsApp below.`
              );
            }}
            onProceedToCosting={onNavigateToCostingWithLead}
          />
        ) : (
          <>
            {/* CREATED QUOTATIONS & INSTANT EMAIL / WHATSAPP SHARING */}
            {(() => {
              const leadQuotations = quotations.filter(q => q.enquiryId === activeLead.id);
              if (leadQuotations.length === 0) return null;
              return (
                <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Saved Quotations for This Query ({leadQuotations.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCustomQuotation(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-600 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Custom Quotation</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {leadQuotations.map(quote => {
                      const rev = quote.revisions[quote.revisions.length - 1];
                      if (!rev) return null;
                      const perPax = Math.round(rev.finalSellingPrice / Math.max(1, quote.paxCount));
                      return (
                        <div
                          key={quote.id}
                          className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-emerald-800">{rev.versionCode}</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-slate-900">{rev.changeReason}</span>
                            </div>
                            <div className="text-slate-500 tabular-nums">
                              Created by {rev.createdBy} on {rev.createdAt} ·{' '}
                              <strong className="text-slate-900">₹{rev.finalSellingPrice.toLocaleString('en-IN')}</strong>{' '}
                              (₹{perPax.toLocaleString('en-IN')}/pax incl. {rev.gstPercentage}% GST)
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPrintableDocument({
                                  type: 'quotation',
                                  quotationId: quote.id,
                                  version: rev.version
                                })
                              }
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Print PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickShareQuotation(quote, 'Email')}
                              className="px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex items-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Share Mail</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickShareQuotation(quote, 'WhatsApp')}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Share WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* SIDE-BY-SIDE SUGGESTED QUOTATIONS (Matching Reference Layout in Pure Green & White) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Suggested Quotations for {activeLead.destination}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review itinerary, hotels & details below, click <strong className="text-slate-700">Use this Quote</strong>, or create your own custom quotation from scratch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllPackages(v => !v)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
                >
                  {showAllPackages ? `Only ${activeLead.destination}` : 'Show All Destinations'}
                </button>
              </div>

              {suggestedPackages.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 text-xs">
                  <p className="text-slate-600 font-medium">
                    No pre-built suggested quotation templates found for {activeLead.destination}.
                  </p>
                  <p className="text-slate-400">
                    Use Create Custom Quotation or Request Package below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {suggestedPackages.map(pkg => {
                    const activeTab = cardTabs[pkg.id] || 'itinerary';
                    const cityNights = deriveCityNightsFromItinerary(pkg.itinerary);

                    return (
                      <div
                        key={pkg.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          {/* Card Top Header: Title + City/Night Breakdown + Rate */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{pkg.name}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {cityNights.map((cn, idx) => (
                                  <span
                                    key={`${cn.city}-${idx}`}
                                    className="inline-flex items-center gap-1 text-xs text-slate-600"
                                  >
                                    <span>{cn.city}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold tabular-nums">
                                      {cn.nights}N
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-slate-400 block">Standard Quote</span>
                              <span className="text-sm font-bold text-emerald-700 tabular-nums">
                                ₹{pkg.standardSellingPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Itinerary | Hotels | Details Tabs (matching screenshot) */}
                          <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
                            {(['itinerary', 'hotels', 'details'] as const).map(tab => {
                              const isActive = activeTab === tab;
                              return (
                                <button
                                  key={tab}
                                  type="button"
                                  onClick={() =>
                                    setCardTabs(prev => ({ ...prev, [pkg.id]: tab }))
                                  }
                                  className={`pb-2.5 capitalize border-b-2 transition-colors ${
                                    isActive
                                      ? 'border-emerald-700 text-emerald-700'
                                      : 'border-transparent text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  {tab}
                                </button>
                              );
                            })}
                          </div>

                          {/* TAB 1: ITINERARY (Day 1, Day 2... stacked boxes with route + meal/permit pills) */}
                          {activeTab === 'itinerary' && (
                            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                              {pkg.itinerary.map(day => (
                                <div
                                  key={day.dayNumber}
                                  className="border border-slate-200 rounded-lg p-2.5 flex items-start gap-2.5 text-xs bg-white"
                                >
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold shrink-0 tabular-nums">
                                    Day {day.dayNumber}
                                  </span>

                                  <div className="flex-1 space-y-1.5 min-w-0">
                                    <div className="px-2.5 py-1.5 rounded bg-amber-50/80 border border-amber-200/70 text-slate-800 font-medium flex items-start gap-1.5">
                                      <Car className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                                      <span>{day.title}</span>
                                    </div>

                                    {day.mealsIncluded.length > 0 && (
                                      <div className="px-2.5 py-1 rounded bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 flex items-center gap-1.5">
                                        <Ticket className="w-3 h-3 text-emerald-700 shrink-0" />
                                        <span>Meals Included: {day.mealsIncluded.join(', ')}</span>
                                      </div>
                                    )}

                                    {day.activities.slice(0, 2).map((act, aIdx) => (
                                      <div
                                        key={aIdx}
                                        className="px-2.5 py-1 rounded bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 flex items-start gap-1.5"
                                      >
                                        <Ticket className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                                        <span>{act}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* TAB 2: HOTELS */}
                          {activeTab === 'hotels' && (
                            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 text-xs">
                              {pkg.itinerary
                                .filter(d => d.hotelName)
                                .map(day => (
                                  <div key={day.dayNumber} className="py-2.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                      <div>
                                        <div className="font-semibold text-slate-900">{day.hotelName}</div>
                                        <div className="text-slate-500">
                                          Night {day.dayNumber} · {day.hotelCity || day.endLocation}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                                      {activeLead.hotelCategoryPreference}
                                    </span>
                                  </div>
                                ))}
                              {pkg.itinerary.every(d => !d.hotelName) && (
                                <div className="py-6 text-center text-slate-500">
                                  Hotel properties are configured inside the custom quotation builder.
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 3: DETAILS */}
                          {activeTab === 'details' && (
                            <div className="max-h-[360px] overflow-y-auto space-y-3 text-xs">
                              <p className="text-slate-700 leading-relaxed">{pkg.shortSummary}</p>

                              {pkg.highlights.length > 0 && (
                                <div>
                                  <span className="font-semibold text-slate-800 block mb-1">Highlights</span>
                                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                                    {pkg.highlights.map((h, i) => (
                                      <li key={i}>{h}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                <div>
                                  <span className="font-semibold text-emerald-800 block mb-1">Inclusions</span>
                                  <ul className="space-y-1 text-slate-600">
                                    {pkg.inclusions.map((inc, i) => (
                                      <li key={i}>✓ {inc}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block mb-1">Exclusions</span>
                                  <ul className="space-y-1 text-slate-500">
                                    {pkg.exclusions.map((exc, i) => (
                                      <li key={i}>• {exc}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer Action: Use this Quote */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomQuotation(pkg)}
                          className="w-full py-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Use this Quote
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CENTERED ACTION BUTTONS BELOW CARDS (Create Custom Quotation & Request Package) */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCustomQuotation(null)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Create Custom Quotation
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestPackageForm(v => !v)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Request Package</span>
                </button>
              </div>

              {packageRequestSentId && (
                <div className="max-w-xl mx-auto p-3.5 bg-white border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center">
                  Custom contracting request <strong>{packageRequestSentId}</strong> submitted to Operations / Contracting team.
                </div>
              )}

              {showRequestPackageForm && (
                <form
                  onSubmit={handleSubmitPackageRequest}
                  className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">
                      Request Custom Contracted Package from Operations / Contracting
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRequestPackageForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={packageRequestNotes}
                    onChange={(e) => setPackageRequestNotes(e.target.value)}
                    placeholder={`Specify special hotels, sightseeing, vehicle type or net tariff needed for ${activeLead.destination} (${activeLead.nights}N/${activeLead.days}D)...`}
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRequestPackageForm(false)}
                      className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Package Request</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: CRM & QUERIES LIST (Default Table View)
  // =========================================================================
  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Sales Intake & Pipeline · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            CRM & Lead Enquiries
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Multi-channel travel queries across B2B agents, website, WhatsApp, and corporate referrals.
          </p>
        </div>

        <button
          onClick={openNewQueryForm}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Query</span>
        </button>
      </div>

      {bannerMessage && (
        <div className="px-4 py-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span>{bannerMessage}</span>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pure White Table Card with Integrated Filters */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, query ID, ref ID, tour code..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedDestinationFilter}
              onChange={(e) => setSelectedDestinationFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
            >
              <option value="all">All Destinations</option>
              {DESTINATIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
            >
              <option value="all">All Pipeline Stages</option>
              {STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-6">Query / Ref ID</th>
                <th className="py-3.5 px-6">Client & Source</th>
                <th className="py-3.5 px-6">Destination & Dates</th>
                <th className="py-3.5 px-6">Pax</th>
                <th className="py-3.5 px-6">Sales & Created By</th>
                <th className="py-3.5 px-6">Stage</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => openLeadDetail(lead.id)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-6">
                    <div className="font-mono font-bold text-emerald-700">
                      {lead.referenceId || lead.id}
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                      {lead.id} · {lead.leadDate}
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{lead.clientName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {lead.sourceDetail || lead.source} · {lead.phone}
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{lead.destination}</span>
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                      {lead.travelStartDate} ({lead.nights}N/{lead.days}D)
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="text-slate-900 font-medium tabular-nums">
                      {lead.adults} Adults{lead.children > 0 ? `, ${lead.children} Ch` : ''}
                    </div>
                    {lead.selectedItinerary && (
                      <div className="text-xs text-emerald-700 mt-0.5 font-medium">
                        {lead.selectedItinerary.isCustom ? 'Custom itinerary' : 'Suggested itinerary'}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6">
                    <div className="text-slate-900 font-medium">{lead.assignedTo}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      By {lead.createdBy || lead.assignedTo}
                    </div>
                  </td>

                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.stage}
                      onChange={(e) => updateLead(lead.id, { stage: e.target.value as LeadStage })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border outline-none bg-white ${
                        lead.stage === 'Won'
                          ? 'text-emerald-700 border-emerald-200'
                          : lead.stage === 'Lost'
                          ? 'text-rose-700 border-rose-200'
                          : 'text-slate-700 border-slate-200'
                      }`}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openLeadDetail(lead.id)}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors"
                      >
                        View Query
                      </button>
                      {lead.confirmedTourCode ? (
                        <button
                          onClick={() => setSelectedTourCode(lead.confirmedTourCode!)}
                          className="px-3 py-1.5 text-xs bg-white hover:bg-emerald-50 text-emerald-800 font-mono font-bold rounded-lg border border-emerald-200 transition-colors"
                        >
                          {lead.confirmedTourCode} →
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateToCostingWithLead && onNavigateToCostingWithLead(lead)}
                          className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors"
                        >
                          Costing
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
