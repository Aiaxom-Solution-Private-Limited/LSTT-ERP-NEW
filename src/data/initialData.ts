import {
  B2BAgent,
  LeadEnquiry,
  TourPackage,
  Supplier,
  FleetVehicle,
  ConfirmedTour,
  SupplierBookingRecord,
  OperationsTask,
  CustomerReceipt,
  SupplierPaymentVoucher,
  TourExpense,
  TourIncident,
  Quotation,
  SalesHandover,
  AutomationLog,
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

export const INITIAL_AGENTS: B2BAgent[] = [
  {
    id: 'AGT-101',
    companyName: 'TravelPlanners India Pvt. Ltd.',
    contactPerson: 'Karan Mehra',
    phone: '+91 98201 44552',
    whatsapp: '+91 98201 44552',
    email: 'karan@travelplanners.in',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstNumber: '27AABCT8841Q1ZP',
    creditAllowed: true,
    creditLimit: 500000,
    creditDays: 30,
    currentOutstanding: 134400,
    assignedSalesperson: 'Ritu Sharma',
    totalBookings: 18,
    totalRevenue: 2840000,
    status: 'active'
  },
  {
    id: 'AGT-102',
    companyName: 'Nirvana Holidays Delhi',
    contactPerson: 'Sunita Chawla',
    phone: '+91 98112 33441',
    whatsapp: '+91 98112 33441',
    email: 'sunita@nirvanaholidays.com',
    city: 'New Delhi',
    state: 'Delhi',
    gstNumber: '07AAACN4412R1ZU',
    creditAllowed: true,
    creditLimit: 350000,
    creditDays: 21,
    currentOutstanding: 85000,
    assignedSalesperson: 'Amit Baruah',
    totalBookings: 12,
    totalRevenue: 1720000,
    status: 'active'
  },
  {
    id: 'AGT-103',
    companyName: 'BlueSky Trips Kolkata',
    contactPerson: 'Subhash Roy',
    phone: '+91 98300 77123',
    whatsapp: '+91 98300 77123',
    email: 'subhash@blueskytrips.net',
    city: 'Kolkata',
    state: 'West Bengal',
    gstNumber: '19AAECB9123L1ZM',
    creditAllowed: false, // strictly advance-only
    creditLimit: 0,
    creditDays: 0,
    currentOutstanding: 0,
    assignedSalesperson: 'Ritu Sharma',
    totalBookings: 9,
    totalRevenue: 890000,
    status: 'active'
  },
  {
    id: 'AGT-104',
    companyName: 'Royal Expeditions Bengaluru',
    contactPerson: 'Deepak Rao',
    phone: '+91 99001 88992',
    whatsapp: '+91 99001 88992',
    email: 'deepak@royalexpeditions.co',
    city: 'Bengaluru',
    state: 'Karnataka',
    gstNumber: '29AAGCR6710K1ZT',
    creditAllowed: true,
    creditLimit: 600000,
    creditDays: 30,
    currentOutstanding: 45000,
    assignedSalesperson: 'Pooja Kalita',
    totalBookings: 15,
    totalRevenue: 2450000,
    status: 'active'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-H-01',
    name: 'Hotel Polo Towers Shillong',
    category: 'Hotel',
    destination: 'Meghalaya',
    contactPerson: 'Sengupta Das (Reservations)',
    phone: '+91 364 2222341',
    email: 'reservations@polotowers.com',
    bankDetails: {
      accountName: 'Polo Towers Hotels Pvt Ltd',
      bankName: 'HDFC Bank Shillong',
      accountNumber: '50200018899214',
      ifscCode: 'HDFC0000341'
    },
    creditDaysAllowed: 15,
    standardAdvanceRequirementPct: 50,
    currentBalancePayable: 22000,
    status: 'active'
  },
  {
    id: 'SUP-H-02',
    name: 'Ri Kynjai Serenity by the Lake',
    category: 'Hotel',
    destination: 'Meghalaya',
    contactPerson: 'Balaram Nongbri',
    phone: '+91 98624 20300',
    email: 'booking@rikynjai.com',
    bankDetails: {
      accountName: 'Ri Kynjai Resorts LLP',
      bankName: 'State Bank of India',
      accountNumber: '312889901452',
      ifscCode: 'SBIN0000181'
    },
    creditDaysAllowed: 7,
    standardAdvanceRequirementPct: 50,
    currentBalancePayable: 18500,
    status: 'active'
  },
  {
    id: 'SUP-H-03',
    name: 'Diphlu River Lodge Kaziranga',
    category: 'Hotel',
    destination: 'Assam',
    contactPerson: 'Mridul Saikia',
    phone: '+91 94351 12040',
    email: 'stay@diphluriverlodge.com',
    bankDetails: {
      accountName: 'Assam Bengal Navigation Hospitality',
      bankName: 'Axis Bank Guwahati',
      accountNumber: '912020041238910',
      ifscCode: 'UTIB0000140'
    },
    creditDaysAllowed: 10,
    standardAdvanceRequirementPct: 60,
    currentBalancePayable: 34000,
    status: 'active'
  },
  {
    id: 'SUP-H-04',
    name: 'Le Meridien Thimphu',
    category: 'Hotel',
    destination: 'Bhutan',
    contactPerson: 'Tashi Wangchuk',
    phone: '+975 2 337788',
    email: 'reservations.thimphu@lemeridien.com',
    bankDetails: {
      accountName: 'Starwood Bhutan Hospitality',
      bankName: 'Bank of Bhutan Thimphu',
      accountNumber: '100234190',
      ifscCode: 'BOBTBT22'
    },
    creditDaysAllowed: 0,
    standardAdvanceRequirementPct: 100,
    currentBalancePayable: 0,
    status: 'active'
  },
  {
    id: 'SUP-T-01',
    name: 'Northeast Translines Fleet & Logistics',
    category: 'Transport Vendor',
    destination: 'Assam',
    contactPerson: 'Pranjal Deka',
    phone: '+91 98640 99881',
    email: 'ops@northeasttranslines.com',
    bankDetails: {
      accountName: 'Northeast Translines Enterprise',
      bankName: 'ICICI Bank Guwahati G.S. Road',
      accountNumber: '006105011928',
      ifscCode: 'ICIC0000061'
    },
    creditDaysAllowed: 15,
    standardAdvanceRequirementPct: 30,
    currentBalancePayable: 14000,
    status: 'active'
  },
  {
    id: 'SUP-A-01',
    name: 'Cherrapunjee Treks & Caving Association',
    category: 'Activity Provider',
    destination: 'Meghalaya',
    contactPerson: 'Bah Kmenlang',
    phone: '+91 97740 55112',
    email: 'cherra.guides@gmail.com',
    bankDetails: {
      accountName: 'Kmenlang Guides Society',
      bankName: 'Meghalaya Rural Bank',
      accountNumber: '7021199451',
      ifscCode: 'PUNB0RRBMGB'
    },
    creditDaysAllowed: 0,
    standardAdvanceRequirementPct: 0,
    currentBalancePayable: 3500,
    status: 'active'
  },
  {
    id: 'SUP-D-01',
    name: 'Siam Horizon DMC Bangkok',
    category: 'Local DMC',
    destination: 'Thailand',
    contactPerson: 'Somchai Prasert',
    phone: '+66 2 245 8890',
    email: 'b2b@siamhorizondmc.com',
    bankDetails: {
      accountName: 'Siam Horizon Travel Co Ltd',
      bankName: 'Kasikorn Bank Bangkok',
      accountNumber: '018-2-44910-1',
      ifscCode: 'KASITHBK'
    },
    creditDaysAllowed: 7,
    standardAdvanceRequirementPct: 50,
    currentBalancePayable: 0,
    status: 'active'
  }
];

export const INITIAL_FLEET: FleetVehicle[] = [
  {
    id: 'FLT-01',
    registrationNumber: 'AS-01-EC-4021',
    model: 'Toyota Innova Crysta 2.4 VX (7-Seater)',
    category: 'SUV',
    seatingCapacity: 6,
    driverName: 'Ramen Das',
    driverPhone: '+91 98640 12345',
    driverLicenseNumber: 'AS-01-2016-004419',
    internalDailyRate: 3800, // Includes driver wage & wear estimate
    currentStatus: 'on_tour',
    currentTourCode: 'LST-2026-00001',
    insuranceValidTill: '2027-04-15',
    fitnessValidTill: '2027-03-30'
  },
  {
    id: 'FLT-02',
    registrationNumber: 'AS-01-TC-8890',
    model: 'Force Urbania Luxury Van (17-Seater Pushback)',
    category: 'Tempo Traveller',
    seatingCapacity: 16,
    driverName: 'Bipul Bora',
    driverPhone: '+91 94350 67890',
    driverLicenseNumber: 'AS-01-2014-009182',
    internalDailyRate: 6500,
    currentStatus: 'available',
    insuranceValidTill: '2027-08-20',
    fitnessValidTill: '2027-06-15'
  },
  {
    id: 'FLT-03',
    registrationNumber: 'AS-01-MC-1205',
    model: 'Mahindra Scorpio-N 4x4 (6-Seater)',
    category: 'SUV',
    seatingCapacity: 5,
    driverName: 'Dipen Gogoi',
    driverPhone: '+91 97060 45678',
    driverLicenseNumber: 'AS-01-2018-001290',
    internalDailyRate: 3400,
    currentStatus: 'available',
    insuranceValidTill: '2027-01-10',
    fitnessValidTill: '2026-12-31'
  }
];

export const INITIAL_PACKAGES: TourPackage[] = [
  {
    id: 'PKG-MEGH-01',
    name: 'Mesmerising Meghalaya: Waterfalls & Living Roots',
    packageType: 'own',
    destination: 'Meghalaya',
    nights: 5,
    days: 6,
    shortSummary: 'Guwahati - Umiam Lake - Shillong - Cherrapunjee - Mawlynnong - Dawki - Guwahati complete circuit with double-decker living root bridge.',
    highlights: [
      'Scenic drive along crystal-clear Umngot river at Dawki',
      'Trek to ancient Umshiang Double Decker Living Root Bridge',
      'Breathtaking Nohkalikai & Seven Sisters waterfalls',
      'Serene boating at Umiam Lake',
      'Cleanest village Mawlynnong'
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival Guwahati & Transfer to Shillong (Scotland of the East)',
        startLocation: 'Guwahati Airport / Rly Station',
        endLocation: 'Shillong',
        distanceKm: 110,
        durationHours: 3.5,
        activities: ['Airport pickup in private Innova', 'Stopover at pristine Umiam Lake (Barapani)', 'Check-in to hotel in Shillong', 'Evening leisure walk at Police Bazar'],
        mealsIncluded: ['Dinner'],
        hotelName: 'Hotel Polo Towers',
        hotelCity: 'Shillong'
      },
      {
        dayNumber: 2,
        title: 'Shillong Sightseeing to Cherrapunjee (Sohra)',
        startLocation: 'Shillong',
        endLocation: 'Cherrapunjee',
        distanceKm: 65,
        durationHours: 2.5,
        activities: ['Elephant Falls', 'Shillong Peak viewpoint', 'Mawkdok Dympep Valley View Point & Zipline', 'Arwah Cave exploration'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Polo Orchid Resort',
        hotelCity: 'Cherrapunjee'
      },
      {
        dayNumber: 3,
        title: 'Double Decker Living Root Bridge Trek',
        startLocation: 'Cherrapunjee',
        endLocation: 'Cherrapunjee',
        distanceKm: 25,
        durationHours: 6.0,
        activities: ['Guided trek from Tyrna village to Nongriat', 'Marvel at the ancient bio-engineering Double Decker Living Root Bridge', 'Dip in natural turquoise pools at Rainbow Falls', 'Return trek to resort'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Polo Orchid Resort',
        hotelCity: 'Cherrapunjee'
      },
      {
        dayNumber: 4,
        title: 'Mawlynnong Cleanest Village & Dawki River',
        startLocation: 'Cherrapunjee',
        endLocation: 'Shillong',
        distanceKm: 130,
        durationHours: 4.5,
        activities: ['Visit Mawlynnong village', 'Single Living Root Bridge at Riwai', 'Dawki Umngot river transparent boat ride', 'Indo-Bangladesh Tamabil border viewpoint', 'Drive back to Shillong'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Hotel Polo Towers',
        hotelCity: 'Shillong'
      },
      {
        dayNumber: 5,
        title: 'Laitlum Canyons & Shillong Local Heritage',
        startLocation: 'Shillong',
        endLocation: 'Shillong',
        distanceKm: 45,
        durationHours: 3.0,
        activities: ['Morning visit to dramatic Laitlum Grand Canyons', 'Don Bosco Indigenous Museum', 'Cathedral of Mary Help of Christians', 'Ward’s Lake botanical gardens'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Hotel Polo Towers',
        hotelCity: 'Shillong'
      },
      {
        dayNumber: 6,
        title: 'Kamakhya Temple Darshan & Departure',
        startLocation: 'Shillong',
        endLocation: 'Guwahati Airport',
        distanceKm: 120,
        durationHours: 4.0,
        activities: ['Morning drive to Guwahati', 'VIP darshan at sacred Maa Kamakhya Temple atop Nilachal Hill', 'Airport drop with wonderful memories'],
        mealsIncluded: ['Breakfast']
      }
    ],
    inclusions: [
      '5 Nights premium 3/4-star accommodation on MAPAI (Breakfast + Dinner)',
      'Dedicated AC Toyota Innova Crysta for all transfers and sightseeing as per itinerary',
      'All toll taxes, parking, driver allowance, fuel, and night halts',
      'Dedicated local guide for Nongriat Double Decker Root Bridge trek',
      'Dawki Umngot river country boat cruise (1 hour)',
      'Kamakhya temple darshan assistance'
    ],
    exclusions: [
      'Airfare / Train tickets',
      'Personal expenses, room service, laundry, telephone calls',
      'Adventure activity charges (Zipline, river kayaking)',
      'Entry fees for camera/video at monuments',
      '5% GST'
    ],
    standardSellingPrice: 32000, // Per person on twin sharing
    terms: [
      '30% advance on confirmation to block hotels & fleet',
      'Balance payment due 7 days prior to arrival',
      'Cancellation before 15 days: 10% retention; 7-14 days: 50% retention; <7 days: 100% non-refundable'
    ],
    active: true
  },
  {
    id: 'PKG-ASSM-02',
    name: 'Wild Assam: Kaziranga Safari & Brahmaputra Heritage',
    packageType: 'hybrid',
    destination: 'Assam',
    nights: 4,
    days: 5,
    shortSummary: 'Guwahati - Kaziranga National Park - Majuli Island - Guwahati. Rhino jeep & elephant safaris with river culture.',
    highlights: [
      'Central & Western range Jeep safari in Kaziranga',
      'Morning Elephant safari for close-up One-Horned Rhinoceros viewing',
      'Assamese tea garden walk and factory tasting',
      'Brahmaputra sunset cruise'
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival Guwahati to Kaziranga',
        startLocation: 'Guwahati',
        endLocation: 'Kaziranga',
        distanceKm: 220,
        durationHours: 4.5,
        activities: ['Pickup and transfer along scenic Kolia Bhomora bridge', 'Check-in to wildlife resort', 'Evening Assamese Bihu cultural dance show'],
        mealsIncluded: ['Dinner'],
        hotelName: 'Diphlu River Lodge',
        hotelCity: 'Kaziranga'
      },
      {
        dayNumber: 2,
        title: 'Kaziranga Jungle Safaris',
        startLocation: 'Kaziranga',
        endLocation: 'Kaziranga',
        distanceKm: 40,
        durationHours: 5.0,
        activities: ['Early morning Elephant safari at Kohora range', 'Breakfast at resort', 'Afternoon 4x4 Jeep Safari at Bagori Western range (rhinos, wild water buffaloes, swamp deer)'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Diphlu River Lodge',
        hotelCity: 'Kaziranga'
      },
      {
        dayNumber: 3,
        title: 'Kaziranga Orchid Park & Tea Garden Heritage',
        startLocation: 'Kaziranga',
        endLocation: 'Kaziranga',
        distanceKm: 30,
        durationHours: 3.5,
        activities: ['Kaziranga National Orchid & Biodiversity Park', 'Assam organic tea estate tasting session', 'Jeep safari in Agaratoli Eastern Range (migratory birds)'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Diphlu River Lodge',
        hotelCity: 'Kaziranga'
      },
      {
        dayNumber: 4,
        title: 'Kaziranga to Guwahati & Brahmaputra Sunset Cruise',
        startLocation: 'Kaziranga',
        endLocation: 'Guwahati',
        distanceKm: 220,
        durationHours: 4.5,
        activities: ['Drive back to Guwahati', 'Hotel check-in', 'Evening 1-hour sunset cruise on River Brahmaputra with folk music'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Vivanta Guwahati',
        hotelCity: 'Guwahati'
      },
      {
        dayNumber: 5,
        title: 'Guwahati Heritage & Departure',
        startLocation: 'Guwahati',
        endLocation: 'Guwahati Airport',
        distanceKm: 25,
        durationHours: 1.5,
        activities: ['Umananda Peacock Island ferry darshan', 'Airport drop'],
        mealsIncluded: ['Breakfast']
      }
    ],
    inclusions: ['4 Nights Luxury Resort stay with all meals', '1x Elephant Safari + 2x Exclusive 4WD Jeep Safaris with forest permits & armed guards', 'Private vehicle throughout', 'Sunset cruise tickets'],
    exclusions: ['Airfare', 'Camera permits', 'GST 5%'],
    standardSellingPrice: 42000,
    terms: ['Park safari bookings subject to Kaziranga forest dept slot availability'],
    active: true
  },
  {
    id: 'PKG-VND-BHUT-01',
    name: 'Enchanting Bhutan: Land of the Thunder Dragon',
    packageType: 'vendor',
    destination: 'Bhutan',
    nights: 6,
    days: 7,
    shortSummary: 'Paro - Thimphu - Punakha - Paro Tiger’s Nest. Provided in collaboration with accredited Bhutan DMC partner.',
    highlights: [
      'Hike to iconic Taktsang (Tiger’s Nest) Monastery',
      'Punakha Dzong at the confluence of Pho Chhu and Mo Chhu',
      'Buddha Dordenma 169ft bronze colossus',
      'Bhutanese Sustainable Development Fee (SDF) and visa included'
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival Paro International Airport & Scenic Drive to Thimphu',
        startLocation: 'Paro Airport',
        endLocation: 'Thimphu',
        distanceKm: 55,
        durationHours: 1.5,
        activities: ['Meet English-speaking Bhutanese guide in traditional Gho', 'Tachogang Lhakhang iron bridge stop', 'Check-in to Thimphu hotel'],
        mealsIncluded: ['Lunch', 'Dinner'],
        hotelName: 'Le Meridien Thimphu',
        hotelCity: 'Thimphu'
      },
      {
        dayNumber: 2,
        title: 'Thimphu Cultural Treasures',
        startLocation: 'Thimphu',
        endLocation: 'Thimphu',
        distanceKm: 30,
        durationHours: 5.0,
        activities: ['National Memorial Chorten', 'Buddha Point (Kuenselphodrang)', 'Motithang Takin Preserve', 'Centenary Farmers Market'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Le Meridien Thimphu',
        hotelCity: 'Thimphu'
      },
      {
        dayNumber: 3,
        title: 'Thimphu to Punakha via Dochula Pass',
        startLocation: 'Thimphu',
        endLocation: 'Punakha',
        distanceKm: 75,
        durationHours: 3.0,
        activities: ['Cross Dochula Pass (3,100m) with 108 Druk Wangyal Chortens & Himalayan panorama', 'Short walk to Chimi Lhakhang (Fertility Temple)', 'Visit majestic Punakha Dzong'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Dhensa Boutique Resort',
        hotelCity: 'Punakha'
      },
      {
        dayNumber: 4,
        title: 'Punakha to Paro Valley',
        startLocation: 'Punakha',
        endLocation: 'Paro',
        distanceKm: 125,
        durationHours: 4.0,
        activities: ['Walk along Punakha Suspension Bridge (Bhutan’s longest)', 'Scenic drive to Paro', 'Visit Rinpung Dzong fortress'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Le Meridien Paro Riverfront',
        hotelCity: 'Paro'
      },
      {
        dayNumber: 5,
        title: 'Tiger’s Nest (Paro Taktsang) Sacred Hike',
        startLocation: 'Paro',
        endLocation: 'Paro',
        distanceKm: 20,
        durationHours: 6.5,
        activities: ['Pilgrimage hike to Taktsang Monastery perched 900m above the valley floor', 'Cafeteria viewpoint lunch', 'Traditional Bhutanese hot stone bath at local farmhouse'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Le Meridien Paro Riverfront',
        hotelCity: 'Paro'
      },
      {
        dayNumber: 6,
        title: 'Haa Valley Excursion via Chele La Pass',
        startLocation: 'Paro',
        endLocation: 'Paro',
        distanceKm: 65,
        durationHours: 4.5,
        activities: ['Drive through rhododendron forests to Chele La (3,988m), Bhutan’s highest motorable pass', 'Visit remote Haa valley temples', 'Farewell cultural dinner in Paro'],
        mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
        hotelName: 'Le Meridien Paro Riverfront',
        hotelCity: 'Paro'
      },
      {
        dayNumber: 7,
        title: 'Paro International Airport Departure',
        startLocation: 'Paro',
        endLocation: 'Paro Airport',
        distanceKm: 10,
        durationHours: 0.5,
        activities: ['Transfer to Paro Airport for flight departure'],
        mealsIncluded: ['Breakfast']
      }
    ],
    inclusions: [
      'Bhutan Sustainable Development Fee (SDF) of INR 1,200/night for Indian nationals included',
      'Bhutan Entry Permit processing & handling',
      'All 3-Star / 4-Star luxury boutique hotels with all meals (APAI)',
      'Dedicated licensed Bhutanese guide & private Hyundai H1 / Toyota Coaster',
      'All monument entry fees & mineral water'
    ],
    exclusions: ['Drukair / Bhutan Airlines flights', 'Personal tips & alcoholic drinks', 'GST & TCS'],
    supplierId: 'SUP-H-04',
    supplierOriginalCost: 58000,
    standardSellingPrice: 72000,
    terms: ['Full advance required for Bhutan SDF payment and flight issuance'],
    active: true
  }
];

export const INITIAL_LEADS: LeadEnquiry[] = [
  {
    id: 'ENQ-2026-0042',
    leadDate: '2026-11-05',
    source: 'B2B Agent',
    agentId: 'AGT-101',
    clientName: 'TravelPlanners India (For Dr. Aniruddha Sen)',
    contactPerson: 'Karan Mehra',
    phone: '+91 98201 44552',
    email: 'karan@travelplanners.in',
    destination: 'Meghalaya',
    travelStartDate: '2026-11-08',
    travelEndDate: '2026-11-13',
    nights: 5,
    days: 6,
    flexibleDates: false,
    adults: 4,
    children: 0,
    infants: 0,
    roomCount: 2,
    hotelCategoryPreference: 'Deluxe (4-Star)',
    transportPreference: 'SUV (Innova)',
    assignedTo: 'Ritu Sharma',
    stage: 'Won',
    priority: 'High',
    budgetEstimate: 140000,
    notes: 'Premium family tour with elderly doctor couple. Need comfortable SUV and smooth hill driver.',
    quotationIds: ['QT-2026-0001'],
    confirmedTourCode: 'LST-2026-00001'
  },
  {
    id: 'ENQ-2026-0043',
    leadDate: '2026-11-06',
    source: 'B2B Agent',
    agentId: 'AGT-102',
    clientName: 'Nirvana Holidays (For Mr. Vikram Malhotra & Group)',
    contactPerson: 'Sunita Chawla',
    phone: '+91 98112 33441',
    email: 'sunita@nirvanaholidays.com',
    destination: 'Assam',
    travelStartDate: '2026-11-15',
    travelEndDate: '2026-11-19',
    nights: 4,
    days: 5,
    flexibleDates: false,
    adults: 8,
    children: 0,
    infants: 0,
    roomCount: 4,
    hotelCategoryPreference: 'Luxury (5-Star / Heritage)',
    transportPreference: 'Tempo Traveller',
    assignedTo: 'Amit Baruah',
    stage: 'Won',
    priority: 'High',
    budgetEstimate: 350000,
    notes: 'Corporate doctors alumni wildlife photography group. Need Force Urbania and central Kaziranga lodge.',
    quotationIds: ['QT-2026-0002'],
    confirmedTourCode: 'LST-2026-00002'
  },
  {
    id: 'ENQ-2026-0044',
    leadDate: '2026-11-07',
    source: 'Website',
    clientName: 'Sanjay Deshmukh & Family',
    contactPerson: 'Sanjay Deshmukh',
    phone: '+91 98220 99120',
    email: 'sanjay.deshmukh@gmail.com',
    destination: 'Arunachal Pradesh',
    travelStartDate: '2026-11-20',
    travelEndDate: '2026-11-27',
    nights: 7,
    days: 8,
    flexibleDates: true,
    adults: 2,
    children: 1,
    infants: 0,
    roomCount: 1,
    hotelCategoryPreference: 'Standard (3-Star)',
    transportPreference: 'SUV (Innova)',
    assignedTo: 'Pooja Kalita',
    stage: 'Quotation Sent',
    priority: 'Medium',
    budgetEstimate: 110000,
    notes: 'Wants Tawang monastery circuit with Sela Pass and Bum La Pass permit coordination.',
    quotationIds: ['QT-2026-0004']
  },
  {
    id: 'ENQ-2026-0045',
    leadDate: '2026-11-08',
    source: 'WhatsApp',
    clientName: 'Rajesh Singhal',
    contactPerson: 'Rajesh Singhal',
    phone: '+91 94140 18270',
    email: 'rajesh.singhal@jaipurmarbles.in',
    destination: 'Bhutan',
    travelStartDate: '2026-12-05',
    travelEndDate: '2026-12-11',
    nights: 6,
    days: 7,
    flexibleDates: true,
    adults: 4,
    children: 2,
    infants: 0,
    roomCount: 3,
    hotelCategoryPreference: 'Deluxe (4-Star)',
    transportPreference: 'SUV (Innova)',
    assignedTo: 'Ritu Sharma',
    stage: 'Costing',
    priority: 'High',
    budgetEstimate: 400000,
    notes: 'Family winter vacation in Bhutan. Inquired about SDF waivers for children under 12.',
    quotationIds: []
  },
  {
    id: 'ENQ-2026-0046',
    leadDate: '2026-11-09',
    source: 'B2B Agent',
    agentId: 'AGT-104',
    clientName: 'Royal Expeditions (For Dr. Sandeep Verma)',
    contactPerson: 'Deepak Rao',
    phone: '+91 99001 88992',
    email: 'deepak@royalexpeditions.co',
    destination: 'Thailand',
    travelStartDate: '2026-11-28',
    travelEndDate: '2026-12-03',
    nights: 5,
    days: 6,
    flexibleDates: false,
    adults: 2,
    children: 0,
    infants: 0,
    roomCount: 1,
    hotelCategoryPreference: 'Luxury (5-Star / Heritage)',
    transportPreference: 'Sedan',
    assignedTo: 'Amit Baruah',
    stage: 'New Enquiry',
    priority: 'Medium',
    budgetEstimate: 160000,
    notes: 'Phuket & Krabi private island tour with private speedboat transfers.',
    quotationIds: []
  }
];

export const INITIAL_CONFIRMED_TOURS: ConfirmedTour[] = [
  {
    tourCode: 'LST-2026-00001',
    enquiryId: 'ENQ-2026-0042',
    bookingId: 'BKG-2026-0001',
    quotationCode: 'QT-2026-0001-V2',
    quotationVersion: 2,
    clientName: 'TravelPlanners India (For Dr. Aniruddha Sen)',
    agentId: 'AGT-101',
    destination: 'Meghalaya',
    packageName: 'Mesmerising Meghalaya: Waterfalls & Living Roots',
    startDate: '2026-11-08',
    endDate: '2026-11-13',
    nights: 5,
    days: 6,
    adults: 4,
    children: 0,
    infants: 0,
    travellers: [
      { fullName: 'Dr. Aniruddha Sen', age: 62, gender: 'Male', idProofType: 'Aadhaar', idNumber: 'XXXX-XXXX-9021', contactNumber: '+91 98205 11920', roomAllocation: 'Room 201' },
      { fullName: 'Mrs. Sharmistha Sen', age: 58, gender: 'Female', idProofType: 'Aadhaar', idNumber: 'XXXX-XXXX-9022', roomAllocation: 'Room 201' },
      { fullName: 'Mr. Rohan Sen', age: 31, gender: 'Male', idProofType: 'Passport', idNumber: 'Z5819021', contactNumber: '+91 98205 33410', roomAllocation: 'Room 202' },
      { fullName: 'Mrs. Devika Roy Sen', age: 29, gender: 'Female', idProofType: 'Aadhaar', idNumber: 'XXXX-XXXX-4412', roomAllocation: 'Room 202' }
    ],
    assignedSalesperson: 'Ritu Sharma',
    assignedOperationsLead: 'Bhaskar Jyoti Phukan',
    status: 'on_tour', // Live currently running today!
    
    // Commercials
    sellingPrice: 128000,
    gstAmount: 6400,
    totalReceivable: 134400,
    totalCollected: 100000,
    outstandingBalance: 34400, // Due from B2B agent
    
    // Costing Baseline
    estimatedSupplierCost: 62000, // External hotels + guides + boat
    estimatedOwnFleetCost: 22800, // 6 days x 3800 internal vehicle rate
    totalEstimatedCost: 84800,
    projectedGrossProfit: 43200,
    projectedMarginPct: 33.75,
    
    // Live Actuals
    actualSupplierCostPaid: 40000, // Advances paid out
    actualDirectExpenses: 7800, // Driver fuel & tolls paid so far
    actualTotalCost: 47800,
    actualGrossProfit: 80200, // Realised so far
    profitVariance: 0,
    
    // Vehicle Setup
    transportSource: 'own_fleet',
    allocatedVehicleId: 'FLT-01',
    allocatedDriverName: 'Ramen Das',
    allocatedDriverPhone: '+91 98640 12345',
    
    itinerary: INITIAL_PACKAGES[0].itinerary,
    inclusions: INITIAL_PACKAGES[0].inclusions,
    exclusions: INITIAL_PACKAGES[0].exclusions
  },
  {
    tourCode: 'LST-2026-00002',
    enquiryId: 'ENQ-2026-0043',
    bookingId: 'BKG-2026-0002',
    quotationCode: 'QT-2026-0002-V1',
    quotationVersion: 1,
    clientName: 'Nirvana Holidays (For Mr. Vikram Malhotra & Group)',
    agentId: 'AGT-102',
    destination: 'Assam',
    packageName: 'Wild Assam: Kaziranga Safari & Brahmaputra Heritage',
    startDate: '2026-11-15',
    endDate: '2026-11-19',
    nights: 4,
    days: 5,
    adults: 8,
    children: 0,
    infants: 0,
    travellers: [
      { fullName: 'Mr. Vikram Malhotra', age: 48, gender: 'Male', idProofType: 'Aadhaar', idNumber: 'XXXX-XXXX-1120', contactNumber: '+91 98110 55120' },
      { fullName: 'Dr. Sameer Kapoor', age: 49, gender: 'Male', idProofType: 'Aadhaar', idNumber: 'XXXX-XXXX-3341' }
    ],
    assignedSalesperson: 'Amit Baruah',
    assignedOperationsLead: 'Bhaskar Jyoti Phukan',
    status: 'operations_prep', // Upcoming next week
    
    sellingPrice: 336000,
    gstAmount: 16800,
    totalReceivable: 352800,
    totalCollected: 150000,
    outstandingBalance: 202800,
    
    estimatedSupplierCost: 172000,
    estimatedOwnFleetCost: 32500, // 5 days x 6500 Force Urbania
    totalEstimatedCost: 204500,
    projectedGrossProfit: 131500,
    projectedMarginPct: 39.1,
    
    actualSupplierCostPaid: 80000,
    actualDirectExpenses: 0,
    actualTotalCost: 80000,
    actualGrossProfit: 70000,
    profitVariance: 0,
    
    transportSource: 'own_fleet',
    allocatedVehicleId: 'FLT-02',
    allocatedDriverName: 'Bipul Bora',
    allocatedDriverPhone: '+91 94350 67890',
    
    itinerary: INITIAL_PACKAGES[1].itinerary,
    inclusions: INITIAL_PACKAGES[1].inclusions,
    exclusions: INITIAL_PACKAGES[1].exclusions
  },
  {
    tourCode: 'LST-2026-00003',
    enquiryId: 'ENQ-2026-0038',
    bookingId: 'BKG-2026-0003',
    quotationCode: 'QT-2026-0003-V2',
    quotationVersion: 2,
    clientName: 'Royal Expeditions (Honeymoon Couple)',
    agentId: 'AGT-104',
    destination: 'Bhutan',
    packageName: 'Enchanting Bhutan: Land of the Thunder Dragon',
    startDate: '2026-10-20',
    endDate: '2026-10-26',
    nights: 6,
    days: 7,
    adults: 2,
    children: 0,
    infants: 0,
    travellers: [
      { fullName: 'Mr. Aditya Singhania', age: 30, gender: 'Male', idProofType: 'Passport', idNumber: 'P9012389' },
      { fullName: 'Mrs. Neha Singhania', age: 28, gender: 'Female', idProofType: 'Passport', idNumber: 'P9012390' }
    ],
    assignedSalesperson: 'Pooja Kalita',
    assignedOperationsLead: 'Bhaskar Jyoti Phukan',
    status: 'closed', // Completed and reconciled!
    
    sellingPrice: 185000,
    gstAmount: 9250,
    totalReceivable: 194250,
    totalCollected: 194250,
    outstandingBalance: 0,
    
    estimatedSupplierCost: 138000,
    estimatedOwnFleetCost: 0, // Bhutan ground handled via local partner DMC
    totalEstimatedCost: 138000,
    projectedGrossProfit: 47000,
    projectedMarginPct: 25.4,
    
    actualSupplierCostPaid: 139800, // Small currency variance
    actualDirectExpenses: 0,
    actualTotalCost: 139800,
    actualGrossProfit: 45200,
    profitVariance: -1800, // Minor variance reconciled
    
    transportSource: 'hired_vendor',
    
    itinerary: INITIAL_PACKAGES[2].itinerary,
    inclusions: INITIAL_PACKAGES[2].inclusions,
    exclusions: INITIAL_PACKAGES[2].exclusions,
    closureNotes: 'Completed smoothly with 5-star traveler feedback. Reconciled with Royal Expeditions and full payment settled.',
    closedAt: '2026-10-30',
    closedBy: 'Monjit Bora (Managing Director)'
  }
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'QT-2026-0001',
    enquiryId: 'ENQ-2026-0042',
    clientName: 'TravelPlanners India (For Dr. Aniruddha Sen)',
    agentId: 'AGT-101',
    destination: 'Meghalaya',
    startDate: '2026-11-08',
    endDate: '2026-11-13',
    paxCount: 4,
    currentVersion: 2,
    activeVersionCode: 'QT-2026-0001-V2',
    confirmedTourCode: 'LST-2026-00001',
    revisions: [
      {
        version: 1,
        versionCode: 'QT-2026-0001-V1',
        createdAt: '2026-11-05 14:30',
        createdBy: 'Ritu Sharma',
        costComponents: [
          {
            id: 'CC-1',
            category: 'hotel',
            description: 'Hotel Polo Towers Shillong (4-Star) - 2x Executive Rooms, 3 Nights MAPAI',
            supplierId: 'SUP-H-01',
            supplierName: 'Hotel Polo Towers Shillong',
            sourceType: 'external_supplier',
            quantity: 2,
            daysOrNights: 3,
            unitCost: 5500,
            totalCost: 33000,
            advancePercentageRequired: 50,
            advanceAmountRequired: 16500
          },
          {
            id: 'CC-2',
            category: 'hotel',
            description: 'Polo Orchid Resort Cherrapunjee - 2x Executive Rooms, 2 Nights MAPAI',
            supplierId: 'SUP-H-01',
            supplierName: 'Hotel Polo Towers Shillong',
            sourceType: 'external_supplier',
            quantity: 2,
            daysOrNights: 2,
            unitCost: 6000,
            totalCost: 24000,
            advancePercentageRequired: 50,
            advanceAmountRequired: 12000
          },
          {
            id: 'CC-3',
            category: 'transport',
            description: 'Company Fleet Toyota Innova Crysta (6 Days Guwahati - Shillong - Cherrapunjee - Guwahati)',
            vehicleId: 'FLT-01',
            sourceType: 'own_fleet',
            quantity: 1,
            daysOrNights: 6,
            unitCost: 3800,
            totalCost: 22800,
            advancePercentageRequired: 0, // Own fleet requires NO external advance
            advanceAmountRequired: 0,
            notes: 'Internal cost allocation only - no external vendor payment voucher generated'
          },
          {
            id: 'CC-4',
            category: 'guide',
            description: 'Local Tribal Guide for Double Decker Root Bridge Trek + Dawki Boating',
            supplierId: 'SUP-A-01',
            supplierName: 'Cherrapunjee Treks & Caving Association',
            sourceType: 'external_supplier',
            quantity: 1,
            daysOrNights: 2,
            unitCost: 2500,
            totalCost: 5000,
            advancePercentageRequired: 0,
            advanceAmountRequired: 0
          }
        ],
        totalDirectCost: 84800,
        externalSupplierPayables: 62000,
        ownFleetInternalCost: 22800,
        markupAmount: 37200,
        markupPercentage: 43.8,
        subtotalSellingPrice: 122000,
        gstPercentage: 5,
        gstAmount: 6100,
        finalSellingPrice: 128100,
        changeReason: 'Initial proposal submitted to agent',
        itinerarySnapshot: INITIAL_PACKAGES[0].itinerary,
        inclusions: INITIAL_PACKAGES[0].inclusions,
        exclusions: INITIAL_PACKAGES[0].exclusions,
        paymentTerms: '30% booking advance, 70% before tour departure',
        status: 'revision_requested'
      },
      {
        version: 2,
        versionCode: 'QT-2026-0001-V2',
        createdAt: '2026-11-06 10:15',
        createdBy: 'Ritu Sharma',
        costComponents: [
          {
            id: 'CC-1',
            category: 'hotel',
            description: 'Hotel Polo Towers Shillong (4-Star) - 2x Executive Rooms, 3 Nights MAPAI',
            supplierId: 'SUP-H-01',
            supplierName: 'Hotel Polo Towers Shillong',
            sourceType: 'external_supplier',
            quantity: 2,
            daysOrNights: 3,
            unitCost: 5500,
            totalCost: 33000,
            advancePercentageRequired: 50,
            advanceAmountRequired: 16500
          },
          {
            id: 'CC-2',
            category: 'hotel',
            description: 'Polo Orchid Resort Cherrapunjee - 2x Executive Rooms, 2 Nights MAPAI with Valley View',
            supplierId: 'SUP-H-01',
            supplierName: 'Hotel Polo Towers Shillong',
            sourceType: 'external_supplier',
            quantity: 2,
            daysOrNights: 2,
            unitCost: 6000,
            totalCost: 24000,
            advancePercentageRequired: 50,
            advanceAmountRequired: 12000
          },
          {
            id: 'CC-3',
            category: 'transport',
            description: 'Company Fleet Toyota Innova Crysta (6 Days all transfers & sightseeing)',
            vehicleId: 'FLT-01',
            sourceType: 'own_fleet',
            quantity: 1,
            daysOrNights: 6,
            unitCost: 3800,
            totalCost: 22800,
            advancePercentageRequired: 0,
            advanceAmountRequired: 0,
            notes: 'Internal cost allocation only'
          },
          {
            id: 'CC-4',
            category: 'guide',
            description: 'Local Tribal Guide + Dawki Private Country Boating',
            supplierId: 'SUP-A-01',
            supplierName: 'Cherrapunjee Treks & Caving Association',
            sourceType: 'external_supplier',
            quantity: 1,
            daysOrNights: 2,
            unitCost: 2500,
            totalCost: 5000,
            advancePercentageRequired: 0,
            advanceAmountRequired: 0
          }
        ],
        totalDirectCost: 84800,
        externalSupplierPayables: 62000,
        ownFleetInternalCost: 22800,
        markupAmount: 43200,
        markupPercentage: 50.9,
        subtotalSellingPrice: 128000,
        gstPercentage: 5,
        gstAmount: 6400,
        finalSellingPrice: 134400,
        changeReason: 'Client requested guaranteed valley view rooms at Polo Orchid and confirmed Kamakhya VIP entry ticket coordination',
        itinerarySnapshot: INITIAL_PACKAGES[0].itinerary,
        inclusions: INITIAL_PACKAGES[0].inclusions,
        exclusions: INITIAL_PACKAGES[0].exclusions,
        paymentTerms: '₹1,00,000 paid upon confirmation; balance ₹34,400 on 30-day agent credit',
        status: 'accepted'
      }
    ]
  }
];

export const INITIAL_SUPPLIER_BOOKINGS: SupplierBookingRecord[] = [
  {
    id: 'SB-2026-0001',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-H-01',
    supplierName: 'Hotel Polo Towers Shillong',
    category: 'Hotel',
    details: '2x Executive Rooms, 3 Nights (Check-in 08 Nov, Check-out 09 Nov; & Check-in 11 Nov, Check-out 13 Nov) on MAPAI',
    destination: 'Meghalaya',
    checkInDate: '2026-11-08',
    checkOutDate: '2026-11-13',
    agreedAmount: 33000,
    advanceRequired: 16500,
    advancePaid: 16500,
    balancePayable: 16500,
    dueDate: '2026-11-13',
    confirmationReference: 'PT-SH-2026-9811',
    status: 'partially_paid',
    voucherGenerated: true
  },
  {
    id: 'SB-2026-0002',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-H-01',
    supplierName: 'Polo Orchid Resort Cherrapunjee',
    category: 'Hotel',
    details: '2x Valley View Rooms, 2 Nights (Check-in 09 Nov, Check-out 11 Nov) on MAPAI',
    destination: 'Meghalaya',
    checkInDate: '2026-11-09',
    checkOutDate: '2026-11-11',
    agreedAmount: 24000,
    advanceRequired: 12000,
    advancePaid: 12000,
    balancePayable: 12000,
    dueDate: '2026-11-11',
    confirmationReference: 'PO-CR-2026-4421',
    status: 'partially_paid',
    voucherGenerated: true
  },
  {
    id: 'SB-2026-0003',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-A-01',
    supplierName: 'Cherrapunjee Treks & Caving Association',
    category: 'Guide',
    details: 'Senior guide for Double Decker root bridge & Dawki boating coordination',
    destination: 'Meghalaya',
    agreedAmount: 5000,
    advanceRequired: 0,
    advancePaid: 0,
    balancePayable: 5000,
    dueDate: '2026-11-11',
    confirmationReference: 'CG-882',
    status: 'booked_confirmed',
    voucherGenerated: true
  },
  {
    id: 'SB-2026-0004',
    tourCode: 'LST-2026-00002',
    supplierId: 'SUP-H-03',
    supplierName: 'Diphlu River Lodge Kaziranga',
    category: 'Hotel',
    details: '4x Thatched Cottages on APAI (All meals) for 3 Nights',
    destination: 'Assam',
    checkInDate: '2026-11-15',
    checkOutDate: '2026-11-18',
    agreedAmount: 136000,
    advanceRequired: 80000,
    advancePaid: 80000,
    balancePayable: 56000,
    dueDate: '2026-11-17',
    confirmationReference: 'DRL-KZ-4091',
    status: 'partially_paid',
    voucherGenerated: true
  }
];

export const INITIAL_RECEIPTS: CustomerReceipt[] = [
  {
    id: 'REC-2026-001',
    tourCode: 'LST-2026-00001',
    clientName: 'TravelPlanners India Pvt. Ltd.',
    agentId: 'AGT-101',
    amount: 100000,
    receivedDate: '2026-11-06',
    paymentMode: 'Bank Transfer (NEFT/RTGS)',
    transactionReference: 'NEFT/HDFC/N261106882109',
    bankAccount: 'HDFC Current A/c 502000088912',
    receiptNumber: 'LST-REC-2026-0041',
    verified: true,
    notes: 'Tour advance received against quotation QT-2026-0001-V2'
  },
  {
    id: 'REC-2026-002',
    tourCode: 'LST-2026-00002',
    clientName: 'Nirvana Holidays Delhi',
    agentId: 'AGT-102',
    amount: 150000,
    receivedDate: '2026-11-07',
    paymentMode: 'UPI',
    transactionReference: 'UPI/ICICI/43128990141',
    bankAccount: 'ICICI Current A/c 00610500918',
    receiptNumber: 'LST-REC-2026-0042',
    verified: true,
    notes: 'Booking advance for Kaziranga corporate alumni tour'
  }
];

export const INITIAL_SUPPLIER_PAYMENTS: SupplierPaymentVoucher[] = [
  {
    id: 'SPV-2026-001',
    supplierBookingId: 'SB-2026-0001',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-H-01',
    supplierName: 'Hotel Polo Towers Shillong',
    paymentType: 'advance',
    amount: 16500,
    dueBy: '2026-11-07',
    paidDate: '2026-11-07',
    status: 'paid',
    approvedBy: 'Bikash Kalita (Accounts Manager)',
    bankReference: 'HDFC-RTGS-00918234',
    paymentMode: 'NEFT/RTGS',
    notes: '50% mandatory reservation advance to confirm rooms'
  },
  {
    id: 'SPV-2026-002',
    supplierBookingId: 'SB-2026-0002',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-H-01',
    supplierName: 'Polo Orchid Resort Cherrapunjee',
    paymentType: 'advance',
    amount: 12000,
    dueBy: '2026-11-07',
    paidDate: '2026-11-07',
    status: 'paid',
    approvedBy: 'Bikash Kalita (Accounts Manager)',
    bankReference: 'HDFC-RTGS-00918235',
    paymentMode: 'NEFT/RTGS',
    notes: '50% room advance for Cherrapunjee valley view rooms'
  },
  {
    id: 'SPV-2026-003',
    supplierBookingId: 'SB-2026-0004',
    tourCode: 'LST-2026-00002',
    supplierId: 'SUP-H-03',
    supplierName: 'Diphlu River Lodge Kaziranga',
    paymentType: 'advance',
    amount: 80000,
    dueBy: '2026-11-10',
    paidDate: '2026-11-09',
    status: 'paid',
    approvedBy: 'Bikash Kalita (Accounts Manager)',
    bankReference: 'HDFC-NEFT-889104',
    paymentMode: 'NEFT/RTGS',
    notes: 'Confirmed 4 cottages booking advance'
  },
  {
    id: 'SPV-2026-004',
    supplierBookingId: 'SB-2026-0001',
    tourCode: 'LST-2026-00001',
    supplierId: 'SUP-H-01',
    supplierName: 'Hotel Polo Towers Shillong',
    paymentType: 'balance',
    amount: 16500,
    dueBy: '2026-11-13',
    status: 'approved',
    approvedBy: 'Bikash Kalita (Accounts Manager)',
    notes: 'Check-out settlement balance for LST-2026-00001'
  }
];

export const INITIAL_EXPENSES: TourExpense[] = [
  {
    id: 'EXP-2026-001',
    tourCode: 'LST-2026-00001',
    category: 'Driver Fuel',
    amount: 5500,
    spentDate: '2026-11-08',
    spentBy: 'Ramen Das (Driver)',
    billAttached: true,
    description: 'Guwahati airport fill-up & Shillong hill fuel for Innova AS-01-EC-4021',
    status: 'approved'
  },
  {
    id: 'EXP-2026-002',
    tourCode: 'LST-2026-00001',
    category: 'Toll & Parking',
    amount: 800,
    spentDate: '2026-11-08',
    spentBy: 'Ramen Das (Driver)',
    billAttached: true,
    description: 'Guwahati airport parking and Meghalaya transport entry toll',
    status: 'approved'
  },
  {
    id: 'EXP-2026-003',
    tourCode: 'LST-2026-00001',
    category: 'Local Purchases',
    amount: 1500,
    spentDate: '2026-11-09',
    spentBy: 'Ramen Das (Driver)',
    billAttached: true,
    description: 'Bottled Himalayan spring water box & fresh Khasi mandarin oranges welcome fruit basket',
    status: 'approved'
  }
];

export const INITIAL_INCIDENTS: TourIncident[] = [
  {
    id: 'INC-2026-01',
    tourCode: 'LST-2026-00001',
    reportedAt: '2026-11-08 17:45',
    reportedBy: 'Bhaskar Jyoti Phukan (Ops Lead)',
    incidentType: 'Hotel Room Issue',
    severity: 'low',
    description: 'Guest requested humidifier and quiet room away from elevator on 2nd floor.',
    actionTaken: 'Coordinated directly with Duty Manager Sengupta at Polo Towers; rooms changed immediately to Executive corner suites 201 & 202. Guest delighted.',
    costImpact: 0,
    status: 'resolved'
  }
];

export const INITIAL_OPERATIONS_TASKS: OperationsTask[] = [
  {
    id: 'TSK-101',
    tourCode: 'LST-2026-00001',
    destination: 'Meghalaya',
    category: 'voucher',
    title: 'Generate Hotel Vouchers & Driver Instruction Sheet',
    assignedTo: 'Bhaskar Jyoti Phukan',
    dueDate: '2026-11-07',
    status: 'completed',
    notes: 'Vouchers sent to driver Ramen Das and Polo Towers front desk'
  },
  {
    id: 'TSK-102',
    tourCode: 'LST-2026-00001',
    destination: 'Meghalaya',
    category: 'transport',
    title: 'Pre-departure vehicle fitness, sanitize, and fuel check for AS-01-EC-4021',
    assignedTo: 'Ramen Das',
    dueDate: '2026-11-07',
    status: 'completed'
  },
  {
    id: 'TSK-103',
    tourCode: 'LST-2026-00001',
    destination: 'Meghalaya',
    category: 'briefing',
    title: 'Day 2 Cherrapunjee road weather check & guide contact sync',
    assignedTo: 'Bhaskar Jyoti Phukan',
    dueDate: '2026-11-09',
    status: 'completed',
    notes: 'Clear skies reported at Sohra'
  },
  {
    id: 'TSK-104',
    tourCode: 'LST-2026-00002',
    destination: 'Assam',
    category: 'permit',
    title: 'Procure Elephant Safari & Western Range Jeep Safari Permits from Kaziranga DFO office',
    assignedTo: 'Bhaskar Jyoti Phukan',
    dueDate: '2026-11-12',
    status: 'in_progress',
    notes: 'Guest ID cards and Aadhaar copies submitted to range officer'
  },
  {
    id: 'TSK-105',
    tourCode: 'LST-2026-00002',
    destination: 'Assam',
    category: 'transport',
    title: 'Assign and inspect Force Urbania AS-01-TC-8890 luxury pushback seats',
    assignedTo: 'Bipul Bora',
    dueDate: '2026-11-14',
    status: 'pending'
  }
];

export const INITIAL_HANDOVERS: SalesHandover[] = [
  {
    tourCode: 'LST-2026-00001',
    destination: 'Meghalaya',
    paxCount: 4,
    travelDates: '2026-11-08 to 2026-11-13',
    submittedBy: 'Ritu Sharma (Senior Sales Executive)',
    submittedAt: '2026-11-06 11:30',
    status: 'accepted',
    specialRequests: 'Elderly couple in party (Dr. Sen & wife). Ensure driver is very calm and drives slowly on Shillong-Cherrapunjee hill curves. Keep car well heated in morning.',
    flightArrivalDetails: 'Indigo 6E-241 arriving Guwahati at 11:15 AM on 08 Nov',
    flightDepartureDetails: 'Air India AI-732 departing Guwahati at 16:45 on 13 Nov',
    roomingConfiguration: '2 Double Rooms, non-smoking, twin/king beds',
    salesCommitments: 'Promised VIP darshan ticket coordination at Kamakhya Temple on final day',
    reviewerNotes: 'Handover accepted. Fleet vehicle FLT-01 (Innova Crysta) and driver Ramen Das allocated. Hotel reservations confirmed.',
    reviewedBy: 'Bhaskar Jyoti Phukan (Operations Lead)',
    reviewedAt: '2026-11-06 14:00'
  },
  {
    tourCode: 'LST-2026-00002',
    destination: 'Assam',
    paxCount: 8,
    travelDates: '2026-11-15 to 2026-11-19',
    submittedBy: 'Amit Baruah (Sales Executive)',
    submittedAt: '2026-11-07 16:00',
    status: 'accepted',
    specialRequests: 'All 8 guests are wildlife photography enthusiasts. Provide window seats and request top open Jeep in Bagori range.',
    flightArrivalDetails: 'Vistara UK-721 arriving Guwahati at 10:30 AM on 15 Nov',
    flightDepartureDetails: 'Vistara UK-724 departing Guwahati at 18:20 on 19 Nov',
    roomingConfiguration: '4 Thatched Cottages twin sharing',
    salesCommitments: 'Guaranteed 1 morning elephant safari + 2 afternoon jeep safaris',
    reviewerNotes: 'Handover accepted. Force Urbania reserved. Diphlu River Lodge advance sent.',
    reviewedBy: 'Bhaskar Jyoti Phukan (Operations Lead)',
    reviewedAt: '2026-11-08 09:30'
  }
];

export const INITIAL_AUTOMATION_LOGS: AutomationLog[] = [
  {
    id: 'AUT-01',
    timestamp: '2026-11-06 11:00',
    event: 'Advance Received & Tour Code Generated',
    targetReference: 'LST-2026-00001',
    description: 'Booking advance ₹1,00,000 verified. Tour Code LST-2026-00001 generated. Notifications dispatched to Sales, Operations & Accounts.',
    channel: 'System',
    status: 'success'
  },
  {
    id: 'AUT-02',
    timestamp: '2026-11-06 11:35',
    event: 'Sales Handover Submitted',
    targetReference: 'LST-2026-00001',
    description: 'Sales handover submitted by Ritu Sharma. Operations alert triggered for Bhaskar Jyoti Phukan.',
    channel: 'System',
    status: 'success'
  },
  {
    id: 'AUT-03',
    timestamp: '2026-11-07 10:00',
    event: 'Supplier Advance Due Alert',
    targetReference: 'LST-2026-00001',
    description: 'Hotel Polo Towers advance ₹16,500 due today. Accounts voucher SPV-2026-001 created automatically.',
    channel: 'System',
    status: 'success'
  },
  {
    id: 'AUT-04',
    timestamp: '2026-11-07 17:30',
    event: 'Pre-tour Welcome & Driver Details WhatsApp Sent',
    targetReference: 'LST-2026-00001',
    description: 'Automated WhatsApp message with Driver Ramen Das details & pickup signage sent to Dr. Aniruddha Sen (+91 98205 11920) and agent Karan Mehra.',
    channel: 'WhatsApp',
    status: 'delivered'
  },
  {
    id: 'AUT-05',
    timestamp: '2026-11-08 08:00',
    event: 'Tour Execution Commenced',
    targetReference: 'LST-2026-00001',
    description: 'Tour marked ON_TOUR. Real-time execution dashboard and movement sheet activated.',
    channel: 'System',
    status: 'success'
  }
];

// ==========================================
// 1. Initial Employees & Staff Directory
// ==========================================
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-100',
    loginId: 'manash.bora',
    name: 'Manash Bora',
    email: 'mbora396@gmail.com',
    phone: '+91 98640 00001',
    department: 'executive',
    roleTitle: 'Managing Director & Strategic Lead',
    isManager: true,
    active: true
  },
  {
    id: 'EMP-101',
    loginId: 'ritu.sharma',
    name: 'Ritu Sharma',
    email: 'ritu.sharma@letsee.in',
    phone: '+91 98640 11001',
    department: 'sales',
    roleTitle: 'Senior Sales Consultant (Meghalaya & Assam)',
    isManager: false,
    active: true
  },
  {
    id: 'EMP-102',
    loginId: 'amit.baruah',
    name: 'Amit Baruah',
    email: 'amit.baruah@letsee.in',
    phone: '+91 98640 11002',
    department: 'sales',
    roleTitle: 'Sales Specialist (Arunachal & Bhutan)',
    isManager: false,
    active: true
  },
  {
    id: 'EMP-103',
    loginId: 'pooja.kalita',
    name: 'Pooja Kalita',
    email: 'pooja.kalita@letsee.in',
    phone: '+91 98640 11003',
    department: 'sales',
    roleTitle: 'B2B Key Account Manager',
    isManager: true,
    active: true
  },
  {
    id: 'EMP-201',
    loginId: 'bikram.thapa',
    name: 'Bikram Thapa',
    email: 'bikram.thapa@letsee.in',
    phone: '+91 98640 22001',
    department: 'operations',
    roleTitle: 'Head of Destination Ground Operations',
    isManager: true,
    active: true
  },
  {
    id: 'EMP-202',
    loginId: 'ramen.das',
    name: 'Ramen Das',
    email: 'ramen.das@letsee.in',
    phone: '+91 98640 12345',
    department: 'operations',
    roleTitle: 'Senior Transport Pilot & Fleet Coordinator',
    isManager: false,
    active: true
  },
  {
    id: 'EMP-301',
    loginId: 'pranab.sarma',
    name: 'Pranab Sarma',
    email: 'pranab.sarma@letsee.in',
    phone: '+91 98640 33001',
    department: 'accounts',
    roleTitle: 'Chief Financial Controller & Accounts Head',
    isManager: true,
    active: true
  },
  {
    id: 'EMP-401',
    loginId: 'anurag.gogoi',
    name: 'Anurag Gogoi',
    email: 'anurag.gogoi@letsee.in',
    phone: '+91 98640 44001',
    department: 'backend',
    roleTitle: 'Master Data & Itinerary Architect',
    isManager: true,
    active: true
  }
];

// ==========================================
// 2. Initial Itinerary Share History
// ==========================================
export const INITIAL_ITINERARY_SHARES: ItineraryShareRecord[] = [
  {
    id: 'ISH-2026-0001',
    enquiryId: 'ENQ-2026-0001',
    clientName: 'Dr. Aniruddha Sen & Family',
    recipientEmailOrPhone: '+91 98205 11920',
    channel: 'WhatsApp',
    sentAt: '2026-11-02 11:30',
    salespersonId: 'EMP-101',
    salespersonLogin: 'ritu.sharma',
    salespersonName: 'Ritu Sharma',
    itineraryId: 'PKG-MEGH-01',
    itineraryVersion: 1,
    quotationId: 'QT-2026-0001',
    quotationVersionCode: 'QT-2026-0001-V1',
    destination: 'Meghalaya',
    travelDates: '2026-11-08 to 2026-11-13',
    guestCount: 4,
    quotedAmount: 148000,
    deliveryStatus: 'read',
    followUpDate: '2026-11-03',
    enquiryStatus: 'Confirmation Received',
    itinerarySnapshot: [
      {
        dayNumber: 1,
        title: 'Guwahati Arrival to Shillong via Umiam Lake',
        startLocation: 'Guwahati Airport (GAU)',
        endLocation: 'Shillong',
        distanceKm: 120,
        durationHours: 3.5,
        activities: ['Airport reception with Khasi traditional scarf', 'Scenic lunch at Umiam Lake Viewpoint', 'Police Bazar evening leisure'],
        mealsIncluded: ['Dinner'],
        hotelName: 'Hotel Polo Towers Shillong',
        hotelCity: 'Shillong'
      },
      {
        dayNumber: 2,
        title: 'Shillong to Cherrapunjee (Sohra) Sightseeing',
        startLocation: 'Shillong',
        endLocation: 'Cherrapunjee',
        distanceKm: 65,
        durationHours: 2.5,
        activities: ['Elephant Falls', 'Mawkdok Dympep Valley Viewpoint & Zip-lining', 'Arwah Lumshynna Cave fossils', 'Nohkalikai Falls'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: 'Polo Orchid Resort Cherrapunjee',
        hotelCity: 'Cherrapunjee'
      }
    ],
    messageBody: 'Dear Dr. Sen, Greetings from Let\'s See Tour & Travels Pvt. Ltd. Attached is your customized 6D/5N Meghalaya Cloud & Waterfalls luxury itinerary. Total all-inclusive quote for 4 adults with dedicated Innova Crysta is ₹1,48,000 (inclusive of 5% GST).'
  },
  {
    id: 'ISH-2026-0002',
    enquiryId: 'ENQ-2026-0002',
    clientName: 'Nirvana Holidays / Sunita Chawla',
    recipientEmailOrPhone: 'sunita@nirvanaholidays.com',
    channel: 'Email',
    sentAt: '2026-11-09 14:15',
    salespersonId: 'EMP-102',
    salespersonLogin: 'amit.baruah',
    salespersonName: 'Amit Baruah',
    itineraryId: 'PKG-BHUT-01',
    itineraryVersion: 1,
    quotationId: 'QT-2026-0002',
    quotationVersionCode: 'QT-2026-0002-V1',
    destination: 'Bhutan',
    travelDates: '2026-11-20 to 2026-11-27',
    guestCount: 6,
    quotedAmount: 298000,
    deliveryStatus: 'delivered',
    followUpDate: '2026-11-10',
    enquiryStatus: 'Follow-up',
    itinerarySnapshot: [],
    messageBody: 'Dear Sunita Ji, Please find attached our B2B confidential proposal for 6 Guests covering Thimphu, Punakha & Paro Tiger\'s Nest with English speaking Bhutanese guide and private coaster.'
  },
  {
    id: 'ISH-2026-0003',
    enquiryId: 'ENQ-2026-0003',
    clientName: 'Vikram Singhal (Kolkata)',
    recipientEmailOrPhone: 'vikram.singhal@rediffmail.com',
    channel: 'Email',
    sentAt: '2026-11-07 16:45',
    salespersonId: 'EMP-101',
    salespersonLogin: 'ritu.sharma',
    salespersonName: 'Ritu Sharma',
    itineraryId: 'PKG-ASSAM-01',
    itineraryVersion: 1,
    quotationId: 'QT-2026-0003',
    quotationVersionCode: 'QT-2026-0003-V1',
    destination: 'Assam',
    travelDates: '2026-11-15 to 2026-11-21',
    guestCount: 2,
    quotedAmount: 168000,
    deliveryStatus: 'read',
    followUpDate: '2026-11-10',
    enquiryStatus: 'Revision Requested',
    itinerarySnapshot: [],
    messageBody: 'Dear Mr. Singhal, Sharing the detailed Kaziranga wildlife safari & Majuli Island satra heritage tour proposal for your review.'
  }
];

// ==========================================
// 3. Initial Follow-up Schedule & Config
// ==========================================
export const INITIAL_FOLLOWUP_CONFIG: FollowUpScheduleConfig = {
  firstFollowUpDays: 1,
  secondFollowUpDays: 3,
  thirdFollowUpDays: 5,
  maxFollowUpAttempts: 4,
  preferredChannel: 'Email',
  scheduleType: 'working_days',
  followUpTime: '10:30 AM',
  quietHoursStart: '20:00',
  quietHoursEnd: '09:00',
  stopOnClientConversion: true,
  stopOnLost: true,
  stopOnClientOptOut: true
};

export const INITIAL_FOLLOWUP_ACTIVITIES: FollowUpActivity[] = [
  {
    id: 'FUA-01',
    enquiryId: 'ENQ-2026-0001',
    itineraryShareId: 'ISH-2026-0001',
    type: 'whatsapp',
    isAutomated: false,
    scheduledFor: '2026-11-03 10:30',
    executedAt: '2026-11-03 11:00',
    status: 'completed',
    performedBy: 'Ritu Sharma',
    notes: 'Followed up via WhatsApp. Client confirmed they reviewed the Polo Towers & Orchid Resort rooms and are very satisfied. Requested proforma invoice for advance deposit.',
    clientResponseSummary: 'Agreed on ₹1,48,000 quote. Asked for token payment details.'
  },
  {
    id: 'FUA-02',
    enquiryId: 'ENQ-2026-0002',
    itineraryShareId: 'ISH-2026-0002',
    type: 'email',
    isAutomated: true,
    scheduledFor: '2026-11-10 10:30',
    executedAt: '2026-11-10 10:32',
    status: 'completed',
    performedBy: 'System Automation',
    notes: 'Automatic Follow-up Email #1 dispatched according to 1-day rule. Checked safeguards: Enquiry not converted, valid email sunita@nirvanaholidays.com, within operating hours.',
    nextFollowUpDate: '2026-11-13'
  },
  {
    id: 'FUA-03',
    enquiryId: 'ENQ-2026-0003',
    itineraryShareId: 'ISH-2026-0003',
    type: 'call',
    isAutomated: false,
    scheduledFor: '2026-11-08 14:00',
    executedAt: '2026-11-08 14:15',
    status: 'completed',
    performedBy: 'Ritu Sharma',
    notes: 'Phone call with Mr. Singhal. He requested to add 1 more elephant safari in Central Bagori range and upgrade to cottage at Borgos Resort. Revision V2 underway.',
    clientResponseSummary: 'Revision requested for safari timings and room category.'
  }
];

// ==========================================
// 4. Initial Proforma Invoices & Accounts Verification
// ==========================================
export const INITIAL_PROFORMA_INVOICES: ProformaInvoice[] = [
  {
    id: 'PI-2026-0001',
    enquiryId: 'ENQ-2026-0001',
    quotationId: 'QT-2026-0001',
    quotationVersionCode: 'QT-2026-0001-V1',
    tourCode: 'LST-2026-00001',
    clientName: 'Dr. Aniruddha Sen & Family',
    contactEmail: 'aniruddha.sen@apollohospitals.org',
    contactPhone: '+91 98205 11920',
    destination: 'Meghalaya',
    travelDates: '2026-11-08 to 2026-11-13',
    paxCount: 4,
    totalAgreedSellingPrice: 148000,
    tokenPercentage: 25,
    tokenAmountPayable: 37000,
    gstRate: 5,
    gstAmount: 7048,
    paymentDueDate: '2026-11-05',
    bankDetails: {
      accountName: 'Let\'s See Tour & Travels Pvt. Ltd.',
      bankName: 'HDFC Bank Ltd., Zoo Road Branch, Guwahati',
      accountNumber: '50200088991122',
      ifscCode: 'HDFC0000289',
      upiId: 'letssee.dmc@hdfcbank'
    },
    termsAndConditions: [
      '25% non-refundable token required to secure vehicle allocation and hotel reservations.',
      'Balance 75% payable 7 days prior to arrival or via demand draft on arrival at Guwahati.',
      'GST: 5% applied as per Government of India tour operator guidelines.'
    ],
    status: 'verified_paid',
    issuedAt: '2026-11-03 14:00',
    issuedBy: 'Ritu Sharma',
    paymentProofUrl: 'PROOF_HDFC_NEFT_ANIRUDDHA_37000.pdf',
    paymentProofUploadedAt: '2026-11-03 17:15',
    paymentProofUploadedBy: 'Ritu Sharma',
    proofNotes: 'Client sent NEFT receipt screenshot via WhatsApp.',
    verifiedByAccounts: 'Pranab Sarma (Accounts Head)',
    verifiedAt: '2026-11-03 18:00',
    verifiedAmountReceived: 37000,
    verifiedBankReference: 'HDFCR52026110300984',
    verifiedPaymentMode: 'Bank Transfer (NEFT/RTGS)',
    accountsVerificationRemarks: 'Amount ₹37,000 credited to HDFC Current A/c 50200088991122 on 03-Nov-2026. Verified against bank statement. Booking commercially locked.',
    verificationStatus: 'verified'
  },
  {
    id: 'PI-2026-0002',
    enquiryId: 'ENQ-2026-0002',
    quotationId: 'QT-2026-0002',
    quotationVersionCode: 'QT-2026-0002-V1',
    clientName: 'Nirvana Holidays / Sunita Chawla',
    agentId: 'AGT-102',
    contactEmail: 'sunita@nirvanaholidays.com',
    contactPhone: '+91 98112 33441',
    destination: 'Bhutan',
    travelDates: '2026-11-20 to 2026-11-27',
    paxCount: 6,
    totalAgreedSellingPrice: 298000,
    tokenPercentage: 30,
    tokenAmountPayable: 89400,
    gstRate: 5,
    gstAmount: 14190,
    paymentDueDate: '2026-11-14',
    bankDetails: {
      accountName: 'Let\'s See Tour & Travels Pvt. Ltd.',
      bankName: 'HDFC Bank Ltd., Zoo Road Branch, Guwahati',
      accountNumber: '50200088991122',
      ifscCode: 'HDFC0000289',
      upiId: 'letssee.dmc@hdfcbank'
    },
    termsAndConditions: [
      '30% token advance required for Bhutan SDF (Sustainable Development Fee) processing.',
      'Bhutan visa clearance issued only upon receipt of government SDF fees.'
    ],
    status: 'proof_uploaded',
    issuedAt: '2026-11-10 11:30',
    issuedBy: 'Amit Baruah',
    paymentProofUrl: 'ICICI_IMPS_REF_991823.png',
    paymentProofUploadedAt: '2026-11-11 15:45',
    paymentProofUploadedBy: 'Amit Baruah',
    proofNotes: 'Agent uploaded IMPS receipt screenshot for ₹89,400. Pending Accounts verification before Tour Code release.',
    verificationStatus: 'pending_verification'
  }
];

// ==========================================
// 5. Initial Tax Configurations (5% GST Baseline)
// ==========================================
export const INITIAL_TAX_CONFIG: TaxConfiguration[] = [
  {
    id: 'TAX-01',
    taxName: 'GST on Packaged Tours (With Input Tax Restriction)',
    ratePct: 5,
    cgstPct: 2.5,
    sgstPct: 2.5,
    igstPct: 5,
    applicableCategory: 'tour_package',
    calculationMethod: 'tax_exclusive',
    effectiveDate: '2026-04-01',
    verifiedByTaxAdvisor: true,
    notes: 'Section 11(1) Notification No. 11/2017-Central Tax (Rate) - 5% GST without input tax credit for Tour Operators.',
    updatedBy: 'Pranab Sarma (Accounts Controller)',
    updatedAt: '2026-10-15'
  },
  {
    id: 'TAX-02',
    taxName: 'GST on Standalone Hotel Bookings (Direct Sourcing)',
    ratePct: 12,
    cgstPct: 6,
    sgstPct: 6,
    igstPct: 12,
    applicableCategory: 'hotel_only',
    calculationMethod: 'tax_inclusive',
    effectiveDate: '2026-04-01',
    verifiedByTaxAdvisor: true,
    notes: 'Tariff between ₹1,001 and ₹7,500 attracts 12% GST.',
    updatedBy: 'Pranab Sarma (Accounts Controller)',
    updatedAt: '2026-10-15'
  }
];

// ==========================================
// 6. Initial Rate Change Audit Logs
// ==========================================
export const INITIAL_RATE_AUDITS: RateChangeAudit[] = [
  {
    id: 'RCA-01',
    serviceType: 'hotel',
    serviceName: 'Executive Heritage Room (MAPAI)',
    supplierName: 'Hotel Polo Towers Shillong',
    destination: 'Meghalaya',
    oldPrice: 5000,
    newPrice: 5500,
    reasonForChange: 'Annual contract revision for Autumn / Cherry Blossom peak season 2026',
    changedBy: 'Anurag Gogoi (Backend Admin)',
    approvedByAccounts: 'Pranab Sarma (Accounts Head)',
    approvalDate: '2026-10-01',
    status: 'approved'
  },
  {
    id: 'RCA-02',
    serviceType: 'transport',
    serviceName: 'Company Own Innova Crysta Internal Allocation Rate',
    supplierName: 'Let\'s See Fleet Guwahati',
    destination: 'Meghalaya',
    oldPrice: 3200,
    newPrice: 3500,
    reasonForChange: 'Increase in fuel and toll charges on Guwahati-Shillong expressway',
    changedBy: 'Bikram Thapa (Operations Lead)',
    approvedByAccounts: 'Pranab Sarma (Accounts Head)',
    approvalDate: '2026-10-05',
    status: 'approved'
  }
];

// ==========================================
// 7. Initial Destination Sourcing Rules
// ==========================================
export const INITIAL_SOURCING_RULES: DestinationSourcingRule[] = [
  {
    id: 'DSR-01',
    destination: 'Meghalaya',
    isNortheastIndia: true,
    defaultTransportSource: 'own_fleet',
    allowExternalVendorException: true,
    requiresAdminApprovalForExternal: true,
    notes: 'Mandatory company-owned fleet (Innova Crysta / Tempo Traveller) with company drivers. External vendor prohibited unless full fleet is booked out.'
  },
  {
    id: 'DSR-02',
    destination: 'Assam',
    isNortheastIndia: true,
    defaultTransportSource: 'own_fleet',
    allowExternalVendorException: true,
    requiresAdminApprovalForExternal: true,
    notes: 'Mandatory company fleet from Guwahati base. Kaziranga local jeep safaris contracted via Kaziranga Gypsy Association.'
  },
  {
    id: 'DSR-03',
    destination: 'Arunachal Pradesh',
    isNortheastIndia: true,
    defaultTransportSource: 'own_fleet',
    allowExternalVendorException: true,
    requiresAdminApprovalForExternal: true,
    notes: 'Mandatory 4x4 or high ground clearance company fleet with mountain-certified drivers.'
  },
  {
    id: 'DSR-04',
    destination: 'Bhutan',
    isNortheastIndia: false,
    defaultTransportSource: 'external_vendor',
    allowExternalVendorException: true,
    requiresAdminApprovalForExternal: false,
    notes: 'External vendor permitted. Bhutan government regulations mandate Bhutanese licensed tourist vehicles and local drivers.'
  },
  {
    id: 'DSR-05',
    destination: 'Thailand',
    isNortheastIndia: false,
    defaultTransportSource: 'external_vendor',
    allowExternalVendorException: true,
    requiresAdminApprovalForExternal: false,
    notes: 'Contracted via Royal Siam DMC Bangkok.'
  }
];

// ==========================================
// 8. Initial Arrival and Departure Logistics
// ==========================================
export const INITIAL_ARRIVAL_DEPARTURES: ArrivalDepartureInfo[] = [
  {
    tourCode: 'LST-2026-00001',
    enquiryId: 'ENQ-2026-0001',
    leadGuestName: 'Dr. Aniruddha Sen',
    contactPhone: '+91 98205 11920',
    paxCount: 4,
    arrivalDate: '2026-11-08',
    arrivalTime: '10:30 AM',
    arrivalPoint: 'Guwahati Airport (GAU) - Lokpriya Gopinath Bordoloi Terminal 1',
    arrivalFlightOrTrain: 'IndiGo 6E-6548 (BOM-GAU)',
    pickupAddress: 'Arrival Gate 2, VIP Pickup Lane',
    departureDate: '2026-11-13',
    departureTime: '16:45 PM',
    departurePoint: 'Guwahati Airport (GAU) Terminal 1',
    departureFlightOrTrain: 'IndiGo 6E-205 (GAU-BOM)',
    dropAddress: 'Departure Drop-off Porch Gate 1',
    luggageDetails: '4 large check-in bags + 3 cabin trolleys. Innova Crysta rooftop carrier fitted.',
    emergencyContact: '+91 98205 11920 / Mrs. Sen +91 98205 11921',
    specialInstructions: 'Senior citizen in group. Assist with wheelchair at airport if requested. Complimentary warm water flasks in car.',
    assignedDriverName: 'Ramen Das',
    assignedDriverPhone: '+91 98640 12345',
    assignedVehiclePlate: 'AS-01-EC-4021',
    status: 'in_transit',
    updatedAt: '2026-11-08 07:00',
    updatedBy: 'Bikram Thapa'
  },
  {
    tourCode: 'LST-2026-00002',
    enquiryId: 'ENQ-2026-0005',
    leadGuestName: 'Karan Mehra (Lead Coordinator)',
    contactPhone: '+91 98201 44552',
    paxCount: 14,
    arrivalDate: '2026-11-12',
    arrivalTime: '11:45 AM',
    arrivalPoint: 'Guwahati Airport (GAU)',
    arrivalFlightOrTrain: 'Air India AI-731',
    pickupAddress: 'Coach Parking Bay 4',
    departureDate: '2026-11-18',
    departureTime: '14:20 PM',
    departurePoint: 'Guwahati Airport (GAU)',
    departureFlightOrTrain: 'Air India AI-732',
    dropAddress: 'Departure Bay',
    luggageDetails: '14 suitcases + corporate presentation materials. Force Urbania 17-seater boot reserved.',
    emergencyContact: '+91 98201 44552',
    specialInstructions: 'Corporate group. Name signage "TRAVELPLANNERS - LET\'S SEE TOUR". Provide welcome drink hampers.',
    assignedDriverName: 'Mukul Kalita',
    assignedDriverPhone: '+91 98640 55443',
    assignedVehiclePlate: 'AS-01-TC-8890',
    status: 'vehicle_assigned',
    updatedAt: '2026-11-10 16:00',
    updatedBy: 'Bikram Thapa'
  }
];

// ==========================================
// 9. Initial Internal Messages (Cross-Department)
// ==========================================
export const INITIAL_INTERNAL_MESSAGES: InternalMessage[] = [
  {
    id: 'MSG-01',
    linkedType: 'tour_code',
    linkedId: 'LST-2026-00001',
    senderDepartment: 'sales',
    senderEmployeeId: 'EMP-101',
    senderName: 'Ritu Sharma',
    senderLogin: 'ritu.sharma',
    targetDepartment: 'operations',
    message: 'Dr. Sen called to inform that flight IndiGo 6E-6548 is on time. Please ensure Ramen Das is waiting with signboard at GAU Arrival Gate 2 by 10:15 AM.',
    timestamp: '2026-11-08 08:30',
    attachmentName: 'FLIGHT_STATUS_6E6548.png',
    mentionedEmployees: ['EMP-201', 'EMP-202'],
    isActionableTask: true,
    taskConvertedId: 'TSK-01',
    readBy: ['EMP-201', 'EMP-202']
  },
  {
    id: 'MSG-02',
    linkedType: 'tour_code',
    linkedId: 'LST-2026-00001',
    senderDepartment: 'operations',
    senderEmployeeId: 'EMP-201',
    senderName: 'Bikram Thapa',
    senderLogin: 'bikram.thapa',
    targetDepartment: 'sales',
    message: 'Driver Ramen Das is stationed at Gate 2 with Innova AS-01-EC-4021. Cold wet wipes and welcome pack are inside the vehicle.',
    timestamp: '2026-11-08 09:45',
    readBy: ['EMP-101']
  },
  {
    id: 'MSG-03',
    linkedType: 'tour_code',
    linkedId: 'LST-2026-00001',
    senderDepartment: 'sales',
    senderEmployeeId: 'EMP-101',
    senderName: 'Ritu Sharma',
    senderLogin: 'ritu.sharma',
    targetDepartment: 'accounts',
    message: 'Client has verified proforma token ₹37,000. Balance ₹1,11,000 will be collected 50% on Day 3 and 50% on departure.',
    timestamp: '2026-11-04 11:00',
    readBy: ['EMP-301']
  },
  {
    id: 'MSG-04',
    linkedType: 'enquiry_id',
    linkedId: 'ENQ-2026-0002',
    senderDepartment: 'sales',
    senderEmployeeId: 'EMP-102',
    senderName: 'Amit Baruah',
    senderLogin: 'amit.baruah',
    targetDepartment: 'accounts',
    message: 'Sunita Ji from Nirvana Holidays has uploaded IMPS screenshot for ₹89,400 token advance. Kindly verify bank credit so we can confirm Bhutan hotel slots.',
    timestamp: '2026-11-11 16:00',
    attachmentName: 'ICICI_IMPS_REF_991823.png',
    mentionedEmployees: ['EMP-301'],
    isActionableTask: true,
    readBy: ['EMP-301']
  }
];

// ==========================================
// 10. Initial Notifications Center
// ==========================================
export const INITIAL_NOTIFICATIONS: DmcNotification[] = [
  {
    id: 'NOTIF-01',
    category: 'payment_proof_uploaded',
    title: 'Payment Proof Uploaded - Nirvana Holidays',
    message: 'Amit Baruah uploaded IMPS receipt ₹89,400 for Bhutan tour ENQ-2026-0002. Accounts verification requested.',
    linkedReference: 'ENQ-2026-0002',
    targetDepartment: 'accounts',
    targetEmployeeId: 'EMP-301',
    timestamp: '2026-11-11 15:45',
    read: false,
    priority: 'urgent'
  },
  {
    id: 'NOTIF-02',
    category: 'auto_follow_up_sent',
    title: 'Automated Follow-up Email Sent',
    message: 'System automation sent 1st follow-up email to sunita@nirvanaholidays.com for Bhutan Proposal QT-2026-0002.',
    linkedReference: 'ENQ-2026-0002',
    targetDepartment: 'sales',
    targetEmployeeId: 'EMP-102',
    timestamp: '2026-11-10 10:32',
    read: true,
    priority: 'normal'
  },
  {
    id: 'NOTIF-03',
    category: 'hotel_confirmed',
    title: 'Hotel Booking Confirmed - Polo Towers',
    message: 'Polo Towers Shillong confirmed 2x Executive Rooms with reference PT-SHL-2026-9901 for tour LST-2026-00001.',
    linkedReference: 'LST-2026-00001',
    targetDepartment: 'operations',
    timestamp: '2026-11-05 16:30',
    read: true,
    priority: 'normal'
  },
  {
    id: 'NOTIF-04',
    category: 'ai_intent_detected',
    title: 'AI Conversion Intent Detected',
    message: 'Client reply analyzed for ENQ-2026-0001: Intent "Confirmed" (Score 0.94). Suggested stage: Confirmation Received.',
    linkedReference: 'ENQ-2026-0001',
    targetDepartment: 'sales',
    targetEmployeeId: 'EMP-101',
    timestamp: '2026-11-03 10:45',
    read: true,
    priority: 'high'
  }
];

// ==========================================
// 11. External Integrations Specifications
// ==========================================
export const INITIAL_INTEGRATIONS: ExternalIntegrationSpec[] = [
  {
    id: 'INT-WHATSAPP',
    name: 'WhatsApp Business Cloud API',
    provider: 'Meta for Developers (WhatsApp Cloud API)',
    category: 'whatsapp',
    status: 'active_simulator',
    isMandatory: true,
    officialDocUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    requiredCredentials: ['Meta App ID', 'System User Access Token', 'WhatsApp Business Account ID (WABA)', 'Phone Number ID'],
    estimatedCost: 'Marketing conversations ~₹0.85/msg, Service/Utility conversations ~₹0.15/msg (India tier)',
    technicalLimitations: [
      '24-hour customer service window applies for non-template messages.',
      'All initial itinerary outbound messages require pre-approved Meta message templates.',
      'Quality rating must remain High/Medium to prevent messaging rate limits.'
    ],
    setupGuide: [
      '1. Create Meta Business Manager account & verify organization business details.',
      '2. Register 10-digit company phone number on WhatsApp Cloud API portal.',
      '3. Submit template "dmc_itinerary_proposal_v1" for Meta review and approval.',
      '4. Configure Webhook callback URL to receive real-time message read & delivery receipts.'
    ],
    apiSettings: {
      phoneId: '109845019284019',
      wabaId: '394850192837491',
      senderNumber: '+91 98640 99999',
      templateName: 'dmc_itinerary_proposal_v1'
    }
  },
  {
    id: 'INT-GMAIL',
    name: 'Gmail API / Microsoft Graph API',
    provider: 'Google Workspace (OAuth 2.0)',
    category: 'email',
    status: 'active_simulator',
    isMandatory: true,
    officialDocUrl: 'https://developers.google.com/gmail/api/guides',
    requiredCredentials: ['Client ID', 'Client Secret', 'Authorized Redirect URI', 'OAuth Refresh Token'],
    estimatedCost: 'Included with Google Workspace enterprise subscription (no per-email fee)',
    technicalLimitations: [
      'Daily sending quota of 2,000 messages per user per day.',
      'Subject to strict SPF, DKIM, and DMARC authentication requirements to avoid spam folder.'
    ],
    setupGuide: [
      '1. Enable Gmail API in Google Cloud Console project.',
      '2. Configure OAuth consent screen with scopes: https://www.googleapis.com/auth/gmail.send and readonly.',
      '3. Connect info@letsee.in and sales@letsee.in system service accounts.',
      '4. Verify automated follow-up delivery logs in Google Workspace admin console.'
    ],
    apiSettings: {
      senderAddress: 'sales@letsee.in',
      replyTo: 'manash.bora@letsee.in',
      trackOpens: 'true'
    }
  },
  {
    id: 'INT-AI',
    name: 'Gemini AI Conversion Intent Engine',
    provider: 'Google AI Studio (@google/genai SDK)',
    category: 'ai',
    status: 'configured',
    isMandatory: false,
    officialDocUrl: 'https://ai.google.dev/docs',
    requiredCredentials: ['GEMINI_API_KEY (Server-side proxy injected)'],
    estimatedCost: 'Covered under AI Studio runtime quota / gemini-3.8-flash pricing',
    technicalLimitations: [
      'Must strictly follow workflow: AI detects intent -> Suggests status -> Sales human confirms.',
      'AI must never silently alter financial records or confirm bookings without human signoff.'
    ],
    setupGuide: [
      '1. Configured via server-side Gemini API proxy.',
      '2. Structured JSON response schema enforcing intent categories.',
      '3. Sales confirmation modal prompts one-click verification.'
    ],
    apiSettings: {
      model: 'gemini-3.8-flash',
      temperature: '0.2'
    }
  },
  {
    id: 'INT-SCHEDULER',
    name: 'Automated Background Follow-up Engine',
    provider: 'Node.js Cron & Event Queue',
    category: 'scheduler',
    status: 'active_simulator',
    isMandatory: true,
    officialDocUrl: 'https://nodejs.org/api/timers.html',
    requiredCredentials: ['System Service Runner'],
    estimatedCost: 'Zero external cost',
    technicalLimitations: [
      'Must check quiet hours (e.g. 8:00 PM to 9:00 AM) and delay execution to morning.',
      'Must check idempotency keys to strictly avoid duplicate follow-up emails.'
    ],
    setupGuide: [
      '1. Evaluates due follow-ups every 15 minutes.',
      '2. Checks stop conditions: already converted, marked lost, or opted out.',
      '3. Logs every automated dispatch to AutomationLog audit table.'
    ],
    apiSettings: {
      frequency: 'Every 15 minutes',
      enforceQuietHours: 'true'
    }
  },
  {
    id: 'INT-PAYMENT',
    name: 'Payment Gateway (Razorpay / Cashfree & Direct IMPS)',
    provider: 'Razorpay India / Direct Corporate Net Banking',
    category: 'payment_gateway',
    status: 'active_simulator',
    isMandatory: false,
    officialDocUrl: 'https://razorpay.com/docs/api',
    requiredCredentials: ['Key ID', 'Key Secret', 'Webhook Secret'],
    estimatedCost: '1.9% to 2% + 18% GST per card transaction; UPI transfers at 0%',
    technicalLimitations: [
      'Manual bank transfer / NEFT / RTGS requires Accounts Maker-Checker verification against bank statement.',
      'Payment proof screenshot upload does NOT automatically mark payment verified.'
    ],
    setupGuide: [
      '1. Connect Razorpay / Cashfree Merchant ID.',
      '2. Webhook listener for payment.authorized and payment.captured events.',
      '3. Instant notification dispatched to Accounts and Sales teams.'
    ],
    apiSettings: {
      merchantId: 'MID_LETSEE_GUW_001',
      webhookVerified: 'true'
    }
  }
];

// ==========================================
// 12. Initial Master Hotels & Transports
// ==========================================
export const INITIAL_MASTER_HOTELS: MasterHotelRecord[] = [
  {
    id: 'M-HTL-01',
    hotelName: 'Hotel Polo Towers Shillong',
    destination: 'Meghalaya',
    address: 'Oakland Road, Polo Grounds, Shillong, Meghalaya 793001',
    contactPerson: 'Pranjal Dutta (Reservations Manager)',
    phone: '+91 98640 44111',
    email: 'reservations@polotowers.com',
    category: 'Deluxe (4-Star)',
    roomCategories: ['Premier Room', 'Executive Heritage Room', 'Boutique Suite'],
    mealPlans: ['CP', 'MAP', 'AP'],
    contractRatePerNight: 5500,
    peakSeasonSurchargePct: 20,
    cancellationPolicy: 'Free cancellation 7 days before check-in. 50% retention within 48-72 hrs. 100% retention on same day.',
    supplierId: 'SUP-H-01',
    active: true
  },
  {
    id: 'M-HTL-02',
    hotelName: 'Polo Orchid Resort Cherrapunjee',
    destination: 'Meghalaya',
    address: 'Mawsmai, Nohsithiang Falls Road, Cherrapunjee, Meghalaya 793108',
    contactPerson: 'David Lyngdoh',
    phone: '+91 98640 44222',
    email: 'cherra@poloorchidresort.com',
    category: 'Luxury (5-Star / Heritage)',
    roomCategories: ['Misty Mountain Villa', 'Seven Sisters Waterfall Suite', 'Log Cabin'],
    mealPlans: ['CP', 'MAP', 'AP'],
    contractRatePerNight: 8500,
    peakSeasonSurchargePct: 25,
    cancellationPolicy: '15 days prior 100% refund; 7-14 days 50% retention; under 7 days 100% retention.',
    supplierId: 'SUP-H-01',
    active: true
  },
  {
    id: 'M-HTL-03',
    hotelName: 'Borgos Resort Kaziranga',
    destination: 'Assam',
    address: 'No 1 Sildubi, Kohora, Kaziranga National Park, Assam 785609',
    contactPerson: 'Nayan Hazarika',
    phone: '+91 98640 55111',
    email: 'booking@resortborgos.com',
    category: 'Deluxe (4-Star)',
    roomCategories: ['Executive Room', 'Cottage', 'Presidential Suite'],
    mealPlans: ['CP', 'MAP', 'AP'],
    contractRatePerNight: 6200,
    peakSeasonSurchargePct: 15,
    cancellationPolicy: '7 days before arrival free cancellation; 50% under 7 days.',
    supplierId: 'SUP-H-02',
    active: true
  },
  {
    id: 'M-HTL-04',
    hotelName: 'Dhensa Boutique Resort Punakha',
    destination: 'Bhutan',
    address: 'Punakha Valley, Bhutan',
    contactPerson: 'Tashi Wangchuk',
    phone: '+975 2 584444',
    email: 'reservations@dhensa.com',
    category: 'Luxury (5-Star / Heritage)',
    roomCategories: ['Deluxe Suite with Forest View'],
    mealPlans: ['MAP', 'AP'],
    contractRatePerNight: 16500,
    peakSeasonSurchargePct: 30,
    cancellationPolicy: '30 days prior free cancellation; 15-30 days 50%; under 15 days 100%.',
    supplierId: 'SUP-H-04',
    active: true
  }
];

export const INITIAL_MASTER_TRANSPORTS: MasterTransportRecord[] = [
  {
    id: 'M-TRP-01',
    category: 'SUV',
    model: 'Toyota Innova Crysta (Company Owned)',
    seatingCapacity: 6,
    destination: 'Meghalaya',
    isCompanyFleet: true,
    internalDailyRate: 3500,
    fuelIncluded: true,
    driverAllowanceIncluded: true,
    active: true
  },
  {
    id: 'M-TRP-02',
    category: 'Tempo Traveller',
    model: 'Force Urbania 17-Seater Luxury (Company Owned)',
    seatingCapacity: 16,
    destination: 'Assam',
    isCompanyFleet: true,
    internalDailyRate: 6500,
    fuelIncluded: true,
    driverAllowanceIncluded: true,
    active: true
  },
  {
    id: 'M-TRP-03',
    category: 'Coach',
    model: 'Bhutan Tourism Coaster Bus (Vendor Hired)',
    seatingCapacity: 22,
    destination: 'Bhutan',
    isCompanyFleet: false,
    internalDailyRate: 0,
    vendorContractRatePerDay: 11000,
    supplierId: 'SUP-T-02',
    fuelIncluded: true,
    driverAllowanceIncluded: true,
    active: true
  }
];

