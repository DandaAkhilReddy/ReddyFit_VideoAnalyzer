import React, { useState, useCallback, useRef, useEffect } from 'react';
import { extractFramesFromVideo } from '../utils/frameExtractor';
import { analyzeVideoWithFrames, generateWorkoutPlan, WorkoutPlan, Exercise, generateExerciseVideo } from '../services/geminiService';
import { ApiKeyError } from '../utils/errors';
import { ExerciseVideoPlayer } from '../ExerciseVideoPlayer';
import * as dbService from '../database/dbService';
import { useToast } from '../hooks/useToast';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { Loader } from './shared/Loader';
import { ErrorMessage } from './shared/ErrorMessage';
import { UploadIcon, PlayIcon, RefreshIcon, ChevronDownIcon } from './shared/icons';
import { renderMarkdown } from '../utils/helpers';
import { ProgressBar } from './shared/ProgressBar';

const ANALYSIS_PROMPT = `You are a world-class AI assistant with an expert eye for identifying gym and fitness equipment. Your primary goal is to meticulously analyze the provided video frames and produce a comprehensive, accurate list of all workout equipment visible. This list is critical for generating a personalized workout plan.

**CRITICAL INSTRUCTIONS:**

1.  **IDENTIFY WITH PRECISION:** Your main task is to identify and list *every single piece of exercise equipment*. Be extremely specific.
    *   **Free Weights:** Don't just say 'dumbbells'; specify if you see 'hex dumbbells', 'adjustable dumbbells', or 'round dumbbells'. Mention 'olympic barbells', 'kettlebells', 'weight plates', and 'ez-curl bars'.
    *   **Machines:** Be specific. Instead of 'cable machine', say 'dual cable crossover machine' or 'lat pulldown machine'. Identify 'leg press machine', 'smith machine', 'hack squat machine', 'treadmill', 'stationary bike', etc.
    *   **Benches & Racks:** Distinguish between a 'flat bench', 'adjustable incline bench', and 'decline bench'. Identify 'squat rack', 'power cage', or 'half rack'.
    *   **Functional/Bodyweight:** Look for 'pull-up bars', 'dip stations', 'resistance bands', 'medicine balls', 'plyo boxes', 'TRX straps'.

2.  **EXCLUDE ALL NON-EQUIPMENT:** It is vital that you *ignore* irrelevant objects. DO NOT list the following:
    *   People, their clothing, shoes, or accessories.
    *   Water bottles, towels, gym bags, phones.
    *   Reflections in mirrors.
    *   Architectural features like walls, floors, windows, lights, or mirrors themselves.

3.  **REQUIRED OUTPUT FORMAT (MARKDOWN):**
    *   Start with a heading: \`### Equipment Identified\`
    *   Below the heading, create a bulleted list (\`- \`) of every piece of equipment you identified.
    *   After the equipment list, add another heading: \`### Potential Exercises\`
    *   Below this second heading, create another bulleted list. For each piece of major equipment you found, suggest 2-3 possible exercises.`;

const GradientButton: React.FC<{onClick: () => void; disabled: boolean; children: React.ReactNode; className?: string}> = ({ onClick, disabled, children, className }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 disabled:from-amber-700/70 disabled:to-orange-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-400 ${className}`}
    >
        {children}
    </button>
);

interface GymAnalyzerProps {
    initialVideoFile?: File | null;
    onInitialVideoConsumed?: () => void;
}

export const GymAnalyzer: React.FC<GymAnalyzerProps> = ({ initialVideoFile, onInitialVideoConsumed }) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingState, setLoadingState] = useState({ active: false, message: '', subtext: ''});
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
    const [equipmentList, setEquipmentList] = useState<string | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null);
    const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);
    const [progress, setProgress] = useState(0);
    const [eta, setEta] = useState(0);
    const [extractedFrames, setExtractedFrames] = useState<string[] | null>(null);
    const [isRefining, setIsRefining] = useState(false);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const { showToast } = useToast();
    const { fitnessLevel, goal } = useUserPreferences();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const etaIntervalRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    const resetState = useCallback(() => {
        setVideoFile(null);
        setVideoUrl(null);
        setAnalysis(null);
        setError(null);
        setWorkoutPlan(null);
        setEquipmentList(null);
        setIsGeneratingVideo(null);
        setGeneratedVideos({});
        setLastFailedAction(null);
        setProgress(0);
        setEta(0);
        setExtractedFrames(null);
        setIsRefining(false);
        setRefinementPrompt('');
        if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    useEffect(() => {
        if (initialVideoFile) {
            resetState();
            const file = new File([initialVideoFile], `recorded-video-${Date.now()}.webm`, { type: initialVideoFile.type });
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            showToast("Recorded video loaded for analysis!", "info");
            onInitialVideoConsumed?.();
        }
    }, [initialVideoFile, onInitialVideoConsumed, resetState, showToast]);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            }
        };
        checkApiKey();
        dbService.initDB();
    }, []);
    
    useEffect(() => {
        if (workoutPlan && workoutPlan.length > 0) {
            setExpandedDay(workoutPlan[0].day);
        }
    }, [workoutPlan]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        resetState();
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
        } else {
            showToast("Please select a valid video file.", "error");
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
            showToast("Please drop a valid video file.", "error");
        }
    }
    
    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }

    const handleAnalyzeClick = useCallback(async () => {
        if (!videoFile) return;

        setError(null);
        setLastFailedAction(null);
        setAnalysis(null);
        setWorkoutPlan(null);
        setEquipmentList(null);
        setProgress(0);
        setExtractedFrames(null);
        
        if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        const ESTIMATED_FRAME_EXTRACTION_S = 22;
        const ESTIMATED_AI_ANALYSIS_S = 20;
        const totalEta = ESTIMATED_FRAME_EXTRACTION_S + ESTIMATED_AI_ANALYSIS_S;
        setEta(totalEta);
        setLoadingState({ active: true, message: 'Starting Analysis...', subtext: 'Preparing to extract video frames.' });
        
        etaIntervalRef.current = window.setInterval(() => {
            setEta(prev => Math.max(0, prev - 1));
        }, 1000);

        try {
            setLoadingState(prev => ({ ...prev, message: 'Step 1/2: Extracting Frames', subtext: 'Analyzing video content.' }));
            const frames = await extractFramesFromVideo(videoFile, 24, 24, (extractionProgress) => {
                setProgress(extractionProgress * 0.5);
            });
            setExtractedFrames(frames);
            setProgress(50);

            if (frames.length === 0) throw new Error("Could not extract any frames from the video. The file might be corrupted or in an unsupported format.");

            setLoadingState(prev => ({ ...prev, message: 'Step 2/2: AI Analysis', subtext: 'Identifying equipment with Gemini Pro.' }));
            
            let currentProgress = 50;
            progressIntervalRef.current = window.setInterval(() => {
                currentProgress += 1;
                if (currentProgress >= 95) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                }
                setProgress(currentProgress);
            }, (ESTIMATED_AI_ANALYSIS_S * 1000) / 45);

            const result = await analyzeVideoWithFrames(
                ANALYSIS_PROMPT, 
                frames,
                (attempt, maxAttempts) => {
                    setLoadingState(prev => ({ ...prev, subtext: `Model is busy. Retrying... (Attempt ${attempt + 1}/${maxAttempts})` }));
                }
            );

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            setAnalysis(result);
            showToast("Equipment analysis complete!", "success");

            const equipmentRegex = /###\s+Equipment Identified\s*([\s\S]*?)(?:###|$)/i;
            const equipmentMatch = result.match(equipmentRegex);
            if (equipmentMatch && equipmentMatch[1]) {
                const list = equipmentMatch[1].split('\n').map(line => line.replace(/[-*]\s*/, '').trim()).filter(Boolean);
                const equipmentString = list.join(', ');
                if (equipmentString) {
                    setEquipmentList(equipmentString);
                } else {
                    setAnalysis(result + "\n\n**Note:** I couldn't identify specific equipment to generate a plan. You can still use the analysis above for exercise ideas!");
                }
            } else {
                setAnalysis(result + "\n\n**Note:** I couldn't identify specific equipment to generate a plan. You can still use the analysis above for exercise ideas!");
            }
        } catch (e: any) {
            const friendlyMessage = e.message?.toLowerCase().includes('extract') || e.message?.toLowerCase().includes('corrupt')
                ? 'Could not process the video file. It may be corrupt or in an unsupported format. Please try a different video.'
                : `Analysis failed: ${e.message || 'An unknown error occurred.'}`;
            setError(friendlyMessage);
            showToast(friendlyMessage, "error");
            if (e instanceof ApiKeyError) {
                setApiKeySelected(false);
                setError(`API Key Error: ${e.message}. Please select a valid key and try again.`);
            } else {
                setLastFailedAction(() => handleAnalyzeClick);
            }
        } finally {
            if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setLoadingState({ active: false, message: '', subtext: '' });
            setTimeout(() => setProgress(0), 1000);
        }
    }, [videoFile, showToast]);

    const handleRefineAnalysis = useCallback(async () => {
        if (!extractedFrames || !refinementPrompt.trim()) return;
    
        setError(null);
        setLastFailedAction(null);
        setWorkoutPlan(null);
        setEquipmentList(null);
        
        setLoadingState({ active: true, message: 'Refining Analysis...', subtext: 'Applying your instructions to get a better result.' });
        
        try {
            const refinedPrompt = `
                ${ANALYSIS_PROMPT}
    
                ---
                **IMPORTANT USER REFINEMENT:** The user has provided new instructions. Follow them carefully to refine the initial analysis.
    
                **User's Instructions:** "${refinementPrompt}"
    
                Based on these new instructions, re-analyze the provided video frames and generate an updated list of equipment and potential exercises.
                ---
            `;
    
            const result = await analyzeVideoWithFrames(
                refinedPrompt,
                extractedFrames,
                (attempt, maxAttempts) => {
                    setLoadingState(prev => ({ ...prev, subtext: `Model is busy. Retrying... (Attempt ${attempt + 1}/${maxAttempts})` }));
                }
            );
            
            setAnalysis(result);
            showToast("Analysis refined successfully!", "success");
    
            const equipmentRegex = /###\s+Equipment Identified\s*([\s\S]*?)(?:###|$)/i;
            const equipmentMatch = result.match(equipmentRegex);
            if (equipmentMatch && equipmentMatch[1]) {
                const list = equipmentMatch[1].split('\n').map(line => line.replace(/[-*]\s*/, '').trim()).filter(Boolean);
                const equipmentString = list.join(', ');
                if (equipmentString) {
                    setEquipmentList(equipmentString);
                } else {
                     setAnalysis(result + "\n\n**Note:** I couldn't identify specific equipment to generate a plan based on your refinement.");
                }
            } else {
                setAnalysis(result + "\n\n**Note:** I couldn't identify specific equipment to generate a plan based on your refinement.");
            }
    
        } catch (e: any) {
             const errorMessage = e.message || 'The refinement failed. The AI might be busy or unable to process the request. Please try again.';
            setError(errorMessage);
            showToast(errorMessage, "error");
            if (e instanceof ApiKeyError) {
                setApiKeySelected(false);
                setError(`API Key Error: ${e.message}. Please select a valid key and try again.`);
            } else {
                setLastFailedAction(() => handleRefineAnalysis);
            }
        } finally {
            setLoadingState({ active: false, message: '', subtext: '' });
            setIsRefining(false);
            setRefinementPrompt('');
        }
    }, [extractedFrames, refinementPrompt, showToast]);


    const generatePlan = useCallback(async (isRegeneration = false) => {
        if (!equipmentList) return;
        
        const message = isRegeneration ? 'Generating New Plan...' : 'Generating Personalized Plan...';
        const subtext = isRegeneration ? 'Asking the AI for a fresh variation of your workout.' : `Crafting a plan for a ${fitnessLevel} user to ${goal}.`;
        
        setLoadingState({ active: true, message, subtext });
        setError(null);
        setLastFailedAction(null);
        if (!isRegeneration) {
            setWorkoutPlan(null);
        }
        
        const cacheKey = `${equipmentList}-${fitnessLevel}-${goal}`;

        try {
            if (!isRegeneration) {
                const cachedPlan = await dbService.get<WorkoutPlan>('workoutPlans', cacheKey);
                if (cachedPlan) {
                    setWorkoutPlan(cachedPlan);
                    showToast("Loaded a saved workout plan for this profile.", "info");
                    return;
                }
            }

            const plan = await generateWorkoutPlan(equipmentList, fitnessLevel, goal, (attempt, maxAttempts) => {
                 setLoadingState(prev => ({ ...prev, subtext: `Model is busy. Retrying... (Attempt ${attempt + 1}/${maxAttempts})` }));
            }, isRegeneration);
            setWorkoutPlan(plan);
            await dbService.set('workoutPlans', cacheKey, plan);
            showToast(isRegeneration ? "New workout plan generated!" : "Personalized workout plan generated and saved!", "success");

        } catch (e: any) {
            const errorMessage = e.message || 'The workout plan could not be generated. This is likely a temporary issue. Please try again in a moment.';
            setError(errorMessage);
            showToast(errorMessage, "error");
            setLastFailedAction(() => () => generatePlan(isRegeneration));
        } finally {
            setLoadingState({ active: false, message: '', subtext: '' });
        }
    }, [equipmentList, fitnessLevel, goal, showToast]);

    const handleGeneratePlanClick = () => generatePlan(false);
    const handleRegeneratePlanClick = () => generatePlan(true);

    const handleGenerateVideoClick = useCallback(async (exercise: Exercise) => {
        // 1. Check cache first
        const cachedVideo = await dbService.get<string>('generatedVideos', exercise.name);
        if (cachedVideo) {
            setGeneratedVideos(prev => ({ ...prev, [exercise.name]: cachedVideo }));
            showToast(`Loaded saved video for '${exercise.name}'.`, "info");
            return;
        }

        // 2. Check for API key if not generating from cache
        if (!apiKeySelected) {
            try {
                if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                    setApiKeySelected(true);
                } else if (window.aistudio?.openSelectKey) {
                    await window.aistudio.openSelectKey();
                    setApiKeySelected(true); 
                    return; 
                } else {
                    throw new Error("API key selection is not available.");
                }
            } catch (e) {
                console.error("API Key selection error:", e);
                setError("You must select an API key to generate videos.");
                return;
            }
        }
    
        setIsGeneratingVideo(exercise.name);
        setError(null);
        try {
            // 3. Generate the video
            const videoUrl = await generateExerciseVideo(exercise.name);
            setGeneratedVideos(prev => ({ ...prev, [exercise.name]: videoUrl }));
            
            // 4. Store the newly generated video in the cache
            await dbService.set('generatedVideos', exercise.name, videoUrl);
            showToast(`Video for ${exercise.name} generated successfully!`, "success");

        } catch (e) {
            if (e instanceof ApiKeyError) {
                setError(`${e.message} Please re-select your key and try again.`);
                showToast(e.message, "error");
                setApiKeySelected(false); 
            } else if (e instanceof Error) {
                const errorMessage = `The video for '${exercise.name}' could not be generated. This service may be temporarily unavailable. Please try again.`;
                setError(errorMessage);
                showToast(errorMessage, "error");
            } else {
                const errorMessage = `An unknown error occurred while generating video for ${exercise.name}.`;
                setError(errorMessage);
                showToast(errorMessage, "error");
            }
        } finally {
            setIsGeneratingVideo(null);
        }
    }, [apiKeySelected, showToast]);


    return (
        <section className="space-y-10">
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700">
                {!videoFile ? (
                     <label 
                        onDrop={handleDrop} 
                        onDragOver={handleDragOver}
                        htmlFor="video-upload" 
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-500 transition-all duration-300 group"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadIcon />
                            <p className="mb-2 text-base text-slate-300"><span className="font-semibold text-amber-400">Click to upload</span> or drag and drop a gym video</p>
                            <p className="text-xs text-slate-500">MP4, MOV, AVI, etc. (Or record one in the Creator Studio)</p>
                        </div>
                        <input id="video-upload" ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="flex flex-col items-center space-y-6">
                       <video src={videoUrl ?? ''} controls className="w-full max-w-xl rounded-lg shadow-lg border border-slate-700"></video>
                       <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors font-medium"
                        >
                            Change Video
                        </button>
                        <GradientButton
                            onClick={handleAnalyzeClick}
                            disabled={loadingState.active}
                        >
                            {loadingState.active ? 'Processing...' : 'Analyze Gym Equipment'}
                        </GradientButton>
                       </div>
                    </div>
                )}
            </div>

            {error && <ErrorMessage error={error} onRetry={lastFailedAction ? () => { setError(null); lastFailedAction(); } : undefined} />}

            {loadingState.active && (
                <div className="flex flex-col items-center gap-4 my-4 fade-in">
                    <Loader text={loadingState.message} subtext={loadingState.subtext} />
                    <div className="w-full max-w-md">
                        <ProgressBar progress={progress} />
                        <p className="text-center text-sm text-slate-400 mt-2">
                            Estimated time remaining: {eta} seconds
                        </p>
                    </div>
                </div>
            )}

            {analysis && !loadingState.active && (
                <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700 prose prose-invert fade-in">
                     <div dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }} />

                    <div className="mt-8 not-prose">
                        {!isRefining ? (
                            <div className="text-center border-t border-slate-700 pt-6">
                                <button
                                    onClick={() => setIsRefining(true)}
                                    className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors font-medium text-sm"
                                >
                                    Refine Analysis
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 fade-in">
                                <label htmlFor="refinement-prompt" className="block text-sm font-medium text-slate-300">
                                    Refinement Instructions
                                </label>
                                <input
                                    id="refinement-prompt"
                                    type="text"
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    placeholder="e.g., focus more on free weights, ignore cardio machines"
                                    className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3"
                                />
                                <div className="flex justify-end gap-3 mt-2">
                                    <button onClick={() => setIsRefining(false)} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors font-medium text-sm">Cancel</button>
                                    <GradientButton
                                        onClick={handleRefineAnalysis}
                                        disabled={!refinementPrompt.trim() || loadingState.active}
                                        className="px-4 py-2 text-sm"
                                    >
                                        Submit Refinement
                                    </GradientButton>
                                </div>
                            </div>
                        )}
                    </div>

                    {equipmentList && !isRefining && !workoutPlan && (
                        <div className="text-center mt-8 not-prose">
                             <button
                                onClick={handleGeneratePlanClick}
                                disabled={loadingState.active}
                                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 disabled:from-green-700/70 disabled:to-emerald-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-green-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-400"
                            >
                                {loadingState.active ? 'Generating...' : 'Generate My Workout Plan'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {workoutPlan && !loadingState.active && (
                <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700 fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                         <h2 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Your Personalized Workout Plan</h2>
                        <button
                            onClick={handleRegeneratePlanClick}
                            disabled={loadingState.active}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors font-medium text-sm disabled:bg-slate-700 disabled:cursor-not-allowed"
                        >
                            <RefreshIcon className={`w-4 h-4 ${loadingState.active ? 'animate-spin' : ''}`} />
                           {loadingState.active ? 'Generating...' : 'Generate New Plan'}
                        </button>
                    </div>
                    <div className="space-y-4">
                        {workoutPlan.map(day => (
                             <div key={day.day} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                                <button
                                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                                    className="w-full flex justify-between items-center p-5 text-left"
                                >
                                    <h3 className="font-bold text-2xl text-amber-300 tracking-wide">{day.day}</h3>
                                    <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${expandedDay === day.day ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`transition-all duration-500 ease-in-out ${expandedDay === day.day ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <ul className="space-y-4 p-5 pt-0">
                                        {day.exercises.map(exercise => (
                                            <li key={exercise.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/70 rounded-lg">
                                                <div>
                                                    <span className="font-semibold text-lg text-slate-100">{exercise.name}</span>
                                                    <span className="text-sm text-slate-400 ml-0 sm:ml-3 block sm:inline mt-1 sm:mt-0">{exercise.sets} sets of {exercise.reps} reps</span>
                                                </div>
                                                <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:max-w-xs flex-shrink-0">
                                                    {generatedVideos[exercise.name] ? (
                                                        <ExerciseVideoPlayer src={generatedVideos[exercise.name]} />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleGenerateVideoClick(exercise)}
                                                            disabled={!!isGeneratingVideo}
                                                            className="flex w-full sm:w-auto justify-center items-center text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 disabled:from-blue-700/70 disabled:to-indigo-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-blue-500/30"
                                                        >
                                                            {isGeneratingVideo === exercise.name ? (
                                                                <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                                                Generating...
                                                                </>
                                                            ) : (
                                                                <><PlayIcon className="w-4 h-4 mr-1.5" /> View Demo</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                     {!apiKeySelected && 
                        <div className="mt-8 p-4 bg-amber-900/30 border border-amber-800/80 rounded-lg text-center">
                            <p className="text-amber-200">To generate new exercise videos, you'll need to select an API key.</p>
                            <p className="text-xs text-amber-400 mb-3">Video generation uses the Veo model and may incur costs. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">billing details</a>.</p>
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
                                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-amber-500/30"
                            >
                                Select API Key
                            </button>
                        </div>
                    }
                </div>
            )}
        </section>
    );
};