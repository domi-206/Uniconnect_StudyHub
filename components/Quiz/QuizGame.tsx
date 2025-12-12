import React, { useState, useEffect, useCallback } from 'react';
import { Timer, ArrowRight, ArrowLeft } from 'lucide-react';
import { QuizQuestion, QuizSettings, QuizResult } from '../../types';

interface QuizGameProps {
  questions: QuizQuestion[];
  settings: QuizSettings;
  onFinish: (results: QuizResult[]) => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ questions, settings, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [timeTakenPerQuestion, setTimeTakenPerQuestion] = useState<number[]>(new Array(questions.length).fill(0));
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);

  const currentQuestion = questions[currentIndex];

  const handleFinish = useCallback(() => {
     const finalResults: QuizResult[] = questions.map((q, idx) => ({
        questionId: q.id,
        selectedAnswerIndex: answers[idx] ?? -1,
        isCorrect: answers[idx] === q.correctAnswerIndex,
        timeTaken: timeTakenPerQuestion[idx]
     }));
     onFinish(finalResults);
  }, [answers, onFinish, questions, timeTakenPerQuestion]);

  const handleNext = useCallback(() => {
    // Check total time limit
    if (settings.totalTimeLimit > 0 && (totalTimeElapsed / 60) >= settings.totalTimeLimit) {
        handleFinish();
        return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset question timer only if visiting for the first time or logic dictates
      // For this app, we simply reset the timer for the new question to guide pacing
      setTimeLeft(settings.timePerQuestion);
    } else {
      // Last question - Submit
      handleFinish();
    }
  }, [currentIndex, questions.length, settings.totalTimeLimit, settings.timePerQuestion, totalTimeElapsed, handleFinish]);

  const handlePrevious = useCallback(() => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          // When going back, we don't necessarily reset the timer to full, 
          // but for simplicity in this UI, we give them the standard time for that slide.
          setTimeLeft(settings.timePerQuestion);
      }
  }, [currentIndex, settings.timePerQuestion]);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time for this question runs out
          // We can auto-advance or just stop. 
          // Let's auto-advance to keep momentum.
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
  const timerProgress = (timeLeft / settings.timePerQuestion) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Question</span>
            <span className="text-slate-800 font-bold text-xl">{currentIndex + 1} <span className="text-slate-400 text-lg font-medium">/ {questions.length}</span></span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <Timer className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500' : 'text-[#07bc0c]'}`} />
            <span className={`font-mono font-bold text-xl ${timeLeft < 10 ? 'text-red-500' : 'text-slate-700'}`}>{timeLeft}s</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden relative">
          <div 
            className="bg-[#07bc0c] h-full transition-all duration-500 ease-out shadow-[0_0_10px_#07bc0c]" 
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Timer Line */}
        <div 
            className={`h-1 mt-1 rounded-full transition-all duration-1000 linear ${timeLeft < 5 ? 'bg-red-500' : 'bg-transparent'}`}
            style={{ width: `${timerProgress}%` }}
        />
      </div>

      {/* Question Card - Scrollable Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2 custom-scrollbar">
        <div key={currentIndex} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100 min-h-full flex flex-col justify-center animate-fade-in-up">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 leading-snug">
            {currentQuestion.text}
            </h2>

            <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentIndex] === idx;
                
                // Neutral styling until submission
                let cardClass = "border-slate-200 hover:border-indigo-400 hover:bg-slate-50";
                if (isSelected) {
                    cardClass = "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600";
                }

                return (
                <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${cardClass}`}
                >
                    <div className="flex items-center gap-5">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                            isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                        }`}>
                            {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`font-semibold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{option}</span>
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                </button>
                );
            })}
            </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 flex justify-between items-center h-20 md:h-24 pt-4">
        <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-lg transition-all ${
                currentIndex === 0 
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' 
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-300 bg-white'
            }`}
        >
            <ArrowLeft className="w-6 h-6" />
            Previous
        </button>

        <button
            onClick={handleNext}
            className={`flex items-center gap-3 px-8 md:px-10 py-3 md:py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 hover:shadow-xl shadow-lg ${
                currentIndex === questions.length - 1
                ? 'bg-[#07bc0c] text-white hover:bg-[#06a00a]' // Green for Submit
                : 'bg-slate-900 text-white hover:bg-slate-800' // Dark for Next
            }`}
        >
            {currentIndex === questions.length - 1 ? "Submit Quiz" : "Next Question"}
            <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default QuizGame;