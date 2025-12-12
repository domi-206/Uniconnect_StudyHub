import { GoogleGenAI, Chat } from "@google/genai";
import { QuizQuestion, UploadedFile, ChatMessage } from "../types";

// Helper to remove base64 header
const cleanBase64 = (data: string) => {
  const parts = data.split(',');
  return parts.length > 1 ? parts[1] : parts[0];
};

const getMimeType = (file: UploadedFile) => {
    if (file.type === 'application/pdf') return 'application/pdf';
    return 'text/plain'; // Fallback
}

export const analyzeTopics = async (file: UploadedFile): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // OPTIMIZATION: Shorter prompt, requesting simpler output to reduce latency
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: "List 5-8 main topics from this document. Return ONLY a valid JSON array of strings. No markdown. Example: [\"Topic A\", \"Topic B\"]" }
        ]
    }
  });

  if (response.text) {
    try {
        const text = response.text;
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
             return JSON.parse(text.substring(start, end + 1));
        }
        return JSON.parse(text); 
    } catch (e) {
        console.warn("JSON parse failed, attempting cleanup", e);
        const cleanedText = response.text.replace(/```json|```/g, '').trim();
        try {
             return JSON.parse(cleanedText);
        } catch (e2) {
            return ["General Content"];
        }
    }
  }
  return ["General Content"];
};

export const generateQuiz = async (
  file: UploadedFile, 
  topic: string, 
  count: number
): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // OPTIMIZATION: Concise instructions to reduce processing time
  const prompt = `Create ${count} multiple-choice questions on "${topic}". 
  Return raw JSON array.
  Format: [{"id":"1","text":"?","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"Why"}]
  No markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: prompt }
        ]
    }
  });

  if (response.text) {
     try {
        const text = response.text;
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
             return JSON.parse(text.substring(start, end + 1));
        }
        return JSON.parse(text);
     } catch (e) {
         console.error("Quiz JSON parse failed", e);
         const cleaned = response.text.replace(/```json|```/g, '').trim();
         try {
            return JSON.parse(cleaned);
         } catch (e2) {
            throw new Error("Failed to parse quiz generation.");
         }
     }
  }
  throw new Error("Failed to generate quiz");
};

export interface FeedbackResult {
    strengths: string[];
    weaknesses: string[];
    focusArea: string;
    summary: string;
}

export const getQuizFeedback = async (
  file: UploadedFile,
  questions: QuizQuestion[], 
  results: { questionId: string, isCorrect: boolean }[]
): Promise<FeedbackResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const weakAreas = results
    .filter(r => !r.isCorrect)
    .map(r => {
        const q = questions.find(q => q.id === r.questionId);
        return q ? q.text : '';
    })
    .join("\n");
  
  const strongAreas = results
    .filter(r => r.isCorrect)
    .map(r => {
        const q = questions.find(q => q.id === r.questionId);
        return q ? q.text : '';
    })
    .join("\n");

  // FORMATTING INSTRUCTION: Explicitly request paragraph structure and bolding
  const prompt = `User took a quiz.
  Correct: ${strongAreas}
  Incorrect: ${weakAreas}
  
  Return a JSON object with this EXACT structure (valid JSON, no markdown code blocks):
  {
      "strengths": ["List 2 specific strong concepts. Use **bold** for key terms."],
      "weaknesses": ["List 2 specific weak concepts. Use **bold** for key terms."],
      "focusArea": "Write a clear paragraph explaining exactly what to study. Use **bold** for section names.",
      "summary": "One encouraging sentence."
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: prompt }
        ]
    }
  });

  if (response.text) {
      try {
        const text = response.text;
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             return JSON.parse(text.substring(start, end + 1));
        }
        return JSON.parse(text);
      } catch (e) {
          console.error("Feedback parse failed", e);
      }
  }

  return {
      strengths: ["**General Concepts** were understood."],
      weaknesses: ["Specific **details** need review."],
      focusArea: "Review the document chapters related to the incorrect answers.",
      summary: "Keep practicing to improve your score."
  };
};

/**
 * Creates a persistent chat session initialized with the document.
 * This ensures the file is uploaded only once, speeding up subsequent messages.
 */
export const createChatSession = async (file: UploadedFile): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
        systemInstruction: "You are a helpful AI study assistant. Answer questions based on the provided document. Be concise. Use markdown with **bold** for key terms."
    }
  });

  // Prime the chat with the document content immediately
  try {
      await chat.sendMessage({
        message: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: "Here is the document I want to study. Please analyze it and prepare to answer questions about it." }
        ]
      });
  } catch (e) {
      console.error("Failed to initialize chat with document", e);
      throw e;
  }

  return chat;
};
