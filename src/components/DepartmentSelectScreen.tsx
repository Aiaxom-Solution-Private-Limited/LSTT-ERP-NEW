import React from 'react';
import { useDmc } from '../context/DmcContext';
import { Department } from '../types';
import {
  Users2,
  Compass,
  Landmark,
  ShieldCheck,
  ArrowRight,
  FolderTree
} from 'lucide-react';

export const DepartmentSelectScreen: React.FC = () => {
  const { setSelectedDepartment } = useDmc();

  const departments: Array<{
    id: Department;
    name: string;
    focus: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'sales',
      name: 'Sales Team',
      focus: 'Enquiries, Itineraries & Proformas',
      description: 'Manage leads, customize itineraries, run automated follow-ups, and collect token advances.',
      icon: Users2
    },
    {
      id: 'backend',
      name: 'Backend & Admin',
      focus: 'Master Library, Rates & Rules',
      description: 'Maintain master itinerary templates, hotel contracts, GST settings, and fleet policies.',
      icon: FolderTree
    },
    {
      id: 'operations',
      name: 'Operations Team',
      focus: 'Hotels, Fleet & Logistics',
      description: 'Review sales handovers, dispatch Northeast company vehicles, and track arrivals.',
      icon: Compass
    },
    {
      id: 'accounts',
      name: 'Accounts & Finance',
      focus: 'Receipts, Audits & Ledgers',
      description: 'Verify bank statements, approve supplier advances, sign rate audits, and reconcile P&L.',
      icon: Landmark
    },
    {
      id: 'executive',
      name: 'Executive Management',
      focus: '360° Oversight & Analytics',
      description: 'Unified command across all departments, live tours, ID-wise sales MIS, and margins.',
      icon: ShieldCheck
    }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50/70 flex flex-col justify-between px-6 py-8 sm:px-12 select-none text-slate-900">
      {/* Minimal Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm tracking-tight">
            LS
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Let's See Tour & Travels
          </span>
        </div>

        <span className="hidden sm:inline text-xs text-slate-500">
          Guwahati Head Office · Destination Management System
        </span>
      </header>

      {/* Main Centered Selection */}
      <main className="max-w-6xl w-full mx-auto my-auto py-12">
        <div className="max-w-xl mb-10">
          <p className="text-xs font-semibold text-emerald-700 mb-2">
            Department Portal
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Select your workspace
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Choose your department to load a focused workspace tailored to your responsibilities.
          </p>
        </div>

        {/* Pure White Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDepartment(dept.id)}
                className="text-left bg-white rounded-xl border border-slate-200 hover:border-emerald-600 p-6 transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <Icon className="w-6 h-6 text-emerald-700" />
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {dept.name}
                  </h2>
                  <p className="text-xs font-medium text-emerald-700 mt-1">
                    {dept.focus}
                  </p>
                  <p className="text-[13px] text-slate-600 mt-3 leading-relaxed">
                    {dept.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                  Enter workspace
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>Let's See Tour & Travels Pvt. Ltd.</span>
        <span>One Enquiry · One Booking · One Tour Code</span>
      </footer>
    </div>
  );
};
