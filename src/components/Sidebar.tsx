import React from 'react';
import { useDmc } from '../context/DmcContext';
import {
  LayoutDashboard,
  Users2,
  Building2,
  FolderTree,
  MapPin,
  Calculator,
  CalendarCheck,
  Compass,
  Truck,
  Landmark,
  Radio,
  BarChart3,
  Clock,
  Receipt,
  PlaneTakeoff,
  MessageSquare,
  FileSpreadsheet,
  Database,
  LogOut,
  Wallet,
  TrendingUp,
  ListChecks,
  Hotel,
  UtensilsCrossed,
  Scale,
  HandCoins,
  FileText,
  Upload,
  Settings2
} from 'lucide-react';
import type { FinancePage } from '../finance/FinanceModule';

export type NavTab =
  | 'dashboard'
  | 'crm'
  | 'followups'
  | 'agents'
  | 'packages'
  | 'itinerary'
  | 'costing'
  | 'proforma'
  | 'bookings'
  | 'operations'
  | 'arrivals'
  | 'fleet'
  | 'accounts'
  | 'sales_reports'
  | 'backend_master'
  | 'communication'
  | 'execution'
  | 'reports'
  | FinancePage;

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const {
    selectedDepartment,
    setSelectedDepartment,
    leads,
    confirmedTours,
    operationsTasks,
    supplierPayments,
    fleet,
    itineraryShares,
    proformaInvoices,
    arrivalDepartures
  } = useDmc();

  const activeLeadsCount = leads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
  const activeToursCount = confirmedTours.filter(t => t.status === 'on_tour' || t.status === 'operations_prep').length;
  const pendingTasksCount = operationsTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const pendingPaymentsCount = supplierPayments.filter(p => p.status === 'pending_approval').length;
  const activeFleetCount = fleet.filter(f => f.currentStatus === 'on_tour').length;
  const pendingFollowupsCount = itineraryShares.filter(s => s.enquiryStatus === 'Quotation Sent' || s.enquiryStatus === 'Follow-up').length;
  const pendingProformaCount = proformaInvoices.filter(p => p.status === 'proof_uploaded' || p.status === 'issued').length;
  const pendingLogisticsCount = arrivalDepartures.filter(a => a.status === 'pending_assignment' || a.status === 'vehicle_assigned').length;

  const getNavSections = () => {
    if (selectedDepartment === 'sales') {
      return [
        {
          title: 'Sales Workspace',
          items: [
            { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard, count: null },
            { id: 'crm' as NavTab, label: 'CRM & Enquiries', icon: Users2, count: activeLeadsCount || null },
            { id: 'followups' as NavTab, label: 'Follow-ups & AI', icon: Clock, count: pendingFollowupsCount || null },
            { id: 'agents' as NavTab, label: 'B2B Agents', icon: Building2, count: null },
            { id: 'packages' as NavTab, label: 'Package Library', icon: FolderTree, count: null },
            { id: 'itinerary' as NavTab, label: 'Itinerary Builder', icon: MapPin, count: null },
            { id: 'costing' as NavTab, label: 'Costing & Quotes', icon: Calculator, count: null },
            { id: 'proforma' as NavTab, label: 'Proforma Invoices', icon: Receipt, count: pendingProformaCount || null },
            { id: 'bookings' as NavTab, label: 'Handovers', icon: CalendarCheck, count: activeToursCount || null },
            { id: 'sales_reports' as NavTab, label: 'Sales Reports', icon: FileSpreadsheet, count: null },
            { id: 'communication' as NavTab, label: 'Team Chat', icon: MessageSquare, count: null }
          ]
        }
      ];
    }

    if (selectedDepartment === 'backend') {
      return [
        {
          title: 'Backend & Master',
          items: [
            { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard, count: null },
            { id: 'backend_master' as NavTab, label: 'Master Data & Rules', icon: Database, count: null },
            { id: 'packages' as NavTab, label: 'Master Packages', icon: FolderTree, count: null },
            { id: 'bookings' as NavTab, label: 'Confirmed Tours', icon: CalendarCheck, count: confirmedTours.length },
            { id: 'fleet' as NavTab, label: 'Fleet & Sourcing', icon: Truck, count: null },
            { id: 'sales_reports' as NavTab, label: 'Sales Reports', icon: FileSpreadsheet, count: null },
            { id: 'communication' as NavTab, label: 'Team Chat', icon: MessageSquare, count: null }
          ]
        }
      ];
    }

    if (selectedDepartment === 'operations') {
      return [
        {
          title: 'Operations',
          items: [
            { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard, count: null },
            { id: 'bookings' as NavTab, label: 'Handover Queue', icon: CalendarCheck, count: activeToursCount || null },
            { id: 'operations' as NavTab, label: 'Hotels & Tasks', icon: Compass, count: pendingTasksCount || null },
            { id: 'arrivals' as NavTab, label: 'Arrivals & Logistics', icon: PlaneTakeoff, count: pendingLogisticsCount || null },
            { id: 'fleet' as NavTab, label: 'Fleet & Drivers', icon: Truck, count: activeFleetCount || null },
            { id: 'execution' as NavTab, label: 'Live Execution', icon: Radio, count: confirmedTours.filter(t => t.status === 'on_tour').length || null },
            { id: 'communication' as NavTab, label: 'Team Chat', icon: MessageSquare, count: null }
          ]
        }
      ];
    }

    if (selectedDepartment === 'accounts') {
      return [
        {
          title: 'Accounts & Finance',
          items: [
            { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard, count: null },
            { id: 'proforma' as NavTab, label: 'Payment Verification', icon: Receipt, count: pendingProformaCount || null },
            { id: 'accounts' as NavTab, label: 'Ledgers & Vouchers', icon: Landmark, count: pendingPaymentsCount || null },
            { id: 'bookings' as NavTab, label: 'Confirmed Bookings', icon: CalendarCheck, count: confirmedTours.length },
            { id: 'sales_reports' as NavTab, label: 'ID-wise Sales', icon: FileSpreadsheet, count: null },
            { id: 'reports' as NavTab, label: 'Profitability & GST', icon: BarChart3, count: null },
            { id: 'communication' as NavTab, label: 'Team Chat', icon: MessageSquare, count: null }
          ]
        }
      ];
    }

    return [
      {
        title: 'Sales & Clients',
        items: [
          { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard, count: null },
          { id: 'crm' as NavTab, label: 'CRM & Enquiries', icon: Users2, count: activeLeadsCount || null },
          { id: 'followups' as NavTab, label: 'Follow-ups & AI', icon: Clock, count: pendingFollowupsCount || null },
          { id: 'agents' as NavTab, label: 'B2B Agents', icon: Building2, count: null },
          { id: 'packages' as NavTab, label: 'Master Packages', icon: FolderTree, count: null },
          { id: 'itinerary' as NavTab, label: 'Itinerary Builder', icon: MapPin, count: null },
          { id: 'costing' as NavTab, label: 'Costing & Quotes', icon: Calculator, count: null },
          { id: 'sales_reports' as NavTab, label: 'Sales Reports', icon: FileSpreadsheet, count: null }
        ]
      },
      {
        title: 'Operations',
        items: [
          { id: 'bookings' as NavTab, label: 'Bookings & Handover', icon: CalendarCheck, count: activeToursCount || null },
          { id: 'operations' as NavTab, label: 'Hotels & Tasks', icon: Compass, count: pendingTasksCount || null },
          { id: 'arrivals' as NavTab, label: 'Arrivals & Logistics', icon: PlaneTakeoff, count: pendingLogisticsCount || null },
          { id: 'fleet' as NavTab, label: 'Transport Fleet', icon: Truck, count: activeFleetCount || null },
          { id: 'execution' as NavTab, label: 'Live Execution', icon: Radio, count: confirmedTours.filter(t => t.status === 'on_tour').length || null }
        ]
      },
      {
        title: 'Finance & Admin',
        items: [
          { id: 'proforma' as NavTab, label: 'Proforma & Audits', icon: Receipt, count: pendingProformaCount || null },
          { id: 'accounts' as NavTab, label: 'Accounts & Ledgers', icon: Landmark, count: pendingPaymentsCount || null },
          { id: 'backend_master' as NavTab, label: 'Master & Integrations', icon: Database, count: null },
          { id: 'reports' as NavTab, label: 'MIS & GST Reports', icon: BarChart3, count: null },
          { id: 'communication' as NavTab, label: 'Team Chat', icon: MessageSquare, count: null }
        ]
      }
    ];
  };

  // Tour Financial Management: visible per department; the API enforces the actual permissions.
  const financeItems = (() => {
    const all = {
      fin_overview: { id: 'fin_overview' as NavTab, label: 'Financial Overview', icon: Wallet, count: null },
      fin_tours: { id: 'fin_tours' as NavTab, label: 'Tour-wise P&L', icon: TrendingUp, count: null },
      fin_expenses: { id: 'fin_expenses' as NavTab, label: 'Expense Register', icon: ListChecks, count: null },
      fin_hotel_recon: { id: 'fin_hotel_recon' as NavTab, label: 'Hotel Reconciliation', icon: Hotel, count: null },
      fin_restaurant_recon: { id: 'fin_restaurant_recon' as NavTab, label: 'Restaurant Reconciliation', icon: UtensilsCrossed, count: null },
      fin_recon: { id: 'fin_recon' as NavTab, label: 'Pending Reconciliation', icon: Scale, count: null },
      fin_bills: { id: 'fin_bills' as NavTab, label: 'Vendor Bills & Payments', icon: Receipt, count: null },
      fin_collections: { id: 'fin_collections' as NavTab, label: 'Client Collections', icon: HandCoins, count: null },
      fin_reports: { id: 'fin_reports' as NavTab, label: 'Financial Reports', icon: FileText, count: null },
      fin_import: { id: 'fin_import' as NavTab, label: 'Import Sheets', icon: Upload, count: null },
      fin_masters: { id: 'fin_masters' as NavTab, label: 'Expense Heads & Settings', icon: Settings2, count: null },
    };
    const byDept: Record<string, (keyof typeof all)[]> = {
      sales: ['fin_overview', 'fin_tours', 'fin_reports'],
      operations: ['fin_overview', 'fin_tours', 'fin_expenses', 'fin_hotel_recon', 'fin_restaurant_recon', 'fin_recon', 'fin_bills'],
      accounts: ['fin_overview', 'fin_tours', 'fin_expenses', 'fin_hotel_recon', 'fin_restaurant_recon', 'fin_recon', 'fin_bills', 'fin_collections', 'fin_reports', 'fin_import', 'fin_masters'],
      backend: ['fin_overview', 'fin_tours', 'fin_expenses', 'fin_reports', 'fin_import', 'fin_masters'],
      executive: Object.keys(all) as (keyof typeof all)[],
    };
    return (byDept[selectedDepartment ?? 'executive'] ?? []).map((k) => all[k]);
  })();
  const navSections = [...getNavSections(), { title: 'Tour Financials', items: financeItems }];

  return (
    <aside className="w-60 bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 select-none">
      {/* Pure Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0">
          LS
        </div>
        <span className="font-bold text-slate-900 tracking-tight text-sm truncate">
          Let's See Travels
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {navSections.map(sec => (
          <div key={sec.title}>
            <div className="px-3 text-[11px] font-semibold text-slate-400 mb-2">
              {sec.title}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.count !== null && (
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Quiet Role Switch Footer */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={() => setSelectedDepartment(null)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-emerald-800 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <span>Switch Department</span>
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </aside>
  );
};
