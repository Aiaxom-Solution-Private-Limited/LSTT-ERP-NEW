export type Department = 'sales' | 'backend' | 'operations' | 'accounts' | 'executive';

export type UserRole = Department | 'field';

export type DestinationRegion = 
  | 'Meghalaya'
  | 'Assam'
  | 'Arunachal Pradesh'
  | 'Sikkim & Darjeeling'
  | 'Nagaland & Manipur'
  | 'Bhutan'
  | 'Nepal'
  | 'Thailand'
  | 'Vietnam'
  | 'Central Asia'
  | 'Other';

export type LeadSource = 
  | 'Website'
  | 'WhatsApp'
  | 'B2B Agent'
  | 'Email'
  | 'Google Ads'
  | 'Meta Ads'
  | 'Referral'
  | 'Walk-in'
  | 'Corporate';

export type LeadStage =
  | 'New Enquiry'
  | 'Assigned'
  | 'Contacted'
  | 'Requirement Understood'
  | 'Itinerary Preparation'
  | 'Costing'
  | 'Quotation Sent'
  | 'Follow-up'
  | 'Negotiation'
  | 'Revision Requested'
  | 'Awaiting Confirmation'
  | 'Confirmation Received'
  | 'Won'
  | 'Lost'
  | 'On Hold';

export type TourStatus =
  | 'confirmed'
  | 'operations_prep'
  | 'vouchers_issued'
  | 'on_tour'
  | 'completed'
  | 'reconciled'
  | 'closed'
  | 'cancelled';

export interface B2BAgent {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  gstNumber?: string;
  creditAllowed: boolean;
  creditLimit: number; // in INR
  creditDays: number;
  currentOutstanding: number;
  assignedSalesperson: string;
  totalBookings: number;
  totalRevenue: number;
  status: 'active' | 'watch_list' | 'blocked';
}

export interface LeadSelectedItinerary {
  packageId?: string;
  title: string;
  isCustom: boolean;
  nights: number;
  days: number;
  daysList: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
}

export interface LeadEnquiry {
  id: string; // ENQ-2026-XXXX
  leadDate: string;
  referenceId?: string;
  tags?: string[];
  source: LeadSource;
  sourceDetail?: string;
  agentId?: string; // If B2B agent
  salutation?: string;
  clientName: string;
  contactPerson: string;
  countryCode?: string;
  phone: string;
  additionalPhones?: string[];
  email: string;
  guestCity?: string;
  destination: DestinationRegion;
  travelStartDate: string;
  travelEndDate: string;
  nights: number;
  days: number;
  flexibleDates: boolean;
  adults: number;
  children: number;
  childAges?: number[];
  infants: number;
  focCount?: number;
  roomCount: number;
  hotelCategoryPreference: 'Budget (2-Star)' | 'Standard (3-Star)' | 'Deluxe (4-Star)' | 'Luxury (5-Star / Heritage)';
  transportPreference: 'Sedan' | 'SUV (Innova)' | 'Tempo Traveller' | 'Coach' | 'Self / None';
  assignedTo: string;
  createdBy?: string;
  createdAt?: string;
  stage: LeadStage;
  priority: 'High' | 'Medium' | 'Low';
  budgetEstimate?: number;
  notes: string;
  lostReason?: string;
  quotationIds: string[];
  confirmedTourCode?: string;
  selectedItinerary?: LeadSelectedItinerary;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  startLocation: string;
  endLocation: string;
  distanceKm?: number;
  durationHours?: number;
  activities: string[];
  mealsIncluded: ('Breakfast' | 'Lunch' | 'Dinner')[];
  hotelName?: string;
  hotelCity?: string;
  transportNotes?: string;
  internalNotes?: string;
}

export interface TourPackage {
  id: string;
  name: string;
  packageType: 'own' | 'vendor' | 'hybrid' | 'custom';
  destination: DestinationRegion;
  nights: number;
  days: number;
  shortSummary: string;
  highlights: string[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  supplierId?: string; // For vendor package
  supplierOriginalCost?: number;
  standardSellingPrice: number;
  terms: string[];
  active: boolean;
}

export type CostComponentType = 'hotel' | 'transport' | 'activity' | 'guide' | 'permit' | 'meals' | 'other';
export type ComponentSourceType = 'own_fleet' | 'external_supplier' | 'internal_estimate';

export interface CostComponent {
  id: string;
  category: CostComponentType;
  description: string;
  supplierId?: string; // if external
  supplierName?: string;
  sourceType: ComponentSourceType; // own_fleet vs external_supplier
  vehicleId?: string; // if own_fleet
  quantity: number;
  daysOrNights: number;
  unitCost: number;
  totalCost: number;
  advancePercentageRequired: number; // 0 for own fleet, e.g. 30-50% for hotels
  advanceAmountRequired: number;
  notes?: string;
}

export interface QuotationRevision {
  version: number; // 1, 2, 3
  versionCode: string; // QT-2026-0001-V1
  createdAt: string;
  createdBy: string;
  costComponents: CostComponent[];
  totalDirectCost: number; // Supplier + Own fleet operational cost
  externalSupplierPayables: number;
  ownFleetInternalCost: number;
  markupAmount: number;
  markupPercentage: number;
  subtotalSellingPrice: number;
  gstPercentage: number; // e.g. 5% on tour packages
  gstAmount: number;
  finalSellingPrice: number;
  changeReason?: string;
  itinerarySnapshot: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  paymentTerms: string;
  status: 'draft' | 'sent' | 'client_review' | 'revision_requested' | 'accepted' | 'rejected';
}

export interface Quotation {
  id: string; // QT-2026-XXXX
  enquiryId: string;
  clientName: string;
  agentId?: string;
  destination: DestinationRegion;
  startDate: string;
  endDate: string;
  paxCount: number;
  currentVersion: number;
  revisions: QuotationRevision[];
  activeVersionCode: string;
  confirmedTourCode?: string;
}

export type HandoverStatus = 
  | 'draft'
  | 'ready_for_handover'
  | 'submitted'
  | 'pending_operations_acceptance'
  | 'accepted'
  | 'clarification_required'
  | 'returned_to_sales'
  | 'operational_planning'
  | 'booking_in_progress'
  | 'operationally_confirmed'
  | 'pending_review' // legacy fallback
  | 'clarification_requested'; // legacy fallback

export interface SalesHandover {
  tourCode: string;
  enquiryId?: string;
  quotationId?: string;
  confirmedItineraryVersion?: number;
  submittedBy: string;
  submittedAt: string;
  status: HandoverStatus;
  destination: DestinationRegion;
  paxCount: number;
  travelDates: string;
  specialRequests: string;
  flightArrivalDetails: string;
  flightDepartureDetails: string;
  roomingConfiguration: string;
  salesCommitments: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: 'Hotel' | 'Transport Vendor' | 'Local DMC' | 'Activity Provider' | 'Guide Association';
  destination: DestinationRegion;
  contactPerson: string;
  phone: string;
  email: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  creditDaysAllowed: number;
  standardAdvanceRequirementPct: number;
  currentBalancePayable: number;
  status: 'active' | 'suspended';
}

export interface FleetVehicle {
  id: string;
  registrationNumber: string; // AS-01-EC-4021
  model: string; // Toyota Innova Crysta
  category: 'SUV' | 'Tempo Traveller' | 'Sedan';
  seatingCapacity: number;
  driverName: string;
  driverPhone: string;
  driverLicenseNumber: string;
  internalDailyRate: number; // e.g. 3500 INR/day (fuel+driver+wear)
  currentStatus: 'available' | 'on_tour' | 'maintenance';
  currentTourCode?: string;
  insuranceValidTill: string;
  fitnessValidTill: string;
}

export interface SupplierBookingRecord {
  id: string; // SB-2026-XXXX
  tourCode: string;
  supplierId: string;
  supplierName: string;
  category: 'Hotel' | 'Transport' | 'Activity' | 'Guide' | 'Permit';
  details: string; // e.g. "Polo Towers Shillong - 2x Executive Rooms, MAPAI"
  destination: DestinationRegion;
  checkInDate?: string;
  checkOutDate?: string;
  agreedAmount: number;
  advanceRequired: number;
  advancePaid: number;
  balancePayable: number;
  dueDate: string;
  confirmationReference?: string; // Hotel voucher or confirmation code
  status: 'enquiry' | 'availability_confirmed' | 'booked_confirmed' | 'partially_paid' | 'fully_paid' | 'cancelled';
  voucherGenerated: boolean;
}

export interface OperationsTask {
  id: string;
  tourCode: string;
  destination: DestinationRegion;
  category: 'hotel' | 'transport' | 'guide' | 'permit' | 'voucher' | 'briefing';
  title: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  notes?: string;
}

export interface CustomerReceipt {
  id: string; // REC-2026-XXXX
  tourCode: string;
  clientName: string;
  agentId?: string;
  amount: number;
  receivedDate: string;
  paymentMode: 'Bank Transfer (NEFT/RTGS)' | 'UPI' | 'Credit Card' | 'Cheque' | 'Cash';
  transactionReference: string;
  bankAccount: string;
  receiptNumber: string;
  verified: boolean;
  notes?: string;
}

export interface SupplierPaymentVoucher {
  id: string; // SPV-2026-XXXX
  supplierBookingId: string;
  tourCode: string;
  supplierId: string;
  supplierName: string;
  paymentType: 'advance' | 'balance' | 'full';
  amount: number;
  dueBy: string;
  paidDate?: string;
  status: 'pending_approval' | 'approved' | 'paid' | 'rejected';
  approvedBy?: string;
  bankReference?: string;
  paymentMode?: string;
  notes?: string;
}

export interface TourExpense {
  id: string; // EXP-2026-XXXX
  tourCode: string;
  category: 'Driver Fuel' | 'Toll & Parking' | 'Entry Permits' | 'Local Purchases' | 'Emergency Repair' | 'Guide Tip' | 'Other';
  amount: number;
  spentDate: string;
  spentBy: string; // Driver, Guide or Tour Manager
  billAttached: boolean;
  description: string;
  status: 'approved' | 'reimbursed' | 'pending';
}

export interface TourIncident {
  id: string;
  tourCode: string;
  reportedAt: string;
  reportedBy: string;
  incidentType: 'Hotel Room Issue' | 'Vehicle Delay / Breakdown' | 'Weather & Road Blockage' | 'Guest Health / Medical' | 'Itinerary Modification' | 'Service Quality Complaint';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionTaken: string;
  costImpact: number;
  status: 'open' | 'resolved';
}

export interface GuestTraveller {
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  idProofType: 'Aadhaar' | 'Passport' | 'Voter ID';
  idNumber: string;
  contactNumber?: string;
  roomAllocation?: string;
  specialNeeds?: string;
}

export interface ConfirmedTour {
  tourCode: string; // LST-2026-XXXXX
  enquiryId: string;
  bookingId: string;
  quotationCode: string;
  quotationVersion: number;
  clientName: string;
  agentId?: string;
  destination: DestinationRegion;
  packageName: string;
  startDate: string;
  endDate: string;
  nights: number;
  days: number;
  adults: number;
  children: number;
  infants: number;
  travellers: GuestTraveller[];
  assignedSalesperson: string;
  assignedOperationsLead: string;
  status: TourStatus;
  
  // Commercials Locked at Confirmation
  sellingPrice: number;
  gstAmount: number;
  totalReceivable: number;
  totalCollected: number;
  outstandingBalance: number;
  
  // Costing Baseline vs Actual
  estimatedSupplierCost: number;
  estimatedOwnFleetCost: number;
  totalEstimatedCost: number;
  projectedGrossProfit: number;
  projectedMarginPct: number;
  
  // Live Actuals
  actualSupplierCostPaid: number;
  actualDirectExpenses: number;
  actualTotalCost: number;
  actualGrossProfit: number;
  profitVariance: number; // actual - projected
  
  // Vehicle Setup
  transportSource: 'own_fleet' | 'hired_vendor' | 'mixed';
  allocatedVehicleId?: string;
  allocatedDriverName?: string;
  allocatedDriverPhone?: string;

  // Itinerary snapshot
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  
  // Closure Details
  closureNotes?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  event: string;
  targetReference: string; // e.g. TourCode or LeadID
  description: string;
  channel: 'System' | 'Email' | 'WhatsApp';
  status: 'success' | 'delivered';
}

// ==========================================
// 1. Employee & ID-wise Sales Management
// ==========================================
export interface Employee {
  id: string; // EMP-101
  loginId: string; // ritu.sharma
  name: string;
  email: string;
  phone: string;
  department: Department;
  roleTitle: string;
  isManager: boolean;
  active: boolean;
}

export interface SalespersonReportRow {
  employeeId: string;
  employeeName: string;
  loginId: string;
  department: Department;
  enquiryId: string;
  enquiryDate: string;
  leadSource: LeadSource;
  destination: DestinationRegion;
  clientOrAgentName: string;
  itineraryId: string;
  itinerarySentDate: string;
  sendingChannel: 'Email' | 'WhatsApp';
  followUpsCount: number;
  lastFollowUpDate: string;
  nextFollowUpDate: string;
  quotationAmount: number;
  bookingStatus: string;
  conversionStatus: LeadStage;
  tourCode?: string;
  confirmedSellingPrice?: number;
  advanceStatus: string;
  paymentVerificationStatus: string;
  lostReason?: string;
}

// ==========================================
// 2. Itinerary Sharing & Follow-up Workflow
// ==========================================
export interface ItineraryShareRecord {
  id: string; // ISH-2026-0001
  enquiryId: string;
  clientName: string;
  recipientEmailOrPhone: string;
  channel: 'Email' | 'WhatsApp';
  sentAt: string;
  salespersonId: string;
  salespersonLogin: string;
  salespersonName: string;
  itineraryId: string;
  itineraryVersion: number;
  quotationId?: string;
  quotationVersionCode?: string;
  destination: DestinationRegion;
  travelDates: string;
  guestCount: number;
  quotedAmount: number;
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed';
  followUpDate: string;
  enquiryStatus: LeadStage;
  itinerarySnapshot: ItineraryDay[]; // exact snapshot preserved
  messageBody?: string;
}

export interface FollowUpScheduleConfig {
  firstFollowUpDays: number; // e.g. 1
  secondFollowUpDays: number; // e.g. 3
  thirdFollowUpDays: number; // e.g. 5
  maxFollowUpAttempts: number; // e.g. 4
  preferredChannel: 'Email' | 'WhatsApp' | 'Alternate';
  scheduleType: 'calendar_days' | 'working_days';
  followUpTime: string; // e.g. "10:30 AM"
  quietHoursStart: string; // e.g. "20:00"
  quietHoursEnd: string; // e.g. "09:00"
  stopOnClientConversion: boolean;
  stopOnLost: boolean;
  stopOnClientOptOut: boolean;
}

export interface FollowUpActivity {
  id: string;
  enquiryId: string;
  itineraryShareId?: string;
  type: 'email' | 'whatsapp' | 'call' | 'internal_remark' | 'schedule_change';
  isAutomated: boolean;
  scheduledFor: string;
  executedAt?: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  performedBy: string; // employee name or 'System Automation'
  notes: string;
  clientResponseSummary?: string;
  nextFollowUpDate?: string;
}

export interface AIIntentAnalysis {
  id: string;
  enquiryId: string;
  clientSnippet: string;
  detectedIntent: 'Converted' | 'Revision Requested' | 'Information Needed' | 'Postponed' | 'Lost / Not Interested' | 'Inactive / Undecided';
  confidenceScore: number; // 0.0 - 1.0
  reasoning: string;
  suggestedLeadStage: LeadStage;
  suggestedAction: string;
  analyzedAt: string;
  reviewedBySales: boolean;
  appliedStage?: LeadStage;
}

// ==========================================
// 3. Proforma Invoices & Accounts Verification
// ==========================================
export interface ProformaInvoice {
  id: string; // PI-2026-0001
  enquiryId: string;
  quotationId: string;
  quotationVersionCode: string;
  tourCode?: string;
  clientName: string;
  agentId?: string;
  contactEmail: string;
  contactPhone: string;
  destination: DestinationRegion;
  travelDates: string;
  paxCount: number;
  totalAgreedSellingPrice: number;
  tokenPercentage: number; // e.g. 25% or 30%
  tokenAmountPayable: number;
  gstRate: number; // 5% initial
  gstAmount: number;
  paymentDueDate: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string;
  };
  termsAndConditions: string[];
  status: 'draft' | 'issued' | 'proof_uploaded' | 'verified_paid' | 'cancelled';
  issuedAt: string;
  issuedBy: string;
  
  // Payment Proof by Sales
  paymentProofUrl?: string; // screenshot reference or bank slip
  paymentProofUploadedAt?: string;
  paymentProofUploadedBy?: string;
  proofNotes?: string;
  
  // Accounts Verification by Finance
  verifiedByAccounts?: string;
  verifiedAt?: string;
  verifiedAmountReceived?: number;
  verifiedBankReference?: string;
  verifiedPaymentMode?: string;
  accountsVerificationRemarks?: string;
  verificationStatus: 'unpaid' | 'pending_verification' | 'verified' | 'rejected';
}

// ==========================================
// 4. GST & Financial Rate Configuration
// ==========================================
export interface TaxConfiguration {
  id: string;
  taxName: string; // e.g. "GST on Tour Packages (Inbound & Domestic DMC)"
  ratePct: number; // 5% default
  cgstPct: number; // 2.5%
  sgstPct: number; // 2.5%
  igstPct: number; // 5%
  applicableCategory: 'tour_package' | 'hotel_only' | 'transport_only' | 'international';
  calculationMethod: 'tax_exclusive' | 'tax_inclusive';
  effectiveDate: string;
  verifiedByTaxAdvisor: boolean;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RateChangeAudit {
  id: string;
  serviceType: 'hotel' | 'transport' | 'package' | 'activity';
  serviceName: string;
  supplierName: string;
  destination: DestinationRegion;
  oldPrice: number;
  newPrice: number;
  reasonForChange: string;
  changedBy: string;
  approvedByAccounts: string;
  approvalDate: string;
  status: 'pending_accounts_approval' | 'approved' | 'rejected';
  tourCode?: string;
}

// ==========================================
// 5. Destination Sourcing Rules & Masters
// ==========================================
export interface DestinationSourcingRule {
  id: string;
  destination: DestinationRegion;
  isNortheastIndia: boolean;
  defaultTransportSource: 'own_fleet' | 'external_vendor';
  allowExternalVendorException: boolean;
  requiresAdminApprovalForExternal: boolean;
  notes: string;
}

export interface MasterHotelRecord {
  id: string;
  hotelName: string;
  destination: DestinationRegion;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: 'Budget (2-Star)' | 'Standard (3-Star)' | 'Deluxe (4-Star)' | 'Luxury (5-Star / Heritage)';
  roomCategories: string[];
  mealPlans: ('EP' | 'CP' | 'MAP' | 'AP')[];
  contractRatePerNight: number;
  peakSeasonSurchargePct: number;
  cancellationPolicy: string;
  supplierId: string;
  active: boolean;
}

export interface MasterTransportRecord {
  id: string;
  category: 'SUV' | 'Tempo Traveller' | 'Sedan' | 'Coach';
  model: string;
  seatingCapacity: number;
  destination: DestinationRegion;
  isCompanyFleet: boolean;
  internalDailyRate: number; // for company fleet
  vendorContractRatePerDay?: number; // for external vendors
  supplierId?: string;
  fuelIncluded: boolean;
  driverAllowanceIncluded: boolean;
  active: boolean;
}

// ==========================================
// 6. Arrival & Departure Logistics
// ==========================================
export interface ArrivalDepartureInfo {
  tourCode: string;
  enquiryId?: string;
  leadGuestName: string;
  contactPhone: string;
  paxCount: number;
  
  // Arrival
  arrivalDate: string;
  arrivalTime: string;
  arrivalPoint: string; // e.g. "Guwahati Airport (GAU) - Lokpriya Gopinath Bordoloi"
  arrivalFlightOrTrain: string; // "6E-6548"
  pickupAddress: string;
  
  // Departure
  departureDate: string;
  departureTime: string;
  departurePoint: string; // e.g. "Guwahati Airport"
  departureFlightOrTrain: string;
  dropAddress: string;
  
  luggageDetails?: string;
  emergencyContact: string;
  specialInstructions?: string;
  
  // Operations Allocation
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedVehiclePlate?: string;
  status: 'pending_assignment' | 'vehicle_assigned' | 'in_transit' | 'completed';
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// 7. Internal Team Communication
// ==========================================
export interface InternalMessage {
  id: string;
  linkedType: 'tour_code' | 'enquiry_id';
  linkedId: string; // e.g. "LST-2026-00001" or "ENQ-2026-0001"
  senderDepartment: Department;
  senderEmployeeId: string;
  senderName: string;
  senderLogin: string;
  targetDepartment: Department | 'all';
  message: string;
  timestamp: string;
  attachmentName?: string;
  mentionedEmployees?: string[];
  isActionableTask?: boolean;
  taskConvertedId?: string;
  readBy: string[]; // employeeIds who read it
}

// ==========================================
// 8. Notifications Center
// ==========================================
export interface DmcNotification {
  id: string;
  category: 
    | 'enquiry_assigned'
    | 'itinerary_sent'
    | 'follow_up_due'
    | 'auto_follow_up_sent'
    | 'client_replied'
    | 'ai_intent_detected'
    | 'revision_requested'
    | 'booking_confirmation_submitted'
    | 'proforma_created'
    | 'payment_proof_uploaded'
    | 'payment_verified'
    | 'payment_rejected'
    | 'handover_submitted'
    | 'handover_clarification'
    | 'handover_accepted'
    | 'hotel_confirmed'
    | 'transport_assigned'
    | 'supplier_advance_requested'
    | 'supplier_payment_processed'
    | 'arrival_departure_changed'
    | 'tour_completed';
  title: string;
  message: string;
  linkedReference: string; // TourCode or EnquiryId
  targetDepartment: Department | 'all';
  targetEmployeeId?: string;
  timestamp: string;
  read: boolean;
  priority: 'normal' | 'high' | 'urgent';
}

// ==========================================
// 9. External Integrations Specifications
// ==========================================
export interface ExternalIntegrationSpec {
  id: string;
  name: string;
  provider: string;
  category: 'whatsapp' | 'email' | 'ai' | 'scheduler' | 'payment_gateway';
  status: 'active_simulator' | 'configured' | 'pending_credentials';
  isMandatory: boolean;
  officialDocUrl: string;
  requiredCredentials: string[];
  estimatedCost: string;
  technicalLimitations: string[];
  setupGuide: string[];
  apiSettings: Record<string, string>;
}
