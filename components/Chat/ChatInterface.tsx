
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, AlertCircle, FileSearch, 
  Sun, Moon, BookOpen, RefreshCw, CheckCircle, BrainCircuit,
  Trash2, Copy, Edit3, RotateCcw, Check, X,
  Rocket, Volume2, History, Languages, Plus, Loader2, Sparkles
} from 'lucide-react';
import { ChatMessage, UploadedFile, ChatSessionData, VoiceAccent, ContentTone } from '../../types';
import { createChatSession, speakText, initializeChatWithContext } from '../../services/geminiService';
import { Chat } from '@google/genai';
import PDFModal from '../PDFModal';

interface ChatInterfaceProps {
  file: UploadedFile;
  isDarkMode: boolean;
  onOpenQuiz: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
}

const FormattedText: React.FC<{ 
    text: string, 
    isDarkMode: boolean, 
    isUser: boolean,
    onCitationClick: (page: number) => void
}> = ({ text, isDarkMode, isUser, onCitationClick }) => {
  const sanitizedText = text.replace(/[#*]/g, '');
  const lines = sanitizedText.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
     const parts = line.split(/(\[p\.\s*\d+\])/g);
     const formattedLine = parts.map((part, idx) => {
        const match = /\[p\.\s*(\d+)\]/.exec(part);
        if (match) {
            const pageNum = parseInt(match[1]);
            return (
                <button 
                    key={idx}
                    onClick={() => onCitationClick(pageNum)}
                    className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        isUser ? 'bg-white/20 text-white' : (isDarkMode ? 'bg-[#07bc0c]/20 text-[#07bc0c] hover:bg-[#07bc0c]/30' : 'bg-[#07bc0c]/10 text-[#07bc0c] hover:bg-[#07bc0c]/20')
                    }`}
                >
                    <FileSearch className="w-3 h-3" /> P.{pageNum}
                </button>
            );
        }
        return part;
     });

     const trimmed = line.trim();
     if (trimmed.startsWith('- ')) {
         elements.push(
            <div key={i} className="flex items-start gap-3 ml-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#07bc0c] mt-2.5 shrink-0"></span>
                <span className="text-base md:text-lg">{formattedLine}</span>
            </div>
         );
     } else {
         if (trimmed === '') elements.push(<div key={i} className="h-2"></div>);
         else elements.push(<p key={i} className="mb-2 leading-relaxed text-base md:text-lg">{formattedLine}</p>);
     }
  });

  return <div>{elements}</div>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ file, isDarkMode, onOpenQuiz, onReset, onToggleTheme }) => {
  const [history, setHistory] = useState<ChatSessionData[]>(() => {
    const saved = localStorage.getItem(`chats-${file.name}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Assistance is booting");
  const [readyAnnounced, setReadyAnnounced] = useState(false);
  
  const [accent, setAccent] = useState<VoiceAccent>('US');
  const [tone, setTone] = useState<ContentTone>('TEACHER');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState<number | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(`chats-${file.name}`, JSON.stringify(history));
  }, [history, file.name]);

  // Loading Status Logic
  useEffect(() => {
    if (!isConnecting) return;
    const sequence = [
        "Assistance is booting",
        "Assistance is getting ready",
        "Configuring study parameters",
        "Finalizing connection"
    ];
    let step = 0;
    const interval = setInterval(() => {
        if (step < sequence.length - 1) {
            step++;
            setConnectionStatus(sequence[step]);
        }
    }, 2000);
    return () => clearInterval(interval);
  }, [isConnecting]);

  const initChat = async (newAccent?: VoiceAccent, newTone?: ContentTone) => {
    setIsConnecting(true);
    setConnectionError(false);
    setReadyAnnounced(false);
    try {
        const activeAccent = newAccent || accent;
        const activeTone = newTone || tone;
        const session = await createChatSession(file, activeAccent, activeTone);
        await initializeChatWithContext(session, file);
        setChatSession(session);
        
        const initialMsg: ChatMessage = { 
          id: 'initial', 
          role: 'model', 
          text: `Welcome! I am your Unispace Study Assistant. I have analyzed ${file.name} and I am ready to help. 

Do you need anything explained? You can ask me questions about the document, or ask me to summarize specific sections. How can I assist you today?`, 
          timestamp: Date.now() 
        };

        const newId = Date.now().toString();
        const newSession: ChatSessionData = {
          id: newId,
          title: `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          messages: [initialMsg],
          lastModified: Date.now(),
          settings: { accent: activeAccent, tone: activeTone }
        };

        setHistory(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setMessages([initialMsg]);
        setIsConnecting(false);
        setReadyAnnounced(true);
    } catch (e) { 
        console.error("Chat Init Error:", e);
        setConnectionError(true); 
        setIsConnecting(false); 
        // Notification for Jesus/Support
        alert("System Sync Failure: Jesus has been notified. Our support team is investigating the connection issue.");
    }
  };

  useEffect(() => { 
    if (!currentSessionId) {
      if (history.length > 0) loadSession(history[0].id);
      else initChat();
    }
  }, [file]);

  const loadSession = async (id: string) => {
    const sessionData = history.find(s => s.id === id);
    if (!sessionData) return;
    setIsConnecting(true);
    setShowHistory(false);
    setReadyAnnounced(false);
    try {
      const session = await createChatSession(file, sessionData.settings.accent, sessionData.settings.tone);
      setChatSession(session);
      setMessages(sessionData.messages);
      setCurrentSessionId(id);
      setAccent(sessionData.settings.accent);
      setTone(sessionData.settings.tone);
      setIsConnecting(false);
      setReadyAnnounced(true);
    } catch (e) {
      setConnectionError(true);
      setIsConnecting(false);
      alert("Session Restore Failed: Jesus has been notified. Please try refreshing or starting a new session.");
    }
  };

  const updateSessionHistory = (msgs: ChatMessage[]) => {
    setHistory(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: msgs, lastModified: Date.now() } : s));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !chatSession) return;
    const userText = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setIsLaunching(true);

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now() };
    const newMsgs = [...messages, newUserMsg];
    setMessages(newMsgs);
    updateSessionHistory(newMsgs);
    setIsTyping(true);

    try {
      const response = await chatSession.sendMessage({ message: userText });
      const modelText = response.text || "No response received.";
      const finalMsgs: ChatMessage[] = [...newMsgs, { 
        id: (Date.now()+1).toString(), 
        role: 'model', 
        text: modelText, 
        timestamp: Date.now() 
      }];
      setMessages(finalMsgs);
      updateSessionHistory(finalMsgs);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), role: 'model', text: "SYSTEM ALERT: Sync lost. Support (Jesus) has been notified. Please retry your last prompt.", timestamp: Date.now() 
      }]);
    } finally { 
      setIsTyping(false); 
      setIsSending(false); 
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSpeak = async (msg: ChatMessage) => {
    if (speakingId === msg.id) return;
    setSpeakingId(msg.id);
    try {
      const audioData = await speakText(msg.text, accent);
      await playAudio(audioData);
    } catch (e) {
      console.error(e);
      alert("Voice playback failed.");
    } finally {
      setSpeakingId(null);
    }
  };

  const playAudio = async (base64: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return new Promise(resolve => source.onended = resolve);
  };

  const handleInputActivation = () => {
    if (isLaunching) setIsLaunching(false);
  };

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div className="flex h-full relative transition-colors duration-300">
      {showHistory && (
        <div className={`absolute inset-y-0 left-0 w-72 z-50 shadow-2xl animate-fade flex flex-col border-r ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-widest text-[#07bc0c]">Study Feed</h3>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            <button onClick={() => { setShowHistory(false); initChat(); }} className="w-full p-4 rounded-2xl bg-[#07bc0c] text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-all mb-4">
              <Plus className="w-4 h-4" /> New Study Session
            </button>
            {history.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${currentSessionId === s.id ? 'border-[#07bc0c] bg-[#07bc0c]/5 text-[#07bc0c]' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'}`}>
                <div className="font-bold text-sm truncate">{s.title}</div>
                <div className="text-[10px] opacity-60">{new Date(s.lastModified).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <PDFModal file={file} isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} pageNumber={viewerPage} isDarkMode={isDarkMode} />

        <header className={`h-20 glass border-b flex items-center justify-between px-4 md:px-6 z-30 shrink-0 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-2">
              <button onClick={onReset} className="p-2 rounded-xl text-slate-500 hover:text-red-500 transition-all"><ChevronLeft className="w-6 h-6"/></button>
              <button onClick={() => setShowHistory(true)} className="p-2.5 rounded-xl border transition-all text-slate-500 hover:text-[#07bc0c]"><History className="w-5 h-5" /></button>
              <div className="hidden xs:flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#07bc0c] rounded-xl flex items-center justify-center shadow-lg"><BrainCircuit className="w-6 h-6 text-white" /></div>
                  <h2 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Unispace Assistant</h2>
              </div>
          </div>

          <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'bg-[#07bc0c] text-white border-[#07bc0c]' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-400')}`}><Languages className="w-5 h-5"/></button>
                {showSettings && (
                  <div className={`absolute top-full right-0 mt-4 w-64 p-6 rounded-[2rem] shadow-2xl border z-[100] animate-fade ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase opacity-60 block mb-2 tracking-widest">Voice Accent</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['US', 'UK', 'NG'] as VoiceAccent[]).map(v => (
                            <button key={v} onClick={() => { setAccent(v); setShowSettings(false); initChat(v, tone); }} className={`p-2 rounded-xl text-[10px] font-black border transition-all ${accent === v ? 'bg-[#07bc0c] text-white' : 'bg-slate-50 dark:bg-slate-800'}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase opacity-60 block mb-2 tracking-widest">Assistant Tone</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['TEACHER', 'PROFESSIONAL', 'FRIEND', 'FUNNY'] as ContentTone[]).map(t => (
                            <button key={t} onClick={() => { setTone(t); setShowSettings(false); initChat(accent, t); }} className={`p-2 rounded-xl text-[8px] font-black border transition-all ${tone === t ? 'bg-[#07bc0c] text-white' : 'bg-slate-50 dark:bg-slate-800'}`}>{t}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onToggleTheme} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-400'}`}>{isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar pb-32 md:pb-48 relative">
          {isConnecting && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade">
                  <div className="w-20 h-20 bg-[#07bc0c]/10 rounded-[2rem] flex items-center justify-center mb-6">
                      <Loader2 className="w-10 h-10 text-[#07bc0c] animate-spin" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black mb-2">{connectionStatus}</h3>
                  <p className="text-slate-500 font-bold max-w-xs">Initializing study environment. One moment please...</p>
              </div>
          )}

          {!isConnecting && readyAnnounced && messages.length === 1 && (
              <div className="flex items-center justify-center mb-8 animate-fade">
                  <div className="bg-[#07bc0c]/10 text-[#07bc0c] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-[#07bc0c]/20 shadow-lg shadow-[#07bc0c]/5">
                      <Sparkles className="w-4 h-4" /> AI assistant is ready
                  </div>
              </div>
          )}

          <div className={`max-w-4xl mx-auto space-y-8 transition-opacity duration-500 ${isConnecting ? 'opacity-0' : 'opacity-100'}`}>
              {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl max-w-[90%] group ${msg.role === 'user' ? 'bg-[#07bc0c] text-white rounded-tr-none' : isDarkMode ? 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                          <FormattedText text={msg.text} isDarkMode={isDarkMode} isUser={msg.role === 'user'} onCitationClick={(p) => { setViewerPage(p); setIsViewerOpen(true); }} />
                          {msg.role === 'model' && (
                            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleSpeak(msg)} className={`p-2 rounded-lg transition-all ${speakingId === msg.id ? 'text-[#07bc0c] animate-pulse bg-[#07bc0c]/10' : 'text-slate-400 hover:text-[#07bc0c] hover:bg-slate-100'}`}><Volume2 className="w-5 h-5" /></button>
                                <button onClick={() => { navigator.clipboard.writeText(msg.text.replace(/[#*]/g, '')); setCopiedId(msg.id); setTimeout(()=>setCopiedId(null), 2000); }} className="p-2 text-slate-400 hover:text-slate-600">{copiedId === msg.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                            </div>
                          )}
                      </div>
                  </div>
              ))}
              {isTyping && (
                  <div className="flex justify-start animate-fade">
                      <div className={`p-5 px-8 rounded-[1.5rem] rounded-tl-none border shadow-xl flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}><div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce"></div><div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div><div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div></div>
                  </div>
              )}
          </div>
        </main>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-40 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/95 dark:via-slate-950/95 to-transparent">
          <div className="max-w-4xl mx-auto">
              <div className={`glass shadow-2xl rounded-[2.5rem] p-2 flex items-center border transition-all focus-within:ring-4 focus-within:ring-[#07bc0c]/10 ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-white'}`}>
                  <textarea ref={inputRef} rows={1} autoFocus value={inputValue} onFocus={handleInputActivation} onClick={handleInputActivation} onChange={(e) => { setInputValue(e.target.value); handleInputActivation(); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isConnecting ? "Preparing..." : "Consult your document..."} disabled={isConnecting || isSending} className={`flex-1 bg-transparent px-6 py-4 focus:outline-none text-sm md:text-lg resize-none max-h-40 ${isDarkMode ? 'text-white' : 'text-slate-700'}`} />
                  <button onClick={handleSend} disabled={!inputValue.trim() || isSending || isConnecting} className={`p-4 rounded-[1.8rem] transition-all flex items-center justify-center shrink-0 relative overflow-hidden group ${inputValue.trim() && !isSending && !isConnecting ? 'bg-[#07bc0c] text-white shadow-lg' : 'bg-slate-200 text-slate-400 dark:bg-slate-800'}`}>{isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className={`w-6 h-6 transition-all duration-1000 transform ${isLaunching ? '-translate-y-[500%] opacity-0' : 'translate-y-0 opacity-100'}`} />}</button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
