import React, { useState, useEffect } from 'react';
import { UploadedFile, AppMode, TopicStatus, QuizSettings, QuizQuestion, QuizResult } from './types';
import FileUpload from './components/FileUpload';
import QuizConfig from './components/Quiz/QuizConfig';
import QuizGame from './components/Quiz/QuizGame';
import QuizReview from './components/Quiz/QuizReview';
import ChatInterface from './components/Chat/ChatInterface';
import { analyzeTopics, generateQuiz } from './services/geminiService';
import { BookOpen, MessageCircle, HelpCircle, FileQuestion, Brain, Loader2, Key, ArrowLeft, Lightbulb } from 'lucide-react';

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingType, setLoadingType] = useState<'upload' | 'quiz'>('upload');
  const [loadingTip, setLoadingTip] = useState('');
  
  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  
  // Loading Animation State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  // Quiz State
  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true);
      }
      setIsCheckingKey(false);
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      try {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  // Simulate progress for quiz generation
  useEffect(() => {
    let interval: any;
    let tipInterval: any;

    if (isLoading && loadingType === 'quiz') {
      let p = 0;
      setLoadingProgress(0);
      setLoadingStage("Initializing AI...");
      
      const tips = [
        "Analyzing your document for key concepts...",
        "Tip: Check the AI Analyzer after the quiz to uncover your strengths & weaknesses.",
        "Quality Control: We take a bit longer to ensure questions match your PDF perfectly.",
        "Did you know? You can review all answers against the document after finishing."
      ];
      
      setLoadingTip(tips[0]);
      let tipIndex = 0;

      // Rotate tips every 3 seconds to ensure user has time to read
      tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % tips.length;
        setLoadingTip(tips[tipIndex]);
      }, 3000);

      interval = setInterval(() => {
        p += Math.random() * 3; // Slower progress to match the reading time
        if (p > 95) p = 95; 
        
        setLoadingProgress(p);

        if (p < 30) setLoadingStage("Analyzing document structure...");
        else if (p < 50) setLoadingStage("Extracting key concepts...");
        else if (p < 80) setLoadingStage("Drafting high-quality questions...");
        else setLoadingStage("Finalizing quiz...");
      }, 150); 
    }
    return () => {
        clearInterval(interval);
        clearInterval(tipInterval);
    };
  }, [isLoading, loadingType]);

  const handleFileUpload = async (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setLoadingType('upload');
    setLoadingText("AI is extracting topics...");
    setLoadingStage("Processing document...");
    
    try {
      const topicList = await analyzeTopics(uploadedFile);
      // All topics are initially unlocked so user can choose any
      setTopics(topicList.map((t) => ({ 
        name: t, 
        isLocked: false,
        bestScore: undefined 
      })));
      setMode(AppMode.DASHBOARD);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Failed to analyze document. Please ensure your API key is valid and try again.");
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuizGen = async (topic: string, settings: QuizSettings) => {
    setIsLoading(true);
    setLoadingType('quiz');
    setLoadingText(`Generating questions...`);
    
    try {
      if (!file) return;
      const questions = await generateQuiz(file, topic, settings.questionCount);
      setCurrentQuestions(questions);
      setCurrentQuizTopic(topic);
      setQuizSettings(settings);
      setMode(AppMode.QUIZ_PLAY);
    } catch (error) {
      console.error(error);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizFinish = (results: QuizResult[]) => {
    setQuizResults(results);
    setMode(AppMode.QUIZ_REVIEW);
  };

  const handleUnlockNext = (score: number) => {
      setTopics(prev => {
          const newTopics = [...prev];
          const currentIdx = newTopics.findIndex(t => t.name === currentQuizTopic);
          
          if (currentIdx !== -1) {
             const prevScore = newTopics[currentIdx].bestScore || 0;
             const newBestScore = Math.max(prevScore, score);
             newTopics[currentIdx].bestScore = newBestScore;

             // Logic: User can choose any topic initially.
             // But if they fail a topic (bestScore < 70), they are locked into it until they pass.
             const isPassed = newBestScore >= 70;

             if (isPassed) {
                 // If passed, unlock all topics
                 newTopics.forEach(t => t.isLocked = false);
             } else {
                 // If failed, lock all other topics so they focus on this one
                 newTopics.forEach((t, i) => {
                     t.isLocked = i !== currentIdx;
                 });
             }
          }
          return newTopics;
      });
  };

  if (isCheckingKey) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#07bc0c]" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center border border-slate-100">
          <div className="w-20 h-20 bg-[#07bc0c]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Brain className="w-10 h-10 text-[#07bc0c]" />
            <div className="absolute top-0 right-0 bg-white rounded-full p-1 shadow-md">
                <Key className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Welcome to DocuMind</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            To start analyzing your documents with advanced AI, please connect your Google Gemini API key.
          </p>
          
          <button 
            onClick={handleSelectKey}
            className="w-full bg-[#07bc0c] text-white font-bold py-4 rounded-xl hover:bg-[#06a00a] transition-all transform hover:scale-[1.02] shadow-lg shadow-[#07bc0c]/30 flex items-center justify-center gap-3"
          >
            <Key className="w-5 h-5" />
            Connect API Key
          </button>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
            <p className="mb-2">A paid GCP project key is recommended for higher limits.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#07bc0c] font-bold hover:underline inline-flex items-center gap-1"
            >
              View Billing Documentation
              <HelpCircle className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const Dashboard = () => (
    <div className="h-full w-full overflow-y-auto bg-slate-50 relative p-4 md:p-6">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[#07bc0c]/5 rounded-b-[100%] pointer-events-none -z-0"></div>

      {/* Top Bar for Navigation */}
      <div className="relative z-20 flex justify-between items-center mb-8">
          <button 
            onClick={() => { setFile(null); setMode(AppMode.UPLOAD); }}
            className="flex items-center gap-2 bg-white px-3 py-2 md:px-4 md:py-2 rounded-full shadow-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 text-xs md:text-sm font-bold"
            title="Delete PDF and go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="md:inline">Delete PDF</span>
          </button>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100%-80px)] pb-10">
        <div className="text-center relative z-10 max-w-2xl mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">Choose Your Path</h1>
            <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
                <FileQuestion className="w-4 h-4 text-[#07bc0c]" />
                <p className="text-slate-500 text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                    <span className="font-semibold text-slate-800">{file?.name}</span>
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl relative z-10 px-2 md:px-0">
            <button 
            onClick={() => setMode(AppMode.QUIZ_CONFIG)}
            className="group relative bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-100 hover:border-[#07bc0c] hover:shadow-xl hover:shadow-[#07bc0c]/10 transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-2"
            >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#07bc0c] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-[#07bc0c]/10 p-5 md:p-6 rounded-full text-[#07bc0c] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <BookOpen className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">Generate Quiz</h3>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed">Master your document topic by topic with AI-generated questions and detailed performance analysis.</p>
            </button>

            <button 
            onClick={() => setMode(AppMode.CHAT)}
            className="group relative bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-100 hover:border-[#07bc0c] hover:shadow-xl hover:shadow-[#07bc0c]/10 transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-2"
            >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#07bc0c] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-[#07bc0c]/10 p-5 md:p-6 rounded-full text-[#07bc0c] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <MessageCircle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">Ask AI Assistant</h3>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed">Chat interactively with your document to clear doubts, summarize sections, and extract insights.</p>
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-slate-50 relative overflow-hidden text-slate-900 font-sans">
        {isLoading && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-4">
                <div className="w-24 h-24 relative mb-8">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div 
                        className="absolute inset-0 border-4 border-[#07bc0c] rounded-full border-t-transparent animate-spin"
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-[#07bc0c]">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 animate-pulse text-center">{loadingText}</h3>
                <p className="text-slate-500 font-medium mb-8 text-center">{loadingStage}</p>
                
                {loadingType === 'quiz' && (
                    <div className="max-w-md w-full bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center animate-fade-in-up shadow-sm">
                        <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium transition-all duration-500">
                             <span className="text-[#07bc0c] font-bold block mb-2 flex items-center justify-center gap-2">
                                <Lightbulb className="w-4 h-4" /> Did You Know?
                             </span>
                             {loadingTip}
                        </p>
                    </div>
                )}
            </div>
        )}

        {mode === AppMode.UPLOAD && <FileUpload onFileUpload={handleFileUpload} />}
        
        {mode === AppMode.DASHBOARD && <Dashboard />}

        {mode === AppMode.QUIZ_CONFIG && (
            <QuizConfig 
                topics={topics} 
                onStart={handleStartQuizGen} 
                onBack={() => setMode(AppMode.DASHBOARD)} 
            />
        )}

        {mode === AppMode.QUIZ_PLAY && quizSettings && (
            <QuizGame 
                questions={currentQuestions} 
                settings={quizSettings} 
                onFinish={handleQuizFinish} 
            />
        )}

        {mode === AppMode.QUIZ_REVIEW && file && (
            <QuizReview 
                questions={currentQuestions} 
                results={quizResults} 
                topic={currentQuizTopic} 
                file={file}
                onRetry={() => setMode(AppMode.QUIZ_CONFIG)}
                onExit={() => setMode(AppMode.DASHBOARD)}
                onUnlockNext={handleUnlockNext}
            />
        )}

        {mode === AppMode.CHAT && file && (
            <ChatInterface 
                file={file} 
                onBack={() => setMode(AppMode.DASHBOARD)} 
            />
        )}
    </div>
  );
};

export default App;