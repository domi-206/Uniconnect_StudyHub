
import React, { useRef, useState } from 'react';
import { Upload, FileText, Brain, Zap, AlertTriangle } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  isDarkMode?: boolean;
  progress?: number;
  stage?: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const LOGO_URL = "https://raw.githubusercontent.com/Anupam-2022/DocuMind/main/logo.png";

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isDarkMode, progress = 0, stage }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size exceeds limit of ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }

    if (file.type !== 'application/pdf') {
        setError("Only PDF files are supported.");
        return;
    }

    setIsReading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      onFileUpload({
        name: file.name,
        type: file.type,
        data: data
      });
      setTimeout(() => setIsReading(false), 500);
    };
    reader.onerror = () => {
        setIsReading(false);
        setError("Failed to read file.");
    }
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const isLoading = isReading || (progress > 0 && progress < 100);

  return (
    <div className={`h-full w-full flex items-center justify-center transition-colors duration-300 overflow-y-auto ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col items-center text-center space-y-8 md:space-y-12">
          
          <div className="flex flex-col items-center space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 md:gap-4">
              <img src={LOGO_URL} alt="Logo" className="h-16 md:h-20 w-auto object-contain drop-shadow-2xl" />
              <h1 className={`text-4xl md:text-7xl font-extrabold tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Study<span className="text-[#07bc0c]">Hub</span>
              </h1>
            </div>
            <p className={`text-lg md:text-2xl font-medium leading-relaxed max-w-2xl px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Master your documents with <span className={isDarkMode ? 'text-[#07bc0c]' : 'text-[#059609] font-bold'}>absolute precision</span>. A product of Unispace.
            </p>
          </div>

          <div className="relative group w-full max-w-2xl px-4 md:px-0">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#07bc0c]/30 to-indigo-500/20 rounded-[2rem] md:rounded-[4rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            
            <div 
              className={`relative z-10 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border shadow-2xl transition-all duration-500 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-xl' : 'bg-white border-white backdrop-blur-xl'
              } ${isDragging ? 'ring-4 ring-[#07bc0c]/20 scale-[1.01]' : ''}`}
            >
              <div
                className={`w-full min-h-[300px] md:min-h-[400px] rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                  isDragging
                    ? 'bg-[#07bc0c]/5 border-2 border-[#07bc0c]'
                    : isDarkMode 
                        ? 'border-2 border-dashed border-slate-700 hover:border-[#07bc0c] hover:bg-slate-950/50'
                        : 'border-2 border-dashed border-slate-200 hover:border-[#07bc0c] hover:bg-slate-50'
                } ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                onDragOver={(e) => { e.preventDefault(); if(!isLoading) setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isLoading && inputRef.current?.click()}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-6 md:space-y-8 w-full">
                    <div className="relative flex items-center justify-center">
                        <svg className="w-32 h-32 md:w-40 md:h-40 transform -rotate-90">
                            <circle cx="50%" cy="50%" r="60" md:r="70" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="8" fill="transparent" />
                            <circle cx="50%" cy="50%" r="60" md:r="70" stroke="#07bc0c" strokeWidth="8" strokeDasharray="440" strokeDashoffset={440 - (440 * progress) / 100} strokeLinecap="round" fill="transparent" className="transition-all duration-300 ease-out" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <Brain className="w-8 h-8 md:w-12 md:h-12 text-[#07bc0c] animate-pulse mb-1" />
                            <span className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(progress)}%</span>
                        </div>
                    </div>
                    <div className="space-y-3 px-4">
                      <h3 className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {stage || "Synchronizing Document"}
                      </h3>
                      <div className="flex items-center justify-center gap-2">
                         <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                         <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center p-6 space-y-6 md:space-y-8 group/icon">
                    <div className={`p-8 md:p-10 rounded-full transition-all duration-500 group-hover/icon:scale-110 group-hover/icon:rotate-6 ${isDarkMode ? 'bg-[#07bc0c]/20 ring-4 ring-[#07bc0c]/5' : 'bg-[#07bc0c]/10 ring-4 ring-[#07bc0c]/5'}`}>
                      <Upload className="w-12 h-12 md:w-16 md:h-16 text-[#07bc0c]" />
                    </div>
                    <div className="space-y-3 px-4">
                      <h3 className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Drop your study material</h3>
                      <p className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Click to browse or drag & drop (PDF only)</p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                         <FileText className="w-4 h-4" /> PDF Documents
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                         Limit {MAX_FILE_SIZE_MB}MB
                      </div>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={inputRef}
                  className="hidden"
                  accept=".pdf,application/pdf"
                  disabled={isLoading}
                  onChange={(e) => e.target.files && processFile(e.target.files[0])}
                />
              </div>

              {error && (
                <div className={`mt-6 flex items-center gap-3 p-4 rounded-2xl border animate-shake ${isDarkMode ? 'bg-red-900/20 border-red-900/20 text-red-400' : 'bg-red-50 border-red-100 text-red-500'}`}>
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-bold">{error}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 pt-4 opacity-50">
             <div className="flex items-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-500">
                <Zap className="w-4 h-4 text-[#07bc0c]" /> Advanced Processing
             </div>
             <div className="flex items-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-500">
                <Brain className="w-4 h-4 text-[#07bc0c]" /> Content Analysis
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FileUpload;
