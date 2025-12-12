import React, { useState, useRef, useEffect } from 'react';
import { Copy, Edit2, Trash2, Bot, User, Sparkles, Reply, X, Rocket, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ChatMessage, UploadedFile } from '../../types';
import { createChatSession } from '../../services/geminiService';
import { Chat } from '@google/genai';

interface ChatInterfaceProps {
  file: UploadedFile;
  onBack: () => void;
}

// Simple formatter component for Bold, Paragraphs, Lists
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;

  lines.forEach((line, i) => {
     // Bold parsing
     const parts = line.split(/(\*\*.*?\*\*)/g);
     const formattedLine = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
     });

     const trimmed = line.trim();

     if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
         if (!inList) { inList = true; }
         elements.push(
            <div key={i} className="flex items-start gap-2 ml-2 mb-1 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                <span>{formattedLine.slice(1)}</span>
            </div>
         );
     } else {
         inList = false;
         if (trimmed === '') {
             elements.push(<div key={i} className="h-2"></div>);
         } else if (line.startsWith('###')) {
             elements.push(<h3 key={i} className="text-lg font-bold mt-3 mb-2 text-slate-800">{line.replace(/^###\s*/, '')}</h3>);
         } else {
             elements.push(<p key={i} className="mb-1 leading-relaxed text-slate-700">{formattedLine}</p>);
         }
     }
  });

  return <div>{elements}</div>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ file, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hello! I've analyzed **${file.name}**. \n\nI can help you:\n- Summarize key points\n- Explain complex concepts\n- Answer specific questions`, timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Chat Session on Mount
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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, replyTo]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !chatSession) return;

    const userText = inputValue;
    let fullMessageText = userText;
    
    if (replyTo) {
        fullMessageText = `[Replying to: "${replyTo.text.substring(0, 100)}..."]\n\n${userText}`;
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
      // Using the persistent chat session which already has the file context
      const response = await chatSession.sendMessage({ message: fullMessageText });
      const responseText = response.text || "I couldn't generate a response. Please try again.";
      
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
        text: "Sorry, I encountered an error communicating with the AI. Please try sending your message again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleRestartChat = async () => {
      if (window.confirm("Are you sure you want to clear the entire chat history?")) {
          setMessages([{ 
              id: Date.now().toString(), 
              role: 'model', 
              text: `Chat restarted. Ask me anything about **${file.name}**.`, 
              timestamp: Date.now() 
          }]);
          
          // Re-initialize session to clear model context
          initChat();
      }
  };

  const handleEdit = (id: string, currentText: string) => {
    handleDelete(id);
    const cleanText = currentText.replace(/^\[Replying to: .*?\]\n\n/, '');
    setInputValue(cleanText);
    inputRef.current?.focus();
  };

  const handleReply = (msg: ChatMessage) => {
      setReplyTo(msg);
      inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="h-14 md:h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-md z-10 sticky top-0 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium transition-colors text-sm md:text-base flex items-center gap-1">
          &larr; <span className="hidden xs:inline">Exit</span>
        </button>
        <div className="flex items-center gap-2">
            <div className="bg-[#07bc0c]/10 p-1.5 md:p-2 rounded-full">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#07bc0c]" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[150px] md:max-w-none">
                AI Assistant 
                {isConnecting && <span className="hidden md:inline text-xs font-normal text-slate-400 ml-2">(Connecting...)</span>}
                {connectionError && <span className="hidden md:inline text-xs font-bold text-red-500 ml-2">(Connection Failed)</span>}
            </h2>
        </div>
        <button 
            onClick={handleRestartChat} 
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
            title="Restart Chat"
        >
            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-6 md:space-y-8 bg-slate-50/50 pb-4">
        {connectionError ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-12 h-12 mb-2 text-red-400" />
                <p className="mb-4 text-slate-600">Failed to connect to AI service.</p>
                <button 
                    onClick={initChat}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
                >
                    <RefreshCw className="w-4 h-4" /> Retry Connection
                </button>
            </div>
        ) : (
            <>
                {messages.map((msg) => {
                    const isReply = msg.text.startsWith('[Replying to:');
                    let displayText = msg.text;
                    let replyContext = '';
                    
                    if (isReply) {
                        const parts = msg.text.split(']\n\n');
                        replyContext = parts[0].replace('[Replying to: "', '').replace('..."', '');
                        displayText = parts.slice(1).join(']\n\n');
                    }

                    return (
                    <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div className={`flex max-w-[95%] md:max-w-[70%] gap-2 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        {/* Avatar */}
                        <div className={`hidden md:flex w-10 h-10 rounded-full items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-[#07bc0c]' : 'bg-white border border-slate-200'}`}>
                            {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-[#07bc0c]" />}
                        </div>

                        {/* Bubble */}
                        <div className="group relative">
                            {isReply && (
                                <div className={`text-xs mb-1 opacity-70 flex items-center gap-1 ${msg.role === 'user' ? 'text-right justify-end text-slate-500' : 'text-slate-500'}`}>
                                    <Reply className="w-3 h-3" />
                                    Replying to: {replyContext.substring(0, 20)}...
                                </div>
                            )}
                            <div className={`p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-sm md:text-base leading-relaxed relative ${
                            msg.role === 'user' 
                                ? 'bg-[#07bc0c] text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                            }`}>
                            <FormattedText text={displayText} />
                            </div>
                            
                            {/* Actions (Hover/Touch) */}
                            <div className={`flex gap-2 mt-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <button onClick={() => handleReply(msg)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#07bc0c] transition-all" title="Reply">
                                <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleCopy(msg.text)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#07bc0c] transition-all" title="Copy">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            {msg.role === 'user' && (
                                <>
                                    <button onClick={() => handleEdit(msg.id, msg.text)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#07bc0c] transition-all" title="Edit">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(msg.id)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all" title="Delete Message">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                    );
                })}
                {isTyping && (
                <div className="flex justify-start w-full animate-pulse">
                    <div className="flex gap-4 max-w-[70%]">
                        <div className="hidden md:flex w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-[#07bc0c]" />
                        </div>
                        <div className="bg-white p-4 md:p-5 rounded-3xl rounded-tl-none border border-slate-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                            <span className="w-2 h-2 bg-[#07bc0c] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        </div>
                    </div>
                </div>
                )}
            </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-6 bg-white border-t border-slate-100 relative shrink-0">
        {/* Reply Preview */}
        {replyTo && (
            <div className="absolute top-[-3.5rem] left-2 right-2 md:left-6 md:right-6 bg-white border border-slate-200 shadow-lg rounded-xl p-3 flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Reply className="w-4 h-4 text-[#07bc0c] shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#07bc0c]">Replying to {replyTo.role}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md">{replyTo.text}</span>
                    </div>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div 
            className="max-w-4xl mx-auto relative bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center transition-all border border-slate-200 focus-within:ring-2 focus-within:ring-[#07bc0c]/20 focus-within:border-[#07bc0c] focus-within:bg-white focus-within:shadow-xl shadow-sm"
            onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isConnecting || connectionError}
            placeholder={isConnecting ? "Initializing..." : (connectionError ? "Failed" : (replyTo ? "Reply..." : "Type a message..."))}
            className="w-full bg-transparent px-4 py-3 md:px-8 md:py-5 text-slate-700 placeholder-slate-400 focus:outline-none text-base md:text-lg disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isConnecting || connectionError}
            className={`mr-2 md:mr-3 p-2 md:p-3 rounded-full transition-all duration-300 group overflow-hidden relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center ${
                inputValue.trim() && !isConnecting && !connectionError
                ? 'bg-[#07bc0c] text-white shadow-lg hover:shadow-[#07bc0c]/40 hover:scale-105 active:scale-95' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
             <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isSending ? 'opacity-0 translate-y-[-200%]' : 'opacity-100'}`}>
                {isConnecting ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                    <Rocket className={`w-5 h-5 md:w-6 md:h-6 transform transition-transform group-hover:-rotate-45 ${inputValue.trim() ? 'animate-pulse' : ''}`} />
                )}
             </div>
             <div className={`absolute inset-0 bg-white/20 transition-all duration-300 rounded-full ${isSending ? 'scale-150 opacity-0' : 'scale-0 opacity-100'}`}></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;