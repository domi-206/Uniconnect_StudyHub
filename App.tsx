
import React, { useState, useEffect } from 'react';
import { UploadedFile, AppMode, TopicStatus, QuizSettings, QuizQuestion, QuizResult } from './types';
import FileUpload from './components/FileUpload';
import QuizConfig from './components/Quiz/QuizConfig';
import QuizGame from './components/Quiz/QuizGame';
import QuizReview from './components/Quiz/QuizReview';
import ChatInterface from './components/Chat/ChatInterface';
import { analyzeTopics, generateQuiz } from './services/geminiService';
import { Brain, Key, Lightbulb, ChevronRight, Sun, Moon, BookOpen, MessageCircle, ArrowLeft, CheckCircle2, FileText, Zap } from 'lucide-react';

const LOGO_URL = "https://raw.githubusercontent.com/Anupam-2022/DocuMind/main/logo.png";

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingType, setLoadingType] = useState<'upload' | 'quiz'>('upload');
  const [loadingTip, setLoadingTip] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('studyhub-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);

  useEffect(() => {
    localStorage.setItem('studyhub-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const checkApiKey = async () => {
      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else { setHasApiKey(true); }
      setIsCheckingKey(false);
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      try { await win.aistudio.openSelectKey(); setHasApiKey(true); } catch (e) { console.error(e); }
    }
  };

  const handleFileUpload = async (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setLoadingType('upload');
    setLoadingProgress(10);
    setLoadingStage("Establishing Secure Connection...");

    const stages = [
      "Establishing Secure Connection...",
      "Deep Scanning PDF OCR Layers...",
      "Mapping Document Context...",
      "Calibrating AI Knowledge Hub...",
      "Finalizing Interactive Elements..."
    ];
    
    let currentStageIndex = 0;
    const stageInterval = setInterval(() => {
      if (currentStageIndex < stages.length - 1) {
        currentStageIndex++;
        setLoadingStage(stages[currentStageIndex]);
        setLoadingProgress(prev => Math.min(prev + 15, 90));
      }
    }, 1500);

    try {
      const topicList = await analyzeTopics(uploadedFile);
      setTopics(topicList.map(t => ({ name: t, isLocked: false })));
      
      clearInterval(stageInterval);
      setLoadingStage("Neural Sync Complete");
      setLoadingProgress(100);
      
      setTimeout(() => {
        setMode(AppMode.DASHBOARD); 
        setIsLoading(false);
      }, 800);

    } catch (error) {
      clearInterval(stageInterval);
      alert("AI Processing Error: This document is too complex or the connection timed out. Please try a smaller PDF.");
      setFile(null);
      setIsLoading(false);
    }
  };

  const handleStartQuizGen = async (topic: string, settings: QuizSettings) => {
    setIsLoading(true);
    setLoadingType('quiz');
    setLoadingText("Synthesizing Knowledge Check");
    setLoadingProgress(20);
    setLoadingStage("Parsing Topic Vectors...");
    
    const tips = [
      "AI is verifying each question against the source text.",
      "Pro-active error correction is being baked into the session.",
      "Review page citations after the quiz to verify facts."
    ];
    setLoadingTip(tips[0]);
    let tIdx = 0;
    const tipInt = setInterval(() => { tIdx = (tIdx + 1) % tips.length; setLoadingTip(tips[tIdx]); }, 3000);

    try {
      if (!file) return;
      const questions = await generateQuiz(file, topic, settings.questionCount);
      
      setLoadingProgress(100);
      setLoadingStage("Ready to Start.");
      
      setTimeout(() => {
        setCurrentQuestions(questions);
        setCurrentQuizTopic(topic);
        setQuizSettings(settings);
        setMode(AppMode.QUIZ_PLAY);
        setIsLoading(false);
      }, 800);

    } catch (error) {
      alert("Failed to generate quiz. Try a different topic.");
      setMode(AppMode.DASHBOARD);
      setIsLoading(false);
    } finally {
      clearInterval(tipInt);
    }
  };

  const Dashboard = () => (
    <div className={`h-full w-full overflow-y-auto relative flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#fdfdfd]'}`}>
      <nav className={`relative z-30 flex justify-between items-center px-4 md:px-6 py-6 border-b glass sticky top-0 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-3">
             <img src={LOGO_URL} alt="StudyHub" className="h-8 md:h-10 object-contain" />
             <h2 className={`font-extrabold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>StudyHub</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-400'}`}>
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => { setFile(null); setMode(AppMode.UPLOAD); }} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all text-xs md:text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400' : 'bg-white border-slate-200 text-slate-500 hover:text-red-500'}`}>
                <ArrowLeft className="w-4 h-4" /> New File
            </button>
          </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        <div className="text-center max-w-2xl mb-8 md:mb-12 px-4">
            <span className="inline-block px-4 py-1.5 bg-[#07bc0c]/10 text-[#07bc0c] rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Instance Ready</span>
            <h1 className={`text-3xl md:text-5xl font-extrabold mb-4 md:mb-6 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Choose your session</h1>
            <p className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select how you want to interact with <b>{file?.name}</b></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl px-4 md:px-0">
            <button 
              onClick={() => setMode(AppMode.QUIZ_CONFIG)}
              className={`group relative p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c] shadow-slate-950/50' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'
              }`}
            >
              <div className="bg-[#07bc0c] p-4 rounded-2xl text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <BookOpen className="w-8 h-8" />
              </div>
              <h3 className={`text-xl md:text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Quiz Session</h3>
              <p className={`leading-relaxed font-medium text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Test your retention with adaptive quizzes tailored specifically to your document.</p>
              <div className="mt-8 flex items-center gap-2 text-[#07bc0c] font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
                  Launch Quiz <ChevronRight className="w-5 h-5" />
              </div>
            </button>

            <button 
              onClick={() => setMode(AppMode.CHAT)}
              className={`group relative p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c] shadow-slate-950/50' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'
              }`}
            >
              <div className="bg-indigo-600 p-4 rounded-2xl text-white mb-6 shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-all">
                  <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className={`text-xl md:text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Chat System</h3>
              <p className={`leading-relaxed font-medium text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Have an interactive conversation with your PDF. Summarize and extract insights in real-time.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-500 font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
                  Open Assistant <ChevronRight className="w-5 h-5" />
              </div>
            </button>
        </div>
      </div>
    </div>
  );

  if (isCheckingKey) return null;

  if (!hasApiKey) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full glass p-10 rounded-[2.5rem] border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/70 border-white'}`}>
          <div className="w-20 h-20 bg-[#07bc0c] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
             <Key className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-4">StudyHub Access</h1>
          <button onClick={handleSelectKey} className="w-full bg-[#07bc0c] text-white font-bold py-5 rounded-2xl hover:bg-[#06a00a] transition-all shadow-lg">Connect API Key</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full relative overflow-hidden font-sans select-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white dark' : 'bg-slate-50 text-slate-900'}`}>
        {isLoading && (
            <div className={`absolute inset-0 z-[100] backdrop-blur-3xl flex flex-col items-center justify-center animate-fade p-6 text-center ${isDarkMode ? 'bg-slate-950/90' : 'bg-white/95'}`}>
                <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="90" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="12" fill="transparent" />
                        <circle cx="50%" cy="50%" r="90" stroke="#07bc0c" strokeWidth="12" strokeDasharray="565" strokeDashoffset={565 - (565 * loadingProgress) / 100} strokeLinecap="round" fill="transparent" className="transition-all duration-500 ease-out" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                        <Brain className="w-10 h-10 md:w-12 md:h-12 text-[#07bc0c] animate-pulse mb-1" />
                        <span className="text-2xl md:text-3xl font-black">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">{loadingType === 'upload' ? 'AI Neural Mapping' : loadingText}</h3>
                <p className={`font-bold text-base md:text-lg mb-12 min-h-[1.5rem] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{loadingStage}</p>
                {loadingTip && (
                  <div className={`max-w-lg w-full p-6 md:p-8 rounded-[2rem] border animate-slide-up ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                    <div className="flex items-center gap-2 justify-center mb-4 text-amber-500 font-black text-[10px] uppercase tracking-widest">
                      <Lightbulb className="w-5 h-5" /> Insight
                    </div>
                    <p className={`italic text-base md:text-lg font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{loadingTip}"</p>
                  </div>
                )}
            </div>
        )}

        {mode === AppMode.UPLOAD && <FileUpload onFileUpload={handleFileUpload} isDarkMode={isDarkMode} progress={loadingType === 'upload' ? loadingProgress : 0} stage={loadingType === 'upload' ? loadingStage : ''} />}
        {mode === AppMode.DASHBOARD && <Dashboard />}
        {mode === AppMode.CHAT && file && <ChatInterface file={file} isDarkMode={isDarkMode} onOpenQuiz={() => setMode(AppMode.QUIZ_CONFIG)} onReset={() => setMode(AppMode.DASHBOARD)} onToggleTheme={() => setIsDarkMode(!isDarkMode)} />}
        {mode === AppMode.QUIZ_CONFIG && <QuizConfig topics={topics} onStart={handleStartQuizGen} onBack={() => setMode(AppMode.DASHBOARD)} isDarkMode={isDarkMode} />}
        {mode === AppMode.QUIZ_PLAY && quizSettings && <QuizGame questions={currentQuestions} settings={quizSettings} onFinish={(r) => { setQuizResults(r); setMode(AppMode.QUIZ_REVIEW); }} isDarkMode={isDarkMode} />}
        {mode === AppMode.QUIZ_REVIEW && file && <QuizReview questions={currentQuestions} results={quizResults} topic={currentQuizTopic} file={file} onRetry={() => setMode(AppMode.QUIZ_CONFIG)} onExit={() => setMode(AppMode.DASHBOARD)} onUnlockNext={() => {}} isDarkMode={isDarkMode} />}
    </div>
  );
};

export default App;
