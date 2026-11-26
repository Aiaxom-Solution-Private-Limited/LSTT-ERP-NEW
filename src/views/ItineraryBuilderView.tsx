import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { TourPackage, ItineraryDay, DestinationRegion } from '../types';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  FolderTree
} from 'lucide-react';

interface ItineraryBuilderViewProps {
  initialPackage?: TourPackage;
  onProceedToCosting: (itineraryData: {
    title: string;
    destination: DestinationRegion;
    nights: number;
    days: number;
    daysList: ItineraryDay[];
    inclusions: string[];
    exclusions: string[];
    estimatedSupplierRate?: number;
  }) => void;
}

export const ItineraryBuilderView: React.FC<ItineraryBuilderViewProps> = ({
  initialPackage,
  onProceedToCosting
}) => {
  const { packages, parseVendorProposalText } = useDmc();

  const [activeMode, setActiveMode] = useState<'scratch' | 'package' | 'ai_import'>('package');
  const [selectedPkgId, setSelectedPkgId] = useState<string>(initialPackage?.id || packages[0]?.id || '');

  const [itineraryTitle, setItineraryTitle] = useState(initialPackage?.name || 'Mesmerising Meghalaya Custom Circuit');
  const [destination, setDestination] = useState<DestinationRegion>(initialPackage?.destination || 'Meghalaya');
  const [daysList, setDaysList] = useState<ItineraryDay[]>(
    initialPackage?.itinerary || packages[0]?.itinerary || []
  );
  const [inclusionsText, setInclusionsText] = useState(
    initialPackage?.inclusions.join('\n') || packages[0]?.inclusions.join('\n') || ''
  );
  const [exclusionsText, setExclusionsText] = useState(
    initialPackage?.exclusions.join('\n') || packages[0]?.exclusions.join('\n') || ''
  );

  const [vendorRawText, setVendorRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const sampleVendorEmail = `Subject: Bhutan Land Package 5N/6D Proposal for Let's See Travels
From: Bhutan Serenity DMC <partner@bhutanserenity.bt>
Dear Monjit & Team,

Please find our B2B proposal for Bhutan 5 Nights / 6 Days:
Net Rate: INR 54,000 per person on Twin Sharing.

Day 1: Arrival at Paro Airport - Transfer to Thimphu (Dinner included). Hotel: Le Meridien Thimphu.
Day 2: Full day Thimphu sightseeing: Memorial Chorten, Buddha Dordenma, Tashichho Dzong.
Day 3: Thimphu to Punakha via Dochula Pass (3,100m). Visit Punakha Dzong and suspension bridge.
Day 4: Punakha to Paro. Visit National Museum and Rinpung Dzong. Stay at Le Meridien Paro.
Day 5: Sacred Hike to Taktsang (Tiger's Nest) Monastery. Evening traditional hot stone bath.
Day 6: Morning departure transfer to Paro International Airport.

Inclusions: 5 nights 4-star boutique stay, all meals, English-speaking licensed guide, private Coaster/SUV, SDF fee.`;

  const handleLoadPackage = (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setSelectedPkgId(pkg.id);
      setItineraryTitle(pkg.name);
      setDestination(pkg.destination);
      setDaysList(JSON.parse(JSON.stringify(pkg.itinerary)));
      setInclusionsText(pkg.inclusions.join('\n'));
      setExclusionsText(pkg.exclusions.join('\n'));
    }
  };

  const handleAiExtract = () => {
    if (!vendorRawText.trim()) return;
    setIsExtracting(true);
    setTimeout(() => {
      const extracted = parseVendorProposalText(vendorRawText);
      if (extracted) {
        if (extracted.name) setItineraryTitle(extracted.name);
        if (extracted.destination) setDestination(extracted.destination);
        if (extracted.itinerary) setDaysList(extracted.itinerary);
        if (extracted.inclusions) setInclusionsText(extracted.inclusions.join('\n'));
        if (extracted.exclusions) setExclusionsText(extracted.exclusions.join('\n'));
      }
      setIsExtracting(false);
      setActiveMode('scratch');
    }, 400);
  };

  const handleAddDay = () => {
    const newDayNum = daysList.length + 1;
    const newDay: ItineraryDay = {
      dayNumber: newDayNum,
      title: `Day ${newDayNum}: Leisure & Local Sightseeing`,
      startLocation: destination,
      endLocation: destination,
      distanceKm: 40,
      durationHours: 3,
      activities: ['Morning sightseeing tour with local coordinator', 'Evening leisure time'],
      mealsIncluded: ['Breakfast', 'Dinner'],
      hotelName: 'Standard Hotel',
      hotelCity: destination
    };
    setDaysList([...daysList, newDay]);
  };

  const handleDeleteDay = (index: number) => {
    const updated = daysList.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDaysList(updated);
  };

  const handleDayChange = (index: number, field: keyof ItineraryDay, value: any) => {
    const copy = [...daysList];
    copy[index] = { ...copy[index], [field]: value };
    setDaysList(copy);
  };

  const handleProceed = () => {
    onProceedToCosting({
      title: itineraryTitle,
      destination,
      nights: Math.max(1, daysList.length - 1),
      days: daysList.length,
      daysList,
      inclusions: inclusionsText.split('\n').filter(Boolean),
      exclusions: exclusionsText.split('\n').filter(Boolean)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Clean Mode Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Itinerary Builder & Proposal Studio
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Design day-wise travel itineraries from templates, supplier proposals, or custom drafting.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveMode('package')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeMode === 'package'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Load Standard Package</span>
          </button>

          <button
            onClick={() => setActiveMode('ai_import')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeMode === 'ai_import'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vendor Proposal Parser</span>
          </button>

          <button
            onClick={() => setActiveMode('scratch')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeMode === 'scratch'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Editor</span>
          </button>
        </div>
      </div>

      {/* Mode A: Standard Package Template Selector Card */}
      {activeMode === 'package' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Package Template
            </span>
            <select
              value={selectedPkgId}
              onChange={(e) => handleLoadPackage(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 flex-1 outline-none focus:border-emerald-700"
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.destination} · {p.nights}N/{p.days}D · {p.packageType.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            {daysList.length} days loaded
          </span>
        </div>
      )}

      {/* Mode B: Vendor Proposal Parser Card */}
      {activeMode === 'ai_import' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Vendor Proposal & Email Parser
              </h3>
            </div>
            <button
              onClick={() => setVendorRawText(sampleVendorEmail)}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              Paste Sample Bhutan Proposal
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Paste supplier proposal text or email itinerary notes to extract destinations, days, hotels, and inclusions.
          </p>
          <textarea
            value={vendorRawText}
            onChange={(e) => setVendorRawText(e.target.value)}
            placeholder="Paste raw vendor itinerary or supplier email here..."
            rows={5}
            className="w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none focus:border-emerald-700"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAiExtract}
              disabled={isExtracting || !vendorRawText.trim()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Extracting Structure...' : 'Extract & Convert to Itinerary'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Itinerary Editor Card (Pure Single-Elevation Card with Hairline Dividers) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Title & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-100">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              Tour Itinerary Title *
            </label>
            <input
              type="text"
              value={itineraryTitle}
              onChange={(e) => setItineraryTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 text-sm outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              Destination Region *
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value as DestinationRegion)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 text-sm outline-none focus:border-emerald-700"
            >
              <option value="Meghalaya">Meghalaya</option>
              <option value="Assam">Assam</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
              <option value="Bhutan">Bhutan</option>
              <option value="Nepal">Nepal</option>
              <option value="Thailand">Thailand</option>
              <option value="Sikkim & Darjeeling">Sikkim & Darjeeling</option>
              <option value="Central Asia">Central Asia</option>
            </select>
          </div>
        </div>

        {/* Day-by-Day Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider tabular-nums">
              Day-by-Day Timeline · {daysList.length} Days / {Math.max(1, daysList.length - 1)} Nights
            </h3>
            <button
              onClick={handleAddDay}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {daysList.map((day, idx) => (
              <div
                key={day.dayNumber}
                className="py-5 first:pt-2 last:pb-2 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs tabular-nums shrink-0">
                      {day.dayNumber}
                    </span>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => handleDayChange(idx, 'title', e.target.value)}
                      className="text-sm font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-700 outline-none flex-1 py-0.5"
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteDay(idx)}
                    disabled={daysList.length <= 1}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 transition-colors"
                    title="Delete Day"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pl-8">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start Location</label>
                    <input
                      type="text"
                      value={day.startLocation}
                      onChange={(e) => handleDayChange(idx, 'startLocation', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End Location</label>
                    <input
                      type="text"
                      value={day.endLocation}
                      onChange={(e) => handleDayChange(idx, 'endLocation', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Night Stay Hotel</label>
                    <input
                      type="text"
                      value={day.hotelName || ''}
                      onChange={(e) => handleDayChange(idx, 'hotelName', e.target.value)}
                      placeholder="Hotel name"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Hotel City</label>
                    <input
                      type="text"
                      value={day.hotelCity || ''}
                      onChange={(e) => handleDayChange(idx, 'hotelCity', e.target.value)}
                      placeholder="City"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="pl-8">
                  <label className="text-xs text-slate-400 block mb-1">
                    Day Activities & Excursions (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={day.activities.join(', ')}
                    onChange={(e) => handleDayChange(idx, 'activities', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Package Inclusions (one per line)
            </label>
            <textarea
              value={inclusionsText}
              onChange={(e) => setInclusionsText(e.target.value)}
              rows={4}
              className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none text-xs text-slate-700 focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Package Exclusions (one per line)
            </label>
            <textarea
              value={exclusionsText}
              onChange={(e) => setExclusionsText(e.target.value)}
              rows={4}
              className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none text-xs text-slate-700 focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Next: Map hotels, fleet vs hired transport, and commercial markup.
          </span>

          <button
            onClick={handleProceed}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span>Proceed to Tour Costing & Pricing</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
