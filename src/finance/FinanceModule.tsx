import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { FinanceAuthGate, useFinanceUser } from './FinanceAuth';
import { FinanceOverviewView } from './views/FinanceOverviewView';
import { TourPnlListView } from './views/TourPnlListView';
import { TourPnlDetailView } from './views/TourPnlDetailView';
import { CollectionsView, ExpenseRegisterView, ReconciliationView, VendorBillsView } from './views/RegistersView';
import { FinanceImportView, FinanceMastersView, FinanceReportsView } from './views/AdminViews';

export type FinancePage = 'fin_overview' | 'fin_tours' | 'fin_expenses' | 'fin_hotel_recon' | 'fin_restaurant_recon' | 'fin_recon' | 'fin_bills' | 'fin_collections' | 'fin_reports' | 'fin_import' | 'fin_masters';

/** Detail route: #/tour-financials/<TourCode> */
const parseHash = () => {
  const m = /^#\/tour-financials\/([^/?#]+)/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
};

const Inner: React.FC<{ page: FinancePage; onNavigate: (p: FinancePage) => void }> = ({ page, onNavigate }) => {
  const { user, signOut } = useFinanceUser();
  const [tour, setTour] = useState<string | null>(parseHash());
  useEffect(() => {
    const h = () => { const t = parseHash(); setTour(t); if (t) onNavigate('fin_tours'); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const openTour = (code: string) => { window.location.hash = `/tour-financials/${encodeURIComponent(code)}`; };
  const back = () => { history.pushState(null, '', window.location.pathname + window.location.search); setTour(null); onNavigate('fin_tours'); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2 text-[11px] text-slate-500">
        Signed in to Tour Financials as <b className="text-slate-700">{user.name}</b> ({user.department}{user.isManager ? ', manager' : ''})
        <button onClick={signOut} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><LogOut className="w-3 h-3" /> Sign out</button>
      </div>
      {tour ? <TourPnlDetailView tourCode={tour} onBack={back} /> : (
        <>
          {page === 'fin_overview' && <FinanceOverviewView onOpenTour={openTour} />}
          {page === 'fin_tours' && <TourPnlListView onOpenTour={openTour} />}
          {page === 'fin_expenses' && <ExpenseRegisterView onOpenTour={openTour} />}
          {page === 'fin_recon' && <ReconciliationView key="all" onOpenTour={openTour} />}
          {page === 'fin_hotel_recon' && <ReconciliationView key="hotel" initialKind="hotel" onOpenTour={openTour} />}
          {page === 'fin_restaurant_recon' && <ReconciliationView key="restaurant" initialKind="restaurant" onOpenTour={openTour} />}
          {page === 'fin_bills' && <VendorBillsView onOpenTour={openTour} />}
          {page === 'fin_collections' && <CollectionsView onOpenTour={openTour} />}
          {page === 'fin_reports' && <FinanceReportsView />}
          {page === 'fin_import' && <FinanceImportView />}
          {page === 'fin_masters' && <FinanceMastersView />}
        </>
      )}
    </div>
  );
};

export const FinanceModule: React.FC<{ page: FinancePage; onNavigate: (p: FinancePage) => void }> = (props) => (
  <FinanceAuthGate><Inner {...props} /></FinanceAuthGate>
);

export const isFinancePage = (t: string): t is FinancePage => t.startsWith('fin_');
export const hasTourHash = () => parseHash() !== null;
