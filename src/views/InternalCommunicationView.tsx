import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { MessageSquare, Send, Paperclip } from 'lucide-react';

export const InternalCommunicationView: React.FC = () => {
  const {
    internalMessages,
    sendInternalMessage,
    confirmedTours,
    employees,
    currentEmployee,
    selectedDepartment
  } = useDmc();

  const [selectedTourCodeFilter, setSelectedTourCodeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newText, setNewText] = useState('');
  const [newTourCode, setNewTourCode] = useState(confirmedTours[0]?.tourCode || '');

  const filteredMessages = internalMessages.filter(msg => {
    const matchesTour = selectedTourCodeFilter === 'all' ? true : msg.linkedId === selectedTourCodeFilter;
    const matchesSearch =
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.linkedId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTour && matchesSearch;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    sendInternalMessage({
      linkedType: 'tour_code',
      linkedId: newTourCode || 'GENERAL',
      senderDepartment: selectedDepartment || 'sales',
      senderEmployeeId: currentEmployee?.id || 'EMP-101',
      senderName: currentEmployee?.name || 'Staff User',
      senderLogin: currentEmployee?.loginId || 'staff',
      targetDepartment: 'all',
      message: newText.trim()
    });

    setNewText('');
  };

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div>
        <p className="text-xs font-semibold text-emerald-700">
          Cross-Department Collaboration · Linked to Central Tour Codes
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Internal Team Communication
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Direct team handovers between Sales, Operations, Accounts, and Backend tied to active tour codes.
        </p>
      </div>

      {/* Pure Split Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[600px]">
        {/* Left Sidebar: Tour Code Threads */}
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <span className="font-bold text-xs text-slate-900">Tour Channels</span>
            <span className="text-xs text-slate-500 tabular-nums">{confirmedTours.length} active</span>
          </div>

          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tour code or staff..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-600 text-slate-900"
            />
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
            <button
              onClick={() => setSelectedTourCodeFilter('all')}
              className={`w-full text-left px-5 py-3.5 text-xs transition-colors ${
                selectedTourCodeFilter === 'all' ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div>All Company Messages</div>
              <div className="text-xs text-slate-500 mt-0.5 font-normal">Global feed across all tours</div>
            </button>

            {confirmedTours.map(t => {
              const msgCount = internalMessages.filter(m => m.linkedId === t.tourCode).length;
              const isSelected = selectedTourCodeFilter === t.tourCode;
              return (
                <button
                  key={t.tourCode}
                  onClick={() => {
                    setSelectedTourCodeFilter(t.tourCode);
                    setNewTourCode(t.tourCode);
                  }}
                  className={`w-full text-left px-5 py-3.5 text-xs transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-700 font-bold">{t.tourCode}</span>
                    {msgCount > 0 && (
                      <span className="text-xs font-semibold text-emerald-700 tabular-nums">{msgCount}</span>
                    )}
                  </div>
                  <div className="text-slate-900 font-semibold truncate mt-0.5">{t.clientName}</div>
                  <div className="text-xs text-slate-500 truncate">{t.destination}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Stream & Composer */}
        <div className="lg:col-span-3 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-slate-900 text-sm">
                {selectedTourCodeFilter === 'all' ? 'Global Company Feed' : `Tour Thread · ${selectedTourCodeFilter}`}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">({filteredMessages.length})</span>
            </div>

            <div className="text-xs text-slate-600">
              Posting as <span className="font-semibold text-slate-900">{currentEmployee?.name}</span> ·{' '}
              <span className="uppercase text-emerald-700 font-semibold">{currentEmployee?.department}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No messages recorded for this channel yet.
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isUrgent = msg.message.toLowerCase().includes('urgent') || msg.message.toLowerCase().includes('asap');

                return (
                  <div key={msg.id} className="py-4 first:pt-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                          {msg.senderName.charAt(0)}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">{msg.senderName}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="uppercase text-slate-500 font-medium">{msg.senderDepartment}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        {msg.linkedId && (
                          <span className="font-mono font-semibold text-emerald-700">{msg.linkedId}</span>
                        )}
                        <span className="text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed pl-9 ${isUrgent ? 'text-rose-700 font-medium' : 'text-slate-700'}`}>
                      {msg.message}
                    </p>

                    {msg.attachmentName && (
                      <div className="pl-9 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500 overflow-x-auto">
            <span className="font-semibold text-slate-600 shrink-0">Quick mention:</span>
            {employees.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => setNewText(prev => `${prev} @${e.loginId} `.trimStart())}
                className="text-slate-600 hover:text-emerald-700 font-mono whitespace-nowrap"
              >
                @{e.loginId}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <select
              value={newTourCode}
              onChange={(e) => setNewTourCode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-emerald-800 bg-white focus:outline-none focus:border-emerald-600"
            >
              <option value="">General</option>
              {confirmedTours.map(t => (
                <option key={t.tourCode} value={t.tourCode}>
                  {t.tourCode} ({t.clientName})
                </option>
              ))}
            </select>

            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write internal handover note or task..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-600 text-slate-900 bg-white"
              required
            />

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
