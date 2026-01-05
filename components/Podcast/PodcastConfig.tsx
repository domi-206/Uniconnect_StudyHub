
import React, { useState } from 'react';
import { Mic2, Sparkles, ChevronLeft, Play, Clock, Globe, Users, User, Check, List, Type } from 'lucide-react';
import { PodcastSettings, VoiceAccent, ContentTone, TopicStatus } from '../../types';

interface PodcastConfigProps {
  topics: TopicStatus[];
  onStart: (settings: PodcastSettings) => void;
  onBack: () => void;
  isDarkMode: boolean;
}

const PodcastConfig: React.FC<PodcastConfigProps> = ({ topics, onStart, onBack, isDarkMode }) => {
  const [settings, setSettings] = useState<PodcastSettings>({
    tone: 'TEACHER',
    accent: 'US',
    durationMinutes: 5,
    speakerCount: 'SINGLE',
    hostAName: 'Host A',
    hostBName: 'Host B',
    selectedTopics: []
  });

  const tones: { id: ContentTone; label: string; desc: string }[] = [
    { id: 'FUNNY', label: 'Funny', desc: 'Entertainment focused with jokes' },
    { id: 'PROFESSIONAL', label: 'Professional', desc: 'Formal and objective analysis' },
    { id: 'TEACHER', label: 'Teacher', desc: 'Clear explanations and analogies' },
    { id: 'FRIEND', label: 'Friend', desc: 'Casual conversation style' }
  ];

  const accents: { id: VoiceAccent; label: string; flag: string }[] = [
    { id: 'NG', label: 'Nigerian English', flag: '🇳🇬' },
    { id: 'UK', label: 'British English', flag: '🇬🇧' },
    { id: 'US', label: 'US English', flag: '🇺🇸' }
  ];

  const toggleTopic = (topic: string) => {
    setSettings(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic]
    }));
  };

  return (
    <div className={`max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col animate-fade ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2.5 rounded-xl border hover:bg-red-500/10 hover:text-red-500 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-[#07bc0c] p-2 rounded-xl shadow-lg">
            <Mic2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black">Study Podcast</h2>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-10 pb-32 custom-scrollbar pr-2">
        
        {/* Host Names */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Type className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Host Personalization</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Host A Name</label>
              <input 
                type="text"
                value={settings.hostAName}
                onChange={(e) => setSettings({...settings, hostAName: e.target.value})}
                className={`w-full p-4 rounded-2xl border-2 transition-all outline-none focus:border-[#07bc0c] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-700'}`}
                placeholder="Enter host name..."
              />
            </div>
            {settings.speakerCount === 'DOUBLE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Host B Name</label>
                <input 
                  type="text"
                  value={settings.hostBName}
                  onChange={(e) => setSettings({...settings, hostBName: e.target.value})}
                  className={`w-full p-4 rounded-2xl border-2 transition-all outline-none focus:border-[#07bc0c] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-700'}`}
                  placeholder="Enter host name..."
                />
              </div>
            )}
          </div>
        </section>

        {/* Speaker Mode */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Speaker Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setSettings({ ...settings, speakerCount: 'SINGLE' })}
              className={`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${
                settings.speakerCount === 'SINGLE' 
                ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-xl ring-4 ring-[#07bc0c]/10' 
                : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
              }`}
            >
              <div className={`p-3 rounded-2xl ${settings.speakerCount === 'SINGLE' ? 'bg-[#07bc0c] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-lg font-black ${settings.speakerCount === 'SINGLE' ? 'text-[#07bc0c]' : ''}`}>Single Host</div>
                <div className="text-[10px] opacity-50 font-black uppercase tracking-widest">Solo Presentation</div>
              </div>
            </button>
            <button 
              onClick={() => setSettings({ ...settings, speakerCount: 'DOUBLE' })}
              className={`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${
                settings.speakerCount === 'DOUBLE' 
                ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-xl ring-4 ring-[#07bc0c]/10' 
                : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
              }`}
            >
              <div className={`p-3 rounded-2xl ${settings.speakerCount === 'DOUBLE' ? 'bg-[#07bc0c] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-lg font-black ${settings.speakerCount === 'DOUBLE' ? 'text-[#07bc0c]' : ''}`}>Double Host</div>
                <div className="text-[10px] opacity-50 font-black uppercase tracking-widest">Conversation Style</div>
              </div>
            </button>
          </div>
        </section>

        {/* Topic Selection */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <List className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Focus Topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <button 
                key={t.name}
                onClick={() => toggleTopic(t.name)}
                className={`px-5 py-3 rounded-full border-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  settings.selectedTopics.includes(t.name)
                  ? 'border-[#07bc0c] bg-[#07bc0c] text-white shadow-lg'
                  : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-500'
                }`}
              >
                {settings.selectedTopics.includes(t.name) && <Check className="w-3 h-3" />}
                {t.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Podcast Tone</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tones.map(t => (
              <button 
                key={t.id} 
                onClick={() => setSettings({ ...settings, tone: t.id })}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all ${
                  settings.tone === t.id 
                  ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-xl ring-4 ring-[#07bc0c]/10' 
                  : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
                }`}
              >
                <div className={`text-lg font-black mb-1 ${settings.tone === t.id ? 'text-[#07bc0c]' : ''}`}>{t.label}</div>
                <div className="text-sm opacity-50 font-medium">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Speaker Accent</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accents.map(a => (
              <button 
                key={a.id} 
                onClick={() => {
                  setSettings({ ...settings, accent: a.id });
                }}
                className={`p-6 rounded-[1.5rem] border-2 flex items-center justify-center gap-3 transition-all ${
                  settings.accent === a.id 
                  ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-xl' 
                  : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
                }`}
              >
                <span className="text-2xl">{a.flag}</span>
                <span className="font-bold text-sm">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-[#07bc0c]" />
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Approximate Duration</h3>
          </div>
          <div className={`p-8 rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between mb-4">
              <span className="text-lg font-black">{settings.durationMinutes} Minutes</span>
            </div>
            <input 
              type="range" min="3" max="10" step="1" 
              value={settings.durationMinutes}
              onChange={(e) => setSettings({ ...settings, durationMinutes: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#07bc0c]/20 rounded-lg appearance-none cursor-pointer accent-[#07bc0c]"
            />
            <div className="flex justify-between text-[10px] font-black opacity-30 mt-2 px-1">
              <span>3 MIN</span>
              <span>10 MIN</span>
            </div>
          </div>
        </section>
      </div>

      <div className={`fixed bottom-0 left-0 w-full p-6 border-t z-50 flex justify-center pb-12 ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <button
          onClick={() => onStart(settings)}
          className="flex items-center gap-4 px-12 py-4 rounded-full bg-[#07bc0c] text-white font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Play className="w-6 h-6 fill-current" />
          Produce Podcast
        </button>
      </div>
    </div>
  );
};

export default PodcastConfig;
