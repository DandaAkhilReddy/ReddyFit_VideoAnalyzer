import React, { useState, useCallback, useRef, useEffect } from 'react';
import { extractFramesFromVideo } from './utils/frameExtractor';
import { analyzeVideoWithFrames, generateWorkoutPlan, generateExerciseVideo, WorkoutPlan, Exercise } from './services/geminiService';
import { ApiKeyError } from './utils/errors';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';
import { getCachedVideo, cacheVideo } from './database/videoCache';


const ANALYSIS_PROMPT = "You are an expert fitness coach and gym equipment specialist. Analyze these frames from a video taken in a gym. Your task is to perform the following two steps:\n\n1.  **Identify Equipment:** Meticulously identify every piece of workout equipment visible in the video frames. Present this as a clear, bulleted list under a '### Equipment' heading.\n\n2.  **List Exercises per Equipment:** For each piece of equipment you identified, create a sub-list of possible exercises that can be performed using it. Be comprehensive and cover different muscle groups.\n\nFormat your entire response in Markdown, using headings for each section.";

const UploadIcon: React.FC = () => (
  <svg className="w-12 h-12 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);
const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);


const Loader: React.FC<{text?: string, subtext?: string}> = ({text, subtext}) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
    <p className="text-lg font-semibold text-purple-300">{text || 'Analyzing...'}</p>
    {subtext && <p className="text-sm text-gray-400 text-center">{subtext}</p>}
  </div>
);


const App: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingState, setLoadingState] = useState({ active: false, message: '', subtext: ''});
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
    const [equipmentList, setEquipmentList] = useState<string | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null); // Holds the name of the exercise being generated
    const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({}); // Maps exercise name to URL
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);


    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            }
        };
        checkApiKey();
    }, []);

    const resetState = () => {
        setVideoFile(null);
        setVideoUrl(null);
        setAnalysis(null);
        setError(null);
        setWorkoutPlan(null);
        setEquipmentList(null);
        setIsGeneratingVideo(null);
        setGeneratedVideos({});
        setLastFailedAction(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        resetState();
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
        } else {
            setError("Please select a valid video file.");
        }
    };
    
    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        resetState();
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
        } else {
            setError("Please drop a valid video file.");
        }
    }
    
    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }

    const handleAnalyzeClick = useCallback(async () => {
        if (!videoFile) return;

        setLoadingState({ active: true, message: 'Analyzing...', subtext: 'Extracting frames and identifying equipment... this may take a moment.' });
        setError(null);
        setLastFailedAction(null);
        setAnalysis(null);
        setWorkoutPlan(null);
        setEquipmentList(null);

        try {
            const frames = await extractFramesFromVideo(videoFile, 10, 10);
            if (frames.length === 0) throw new Error("Could not extract any frames from the video.");
            
            const result = await analyzeVideoWithFrames(
                ANALYSIS_PROMPT, 
                frames,
                (attempt, maxAttempts) => {
                    setLoadingState(prev => ({ ...prev, subtext: `Model is busy. Retrying... (Attempt ${attempt + 1}/${maxAttempts})` }));
                }
            );
            setAnalysis(result);

            const equipmentRegex = /###\s+Equipment\s*([\s\S]*?)(?:###|$)/i;
            const equipmentMatch = result.match(equipmentRegex);
            if (equipmentMatch && equipmentMatch[1]) {
                const list = equipmentMatch[1].split('\n').map(line => line.replace(/[-*]\s*/, '').trim()).filter(Boolean);
                const equipmentString = list.join(', ');
                if (equipmentString) {
                    setEquipmentList(equipmentString);
                }
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred during analysis.');
            setLastFailedAction(() => () => handleAnalyzeClick());
        } finally {
            setLoadingState({ active: false, message: '', subtext: '' });
        }
    }, [videoFile]);

    const handleGeneratePlanClick = useCallback(async () => {
        if (!equipmentList) return;
        
        setLoadingState({ active: true, message: 'Generating Plan...', subtext: 'Crafting a personalized workout plan based on your equipment.'});
        setError(null);
        setLastFailedAction(null);
        setWorkoutPlan(null);
        
        try {
            const plan = await generateWorkoutPlan(equipmentList, (attempt, maxAttempts) => {
                 setLoadingState(prev => ({ ...prev, subtext: `Model is busy. Retrying... (Attempt ${attempt + 1}/${maxAttempts})` }));
            });
            setWorkoutPlan(plan);
        } catch (e: any) {
            setError(e.message || 'Failed to generate workout plan.');
            setLastFailedAction(() => () => handleGeneratePlanClick());
        } finally {
            setLoadingState({ active: false, message: '', subtext: '' });
        }
    }, [equipmentList]);

    const handleGenerateVideoClick = useCallback(async (exercise: Exercise) => {
        if (!apiKeySelected) {
            if (window.aistudio?.openSelectKey) {
                try {
                    await window.aistudio.openSelectKey();
                    setApiKeySelected(true); // Assume success to avoid race conditions
                } catch (e) {
                    console.error("Could not open API key dialog", e);
                    setError("You must select an API key to generate videos.");
                    return;
                }
            } else {
                 setError("API key selection is not available in this environment.");
                return;
            }
        }

        const cachedVideo = getCachedVideo(exercise.name);
        if (cachedVideo) {
            setGeneratedVideos(prev => ({ ...prev, [exercise.name]: cachedVideo }));
            return;
        }

        setIsGeneratingVideo(exercise.name);
        setError(null);
        try {
            const videoUrl = await generateExerciseVideo(exercise.name);
            setGeneratedVideos(prev => ({ ...prev, [exercise.name]: videoUrl }));
            cacheVideo(exercise.name, videoUrl);
        } catch (e) {
            if (e instanceof ApiKeyError) {
                setError(e.message);
                setApiKeySelected(false); // Reset key state on this specific error
            } else if (e instanceof Error) {
                setError(`Failed to generate video for ${exercise.name}: ${e.message}`);
            } else {
                setError(`An unknown error occurred while generating video for ${exercise.name}.`);
            }
        } finally {
            setIsGeneratingVideo(null);
        }
    }, [apiKeySelected]);

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-purple-400">ReddyFit AI</h1>
                    <p className="text-gray-400 mt-2">Your AI-powered personal trainer. Upload a video of your gym to get started.</p>
                </header>

                <main>
                    <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
                        {!videoFile ? (
                             <label 
                                onDrop={handleDrop} 
                                onDragOver={handleDragOver}
                                htmlFor="video-upload" 
                                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadIcon />
                                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">MP4, MOV, AVI, etc.</p>
                                </div>
                                <input id="video-upload" ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="flex flex-col items-center space-y-4">
                               <video src={videoUrl ?? ''} controls className="w-full max-w-md rounded-lg shadow-md"></video>
                               <div className="flex space-x-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
                                >
                                    Change Video
                                </button>
                                <button
                                    onClick={handleAnalyzeClick}
                                    disabled={loadingState.active}
                                    className="px-6 py-2 bg-purple-600 rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors font-semibold"
                                >
                                    {loadingState.active ? 'Processing...' : 'Analyze Gym Equipment'}
                                </button>
                               </div>
                            </div>
                        )}
                    </div>

                    {error && (
                         <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                            {lastFailedAction && (
                                <div className="mt-2">
                                    <button
                                        onClick={() => {
                                            setError(null);
                                            lastFailedAction();
                                        }}
                                        className="px-4 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-500 font-semibold text-sm"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {loadingState.active && <Loader text={loadingState.message} subtext={loadingState.subtext} />}

                    {analysis && !loadingState.active && (
                        <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8 prose prose-invert max-w-none">
                             <div dangerouslySetInnerHTML={{ __html: analysis.replace(/###\s/g, '<h3>').replace(/-\s/g, '<li>') }} />
                            {equipmentList && (
                                <div className="text-center mt-6">
                                    <button
                                        onClick={handleGeneratePlanClick}
                                        disabled={loadingState.active}
                                        className="px-6 py-2 bg-green-600 rounded-md hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed transition-colors font-semibold"
                                    >
                                        {loadingState.active ? 'Generating...' : 'Generate My Workout Plan'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {workoutPlan && !loadingState.active && (
                        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                            <h2 className="text-2xl font-bold text-center mb-6 text-purple-400">Your 3-Day Workout Plan</h2>
                            <div className="space-y-6">
                                {workoutPlan.map(day => (
                                    <div key={day.day} className="bg-gray-700 p-4 rounded-md">
                                        <h3 className="font-bold text-lg mb-3">{day.day}</h3>
                                        <ul className="space-y-2">
                                            {day.exercises.map(exercise => (
                                                <li key={exercise.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 bg-gray-600 rounded">
                                                    <div>
                                                        <span className="font-semibold">{exercise.name}</span>
                                                        <span className="text-sm text-gray-400 ml-2">{exercise.sets} sets of {exercise.reps} reps</span>
                                                    </div>
                                                     <div className="mt-2 sm:mt-0">
                                                        {generatedVideos[exercise.name] ? (
                                                            <div className="w-full sm:w-64">
                                                                <ExerciseVideoPlayer src={generatedVideos[exercise.name]} />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleGenerateVideoClick(exercise)}
                                                                disabled={!!isGeneratingVideo}
                                                                className="flex items-center text-sm px-3 py-1.5 bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isGeneratingVideo === exercise.name ? (
                                                                    <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                                                    Generating...
                                                                    </>
                                                                ) : (
                                                                     <><PlayIcon className="w-4 h-4 mr-1" /> Generate Video</>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                             {!apiKeySelected && 
                                <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center">
                                    <p className="text-yellow-200">To generate exercise videos, you'll need to select an API key.</p>
                                    <p className="text-xs text-yellow-400 mb-2">Video generation uses the Veo model and may incur costs. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">billing details</a>.</p>
                                    <button 
                                        onClick={async () => {
                                             if (window.aistudio) {
                                                try {
                                                    await window.aistudio.openSelectKey();
                                                    setApiKeySelected(true);
                                                } catch (e) {
                                                    setError("Could not open API key selection dialog.");
                                                }
                                            }
                                        }}
                                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded"
                                    >
                                        Select API Key
                                    </button>
                                </div>
                            }
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

export default App;