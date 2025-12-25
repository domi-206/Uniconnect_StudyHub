
import React, { useState } from 'react';
import { Settings, Play, List, Clock, BarChart } from 'lucide-react';
import { QuizSettings, TopicStatus } from '../../types';

interface QuizConfigProps {
  topics: TopicStatus[];
  onStart: (topic: string, settings: QuizSettings) => void;
  onBack: () => void;
  isDarkMode?: boolean;
}

const QuizConfig: React.FC<QuizConfigProps> = ({ topics, onStart, onBack, isDarkMode }) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(topics[0]?.name || '');
  const [settings, setSettings] = useState<QuizSettings>({
    questionCount: 10,
    timePerQuestion: 30,
    totalTimeLimit: 0
  });

  React.useEffect(() => {
    const availableTopic = topics.find(t => !t.isLocked);
    const currentIsLocked = topics.find(t => t.name === selectedTopic)?.isLocked;
    
    if ((!selectedTopic || currentIsLocked) && availableTopic) {
        setSelectedTopic(availableTopic.name);
    }
  }, [topics, selectedTopic]);

  const handleStart = () => {
    if (!selectedTopic) return;
    onStart(selectedTopic, settings);
  };

  const currentTopicStatus = topics.find(t => t.name === selectedTopic);

  return (
    <div className={`max-w-5xl mx-auto p-4 md:p-6 h-full flex flex-col animate-fade-in relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
        <button onClick={onBack} className={`font-bold transition-colors text-sm md:text-base ${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
          &larr; Dashboard
        </button>
        <h2 className={`text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          <div className="bg-[#07bc0c]/10 p-1.5 md:p-2 rounded-xl">
             <Settings className="w-5 h-5 md:w-6 md:h-6 text-[#07bc0c]" />
          </div>
          Quiz Setup
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 flex-1 overflow-y-auto pb-32 custom-scrollbar">
        {/* Topic Selection */}
        <div className={`lg:col-span-5 p-4 md:p-6 rounded-3xl shadow-sm border flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <h3 className={`text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            <List className="w-5 h-5 text-[#07bc0c]" />
            Select Topic
          </h3>
          <div className="space-y-3 flex-1 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
            {topics.map((topic, idx) => (
              <div
                key={idx}
                onClick={() => !topic.isLocked && setSelectedTopic(topic.name)}
                className={`p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${
                  selectedTopic === topic.name
                    ? 'border-[#07bc0c] bg-[#07bc0c]/5 shadow-sm'
                    : topic.isLocked
                    ? isDarkMode ? 'border-slate-800 bg-slate-950 opacity-50 cursor-not-allowed' : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    : isDarkMode ? 'border-slate-800 bg-slate-800 hover:border-[#07bc0c]/50' : 'border-slate-100 hover:border-[#07bc0c]/50 hover:bg-white'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className={`font-bold block text-sm md:text-base truncate ${selectedTopic === topic.name ? 'text-[#07bc0c]' : (isDarkMode ? 'text-slate-400' : 'text-slate-700')}`}>
                      {topic.name}
                  </span>
                  {topic.bestScore !== undefined && (
                    <div className="text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        Best: {Math.round(topic.bestScore)}%
                    </div>
                  )}
                </div>
                {topic.isLocked ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded shrink-0">LOCKED</span>
                ) : (
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedTopic === topic.name ? 'border-[#07bc0c] bg-[#07bc0c]' : 'border-slate-300'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-6 md:p-8 rounded-3xl shadow-sm border h-full transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <h3 className={`text-lg md:text-xl font-bold mb-6 md:mb-8 flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <Settings className="w-5 h-5 text-[#07bc0c]" />
              Customize Parameters
            </h3>

            {/* Question Count */}
            <div className="mb-8 md:mb-10">
              <div className="flex justify-between mb-4">
                <label className={`text-sm md:text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    <List className="w-4 h-4 text-slate-400" />
                    Number of Questions
                </label>
                <span className="text-base md:text-lg font-bold text-[#07bc0c] bg-[#07bc0c]/10 px-3 py-1 rounded-lg">{settings.questionCount}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.questionCount}
                onChange={(e) => setSettings({ ...settings, questionCount: parseInt(e.target.value) })}
                className="w-full accent-[#07bc0c] h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              />
              <div className="flex justify-between text-xs font-bold text-slate-300 mt-2">
                <span>10</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Time Per Question */}
            <div className="mb-8 md:mb-10">
              <div className="flex justify-between mb-4">
                <label className={`text-sm md:text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    <Clock className="w-4 h-4 text-slate-400" />
                    Time per Question
                </label>
                <span className="text-base md:text-lg font-bold text-[#07bc0c] bg-[#07bc0c]/10 px-3 py-1 rounded-lg">{settings.timePerQuestion}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={settings.timePerQuestion}
                onChange={(e) => setSettings({ ...settings, timePerQuestion: parseInt(e.target.value) })}
                className="w-full accent-[#07bc0c] h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              />
            </div>

             {/* Total Time Limit */}
             <div className="mb-6">
              <div className="flex justify-between mb-4">
                <label className={`text-sm md:text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    <BarChart className="w-4 h-4 text-slate-400" />
                    Total Duration Limit
                </label>
                <span className="text-base md:text-lg font-bold text-[#07bc0c] bg-[#07bc0c]/10 px-3 py-1 rounded-lg">
                    {settings.totalTimeLimit === 0 ? 'Unlimited' : `${settings.totalTimeLimit} min`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={settings.totalTimeLimit}
                onChange={(e) => setSettings({ ...settings, totalTimeLimit: parseInt(e.target.value) })}
                className="w-full accent-[#07bc0c] h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              />
              <p className="text-xs md:text-sm text-slate-400 mt-3 font-medium text-center">Set to 0 for unlimited time.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 w-full backdrop-blur-md border-t p-4 md:p-6 z-10 flex justify-center pb-12 transition-colors ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <button
          onClick={handleStart}
          disabled={!selectedTopic || (currentTopicStatus?.isLocked || false)}
          className={`
            flex items-center gap-3 px-8 md:px-10 py-3 md:py-4 rounded-full text-lg md:text-xl font-bold shadow-xl transition-all transform hover:scale-105 active:scale-95
            ${(!selectedTopic || currentTopicStatus?.isLocked) 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-[#07bc0c] text-white hover:bg-[#06a00a] hover:shadow-[#07bc0c]/40'}
          `}
        >
          <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
          Start Quiz
        </button>
      </div>
    </div>
  );
};

export default QuizConfig;
