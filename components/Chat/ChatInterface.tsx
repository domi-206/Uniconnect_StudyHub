
import React, { useState, useRef, useEffect } from 'react';
import { Copy, Edit2, Trash2, Bot, User, Sparkles, Reply, X, Loader2, RefreshCw, Send, ChevronLeft, AlertCircle, FileSearch } from 'lucide-react';
import { ChatMessage, UploadedFile } from '../../types';
import { createChatSession } from '../../services/geminiService';
import { Chat } from '@google/genai';
import PDFModal from '../PDFModal';

interface ChatInterfaceProps {
  file: UploadedFile;
  onBack: () => void;
  isDarkMode?: boolean;
}

const FormattedText: React.FC<{ 
    text: string, 
    isDarkMode?: boolean, 
    isUser?: boolean,
    onCitationClick: (page: number) => void
}> = ({ text, isDarkMode, isUser, onCitationClick }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;

  lines.forEach((line, i) => {
     // Regex to find citations like [p. 5] or [p. 12]
     const citationRegex = /\[p\.\s*(\d+)\]/g;
     
     const parts = line.split(/(\*\*.*?\*\*|\[p\.\s*\d+\])/g);
     const formattedLine = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className={`font-extrabold ${isUser ? 'text-white' : (isDarkMode ? 'text-[#07bc0c]' : 'text-slate-900')}`}>{part.slice(2, -2)}</strong>;
        }
        
        const match = citationRegex.exec(part);
        if (match) {
            const pageNum = parseInt(match[1]);
            return (
                <button 
                    key={idx}
                    onClick={() => onCitationClick(pageNum)}
                    className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                        isUser 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : (isDarkMode ? 'bg-[#07bc0c]/20 text-[#07bc0c] hover:bg-[#07bc0c]/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100')
                    }`}
                >
                    <FileSearch className="w-3 h-3" /> p.{pageNum}
                </button>
            );
        }
        
        return part;
     });

     const trimmed = line.trim();

     if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
         if (!inList) { inList = true; }
         elements.push(
            <div key={i} className={`flex items-start gap-3 ml-2 mb-2 ${isUser ? 'text-white/90' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#07bc0c] mt-2.5 shrink-0"></span>
                <span className="text-lg leading-relaxed">{formattedLine}</span>
            </div>
         );
     } else {
         inList = false;
         if (trimmed === '') {
             elements.push(<div key={i} className="h-4"></div>);
         } else if (line.startsWith('###')) {
             elements.push(<h3 key={i} className={`text-xl font-black mt-6 mb-3 ${isUser ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>{line.replace(/^###\s*/, '')}</h3>);
         } else {
             elements.push(<p key={i} className={`mb-2 leading-relaxed text-lg ${isUser ? 'text-white/90' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>{formattedLine}</p>);
         }
     }
  });

  return <div className="markdown-content">{elements}</div>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ file, onBack, isDarkMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hi there! I've loaded **${file.name}**. I'm ready to help you dissect this document and answer any questions you have. \n\nI will provide page citations so you can verify the sources in the document. How should we start?`, timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  // PDF Viewer State
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
        setIsConnecting(false);
    } catch (e) {
        console.error("Chat init failed", e);
        setConnectionError(true);
        setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, replyTo]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !chatSession) return;

    const userText = inputValue;
    let fullMessageText = userText;
    
    if (replyTo) {
        fullMessageText = `[Replying to: "${replyTo.text.substring(0, 80)}..."]\n\n${userText}`;
    }

    setInputValue('');
    setReplyTo(null);
    setIsSending(true);

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: fullMessageText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const response = await chatSession.sendMessage({ message: fullMessageText });
      const responseText = response.text || "I'm having trouble understanding that. Could you rephrase?";
      
      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "The connection dropped. Please check your network and try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleCitationClick = (page: number) => {
    setViewerPage(page);
    setIsViewerOpen(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRestartChat = async () => {
      if (window.confirm("Clear chat history?")) {
          setMessages([{ 
              id: Date.now().toString(), 
              role: 'model', 
              text: `Context cleared. Ask me anything new about **${file.name}**. I'll continue providing source references.`, 
              timestamp: Date.now() 
          }]);
          initChat();
      }
  };

  return (
    <div className={`flex flex-col h-full relative font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#fdfdfd]'}`}>
      <PDFModal 
        file={file} 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        pageNumber={viewerPage}
        isDarkMode={isDarkMode}
      />

      {/* Dynamic Header */}
      <header className={`h-20 glass border-b flex items-center justify-between px-6 z-30 sticky top-0 shrink-0 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="flex items-center gap-6">
            <button onClick={onBack} className={`p-2 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}>
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40 relative">
                    <Bot className="w-7 h-7 text-white" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 ${isDarkMode ? 'border-slate-900' : 'border-white'} ${isConnecting ? 'bg-amber-400 animate-pulse' : (connectionError ? 'bg-red-500' : 'bg-[#07bc0c]')}`}></div>
                </div>
                <div>
                    <h2 className={`font-black text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Assistant</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{isConnecting ? 'Initializing...' : (connectionError ? 'Error' : 'Online')}</p>
                </div>
            </div>
        </div>
        
        <button 
            onClick={handleRestartChat} 
            className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
            title="Restart Session"
        >
            <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* Modern Chat Stream */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar pb-32">
        {connectionError ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-4 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Connection Blocked</h3>
                <p className={`mb-6 max-w-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>We couldn't establish a link with the AI engine.</p>
                <button 
                    onClick={initChat}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                    <RefreshCw className="w-5 h-5" /> Try Reconnecting
                </button>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto space-y-10">
                {messages.map((msg) => {
                    const isReply = msg.text.startsWith('[Replying to:');
                    let displayText = msg.text;
                    let replyContext = '';
                    const isUser = msg.role === 'user';
                    
                    if (isReply) {
                        const parts = msg.text.split(']\n\n');
                        replyContext = parts[0].replace('[Replying to: "', '').replace('..."', '');
                        displayText = parts.slice(1).join(']\n\n');
                    }

                    return (
                        <div key={msg.id} className={`flex w-full group animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col gap-2 max-w-[90%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                {isReply && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                        <Reply className="w-3 h-3" /> Reply: {replyContext.substring(0, 30)}...
                                    </div>
                                )}
                                
                                <div className={`relative p-6 md:p-8 rounded-[2.5rem] shadow-xl text-lg leading-relaxed ${
                                    isUser 
                                        ? 'bg-[#07bc0c] text-white rounded-tr-none shadow-[#07bc0c]/20' 
                                        : isDarkMode
                                            ? 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none shadow-slate-950/40'
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-slate-200/40'
                                }`}>
                                    <FormattedText 
                                        text={displayText} 
                                        isDarkMode={isDarkMode} 
                                        isUser={isUser} 
                                        onCitationClick={handleCitationClick}
                                    />
                                    
                                    {/* Bubble Actions */}
                                    <div className={`absolute top-0 flex gap-2 transition-all opacity-0 group-hover:opacity-100 ${isUser ? 'right-full mr-4' : 'left-full ml-4'}`}>
                                        <button onClick={() => handleCopy(msg.text)} className={`p-3 border rounded-2xl shadow-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900'}`}><Copy className="w-4 h-4"/></button>
                                        <button onClick={() => setReplyTo(msg)} className={`p-3 border rounded-2xl shadow-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900'}`}><Reply className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {isTyping && (
                    <div className="flex justify-start animate-fade">
                        <div className={`p-6 rounded-[2rem] rounded-tl-none border shadow-xl flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                        </div>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Futuristic Floating Input */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40">
        <div className="max-w-4xl mx-auto relative">
            {replyTo && (
                <div className={`absolute bottom-full left-0 right-0 mb-4 glass p-4 rounded-3xl border shadow-2xl animate-slide-up flex items-center justify-between ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-white'}`}>
                    <div className="flex items-center gap-4">
                        <div className="bg-[#07bc0c]/10 p-2 rounded-xl text-[#07bc0c]"><Reply className="w-5 h-5"/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Replying to {replyTo.role}</p>
                            <p className={`text-sm font-bold truncate max-w-[200px] md:max-w-md ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{replyTo.text}</p>
                        </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}><X className="w-5 h-5"/></button>
                </div>
            )}
            
            <div className={`glass shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-2 flex items-center border transition-all focus-within:ring-4 focus-within:ring-[#07bc0c]/10 group ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-white'}`}>
                <textarea
                    ref={inputRef}
                    rows={1}
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
                    placeholder={isConnecting ? "Waking up AI..." : "Message your document..."}
                    className={`flex-1 bg-transparent px-6 py-4 placeholder-slate-500 focus:outline-none text-lg resize-none max-h-40 min-h-[56px] custom-scrollbar ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending || isConnecting}
                    className={`p-4 rounded-[1.8rem] transition-all flex items-center justify-center overflow-hidden shrink-0 ${
                        inputValue.trim() && !isSending && !isConnecting
                        ? 'bg-[#07bc0c] text-white shadow-lg shadow-[#07bc0c]/30 hover:scale-105 active:scale-95' 
                        : isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    {isSending ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
