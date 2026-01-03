
import { GoogleGenAI, Chat } from "@google/genai";
import { QuizQuestion, UploadedFile } from "../types";

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
        const firstBracket = cleaned.indexOf('[');
        const firstBrace = cleaned.indexOf('{');
        let start = -1;
        let end = -1;
        if (firstBracket !== -1 && (firstBrace === -1 || (firstBracket < firstBrace))) {
            start = firstBracket;
            end = cleaned.lastIndexOf(']');
        } else if (firstBrace !== -1) {
            start = firstBrace;
            end = cleaned.lastIndexOf('}');
        }
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.substring(start, end + 1));
            } catch (innerError) {
                console.error("Internal parsing fail", innerError);
            }
        }
        throw new Error("Invalid AI JSON format.");
    }
};

export const analyzeTopics = async (file: UploadedFile): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
        parts: [
            { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
            { text: "Analyze this document and extract the 5 most distinct study topics. Return ONLY a JSON array of strings. Example: [\"Topic A\", \"Topic B\"]" }
        ]
    }
  });
  return parseJsonResponse(response.text || "[]");
};

export const generateQuiz = async (file: UploadedFile, topic: string, count: number): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate exactly ${count} multiple choice questions about "${topic}" based on the provided PDF.
  REQUIRED JSON FORMAT (NO MARKDOWN):
  [{"id":"1","text":"Question?","options":["A","B","C","D"],"correctAnswerIndex":0,"explanation":"Explain","sourcePage":1,"sourceContext":"Quote"}]`;

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

export const createChatSession = async (file: UploadedFile): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
        systemInstruction: `You are StudyHub Assistant. Provide educational support based ONLY on the provided document.
        STRICT FORMATTING RULES:
        1. DO NOT use the # symbol for headers. Use uppercase text for titles instead.
        2. DO NOT use the * symbol (asterisks) for emphasis, bolding, or lists. 
        3. For lists, use simple numbers (1, 2, 3) or dashes (-).
        4. Cite page numbers for every fact using this exact format: [p. X]. 
        5. If info is missing, say "I cannot find this in the document."
        6. Maintain an academic, helpful tone.
        7. Be concise but thorough.
        8. REMINDER: Absolutely no # or * characters allowed in your output.
        9. FOLLOW-UP REQUIREMENT: Every single response MUST end with a friendly follow-up question asking the user if they have any other tasks, if they need further explanation regarding the document, the response, or if anything remains unclear.`
    }
  });

  await chat.sendMessage({
    message: [
        { inlineData: { mimeType: getMimeType(file), data: cleanBase64(file.data) } },
        { text: "System: Document Uploaded. Ingest context and verify ready for analysis. Remember: Do not use # or * in any response and always ask a follow-up question." }
    ]
  });
  return chat;
};

export interface FeedbackResult {
    strengths: string[];
    weaknesses: string[];
    focusArea: string;
    summary: string;
}

export const getQuizFeedback = async (file: UploadedFile, questions: QuizQuestion[], results: { questionId: string, isCorrect: boolean }[]): Promise<FeedbackResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const resultData = results.map(r => ({ question: questions.find(q => q.id === r.questionId)?.text, ok: r.isCorrect }));
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
