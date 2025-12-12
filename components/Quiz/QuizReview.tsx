import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ArrowRight, TrendingUp, AlertTriangle, Target, Star } from 'lucide-react';
import { QuizQuestion, QuizResult, UploadedFile } from '../../types';
import { getQuizFeedback, FeedbackResult } from '../../services/geminiService';

interface QuizReviewProps {
  questions: QuizQuestion[];
  results: QuizResult[];
  topic: string;
  file: UploadedFile;
  onRetry: () => void;
  onExit: () => void;
  onUnlockNext: (score: number) => void;
}

// Improved FormattedText to handle strict formatting rules
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Basic Markdown Parser
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
            elements.push(<br key={`br-${index}`} />);
            return;
        }

        // Parse Bold (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const children = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        // List items
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
             elements.push(
                <div key={index} className="flex items-start gap-3 mb-2 pl-2">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#07bc0c] shrink-0"></span>
                    <span className="leading-relaxed text-slate-700">{children.map((c, i) => (typeof c === 'string' ? c.replace(/^[-*]\s*/, '') : c))}</span>
                </div>
             );
        } else {
             // Standard Paragraph
             elements.push(
                <p key={index} className="mb-3 leading-relaxed text-slate-600">
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
  onUnlockNext
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'review'>('overview');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);

  const correctCount = results.filter(r => r.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= 70;

  useEffect(() => {
    onUnlockNext(score);
    // Fetch AI feedback
    getQuizFeedback(file, questions, results)
        .then(data => {
            setFeedback(data);
            setIsLoadingFeedback(false);
        })
        .catch(() => setIsLoadingFeedback(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Score Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-2 h-full ${passed ? 'bg-[#07bc0c]' : 'bg-amber-500'}`}></div>
        
        <div className="flex items-center gap-6 z-10">
             <div className="relative">
                 <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                        className="text-slate-100"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                    />
                    <circle
                        className={`${passed ? 'text-[#07bc0c]' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                        strokeWidth="8"
                        strokeDasharray={365}
                        strokeDashoffset={365 - (365 * score) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                    />
                 </svg>
                 <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800">{score}%</span>
                    <span className="text-xs text-slate-400 font-medium uppercase">Score</span>
                 </div>
             </div>
             <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">{passed ? "Topic Mastered!" : "Keep Practicing"}</h2>
                <p className="text-slate-500">You answered <strong className={passed ? "text-[#07bc0c]" : "text-amber-500"}>{correctCount}</strong> out of {questions.length} questions correctly.</p>
                {!passed && <p className="text-sm text-red-500 font-bold mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Score 70% to unlock the next topic.</p>}
             </div>
        </div>

        <div className="flex gap-3 z-10">
             <button 
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-[#07bc0c] text-white shadow-lg shadow-[#07bc0c]/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
                AI Analysis
             </button>
             <button 
                onClick={() => setActiveTab('review')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'review' ? 'bg-[#07bc0c] text-white shadow-lg shadow-[#07bc0c]/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
                Check Answers
             </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {activeTab === 'overview' ? (
          <div className="animate-fade-in-up space-y-6 pb-6">
             {isLoadingFeedback ? (
                 <div className="flex flex-col items-center justify-center h-64">
                     <div className="w-16 h-16 border-4 border-[#07bc0c]/20 border-t-[#07bc0c] rounded-full animate-spin mb-4"></div>
                     <p className="text-slate-500 font-medium animate-pulse">Analyzing performance & generating feedback...</p>
                 </div>
             ) : (
                <>
                 {/* Summary Card */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-start gap-4">
                        <div className="bg-indigo-100 p-3 rounded-xl">
                            <Star className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Performance Summary</h3>
                            <FormattedText text={feedback?.summary || ''} />
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#07bc0c]"></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-[#07bc0c]" />
                            Your Strengths
                        </h3>
                        <div className="space-y-4">
                            {feedback?.strengths.map((s, i) => (
                                <div key={i} className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#07bc0c]" />
                                        <div className="flex-1">
                                            <FormattedText text={s} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                            Needs Improvement
                        </h3>
                         <div className="space-y-4">
                            {feedback?.weaknesses.map((w, i) => (
                                <div key={i} className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                                        <div className="flex-1">
                                            <FormattedText text={w} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Focus Area */}
                 <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 relative">
                     <div className="flex items-start gap-4">
                         <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
                             <Target className="w-6 h-6 text-white" />
                         </div>
                         <div className="flex-1">
                             <h3 className="text-lg font-bold text-slate-800 mb-2">Recommended Focus Area</h3>
                             <div className="text-slate-700 leading-relaxed bg-white/50 p-4 rounded-xl border border-indigo-50/50">
                                <FormattedText text={feedback?.focusArea || ''} />
                             </div>
                         </div>
                     </div>
                 </div>
                </>
             )}
          </div>
        ) : (
          <div className="space-y-4 pb-6 animate-fade-in">
            {questions.map((q, idx) => {
              const result = results.find(r => r.questionId === q.id);
              const isCorrect = result?.isCorrect;
              
              return (
                <div key={q.id} className={`p-6 rounded-2xl border-2 transition-all ${isCorrect ? 'border-[#07bc0c]/20 bg-green-50/20' : 'border-red-200 bg-red-50/20'}`}>
                   <div className="flex items-start gap-4 mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white ${isCorrect ? 'bg-[#07bc0c]' : 'bg-red-500'}`}>
                          {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-800">{q.text}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-2 ml-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => {
                            const isSelected = result?.selectedAnswerIndex === i;
                            const isAnswer = q.correctAnswerIndex === i;
                            let style = "bg-white border-slate-200 text-slate-500";
                            let icon = null;
                            
                            if (isAnswer) {
                                style = "bg-[#07bc0c]/10 border-[#07bc0c] text-[#07bc0c] font-bold";
                                icon = <CheckCircle className="w-4 h-4 text-[#07bc0c]" />;
                            }
                            else if (isSelected && !isCorrect) {
                                style = "bg-red-50 border-red-300 text-red-600 font-bold";
                                icon = <XCircle className="w-4 h-4 text-red-500" />;
                            }

                            return (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${style}`}>
                                    <span>{opt}</span>
                                    {icon}
                                </div>
                            )
                        })}
                      </div>
                      
                      <div className="mt-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-700 block mb-1 text-sm uppercase tracking-wide">Explanation</span>
                        <p className="text-slate-600 text-sm">{q.explanation}</p>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex gap-4 shrink-0 justify-center pt-4 border-t border-slate-100">
        <button 
            onClick={onRetry}
            className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
            <RotateCcw className="w-5 h-5" />
            Retry Topic
        </button>
        <button 
            onClick={onExit}
            className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white bg-slate-900 hover:bg-slate-800 hover:scale-105 transition-all shadow-lg"
        >
            Back to Dashboard
            <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default QuizReview;