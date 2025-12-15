import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ArrowRight, TrendingUp, AlertTriangle, Target, Star, Info, Eye, BrainCircuit, Check, X, Lightbulb } from 'lucide-react';
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

// Improved FormattedText with better readability and contrast
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
            elements.push(<div key={`br-${index}`} className="h-2" />);
            return;
        }

        // Parse Bold (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const children = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-slate-900 font-extrabold bg-yellow-100 px-1 rounded">{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        // List items
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
             elements.push(
                <div key={index} className="flex items-start gap-3 mb-3 pl-2">
                    <div className="mt-2.5 w-2 h-2 rounded-full bg-[#07bc0c] shrink-0 shadow-sm"></div>
                    <span className="leading-relaxed text-slate-800 text-lg">{children.map((c, i) => (typeof c === 'string' ? c.replace(/^[-*]\s*/, '') : c))}</span>
                </div>
             );
        } else {
             // Standard Paragraph
             elements.push(
                <p key={index} className="mb-4 leading-loose text-slate-700 text-lg">
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 h-full flex flex-col overflow-hidden bg-slate-50 font-sans">
      {/* Top Banner - High Contrast */}
      <div className={`p-6 rounded-3xl shadow-lg border-2 mb-6 shrink-0 flex flex-col md:flex-row items-center justify-between gap-8 bg-white ${passed ? 'border-[#07bc0c]/20' : 'border-amber-200'}`}>
        
        <div className="flex items-center gap-8">
             {/* Circular Progress */}
             <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
                    <circle
                        className="text-slate-100"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r="60"
                        cx="50%"
                        cy="50%"
                    />
                    <circle
                        className={`${passed ? 'text-[#07bc0c]' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                        strokeWidth="12"
                        strokeDasharray={377}
                        strokeDashoffset={377 - (377 * score) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="60"
                        cx="50%"
                        cy="50%"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">{score}%</span>
                    <span className={`text-xs md:text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {passed ? 'Passed' : 'Failed'}
                    </span>
                 </div>
             </div>
             
             {/* Text Summary */}
             <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                    {passed ? "Excellent Work! 🎉" : "Needs Improvement 💪"}
                </h1>
                <p className="text-lg text-slate-600 mb-4">
                    You scored <strong className={passed ? "text-[#07bc0c] text-xl" : "text-amber-600 text-xl"}>{correctCount}</strong> out of <strong className="text-slate-900 text-xl">{questions.length}</strong>.
                </p>
                
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${passed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {passed 
                        ? <><CheckCircle className="w-4 h-4" /> You have unlocked all topics!</>
                        : <><AlertTriangle className="w-4 h-4" /> Score 70% to unlock other topics.</>
                    }
                </div>
             </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto self-stretch md:self-center shadow-inner">
             <button 
                onClick={() => setActiveTab('overview')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${activeTab === 'overview' ? 'bg-white text-[#07bc0c] shadow-lg ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
                <BrainCircuit className="w-5 h-5" />
                AI Analysis
             </button>
             <button 
                onClick={() => setActiveTab('review')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${activeTab === 'review' ? 'bg-white text-[#07bc0c] shadow-lg ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
                <Eye className="w-5 h-5" />
                Review Answers
             </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
        {activeTab === 'overview' ? (
          <div className="animate-fade-in-up space-y-8 pb-10">
             {isLoadingFeedback ? (
                 <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                     <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-t-4 border-[#07bc0c] border-r-4 border-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-t-4 border-slate-200 border-l-4 border-transparent rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                        <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-[#07bc0c] animate-pulse" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Performance</h3>
                     <p className="text-slate-500 text-lg">Generating personalized insights...</p>
                 </div>
             ) : (
                <>
                 {/* Summary Section */}
                 <div className="bg-white p-8 rounded-3xl shadow-md border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                                <Star className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Performance Summary</h3>
                        </div>
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                             <FormattedText text={feedback?.summary || ''} />
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Strengths Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-md border-t-4 border-[#07bc0c] hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-green-100 p-3 rounded-full">
                                <TrendingUp className="w-6 h-6 text-[#07bc0c]" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Your Strengths</h3>
                        </div>
                        <div className="space-y-4">
                            {feedback?.strengths.map((s, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-green-200 hover:bg-green-50/30 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-[#07bc0c] text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <FormattedText text={s} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weaknesses Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-md border-t-4 border-amber-500 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="bg-amber-100 p-3 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Needs Focus</h3>
                        </div>
                         <div className="space-y-4">
                            {feedback?.weaknesses.map((w, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                        <X className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <FormattedText text={w} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Focus Area - Featured */}
                 <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                     <div className="relative z-10 flex flex-col md:flex-row gap-6">
                         <div className="shrink-0 bg-white/10 p-4 rounded-2xl h-fit backdrop-blur-sm border border-white/10">
                             <Target className="w-8 h-8 text-[#07bc0c]" />
                         </div>
                         <div>
                             <h3 className="text-2xl font-bold mb-4 text-white">Recommended Study Focus</h3>
                             <div className="text-slate-200 text-lg leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10">
                                <FormattedText text={feedback?.focusArea || ''} />
                             </div>
                         </div>
                     </div>
                 </div>
                </>
             )}
          </div>
        ) : (
          <div className="space-y-8 pb-10 animate-fade-in">
            {questions.map((q, idx) => {
              const result = results.find(r => r.questionId === q.id);
              const isCorrect = result?.isCorrect;
              const selectedIdx = result?.selectedAnswerIndex ?? -1;
              const skipped = selectedIdx === -1;
              
              return (
                <div key={q.id} className={`bg-white rounded-3xl p-6 md:p-8 shadow-md border-l-8 ${isCorrect ? 'border-l-[#07bc0c]' : 'border-l-red-500'}`}>
                   {/* Question Header */}
                   <div className="flex items-start gap-5 mb-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg shadow-sm ${isCorrect ? 'bg-[#07bc0c] text-white' : 'bg-red-500 text-white'}`}>
                          {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-xl md:text-2xl text-slate-800 leading-snug">{q.text}</h4>
                        <div className="mt-2 flex items-center gap-2">
                            {isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider border border-green-200">
                                    <Check className="w-3 h-3" /> Correct
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider border border-red-200">
                                    <X className="w-3 h-3" /> {skipped ? 'Skipped' : 'Incorrect'}
                                </span>
                            )}
                        </div>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, i) => {
                            const isSelected = selectedIdx === i;
                            const isAnswer = q.correctAnswerIndex === i;
                            
                            let containerStyle = "bg-slate-50 border-slate-200 text-slate-500";
                            let icon = null;
                            
                            if (isAnswer) {
                                containerStyle = "bg-[#07bc0c]/10 border-[#07bc0c] ring-1 ring-[#07bc0c] text-slate-900 font-semibold shadow-sm";
                                icon = <div className="bg-[#07bc0c] text-white p-1 rounded-full"><Check className="w-4 h-4" /></div>;
                            }
                            else if (isSelected && !isCorrect) {
                                containerStyle = "bg-red-50 border-red-300 ring-1 ring-red-300 text-slate-900 font-semibold shadow-sm";
                                icon = <div className="bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></div>;
                            }

                            return (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${containerStyle}`}>
                                    <span className="text-base">{opt}</span>
                                    {icon}
                                </div>
                            )
                        })}
                      </div>
                      
                      {/* Explanation Box */}
                      <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100 flex gap-4">
                        <div className="shrink-0 bg-yellow-100 p-2 rounded-lg h-fit text-yellow-600">
                            <Lightbulb className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 block mb-2 text-sm uppercase tracking-wide">Explanation</span>
                            <p className="text-slate-700 text-lg leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="mt-4 flex flex-col md:flex-row gap-4 shrink-0 justify-center pt-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm -mx-4 md:-mx-8 px-4 md:px-8 pb-2">
        <button 
            onClick={onRetry}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-lg shadow-sm"
        >
            <RotateCcw className="w-5 h-5" />
            Retry This Topic
        </button>
        <button 
            onClick={onExit}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-white bg-slate-900 hover:bg-slate-800 hover:scale-105 transition-all shadow-xl shadow-slate-900/20 text-lg"
        >
            Back to Dashboard
            <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default QuizReview;