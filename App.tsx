
import React, { useState, useEffect, useCallback } from 'react';
import { UploadedFile, AppMode, TopicStatus, QuizSettings, QuizQuestion, QuizResult, PodcastSettings, PodcastSegment, VoiceAccent } from './types';
import FileUpload from './components/FileUpload';
import QuizConfig from './components/Quiz/QuizConfig';
import QuizGame from './components/Quiz/QuizGame';
import QuizReview from './components/Quiz/QuizReview';
import ChatInterface from './components/Chat/ChatInterface';
import PodcastConfig from './components/Podcast/PodcastConfig';
import PodcastPlayer from './components/Podcast/PodcastPlayer';
import { analyzeTopics, generateQuiz, generatePodcastContent } from './services/geminiService';
import { Brain, Key, ChevronRight, Sun, Moon, BookOpen, MessageCircle, ArrowLeft, Mic2, AlertCircle, Quote } from 'lucide-react';

const LOGO_URL = "https://raw.githubusercontent.com/Anupam-2022/DocuMind/main/logo.png";

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingType, setLoadingType] = useState<'upload' | 'quiz' | 'podcast'>('upload');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [activeAccent, setActiveAccent] = useState<VoiceAccent>('US');

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
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
  const [podcastSegments, setPodcastSegments] = useState<PodcastSegment[]>([]);

  useEffect(() => {
    localStorage.setItem('studyhub-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const checkApiKey = useCallback(async () => {
    const win = window as any;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } else {
      setHasApiKey(true);
    }
    setIsCheckingKey(false);
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      try {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleError = (error: any) => {
    console.error("API Error Captured:", error);
    let msg = error?.message || String(error);
    
    try {
        const parsed = JSON.parse(msg);
        if (parsed.error && parsed.error.message) msg = parsed.error.message;
    } catch (e) {}

    if (msg.includes("Requested entity was not found") || msg.includes("API_KEY")) {
      setHasApiKey(false);
      alert("AI Access Link Expired. Please reconnect your API Key to continue.");
      handleSelectKey();
    } else {
      alert(`System Busy: ${msg}`);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (uploadedFile: UploadedFile) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setLoadingType('upload');
    setLoadingProgress(10);
    setLoadingStage("Analyzing Content...");

    try {
      const topicList = await analyzeTopics(uploadedFile);
      setTopics(topicList.map(t => ({ name: t, isLocked: false })));
      setLoadingProgress(100);
      setTimeout(() => {
        setMode(AppMode.DASHBOARD); 
        setIsLoading(false);
      }, 500);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStartQuizGen = async (topic: string, settings: QuizSettings) => {
    setIsLoading(true);
    setLoadingType('quiz');
    setLoadingText("Knowledge Synthesis");
    setLoadingProgress(20);
    setLoadingStage("Generating Questions...");
    
    try {
      if (!file) return;
      const questions = await generateQuiz(file, topic, settings.questionCount);
      setLoadingProgress(100);
      setTimeout(() => {
        setCurrentQuestions(questions);
        setCurrentQuizTopic(topic);
        setQuizSettings(settings);
        setMode(AppMode.QUIZ_PLAY);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStartPodcastGen = async (settings: PodcastSettings) => {
    if (!file) return;
    setActiveAccent(settings.accent);
    setIsLoading(true);
    setLoadingType('podcast');
    setLoadingText("Study Podcast Production");
    setLoadingProgress(20);
    setLoadingStage("Architecting Structured Script...");

    try {
      const { audio, segments } = await generatePodcastContent(file, settings);
      setLoadingProgress(100);
      setLoadingStage("Performing High-Fidelity Recording...");
      setTimeout(() => {
        setPodcastAudio(audio);
        setPodcastSegments(segments);
        setMode(AppMode.PODCAST_PLAY);
        setIsLoading(false);
      }, 800);
    } catch (e) {
      handleError(e);
    }
  };

  const getLoadingQuote = () => {
    const quotes = {
      NG: [
        { q: "Education is the most powerful weapon which you can use to change the world.", a: "Nelson Mandela" },
        { q: "The man who makes everything that leads to happiness depends upon himself, and not upon other men, has adopted the very best plan for living happily.", a: "Nnamdi Azikiwe" },
        { q: "You cannot build a house without a solid foundation.", a: "Ngozi Okonjo-Iweala" },
        { q: "Looking at a king's mouth, one would think he never sucked at his mother's breast.", a: "Chinua Achebe" }
      ],
      UK: [
        { q: "Success is not final, failure is not fatal: it is the courage to continue that counts.", a: "Winston Churchill" },
        { q: "The only limit to our realization of tomorrow will be our doubts of today.", a: "Franklin D. Roosevelt (UK Influence)" },
        { q: "Discipline is the bridge between goals and accomplishment.", a: "Jim Rohn" },
        { q: "Where there is a will, there is a way.", a: "Old English Proverb" }
      ],
      US: [
        { q: "The function of education is to teach one to think intensively and to think critically. Intelligence plus character - that is the goal of true education.", a: "Martin Luther King Jr." },
        { q: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", a: "Dr. Seuss" },
        { q: "Communication works for those who work at it.", a: "John Powell" },
        { q: "Education is not the filling of a pail, but the lighting of a fire.", a: "William Butler Yeats" }
      ]
    };
    const set = quotes[activeAccent] || quotes.US;
    return set[Math.floor(Math.random() * set.length)];
  };

  if (isCheckingKey) return null;

  if (!hasApiKey) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`max-w-md w-full glass p-10 rounded-[2.5rem] border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/70 border-white shadow-2xl'}`}>
          <div className="w-20 h-20 bg-[#07bc0c] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Key className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tight">AI Connection Required</h1>
          <p className="text-slate-500 mb-8 font-medium">To access StudyHub's advanced processing, please connect a paid project API key.</p>
          <button onClick={handleSelectKey} className="w-full bg-[#07bc0c] text-white font-bold py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#07bc0c]/30">Connect Project Key</button>
        </div>
      </div>
    );
  }

  const Dashboard = () => (
    <div className={`h-full w-full overflow-y-auto relative flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#fdfdfd]'}`}>
      <nav className={`relative z-30 flex justify-between items-center px-4 md:px-6 py-6 border-b glass sticky top-0 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-3">
             <img src={LOGO_URL} alt="Unispace" className="h-8 md:h-10 object-contain" />
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
            <span className="inline-block px-4 py-1.5 bg-[#07bc0c]/10 text-[#07bc0c] rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Connection Active</span>
            <h1 className={`text-3xl md:text-5xl font-extrabold mb-4 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Launch Study Mode</h1>
            <p className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Targeting document: <b>{file?.name}</b></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-7xl px-4 md:px-0">
            <button onClick={() => setMode(AppMode.QUIZ_CONFIG)} className={`group p-8 md:p-10 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c]' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'}`}>
              <div className="bg-[#07bc0c] p-4 rounded-2xl text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all"><BookOpen className="w-8 h-8" /></div>
              <h3 className={`text-xl md:text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Quiz Mode</h3>
              <p className={`leading-relaxed font-medium text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Test your knowledge with precision knowledge checks.</p>
              <div className="mt-8 flex items-center gap-2 text-[#07bc0c] font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">Launch <ChevronRight className="w-5 h-5" /></div>
            </button>

            <button onClick={() => setMode(AppMode.CHAT)} className={`group p-8 md:p-10 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c]' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'}`}>
              <div className="bg-indigo-600 p-4 rounded-2xl text-white mb-6 shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-all"><MessageCircle className="w-8 h-8" /></div>
              <h3 className={`text-xl md:text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Assistant</h3>
              <p className={`leading-relaxed font-medium text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Consult your document with our Unispace assistant.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-500 font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">Chat <ChevronRight className="w-5 h-5" /></div>
            </button>

            <button onClick={() => setMode(AppMode.PODCAST_CONFIG)} className={`group p-8 md:p-10 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col items-start text-left ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#07bc0c]' : 'bg-white border-slate-100 hover:border-[#07bc0c] shadow-slate-200/40'}`}>
              <div className="bg-amber-500 p-4 rounded-2xl text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all"><Mic2 className="w-8 h-8" /></div>
              <h3 className={`text-xl md:text-2xl font-extrabold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Podcast</h3>
              <p className={`leading-relaxed font-medium text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Listen to conversational summaries with real-time transcripts.</p>
              <div className="mt-8 flex items-center gap-2 text-amber-500 font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">Listen <ChevronRight className="w-5 h-5" /></div>
            </button>
        </div>
      </div>
      <footer className="py-6 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">
        A product of Unispace
      </footer>
    </div>
  );

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
                        <Brain className="w-12 h-12 text-[#07bc0c] animate-pulse mb-1" />
                        <span className="text-3xl font-black">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">{loadingText || 'StudyHub Processing'}</h3>
                <p className={`font-bold text-lg mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{loadingStage}</p>
                
                {loadingType === 'podcast' && (
                  <div className={`max-w-xl p-8 rounded-[2rem] border animate-slide-up ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="flex items-center gap-2 text-amber-500 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Studio Status</span>
                      </div>
                      <p className={`text-sm font-bold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Our AI hosts are preparing your study podcast. This process is working perfectly. 
                        Please note that loading time varies based on the number of minutes you selected.
                      </p>
                      
                      <div className={`h-px w-full my-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                      
                      <div className="flex flex-col items-center">
                        <Quote className="w-8 h-8 text-[#07bc0c] opacity-20 mb-4" />
                        {(() => {
                           const q = getLoadingQuote();
                           return (
                             <>
                               <p className={`text-lg font-extrabold italic leading-snug mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>"{q.q}"</p>
                               <p className="text-[10px] font-black uppercase tracking-widest text-[#07bc0c]">— {q.a}</p>
                             </>
                           );
                        })()}
                      </div>
                    </div>
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
        {mode === AppMode.PODCAST_CONFIG && <PodcastConfig topics={topics} onStart={handleStartPodcastGen} onBack={() => setMode(AppMode.DASHBOARD)} isDarkMode={isDarkMode} />}
        {mode === AppMode.PODCAST_PLAY && podcastAudio && <PodcastPlayer audioBase64={podcastAudio} segments={podcastSegments} isDarkMode={isDarkMode} onClose={() => setMode(AppMode.DASHBOARD)} />}
    </div>
  );
};

export default App;
