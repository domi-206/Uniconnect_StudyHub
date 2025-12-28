
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Send, ChevronLeft, AlertCircle, FileSearch, Sun, Moon, BookOpen, RefreshCw, CheckCircle, BrainCircuit } from 'lucide-react';
import { ChatMessage, UploadedFile } from '../../types';
import { createChatSession } from '../../services/geminiService';
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
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
     const parts = line.split(/(\*\*.*?\*\*|\[p\.\s*\d+\])/g);
     const formattedLine = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className={`font-black ${isUser ? 'text-white' : (isDarkMode ? 'text-[#07bc0c]' : 'text-slate-900')}`}>{part.slice(2, -2)}</strong>;
        }
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
     if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState<number | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { 
    initChat(); 
  }, [file]);

  const initChat = async () => {
    setIsConnecting(true);
    setConnectionError(false);
    try {
        const session = await createChatSession(file);
        setChatSession(session);
        setMessages([{ 
          id: '1', 
          role: 'model', 
          text: `Neural connection established with **${file.name}**. I'm ready to assist with your study. Ask me anything and I'll cite the source pages like this [p. 1].`, 
          timestamp: Date.now() 
        }]);
        setIsConnecting(false);
    } catch (e) { 
      console.error("AI Assistant Sync Failed", e);
      setConnectionError(true); 
      setIsConnecting(false); 
    }
  };

  useEffect(() => { 
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    // Check all conditions to ensure we can actually send
    if (!inputValue.trim() || isSending || isConnecting || !chatSession) return;
    
    const userText = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const response = await chatSession.sendMessage({ message: userText });
      const modelText = response.text || "I was able to process your request but no text was returned.";
      
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        role: 'model', 
        text: modelText, 
        timestamp: Date.now() 
      }]);
    } catch (error) {
      console.error("Chat Interaction Failed", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "**System Alert:** The connection was interrupted. Please try re-sending or refresh.", 
        timestamp: Date.now() 
      }]);
    } finally { 
      setIsTyping(false); 
      setIsSending(false); 
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col h-full relative transition-colors duration-300">
      <PDFModal 
        file={file} 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        pageNumber={viewerPage} 
        isDarkMode={isDarkMode} 
      />

      <header className={`h-20 glass border-b flex items-center justify-between px-4 md:px-6 z-30 transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="flex items-center gap-2 md:gap-4">
            <button onClick={onReset} className="p-2 md:p-2.5 rounded-2xl hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all">
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6"/>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#07bc0c] rounded-xl flex items-center justify-center shadow-lg">
                  <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h2 className={`font-black text-[10px] md:text-sm leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Assistant</h2>
                      {isConnecting ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] md:text-[9px] font-black uppercase animate-pulse">
                          <RefreshCw className="w-2 h-2 animate-spin" /> Syncing
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[7px] md:text-[9px] font-black uppercase">
                          <CheckCircle className="w-2 h-2" /> Ready
                        </div>
                      )}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button onClick={onToggleTheme} className={`p-2.5 md:p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              {isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            </button>
            <button onClick={onOpenQuiz} className="hidden xs:flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-[#07bc0c] text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.1em] shadow-lg shadow-[#07bc0c]/20 hover:scale-105 active:scale-95 transition-all">
              <BookOpen className="w-4 h-4"/> Quiz
            </button>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar pb-36">
        {connectionError && (
          <div className="max-w-2xl mx-auto p-6 rounded-[2rem] border bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 flex flex-col md:flex-row items-center gap-4 animate-fade shadow-sm">
             <AlertCircle className="w-8 h-8 md:w-6 md:h-6 shrink-0" />
             <div className="text-center md:text-left">
                <p className="font-black text-sm uppercase tracking-wider mb-1">Neural Sync Interrupted</p>
                <p className="text-sm font-medium opacity-90">Failed to index document. <button onClick={initChat} className="underline font-black ml-1 hover:text-red-700 transition-colors">Re-Attempt Sync</button></p>
             </div>
          </div>
        )}
        
        <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl max-w-[95%] md:max-w-[85%] ${
                        msg.role === 'user' 
                        ? 'bg-[#07bc0c] text-white rounded-tr-none shadow-[#07bc0c]/20' 
                        : isDarkMode ? 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-slate-200/50'
                    }`}>
                        <FormattedText 
                            text={msg.text} 
                            isDarkMode={isDarkMode} 
                            isUser={msg.role === 'user'} 
                            onCitationClick={(p) => { setViewerPage(p); setIsViewerOpen(true); }} 
                        />
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start animate-fade">
                    <div className={`p-5 px-8 rounded-[1.5rem] rounded-tl-none border shadow-xl flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-40 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/80 dark:via-slate-950/80 to-transparent">
        <div className="max-w-4xl mx-auto">
            <div className={`glass shadow-2xl rounded-[1.8rem] md:rounded-[2.5rem] p-2 flex items-center border transition-all focus-within:ring-4 focus-within:ring-[#07bc0c]/10 ${
                isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-white'
            }`}>
                <textarea
                    ref={inputRef}
                    rows={1}
                    autoFocus
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            handleSend(); 
                        } 
                    }}
                    placeholder={isConnecting ? "Assistant is Syncing..." : "Query your document..."}
                    disabled={isConnecting || isSending}
                    className={`flex-1 bg-transparent px-4 md:px-6 py-4 focus:outline-none text-sm md:text-lg resize-none max-h-40 min-h-[56px] custom-scrollbar ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                    } ${isConnecting ? 'cursor-not-allowed opacity-50 italic' : ''}`}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending || isConnecting || !chatSession}
                    className={`p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.8rem] transition-all flex items-center justify-center shrink-0 ${
                        inputValue.trim() && !isSending && !isConnecting && chatSession
                        ? 'bg-[#07bc0c] text-white shadow-lg shadow-[#07bc0c]/30 hover:scale-105 active:scale-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                    }`}
                >
                    {isSending ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Send className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
            </div>
            {(isConnecting || isSending) && (
              <p className="text-center mt-3 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#07bc0c] animate-pulse">
                {isConnecting ? "Mapping Neural Pathways..." : "Thinking..."}
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
