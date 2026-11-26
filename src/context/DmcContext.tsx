import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Department,
  B2BAgent,
  Supplier,
  FleetVehicle,
  TourPackage,
  LeadEnquiry,
  LeadStage,
  ConfirmedTour,
  Quotation,
  QuotationRevision,
  SupplierBookingRecord,
  OperationsTask,
  CustomerReceipt,
  SupplierPaymentVoucher,
  TourExpense,
  TourIncident,
  SalesHandover,
  AutomationLog,
  TourStatus,
  CostComponent,
  Employee,
  ItineraryShareRecord,
  FollowUpScheduleConfig,
  FollowUpActivity,
  AIIntentAnalysis,
  ProformaInvoice,
  TaxConfiguration,
  RateChangeAudit,
  DestinationSourcingRule,
  MasterHotelRecord,
  MasterTransportRecord,
  ArrivalDepartureInfo,
  InternalMessage,
  DmcNotification,
  ExternalIntegrationSpec
} from '../types';
import {
  INITIAL_AGENTS,
  INITIAL_SUPPLIERS,
  INITIAL_FLEET,
  INITIAL_PACKAGES,
  INITIAL_LEADS,
  INITIAL_CONFIRMED_TOURS,
  INITIAL_QUOTATIONS,
  INITIAL_SUPPLIER_BOOKINGS,
  INITIAL_RECEIPTS,
  INITIAL_SUPPLIER_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_INCIDENTS,
  INITIAL_OPERATIONS_TASKS,
  INITIAL_HANDOVERS,
  INITIAL_AUTOMATION_LOGS,
  INITIAL_EMPLOYEES,
  INITIAL_ITINERARY_SHARES,
  INITIAL_FOLLOWUP_CONFIG,
  INITIAL_FOLLOWUP_ACTIVITIES,
  INITIAL_PROFORMA_INVOICES,
  INITIAL_TAX_CONFIG,
  INITIAL_RATE_AUDITS,
  INITIAL_SOURCING_RULES,
  INITIAL_ARRIVAL_DEPARTURES,
  INITIAL_INTERNAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_INTEGRATIONS,
  INITIAL_MASTER_HOTELS,
  INITIAL_MASTER_TRANSPORTS
} from '../data/initialData';

export interface PrintableDocParams {
  type: 'quotation' | 'invoice' | 'proforma_invoice' | 'receipt' | 'hotel_voucher' | 'driver_sheet' | 'arrival_signage' | 'closure_report' | 'sales_report';
  tourCode?: string;
  quotationId?: string;
  version?: number;
  receiptId?: string;
  proformaId?: string;
  supplierBookingId?: string;
  employeeId?: string;
}

interface DmcContextType {
  selectedDepartment: Department | null;
  setSelectedDepartment: (dept: Department | null) => void;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  selectedTourCode: string | null;
  setSelectedTourCode: (code: string | null) => void;
  printableDocument: PrintableDocParams | null;
  setPrintableDocument: (params: PrintableDocParams | null) => void;
  
  // Staff & Login User
  employees: Employee[];
  currentEmployee: Employee;
  setCurrentEmployee: (emp: Employee) => void;

  // Data
  agents: B2BAgent[];
  suppliers: Supplier[];
  fleet: FleetVehicle[];
  packages: TourPackage[];
  leads: LeadEnquiry[];
  confirmedTours: ConfirmedTour[];
  quotations: Quotation[];
  supplierBookings: SupplierBookingRecord[];
  receipts: CustomerReceipt[];
  supplierPayments: SupplierPaymentVoucher[];
  expenses: TourExpense[];
  incidents: TourIncident[];
  operationsTasks: OperationsTask[];
  handovers: SalesHandover[];
  automationLogs: AutomationLog[];
  
  // Follow-up & Itinerary Sharing
  itineraryShares: ItineraryShareRecord[];
  followUpConfig: FollowUpScheduleConfig;
  followUpActivities: FollowUpActivity[];
  aiIntentAnalyses: AIIntentAnalysis[];

  // Financial & Rate Controls
  proformaInvoices: ProformaInvoice[];
  taxConfigs: TaxConfiguration[];
  rateAudits: RateChangeAudit[];

  // Master Data & Sourcing
  sourcingRules: DestinationSourcingRule[];
  masterHotels: MasterHotelRecord[];
  masterTransports: MasterTransportRecord[];
  arrivalDepartures: ArrivalDepartureInfo[];
  internalMessages: InternalMessage[];
  notifications: DmcNotification[];
  integrations: ExternalIntegrationSpec[];

  // Actions
  createLead: (lead: Omit<LeadEnquiry, 'id' | 'quotationIds'>) => string;
  updateLead: (leadId: string, updates: Partial<LeadEnquiry>) => void;
  savePackage: (pkg: TourPackage) => void;
  createQuotation: (quotation: Omit<Quotation, 'id' | 'currentVersion' | 'activeVersionCode'>) => string;
  addQuotationRevision: (quotationId: string, revision: Omit<QuotationRevision, 'version' | 'versionCode' | 'createdAt'>) => string;
  confirmBookingAndGenerateTourCode: (
    quotationId: string,
    versionNumber: number,
    advanceAmountReceived: number,
    paymentMode: CustomerReceipt['paymentMode'],
    transactionRef: string,
    allowCreditException?: boolean
  ) => { success: boolean; tourCode?: string; message: string };
  submitSalesHandover: (tourCode: string, handover: Partial<SalesHandover>) => void;
  reviewSalesHandover: (tourCode: string, status: import('../types').HandoverStatus, notes: string) => void;
  updateOperationsTask: (taskId: string, status: OperationsTask['status'], notes?: string) => void;
  addOperationsTask: (task: Omit<OperationsTask, 'id'>) => void;
  updateSupplierBooking: (bookingId: string, updates: Partial<SupplierBookingRecord>) => void;
  assignVehicleToTour: (tourCode: string, vehicleId: string) => void;
  recordCustomerReceipt: (receipt: Omit<CustomerReceipt, 'id' | 'receiptNumber'>) => string;
  requestSupplierPayment: (voucher: Omit<SupplierPaymentVoucher, 'id' | 'status'>) => string;
  approveSupplierPayment: (voucherId: string, bankReference: string, paymentMode: string) => void;
  recordTourExpense: (expense: Omit<TourExpense, 'id'>) => void;
  reportTourIncident: (incident: Omit<TourIncident, 'id' | 'reportedAt' | 'status'>) => void;
  resolveTourIncident: (incidentId: string, actionTaken: string, costImpact: number) => void;
  updateTourStatus: (tourCode: string, status: TourStatus) => void;
  closeTourAndReconcile: (tourCode: string, closureNotes: string) => void;
  resetToDemoData: () => void;
  runAiQuery: (prompt: string) => { answer: string; relatedTourCodes?: string[] };
  parseVendorProposalText: (rawText: string) => Partial<TourPackage>;

  // New Enterprise Workflow Actions
  sendItinerary: (share: Omit<ItineraryShareRecord, 'id' | 'sentAt' | 'deliveryStatus'>) => string;
  updateFollowUpConfig: (config: Partial<FollowUpScheduleConfig>) => void;
  recordFollowUpActivity: (activity: Omit<FollowUpActivity, 'id' | 'executedAt'>) => string;
  triggerAutomaticFollowUps: () => { triggeredCount: number; skippedCount: number; logs: string[] };
  analyzeClientSnippet: (snippet: string, enquiryId: string) => AIIntentAnalysis;
  applyAiIntentStage: (analysisId: string) => void;
  createProformaInvoice: (pi: Omit<ProformaInvoice, 'id' | 'issuedAt' | 'status' | 'verificationStatus'>) => string;
  uploadPaymentProof: (piId: string, proofUrl: string, proofNotes?: string) => void;
  verifyPaymentReceipt: (piId: string, verified: boolean, remarks: string, verifiedAmt?: number, bankRef?: string, paymentMode?: string) => void;
  updateTaxConfig: (taxId: string, updates: Partial<TaxConfiguration>) => void;
  requestRateChange: (audit: Omit<RateChangeAudit, 'id' | 'approvalDate' | 'status'>) => string;
  approveRateChange: (auditId: string, approved: boolean, accountsApprover: string) => void;
  updateSourcingRule: (ruleId: string, updates: Partial<DestinationSourcingRule>) => void;
  saveMasterHotel: (hotel: MasterHotelRecord) => void;
  saveMasterTransport: (trp: MasterTransportRecord) => void;
  saveArrivalDeparture: (info: ArrivalDepartureInfo) => void;
  sendInternalMessage: (msg: Omit<InternalMessage, 'id' | 'timestamp' | 'readBy'>) => string;
  markNotificationRead: (id: string) => void;
  addNotification: (notif: Omit<DmcNotification, 'id' | 'timestamp' | 'read'>) => void;
  updateIntegrationSettings: (id: string, settings: Record<string, string>, status?: ExternalIntegrationSpec['status']) => void;
}

const DmcContext = createContext<DmcContextType | undefined>(undefined);

const STORAGE_KEY = 'lets_see_dmc_v1_state';

export const DmcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDepartment, setSelectedDepartmentState] = useState<import('../types').Department | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_department`);
    return (saved as import('../types').Department) || null;
  });

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_department`);
    return (saved as UserRole) || 'sales';
  });

  const setSelectedDepartment = (dept: import('../types').Department | null) => {
    setSelectedDepartmentState(dept);
    if (dept) {
      setCurrentUserRole(dept);
      localStorage.setItem(`${STORAGE_KEY}_department`, dept);
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_department`);
    }
  };

  const [selectedTourCode, setSelectedTourCode] = useState<string | null>(null);
  const [printableDocument, setPrintableDocument] = useState<PrintableDocParams | null>(null);

  // Load from localStorage or fallback to realistic initial data
  const [agents, setAgents] = useState<B2BAgent[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_agents`);
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });
  const [fleet, setFleet] = useState<FleetVehicle[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_fleet`);
    return saved ? JSON.parse(saved) : INITIAL_FLEET;
  });
  const [packages, setPackages] = useState<TourPackage[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_packages`);
    return saved ? JSON.parse(saved) : INITIAL_PACKAGES;
  });
  const [leads, setLeads] = useState<LeadEnquiry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_leads`);
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });
  const [confirmedTours, setConfirmedTours] = useState<ConfirmedTour[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_tours`);
    return saved ? JSON.parse(saved) : INITIAL_CONFIRMED_TOURS;
  });
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_quotations`);
    return saved ? JSON.parse(saved) : INITIAL_QUOTATIONS;
  });
  const [supplierBookings, setSupplierBookings] = useState<SupplierBookingRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_supplier_bookings`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_BOOKINGS;
  });
  const [receipts, setReceipts] = useState<CustomerReceipt[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_receipts`);
    return saved ? JSON.parse(saved) : INITIAL_RECEIPTS;
  });
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentVoucher[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_supplier_payments`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_PAYMENTS;
  });
  const [expenses, setExpenses] = useState<TourExpense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });
  const [incidents, setIncidents] = useState<TourIncident[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_incidents`);
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });
  const [operationsTasks, setOperationsTasks] = useState<OperationsTask[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_tasks`);
    return saved ? JSON.parse(saved) : INITIAL_OPERATIONS_TASKS;
  });
  const [handovers, setHandovers] = useState<SalesHandover[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_handovers`);
    return saved ? JSON.parse(saved) : INITIAL_HANDOVERS;
  });
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_automation`);
    return saved ? JSON.parse(saved) : INITIAL_AUTOMATION_LOGS;
  });

  // Employees & Active User
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_employees`);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [currentEmployee, setCurrentEmployee] = useState<Employee>(() => {
    const savedId = localStorage.getItem(`${STORAGE_KEY}_active_employee_id`);
    const found = INITIAL_EMPLOYEES.find(e => e.id === savedId);
    return found || INITIAL_EMPLOYEES[1]; // Ritu Sharma by default
  });

  // Automatically adapt current employee when department changes
  useEffect(() => {
    if (selectedDepartment) {
      const match = employees.find(e => e.department === selectedDepartment);
      if (match) setCurrentEmployee(match);
    }
  }, [selectedDepartment, employees]);

  // Itinerary Shares & Follow-ups
  const [itineraryShares, setItineraryShares] = useState<ItineraryShareRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_itinerary_shares`);
    return saved ? JSON.parse(saved) : INITIAL_ITINERARY_SHARES;
  });

  const [followUpConfig, setFollowUpConfigState] = useState<FollowUpScheduleConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_followup_config`);
    return saved ? JSON.parse(saved) : INITIAL_FOLLOWUP_CONFIG;
  });

  const [followUpActivities, setFollowUpActivities] = useState<FollowUpActivity[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_followup_activities`);
    return saved ? JSON.parse(saved) : INITIAL_FOLLOWUP_ACTIVITIES;
  });

  const [aiIntentAnalyses, setAiIntentAnalyses] = useState<AIIntentAnalysis[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_ai_intents`);
    return saved ? JSON.parse(saved) : [];
  });

  // Proforma Invoices & Accounts Verification
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_proformas`);
    return saved ? JSON.parse(saved) : INITIAL_PROFORMA_INVOICES;
  });

  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_tax_configs`);
    return saved ? JSON.parse(saved) : INITIAL_TAX_CONFIG;
  });

  const [rateAudits, setRateAudits] = useState<RateChangeAudit[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rate_audits`);
    return saved ? JSON.parse(saved) : INITIAL_RATE_AUDITS;
  });

  // Master Data & Sourcing
  const [sourcingRules, setSourcingRules] = useState<DestinationSourcingRule[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sourcing_rules`);
    return saved ? JSON.parse(saved) : INITIAL_SOURCING_RULES;
  });

  const [masterHotels, setMasterHotels] = useState<MasterHotelRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_master_hotels`);
    return saved ? JSON.parse(saved) : INITIAL_MASTER_HOTELS;
  });

  const [masterTransports, setMasterTransports] = useState<MasterTransportRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_master_transports`);
    return saved ? JSON.parse(saved) : INITIAL_MASTER_TRANSPORTS;
  });

  const [arrivalDepartures, setArrivalDepartures] = useState<ArrivalDepartureInfo[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_arrival_departures`);
    return saved ? JSON.parse(saved) : INITIAL_ARRIVAL_DEPARTURES;
  });

  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_internal_messages`);
    return saved ? JSON.parse(saved) : INITIAL_INTERNAL_MESSAGES;
  });

  const [notifications, setNotifications] = useState<DmcNotification[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [integrations, setIntegrations] = useState<ExternalIntegrationSpec[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_integrations`);
    return saved ? JSON.parse(saved) : INITIAL_INTEGRATIONS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_agents`, JSON.stringify(agents));
      localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${STORAGE_KEY}_fleet`, JSON.stringify(fleet));
      localStorage.setItem(`${STORAGE_KEY}_packages`, JSON.stringify(packages));
      localStorage.setItem(`${STORAGE_KEY}_leads`, JSON.stringify(leads));
      localStorage.setItem(`${STORAGE_KEY}_tours`, JSON.stringify(confirmedTours));
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify(quotations));
      localStorage.setItem(`${STORAGE_KEY}_supplier_bookings`, JSON.stringify(supplierBookings));
      localStorage.setItem(`${STORAGE_KEY}_receipts`, JSON.stringify(receipts));
      localStorage.setItem(`${STORAGE_KEY}_supplier_payments`, JSON.stringify(supplierPayments));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_incidents`, JSON.stringify(incidents));
      localStorage.setItem(`${STORAGE_KEY}_tasks`, JSON.stringify(operationsTasks));
      localStorage.setItem(`${STORAGE_KEY}_handovers`, JSON.stringify(handovers));
      localStorage.setItem(`${STORAGE_KEY}_automation`, JSON.stringify(automationLogs));
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
      localStorage.setItem(`${STORAGE_KEY}_active_employee_id`, currentEmployee.id);
      localStorage.setItem(`${STORAGE_KEY}_itinerary_shares`, JSON.stringify(itineraryShares));
      localStorage.setItem(`${STORAGE_KEY}_followup_config`, JSON.stringify(followUpConfig));
      localStorage.setItem(`${STORAGE_KEY}_followup_activities`, JSON.stringify(followUpActivities));
      localStorage.setItem(`${STORAGE_KEY}_ai_intents`, JSON.stringify(aiIntentAnalyses));
      localStorage.setItem(`${STORAGE_KEY}_proformas`, JSON.stringify(proformaInvoices));
      localStorage.setItem(`${STORAGE_KEY}_tax_configs`, JSON.stringify(taxConfigs));
      localStorage.setItem(`${STORAGE_KEY}_rate_audits`, JSON.stringify(rateAudits));
      localStorage.setItem(`${STORAGE_KEY}_sourcing_rules`, JSON.stringify(sourcingRules));
      localStorage.setItem(`${STORAGE_KEY}_master_hotels`, JSON.stringify(masterHotels));
      localStorage.setItem(`${STORAGE_KEY}_master_transports`, JSON.stringify(masterTransports));
      localStorage.setItem(`${STORAGE_KEY}_arrival_departures`, JSON.stringify(arrivalDepartures));
      localStorage.setItem(`${STORAGE_KEY}_internal_messages`, JSON.stringify(internalMessages));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      localStorage.setItem(`${STORAGE_KEY}_integrations`, JSON.stringify(integrations));
    } catch {
      // quota or private mode fallback
    }
  }, [
    agents, suppliers, fleet, packages, leads, confirmedTours, quotations,
    supplierBookings, receipts, supplierPayments, expenses, incidents,
    operationsTasks, handovers, automationLogs, employees, currentEmployee,
    itineraryShares, followUpConfig, followUpActivities, aiIntentAnalyses,
    proformaInvoices, taxConfigs, rateAudits, sourcingRules, masterHotels,
    masterTransports, arrivalDepartures, internalMessages, notifications, integrations
  ]);

  const logAutomationEvent = (event: string, targetReference: string, description: string, channel: 'System' | 'Email' | 'WhatsApp' = 'System') => {
    const newLog: AutomationLog = {
      id: `AUT-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      event,
      targetReference,
      description,
      channel,
      status: channel === 'WhatsApp' || channel === 'Email' ? 'delivered' : 'success'
    };
    setAutomationLogs(prev => [newLog, ...prev]);
  };

  const createLead = (leadData: Omit<LeadEnquiry, 'id' | 'quotationIds'>): string => {
    const seq = leads.length + 47;
    const newId = `ENQ-2026-${String(seq).padStart(4, '0')}`;
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const creatorName = leadData.createdBy || currentEmployee.name;
    const newLead: LeadEnquiry = {
      ...leadData,
      id: newId,
      createdBy: creatorName,
      createdAt: leadData.createdAt || nowTimestamp,
      quotationIds: []
    };
    setLeads(prev => [newLead, ...prev]);
    logAutomationEvent('New Lead Created', newId, `Query created by ${creatorName} for ${newLead.clientName} (${newLead.destination}). Assigned to ${newLead.assignedTo}.`);
    return newId;
  };

  const updateLead = (leadId: string, updates: Partial<LeadEnquiry>) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updated = { ...l, ...updates };
        if (updates.stage && updates.stage !== l.stage) {
          logAutomationEvent('Pipeline Stage Changed', leadId, `Stage shifted from ${l.stage} to ${updates.stage}`);
        }
        return updated;
      }
      return l;
    }));
  };

  const savePackage = (pkg: TourPackage) => {
    setPackages(prev => {
      const idx = prev.findIndex(p => p.id === pkg.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = pkg;
        return copy;
      }
      return [pkg, ...prev];
    });
  };

  const createQuotation = (quotationData: Omit<Quotation, 'id' | 'currentVersion' | 'activeVersionCode'>): string => {
    const newId = `QT-2026-00${quotations.length + 5}`;
    const v1Code = `${newId}-V1`;
    const newQuotation: Quotation = {
      ...quotationData,
      id: newId,
      currentVersion: 1,
      activeVersionCode: v1Code,
      revisions: quotationData.revisions.map((r, i) => ({
        ...r,
        version: i + 1,
        versionCode: `${newId}-V${i + 1}`
      }))
    };
    setQuotations(prev => [newQuotation, ...prev]);
    
    // Link to lead
    setLeads(prev => prev.map(l => {
      if (l.id === quotationData.enquiryId) {
        return {
          ...l,
          stage: 'Quotation Sent',
          quotationIds: [...l.quotationIds, newId]
        };
      }
      return l;
    }));

    logAutomationEvent('Quotation Generated', newId, `Quotation ${v1Code} created for ${newQuotation.clientName}. Total: ₹${newQuotation.revisions[0]?.finalSellingPrice.toLocaleString('en-IN')}`);
    return newId;
  };

  const addQuotationRevision = (quotationId: string, revisionData: Omit<QuotationRevision, 'version' | 'versionCode' | 'createdAt'>): string => {
    let newVersionCode = '';
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        const newVerNum = q.currentVersion + 1;
        newVersionCode = `${q.id}-V${newVerNum}`;
        const newRev: QuotationRevision = {
          ...revisionData,
          version: newVerNum,
          versionCode: newVersionCode,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        return {
          ...q,
          currentVersion: newVerNum,
          activeVersionCode: newVersionCode,
          revisions: [...q.revisions, newRev]
        };
      }
      return q;
    }));

    logAutomationEvent('Quotation Revision Created', newVersionCode, `Revision ${newVersionCode} generated for ${quotationId}. Reason: ${revisionData.changeReason || 'Customisation'}`);
    return newVersionCode;
  };

  const confirmBookingAndGenerateTourCode = (
    quotationId: string,
    versionNumber: number,
    advanceAmountReceived: number,
    paymentMode: CustomerReceipt['paymentMode'],
    transactionRef: string,
    allowCreditException: boolean = false
  ): { success: boolean; tourCode?: string; message: string } => {
    const targetQuote = quotations.find(q => q.id === quotationId);
    if (!targetQuote) {
      return { success: false, message: 'Quotation not found.' };
    }
    const revision = targetQuote.revisions.find(r => r.version === versionNumber);
    if (!revision) {
      return { success: false, message: 'Specified quotation revision version not found.' };
    }

    // Check B2B credit terms or minimum advance policy
    const isB2B = !!targetQuote.agentId;
    const agent = isB2B ? agents.find(a => a.id === targetQuote.agentId) : null;
    const requiredMinAdvance = revision.finalSellingPrice * 0.25; // 25% minimum policy

    if (!allowCreditException && advanceAmountReceived < requiredMinAdvance) {
      if (agent && agent.creditAllowed) {
        const availableCredit = agent.creditLimit - agent.currentOutstanding;
        if (revision.finalSellingPrice > availableCredit) {
          return {
            success: false,
            message: `Advance ₹${advanceAmountReceived.toLocaleString('en-IN')} is below required 25% (₹${requiredMinAdvance.toLocaleString('en-IN')}) and total cost exceeds agent available credit limit of ₹${availableCredit.toLocaleString('en-IN')}. Authorised credit exception required.`
          };
        }
      } else {
        return {
          success: false,
          message: `Minimum required advance is 25% (₹${requiredMinAdvance.toLocaleString('en-IN')}). You entered ₹${advanceAmountReceived.toLocaleString('en-IN')}. Please collect advance or request credit manager approval.`
        };
      }
    }

    // Generate permanent unique Tour Code: LST-2026-0000X
    const tourIndex = confirmedTours.length + 1;
    const padded = String(tourIndex).padStart(5, '0');
    const newTourCode = `LST-2026-${padded}`;
    const newBookingId = `BKG-2026-${padded}`;

    // Extract fleet & suppliers
    let allocatedVehicleId: string | undefined;
    let transportSource: 'own_fleet' | 'hired_vendor' | 'mixed' = 'hired_vendor';
    let estimatedOwnFleetCost = 0;
    let estimatedSupplierCost = 0;

    const newSupplierBookings: SupplierBookingRecord[] = [];
    const newOpsTasks: OperationsTask[] = [];

    revision.costComponents.forEach((comp, idx) => {
      if (comp.sourceType === 'own_fleet') {
        transportSource = 'own_fleet';
        allocatedVehicleId = comp.vehicleId || 'FLT-01';
        estimatedOwnFleetCost += comp.totalCost;
        // Internal fleet: NO external supplier payment voucher is generated!
        newOpsTasks.push({
          id: `TSK-${Date.now()}-${idx}`,
          tourCode: newTourCode,
          destination: targetQuote.destination,
          category: 'transport',
          title: `Assign & inspect Company Fleet vehicle (${comp.description})`,
          assignedTo: 'Bipul Bora',
          dueDate: targetQuote.startDate,
          status: 'pending',
          notes: 'Ensure pre-trip tyre pressure, sanitisation & emergency kit inspection.'
        });
      } else if (comp.sourceType === 'external_supplier' && comp.supplierId) {
        estimatedSupplierCost += comp.totalCost;
        const advanceReq = (comp.totalCost * (comp.advancePercentageRequired || 50)) / 100;
        const newSbId = `SB-2026-00${supplierBookings.length + newSupplierBookings.length + 10}`;
        newSupplierBookings.push({
          id: newSbId,
          tourCode: newTourCode,
          supplierId: comp.supplierId,
          supplierName: comp.supplierName || 'External Supplier',
          category: comp.category === 'hotel' ? 'Hotel' : comp.category === 'transport' ? 'Transport' : 'Activity',
          details: comp.description,
          destination: targetQuote.destination,
          agreedAmount: comp.totalCost,
          advanceRequired: advanceReq,
          advancePaid: 0,
          balancePayable: comp.totalCost,
          dueDate: targetQuote.startDate,
          status: 'enquiry',
          voucherGenerated: false
        });

        // Add corresponding operational task
        newOpsTasks.push({
          id: `TSK-${Date.now()}-${idx}`,
          tourCode: newTourCode,
          destination: targetQuote.destination,
          category: comp.category === 'hotel' ? 'hotel' : 'transport',
          title: `Confirm booking with ${comp.supplierName} (${comp.description})`,
          assignedTo: 'Bhaskar Jyoti Phukan',
          dueDate: targetQuote.startDate,
          status: 'pending'
        });
      }
    });

    // Create the master ConfirmedTour record
    const newConfirmedTour: ConfirmedTour = {
      tourCode: newTourCode,
      enquiryId: targetQuote.enquiryId,
      bookingId: newBookingId,
      quotationCode: revision.versionCode,
      quotationVersion: revision.version,
      clientName: targetQuote.clientName,
      agentId: targetQuote.agentId,
      destination: targetQuote.destination,
      packageName: `Custom ${targetQuote.destination} Tour`,
      startDate: targetQuote.startDate,
      endDate: targetQuote.endDate,
      nights: revision.itinerarySnapshot.length - 1,
      days: revision.itinerarySnapshot.length,
      adults: targetQuote.paxCount,
      children: 0,
      infants: 0,
      travellers: [
        {
          fullName: targetQuote.clientName.replace(/\s*\(.*\)/, ''),
          age: 40,
          gender: 'Male',
          idProofType: 'Aadhaar',
          idNumber: 'Pending Collection'
        }
      ],
      assignedSalesperson: revision.createdBy,
      assignedOperationsLead: 'Bhaskar Jyoti Phukan',
      status: 'operations_prep',
      
      sellingPrice: revision.subtotalSellingPrice,
      gstAmount: revision.gstAmount,
      totalReceivable: revision.finalSellingPrice,
      totalCollected: advanceAmountReceived,
      outstandingBalance: revision.finalSellingPrice - advanceAmountReceived,
      
      estimatedSupplierCost,
      estimatedOwnFleetCost,
      totalEstimatedCost: revision.totalDirectCost,
      projectedGrossProfit: revision.markupAmount,
      projectedMarginPct: revision.markupPercentage,
      
      actualSupplierCostPaid: 0,
      actualDirectExpenses: 0,
      actualTotalCost: 0,
      actualGrossProfit: advanceAmountReceived,
      profitVariance: 0,
      
      transportSource,
      allocatedVehicleId,
      
      itinerary: revision.itinerarySnapshot,
      inclusions: revision.inclusions,
      exclusions: revision.exclusions
    };

    // If advance was received, record the CustomerReceipt
    if (advanceAmountReceived > 0) {
      const newRecId = `REC-2026-00${receipts.length + 10}`;
      const newReceipt: CustomerReceipt = {
        id: newRecId,
        tourCode: newTourCode,
        clientName: targetQuote.clientName,
        agentId: targetQuote.agentId,
        amount: advanceAmountReceived,
        receivedDate: new Date().toISOString().substring(0, 10),
        paymentMode,
        transactionReference: transactionRef || 'NEFT-CONFIRMATION',
        bankAccount: 'HDFC Current A/c 502000088912',
        receiptNumber: `LST-REC-2026-${padded}`,
        verified: true,
        notes: `Initial advance collected upon booking confirmation of ${newTourCode}`
      };
      setReceipts(prev => [newReceipt, ...prev]);
    }

    // Update Agent outstanding balance if applicable
    if (agent) {
      setAgents(prev => prev.map(a => {
        if (a.id === agent.id) {
          const balanceAddition = revision.finalSellingPrice - advanceAmountReceived;
          return {
            ...a,
            currentOutstanding: a.currentOutstanding + balanceAddition,
            totalBookings: a.totalBookings + 1,
            totalRevenue: a.totalRevenue + revision.finalSellingPrice
          };
        }
        return a;
      }));
    }

    // If own vehicle allocated, update fleet status
    if (allocatedVehicleId) {
      setFleet(prev => prev.map(f => {
        if (f.id === allocatedVehicleId) {
          return {
            ...f,
            currentTourCode: newTourCode
          };
        }
        return f;
      }));
    }

    // Create default SalesHandover
    const newHandover: SalesHandover = {
      tourCode: newTourCode,
      destination: targetQuote.destination,
      paxCount: targetQuote.paxCount,
      travelDates: `${targetQuote.startDate} to ${targetQuote.endDate}`,
      submittedBy: revision.createdBy,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending_review',
      specialRequests: 'Customer requested smooth transfers and quiet rooms.',
      flightArrivalDetails: 'To be confirmed by guest 48h prior',
      flightDepartureDetails: 'To be confirmed by guest 48h prior',
      roomingConfiguration: 'Twin / King bedded standard setup',
      salesCommitments: 'All confirmed inclusions as per quote'
    };

    setConfirmedTours(prev => [newConfirmedTour, ...prev]);
    setSupplierBookings(prev => [...newSupplierBookings, ...prev]);
    setOperationsTasks(prev => [...newOpsTasks, ...prev]);
    setHandovers(prev => [newHandover, ...prev]);

    // Create Initial Arrival & Departure Logistics
    const newArrivalDeparture: ArrivalDepartureInfo = {
      tourCode: newTourCode,
      enquiryId: targetQuote.enquiryId,
      leadGuestName: targetQuote.clientName,
      contactPhone: '+91 98640 12345',
      paxCount: targetQuote.paxCount,
      arrivalDate: targetQuote.startDate,
      arrivalTime: '11:00 AM',
      arrivalPoint: 'Guwahati Airport (GAU) - Lokpriya Gopinath Bordoloi Terminal',
      arrivalFlightOrTrain: 'Flight / Train to be updated by guest',
      pickupAddress: 'Guwahati Airport Arrival Gate',
      departureDate: targetQuote.endDate,
      departureTime: '15:00 PM',
      departurePoint: 'Guwahati Airport (GAU)',
      departureFlightOrTrain: 'Flight / Train to be updated by guest',
      dropAddress: 'Guwahati Airport Departure Gate',
      emergencyContact: '+91 98640 99999 (Guwahati HQ 24x7)',
      assignedDriverName: 'Ramen Das',
      assignedVehiclePlate: allocatedVehicleId ? fleet.find(f => f.id === allocatedVehicleId)?.registrationNumber : 'AS-01-EC-4021',
      status: 'pending_assignment',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: revision.createdBy
    };
    setArrivalDepartures(prev => [newArrivalDeparture, ...prev]);

    // Halt any pending automated follow-ups for this enquiry (Safeguard 1.4)
    setFollowUpActivities(prev => prev.map(fa => {
      if (fa.enquiryId === targetQuote.enquiryId && fa.status === 'pending') {
        return {
          ...fa,
          status: 'skipped',
          notes: `Automatic follow-up halted: Enquiry converted under Tour Code ${newTourCode}.`
        };
      }
      return fa;
    }));

    // Update Proforma Invoice if one was created
    setProformaInvoices(prev => prev.map(pi => {
      if (pi.enquiryId === targetQuote.enquiryId) {
        return {
          ...pi,
          tourCode: newTourCode,
          status: 'verified_paid',
          verificationStatus: 'verified'
        };
      }
      return pi;
    }));

    // Update Quotation status
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        return {
          ...q,
          confirmedTourCode: newTourCode,
          revisions: q.revisions.map(r => r.version === versionNumber ? { ...r, status: 'accepted' } : r)
        };
      }
      return q;
    }));

    // Update Lead to Won & link Tour Code
    setLeads(prev => prev.map(l => {
      if (l.id === targetQuote.enquiryId) {
        return {
          ...l,
          stage: 'Won',
          confirmedTourCode: newTourCode
        };
      }
      return l;
    }));

    // Dispatch notifications to Operations and Accounts
    addNotification({
      category: 'booking_confirmation_submitted',
      title: `Tour Code ${newTourCode} Generated`,
      message: `Commercial booking confirmed for ${targetQuote.clientName}. Total ₹${revision.finalSellingPrice.toLocaleString('en-IN')}, Advance ₹${advanceAmountReceived.toLocaleString('en-IN')}. Operations prep initiated.`,
      linkedReference: newTourCode,
      targetDepartment: 'operations',
      priority: 'urgent'
    });

    addNotification({
      category: 'payment_verified',
      title: `Tour ${newTourCode} Advance Accounted`,
      message: `Accounts ledger credited with ₹${advanceAmountReceived.toLocaleString('en-IN')} for ${newTourCode}. Remaining balance: ₹${(revision.finalSellingPrice - advanceAmountReceived).toLocaleString('en-IN')}.`,
      linkedReference: newTourCode,
      targetDepartment: 'accounts',
      priority: 'normal'
    });

    logAutomationEvent(
      'Tour Code Generated & Booking Confirmed',
      newTourCode,
      `Tour Code ${newTourCode} generated for ${targetQuote.clientName}. Total: ₹${revision.finalSellingPrice.toLocaleString('en-IN')}, Advance: ₹${advanceAmountReceived.toLocaleString('en-IN')}. Operations & Accounts tasks dispatched.`,
      'System'
    );

    // Send WhatsApp notification simulator to agent
    logAutomationEvent(
      'WhatsApp Booking Voucher Dispatched',
      newTourCode,
      `Confirmation & Tour Code ${newTourCode} sent via WhatsApp to client/agent.`,
      'WhatsApp'
    );

    return {
      success: true,
      tourCode: newTourCode,
      message: `Booking successfully confirmed! Permanent Tour Code ${newTourCode} has been generated.`
    };
  };

  const submitSalesHandover = (tourCode: string, handoverData: Partial<SalesHandover>) => {
    setHandovers(prev => prev.map(h => {
      if (h.tourCode === tourCode) {
        return {
          ...h,
          ...handoverData,
          status: 'pending_review',
          submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return h;
    }));
    logAutomationEvent('Sales Handover Submitted', tourCode, `Sales Handover submitted for ${tourCode}. Awaiting Operations Manager review.`);
  };

  const reviewSalesHandover = (tourCode: string, statusOrAccepted: any, notes: string) => {
    let finalStatus: import('../types').HandoverStatus = 'accepted';
    if (typeof statusOrAccepted === 'boolean') {
      finalStatus = statusOrAccepted ? 'accepted' : 'clarification_required';
    } else {
      finalStatus = statusOrAccepted;
    }

    setHandovers(prev => prev.map(h => {
      if (h.tourCode === tourCode) {
        return {
          ...h,
          status: finalStatus,
          reviewerNotes: notes,
          reviewedBy: currentEmployee.name,
          reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return h;
    }));

    addNotification({
      category: finalStatus === 'accepted' ? 'handover_accepted' : 'handover_clarification',
      title: `Operations Handover: ${finalStatus.replace(/_/g, ' ').toUpperCase()}`,
      message: `Operations (${currentEmployee.name}) set handover status to ${finalStatus.replace(/_/g, ' ')} for ${tourCode}. Notes: ${notes}`,
      linkedReference: tourCode,
      targetDepartment: 'sales',
      priority: finalStatus === 'accepted' ? 'normal' : 'high'
    });

    logAutomationEvent(
      `Handover Status: ${finalStatus}`,
      tourCode,
      `Operations review status for ${tourCode}: ${finalStatus}. Remarks: ${notes}`
    );
  };

  const updateOperationsTask = (taskId: string, status: OperationsTask['status'], notes?: string) => {
    setOperationsTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status,
          notes: notes !== undefined ? notes : t.notes
        };
      }
      return t;
    }));
  };

  const addOperationsTask = (taskData: Omit<OperationsTask, 'id'>) => {
    const newTask: OperationsTask = {
      ...taskData,
      id: `TSK-${Date.now()}`
    };
    setOperationsTasks(prev => [newTask, ...prev]);
  };

  const updateSupplierBooking = (bookingId: string, updates: Partial<SupplierBookingRecord>) => {
    setSupplierBookings(prev => prev.map(sb => {
      if (sb.id === bookingId) {
        const updated = { ...sb, ...updates };
        if (updates.status === 'booked_confirmed' && !sb.confirmationReference) {
          updated.confirmationReference = `CONF-${Math.floor(10000 + Math.random() * 90000)}`;
          updated.voucherGenerated = true;
        }
        return updated;
      }
      return sb;
    }));
  };

  const assignVehicleToTour = (tourCode: string, vehicleId: string) => {
    const vehicle = fleet.find(f => f.id === vehicleId);
    setConfirmedTours(prev => prev.map(t => {
      if (t.tourCode === tourCode) {
        return {
          ...t,
          transportSource: 'own_fleet',
          allocatedVehicleId: vehicleId,
          allocatedDriverName: vehicle?.driverName,
          allocatedDriverPhone: vehicle?.driverPhone
        };
      }
      return t;
    }));

    setFleet(prev => prev.map(f => {
      if (f.id === vehicleId) {
        return { ...f, currentStatus: 'on_tour', currentTourCode: tourCode };
      }
      if (f.currentTourCode === tourCode && f.id !== vehicleId) {
        return { ...f, currentStatus: 'available', currentTourCode: undefined };
      }
      return f;
    }));

    logAutomationEvent('Fleet Vehicle Assigned', tourCode, `Vehicle ${vehicle?.registrationNumber} (${vehicle?.driverName}) allocated to ${tourCode}.`);
  };

  const recordCustomerReceipt = (receiptData: Omit<CustomerReceipt, 'id' | 'receiptNumber'>): string => {
    const newId = `REC-2026-00${receipts.length + 15}`;
    const receiptNo = `LST-REC-2026-00${receipts.length + 15}`;
    const newReceipt: CustomerReceipt = {
      ...receiptData,
      id: newId,
      receiptNumber: receiptNo
    };

    setReceipts(prev => [newReceipt, ...prev]);

    // Update tour collections
    setConfirmedTours(prev => prev.map(t => {
      if (t.tourCode === receiptData.tourCode) {
        const newCollected = t.totalCollected + receiptData.amount;
        const newOutstanding = Math.max(0, t.totalReceivable - newCollected);
        return {
          ...t,
          totalCollected: newCollected,
          outstandingBalance: newOutstanding
        };
      }
      return t;
    }));

    // Update agent outstanding if applicable
    if (receiptData.agentId) {
      setAgents(prev => prev.map(a => {
        if (a.id === receiptData.agentId) {
          return {
            ...a,
            currentOutstanding: Math.max(0, a.currentOutstanding - receiptData.amount)
          };
        }
        return a;
      }));
    }

    logAutomationEvent('Customer Payment Recorded', receiptData.tourCode, `Payment of ₹${receiptData.amount.toLocaleString('en-IN')} recorded (${receiptData.paymentMode}). Receipt ${receiptNo} issued.`);
    return newId;
  };

  const requestSupplierPayment = (voucherData: Omit<SupplierPaymentVoucher, 'id' | 'status'>): string => {
    const newId = `SPV-2026-00${supplierPayments.length + 12}`;
    const newVoucher: SupplierPaymentVoucher = {
      ...voucherData,
      id: newId,
      status: 'pending_approval'
    };
    setSupplierPayments(prev => [newVoucher, ...prev]);
    logAutomationEvent('Supplier Payment Requested', voucherData.tourCode, `Payment request ${newId} for ${voucherData.supplierName} (₹${voucherData.amount.toLocaleString('en-IN')}) sent to Accounts.`);
    return newId;
  };

  const approveSupplierPayment = (voucherId: string, bankReference: string, paymentMode: string) => {
    let affectedTourCode = '';
    let affectedSupplierName = '';
    let affectedAmount = 0;
    let bookingId = '';

    setSupplierPayments(prev => prev.map(sp => {
      if (sp.id === voucherId) {
        affectedTourCode = sp.tourCode;
        affectedSupplierName = sp.supplierName;
        affectedAmount = sp.amount;
        bookingId = sp.supplierBookingId;
        return {
          ...sp,
          status: 'paid',
          bankReference,
          paymentMode,
          paidDate: new Date().toISOString().substring(0, 10),
          approvedBy: 'Bikash Kalita (Accounts Manager)'
        };
      }
      return sp;
    }));

    // Update supplier booking record
    if (bookingId) {
      setSupplierBookings(prev => prev.map(sb => {
        if (sb.id === bookingId) {
          const newPaid = sb.advancePaid + affectedAmount;
          const newBalance = Math.max(0, sb.agreedAmount - newPaid);
          const newStatus = newBalance <= 0 ? 'fully_paid' : 'partially_paid';
          return {
            ...sb,
            advancePaid: newPaid,
            balancePayable: newBalance,
            status: newStatus
          };
        }
        return sb;
      }));
    }

    // Update confirmed tour actual supplier cost paid
    if (affectedTourCode) {
      setConfirmedTours(prev => prev.map(t => {
        if (t.tourCode === affectedTourCode) {
          const newActualSupplierCost = t.actualSupplierCostPaid + affectedAmount;
          const newTotalCost = newActualSupplierCost + t.actualDirectExpenses;
          const newActualGrossProfit = t.totalCollected - newTotalCost;
          return {
            ...t,
            actualSupplierCostPaid: newActualSupplierCost,
            actualTotalCost: newTotalCost,
            actualGrossProfit: newActualGrossProfit,
            profitVariance: newActualGrossProfit - t.projectedGrossProfit
          };
        }
        return t;
      }));
    }

    logAutomationEvent('Supplier Payment Dispatched', affectedTourCode, `Payment of ₹${affectedAmount.toLocaleString('en-IN')} approved and disbursed to ${affectedSupplierName}. Ref: ${bankReference}.`);
  };

  const recordTourExpense = (expenseData: Omit<TourExpense, 'id'>) => {
    const newId = `EXP-2026-00${expenses.length + 15}`;
    const newExp: TourExpense = {
      ...expenseData,
      id: newId
    };
    setExpenses(prev => [newExp, ...prev]);

    // Update tour actual direct expenses
    setConfirmedTours(prev => prev.map(t => {
      if (t.tourCode === expenseData.tourCode) {
        const newDirectExp = t.actualDirectExpenses + expenseData.amount;
        const newTotalCost = t.actualSupplierCostPaid + newDirectExp;
        const newActualGrossProfit = t.totalCollected - newTotalCost;
        return {
          ...t,
          actualDirectExpenses: newDirectExp,
          actualTotalCost: newTotalCost,
          actualGrossProfit: newActualGrossProfit,
          profitVariance: newActualGrossProfit - t.projectedGrossProfit
        };
      }
      return t;
    }));

    logAutomationEvent('Tour On-Ground Expense Recorded', expenseData.tourCode, `Expense of ₹${expenseData.amount.toLocaleString('en-IN')} (${expenseData.category}) logged by ${expenseData.spentBy}.`);
  };

  const reportTourIncident = (incidentData: Omit<TourIncident, 'id' | 'reportedAt' | 'status'>) => {
    const newId = `INC-2026-00${incidents.length + 5}`;
    const newInc: TourIncident = {
      ...incidentData,
      id: newId,
      reportedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'open'
    };
    setIncidents(prev => [newInc, ...prev]);
    logAutomationEvent('Tour Incident / Complaint Reported', incidentData.tourCode, `[${incidentData.severity.toUpperCase()}] ${incidentData.incidentType} reported: ${incidentData.description}`);
  };

  const resolveTourIncident = (incidentId: string, actionTaken: string, costImpact: number) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          actionTaken,
          costImpact,
          status: 'resolved'
        };
      }
      return inc;
    }));
  };

  const updateTourStatus = (tourCode: string, status: TourStatus) => {
    setConfirmedTours(prev => prev.map(t => {
      if (t.tourCode === tourCode) {
        return { ...t, status };
      }
      return t;
    }));
    logAutomationEvent('Tour Status Transition', tourCode, `Tour status updated to: ${status.toUpperCase()}`);
  };

  const closeTourAndReconcile = (tourCode: string, closureNotes: string) => {
    setConfirmedTours(prev => prev.map(t => {
      if (t.tourCode === tourCode) {
        return {
          ...t,
          status: 'closed',
          closureNotes,
          closedAt: new Date().toISOString().substring(0, 10),
          closedBy: 'Monjit Bora (Managing Director)'
        };
      }
      return t;
    }));

    // Release allocated fleet vehicle if any
    setFleet(prev => prev.map(f => {
      if (f.currentTourCode === tourCode) {
        return { ...f, currentStatus: 'available', currentTourCode: undefined };
      }
      return f;
    }));

    logAutomationEvent('Tour Closed & Financially Reconciled', tourCode, `Tour ${tourCode} formally closed and reconciled. P&L locked.`);
  };

  const resetToDemoData = () => {
    localStorage.clear();
    setAgents(INITIAL_AGENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setFleet(INITIAL_FLEET);
    setPackages(INITIAL_PACKAGES);
    setLeads(INITIAL_LEADS);
    setConfirmedTours(INITIAL_CONFIRMED_TOURS);
    setQuotations(INITIAL_QUOTATIONS);
    setSupplierBookings(INITIAL_SUPPLIER_BOOKINGS);
    setReceipts(INITIAL_RECEIPTS);
    setSupplierPayments(INITIAL_SUPPLIER_PAYMENTS);
    setExpenses(INITIAL_EXPENSES);
    setIncidents(INITIAL_INCIDENTS);
    setOperationsTasks(INITIAL_OPERATIONS_TASKS);
    setHandovers(INITIAL_HANDOVERS);
    setAutomationLogs(INITIAL_AUTOMATION_LOGS);
    setEmployees(INITIAL_EMPLOYEES);
    setCurrentEmployee(INITIAL_EMPLOYEES[1]);
    setItineraryShares(INITIAL_ITINERARY_SHARES);
    setFollowUpConfigState(INITIAL_FOLLOWUP_CONFIG);
    setFollowUpActivities(INITIAL_FOLLOWUP_ACTIVITIES);
    setAiIntentAnalyses([]);
    setProformaInvoices(INITIAL_PROFORMA_INVOICES);
    setTaxConfigs(INITIAL_TAX_CONFIG);
    setRateAudits(INITIAL_RATE_AUDITS);
    setSourcingRules(INITIAL_SOURCING_RULES);
    setMasterHotels(INITIAL_MASTER_HOTELS);
    setMasterTransports(INITIAL_MASTER_TRANSPORTS);
    setArrivalDepartures(INITIAL_ARRIVAL_DEPARTURES);
    setInternalMessages(INITIAL_INTERNAL_MESSAGES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIntegrations(INITIAL_INTEGRATIONS);
    setSelectedTourCode(null);
    setPrintableDocument(null);
  };

  // Grounded AI Business Assistant
  const runAiQuery = (prompt: string): { answer: string; relatedTourCodes?: string[] } => {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('depart') || lower.includes('upcoming') || lower.includes('next week')) {
      const upcoming = confirmedTours.filter(t => t.status === 'operations_prep' || t.status === 'confirmed');
      const codes = upcoming.map(u => u.tourCode);
      return {
        answer: `Found ${upcoming.length} upcoming tour(s) preparing for departure:\n• ${upcoming.map(u => `${u.tourCode} (${u.destination}, ${u.packageName}) departing on ${u.startDate} for ${u.clientName}`).join('\n• ')}\n\nAction Recommended: Verify hotel vouchers and driver briefings before travel date.`,
        relatedTourCodes: codes
      };
    }

    if (lower.includes('advance') || lower.includes('unpaid') || lower.includes('due') || lower.includes('payable')) {
      const pendingVouchers = supplierPayments.filter(sp => sp.status === 'pending_approval');
      const pendingBookings = supplierBookings.filter(sb => sb.advancePaid < sb.advanceRequired);
      return {
        answer: `Supplier Advances Status:\n• Pending Accounts Approval: ${pendingVouchers.length} voucher(s) totalling ₹${pendingVouchers.reduce((s, v) => s + v.amount, 0).toLocaleString('en-IN')}.\n• Unfunded Bookings: ${pendingBookings.map(b => `${b.tourCode}: ${b.supplierName} requires ₹${(b.advanceRequired - b.advancePaid).toLocaleString('en-IN')} advance`).join('\n• ')}`,
        relatedTourCodes: pendingBookings.map(b => b.tourCode)
      };
    }

    if (lower.includes('profit') || lower.includes('margin') || lower.includes('lst-2026-00001')) {
      const t = confirmedTours.find(x => x.tourCode === 'LST-2026-00001');
      if (t) {
        return {
          answer: `Financial snapshot for ${t.tourCode} (${t.packageName}):\n• Selling Price: ₹${t.sellingPrice.toLocaleString('en-IN')} (+ ₹${t.gstAmount.toLocaleString('en-IN')} GST)\n• Customer Advance Collected: ₹${t.totalCollected.toLocaleString('en-IN')} (Outstanding: ₹${t.outstandingBalance.toLocaleString('en-IN')})\n• Direct Costs: Supplier Hotel ₹${t.actualSupplierCostPaid.toLocaleString('en-IN')} + Own Fleet Internal Cost ₹${t.estimatedOwnFleetCost.toLocaleString('en-IN')} + On-Ground Expenses ₹${t.actualDirectExpenses.toLocaleString('en-IN')}\n• Projected Gross Margin: ${t.projectedMarginPct.toFixed(1)}% (₹${t.projectedGrossProfit.toLocaleString('en-IN')})\n• Note: Own vehicle AS-01-EC-4021 incurs no vendor cash outflow, preserving cash flow.`,
          relatedTourCodes: [t.tourCode]
        };
      }
    }

    if (lower.includes('outstanding') || lower.includes('agent') || lower.includes('credit')) {
      const owingAgents = agents.filter(a => a.currentOutstanding > 0);
      return {
        answer: `Current B2B Agent Receivables:\n• ${owingAgents.map(a => `${a.companyName}: ₹${a.currentOutstanding.toLocaleString('en-IN')} outstanding against ₹${a.creditLimit.toLocaleString('en-IN')} limit (${a.creditDays} credit days)`).join('\n• ')}\n\nTravelPlanners India currently has highest outstanding balance of ₹1,34,400 linked to Tour Code LST-2026-00001.`,
        relatedTourCodes: ['LST-2026-00001']
      };
    }

    // Default intelligent summary
    return {
      answer: `Let's See DMC System Overview:\n• Confirmed Active Tours: ${confirmedTours.filter(t => t.status === 'on_tour' || t.status === 'operations_prep').length}\n• Pipeline Enquiries: ${leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length}\n• Fleet Utilization: ${fleet.filter(f => f.currentStatus === 'on_tour').length} of ${fleet.length} vehicles active on-road\n• Total Receivables: ₹${confirmedTours.reduce((s, t) => s + t.outstandingBalance, 0).toLocaleString('en-IN')}\n\nYou can query about specific Tour Codes (e.g., LST-2026-00001), supplier advances, upcoming departures, or agent credit limits.`,
      relatedTourCodes: confirmedTours.map(t => t.tourCode)
    };
  };

  // Vendor Proposal Parser
  const parseVendorProposalText = (rawText: string): Partial<TourPackage> => {
    // Smart heuristic extractor for supplier proposal documents
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let name = 'Custom Imported Package';
    let nights = 4;
    let days = 5;
    let destination: any = 'Bhutan';
    let price = 45000;

    if (rawText.toLowerCase().includes('meghalaya') || rawText.toLowerCase().includes('shillong')) destination = 'Meghalaya';
    else if (rawText.toLowerCase().includes('assam') || rawText.toLowerCase().includes('kaziranga')) destination = 'Assam';
    else if (rawText.toLowerCase().includes('arunachal') || rawText.toLowerCase().includes('tawang')) destination = 'Arunachal Pradesh';
    else if (rawText.toLowerCase().includes('bhutan') || rawText.toLowerCase().includes('paro')) destination = 'Bhutan';
    else if (rawText.toLowerCase().includes('nepal') || rawText.toLowerCase().includes('pokhara')) destination = 'Nepal';
    else if (rawText.toLowerCase().includes('thailand') || rawText.toLowerCase().includes('phuket')) destination = 'Thailand';

    const nightsMatch = rawText.match(/(\d+)\s*(?:nights?|n)\s*[\/\-]?\s*(\d+)?\s*(?:days?|d)?/i);
    if (nightsMatch) {
      nights = parseInt(nightsMatch[1], 10);
      days = nightsMatch[2] ? parseInt(nightsMatch[2], 10) : nights + 1;
    }

    const priceMatch = rawText.match(/(?:inr|rs\.?|₹|rate|cost|price)\s*[:=]?\s*([\d,]+)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    }

    const extractedDays: any[] = [];
    let currentDay: any = null;

    lines.forEach(line => {
      const dayHeader = line.match(/^(?:day\s*(\d+)|d(\d+))[:\-\s]+(.*)$/i);
      if (dayHeader) {
        if (currentDay) extractedDays.push(currentDay);
        currentDay = {
          dayNumber: parseInt(dayHeader[1] || dayHeader[2], 10),
          title: dayHeader[3].trim(),
          startLocation: destination,
          endLocation: destination,
          activities: [],
          mealsIncluded: ['Breakfast', 'Dinner']
        };
      } else if (currentDay) {
        currentDay.activities.push(line);
      }
    });
    if (currentDay) extractedDays.push(currentDay);

    if (extractedDays.length === 0) {
      for (let i = 1; i <= days; i++) {
        extractedDays.push({
          dayNumber: i,
          title: `Day ${i}: Destination Excursion & Sightseeing`,
          startLocation: destination,
          endLocation: destination,
          activities: ['Scheduled sightseeing as per supplier proposal'],
          mealsIncluded: ['Breakfast']
        });
      }
    }

    if (lines.length > 0 && lines[0].length < 60) {
      name = lines[0];
    } else {
      name = `${destination} ${nights}N/${days}D Supplier Itinerary`;
    }

    return {
      name,
      packageType: 'vendor',
      destination,
      nights,
      days,
      shortSummary: `Imported vendor proposal for ${destination} (${nights} Nights / ${days} Days).`,
      highlights: ['Extracted from external supplier proposal quotation'],
      itinerary: extractedDays,
      supplierOriginalCost: price,
      standardSellingPrice: Math.round(price * 1.3),
      inclusions: ['Accommodation as specified by supplier', 'Transfers and sightseeing', 'Breakfast and dinner'],
      exclusions: ['Personal expenses', 'Airfare', '5% GST'],
      terms: ['Subject to supplier room availability at time of formal booking']
    };
  };

  // 1. Send Itinerary & Auto-schedule Follow-up
  const sendItinerary = (shareData: Omit<ItineraryShareRecord, 'id' | 'sentAt' | 'deliveryStatus'>): string => {
    const newId = `ISH-2026-00${itineraryShares.length + 10}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    
    // Calculate follow-up date based on followUpConfig.firstFollowUpDays
    const followUpDateObj = new Date();
    followUpDateObj.setDate(followUpDateObj.getDate() + (followUpConfig.firstFollowUpDays || 1));
    const calculatedFollowUpDate = followUpDateObj.toISOString().substring(0, 10);

    const newRecord: ItineraryShareRecord = {
      ...shareData,
      id: newId,
      sentAt: now,
      deliveryStatus: 'delivered',
      followUpDate: calculatedFollowUpDate
    };

    setItineraryShares(prev => [newRecord, ...prev]);

    // Schedule initial FollowUpActivity
    const newFua: FollowUpActivity = {
      id: `FUA-${Date.now()}`,
      enquiryId: shareData.enquiryId,
      itineraryShareId: newId,
      type: shareData.channel === 'WhatsApp' ? 'whatsapp' : 'email',
      isAutomated: true,
      scheduledFor: `${calculatedFollowUpDate} ${followUpConfig.followUpTime || '10:30 AM'}`,
      status: 'pending',
      performedBy: 'System Automation',
      notes: `Scheduled Follow-up #1 via ${shareData.channel} according to ${followUpConfig.firstFollowUpDays}-day rule.`
    };
    setFollowUpActivities(prev => [newFua, ...prev]);

    // Update Lead stage to Follow-up if not already ahead
    setLeads(prev => prev.map(l => {
      if (l.id === shareData.enquiryId && l.stage !== 'Won' && l.stage !== 'Lost' && l.stage !== 'Confirmation Received') {
        return { ...l, stage: 'Follow-up' };
      }
      return l;
    }));

    addNotification({
      category: 'itinerary_sent',
      title: `Itinerary Sent via ${shareData.channel}`,
      message: `Quotation ${shareData.quotationVersionCode || ''} sent to ${shareData.clientName} (${shareData.recipientEmailOrPhone}). Follow-up due on ${calculatedFollowUpDate}.`,
      linkedReference: shareData.enquiryId,
      targetDepartment: 'sales',
      priority: 'normal'
    });

    logAutomationEvent(
      `Itinerary Shared via ${shareData.channel}`,
      shareData.enquiryId,
      `Itinerary ${shareData.itineraryId} (Ver ${shareData.itineraryVersion}) shared with ${shareData.clientName}. Quoted: ₹${shareData.quotedAmount.toLocaleString('en-IN')}. Follow-up scheduled for ${calculatedFollowUpDate}.`,
      shareData.channel
    );

    return newId;
  };

  const updateFollowUpConfig = (config: Partial<FollowUpScheduleConfig>) => {
    setFollowUpConfigState(prev => {
      const updated = { ...prev, ...config };
      logAutomationEvent('Follow-up Rules Updated', 'CONFIG', `Updated follow-up intervals: Day ${updated.firstFollowUpDays}, Day ${updated.secondFollowUpDays}, Day ${updated.thirdFollowUpDays}.`);
      return updated;
    });
  };

  const recordFollowUpActivity = (actData: Omit<FollowUpActivity, 'id' | 'executedAt'>): string => {
    const newId = `FUA-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newActivity: FollowUpActivity = {
      ...actData,
      id: newId,
      executedAt: now
    };
    setFollowUpActivities(prev => [newActivity, ...prev]);

    if (actData.nextFollowUpDate) {
      setItineraryShares(prev => prev.map(s => {
        if (s.enquiryId === actData.enquiryId) {
          return { ...s, followUpDate: actData.nextFollowUpDate! };
        }
        return s;
      }));
    }

    logAutomationEvent(
      `Follow-up Activity (${actData.type.toUpperCase()})`,
      actData.enquiryId,
      `Follow-up logged by ${actData.performedBy}: ${actData.notes}`
    );
    return newId;
  };

  const triggerAutomaticFollowUps = (): { triggeredCount: number; skippedCount: number; logs: string[] } => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const logs: string[] = [];
    let triggeredCount = 0;
    let skippedCount = 0;

    const currentHour = new Date().getHours();
    const quietStart = parseInt(followUpConfig.quietHoursStart.split(':')[0], 10) || 20;
    const quietEnd = parseInt(followUpConfig.quietHoursEnd.split(':')[0], 10) || 9;
    const isQuietHours = currentHour >= quietStart || currentHour < quietEnd;

    itineraryShares.forEach(share => {
      const lead = leads.find(l => l.id === share.enquiryId);
      
      if (!lead || lead.stage === 'Won' || lead.stage === 'Confirmation Received' || lead.stage === 'Lost' || lead.stage === 'On Hold') {
        skippedCount++;
        logs.push(`Skipped ${share.enquiryId}: Lead status is ${lead?.stage || 'Unknown'} (Conversion/Stop safeguard active).`);
        return;
      }

      if (!share.recipientEmailOrPhone || share.recipientEmailOrPhone.trim().length < 5) {
        skippedCount++;
        logs.push(`Skipped ${share.enquiryId}: Invalid recipient address.`);
        return;
      }

      if (share.followUpDate <= todayStr) {
        if (isQuietHours) {
          skippedCount++;
          logs.push(`Delayed ${share.enquiryId}: Quiet hours active (${followUpConfig.quietHoursStart} to ${followUpConfig.quietHoursEnd}).`);
          return;
        }

        triggeredCount++;
        const nextDateObj = new Date();
        nextDateObj.setDate(nextDateObj.getDate() + (followUpConfig.secondFollowUpDays || 3));
        const nextDateStr = nextDateObj.toISOString().substring(0, 10);

        const newFua: FollowUpActivity = {
          id: `FUA-${Date.now()}-${triggeredCount}`,
          enquiryId: share.enquiryId,
          itineraryShareId: share.id,
          type: share.channel === 'WhatsApp' ? 'whatsapp' : 'email',
          isAutomated: true,
          scheduledFor: `${share.followUpDate} 10:30 AM`,
          executedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: 'completed',
          performedBy: 'System Automation',
          notes: `Automatic follow-up ${share.channel} dispatched for proposal ${share.itineraryId}. Advanced next follow-up to ${nextDateStr}.`,
          nextFollowUpDate: nextDateStr
        };

        setFollowUpActivities(prev => [newFua, ...prev]);
        setItineraryShares(prev => prev.map(s => s.id === share.id ? { ...s, followUpDate: nextDateStr } : s));

        addNotification({
          category: 'auto_follow_up_sent',
          title: `Automated Follow-up Dispatched (${share.channel})`,
          message: `Automated follow-up sent to ${share.clientName} (${share.recipientEmailOrPhone}) for ${share.destination} proposal. Next follow-up due: ${nextDateStr}.`,
          linkedReference: share.enquiryId,
          targetDepartment: 'sales',
          priority: 'normal'
        });

        logAutomationEvent(
          `Automated Follow-up (${share.channel})`,
          share.enquiryId,
          `Automated reminder sent to ${share.recipientEmailOrPhone}. Next follow-up set for ${nextDateStr}.`,
          share.channel
        );

        logs.push(`Dispatched automated ${share.channel} follow-up for ${share.enquiryId} (${share.clientName}).`);
      }
    });

    return { triggeredCount, skippedCount, logs };
  };

  const analyzeClientSnippet = (snippet: string, enquiryId: string): AIIntentAnalysis => {
    const lower = snippet.toLowerCase();
    let detectedIntent: AIIntentAnalysis['detectedIntent'] = 'Inactive / Undecided';
    let suggestedLeadStage: LeadStage = 'Follow-up';
    let confidenceScore = 0.85;
    let reasoning = '';
    let suggestedAction = '';

    if (
      lower.includes('confirm') || lower.includes('book') || lower.includes('payment details') || 
      lower.includes('bank account') || lower.includes('proceed') || lower.includes('token') ||
      lower.includes('advance') || lower.includes('finalize')
    ) {
      detectedIntent = 'Converted';
      suggestedLeadStage = 'Confirmation Received';
      confidenceScore = 0.94;
      reasoning = 'Client explicitly requested booking confirmation / payment details to proceed.';
      suggestedAction = 'Generate Proforma Invoice for 25% Token Amount and send bank account details.';
    } else if (
      lower.includes('change') || lower.includes('modify') || lower.includes('instead') || 
      lower.includes('revision') || lower.includes('safari') || lower.includes('hotel') ||
      lower.includes('budget') || lower.includes('expensive') || lower.includes('reduce')
    ) {
      detectedIntent = 'Revision Requested';
      suggestedLeadStage = 'Revision Requested';
      confidenceScore = 0.91;
      reasoning = 'Client requested adjustments to the itinerary, hotels, or pricing.';
      suggestedAction = 'Review requested changes in Itinerary Builder and issue Quotation Revision V2.';
    } else if (
      lower.includes('include') || lower.includes('what about') || lower.includes('permit') || 
      lower.includes('weather') || lower.includes('vehicle') || lower.includes('room')
    ) {
      detectedIntent = 'Information Needed';
      suggestedLeadStage = 'Requirement Understood';
      confidenceScore = 0.88;
      reasoning = 'Client is asking for additional clarifications regarding package inclusions.';
      suggestedAction = 'Reply to client with detailed clarification on inclusions, hotel, and vehicle.';
    } else if (
      lower.includes('postpone') || lower.includes('next month') || lower.includes('next year') || 
      lower.includes('later') || lower.includes('delay') || lower.includes('exam')
    ) {
      detectedIntent = 'Postponed';
      suggestedLeadStage = 'On Hold';
      confidenceScore = 0.89;
      reasoning = 'Client indicated postponement of travel dates.';
      suggestedAction = 'Place enquiry on hold and set follow-up reminder closer to the new dates.';
    } else if (
      lower.includes('cancel') || lower.includes('not interested') || lower.includes('another') || 
      lower.includes('booked with') || lower.includes('dropped') || lower.includes('no longer')
    ) {
      detectedIntent = 'Lost / Not Interested';
      suggestedLeadStage = 'Lost';
      confidenceScore = 0.95;
      reasoning = 'Client explicitly declined or booked with another tour operator.';
      suggestedAction = 'Mark enquiry as Lost with reason and halt automated follow-ups.';
    } else {
      detectedIntent = 'Inactive / Undecided';
      suggestedLeadStage = 'Follow-up';
      confidenceScore = 0.72;
      reasoning = 'Client communication is neutral or undecided.';
      suggestedAction = 'Schedule phone follow-up to understand current decision status.';
    }

    const newAnalysis: AIIntentAnalysis = {
      id: `AI-INT-${Date.now()}`,
      enquiryId,
      clientSnippet: snippet,
      detectedIntent,
      confidenceScore,
      reasoning,
      suggestedLeadStage,
      suggestedAction,
      analyzedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reviewedBySales: false
    };

    setAiIntentAnalyses(prev => [newAnalysis, ...prev]);

    addNotification({
      category: 'ai_intent_detected',
      title: `AI Intent: ${detectedIntent}`,
      message: `Enquiry ${enquiryId} client message classified as "${detectedIntent}" (${Math.round(confidenceScore * 100)}% confidence). Suggested stage: ${suggestedLeadStage}.`,
      linkedReference: enquiryId,
      targetDepartment: 'sales',
      priority: detectedIntent === 'Converted' ? 'urgent' : 'high'
    });

    logAutomationEvent(
      'AI Conversion Intent Classified',
      enquiryId,
      `AI classified client reply as "${detectedIntent}". Suggested action: ${suggestedAction}`
    );

    return newAnalysis;
  };

  const applyAiIntentStage = (analysisId: string) => {
    const analysis = aiIntentAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    setLeads(prev => prev.map(l => {
      if (l.id === analysis.enquiryId) {
        return {
          ...l,
          stage: analysis.suggestedLeadStage
        };
      }
      return l;
    }));

    setAiIntentAnalyses(prev => prev.map(a => a.id === analysisId ? { ...a, reviewedBySales: true, appliedStage: analysis.suggestedLeadStage } : a));

    logAutomationEvent(
      'AI Suggested Status Applied by Sales',
      analysis.enquiryId,
      `Sales reviewed and applied AI suggested stage "${analysis.suggestedLeadStage}" to enquiry ${analysis.enquiryId}.`
    );
  };

  const createProformaInvoice = (piData: Omit<ProformaInvoice, 'id' | 'issuedAt' | 'status' | 'verificationStatus'>): string => {
    const newId = `PI-2026-00${proformaInvoices.length + 10}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newPi: ProformaInvoice = {
      ...piData,
      id: newId,
      issuedAt: now,
      status: 'issued',
      verificationStatus: 'unpaid'
    };
    setProformaInvoices(prev => [newPi, ...prev]);

    addNotification({
      category: 'proforma_created',
      title: 'Proforma Invoice Generated',
      message: `Proforma Invoice ${newId} created for ${piData.clientName} (Token: ₹${piData.tokenAmountPayable.toLocaleString('en-IN')}).`,
      linkedReference: piData.enquiryId,
      targetDepartment: 'sales',
      priority: 'normal'
    });

    logAutomationEvent(
      'Proforma Invoice Issued',
      newId,
      `Proforma Invoice ${newId} issued to ${piData.clientName}. Total: ₹${piData.totalAgreedSellingPrice.toLocaleString('en-IN')}, Token Required: ₹${piData.tokenAmountPayable.toLocaleString('en-IN')} (Includes 5% GST).`
    );
    return newId;
  };

  const uploadPaymentProof = (piId: string, proofUrl: string, proofNotes?: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let clientName = '';
    let tokenAmt = 0;

    setProformaInvoices(prev => prev.map(pi => {
      if (pi.id === piId) {
        clientName = pi.clientName;
        tokenAmt = pi.tokenAmountPayable;
        return {
          ...pi,
          status: 'proof_uploaded',
          verificationStatus: 'pending_verification',
          paymentProofUrl: proofUrl,
          paymentProofUploadedAt: now,
          paymentProofUploadedBy: currentEmployee.name,
          proofNotes
        };
      }
      return pi;
    }));

    addNotification({
      category: 'payment_proof_uploaded',
      title: 'Payment Proof Uploaded - Verify Bank Credit',
      message: `${currentEmployee.name} uploaded payment proof for ${clientName} (${piId}, ₹${tokenAmt.toLocaleString('en-IN')}). Accounts verification required before booking confirmation.`,
      linkedReference: piId,
      targetDepartment: 'accounts',
      priority: 'urgent'
    });

    logAutomationEvent(
      'Client Payment Proof Uploaded',
      piId,
      `Payment proof (${proofUrl}) uploaded by Sales (${currentEmployee.name}) for ${clientName}. Pending Accounts bank verification.`
    );
  };

  const verifyPaymentReceipt = (
    piId: string,
    verified: boolean,
    remarks: string,
    verifiedAmt?: number,
    bankRef?: string,
    paymentMode: string = 'Bank Transfer (NEFT/RTGS)'
  ) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let targetPi: ProformaInvoice | undefined;

    setProformaInvoices(prev => prev.map(pi => {
      if (pi.id === piId) {
        targetPi = pi;
        if (verified) {
          return {
            ...pi,
            status: 'verified_paid',
            verificationStatus: 'verified',
            verifiedByAccounts: currentEmployee.name,
            verifiedAt: now,
            verifiedAmountReceived: verifiedAmt || pi.tokenAmountPayable,
            verifiedBankReference: bankRef || `HDFCR${Date.now()}`,
            verifiedPaymentMode: paymentMode,
            accountsVerificationRemarks: remarks
          };
        } else {
          return {
            ...pi,
            status: 'issued',
            verificationStatus: 'rejected',
            accountsVerificationRemarks: remarks
          };
        }
      }
      return pi;
    }));

    if (targetPi) {
      if (verified) {
        const newRecId = `REC-2026-00${receipts.length + 15}`;
        const newReceipt: CustomerReceipt = {
          id: newRecId,
          tourCode: targetPi.tourCode || `PROV-${targetPi.enquiryId}`,
          clientName: targetPi.clientName,
          agentId: targetPi.agentId,
          amount: verifiedAmt || targetPi.tokenAmountPayable,
          receivedDate: now.substring(0, 10),
          paymentMode: paymentMode as any,
          transactionReference: bankRef || 'BANK-VERIFIED',
          bankAccount: 'HDFC Current A/c 50200088991122',
          receiptNumber: `LST-REC-2026-${receipts.length + 10}`,
          verified: true,
          notes: `Verified against bank statement by Accounts (${currentEmployee.name}). Proforma Ref: ${piId}. Remarks: ${remarks}`
        };
        setReceipts(prev => [newReceipt, ...prev]);

        addNotification({
          category: 'payment_verified',
          title: 'Payment Receipt Verified by Accounts',
          message: `Accounts verified token payment of ₹${(verifiedAmt || targetPi.tokenAmountPayable).toLocaleString('en-IN')} for ${targetPi.clientName} (${piId}). Tour is now ready for final booking confirmation.`,
          linkedReference: targetPi.enquiryId,
          targetDepartment: 'sales',
          priority: 'urgent'
        });

        logAutomationEvent(
          'Payment Verified by Accounts',
          piId,
          `Accounts (${currentEmployee.name}) verified receipt of ₹${(verifiedAmt || targetPi.tokenAmountPayable).toLocaleString('en-IN')} for ${targetPi.clientName}. Bank Ref: ${bankRef}.`
        );
      } else {
        addNotification({
          category: 'payment_rejected',
          title: 'Payment Proof Rejected by Accounts',
          message: `Payment proof for ${targetPi.clientName} (${piId}) was rejected by Accounts. Reason: ${remarks}`,
          linkedReference: targetPi.enquiryId,
          targetDepartment: 'sales',
          priority: 'urgent'
        });

        logAutomationEvent(
          'Payment Proof Rejected by Accounts',
          piId,
          `Accounts (${currentEmployee.name}) rejected payment proof for ${targetPi.clientName}. Reason: ${remarks}`
        );
      }
    }
  };

  const updateTaxConfig = (taxId: string, updates: Partial<TaxConfiguration>) => {
    setTaxConfigs(prev => prev.map(t => t.id === taxId ? { ...t, ...updates, updatedAt: new Date().toISOString().substring(0, 10), updatedBy: currentEmployee.name } : t));
    logAutomationEvent('Tax Configuration Amended', taxId, `GST rate settings updated by ${currentEmployee.name}. Verified by tax advisor flag: ${updates.verifiedByTaxAdvisor ?? 'unchanged'}.`);
  };

  const requestRateChange = (auditData: Omit<RateChangeAudit, 'id' | 'approvalDate' | 'status'>): string => {
    const newId = `RCA-00${rateAudits.length + 10}`;
    const newAudit: RateChangeAudit = {
      ...auditData,
      id: newId,
      approvalDate: 'Pending',
      status: 'pending_accounts_approval'
    };
    setRateAudits(prev => [newAudit, ...prev]);

    addNotification({
      category: 'supplier_advance_requested',
      title: 'Financial Rate Change Approval Requested',
      message: `${auditData.changedBy} requested cost amendment for ${auditData.serviceName} (${auditData.supplierName}): Old ₹${auditData.oldPrice} -> New ₹${auditData.newPrice}. Accounts approval required.`,
      linkedReference: newId,
      targetDepartment: 'accounts',
      priority: 'high'
    });

    logAutomationEvent('Rate Change Requested', newId, `Rate change requested for ${auditData.serviceName} by ${auditData.changedBy}. Pending Accounts approval.`);
    return newId;
  };

  const approveRateChange = (auditId: string, approved: boolean, accountsApprover: string) => {
    const now = new Date().toISOString().substring(0, 10);
    setRateAudits(prev => prev.map(r => {
      if (r.id === auditId) {
        return {
          ...r,
          status: approved ? 'approved' : 'rejected',
          approvedByAccounts: accountsApprover,
          approvalDate: now
        };
      }
      return r;
    }));

    logAutomationEvent(
      approved ? 'Rate Change Approved by Accounts' : 'Rate Change Rejected by Accounts',
      auditId,
      `Rate change audit ${auditId} ${approved ? 'approved' : 'rejected'} by Accounts (${accountsApprover}).`
    );
  };

  const updateSourcingRule = (ruleId: string, updates: Partial<DestinationSourcingRule>) => {
    setSourcingRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updates } : r));
    logAutomationEvent('Destination Sourcing Rule Updated', ruleId, `Sourcing rule updated for ${ruleId}.`);
  };

  const saveMasterHotel = (hotel: MasterHotelRecord) => {
    setMasterHotels(prev => {
      const idx = prev.findIndex(h => h.id === hotel.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = hotel;
        return copy;
      }
      return [hotel, ...prev];
    });
    logAutomationEvent('Master Hotel Record Saved', hotel.id, `Hotel master updated for ${hotel.hotelName} (${hotel.destination}).`);
  };

  const saveMasterTransport = (trp: MasterTransportRecord) => {
    setMasterTransports(prev => {
      const idx = prev.findIndex(t => t.id === trp.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = trp;
        return copy;
      }
      return [trp, ...prev];
    });
    logAutomationEvent('Master Transport Record Saved', trp.id, `Transport master updated for ${trp.model} (${trp.destination}).`);
  };

  const saveArrivalDeparture = (info: ArrivalDepartureInfo) => {
    setArrivalDepartures(prev => {
      const idx = prev.findIndex(a => a.tourCode === info.tourCode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = info;
        return copy;
      }
      return [info, ...prev];
    });

    addNotification({
      category: 'arrival_departure_changed',
      title: 'Arrival / Departure Logistics Updated',
      message: `Pickup & drop details updated for ${info.tourCode} (${info.leadGuestName}). Driver: ${info.assignedDriverName || 'Unassigned'}.`,
      linkedReference: info.tourCode,
      targetDepartment: 'operations',
      priority: 'high'
    });

    logAutomationEvent('Arrival / Departure Info Updated', info.tourCode, `Arrival & Departure logistics updated for ${info.tourCode}. Flight: ${info.arrivalFlightOrTrain}.`);
  };

  const sendInternalMessage = (msgData: Omit<InternalMessage, 'id' | 'timestamp' | 'readBy'>): string => {
    const newId = `MSG-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newMsg: InternalMessage = {
      ...msgData,
      id: newId,
      timestamp: now,
      readBy: [currentEmployee.id]
    };
    setInternalMessages(prev => [newMsg, ...prev]);

    addNotification({
      category: 'enquiry_assigned',
      title: `New Team Message from ${msgData.senderName} (${msgData.senderDepartment.toUpperCase()})`,
      message: `[${msgData.linkedId}] ${msgData.message.substring(0, 80)}...`,
      linkedReference: msgData.linkedId,
      targetDepartment: msgData.targetDepartment,
      priority: msgData.isActionableTask ? 'high' : 'normal'
    });

    return newId;
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addNotification = (notifData: Omit<DmcNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: DmcNotification = {
      ...notifData,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const updateIntegrationSettings = (id: string, settings: Record<string, string>, status?: ExternalIntegrationSpec['status']) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        return {
          ...int,
          apiSettings: { ...int.apiSettings, ...settings },
          status: status || int.status
        };
      }
      return int;
    }));
    logAutomationEvent('Integration Settings Updated', id, `API credentials or configuration updated for ${id}.`);
  };

  return (
    <DmcContext.Provider
      value={{
        selectedDepartment,
        setSelectedDepartment,
        currentUserRole,
        setCurrentUserRole,
        selectedTourCode,
        setSelectedTourCode,
        printableDocument,
        setPrintableDocument,
        employees,
        currentEmployee,
        setCurrentEmployee,
        agents,
        suppliers,
        fleet,
        packages,
        leads,
        confirmedTours,
        quotations,
        supplierBookings,
        receipts,
        supplierPayments,
        expenses,
        incidents,
        operationsTasks,
        handovers,
        automationLogs,
        itineraryShares,
        followUpConfig,
        followUpActivities,
        aiIntentAnalyses,
        proformaInvoices,
        taxConfigs,
        rateAudits,
        sourcingRules,
        masterHotels,
        masterTransports,
        arrivalDepartures,
        internalMessages,
        notifications,
        integrations,
        createLead,
        updateLead,
        savePackage,
        createQuotation,
        addQuotationRevision,
        confirmBookingAndGenerateTourCode,
        submitSalesHandover,
        reviewSalesHandover,
        updateOperationsTask,
        addOperationsTask,
        updateSupplierBooking,
        assignVehicleToTour,
        recordCustomerReceipt,
        requestSupplierPayment,
        approveSupplierPayment,
        recordTourExpense,
        reportTourIncident,
        resolveTourIncident,
        updateTourStatus,
        closeTourAndReconcile,
        resetToDemoData,
        runAiQuery,
        parseVendorProposalText,
        sendItinerary,
        updateFollowUpConfig,
        recordFollowUpActivity,
        triggerAutomaticFollowUps,
        analyzeClientSnippet,
        applyAiIntentStage,
        createProformaInvoice,
        uploadPaymentProof,
        verifyPaymentReceipt,
        updateTaxConfig,
        requestRateChange,
        approveRateChange,
        updateSourcingRule,
        saveMasterHotel,
        saveMasterTransport,
        saveArrivalDeparture,
        sendInternalMessage,
        markNotificationRead,
        addNotification,
        updateIntegrationSettings
      }}
    >
      {children}
    </DmcContext.Provider>
  );
};

export const useDmc = () => {
  const context = useContext(DmcContext);
  if (!context) {
    throw new Error('useDmc must be used within a DmcProvider');
  }
  return context;
};
