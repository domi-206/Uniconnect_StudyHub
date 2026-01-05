
import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Play, Pause, Download, X, Volume2, SkipBack, SkipForward, FastForward, Timer, ChevronLeft } from 'lucide-react';
import { PodcastSegment } from '../../types';

interface PodcastPlayerProps {
  audioBase64: string;
  segments: PodcastSegment[];
  isDarkMode: boolean;
  onClose: () => void;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ audioBase64, segments, isDarkMode, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false); // strictly paused by default
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const binary = atob(audioBase64);
    const dataInt16 = new Int16Array(new Uint8Array(Array.from(binary, char => char.charCodeAt(0))).buffer);
    const wavBuffer = createWavFile(dataInt16);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
      
      const idx = segments.findIndex((s, i) => {
        const nextStart = segments[i + 1]?.startTime ?? Infinity;
        return audio.currentTime >= s.startTime && audio.currentTime < nextStart;
      });
      if (idx !== -1 && idx !== activeSegmentIndex) {
        setActiveSegmentIndex(idx);
      }
    };
    audio.onended = () => setIsPlaying(false);

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [audioBase64, segments]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    if (activeSegmentRef.current && scrollRef.current) {
      activeSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegmentIndex]);

  const createWavFile = (pcmData: Int16Array) => {
    const header = new ArrayBuffer(44);
    const d = new DataView(header);
    d.setUint32(0, 0x52494646, false); d.setUint32(4, 36 + pcmData.length * 2, true); d.setUint32(8, 0x57415645, false);
    d.setUint32(12, 0x666d7420, false); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, 24000, true); d.setUint32(28, 48000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true);
    d.setUint32(36, 0x64617461, false); d.setUint32(40, pcmData.length * 2, true);
    const combined = new Uint8Array(header.byteLength + pcmData.length * 2);
    combined.set(new Uint8Array(header), 0);
    combined.set(new Uint8Array(pcmData.buffer), 44);
    return combined;
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
        audioRef.current.pause(); // Automatically pause when clicking back/listing
    }
    onClose();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      const targetTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      // Removed the check that forced play() on seek.
      // Audio will only play if togglePlay is clicked.
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
  };

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center p-3 md:p-6 lg:p-10 animate-fade`}>
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl" onClick={handleClose}></div>
      
      <div className={`relative w-full max-w-7xl h-full max-h-[92vh] md:max-h-[90vh] rounded-[2rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden border flex flex-col md:flex-row transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
        
        {/* Left Side: Controls & Visuals */}
        <div className="md:w-[45%] lg:w-[35%] p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-black/10 shrink-0 overflow-y-auto custom-scrollbar min-h-0">
          <button onClick={handleClose} className="absolute top-4 left-4 md:top-6 md:left-6 p-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all z-50 flex items-center gap-2 font-black text-xs uppercase tracking-widest">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /> Back to Listing
          </button>

          <div className="relative mb-6 md:mb-12 mt-8 md:mt-0 flex-shrink-0">
            <div className="w-32 h-32 md:w-44 lg:w-52 bg-[#07bc0c] rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center shadow-[0_0_60px_#07bc0c]/30 animate-float">
                <Headphones className="w-16 h-16 md:w-24 lg:w-32 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-2 md:border-4 border-slate-900">
                <Volume2 className="w-5 h-5 md:w-8 md:h-8 text-[#07bc0c]" />
            </div>
          </div>

          <div className="text-center mb-6 md:mb-10 w-full flex-shrink-0">
            <h2 className={`text-2xl md:text-3xl lg:text-4xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Podcast</h2>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#07bc0c] mb-2">Unispace Audio Production</p>
            <p className={`text-[10px] md:text-xs opacity-50 font-bold max-w-xs mx-auto leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>High-fidelity study summary, synthesized with absolute precision.</p>
          </div>

          <div className="w-full space-y-4 md:space-y-8 mb-6 md:mb-10 px-2 flex-shrink-0">
            <div className="flex justify-between text-[10px] md:text-xs font-black opacity-60 uppercase tracking-widest px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="relative h-2.5 md:h-3 w-full bg-[#07bc0c]/20 rounded-full cursor-pointer overflow-hidden group/bar" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                handleSeek((x / rect.width) * duration);
            }}>
              <div className="absolute inset-y-0 left-0 bg-[#07bc0c] rounded-full transition-all duration-300 group-hover/bar:bg-[#06a00a]" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-12 flex-shrink-0">
            <button onClick={() => handleSeek(currentTime - 10)} className={`p-2.5 md:p-4 rounded-2xl border transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'border-slate-800 text-slate-500 hover:text-white' : 'border-slate-200 text-slate-400 hover:text-slate-900'}`} title="Back 10s">
              <SkipBack className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button onClick={togglePlay} className="w-16 h-16 md:w-24 md:h-24 bg-[#07bc0c] rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_30px_#07bc0c]/30 hover:scale-105 active:scale-95 transition-all group/play">
              {isPlaying ? <Pause className="w-8 h-8 md:w-12 md:h-12 text-white fill-current" /> : <Play className="w-8 h-8 md:w-12 md:h-12 text-white fill-current translate-x-1" />}
            </button>
            <button onClick={() => handleSeek(currentTime + 10)} className={`p-2.5 md:p-4 rounded-2xl border transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'border-slate-800 text-slate-500 hover:text-white' : 'border-slate-200 text-slate-400 hover:text-slate-900'}`} title="Forward 10s">
              <SkipForward className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full justify-center px-4 flex-shrink-0">
             <button onClick={cycleSpeed} className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 md:py-4 rounded-2xl border text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white hover:bg-[#07bc0c]/10 hover:border-[#07bc0c]' : 'bg-white border-slate-200 text-slate-800 hover:bg-[#07bc0c]/5 hover:border-[#07bc0c]'}`}>
                <FastForward className="w-4 h-4 text-[#07bc0c]" /> {playbackSpeed}x Speed
             </button>
             <button onClick={() => {
                const binary = atob(audioBase64);
                const wav = createWavFile(new Int16Array(new Uint8Array(Array.from(binary, char => char.charCodeAt(0))).buffer));
                const blob = new Blob([wav], { type: 'audio/mpeg' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'study-podcast.mp3';
                a.click();
             }} className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 md:py-4 rounded-2xl border transition-all text-[10px] md:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-900 border-slate-800 text-[#07bc0c] hover:bg-[#07bc0c]/20' : 'bg-white border-slate-200 text-[#07bc0c] hover:bg-[#07bc0c]/10'}`}>
                <Download className="w-4 h-4" /> Download MP3
             </button>
          </div>
        </div>

        {/* Right Side: Transcript */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/50'}`}>
            <div className={`p-5 md:p-10 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div>
                    <h3 className={`text-xl md:text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Full Transcript</h3>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#07bc0c] opacity-70">Real-time Session Feed</p>
                </div>
                <div className="flex items-center gap-2 bg-[#07bc0c]/10 px-4 py-2 rounded-2xl border border-[#07bc0c]/10">
                    <Timer className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#07bc0c]" />
                    <span className="text-xs md:text-sm font-black text-[#07bc0c] font-mono">{formatTime(currentTime)}</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 custom-scrollbar scroll-smooth">
                {segments.map((segment, idx) => {
                    const isActive = activeSegmentIndex === idx;
                    return (
                        <div 
                            key={idx} 
                            ref={isActive ? activeSegmentRef : null}
                            onClick={() => handleSeek(segment.startTime)}
                            className={`group cursor-pointer p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 transition-all duration-500 ease-out ${
                                isActive 
                                ? 'bg-[#07bc0c]/15 border-[#07bc0c] shadow-[0_0_50px_#07bc0c]/10 scale-[1.01]' 
                                : isDarkMode 
                                    ? 'bg-transparent border-transparent hover:bg-slate-800/40'
                                    : 'bg-transparent border-transparent hover:bg-white/80'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3 md:mb-6">
                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                    <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#07bc0c] text-white' : isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                        {segment.speaker}
                                    </span>
                                    <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {segment.topic}
                                    </span>
                                </div>
                                <span className={`font-mono text-xs md:text-sm font-black transition-colors ${isActive ? 'text-[#07bc0c]' : (isDarkMode ? 'text-slate-700' : 'text-slate-300')}`}>
                                    {formatTime(segment.startTime)}
                                </span>
                            </div>
                            <p className={`text-base md:text-xl lg:text-2xl font-medium leading-relaxed transition-all ${
                                isActive ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')
                            } group-hover:text-opacity-100`}>
                                {segment.text}
                            </p>
                        </div>
                    );
                })}
                <div className="h-20 shrink-0"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastPlayer;
