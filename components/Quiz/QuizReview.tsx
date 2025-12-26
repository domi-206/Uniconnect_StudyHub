
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ArrowRight, TrendingUp, AlertTriangle, Target, Star, Info, Eye, BrainCircuit, Check, X, Lightbulb, ChevronDown, ChevronUp, Loader2, FileSearch } from 'lucide-react';
import { QuizQuestion, QuizResult, UploadedFile } from '../../types';
import { getQuizFeedback, FeedbackResult } from '../../services/geminiService';
import PDFModal from '../PDFModal';

interface QuizReviewProps {
  questions: QuizQuestion[];
  results: QuizResult[];
  topic: string;
  file: UploadedFile;
  onRetry: () => void;
  onExit: () => void;
  onUnlockNext: (score: number) => void;
  isDarkMode?: boolean;
}

const FormattedText: React.FC<{ text: string, isDarkMode?: boolean }> = ({ text, isDarkMode }) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
            elements.push(<div key={`br-${index}`} className="h-2" />);
            return;
        }

        const parts = line.split(/(\*\*.*?\*\*)/g);
        const children = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className={`font-extrabold px-1 rounded ${isDarkMode ? 'text-[#07bc0c] bg-[#07bc0c]/10' : 'text-slate-900 bg-yellow-100'}`}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
             elements.push(
                <div key={index} className="flex items-start gap-3 mb-3 pl-2">
                    <div className="mt-2.5 w-2 h-2 rounded-full bg-[#07bc0c] shrink-0 shadow-sm"></div>
                    <span className={`leading-relaxed text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{children.map((c, i) => (typeof c === 'string' ? c.replace(/^[-*]\s*/, '') : c))}</span>
                </div>
             );
        } else {
             elements.push(
                <p key={index} className={`mb-4 leading-loose text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    {children}
                </p>
             );
        }
    });

    return <div className="markdown-content">{elements}</div>;
};

const QuizReview: React.FC<QuizReviewProps> = ({ 
  questions, 
  results, 
  topic, 
  file,
  onRetry, 
  onExit,
  onUnlockNext,
  isDarkMode
}) => {
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  
  // Reference Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedRefPage, setSelectedRefPage] = useState<number | undefined>(undefined);

  const correctCount = results.filter(r => r.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= 70;

  useEffect(() => {
    onUnlockNext(score);
    getQuizFeedback(file, questions, results)
        .then(data => {
            setFeedback(data);
            setIsLoadingFeedback(false);
        })
        .catch(() => setIsLoadingFeedback(false));
  }, []);

  const openReference = (page?: number) => {
    setSelectedRefPage(page);
    setIsViewerOpen(true);
  };

  return (
    <div className={`max-w-7xl mx-auto p-4 md:p-8 h-full flex flex-col overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Reference Modal */}
      <PDFModal 
        file={file} 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        pageNumber={selectedRefPage}
        isDarkMode={isDarkMode}
      />

      {/* Dynamic Header */}
      <div className={`p-6 rounded-3xl shadow-lg border-2 mb-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} ${passed ? 'border-[#07bc0c]/20' : 'border-amber-200'}`}>
        <div className="flex items-center gap-6">
             <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle className={isDarkMode ? "text-slate-800" : "text-slate-100"} strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50%" cy="50%" />
                    <circle className={`${passed ? 'text-[#07bc0c]' : 'text-amber-500'} transition-all duration-1000 ease-out`} strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * score) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50%" cy="50%" />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl md:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{score}%</span>
                    <span className="text-[10px] font-black uppercase text-slate-500">Score</span>
                 </div>
             </div>
             <div>
                <h1 className={`text-2xl md:text-3xl font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {passed ? "Excellent!" : "Keep Pushing!"}
                </h1>
                <p className={`font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    You answered {correctCount} of {questions.length} questions correctly.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#07bc0c]">
                    Topic: {topic}
                </div>
             </div>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto">
            <button 
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border transition-all ${isDarkMode ? 'bg-[#07bc0c]/10 text-[#07bc0c] border-[#07bc0c]/20 hover:bg-[#07bc0c]/20' : 'bg-[#07bc0c]/10 text-[#07bc0c] border-[#07bc0c]/20 hover:bg-[#07bc0c]/20'}`}
            >
                {showAnalysis ? <><ChevronUp className="w-4 h-4" /> Collapse AI Insights</> : <><ChevronDown className="w-4 h-4" /> Expand AI Insights</>}
            </button>
            <div className="flex gap-2">
                <button onClick={onRetry} className={`flex-1 px-4 py-3 rounded-2xl border-2 font-bold transition-all text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}>Retry</button>
                <button onClick={onExit} className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm shadow-lg shadow-slate-900/20">Finish</button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 space-y-6 pb-20">
        
        {showAnalysis && (
            <div className="animate-slide-up space-y-6">
                {isLoadingFeedback ? (
                    <div className={`p-12 rounded-[2.5rem] border shadow-sm flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                        <Loader2 className="w-10 h-10 text-[#07bc0c] animate-spin mb-4" />
                        <p className="font-black text-slate-500 uppercase tracking-[0.2em] text-xs">Generating Analysis...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className={`lg:col-span-2 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl transition-colors ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-900 text-white'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#07bc0c]/10 rounded-bl-full"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <Target className="w-6 h-6 text-[#07bc0c]" />
                                    <h3 className="text-xl font-black uppercase tracking-widest text-white">Recommended Focus</h3>
                                </div>
                                <div className="text-slate-300 leading-relaxed font-medium">
                                    <FormattedText text={feedback?.focusArea || ''} isDarkMode={true} />
                                </div>
                            </div>
                            <div className={`rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-center text-center transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-indigo-900/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <Star className="w-8 h-8" />
                                </div>
                                <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Summary</h3>
                                <p className={`font-medium italic leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    "{feedback?.summary}"
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className={`rounded-[2.5rem] p-8 border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-green-50/10 p-2 rounded-xl text-[#07bc0c]"><CheckCircle className="w-5 h-5" /></div>
                                    <h3 className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Your Strengths</h3>
                                </div>
                                <div className="space-y-3">
                                    {feedback?.strengths.map((s, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            <FormattedText text={s} isDarkMode={isDarkMode} />
                                        </div>
                                    ))}
                                </div>
                             </div>

                             <div className={`rounded-[2.5rem] p-8 border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-amber-50/10 p-2 rounded-xl text-amber-500"><AlertTriangle className="w-5 h-5" /></div>
                                    <h3 className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Growth Areas</h3>
                                </div>
                                <div className="space-y-3">
                                    {feedback?.weaknesses.map((w, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            <FormattedText text={w} isDarkMode={isDarkMode} />
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </>
                )}
            </div>
        )}

        <div className="space-y-6">
            <div className="flex items-center gap-4 px-4">
                <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Reviewer Feedback</h2>
                <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            </div>

            {questions.map((q, idx) => {
                const result = results.find(r => r.questionId === q.id);
                const isCorrect = result?.isCorrect;
                const selectedIdx = result?.selectedAnswerIndex ?? -1;
                
                return (
                    <div key={q.id} className={`group rounded-[2.5rem] p-8 md:p-10 shadow-sm border transition-all hover:shadow-xl hover:scale-[1.01] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${!isCorrect ? (isDarkMode ? 'ring-2 ring-red-900/20' : 'ring-2 ring-red-50') : 'ring-2 ring-transparent'}`}>
                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl shadow-lg ${isCorrect ? 'bg-[#07bc0c] text-white' : 'bg-red-500 text-white'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <h4 className={`text-xl md:text-2xl font-extrabold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{q.text}</h4>
                                    {q.sourcePage && (
                                        <button 
                                            onClick={() => openReference(q.sourcePage)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${isDarkMode ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                        >
                                            <FileSearch className="w-4 h-4" /> View Source (P.{q.sourcePage})
                                        </button>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                                    {q.options.map((opt, i) => {
                                        const isAnswer = q.correctAnswerIndex === i;
                                        const isSelected = selectedIdx === i;
                                        
                                        let style = isDarkMode ? "border-slate-800 bg-slate-950 text-slate-500" : "border-slate-100 bg-slate-50 text-slate-400";
                                        if (isAnswer) style = isDarkMode ? "border-[#07bc0c] bg-[#07bc0c]/10 text-white font-bold ring-2 ring-[#07bc0c]/20" : "border-[#07bc0c] bg-[#07bc0c]/5 text-slate-900 font-bold ring-2 ring-[#07bc0c]/10";
                                        else if (isSelected && !isCorrect) style = isDarkMode ? "border-red-900/50 bg-red-900/10 text-white font-bold" : "border-red-200 bg-red-50 text-slate-900 font-bold";

                                        return (
                                            <div key={i} className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${style}`}>
                                                <span className="text-base">{opt}</span>
                                                {isAnswer && <div className="bg-[#07bc0c] text-white p-1 rounded-full"><Check className="w-3 h-3" /></div>}
                                                {isSelected && !isCorrect && <div className="bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3" /></div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={`rounded-[2rem] p-6 border flex items-start gap-4 transition-colors ${isDarkMode ? 'bg-amber-900/10 border-amber-900/20' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className="bg-amber-100/10 p-2.5 rounded-xl text-amber-600 shrink-0"><Lightbulb className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Expert Explanation</p>
                                        <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{q.explanation}</p>
                                        {q.sourceContext && (
                                            <p className={`mt-3 text-sm italic border-l-2 pl-4 ${isDarkMode ? 'text-slate-500 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
                                                &ldquo;{q.sourceContext}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default QuizReview;
