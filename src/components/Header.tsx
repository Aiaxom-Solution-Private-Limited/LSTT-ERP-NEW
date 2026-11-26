import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import {
  Search,
  Sparkles,
  RotateCcw,
  Bell,
  LogOut,
  ChevronDown,
  Check
} from 'lucide-react';

interface HeaderProps {
  onOpenAi: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAi }) => {
  const {
    selectedDepartment,
    setSelectedDepartment,
    confirmedTours,
    setSelectedTourCode,
    resetToDemoData,
    employees,
    currentEmployee,
    setCurrentEmployee,
    notifications,
    markNotificationRead
  } = useDmc();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmployeeSwitcher, setShowEmployeeSwitcher] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const filteredTours = confirmedTours.filter(t =>
    t.tourCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTour = (tourCode: string) => {
    setSelectedTourCode(tourCode);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const departmentLabels: Record<string, string> = {
    sales: 'Sales Team',
    backend: 'Backend / Admin',
    operations: 'Operations Team',
    accounts: 'Accounts & Finance',
    executive: 'Executive Management'
  };

  const activeDeptLabel = selectedDepartment ? departmentLabels[selectedDepartment] : 'Executive Management';
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between gap-6 shrink-0 z-30 sticky top-0">
      {/* Zone 1: Clean Global Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => setShowSearchResults(true)}
          placeholder="Search Tour Code or guest name..."
          className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-lg outline-none transition-colors placeholder:text-slate-400 text-slate-900"
        />

        {showSearchResults && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span className="font-medium">Confirmed Tours</span>
              <button
                onClick={() => setShowSearchResults(false)}
                className="hover:text-slate-800"
              >
                Close
              </button>
            </div>
            {filteredTours.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                No tour matching "{searchQuery}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTours.map(t => (
                  <button
                    key={t.tourCode}
                    onClick={() => handleSelectTour(t.tourCode)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-emerald-700">{t.tourCode}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-900">{t.clientName}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.destination} · {t.startDate} to {t.endDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums block">
                        ₹{t.sellingPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs capitalize text-emerald-700">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 2 & 3: Staff Context & Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Staff & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowEmployeeSwitcher(!showEmployeeSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <span className="font-semibold text-slate-900">
              {currentEmployee ? currentEmployee.name : 'Staff'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-medium hidden sm:inline">
              {activeDeptLabel}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showEmployeeSwitcher && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden text-xs">
              <div className="px-4 py-2.5 border-b border-slate-100 text-slate-500 font-medium">
                Active Staff Identity
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setCurrentEmployee(emp);
                      setShowEmployeeSwitcher(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currentEmployee?.id === emp.id ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div>
                      <div className="text-slate-900 font-semibold">{emp.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {emp.id} · {emp.roleTitle}
                      </div>
                    </div>
                    {currentEmployee?.id === emp.id && (
                      <Check className="w-4 h-4 text-emerald-700" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => {
                    setShowEmployeeSwitcher(false);
                    setSelectedDepartment(null);
                  }}
                  className="w-full py-1.5 px-3 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center justify-between"
                >
                  <span>Switch Department Portal</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden text-xs">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  Notifications ({unreadCount} unread)
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No notifications.</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !notif.read ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1">
                        <span className={`font-medium capitalize ${
                          notif.priority === 'urgent' ? 'text-rose-700' :
                          notif.priority === 'high' ? 'text-amber-700' :
                          'text-emerald-700'
                        }`}>
                          {notif.category.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono tabular-nums">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900">{notif.title}</div>
                      <p className="text-slate-600 mt-0.5 leading-snug">{notif.message}</p>
                      {notif.linkedReference && (
                        <div className="mt-1 text-[11px] font-mono text-emerald-700">
                          Ref: {notif.linkedReference}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Demo */}
        <div className="relative">
          <button
            onClick={() => setShowResetConfirm(!showResetConfirm)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            title="Reset Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {showResetConfirm && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 text-xs">
              <div className="font-semibold text-slate-900 mb-1">Reset Demo Data?</div>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Restores sample tours, leads, packages, and ledgers to default state.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetToDemoData();
                    setShowResetConfirm(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Primary Header Action */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
      </div>
    </header>
  );
};
