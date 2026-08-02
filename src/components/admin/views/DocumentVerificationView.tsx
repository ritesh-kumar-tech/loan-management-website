import React, { useState } from 'react';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  X, 
  AlertTriangle, 
  Download,
  FileText
} from 'lucide-react';
import { LoanApplication } from '../../../types';

interface DocumentVerificationViewProps {
  applications: LoanApplication[];
  onVerifyDocument: (appId: string, docId: string, status: string, note?: string) => Promise<void>;
}

export const DocumentVerificationView: React.FC<DocumentVerificationViewProps> = ({
  applications,
  onVerifyDocument,
}) => {
  const [docFilter, setDocFilter] = useState<string>('pending');
  const [selectedDocItem, setSelectedDocItem] = useState<{ app: LoanApplication; doc: any } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Flatten all documents across applications
  const allDocuments: { app: LoanApplication; doc: any }[] = [];
  applications.forEach((app) => {
    if (app.documents) {
      app.documents.forEach((doc) => {
        allDocuments.push({ app, doc });
      });
    }
  });

  const filteredDocs = allDocuments.filter(({ doc }) => {
    if (docFilter === 'all') return true;
    return doc.status === docFilter;
  });

  const handleAction = async (status: 'verified' | 'rejected') => {
    if (!selectedDocItem) return;
    await onVerifyDocument(selectedDocItem.app.id, selectedDocItem.doc.id, status, rejectionNote);
    setSelectedDocItem(null);
    setRejectionNote('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-orange-600" /> Borrower Document & KYC Verification Queue
          </h2>
          <p className="text-xs text-slate-500">Inspect PAN cards, Aadhaar identity documents, bank statements & income slips for accuracy.</p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          {['pending', 'verified', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setDocFilter(tab)}
              className={`px-3 py-1.5 rounded-xl uppercase transition-all cursor-pointer ${
                docFilter === tab
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold text-xs">
            No documents found in this status queue.
          </div>
        ) : (
          filteredDocs.map(({ app, doc }) => (
            <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{app.id}</span>
                  <h4 className="font-bold text-sm text-slate-900">{doc.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{app.personalInfo?.fullName || 'Applicant'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                  doc.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {doc.status}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-mono text-[11px] truncate">{doc.fileName}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.fileType}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setSelectedDocItem({ app, doc })}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect Document
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Document Inspector Modal */}
      {selectedDocItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-orange-600">{selectedDocItem.app.id}</span>
                <h3 className="text-base font-extrabold text-slate-900">{selectedDocItem.doc.title} Inspection</h3>
              </div>
              <button onClick={() => setSelectedDocItem(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 bg-slate-100 rounded-2xl border border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <div className="font-bold text-slate-800 text-sm">{selectedDocItem.doc.fileName}</div>
                <div className="text-xs text-slate-500">Applicant: {selectedDocItem.app.personalInfo?.fullName}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
                Mock Document Viewer • Secure SHA-256 Hash Verified
              </div>
            </div>

            {/* Rejection Note */}
            <div>
              <label className="block font-bold text-xs text-slate-700 mb-1">Verification / Rejection Comments</label>
              <input
                type="text"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="e.g. Document image clear and matches PAN record."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('verified')}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Document
                </button>
                <button
                  onClick={() => handleAction('rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Document
                </button>
              </div>

              <button
                onClick={() => setSelectedDocItem(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


