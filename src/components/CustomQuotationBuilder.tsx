import React, { useState, useMemo, useRef } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  LeadEnquiry,
  TourPackage,
  ItineraryDay,
  CostComponent,
  LeadSelectedItinerary
} from '../types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  MessageCircle,
  Printer,
  CheckCircle2,
  Copy,
  Check,
  Car,
  Utensils,
  Ticket,
  Building2,
  ArrowRight
} from 'lucide-react';

export interface CustomQuotationBuilderProps {
  lead: LeadEnquiry;
  seedPackage?: TourPackage | null;
  onCancel: () => void;
  onQuotationCreated?: (quotationId: string, versionCode: string) => void;
  onProceedToCosting?: (lead: LeadEnquiry, itineraryData: any) => void;
}

interface DayQuoteRow extends ItineraryDay {
  hotelRooms: number;
  hotelRatePerNight: number;
  transportSegmentCost: number;
  extraMealCost: number;
}

interface EntryFeeItem {
  id: string;
  title: string;
  dayOrLocation: string;
  includedInQuote: boolean;
  paxOrQty: number;
  unitFee: number;
}

function buildInitialDaysFromSeed(
  lead: LeadEnquiry,
  seedPackage?: TourPackage | null
): DayQuoteRow[] {
  const sourceDays: ItineraryDay[] =
    seedPackage?.itinerary && seedPackage.itinerary.length > 0
      ? JSON.parse(JSON.stringify(seedPackage.itinerary))
      : lead.selectedItinerary?.daysList && lead.selectedItinerary.daysList.length > 0
      ? JSON.parse(JSON.stringify(lead.selectedItinerary.daysList))
      : Array.from({ length: Math.max(2, lead.days) }, (_, idx) => {
          const dayNum = idx + 1;
          if (dayNum === 1) {
            return {
              dayNumber: 1,
              title: `Arrival & Transfer to ${lead.destination}`,
              startLocation: 'Guwahati Airport / Hub',
              endLocation: lead.destination,
              distanceKm: 100,
              durationHours: 3,
              activities: ['Meet & greet with placard', 'Check-in to hotel & evening leisure'],
              mealsIncluded: ['Dinner'],
              hotelName: `Recommended ${lead.destination} Hotel`,
              hotelCity: lead.destination
            };
          }
          if (dayNum === Math.max(2, lead.days)) {
            return {
              dayNumber: dayNum,
              title: `Departure from ${lead.destination}`,
              startLocation: lead.destination,
              endLocation: 'Guwahati Airport / Station',
              distanceKm: 100,
              durationHours: 3,
              activities: ['Breakfast & hotel check-out', 'Departure transfer'],
              mealsIncluded: ['Breakfast'],
              hotelName: '',
              hotelCity: ''
            };
          }
          return {
            dayNumber: dayNum,
            title: `${lead.destination} Full-Day Sightseeing`,
            startLocation: lead.destination,
            endLocation: lead.destination,
            distanceKm: 65,
            durationHours: 6,
            activities: ['Guided sightseeing tour & viewpoints', 'Evening local market visit'],
            mealsIncluded: ['Breakfast', 'Dinner'],
            hotelName: `Recommended ${lead.destination} Hotel`,
            hotelCity: lead.destination
          };
        });

  const defaultRooms = Math.max(1, lead.roomCount || Math.ceil((lead.adults || 2) / 2));

  return sourceDays.map((d, idx) => {
    const isLastDay = idx === sourceDays.length - 1 && !d.hotelName;
    return {
      ...d,
      mealsIncluded: d.mealsIncluded ? [...d.mealsIncluded] : ['Breakfast'],
      hotelRooms: isLastDay ? 0 : defaultRooms,
      hotelRatePerNight: isLastDay ? 0 : 4500,
      transportSegmentCost: 0,
      extraMealCost: 0
    };
  });
}

export const CustomQuotationBuilder: React.FC<CustomQuotationBuilderProps> = ({
  lead,
  seedPackage,
  onCancel,
  onQuotationCreated
}) => {
  const {
    fleet,
    suppliers,
    masterHotels,
    currentEmployee,
    createQuotation,
    updateLead,
    sendItinerary,
    setPrintableDocument
  } = useDmc();

  const totalPayingPax = Math.max(1, (lead.adults || 1) + (lead.children || 0));

  // Header & Commercial Details
  const [quoteTitle, setQuoteTitle] = useState(
    seedPackage
      ? `${seedPackage.name} — Proposal for ${lead.clientName}`
      : `Custom ${lead.destination} (${lead.nights}N/${lead.days}D) Proposal`
  );
  const [hotelCategory, setHotelCategory] = useState(lead.hotelCategoryPreference);
  const [roomingConfig, setRoomingConfig] = useState(
    `${Math.max(1, lead.roomCount || Math.ceil(totalPayingPax / 2))} Double / Twin Room(s)`
  );
  const [validityDate, setValidityDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().substring(0, 10);
  });
  const [paymentTerms, setPaymentTerms] = useState(
    '30% advance upon booking confirmation, 40% 15 days before arrival, balance 30% on arrival.'
  );

  // Travelling / Transport Details
  const [transportSource, setTransportSource] = useState<'own_fleet' | 'external_supplier' | 'none'>('own_fleet');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(fleet[0]?.id || '');
  const [selectedTransportVendorId, setSelectedTransportVendorId] = useState<string>(
    suppliers.find(s => s.category === 'Transport Vendor')?.id || suppliers[0]?.id || ''
  );
  const [vehicleLabel, setVehicleLabel] = useState<string>(
    fleet[0] ? `${fleet[0].model} (${fleet[0].registrationNumber})` : lead.transportPreference
  );
  const [pickupPoint, setPickupPoint] = useState('Guwahati Airport (GAU) / Railway Station');
  const [dropPoint, setDropPoint] = useState('Guwahati Airport (GAU) / Railway Station');
  const [vehicleDailyRate, setVehicleDailyRate] = useState<number>(fleet[0]?.internalDailyRate || 3800);
  const [tollsAndParking, setTollsAndParking] = useState<number>(2500);

  // Day-by-Day Itinerary + Hotel + Meals
  const [daysList, setDaysList] = useState<DayQuoteRow[]>(() =>
    buildInitialDaysFromSeed(lead, seedPackage)
  );

  // Entry Fees / Permits
  const [includeEntryFeesInQuote, setIncludeEntryFeesInQuote] = useState<boolean>(true);
  const [entryFees, setEntryFees] = useState<EntryFeeItem[]>([
    {
      id: 'EF-1',
      title: `${lead.destination} Sightseeing Monument & Nature Park Entry Fees`,
      dayOrLocation: lead.destination,
      includedInQuote: true,
      paxOrQty: totalPayingPax,
      unitFee: 600
    },
    {
      id: 'EF-2',
      title: 'Local Permits / SDF / Ferry / Sanctuary Pass (If Applicable)',
      dayOrLocation: lead.destination,
      includedInQuote: true,
      paxOrQty: totalPayingPax,
      unitFee: 400
    }
  ]);

  // Margin & Tax
  const [markupPct, setMarkupPct] = useState<number>(28);
  const [gstPct, setGstPct] = useState<number>(5);

  // Inclusions & Exclusions
  const [inclusionsText, setInclusionsText] = useState<string>(() => {
    if (seedPackage?.inclusions?.length) return seedPackage.inclusions.join('\n');
    return [
      `${Math.max(1, daysList.length - 1)} Nights accommodation in ${hotelCategory} hotels`,
      'Daily Breakfast & Dinner at hotel (Lunch where specified)',
      `Dedicated private ${lead.transportPreference} for all transfers & sightseeing`,
      'Driver allowance, toll taxes, fuel & parking charges',
      'Sightseeing monument entry fees & permits as specified'
    ].join('\n');
  });

  const [exclusionsText, setExclusionsText] = useState<string>(() => {
    if (seedPackage?.exclusions?.length) return seedPackage.exclusions.join('\n');
    return [
      'Airfare / Rail tickets unless specifically included',
      'Personal expenses, tips, laundry, room heater & camera fees',
      'Optional adventure activities (zip-lining, boating, elephant rides)',
      '5% GST or any tax increase levied by government authorities'
    ].join('\n');
  });

  // Created Quotation & Sharing State
  const [createdQuoteInfo, setCreatedQuoteInfo] = useState<{
    quotationId: string;
    versionCode: string;
    finalSellingPrice: number;
    perPersonPrice: number;
  } | null>(null);
  const [recipientEmail, setRecipientEmail] = useState(lead.email || '');
  const [recipientPhone, setRecipientPhone] = useState(lead.phone || '');
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);
  const [whatsappSentStatus, setWhatsappSentStatus] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const topPanelRef = useRef<HTMLDivElement | null>(null);

  // ============================================
  // LIVE COSTING CALCULATIONS
  // ============================================
  const runningDays = Math.max(1, daysList.length);
  const nightsCount = Math.max(1, daysList.length - 1);

  const totalHotelCost = useMemo(
    () =>
      daysList.reduce(
        (sum, d) => sum + (d.hotelName ? (d.hotelRooms || 0) * (d.hotelRatePerNight || 0) : 0),
        0
      ),
    [daysList]
  );

  const totalTransportCost = useMemo(() => {
    if (transportSource === 'none') return 0;
    const baseRunCost = runningDays * (vehicleDailyRate || 0) + (tollsAndParking || 0);
    const segmentExtras = daysList.reduce((sum, d) => sum + (d.transportSegmentCost || 0), 0);
    return baseRunCost + segmentExtras;
  }, [transportSource, runningDays, vehicleDailyRate, tollsAndParking, daysList]);

  const totalMealsAddonCost = useMemo(
    () => daysList.reduce((sum, d) => sum + (d.extraMealCost || 0), 0),
    [daysList]
  );

  const totalEntryFeesCost = useMemo(() => {
    if (!includeEntryFeesInQuote) return 0;
    return entryFees
      .filter(f => f.includedInQuote)
      .reduce((sum, f) => sum + (f.paxOrQty || 0) * (f.unitFee || 0), 0);
  }, [includeEntryFeesInQuote, entryFees]);

  const totalDirectCost =
    totalHotelCost + totalTransportCost + totalMealsAddonCost + totalEntryFeesCost;
  const markupAmount = Math.round((totalDirectCost * markupPct) / 100);
  const subtotalSellingPrice = totalDirectCost + markupAmount;
  const gstAmount = Math.round((subtotalSellingPrice * gstPct) / 100);
  const finalSellingPrice = subtotalSellingPrice + gstAmount;
  const perPersonPrice = Math.round(finalSellingPrice / totalPayingPax);

  // ============================================
  // DAY & MEAL HELPERS
  // ============================================
  const applyMealPlanPreset = (preset: 'CP' | 'MAP' | 'AP') => {
    setDaysList(prev =>
      prev.map((d, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === prev.length - 1;
        let meals: ('Breakfast' | 'Lunch' | 'Dinner')[] = ['Breakfast'];
        if (preset === 'CP') {
          meals = isFirst ? [] : ['Breakfast'];
        } else if (preset === 'MAP') {
          meals = isFirst ? ['Dinner'] : isLast ? ['Breakfast'] : ['Breakfast', 'Dinner'];
        } else if (preset === 'AP') {
          meals = isFirst
            ? ['Lunch', 'Dinner']
            : isLast
            ? ['Breakfast', 'Lunch']
            : ['Breakfast', 'Lunch', 'Dinner'];
        }
        return { ...d, mealsIncluded: meals };
      })
    );
  };

  const toggleDayMeal = (dayIdx: number, meal: 'Breakfast' | 'Lunch' | 'Dinner') => {
    setDaysList(prev =>
      prev.map((d, idx) => {
        if (idx !== dayIdx) return d;
        const exists = d.mealsIncluded.includes(meal);
        const order: ('Breakfast' | 'Lunch' | 'Dinner')[] = ['Breakfast', 'Lunch', 'Dinner'];
        const updated = exists
          ? d.mealsIncluded.filter(m => m !== meal)
          : [...d.mealsIncluded, meal].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        return { ...d, mealsIncluded: updated };
      })
    );
  };

  const handleAddDay = () => {
    const nextNum = daysList.length + 1;
    setDaysList(prev => [
      ...prev,
      {
        dayNumber: nextNum,
        title: `${lead.destination} Sightseeing & Excursion`,
        startLocation: lead.destination,
        endLocation: lead.destination,
        distanceKm: 50,
        durationHours: 5,
        activities: ['Local sightseeing & excursion'],
        mealsIncluded: ['Breakfast', 'Dinner'],
        hotelName: `Recommended ${lead.destination} Hotel`,
        hotelCity: lead.destination,
        hotelRooms: Math.max(1, lead.roomCount || 1),
        hotelRatePerNight: 4500,
        transportSegmentCost: 0,
        extraMealCost: 0
      }
    ]);
  };

  const handleRemoveDay = (idx: number) => {
    if (daysList.length <= 1) return;
    setDaysList(prev =>
      prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }))
    );
  };

  const handleAddEntryFee = () => {
    setEntryFees(prev => [
      ...prev,
      {
        id: `EF-${Date.now()}`,
        title: 'Monument / Safari / Permit Entry Fee',
        dayOrLocation: lead.destination,
        includedInQuote: true,
        paxOrQty: totalPayingPax,
        unitFee: 500
      }
    ]);
  };

  // Format complete DMC shareable text
  const shareableQuotationText = useMemo(() => {
    const code = createdQuoteInfo?.versionCode || 'DRAFT-QUOTE';
    const total = createdQuoteInfo?.finalSellingPrice ?? finalSellingPrice;
    const perPax = createdQuoteInfo?.perPersonPrice ?? perPersonPrice;

    const lines: string[] = [
      `*QUOTATION PROPOSAL — LET'S SEE TOUR & TRAVELS PVT. LTD.*`,
      `Ref: ${code} | Query: ${lead.referenceId || lead.id}`,
      `Prepared For: ${lead.clientName}`,
      `Destination: ${lead.destination} (${nightsCount} Nights / ${runningDays} Days)`,
      `Travel Dates: ${lead.travelStartDate} to ${lead.travelEndDate}`,
      `Travellers: ${lead.adults} Adults${lead.children > 0 ? `, ${lead.children} Children` : ''}${lead.focCount ? `, ${lead.focCount} FOC` : ''} | ${roomingConfig}`,
      `Transport: ${transportSource === 'none' ? 'Excluded' : `${vehicleLabel} (${pickupPoint} → ${dropPoint})`}`,
      ``,
      `*QUOTED PACKAGE PRICE:* ₹${total.toLocaleString('en-IN')} Total (₹${perPax.toLocaleString('en-IN')} per person, incl. ${gstPct}% GST)`,
      ``,
      `*DAY-WISE ITINERARY, HOTELS & MEALS:*`
    ];

    daysList.forEach(d => {
      const mealStr = d.mealsIncluded.length > 0 ? d.mealsIncluded.join(', ') : 'None';
      lines.push(
        `Day ${d.dayNumber}: ${d.title} (${d.startLocation} → ${d.endLocation})`
      );
      if (d.activities.length > 0) {
        lines.push(`  • Activities: ${d.activities.join(', ')}`);
      }
      lines.push(
        `  • Meals: ${mealStr}${d.hotelName ? ` | Stay: ${d.hotelName}${d.hotelCity ? ` (${d.hotelCity})` : ''}` : ''}`
      );
    });

    if (includeEntryFeesInQuote && entryFees.some(f => f.includedInQuote)) {
      lines.push(``);
      lines.push(`*INCLUDED ENTRY FEES & PERMITS:*`);
      entryFees
        .filter(f => f.includedInQuote)
        .forEach(f => lines.push(`  ✓ ${f.title} (${f.dayOrLocation})`));
    }

    const excludedFees = entryFees.filter(f => !includeEntryFeesInQuote || !f.includedInQuote);
    if (excludedFees.length > 0) {
      lines.push(`*ENTRY FEES PAYABLE DIRECTLY AT SITE:*`);
      excludedFees.forEach(f => lines.push(`  • ${f.title} (approx. ₹${f.unitFee}/pax)`));
    }

    const incList = inclusionsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (incList.length > 0) {
      lines.push(``);
      lines.push(`*INCLUSIONS:*`);
      incList.forEach(item => lines.push(`  ✓ ${item}`));
    }

    lines.push(``);
    lines.push(`*PAYMENT TERMS:* ${paymentTerms}`);
    lines.push(`Valid Till: ${validityDate} | Prepared by ${currentEmployee.name}`);
    return lines.join('\n');
  }, [
    createdQuoteInfo,
    finalSellingPrice,
    perPersonPrice,
    lead,
    nightsCount,
    runningDays,
    roomingConfig,
    transportSource,
    vehicleLabel,
    pickupPoint,
    dropPoint,
    gstPct,
    daysList,
    includeEntryFeesInQuote,
    entryFees,
    inclusionsText,
    paymentTerms,
    validityDate,
    currentEmployee.name
  ]);

  // ============================================
  // SAVE QUOTATION
  // ============================================
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();

    const itinerarySnapshot: ItineraryDay[] = daysList.map(d => ({
      dayNumber: d.dayNumber,
      title: d.title,
      startLocation: d.startLocation,
      endLocation: d.endLocation,
      distanceKm: d.distanceKm,
      durationHours: d.durationHours,
      activities: d.activities,
      mealsIncluded: d.mealsIncluded,
      hotelName: d.hotelName,
      hotelCity: d.hotelCity,
      transportNotes: d.transportNotes
    }));

    const inclusionsArr = inclusionsText.split('\n').map(s => s.trim()).filter(Boolean);
    const exclusionsArr = exclusionsText.split('\n').map(s => s.trim()).filter(Boolean);

    const components: CostComponent[] = [];
    const primaryHotelSup = suppliers.find(s => s.category === 'Hotel' && s.destination === lead.destination) || suppliers[0];

    if (totalHotelCost > 0) {
      components.push({
        id: `COMP-HTL-${Date.now()}`,
        category: 'hotel',
        description: `Accommodation (${nightsCount}N, ${hotelCategory}, ${roomingConfig})`,
        supplierId: primaryHotelSup?.id,
        supplierName: primaryHotelSup?.name || 'Partner Hotels',
        sourceType: 'external_supplier',
        quantity: 1,
        daysOrNights: nightsCount,
        unitCost: Math.round(totalHotelCost / nightsCount),
        totalCost: totalHotelCost,
        advancePercentageRequired: 50,
        advanceAmountRequired: Math.round(totalHotelCost * 0.5)
      });
    }

    if (totalTransportCost > 0 && transportSource !== 'none') {
      const trpVendor = suppliers.find(s => s.id === selectedTransportVendorId);
      components.push({
        id: `COMP-TRP-${Date.now()}`,
        category: 'transport',
        description: `${vehicleLabel} (${runningDays} Days: ${pickupPoint} → ${dropPoint}, incl. tolls)`,
        sourceType: transportSource === 'own_fleet' ? 'own_fleet' : 'external_supplier',
        vehicleId: transportSource === 'own_fleet' ? selectedVehicleId : undefined,
        supplierId: transportSource === 'external_supplier' ? trpVendor?.id : undefined,
        supplierName: transportSource === 'external_supplier' ? trpVendor?.name : undefined,
        quantity: 1,
        daysOrNights: runningDays,
        unitCost: Math.round(totalTransportCost / runningDays),
        totalCost: totalTransportCost,
        advancePercentageRequired: transportSource === 'own_fleet' ? 0 : 40,
        advanceAmountRequired: transportSource === 'own_fleet' ? 0 : Math.round(totalTransportCost * 0.4)
      });
    }

    if (totalMealsAddonCost > 0) {
      components.push({
        id: `COMP-MEAL-${Date.now()}`,
        category: 'meals',
        description: 'Enroute Lunches & Special Meal Add-ons',
        supplierId: primaryHotelSup?.id,
        supplierName: 'Restaurants & Hotel Catering',
        sourceType: 'external_supplier',
        quantity: 1,
        daysOrNights: runningDays,
        unitCost: totalMealsAddonCost,
        totalCost: totalMealsAddonCost,
        advancePercentageRequired: 0,
        advanceAmountRequired: 0
      });
    }

    if (totalEntryFeesCost > 0) {
      components.push({
        id: `COMP-ENT-${Date.now()}`,
        category: 'permit',
        description: entryFees
          .filter(f => f.includedInQuote)
          .map(f => f.title)
          .join('; '),
        sourceType: 'internal_estimate',
        quantity: totalPayingPax,
        daysOrNights: 1,
        unitCost: Math.round(totalEntryFeesCost / totalPayingPax),
        totalCost: totalEntryFeesCost,
        advancePercentageRequired: 0,
        advanceAmountRequired: 0
      });
    }

    const ownFleetCostVal = components
      .filter(c => c.sourceType === 'own_fleet')
      .reduce((s, c) => s + c.totalCost, 0);
    const externalCostVal = totalDirectCost - ownFleetCostVal;

    const newQuoteId = createQuotation({
      enquiryId: lead.id,
      clientName: lead.clientName,
      agentId: lead.agentId,
      destination: lead.destination,
      startDate: lead.travelStartDate,
      endDate: lead.travelEndDate,
      paxCount: totalPayingPax,
      revisions: [
        {
          version: 1,
          versionCode: 'QT-TEMP-V1',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          createdBy: currentEmployee.name,
          costComponents: components,
          totalDirectCost,
          externalSupplierPayables: externalCostVal,
          ownFleetInternalCost: ownFleetCostVal,
          markupAmount,
          markupPercentage: markupPct,
          subtotalSellingPrice,
          gstPercentage: gstPct,
          gstAmount,
          finalSellingPrice,
          changeReason: quoteTitle,
          itinerarySnapshot,
          inclusions: inclusionsArr,
          exclusions: exclusionsArr,
          paymentTerms,
          status: 'sent'
        }
      ]
    });

    const attachedItinerary: LeadSelectedItinerary = {
      packageId: seedPackage?.id,
      title: quoteTitle,
      isCustom: !seedPackage,
      nights: nightsCount,
      days: runningDays,
      daysList: itinerarySnapshot,
      inclusions: inclusionsArr,
      exclusions: exclusionsArr
    };

    updateLead(lead.id, {
      selectedItinerary: attachedItinerary,
      budgetEstimate: finalSellingPrice,
      stage: 'Quotation Sent'
    });

    const versionCode = `${newQuoteId}-V1`;
    setCreatedQuoteInfo({
      quotationId: newQuoteId,
      versionCode,
      finalSellingPrice,
      perPersonPrice
    });
    setEmailSentStatus(null);
    setWhatsappSentStatus(null);

    if (onQuotationCreated) {
      onQuotationCreated(newQuoteId, versionCode);
    }
    setTimeout(() => {
      topPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleShareViaEmail = () => {
    const targetEmail = recipientEmail.trim() || lead.email;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);
    const shareId = sendItinerary({
      enquiryId: lead.id,
      clientName: lead.clientName,
      recipientEmailOrPhone: targetEmail,
      channel: 'Email',
      salespersonId: currentEmployee.id,
      salespersonLogin: currentEmployee.loginId,
      salespersonName: currentEmployee.name,
      itineraryId: seedPackage?.id || `CUSTOM-${lead.id}`,
      itineraryVersion: 1,
      quotationId: createdQuoteInfo?.quotationId,
      quotationVersionCode: createdQuoteInfo?.versionCode,
      destination: lead.destination,
      travelDates: `${lead.travelStartDate} to ${lead.travelEndDate}`,
      guestCount: totalPayingPax,
      quotedAmount: createdQuoteInfo?.finalSellingPrice || finalSellingPrice,
      followUpDate: tomorrow,
      enquiryStatus: 'Quotation Sent',
      itinerarySnapshot: daysList,
      messageBody: shareableQuotationText
    });
    setEmailSentStatus(`Quotation sent via Email to ${targetEmail} (Ref: ${shareId}) & Follow-up scheduled.`);
  };

  const handleShareViaWhatsApp = () => {
    const targetPhone = recipientPhone.trim() || lead.phone;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);
    const shareId = sendItinerary({
      enquiryId: lead.id,
      clientName: lead.clientName,
      recipientEmailOrPhone: targetPhone,
      channel: 'WhatsApp',
      salespersonId: currentEmployee.id,
      salespersonLogin: currentEmployee.loginId,
      salespersonName: currentEmployee.name,
      itineraryId: seedPackage?.id || `CUSTOM-${lead.id}`,
      itineraryVersion: 1,
      quotationId: createdQuoteInfo?.quotationId,
      quotationVersionCode: createdQuoteInfo?.versionCode,
      destination: lead.destination,
      travelDates: `${lead.travelStartDate} to ${lead.travelEndDate}`,
      guestCount: totalPayingPax,
      quotedAmount: createdQuoteInfo?.finalSellingPrice || finalSellingPrice,
      followUpDate: tomorrow,
      enquiryStatus: 'Quotation Sent',
      itinerarySnapshot: daysList,
      messageBody: shareableQuotationText
    });
    setWhatsappSentStatus(`Quotation shared via WhatsApp to ${targetPhone} (Ref: ${shareId}) & Follow-up scheduled.`);
  };

  const handleCopyShareText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableQuotationText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const destinationHotels = useMemo(() => {
    const fromMaster = masterHotels
      .filter(h => h.destination === lead.destination)
      .map(h => h.hotelName);
    const fromSuppliers = suppliers
      .filter(s => s.category === 'Hotel' && s.destination === lead.destination)
      .map(s => s.name);
    return Array.from(new Set([...fromMaster, ...fromSuppliers]));
  }, [masterHotels, suppliers, lead.destination]);

  return (
    <div ref={topPanelRef} className="space-y-6">
      {/* Builder Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-semibold text-emerald-700">
              {seedPackage ? 'Template-Based Quotation Customisation' : 'Standard DMC Custom Quotation Builder'}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {lead.clientName} · {lead.destination} ({nightsCount}N / {runningDays}D)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Grand Total Quote (incl. {gstPct}% GST)</span>
            <span className="text-lg font-bold text-emerald-700 tabular-nums">
              ₹{finalSellingPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 ml-2 tabular-nums">
              (₹{perPersonPrice.toLocaleString('en-IN')}/pax)
            </span>
          </div>
        </div>
      </div>

      {/* POST-CREATION SHARE PANEL (Appears immediately once Quotation is created!) */}
      {createdQuoteInfo && (
        <div className="bg-white border border-emerald-300 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Quotation {createdQuoteInfo.versionCode} Created & Saved
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                  Quoted Price: <strong className="text-emerald-700">₹{createdQuoteInfo.finalSellingPrice.toLocaleString('en-IN')}</strong> · ₹{createdQuoteInfo.perPersonPrice.toLocaleString('en-IN')}/person · Share directly via Email or WhatsApp below.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setPrintableDocument({
                  type: 'quotation',
                  quotationId: createdQuoteInfo.quotationId,
                  version: 1
                })
              }
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Preview / Print PDF Quotation</span>
            </button>
          </div>

          {/* Recipient Inputs & Share Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Share via Email */}
            <div className="space-y-3">
              <label className="font-semibold text-slate-700 block">
                Share via Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={handleShareViaEmail}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Mail</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={`mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(`Tour Quotation ${createdQuoteInfo.versionCode} - ${lead.destination}`)}&body=${encodeURIComponent(shareableQuotationText)}`}
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  Open in external Email app →
                </a>
              </div>
              {emailSentStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                  {emailSentStatus}
                </div>
              )}
            </div>

            {/* Share via WhatsApp */}
            <div className="space-y-3">
              <label className="font-semibold text-slate-700 block">
                Share via WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={handleShareViaWhatsApp}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={`https://wa.me/${recipientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(shareableQuotationText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  Open in WhatsApp Web →
                </a>
                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-semibold"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'Copied!' : 'Copy Full Proposal Text'}</span>
                </button>
              </div>
              {whatsappSentStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                  {whatsappSentStatus}
                </div>
              )}
            </div>
          </div>

          {/* Formatted Quotation Preview */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block mb-1.5">
              Shareable Proposal Message Preview (Itinerary, Travelling, Meals, Entry Fees & Price)
            </span>
            <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
              {shareableQuotationText}
            </pre>
          </div>
        </div>
      )}

      {/* MAIN QUOTATION FORM */}
      <form onSubmit={handleCreateQuotation} className="space-y-6">
        {/* SECTION 1: PACKAGE & COMMERCIAL METADATA */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100">
            1. Quotation Scope & Accommodation Standards
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Quotation Title *</label>
              <input
                type="text"
                required
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Hotel Category</label>
              <select
                value={hotelCategory}
                onChange={(e) => setHotelCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
              >
                <option value="Budget (2-Star)">Budget (2-Star)</option>
                <option value="Standard (3-Star)">Standard (3-Star)</option>
                <option value="Deluxe (4-Star)">Deluxe (4-Star)</option>
                <option value="Luxury (5-Star / Heritage)">Luxury (5-Star / Heritage)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Room Configuration</label>
              <input
                type="text"
                value={roomingConfig}
                onChange={(e) => setRoomingConfig(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quote Valid Till</label>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 tabular-nums"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: TRAVELLING & TRANSPORT WITH COST */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-700" />
              <span>2. Travelling, Transfers & Vehicle Costing</span>
            </h4>
            <span className="text-xs font-bold text-slate-900 tabular-nums">
              Travelling Total: ₹{totalTransportCost.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transport Source</label>
              <select
                value={transportSource}
                onChange={(e) => {
                  const val = e.target.value as 'own_fleet' | 'external_supplier' | 'none';
                  setTransportSource(val);
                  if (val === 'own_fleet' && fleet[0]) {
                    setSelectedVehicleId(fleet[0].id);
                    setVehicleLabel(`${fleet[0].model} (${fleet[0].registrationNumber})`);
                    setVehicleDailyRate(fleet[0].internalDailyRate);
                  } else if (val === 'external_supplier') {
                    setVehicleLabel(lead.transportPreference || 'Hired SUV / Tempo Traveller');
                    setVehicleDailyRate(4200);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
              >
                <option value="own_fleet">Company Own Fleet (Zero Vendor Advance)</option>
                <option value="external_supplier">External Hired Transport Partner</option>
                <option value="none">Land Package Only (No Transport)</option>
              </select>
            </div>

            {transportSource !== 'none' && (
              <>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {transportSource === 'own_fleet' ? 'Select Company Vehicle' : 'Transport Partner / Vehicle'}
                  </label>
                  {transportSource === 'own_fleet' ? (
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => {
                        const v = fleet.find(f => f.id === e.target.value);
                        setSelectedVehicleId(e.target.value);
                        if (v) {
                          setVehicleLabel(`${v.model} (${v.registrationNumber})`);
                          setVehicleDailyRate(v.internalDailyRate);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium text-emerald-800 outline-none focus:border-emerald-700"
                    >
                      {fleet.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.model} ({f.registrationNumber}) · ₹{f.internalDailyRate}/day
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedTransportVendorId}
                      onChange={(e) => {
                        setSelectedTransportVendorId(e.target.value);
                        const sup = suppliers.find(s => s.id === e.target.value);
                        if (sup) setVehicleLabel(`${lead.transportPreference} via ${sup.name}`);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Vehicle Rate / Day (₹ × {runningDays}D)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={vehicleDailyRate}
                    onChange={(e) => setVehicleDailyRate(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold tabular-nums outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tolls, Parking & Driver Allowance (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tollsAndParking}
                    onChange={(e) => setTollsAndParking(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold tabular-nums outline-none focus:border-emerald-700"
                  />
                </div>
              </>
            )}
          </div>

          {transportSource !== 'none' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Arrival Pickup Hub</label>
                <input
                  type="text"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Departure Drop Hub</label>
                <input
                  type="text"
                  value={dropPoint}
                  onChange={(e) => setDropPoint(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: DAY-BY-DAY ITINERARY, HOTELS, BREAKFAST / LUNCH / DINNER & DAY COSTING */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>3. Day-Wise Itinerary, Hotels & Meals (Breakfast / Lunch / Dinner)</span>
              </h4>
              <span className="text-xs text-slate-500 mt-0.5 block tabular-nums">
                Hotels Total: ₹{totalHotelCost.toLocaleString('en-IN')} · Extra Meal Add-ons: ₹{totalMealsAddonCost.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 mr-1">Meal Plan Preset:</span>
              <button
                type="button"
                onClick={() => applyMealPlanPreset('CP')}
                className="px-2.5 py-1 border border-slate-200 hover:border-emerald-600 rounded-md font-medium text-slate-700"
              >
                CP (Breakfast)
              </button>
              <button
                type="button"
                onClick={() => applyMealPlanPreset('MAP')}
                className="px-2.5 py-1 border border-slate-200 hover:border-emerald-600 rounded-md font-medium text-slate-700"
              >
                MAP (B + D)
              </button>
              <button
                type="button"
                onClick={() => applyMealPlanPreset('AP')}
                className="px-2.5 py-1 border border-slate-200 hover:border-emerald-600 rounded-md font-medium text-slate-700"
              >
                AP (B + L + D)
              </button>
              <button
                type="button"
                onClick={handleAddDay}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Day</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {daysList.map((day, idx) => (
              <div key={day.dayNumber} className="p-6 space-y-4 text-xs">
                {/* Day Title Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                      {day.dayNumber}
                    </span>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        setDaysList(copy);
                      }}
                      className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-700 outline-none flex-1 py-0.5"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={daysList.length <= 1}
                    onClick={() => handleRemoveDay(idx)}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                    title="Remove Day"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Route, Hotel, Rooms & Hotel Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pl-8">
                  <div>
                    <label className="text-slate-400 block mb-1">From Location</label>
                    <input
                      type="text"
                      value={day.startLocation}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], startLocation: e.target.value };
                        setDaysList(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">To Location</label>
                    <input
                      type="text"
                      value={day.endLocation}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], endLocation: e.target.value };
                        setDaysList(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Night Stay Hotel</label>
                    <input
                      type="text"
                      list={`hotels-list-${idx}`}
                      value={day.hotelName || ''}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], hotelName: e.target.value };
                        setDaysList(copy);
                      }}
                      placeholder="Leave blank on last day"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium outline-none focus:border-emerald-700"
                    />
                    <datalist id={`hotels-list-${idx}`}>
                      {destinationHotels.map(hName => (
                        <option key={hName} value={hName} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Rooms</label>
                    <input
                      type="number"
                      min={0}
                      value={day.hotelRooms}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], hotelRooms: parseInt(e.target.value, 10) || 0 };
                        setDaysList(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Hotel Rate / Room (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={day.hotelRatePerNight}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], hotelRatePerNight: parseInt(e.target.value, 10) || 0 };
                        setDaysList(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold tabular-nums outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                {/* Breakfast / Lunch / Dinner Options + Extra Meal Cost + Activities */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pl-8 items-start">
                  <div className="lg:col-span-5">
                    <label className="text-slate-400 flex items-center gap-1 mb-1.5">
                      <Utensils className="w-3 h-3 text-emerald-700" />
                      <span>Meals Included (Select Breakfast, Lunch, Dinner)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['Breakfast', 'Lunch', 'Dinner'] as const).map(meal => {
                        const checked = day.mealsIncluded.includes(meal);
                        return (
                          <label
                            key={meal}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-semibold transition-colors ${
                              checked
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDayMeal(idx, meal)}
                              className="accent-emerald-700"
                            />
                            <span>{meal}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="text-slate-400 block mb-1">Extra Meal Cost (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={day.extraMealCost}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = { ...copy[idx], extraMealCost: parseInt(e.target.value, 10) || 0 };
                        setDaysList(copy);
                      }}
                      placeholder="e.g. Lunch"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <label className="text-slate-400 block mb-1">Sightseeing & Activities (comma-separated)</label>
                    <input
                      type="text"
                      value={day.activities.join(', ')}
                      onChange={(e) => {
                        const copy = [...daysList];
                        copy[idx] = {
                          ...copy[idx],
                          activities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        };
                        setDaysList(copy);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: ENTRY FEES, PERMITS & SPECIAL ADD-ONS */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-700" />
                <span>4. Entry Fees, Permits & Safari / Activity Tickets (If Required)</span>
              </h4>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Choose whether monument entry fees, permits, or park tickets are included in the package cost or paid directly by guest.
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEntryFeesInQuote}
                  onChange={(e) => setIncludeEntryFeesInQuote(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span>Include Entry Fees in Package Cost</span>
              </label>
              <button
                type="button"
                onClick={handleAddEntryFee}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry Fee</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Entry Fee / Permit Item</th>
                  <th className="py-2.5 px-3">Day / Location</th>
                  <th className="py-2.5 px-3">Treatment</th>
                  <th className="py-2.5 px-3 text-center">Qty / Pax</th>
                  <th className="py-2.5 px-3 text-right">Fee / Unit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entryFees.map((ef, idx) => {
                  const lineTotal = includeEntryFeesInQuote && ef.includedInQuote
                    ? (ef.paxOrQty || 0) * (ef.unitFee || 0)
                    : 0;
                  return (
                    <tr key={ef.id}>
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <input
                          type="text"
                          value={ef.title}
                          onChange={(e) => {
                            const copy = [...entryFees];
                            copy[idx] = { ...copy[idx], title: e.target.value };
                            setEntryFees(copy);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-900 outline-none focus:border-emerald-700"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={ef.dayOrLocation}
                          onChange={(e) => {
                            const copy = [...entryFees];
                            copy[idx] = { ...copy[idx], dayOrLocation: e.target.value };
                            setEntryFees(copy);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-emerald-700"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={ef.includedInQuote ? 'included' : 'direct'}
                          disabled={!includeEntryFeesInQuote}
                          onChange={(e) => {
                            const copy = [...entryFees];
                            copy[idx] = { ...copy[idx], includedInQuote: e.target.value === 'included' };
                            setEntryFees(copy);
                          }}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-emerald-700 disabled:opacity-50"
                        >
                          <option value="included">Included in Quote</option>
                          <option value="direct">Guest Pays Direct</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 w-20">
                        <input
                          type="number"
                          min={1}
                          value={ef.paxOrQty}
                          onChange={(e) => {
                            const copy = [...entryFees];
                            copy[idx] = { ...copy[idx], paxOrQty: parseInt(e.target.value, 10) || 1 };
                            setEntryFees(copy);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-center tabular-nums outline-none focus:border-emerald-700"
                        />
                      </td>
                      <td className="py-2.5 px-3 w-28 text-right">
                        <input
                          type="number"
                          min={0}
                          value={ef.unitFee}
                          onChange={(e) => {
                            const copy = [...entryFees];
                            copy[idx] = { ...copy[idx], unitFee: parseInt(e.target.value, 10) || 0 };
                            setEntryFees(copy);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-right font-medium tabular-nums outline-none focus:border-emerald-700"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN')}` : '₹0 (Excluded)'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEntryFees(prev => prev.filter(item => item.id !== ef.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: INCLUSIONS / EXCLUSIONS & FINAL COMMERCIAL SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
            <h4 className="font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              5. Standard Inclusions & Exclusions
            </h4>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Inclusions (one per line)
              </label>
              <textarea
                rows={4}
                value={inclusionsText}
                onChange={(e) => setInclusionsText(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Exclusions (one per line)
              </label>
              <textarea
                rows={4}
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
            <h4 className="font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              6. DMC Costing Breakdown & Selling Price
            </h4>

            <div className="divide-y divide-slate-100">
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Accommodation ({nightsCount} Nights)</span>
                <span className="font-semibold text-slate-900 tabular-nums">₹{totalHotelCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Travelling & Transport ({transportSource === 'own_fleet' ? 'Own Fleet' : transportSource === 'external_supplier' ? 'Hired' : 'None'})</span>
                <span className="font-semibold text-slate-900 tabular-nums">₹{totalTransportCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Extra Meal Add-ons (Lunch / Dinner)</span>
                <span className="font-semibold text-slate-900 tabular-nums">₹{totalMealsAddonCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Entry Fees & Permits</span>
                <span className="font-semibold text-slate-900 tabular-nums">₹{totalEntryFeesCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2.5 font-bold text-slate-900">
                <span>Total Direct DMC Cost</span>
                <span className="tabular-nums">₹{totalDirectCost.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Company Markup (%)</span>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={markupPct}
                    onChange={(e) => setMarkupPct(parseInt(e.target.value, 10) || 15)}
                    className="w-28 accent-emerald-700"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={markupPct}
                    onChange={(e) => setMarkupPct(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-right font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Gross Margin</span>
                <span className="font-bold text-emerald-700 tabular-nums">₹{markupAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tour Operator GST (%)</span>
                <div className="flex items-center gap-2">
                  <select
                    value={gstPct}
                    onChange={(e) => setGstPct(parseInt(e.target.value, 10))}
                    className="px-2 py-1 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value={5}>5% Composite GST</option>
                    <option value={0}>0% (B2B Exempt)</option>
                    <option value={18}>18% Standard</option>
                  </select>
                  <span className="font-semibold text-slate-700 tabular-nums">₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100 text-sm font-bold text-slate-900">
                <span>Final Quoted Price ({totalPayingPax} Pax)</span>
                <span className="text-lg text-emerald-700 tabular-nums">₹{finalSellingPrice.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-500 tabular-nums">
                <span>Per Person Rate</span>
                <span className="font-semibold text-slate-800">₹{perPersonPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>{createdQuoteInfo ? 'Save Revised Quotation' : 'Create & Save Quotation'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
