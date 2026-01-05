
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { QuizQuestion, QuizSettings, QuizResult } from '../../types';

interface QuizGameProps {
  questions: QuizQuestion[];
  settings: QuizSettings;
  onFinish: (results: QuizResult[]) => void;
  isDarkMode?: boolean;
  topic: string;
}

const QuizGame: React.FC<QuizGameProps> = ({ questions, settings, onFinish, isDarkMode, topic }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem(`quiz-index-${topic}`);
    return saved ? parseInt(saved) : 0;
  });
  
  const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion);
  
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    const saved = localStorage.getItem(`quiz-answers-${topic}`);
    return saved ? JSON.parse(saved) : new Array(questions.length).fill(null);
  });
  
  const [timeTakenPerQuestion, setTimeTakenPerQuestion] = useState<number[]>(() => {
    const saved = localStorage.getItem(`quiz-timetaken-${topic}`);
    return saved ? JSON.parse(saved) : new Array(questions.length).fill(0);
  });
  
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(() => {
    const saved = localStorage.getItem(`quiz-totaltime-${topic}`);
    return saved ? parseInt(saved) : 0;
  });

  const currentQuestion = questions[currentIndex];

  // Save progress
  useEffect(() => {
    localStorage.setItem(`quiz-index-${topic}`, currentIndex.toString());
    localStorage.setItem(`quiz-answers-${topic}`, JSON.stringify(answers));
    localStorage.setItem(`quiz-timetaken-${topic}`, JSON.stringify(timeTakenPerQuestion));
    localStorage.setItem(`quiz-totaltime-${topic}`, totalTimeElapsed.toString());
  }, [currentIndex, answers, timeTakenPerQuestion, totalTimeElapsed, topic]);

  // Scroll to top on question change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Alternatively, scroll the window if nested scroll is tricky
    if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentIndex]);

  const clearQuizStorage = useCallback(() => {
    localStorage.removeItem(`quiz-index-${topic}`);
    localStorage.removeItem(`quiz-answers-${topic}`);
    localStorage.removeItem(`quiz-timetaken-${topic}`);
    localStorage.removeItem(`quiz-totaltime-${topic}`);
  }, [topic]);

  const handleFinish = useCallback(() => {
     const finalResults: QuizResult[] = questions.map((q, idx) => ({
        questionId: q.id,
        selectedAnswerIndex: answers[idx] ?? -1,
        isCorrect: answers[idx] === q.correctAnswerIndex,
        timeTaken: timeTakenPerQuestion[idx]
     }));
     clearQuizStorage();
     onFinish(finalResults);
  }, [answers, onFinish, questions, timeTakenPerQuestion, clearQuizStorage]);

  const handleNext = useCallback(() => {
    if (settings.totalTimeLimit > 0 && (totalTimeElapsed / 60) >= settings.totalTimeLimit) {
        handleFinish();
        return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(settings.timePerQuestion);
    } else {
      handleFinish();
    }
  }, [currentIndex, questions.length, settings.totalTimeLimit, settings.timePerQuestion, totalTimeElapsed, handleFinish]);

  const handlePrevious = useCallback(() => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setTimeLeft(settings.timePerQuestion);
      }
  }, [currentIndex, settings.timePerQuestion]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev - 1;
      });

      setTotalTimeElapsed(prev => prev + 1);
      
      setTimeTakenPerQuestion(prev => {
          const newTimes = [...prev];
          newTimes[currentIndex] = (newTimes[currentIndex] || 0) + 1;
          return newTimes;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleNext, currentIndex]);

  const handleSelectOption = (index: number) => {
    setAnswers(prev => {
        const newAnswers = [...prev];
        newAnswers[currentIndex] = index;
        return newAnswers;
    });
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timerPct = (timeLeft / settings.timePerQuestion) * 100;

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden select-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#f8fafc]'}`}>
      {/* Immersive Header */}
      <div className="shrink-0 p-6 md:px-10 md:pt-10 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                <span className="text-xs font-black uppercase opacity-60 leading-none mb-1">Q</span>
                <span className="text-xl font-black leading-none">{currentIndex + 1}</span>
             </div>
             <div>
                <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Progress</p>
                <p className={`font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{Math.round(progress)}% Complete</p>
             </div>
          </div>

          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Timer className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-[#07bc0c]'}`} />
            <div className="flex flex-col items-end">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Time Left</p>
                <span className={`font-mono font-black text-2xl leading-none ${timeLeft < 10 ? 'text-red-500' : (isDarkMode ? 'text-slate-200' : 'text-slate-700')}`}>{timeLeft}s</span>
            </div>
          </div>
        </div>
        
        {/* Modern Bar */}
        <div className={`relative h-2 w-full rounded-full overflow-hidden shadow-inner ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div 
                className="absolute top-0 left-0 h-full bg-[#07bc0c] transition-all duration-700 ease-out shadow-[0_0_15px_#07bc0c]/30" 
                style={{ width: `${progress}%` }}
            />
            <div 
                className={`absolute top-0 right-0 h-full transition-all duration-1000 linear opacity-30 ${timeLeft < 5 ? 'bg-red-500' : 'bg-transparent'}`}
                style={{ width: `${100 - timerPct}%` }}
            />
        </div>
      </div>

      {/* Play Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-24 md:px-10 custom-scrollbar">
        <div ref={cardRef} key={currentIndex} className={`max-w-4xl mx-auto glass rounded-[3rem] shadow-2xl p-8 md:p-14 border animate-slide-up quiz-card ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-slate-950/50' : 'bg-white/70 border-white shadow-slate-200/50'}`}>
            <h2 className={`text-2xl md:text-4xl font-extrabold mb-10 leading-snug tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentQuestion.text}
            </h2>

            <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentIndex] === idx;
                
                return (
                <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between group transform hover:scale-[1.01] ${
                        isSelected 
                        ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-lg ring-4 ring-[#07bc0c]/10' 
                        : isDarkMode 
                            ? 'border-slate-800 bg-slate-900/40 hover:border-[#07bc0c]/40 hover:bg-slate-800'
                            : 'border-slate-100 bg-white hover:border-[#07bc0c]/40 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center gap-6">
                        <span className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-lg font-black border-2 shrink-0 transition-colors ${
                            isSelected ? 'bg-[#07bc0c] text-white border-[#07bc0c]' : (isDarkMode ? 'bg-slate-950 text-slate-600 border-slate-800 group-hover:border-[#07bc0c]/30' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:border-[#07bc0c]/30')
                        }`}>
                            {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`font-bold text-lg md:text-xl ${isSelected ? 'text-[#07bc0c]' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>{option}</span>
                    </div>
                    {isSelected && (
                        <div className="bg-[#07bc0c] p-1.5 rounded-full shadow-md animate-fade">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                    )}
                </button>
                );
            })}
            </div>
        </div>
      </div>

      {/* Floating Footer Controls */}
      <div className="shrink-0 flex justify-center pb-8 px-6 relative z-10 -mt-10">
        <div className={`glass px-6 py-4 rounded-[2.5rem] flex items-center gap-4 shadow-2xl border ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-white'}`}>
            <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    currentIndex === 0 
                    ? 'opacity-20 cursor-not-allowed bg-slate-200 text-slate-400' 
                    : isDarkMode 
                        ? 'bg-slate-800 text-slate-400 hover:text-[#07bc0c] hover:bg-slate-700 border border-slate-700'
                        : 'bg-white text-slate-600 hover:text-[#07bc0c] hover:bg-[#07bc0c]/5 hover:scale-110 active:scale-90 border border-slate-100'
                }`}
            >
                <ArrowLeft className="w-6 h-6" />
            </button>

            <div className={`h-8 w-px mx-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>

            <button
                onClick={handleNext}
                className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
                    currentIndex === questions.length - 1
                    ? 'bg-[#07bc0c] text-white hover:bg-[#06a00a] shadow-[#07bc0c]/40' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/30'
                }`}
            >
                {currentIndex === questions.length - 1 ? "Submit Exam" : "Next Question"}
                <ArrowRight className="w-6 h-6" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default QuizGame;
