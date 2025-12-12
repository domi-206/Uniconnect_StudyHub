import React, { useRef, useState } from 'react';
import { Upload, FileText, Brain, Zap, AlertTriangle } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      onFileUpload({
        name: file.name,
        type: file.type,
        data: data
      });
      // Small delay to show the animation
      setTimeout(() => setIsLoading(false), 2000);
    };
    reader.onerror = () => {
        setIsLoading(false);
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

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#07bc0c] shadow-lg shadow-[#07bc0c]/50"></div>
      
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-5xl font-bold text-slate-800 mb-3 tracking-tight">Docu<span className="text-[#07bc0c]">Mind</span></h1>
        <p className="text-slate-500 text-lg">Your Intelligent Study Companion</p>
      </div>

      <div
        className={`w-full max-w-xl h-80 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 relative overflow-hidden group ${
          isDragging
            ? 'border-2 border-[#07bc0c] bg-[#07bc0c]/5 scale-105'
            : 'border-2 border-dashed border-slate-300 hover:border-[#07bc0c] hover:bg-white hover:shadow-2xl hover:shadow-[#07bc0c]/20'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center w-full h-full relative">
             {/* Brain Processing Animation */}
             <div className="relative flex items-center justify-center mb-6">
                 {/* Ripple Effects */}
                 <div className="absolute w-24 h-24 border-4 border-[#07bc0c] rounded-full opacity-0 animate-ripple"></div>
                 <div className="absolute w-24 h-24 border-4 border-[#07bc0c] rounded-full opacity-0 animate-ripple" style={{ animationDelay: '0.6s' }}></div>
                 <div className="absolute w-24 h-24 border-4 border-[#07bc0c] rounded-full opacity-0 animate-ripple" style={{ animationDelay: '1.2s' }}></div>
                 
                 {/* Glowing Brain */}
                 <div className="relative z-10 bg-white p-4 rounded-full shadow-2xl shadow-[#07bc0c]/30 animate-brain-pulse">
                    <Brain className="w-16 h-16 text-[#07bc0c]" />
                 </div>
             </div>
             
             <h3 className="text-xl font-bold text-slate-800 animate-pulse">Processing Document</h3>
             <p className="text-sm text-slate-400 mt-2">Extracting topics and key concepts...</p>
          </div>
        ) : (
          <>
            <div className="bg-[#07bc0c]/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 relative">
              <Upload className="w-10 h-10 text-[#07bc0c]" />
              <div className="absolute inset-0 bg-[#07bc0c]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <p className="text-xl font-bold text-slate-700 mb-2">Upload your PDF</p>
            <p className="text-sm text-slate-400">Drag & drop or click to browse</p>
            <p className="text-xs text-slate-300 mt-2">Max file size: {MAX_FILE_SIZE_MB}MB</p>
            
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#07bc0c]/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
          </>
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
        <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg animate-fade-in-up">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 gap-8 text-sm text-slate-400">
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-slate-100">
            <div className="bg-[#07bc0c]/10 p-1.5 rounded-full">
                <FileText className="w-4 h-4 text-[#07bc0c]" />
            </div>
            <span>Secure & Private</span>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-slate-100">
            <div className="bg-[#07bc0c]/10 p-1.5 rounded-full">
                <Zap className="w-4 h-4 text-[#07bc0c]" />
            </div>
            <span>AI Powered Analysis</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;