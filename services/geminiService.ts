
import { GoogleGenAI, Chat, Modality, Type } from "@google/genai";
import { QuizQuestion, UploadedFile, VoiceAccent, ContentTone, PodcastSettings, PodcastSegment } from "../types";

export interface FeedbackResult {
  strengths: string[];
  weaknesses: string[];
  focusArea: string;
  summary: string;
}

const cleanBase64 = (data: string) => {
  const parts = data.split(',');
  return parts.length > 1 ? parts[1] : parts[0];
};

const getMimeType = (file: UploadedFile) => {
    return file.type === 'application/pdf' ? 'application/pdf' : 'text/plain';
}

const parseJsonResponse = (text: string) => {
    if (!text) throw new Error("Empty response from AI");
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        const start = cleaned.indexOf('[');
        const startBrace = cleaned.indexOf('{');
        const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
        const startIndex = (start !== -1 && (startBrace === -1 || start < startBrace)) ? start : startBrace;
        
        if (startIndex !== -1 && end !== -1 && end > startIndex) {
            try {
                return JSON.parse(cleaned.substring(startIndex, end + 1));
            } catch (inner) {}
        }
        throw new Error("Invalid AI JSON format.");
    }
};

const getAccentInstruction = (accent: VoiceAccent) => {
  switch (accent) {
    case 'NG': return "using a natural Nigerian English style, with clear Nigerian rhythm and local nuances.";
    case 'UK': return "using a natural British English (UK) style with appropriate British vocabulary.";
    case 'US': return "using a standard American English (US) style.";
  }
};

const getToneInstruction = (tone: ContentTone) => {
  switch (tone) {
    case 'FUNNY': return "Be highly entertaining and witty. Use educational jokes and keep the energy high.";
    case 'PROFESSIONAL': return "Be formal, objective, and precise. Use professional academic terminology.";
    case 'TEACHER': return "Be encouraging and pedagogical. Explain complex ideas with simple analogies.";
    case 'FRIEND': return "Be casual and supportive. Talk like a friendly study buddy.";
  }
};

export const createChatSession = async (file: UploadedFile, accent: VoiceAccent = 'US', tone: ContentTone = 'TEACHER'): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
        systemInstruction: `You are the Unispace Study Assistant. Support the user based ONLY on the provided document.
        STRICT OUTPUT RULES:
        1. NEVER use the # symbol for headers. Use uppercase text for emphasis.
        2. NEVER use the * symbol (asterisks). Use dashes (-) for lists.
        3. Cite page numbers as [p. X].
        4. ACCENT: Speak ${getAccentInstruction(accent)}.
        5. TONE: ${getToneInstruction(tone)}.
        6. ALWAYS end every response with a follow-up question asking if they have any other tasks or need further explanation.`
    }
  });
};

export const initializeChatWithContext = async (chat: Chat, file: UploadedFile) => {
  await chat.sendMessage({
    message: [
        { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
        { text: "System: Context loaded. Start by greeting the user warmly and ask how you can help with their document today." }
    ]
  });
};

export const speakText = async (text: string, accent: VoiceAccent): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanText = text.replace(/[#*]/g, '').trim();
  
  // Default general voices
  const voiceName = accent === 'NG' ? 'Kore' : (accent === 'UK' ? 'Puck' : 'Zephyr');

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Speak this ${getAccentInstruction(accent)}: ${cleanText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
    }
  });
  const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audio) throw new Error("TTS failed");
  return audio;
};

export const generatePodcastContent = async (file: UploadedFile, settings: PodcastSettings): Promise<{ audio: string, segments: PodcastSegment[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { tone, accent, durationMinutes, speakerCount, selectedTopics, hostAName, hostBName } = settings;

  const topicContext = selectedTopics.length > 0 
    ? `FOCUS ONLY ON THESE TOPICS: ${selectedTopics.join(', ')}.` 
    : "Summarize the entire document.";

  const speakerInstruction = speakerCount === 'DOUBLE' 
    ? `Write this as a conversation between two hosts. Host A is named ${hostAName}, Host B is named ${hostBName}. Use '${hostAName}:' and '${hostBName}:' prefixes.` 
    : `Write this as a solo presentation by ${hostAName}. Use '${hostAName}:' prefix.`;

  // Explicit instruction for gender detection and voice assignment
  const scriptResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
      { text: `Create a podcast script based on the attached document. 
               TONE: ${getToneInstruction(tone)}. 
               ${speakerInstruction}
               ${topicContext}
               
               IMPORTANT VOICE ASSIGNMENT:
               1. Analyze host names: Host A (${hostAName}), Host B (${hostBName}).
               2. Inferred gender:
                  - If Female name: Must assign 'Zephyr' or 'Kore' or 'Puck'.
                  - If Male name: Must assign 'Fenrir' or 'Charon'.
               3. Pick best voice matching gender and accent ${accent}:
                  - US: Female='Zephyr', Male='Fenrir'
                  - UK: Female='Puck', Male='Charon'
                  - NG: Female='Kore', Male='Fenrir'
               
               Return a JSON object with:
               'voiceHostA': name of the assigned voice for ${hostAName},
               'voiceHostB': name of the assigned voice for ${hostBName} (if double),
               'segments': array of objects with {startTime, topic, speaker, text}.
               Target duration: ${durationMinutes} minutes.` }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          voiceHostA: { type: Type.STRING },
          voiceHostB: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startTime: { type: Type.NUMBER },
                topic: { type: Type.STRING },
                speaker: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["startTime", "topic", "speaker", "text"]
            }
          }
        },
        required: ["segments", "voiceHostA"]
      }
    }
  });

  const parsed = parseJsonResponse(scriptResponse.text || "{}");
  const segments: PodcastSegment[] = parsed.segments || [];
  const voiceA = parsed.voiceHostA || (accent === 'UK' ? 'Puck' : 'Zephyr');
  const voiceB = parsed.voiceHostB || (accent === 'UK' ? 'Charon' : 'Kore');
  
  const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  const ttsConfig: any = {
    responseModalities: [Modality.AUDIO]
  };

  if (speakerCount === 'DOUBLE') {
    ttsConfig.speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          { speaker: hostAName, voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceA } } },
          { speaker: hostBName, voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceB } } }
        ]
      }
    };
  } else {
    ttsConfig.speechConfig = {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceA } }
    };
  }

  const audioResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: fullText }] }],
    config: ttsConfig
  });

  const audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audio) throw new Error("Podcast audio generation failed");

  return { audio, segments };
};

export const analyzeTopics = async (file: UploadedFile): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: "Extract 5 distinct study topics from this PDF. Return ONLY a JSON array of strings." }
        ]
    }
  });
  return parseJsonResponse(response.text || "[]");
};

export const generateQuiz = async (file: UploadedFile, topic: string, count: number): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate ${count} MCQs for "${topic}" based on this PDF.
  JSON FORMAT: [{"id":"1","text":"Q","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"Why","sourcePage":1}]`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: prompt }
        ]
    }
  });
  return parseJsonResponse(response.text || "[]");
};

export const getQuizFeedback = async (file: UploadedFile, questions: QuizQuestion[], results: { questionId: string, isCorrect: boolean }[]): Promise<FeedbackResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resultData = results.map(r => ({ q: questions.find(q => q.id === r.questionId)?.text, ok: r.isCorrect }));
  const prompt = `Analyze these quiz results: ${JSON.stringify(resultData)}. Return JSON with strengths[], weaknesses[], focusArea (string), summary (string).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: prompt }
        ]
    }
  });
  return parseJsonResponse(response.text || "{}");
};
