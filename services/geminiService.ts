import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const getAI = () => {
  // Ideally, this would be handled by a context provider, but for simplicity in this structure:
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    // We don't throw here to allow the UI to render a friendly error if needed,
    // but the app assumes the key exists per instructions.
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Helper to remove the data URL prefix for the API
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
};

/**
 * Feature: Magic Caption
 * Model: gemini-2.5-flash
 */
export const generateMemeCaptions = async (imageBase64: string): Promise<string[]> => {
  const ai = getAI();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(imageBase64)
            }
          },
          {
            text: "You are a funny meme generator. Analyze this image and generate 5 short, punchy, viral-style meme captions (top text / bottom text style combined into one sentence). Return purely a JSON array of strings."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

/**
 * Feature: Nano Banana Image Editing
 * Model: gemini-2.5-flash-image
 */
export const editImageWithAI = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = getAI();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(imageBase64)
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
       return `data:image/png;base64,${part.inlineData.data}`;
    }
    
    throw new Error("No image data returned from AI editing.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Feature: Analyze Image
 * Model: gemini-2.5-flash (Changed to Flash for better JSON handling of object lists)
 */
export const analyzeImageDeeply = async (imageBase64: string): Promise<AnalysisResult> => {
  const ai = getAI();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(imageBase64)
            }
          },
          {
            text: "Analyze this image. Provide a short description and a list of distinct visual elements or objects found in the image that could be turned into stickers."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            detectedObjects: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    return { description: "Analysis failed.", detectedObjects: [] };
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

/**
 * Feature: Generate Sticker
 * Model: imagen-4.0-generate-001
 */
export const generateSticker = async (prompt: string): Promise<string> => {
  const ai = getAI();

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A high-quality, vector art style die-cut sticker of ${prompt}. White thick outline, isolated on a plain white background. Vibrant colors.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });

    const generatedImage = response.generatedImages?.[0]?.image;
    if (generatedImage && generatedImage.imageBytes) {
      return `data:image/png;base64,${generatedImage.imageBytes}`;
    }
    throw new Error("No sticker generated.");
  } catch (error) {
    console.error("Error generating sticker:", error);
    throw error;
  }
};

/**
 * Feature: Generate Video (Veo)
 * Model: veo-3.1-fast-generate-preview
 */
export const generateMemeVideo = async (prompt: string): Promise<string> => {
  // Check for API key in window.aistudio if running in AI Studio context
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }
  
  // Create fresh instance to ensure key is picked up
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No URI returned");

    // The URI requires the API key appended to fetch the raw bytes
    const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
    return videoUrl;

  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};