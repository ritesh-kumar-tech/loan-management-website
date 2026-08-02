import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  X, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { SupportTicket } from '../../../types';
import { formatDate } from '../../../utils/calculator';

interface SupportTicketsViewProps {
  tickets: SupportTicket[];
  onSendMessage: (payload: { ticketId: string; sender: 'support'; text: string }) => Promise<void>;
}

export const SupportTicketsView: React.FC<SupportTicketsViewProps> = ({
  tickets,
  onSendMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setIsSending(true);
    try {
      await onSendMessage({
        ticketId: selectedTicket.id,
        sender: 'support',
        text: replyText,
      });

      const updatedMsg = {
        sender: 'support' as const,
        text: replyText,
        date: new Date().toISOString(),
      };

      setSelectedTicket({
        ...selectedTicket,
        messages: [...selectedTicket.messages, updatedMsg],
        updatedAt: new Date().toISOString(),
      });

      setReplyText('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" /> Borrower Support & Grievance Helpdesk
          </h2>
          <p className="text-xs text-slate-500">Respond to customer queries, payment confirmation inquiries & loan application status assistance.</p>
        </div>

        <div className="text-xs font-bold text-slate-700 bg-blue-50 text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200">
          {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} Active Support Queries
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Ticket ID (TKT-...), Customer Name, Category, or Subject..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">All Ticket Statuses</option>
            <option value="open">Open Tickets</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No support tickets found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{t.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.customerName}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{t.category}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate">{t.subject}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                        t.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(t.updatedAt)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Thread
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Conversation Thread Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">{selectedTicket.id}</span>
                <h3 className="text-base font-extrabold text-slate-900">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500">Customer: {selectedTicket.customerName} • {selectedTicket.category}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message History */}
            <div className="space-y-3 max-h-64 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              {selectedTicket.messages?.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl max-w-[85%] ${
                    msg.sender === 'support'
                      ? 'bg-slate-900 text-white ml-auto rounded-tr-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  <div className="font-bold text-[10px] opacity-75 mb-1">
                    {msg.sender === 'support' ? 'Dhani Official Support' : selectedTicket.customerName}
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                  <div className="text-[9px] opacity-50 text-right mt-1">{formatDate(msg.date)}</div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder="Type official support message reply..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendReply}
                disabled={isSending || !replyText.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
