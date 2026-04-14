import { GoogleGenAI, Type } from "@google/genai";
import { SlideData } from "../types";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is automatically injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePresentation = async (topicOrContext: string): Promise<SlideData[]> => {
  const model = "gemini-2.5-flash";
  
  const systemInstruction = `You are an expert product manager and pitch deck creator. 
  Your goal is to create a compelling, structured presentation for a new app idea.
  The presentation should be between 6 to 8 slides long.

  You will be provided with a description of an app idea, the content of a GitHub repository, or both.
  
  If provided with both, combine the user's vision with the technical implementation details from the repository to create a comprehensive pitch that highlights the business value of the technology.
  If provided with only repository content, analyze the code structure, README, and dependencies to infer the product's value proposition.
  
  Structure the deck as follows:
  1. Title Slide (Name of app + Catchy slogan)
  2. The Problem (What user pain point does it solve?)
  3. The Solution (High-level overview of the app)
  4. Key Features (List 3-4 distinct features)
  5. Target Market (Who is this for?)
  6. Business Model (How does it make money?)
  7. Conclusion/Call to Action
  
  Ensure the tone is professional, enthusiastic, and persuasive.`;

  const prompt = `Create a pitch deck for the following context:\n\n${topicOrContext}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  contentPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  speakerNotes: { type: Type.STRING },
                  slideType: { 
                    type: Type.STRING,
                    enum: ['title', 'content', 'feature', 'summary']
                  }
                },
                required: ['title', 'contentPoints', 'speakerNotes', 'slideType']
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const data = JSON.parse(text);
    return data.slides || [];

  } catch (error) {
    console.error("Error generating presentation:", error);
    throw new Error("Failed to generate presentation. Please try again.");
  }
};

export const generateScript = async (slides: SlideData[]): Promise<string> => {
  const model = "gemini-2.5-flash";
  const slideContext = slides.map((s, i) => `Slide ${i+1}: ${s.title}\nPoints: ${s.contentPoints.join(', ')}\nNotes: ${s.speakerNotes}`).join('\n\n');
  
  const prompt = `Create an engaging, word-for-word presentation script for a speaker presenting this slide deck. 
  The script should be continuous and flow naturally between slides. 
  Use the speaker notes as a base but expand them into a full narrative suitable for a 3-minute pitch.
  
  Slides Content:
  ${slideContext}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    return response.text || "Could not generate script.";
  } catch (error) {
    console.error("Script generation error:", error);
    throw new Error("Failed to generate script.");
  }
}

export const generateVideo = async (promptText: string): Promise<{ url: string, type: 'video' | 'image' }> => {
  const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Sanitized concept for safer generation
  const cleanConcept = promptText
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .substring(0, 50)
    .trim() || "Innovative App";

  // Helper: Attempt to generate video with a specific Veo model
  const attemptVeoGeneration = async (modelName: string) => {
      console.log(`Attempting video generation with ${modelName}...`);
      const videoPrompt = `Cinematic product commercial for ${cleanConcept}, 4k, professional lighting`;
      
      let operation = await client.models.generateVideos({
          model: modelName,
          prompt: videoPrompt,
          config: {
              aspectRatio: '16:9',
              resolution: '720p'
          }
      });

      // Poll for completion
      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await client.operations.getVideosOperation({ operation: operation });
      }

      if (operation.error) {
          throw new Error(`Veo Error: ${operation.error.message}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
          throw new Error("Veo filtered the content.");
      }

      // Add API key to fetch the video bytes
      const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoRes.ok) throw new Error("Failed to fetch video blob");
      
      const blob = await videoRes.blob();
      return URL.createObjectURL(blob);
  };

  // Helper: Fallback to Image Generation (Flash Image -> Imagen 3 Backup)
  const attemptImageFallback = async () => {
      console.log("Falling back to Image generation...");
      const imagePrompt = `Professional cinematic product photography of ${cleanConcept}, studio lighting, 4k, high quality, photorealistic, 16:9 aspect ratio`;
      
      // Sub-Attempt 1: Gemini 2.5 Flash Image (Standard)
      try {
          const response = await client.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [{ text: imagePrompt }],
              },
              config: {
                 // @ts-ignore
                 imageConfig: {
                     aspectRatio: '16:9'
                 }
              }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
      } catch (e) {
          console.warn("Gemini Flash Image attempt failed, trying Imagen backup...", e);
      }

      // Sub-Attempt 2: Imagen 3 (Backup)
      try {
          console.log("Attempting Imagen backup...");
          const response = await client.models.generateImages({
              model: 'imagen-3.0-generate-001',
              prompt: imagePrompt,
              config: {
                  numberOfImages: 1,
                  aspectRatio: '16:9',
                  outputMimeType: 'image/jpeg'
              }
          });
          
          const b64 = response.generatedImages?.[0]?.image?.imageBytes;
          if (b64) {
              return `data:image/jpeg;base64,${b64}`;
          }
      } catch (e) {
          console.warn("Imagen backup failed.", e);
      }

      throw new Error("No image generated in fallback.");
  };

  // Helper: Fail-safe Placeholder (Guarantees no crashes)
  const getPlaceholder = () => {
      const encoded = encodeURIComponent(cleanConcept);
      return `https://placehold.co/1280x720/F1F5F9/1E293B?text=${encoded}&font=roboto`;
  }

  // STAGE 1: Try Veo 3.1 (Standard)
  try {
      const videoUrl = await attemptVeoGeneration('veo-3.1-fast-generate-preview');
      return { url: videoUrl, type: 'video' };
  } catch (error: any) {
      console.warn("Veo 3.1 failed (404/Safety). Attempting Veo 2.0 fallback...", error.message);
      
      // STAGE 2: Try Veo 2.0 (User requested fallback)
      try {
          const videoUrl = await attemptVeoGeneration('veo-2.0-generate-001');
          return { url: videoUrl, type: 'video' };
      } catch (veo2Error: any) {
          console.warn("Veo 2.0 failed. Switching to image fallback.", veo2Error.message);

          // STAGE 3: Fallback to AI Image (Flash Image or Imagen)
          try {
              const imageUrl = await attemptImageFallback();
              return { url: imageUrl, type: 'image' };
          } catch (fallbackError: any) {
              console.warn("AI Visual generation completely failed. Using placeholder.", fallbackError);
              
              // STAGE 4: Final Fail-safe (Static Placeholder)
              // This ensures the user NEVER sees a crash or error message.
              return { url: getPlaceholder(), type: 'image' };
          }
      }
  }
}