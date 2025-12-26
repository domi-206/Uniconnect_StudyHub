
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
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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

  const prompt = `Create ${count} multiple-choice questions on "${topic}" based on the uploaded document.
  For each question, you MUST identify the exact page number it references.
  Return raw JSON array.
  Format: [{"id":"1","text":"?","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"Why","sourcePage": 5, "sourceContext": "The snippet of text proving the answer"}]
  No markdown blocks. Ensure sourcePage is an integer representing the PDF page.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
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

  const prompt = `User took a quiz.
  Correct answers related to: ${strongAreas}
  Incorrect answers related to: ${weakAreas}
  
  Analyze their performance against the document content.
  Return a JSON object:
  {
      "strengths": ["List 2 specific strong concepts."],
      "weaknesses": ["List 2 specific weak concepts."],
      "focusArea": "Paragraph on what to study. Use **bold** for key terms.",
      "summary": "One encouraging sentence."
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
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

export const createChatSession = async (file: UploadedFile): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const chat = ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
        systemInstruction: `You are StudyHub AI, a professional study assistant. 
        ALWAYS back your answers with specific references from the uploaded document.
        Use citations in the format [p. X] where X is the page number. 
        Example: "According to the analysis, the climate is changing [p. 12]."
        Be concise, use markdown, and ensure your citations are accurate based on the document's structure.`
    }
  });

  try {
      await chat.sendMessage({
        message: {
            parts: [
                { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
                { text: "Here is the document. Please analyze it. From now on, whenever you answer, provide the page number as a citation like [p. X]." }
            ]
        }
      });
  } catch (e) {
      console.error("Failed to initialize chat with document", e);
      throw e;
  }

  return chat;
};
