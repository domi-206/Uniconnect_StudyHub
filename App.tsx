
import React, { useState, useEffect } from 'react';
import { UploadedFile, AppMode, TopicStatus, QuizSettings, QuizQuestion, QuizResult } from './types';
import FileUpload from './components/FileUpload';
import QuizConfig from './components/Quiz/QuizConfig';
import QuizGame from './components/Quiz/QuizGame';
import QuizReview from './components/Quiz/QuizReview';
import ChatInterface from './components/Chat/ChatInterface';
import { analyzeTopics, generateQuiz } from './services/geminiService';
import { BookOpen, MessageCircle, FileQuestion, Brain, Loader2, Key, ArrowLeft, Lightbulb, CheckCircle2, LayoutDashboard, ChevronRight, Sun, Moon } from 'lucide-react';

const LOGO_URL = "https://raw.githubusercontent.com/Anupam-2022/DocuMind/main/logo.png";

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingType, setLoadingType] = useState<'upload' | 'quiz'>('upload');
  const [loadingTip, setLoadingTip] = useState('');
  
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('studyhub-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

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

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

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

      tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % tips.length;
        setLoadingTip(tips[tipIndex]);
      }, 4000);

      interval = setInterval(() => {
        p += Math.random() * 2;
        if (p > 98) p = 98; 
        setLoadingProgress(p);

        if (p < 25) setLoadingStage("Scanning document structure...");
        else if (p < 50) setLoadingStage("Identifying core subjects...");
        else if (p < 75) setLoadingStage("Generating adaptive questions...");
        else setLoadingStage("Polishing results...");
      }, 200); 
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
    setLoadingText("Extracting Intelligence");
    setLoadingStage("Deep scanning PDF...");
    
    try {
      const topicList = await analyzeTopics(uploadedFile);
      setTopics(topicList.map((t) => ({ 
        name: t, 
        isLocked: false,
        bestScore: undefined 
      })));
      setMode(AppMode.DASHBOARD);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Please check your API key.");
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuizGen = async (topic: string, settings: QuizSettings) => {
    setIsLoading(true);
    setLoadingType('quiz');
    setLoadingText(`Curating Quiz`);
    
    try {
      if (!file) return;
      const questions = await generateQuiz(file, topic, settings.questionCount);
      setCurrentQuestions(questions);
      setCurrentQuizTopic(topic);
      setQuizSettings(settings);
      setMode(AppMode.QUIZ_PLAY);
    } catch (error) {
      console.error(error);
      alert("Generation failed. Try again.");
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

             const isPassed = newBestScore >= 70;
             if (isPassed) {
                 newTopics.forEach(t => t.isLocked = false);
             } else {
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
      <div className={`h-screen w-full flex items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
        <div className="flex flex-col items-center">
            <div className={`w-16 h-16 border-4 rounded-full animate-spin ${isDarkMode ? 'border-slate-800 border-t-[#07bc0c]' : 'border-slate-100 border-t-[#07bc0c]'}`}></div>
            <p className="mt-4 text-slate-400 font-medium animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full glass p-10 rounded-[2.5rem] shadow-2xl text-center border relative ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/70 border-white'}`}>
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#07bc0c] rounded-3xl flex items-center justify-center shadow-xl shadow-[#07bc0c]/20 rotate-12">
             <Key className="w-12 h-12 text-white -rotate-12" />
          </div>
          
          <div className="mt-8 mb-6">
             <img src={LOGO_URL} alt="StudyHub" className="h-12 object-contain mx-auto" />
          </div>
          
          <h1 className={`text-3xl font-extrabold mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Welcome to StudyHub</h1>
          <p className={`mb-10 leading-relaxed text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Connect your Gemini API key to start transforming static documents into interactive knowledge.
          </p>
          
          <button 
            onClick={handleSelectKey}
            className="w-full bg-[#07bc0c] text-white font-bold py-5 rounded-2xl hover:bg-[#06a00a] transition-all transform hover:scale-[1.03] active:scale-95 shadow-lg shadow-[#07bc0c]/30 flex items-center justify-center gap-3 text-lg"
          >
            <Key className="w-6 h-6" />
            Connect API Key
          </button>
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#07bc0c] font-bold hover:underline inline-flex items-center gap-1 text-sm"
            >
              Get API Key <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const Dashboard = () => (
    <div className={`h-full w-full overflow-y-auto relative flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#fdfdfd]'}`}>
      {/* Background Decor */}
      <div className={`absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-bl from-[#07bc0c]/5 to-transparent rounded-bl-full pointer-events-none`}></div>
      <div className={`absolute bottom-0 left-0 w-[30%] h-[30%] bg-gradient-to-tr from-[#07bc0c]/5 to-transparent rounded-tr-full pointer-events-none`}></div>

      {/* Modern Top Nav */}
      <nav className={`relative z-30 flex justify-between items-center px-6 py-6 border-b glass sticky top-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-3">
             <img src={LOGO_URL} alt="StudyHub" className="h-8 md:h-10 object-contain" />
            <div>
                <h2 className={`font-extrabold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>StudyHub</h2>
                <p className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300' : 'bg-white border-slate-200 text-slate-400 hover:text-[#07bc0c]'}`}
            >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className={`hidden sm:flex items-center gap-3 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className={`font-bold text-xs truncate max-w-[150px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{file?.name}</span>
            </div>
            <button 
                onClick={() => { setFile(null); setMode(AppMode.UPLOAD); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold shadow-sm hover:shadow-md ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400' : 'bg-white border-slate-200 text-slate-500 hover:text-red-500'}`}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden xs:inline">New File</span>
            </button>
          </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="text-center max-w-2xl mb-12">
            <span className="inline-block px-4 py-1.5 bg-[#07bc0c]/10 text-[#07bc0c] rounded-full text-xs font-black uppercase tracking-[0.2em] mb-4">Select Experience</span>
            <h1 className={`text-4xl md:text-5xl font-extrabold mb-6 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your Intelligent Study Hub</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            {/* Quiz Card */}
            <button 
              onClick={() => setMode(AppMode.QUIZ_CONFIG)}
              className={`group relative p-10 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c] shadow-slate-950/50' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#07bc0c]/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:translate-x-4 group-hover:-translate-y-4 transition-transform duration-500"></div>
              
              <div className="bg-[#07bc0c] p-4 rounded-2xl text-white mb-8 shadow-lg shadow-[#07bc0c]/30 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <BookOpen className="w-8 h-8" />
              </div>
              
              <div className="flex-1">
                  <h3 className={`text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Knowledge Quizzes</h3>
                  <p className={`leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Test your retention with AI-generated adaptive quizzes tailored specifically to your document's unique topics.</p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-[#07bc0c] font-bold group-hover:gap-4 transition-all">
                  Launch Quiz Builder <ChevronRight className="w-5 h-5" />
              </div>
            </button>

            {/* Chat Card */}
            <button 
              onClick={() => setMode(AppMode.CHAT)}
              className={`group relative p-10 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c] shadow-slate-950/50' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:translate-x-4 group-hover:-translate-y-4 transition-transform duration-500"></div>
              
              <div className="bg-indigo-600 p-4 rounded-2xl text-white mb-8 shadow-lg shadow-indigo-900/40 group-hover:scale-110 group-hover:-rotate-6 transition-all">
                  <MessageCircle className="w-8 h-8" />
              </div>
              
              <div className="flex-1">
                  <h3 className={`text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Study Buddy</h3>
                  <p className={`leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Have an interactive conversation with your PDF. Summarize, clarify, and extract key insights in real-time.</p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-indigo-400 font-bold group-hover:gap-4 transition-all">
                  Open Assistant <ChevronRight className="w-5 h-5" />
              </div>
            </button>
        </div>

        {/* Stats / Info Footer */}
        <div className="mt-16 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className={`p-5 rounded-3xl border flex items-center gap-4 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[#07bc0c] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Topics</p>
                    <p className={`font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{topics.length} Detected</p>
                </div>
            </div>
            <div className={`p-5 rounded-3xl border flex items-center gap-4 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <Brain className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Intelligence</p>
                    <p className={`font-extrabold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>AI-Powered Hub</p>
                </div>
            </div>
            <div className={`p-5 rounded-3xl border flex items-center gap-4 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <FileQuestion className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Document</p>
                    <p className={`font-extrabold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{file?.name}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-full relative overflow-hidden font-sans select-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white dark' : 'bg-slate-50 text-slate-900'}`}>
        {/* Modern Loading Overlay */}
        {isLoading && (
            <div className={`absolute inset-0 z-[100] backdrop-blur-xl flex flex-col items-center justify-center animate-fade p-6 text-center ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                <div className="relative w-48 h-48 flex items-center justify-center mb-12">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="90" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="8" fill="transparent" />
                        <circle cx="50%" cy="50%" r="90" stroke="#07bc0c" strokeWidth="8" strokeDasharray="565" strokeDashoffset={565 - (565 * loadingProgress) / 100} strokeLinecap="round" fill="transparent" className="transition-all duration-300 ease-out" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                        <Brain className="w-12 h-12 text-[#07bc0c] animate-pulse mb-1" />
                        <span className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
                
                <h3 className={`text-3xl font-extrabold mb-2 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{loadingText}</h3>
                <p className={`font-bold mb-10 text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{loadingStage}</p>
                
                {loadingType === 'quiz' && (
                    <div className={`max-w-md w-full glass p-8 rounded-[2rem] border shadow-xl animate-slide-up ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
                        <div className="flex items-center gap-3 justify-center mb-3">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            <span className="text-amber-600 font-black text-xs uppercase tracking-widest">Scholar's Tip</span>
                        </div>
                        <p className={`text-lg font-medium leading-relaxed italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                             "{loadingTip}"
                        </p>
                    </div>
                )}
            </div>
        )}

        {mode === AppMode.UPLOAD && <FileUpload onFileUpload={handleFileUpload} isDarkMode={isDarkMode} />}
        
        {mode === AppMode.DASHBOARD && <Dashboard />}

        {mode === AppMode.QUIZ_CONFIG && (
            <QuizConfig 
                topics={topics} 
                onStart={handleStartQuizGen} 
                onBack={() => setMode(AppMode.DASHBOARD)} 
                isDarkMode={isDarkMode}
            />
        )}

        {mode === AppMode.QUIZ_PLAY && quizSettings && (
            <QuizGame 
                questions={currentQuestions} 
                settings={quizSettings} 
                onFinish={handleQuizFinish} 
                isDarkMode={isDarkMode}
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
                isDarkMode={isDarkMode}
            />
        )}

        {mode === AppMode.CHAT && file && (
            <ChatInterface 
                file={file} 
                onBack={() => setMode(AppMode.DASHBOARD)} 
                isDarkMode={isDarkMode}
            />
        )}
    </div>
  );
};

export default App;
