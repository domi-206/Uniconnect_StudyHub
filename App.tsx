import React, { useState, useEffect } from 'react';
import { UploadedFile, AppMode, TopicStatus, QuizSettings, QuizQuestion, QuizResult } from './types';
import FileUpload from './components/FileUpload';
import QuizConfig from './components/Quiz/QuizConfig';
import QuizGame from './components/Quiz/QuizGame';
import QuizReview from './components/Quiz/QuizReview';
import ChatInterface from './components/Chat/ChatInterface';
import { analyzeTopics, generateQuiz } from './services/geminiService';
import { BookOpen, MessageCircle, HelpCircle, FileQuestion, Brain, Loader2, Key, Trash2, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingType, setLoadingType] = useState<'upload' | 'quiz'>('upload');
  
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

  // Simulate progress for quiz generation - OPTIMIZED: Faster update interval
  useEffect(() => {
    let interval: any;
    if (isLoading && loadingType === 'quiz') {
      let p = 0;
      setLoadingProgress(0);
      setLoadingStage("Initializing AI...");
      
      interval = setInterval(() => {
        p += Math.random() * 15; // Much Faster increment
        if (p > 95) p = 95; // Cap at 95% until done
        
        setLoadingProgress(p);

        if (p < 25) setLoadingStage("Analyzing document structure...");
        else if (p < 50) setLoadingStage("Extracting key concepts...");
        else if (p < 75) setLoadingStage("Drafting questions...");
        else setLoadingStage("Finalizing...");
      }, 50); 
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingType]);

  const handleFileUpload = async (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setLoadingType('upload');
    setLoadingText("AI is extracting topics...");
    
    try {
      const topicList = await analyzeTopics(uploadedFile);
      setTopics(topicList.map((t, i) => ({ 
        name: t, 
        isLocked: i !== 0,
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
             newTopics[currentIdx].bestScore = Math.max(prevScore, score);

             if (score >= 70 && currentIdx < newTopics.length - 1) {
                 newTopics[currentIdx + 1].isLocked = false;
             }
          }
          return newTopics;
      });
  };

  if (isCheckingKey) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#07bc0c]" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
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
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 animate-fade-in bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#07bc0c]/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Bar for Navigation */}
      <div className="absolute top-6 left-6 z-20">
          <button 
            onClick={() => { setFile(null); setMode(AppMode.UPLOAD); }}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 text-sm font-bold"
            title="Delete PDF and go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <Trash2 className="w-4 h-4" />
            <span className="hidden md:inline">Delete PDF & Go Back</span>
          </button>
      </div>

      <div className="text-center relative z-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-3">Choose Your Path</h1>
        <p className="text-slate-500 text-lg bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full inline-block border border-slate-200">
            Document: <span className="font-semibold text-[#07bc0c]">{file?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
        <button 
          onClick={() => setMode(AppMode.QUIZ_CONFIG)}
          className="group relative bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:border-[#07bc0c] hover:shadow-xl hover:shadow-[#07bc0c]/10 transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-2"
        >
           <div className="absolute top-0 left-0 w-full h-2 bg-[#07bc0c] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <div className="bg-[#07bc0c]/10 p-6 rounded-full text-[#07bc0c] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <BookOpen className="w-10 h-10" />
           </div>
           <h3 className="text-2xl font-bold text-slate-800 mb-3">Generate Quiz</h3>
           <p className="text-slate-500">Master your document topic by topic with AI-generated questions and detailed performance analysis.</p>
        </button>

        <button 
          onClick={() => setMode(AppMode.CHAT)}
          className="group relative bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:border-[#07bc0c] hover:shadow-xl hover:shadow-[#07bc0c]/10 transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-2"
        >
           <div className="absolute top-0 left-0 w-full h-2 bg-[#07bc0c] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <div className="bg-[#07bc0c]/10 p-6 rounded-full text-[#07bc0c] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <MessageCircle className="w-10 h-10" />
           </div>
           <h3 className="text-2xl font-bold text-slate-800 mb-3">Ask AI Assistant</h3>
           <p className="text-slate-500">Chat interactively with your document to clear doubts, summarize sections, and extract insights.</p>
        </button>
      </div>
    </div>
  );

  if (isLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
              {loadingType === 'upload' ? (
                <div className="flex flex-col items-center relative z-10">
                    <div className="w-24 h-24 border-4 border-[#07bc0c]/20 border-t-[#07bc0c] rounded-full animate-spin mb-8 shadow-2xl shadow-[#07bc0c]/20"></div>
                     <h2 className="text-2xl font-bold text-slate-800 animate-pulse relative z-10">{loadingText}</h2>
                     <p className="text-slate-400 mt-2 relative z-10">Scanning content...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center relative z-10 w-full max-w-md px-6">
                    <div className="relative mb-12">
                        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                            <div className="absolute -top-4 left-1/2 w-4 h-4 bg-[#07bc0c] rounded-full blur-sm"></div>
                        </div>
                         <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
                            <div className="absolute -bottom-6 left-1/2 w-3 h-3 bg-[#07bc0c]/50 rounded-full blur-sm"></div>
                        </div>
                        <div className="absolute -top-12 -left-16 text-[#07bc0c] animate-float opacity-40"><Brain className="w-8 h-8" /></div>
                        <div className="absolute top-8 -right-20 text-[#07bc0c] animate-float opacity-40" style={{animationDelay: '1.5s'}}><FileQuestion className="w-8 h-8" /></div>
                        <div className="bg-white p-8 rounded-full shadow-2xl relative z-10 animate-brain-pulse flex items-center justify-center border-4 border-[#07bc0c]/10">
                            <BookOpen className="w-16 h-16 text-[#07bc0c]" />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{loadingStage}</h2>
                    <p className="text-slate-400 mb-8 text-sm font-medium uppercase tracking-wide">
                        {loadingText}
                    </p>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative">
                         <div 
                            className="h-full bg-[#07bc0c] rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                            style={{ width: `${loadingProgress}%` }}
                         >
                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                         </div>
                    </div>
                </div>
              )}
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-slate-50">
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
            onRetry={() => {
                setMode(AppMode.QUIZ_PLAY);
            }}
            onExit={() => setMode(AppMode.DASHBOARD)}
            onUnlockNext={handleUnlockNext}
        />
      )}
      {mode === AppMode.CHAT && file && (
        <ChatInterface file={file} onBack={() => setMode(AppMode.DASHBOARD)} />
      )}
    </div>
  );
};

export default App;