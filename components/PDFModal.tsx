
import React, { useMemo, useEffect, useState } from 'react';
// Added CheckCircle to imports to fix the error on line 73
import { X, ExternalLink, FileText, Download, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { UploadedFile } from '../types';

interface PDFModalProps {
  file: UploadedFile;
  pageNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const PDFModal: React.FC<PDFModalProps> = ({ file, pageNumber, isOpen, onClose, isDarkMode }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const pdfUrl = useMemo(() => {
    if (!file.data || !isOpen) return '';
    
    let base64 = file.data;
    if (!base64.startsWith('data:')) {
      base64 = `data:application/pdf;base64,${base64}`;
    }
    
    try {
        const parts = base64.split(',');
        const binary = atob(parts[1] || parts[0]);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        return pageNumber ? `${url}#page=${pageNumber}` : url;
    } catch (e) {
        console.error("Failed to create PDF blob", e);
        return base64;
    }
  }, [file.data, pageNumber, isOpen]);

  useEffect(() => {
    if (isOpen) setIsLoaded(false);
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 md:p-10 animate-fade">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div className={`relative w-full h-full max-w-6xl rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border transition-all duration-300 animate-slide-up ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-4 md:p-5 border-b shrink-0 ${
            isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white/50'
        }`}>
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
             <div className="bg-[#07bc0c]/10 p-2 rounded-xl text-[#07bc0c] shrink-0">
                 <FileText className="w-5 h-5" />
             </div>
             <div className="min-w-0">
                <h3 className={`font-black text-xs md:text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{file.name}</h3>
                {pageNumber && (
                    <p className="text-[10px] font-black uppercase text-[#07bc0c] tracking-widest flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Page {pageNumber} Match
                    </p>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noreferrer" 
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
                <ExternalLink className="w-4 h-4" /> <span className="hidden xs:inline">Open Full</span>
            </a>
            <button 
                onClick={onClose}
                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
            >
                <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewport */}
        <div className="flex-1 bg-slate-800 relative">
          {!isLoaded && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                <Loader2 className="w-8 h-8 text-[#07bc0c] animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preparing Document...</p>
             </div>
          )}
          
          {/* Using object for primary rendering with iframe as secondary fallback */}
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full"
            onLoad={() => setIsLoaded(true)}
          >
            <iframe
                src={pdfUrl}
                className="w-full h-full border-none"
                onLoad={() => setIsLoaded(true)}
                title="PDF Content"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                <h4 className="text-xl font-black text-white mb-2">Browser Blocking Preview</h4>
                <p className="text-slate-400 text-sm max-w-sm mb-6">Chrome often restricts blob previews for security. Please use the button below to view the reference.</p>
                <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-8 py-4 bg-[#07bc0c] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#07bc0c]/20 flex items-center gap-3"
                >
                    <ExternalLink className="w-5 h-5" /> Open Reference Link
                </a>
            </div>
          </object>
        </div>
      </div>
    </div>
  );
};

export default PDFModal;
