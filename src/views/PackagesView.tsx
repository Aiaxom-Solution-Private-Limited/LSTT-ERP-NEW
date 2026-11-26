import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { TourPackage } from '../types';
import { MapPin, Search, ArrowRight } from 'lucide-react';

interface PackagesViewProps {
  onLoadPackageIntoBuilder: (pkg: TourPackage) => void;
}

export const PackagesView: React.FC<PackagesViewProps> = ({ onLoadPackageIntoBuilder }) => {
  const { packages } = useDmc();
  const [filterType, setFilterType] = useState<'all' | 'own' | 'vendor' | 'hybrid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<TourPackage>(packages[0]);

  const filteredPackages = packages.filter(p => {
    const matchesType = filterType === 'all' || p.packageType === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Product Catalog · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Package Library
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Standardised company itineraries, partner packages, and hybrid destination products.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {([
            { id: 'all', label: `All (${packages.length})` },
            { id: 'own', label: 'Own' },
            { id: 'vendor', label: 'Vendor' },
            { id: 'hybrid', label: 'Hybrid' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-2 font-semibold rounded-lg transition-colors ${
                filterType === tab.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pure Package List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages or region..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredPackages.map(pkg => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="uppercase font-semibold text-emerald-700">{pkg.packageType}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 tabular-nums">{pkg.nights}N / {pkg.days}D</span>
                  </div>

                  <div className="font-semibold text-slate-900 text-sm mt-1 leading-snug">
                    {pkg.name}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{pkg.destination}</span>
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      ₹{pkg.standardSellingPrice.toLocaleString('en-IN')}/pax
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Pure Selected Package Detail Card */}
        {selectedPackage && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  {selectedPackage.destination} · {selectedPackage.nights} Nights / {selectedPackage.days} Days
                </p>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedPackage.name}
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  {selectedPackage.shortSummary}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-xs text-slate-500 block">Standard Selling Rate</span>
                <span className="text-xl font-bold text-emerald-800 tabular-nums">
                  ₹{selectedPackage.standardSellingPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400 block">per person (twin sharing)</span>

                <button
                  onClick={() => onLoadPackageIntoBuilder(selectedPackage)}
                  className="mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors sm:ml-auto"
                >
                  <span>Load into Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Day-Wise Itinerary Plan</h3>
              <div className="divide-y divide-slate-100">
                {selectedPackage.itinerary.map(day => (
                  <div key={day.dayNumber} className="py-3.5 space-y-1 text-xs">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        Day {day.dayNumber}: {day.title}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {day.startLocation} → {day.endLocation}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {day.activities.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-emerald-800 block">Inclusions</span>
                <ul className="text-slate-600 space-y-1.5 list-disc list-inside">
                  {selectedPackage.inclusions.map((inc, i) => (
                    <li key={i}>{inc}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-rose-700 block">Exclusions</span>
                <ul className="text-slate-600 space-y-1.5 list-disc list-inside">
                  {selectedPackage.exclusions.map((exc, i) => (
                    <li key={i}>{exc}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
