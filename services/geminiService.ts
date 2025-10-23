import { GoogleGenAI, Part, Type } from "@google/genai";
import { ApiKeyError } from '../utils/errors';

type ProgressCallback = (attempt: number, maxAttempts: number) => void;

/**
 * Analyzes a series of video frames using the Gemini API with retry logic for transient errors.
 * @param prompt The text prompt to guide the analysis.
 * @param frames An array of base64-encoded image strings (frames from the video).
 * @param onProgress A callback function to report retry progress.
 * @returns A promise that resolves with the text analysis from the Gemini API.
 */
export const analyzeVideoWithFrames = async (
    prompt: string, 
    frames: string[],
    onProgress?: ProgressCallback
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imageParts: Part[] = frames.map(frameData => {
        const base64Data = frameData.split(',')[1];
        if (!base64Data) {
            throw new Error("Invalid frame data format.");
        }
        return {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            }
        };
    });
    
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [{ text: prompt }, ...imageParts] },
                config: {
                    thinkingConfig: {
                        thinkingBudget: 32768,
                    },
                },
            });
            return response.text; // Success!
        } catch (e) {
            console.error(`Error analyzing video with Gemini (attempt ${attempt}/${MAX_RETRIES}):`, e);
            lastError = e instanceof Error ? e : new Error(String(e));
            
            const errorMessage = lastError.message.toLowerCase();
            // Only retry for 503/overloaded/unavailable errors
            if ((errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("unavailable")) && attempt < MAX_RETRIES) {
                onProgress?.(attempt, MAX_RETRIES);
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                console.log(`Model is overloaded. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // For other errors or on the last attempt, break the loop to throw the error
                break;
            }
        }
    }
    
    // If we've exited the loop due to failure, throw a user-friendly error.
    if (lastError) {
        const errorMessage = lastError.message.toLowerCase();
        if (errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("unavailable")) {
            // Provide a specific, user-friendly message for overload errors.
            throw new Error(`The AI model is currently overloaded. We tried several times without success. Please try again in a few moments.`);
        }
        // For other errors, pass the message along.
        throw new Error(`Failed to get analysis from Gemini API: ${lastError.message}`);
    }

    // This should not be reached, but is a fallback.
    throw new Error("An unknown error occurred while communicating with the Gemini API after all retries.");
};


export interface Exercise {
    name: string;
    sets: string;
    reps: string;
}

export interface WorkoutDay {
    day: string;
    exercises: Exercise[];
}

export type WorkoutPlan = WorkoutDay[];


/**
 * Generates a structured workout plan in JSON format based on a list of available equipment.
 * @param equipmentList A comma-separated string of available gym equipment.
 * @param onProgress A callback function to report retry progress.
 * @returns A promise that resolves to a WorkoutPlan object.
 */
export const generateWorkoutPlan = async (equipmentList: string, onProgress?: ProgressCallback): Promise<WorkoutPlan> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `You are an expert fitness planner. Based on the following available gym equipment, create a 3-day full-body workout split plan designed for an intermediate user. The plan should ensure each major muscle group is worked effectively and has at least 48 hours of rest. Format the response as a JSON array. Each object in the array should represent a workout day and must have two properties: 'day' (a string like 'Day 1') and 'exercises' (an array of exercise objects). Each exercise object must have 'name', 'sets', and 'reps' string properties. Available equipment: ${equipmentList}`;

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                day: { type: Type.STRING },
                                exercises: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            sets: { type: Type.STRING },
                                            reps: { type: Type.STRING },
                                        },
                                        required: ["name", "sets", "reps"],
                                    }
                                }
                            },
                            required: ["day", "exercises"],
                        }
                    }
                }
            });
            return JSON.parse(response.text); // Success!
        } catch (e) {
            console.error(`Error generating workout plan (attempt ${attempt}/${MAX_RETRIES}):`, e);
            lastError = e instanceof Error ? e : new Error(String(e));
            
            const errorMessage = lastError.message.toLowerCase();
            if ((errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("unavailable")) && attempt < MAX_RETRIES) {
                onProgress?.(attempt, MAX_RETRIES);
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Model is overloaded. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                break;
            }
        }
    }

    if (lastError) {
        const errorMessage = lastError.message.toLowerCase();
        if (errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("unavailable")) {
            throw new Error(`The AI model is currently overloaded. We tried several times without success. Please try again in a few moments.`);
        }
        throw new Error(`Failed to generate workout plan from Gemini API: ${lastError.message}`);
    }
    
    throw new Error("An unknown error occurred while generating the workout plan after all retries.");
}

/**
 * Generates a video for a specific exercise prompt using the Veo model.
 * @param exerciseName The name of the exercise to generate a video for.
 * @param onProgress A callback function to report retry progress.
 * @returns A promise that resolves with the URI of the generated video.
 */
export const generateExerciseVideo = async (exerciseName: string, onProgress?: ProgressCallback): Promise<string> => {
    // Create a new instance right before the API call to ensure the latest key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A clear, instructional, cinematic video of a person named Reddy, wearing a black t-shirt with the word "reddyfit" written in white text, performing a ${exerciseName} with proper form in a well-lit, modern gym setting.`;
    
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    let operation;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });
            lastError = null; // Clear last error on success
            break; // Exit retry loop
        } catch (e) {
            console.error(`Error starting video generation (attempt ${attempt}/${MAX_RETRIES}):`, e);
            lastError = e instanceof Error ? e : new Error(String(e));
            const errorMessage = lastError.message.toLowerCase();

            if ((errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("unavailable")) && attempt < MAX_RETRIES) {
                onProgress?.(attempt, MAX_RETRIES);
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Video generation model is overloaded. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                break;
            }
        }
    }

    if (!operation) {
        if (lastError) {
             if (lastError.message.toLowerCase().includes("503") || lastError.message.toLowerCase().includes("overloaded") || lastError.message.toLowerCase().includes("unavailable")) {
                throw new Error(`The video generation model is currently overloaded. We tried several times without success. Please try again in a few moments.`);
            }
            if (lastError.message.includes("Requested entity was not found.")) {
                throw new ApiKeyError("API key not found or invalid. Please select a key.");
            }
            throw new Error(`Failed to start video generation from Gemini API: ${lastError.message}`);
        }
        throw new Error("An unknown error occurred while starting the video generation.");
    }

    try {
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }
        
        return `${downloadLink}&key=${process.env.API_KEY}`;

    } catch (e) {
        console.error("Error during video generation polling:", e);
        if (e instanceof Error) {
             if (e.message.includes("Requested entity was not found.")) {
                throw new ApiKeyError("API key not found or invalid. Please select a key.");
            }
            throw new Error(`Failed during video generation process: ${e.message}`);
        }
        throw new Error("An unknown error occurred while generating the video.");
    }
}