import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { Sparkles, X, Send, Bot, User, ArrowRight } from 'lucide-react';

interface AiAssistantModalProps {
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose }) => {
  const { runAiQuery, setSelectedTourCode } = useDmc();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; relatedTourCodes?: string[] }>>([
    {
      sender: 'assistant',
      text: "Hello! I am your DMC Business Intelligence Assistant for Let's See Tour & Travels. I have live access to your tours, bookings, fleet, ledgers, and pipeline. What would you like to inspect today?",
      relatedTourCodes: ['LST-2026-00001', 'LST-2026-00002']
    }
  ]);

  const quickPrompts = [
    'Show all tours departing next week & operational readiness',
    'Which supplier advances or payments are currently due?',
    'What is the real-time profit and margin on LST-2026-00001?',
    'Show customer outstanding by B2B agent and credit limits'
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setInputQuery('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);

    setTimeout(() => {
      const result = runAiQuery(userMsg);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: result.answer,
          relatedTourCodes: result.relatedTourCodes
        }
      ]);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center border border-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">AI DMC Business Assistant</h3>
              <span className="text-xs text-emerald-100">Grounded in Live Database</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Quick Prompts Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Prompts:
          </span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors shrink-0 font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl p-4 leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {m.relatedTourCodes && m.relatedTourCodes.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 text-xs">Inspect Tour:</span>
                    {m.relatedTourCodes.map(code => (
                      <button
                        key={code}
                        onClick={() => {
                          setSelectedTourCode(code);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white text-emerald-700 font-mono font-semibold hover:bg-emerald-50 border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <span>{code}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputQuery)}
            placeholder="Ask about tour profitability, supplier debts, fleet status or agent credit..."
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-700 transition-colors placeholder:text-slate-400"
          />
          <button
            onClick={() => handleSend(inputQuery)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>
      </div>
    </div>
  );
};
