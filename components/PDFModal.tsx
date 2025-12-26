
import React, { useMemo, useEffect } from 'react';
import { X, ExternalLink, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { UploadedFile } from '../types';

interface PDFModalProps {
  file: UploadedFile;
  pageNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const PDFModal: React.FC<PDFModalProps> = ({ file, pageNumber, isOpen, onClose, isDarkMode }) => {
  const pdfUrl = useMemo(() => {
    if (!file.data) return '';
    // If the data already contains the data:application/pdf;base64 header, use it as is
    // If it's just raw base64, prepend it.
    let base64 = file.data;
    if (!base64.startsWith('data:')) {
      base64 = `data:application/pdf;base64,${base64}`;
    }
    
    // Create a Blob for better performance and to support #page=X
    try {
        const byteCharacters = atob(base64.split(',')[1] || base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        return pageNumber ? `${url}#page=${pageNumber}` : url;
    } catch (e) {
        console.error("Failed to create PDF blob", e);
        return base64; // Fallback to raw data URI
    }
  }, [file.data, pageNumber]);

  useEffect(() => {
    return () => {
      if (pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 animate-fade">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className={`relative w-full h-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white/50'}`}>
          <div className="flex items-center gap-4">
             <div className="bg-[#07bc0c]/10 p-2 rounded-xl text-[#07bc0c]">
                 <FileText className="w-5 h-5" />
             </div>
             <div>
                <h3 className={`font-black text-sm md:text-base truncate max-w-[200px] md:max-w-md ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{file.name}</h3>
                {pageNumber && <p className="text-[10px] font-black uppercase text-[#07bc0c] tracking-widest">Grounding Reference: Page {pageNumber}</p>}
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noreferrer" 
                className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                title="Open in new tab"
            >
                <ExternalLink className="w-5 h-5" />
            </a>
            <button 
                onClick={onClose}
                className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden">
          <iframe 
            src={pdfUrl} 
            className="w-full h-full border-none shadow-inner" 
            title="PDF Reference Viewer"
          />
        </div>
        
        {/* Footer info */}
        <div className={`p-4 text-center border-t ${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <p className="text-xs font-bold italic">Source reference extracted by StudyHub AI for accuracy verification.</p>
        </div>
      </div>
    </div>
  );
};

export default PDFModal;
