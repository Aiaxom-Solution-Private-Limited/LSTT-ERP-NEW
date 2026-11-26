import React, { useState, useEffect } from 'react';
import { DmcProvider, useDmc } from './context/DmcContext';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { TourMasterModal } from './components/TourMasterModal';
import { PrintableDocumentModal } from './components/PrintableDocumentModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { DepartmentSelectScreen } from './components/DepartmentSelectScreen';

// Views
import { DashboardView } from './views/DashboardView';
import { CrmLeadsView } from './views/CrmLeadsView';
import { FollowUpsView } from './views/FollowUpsView';
import { B2BAgentsView } from './views/B2BAgentsView';
import { PackagesView } from './views/PackagesView';
import { ItineraryBuilderView } from './views/ItineraryBuilderView';
import { CostingQuotationView } from './views/CostingQuotationView';
import { ProformaInvoicesView } from './views/ProformaInvoicesView';
import { BookingsHandoverView } from './views/BookingsHandoverView';
import { OperationsHubView } from './views/OperationsHubView';
import { ArrivalsLogisticsView } from './views/ArrivalsLogisticsView';
import { TransportFleetView } from './views/TransportFleetView';
import { AccountsLedgerView } from './views/AccountsLedgerView';
import { SalesReportsView } from './views/SalesReportsView';
import { BackendMasterView } from './views/BackendMasterView';
import { InternalCommunicationView } from './views/InternalCommunicationView';
import { TourExecutionView } from './views/TourExecutionView';
import { ReportsMisView } from './views/ReportsMisView';
import { LeadEnquiry, TourPackage } from './types';
import { FinanceModule, hasTourHash, isFinancePage } from './finance/FinanceModule';

const MainLayout: React.FC = () => {
  const {
    selectedDepartment,
    selectedTourCode,
    setSelectedTourCode,
    printableDocument,
    setPrintableDocument
  } = useDmc();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showAiModal, setShowAiModal] = useState(false);

  // Cross-view handover state
  const [pendingCostingLead, setPendingCostingLead] = useState<LeadEnquiry | undefined>(undefined);
  const [pendingItineraryPackage, setPendingItineraryPackage] = useState<TourPackage | undefined>(undefined);
  const [pendingCostingItinerary, setPendingCostingItinerary] = useState<any | undefined>(undefined);

  // Reset tab to dashboard whenever department is switched
  useEffect(() => {
    // A shared link to a tour P&L (#/tour-financials/<code>) opens the finance module.
    setActiveTab(hasTourHash() ? 'fin_tours' : 'dashboard');
  }, [selectedDepartment]);

  // Following a tour P&L link (including hash-only navigation) opens the finance module.
  useEffect(() => {
    const onHash = () => { if (hasTourHash()) setActiveTab('fin_tours'); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectTab = (tab: NavTab) => {
    if (hasTourHash()) {
      history.pushState(null, '', window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    setActiveTab(tab);
  };

  const handleNavigateToCostingWithLead = (lead: LeadEnquiry, itineraryData?: any) => {
    setPendingCostingLead(lead);
    if (itineraryData) {
      setPendingCostingItinerary(itineraryData);
    } else if (lead.selectedItinerary) {
      setPendingCostingItinerary({
        title: lead.selectedItinerary.title,
        destination: lead.destination,
        nights: lead.selectedItinerary.nights,
        days: lead.selectedItinerary.days,
        daysList: lead.selectedItinerary.daysList,
        inclusions: lead.selectedItinerary.inclusions,
        exclusions: lead.selectedItinerary.exclusions
      });
    } else {
      setPendingCostingItinerary(undefined);
    }
    setActiveTab('costing');
  };

  const handleLoadPackageIntoBuilder = (pkg: TourPackage) => {
    setPendingItineraryPackage(pkg);
    setActiveTab('itinerary');
  };

  const handleProceedFromItineraryToCosting = (itineraryData: any) => {
    setPendingCostingItinerary(itineraryData);
    setActiveTab('costing');
  };

  // If no department is chosen, show the role portal first!
  if (!selectedDepartment) {
    return <DepartmentSelectScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 select-none">
      {/* Sidebar Navigation - Strictly filtered by Department */}
      <Sidebar activeTab={activeTab} onSelectTab={selectTab} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header onOpenAi={() => setShowAiModal(true)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigate={setActiveTab}
                onOpenAi={() => setShowAiModal(true)}
              />
            )}

            {activeTab === 'crm' && (
              <CrmLeadsView
                onNavigateToCostingWithLead={handleNavigateToCostingWithLead}
              />
            )}

            {activeTab === 'followups' && <FollowUpsView />}

            {activeTab === 'agents' && <B2BAgentsView />}

            {activeTab === 'packages' && (
              <PackagesView
                onLoadPackageIntoBuilder={handleLoadPackageIntoBuilder}
              />
            )}

            {activeTab === 'itinerary' && (
              <ItineraryBuilderView
                initialPackage={pendingItineraryPackage}
                onProceedToCosting={handleProceedFromItineraryToCosting}
              />
            )}

            {activeTab === 'costing' && (
              <CostingQuotationView
                initialLead={pendingCostingLead}
                initialItinerary={pendingCostingItinerary}
              />
            )}

            {activeTab === 'proforma' && <ProformaInvoicesView />}

            {activeTab === 'bookings' && <BookingsHandoverView />}

            {activeTab === 'operations' && <OperationsHubView />}

            {activeTab === 'arrivals' && <ArrivalsLogisticsView />}

            {activeTab === 'fleet' && <TransportFleetView />}

            {activeTab === 'accounts' && <AccountsLedgerView />}

            {activeTab === 'sales_reports' && <SalesReportsView />}

            {activeTab === 'backend_master' && <BackendMasterView />}

            {activeTab === 'communication' && <InternalCommunicationView />}

            {activeTab === 'execution' && <TourExecutionView />}

            {activeTab === 'reports' && <ReportsMisView />}

            {isFinancePage(activeTab) && <FinanceModule page={activeTab} onNavigate={setActiveTab} />}
          </div>
        </main>
      </div>

      {/* 360° Tour Master Modal */}
      {selectedTourCode && (
        <TourMasterModal
          tourCode={selectedTourCode}
          onClose={() => setSelectedTourCode(null)}
        />
      )}

      {/* Printable Documents */}
      {printableDocument && (
        <PrintableDocumentModal
          params={printableDocument}
          onClose={() => setPrintableDocument(null)}
        />
      )}

      {/* Grounded AI Business Assistant */}
      {showAiModal && (
        <AiAssistantModal onClose={() => setShowAiModal(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <DmcProvider>
      <MainLayout />
    </DmcProvider>
  );
}
