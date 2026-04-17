import { GoogleGenAI } from "@google/genai";
import { EventDetails, CallScript } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateCallScript(details: EventDetails, language: 'English' | 'Kannada' = 'English'): Promise<CallScript> {
  const prompt = `
    You are a professional event coordinator. Your task is to write a short, clear, and inviting phone call script for a student fest.
    
    LANGUAGE: ${language}
    
    CRITICAL: You MUST include all the following details in the script:
    - Event Name: ${details.eventName}
    - Date: ${details.date}
    - Time: ${details.time}
    - Location: ${details.location}
    ${details.extraInfo ? `- Additional Details: ${details.extraInfo}` : ""}
    
    Rules:
    - Start with a warm greeting.
    - State clearly that you are calling to invite them to "${details.eventName}".
    - Mention the Date, Time, and Location explicitly.
    - Keep the tone professional yet exciting.
    - The entire script must be under 60 words.
    - Do NOT include any placeholder text like "[Name]" or "imaginary" details.
    - Use simple, easy-to-understand ${language} for a voice call.
    ${language === 'Kannada' ? '- Write the script using Kannada script (not transliterated English).' : ''}
    
    Structure:
    1. Greeting
    2. Invitation to the specific event
    3. Date, Time, and Venue
    4. Closing remark
    
    Output ONLY the script text. No preamble, no quotes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text || (language === 'Kannada' 
      ? `ನಮಸ್ಕಾರ! ${details.eventName} ಗೆ ನಿಮಗೆ ಆಹ್ವಾನವಿದೆ. ಇದು ${details.date} ರಂದು ${details.time} ಕ್ಕೆ ${details.location} ನಲ್ಲಿ ನಡೆಯಲಿದೆ. ದಯವಿಟ್ಟು ಬನ್ನಿ!`
      : `Hello! This is an invitation for ${details.eventName}. It will be held on ${details.date} at ${details.time} in ${details.location}. We hope to see you there!`);
    
    return {
      text,
      wordCount: text.split(/\s+/).length,
    };
  } catch (error) {
    console.error("Error generating script:", error);
    return {
      text: language === 'Kannada'
        ? `ನಮಸ್ಕಾರ! ನಾವು ನಿಮ್ಮನ್ನು ${details.eventName} ಗೆ ಆಹ್ವಾನಿಸಲು ಉತ್ಸುಕರಾಗಿದ್ದೇವೆ. ಈ ಕಾರ್ಯಕ್ರಮವು ${details.date} ರಂದು ${details.time} ಕ್ಕೆ ${details.location} ನಲ್ಲಿ ನಡೆಯಲಿದೆ. ದಯವಿಟ್ಟು ಭಾಗವಹಿಸಿ. ಧನ್ಯವಾದಗಳು!`
        : `Hello! We are excited to invite you to ${details.eventName}. The event is scheduled for ${details.date} at ${details.time}, and the venue is ${details.location}. Please join us for a great time. Thank you!`,
      wordCount: 40,
    };
  }
}
