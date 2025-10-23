import React, { useState, useCallback } from 'react';
import { analyzePose } from '../services/geminiService';
import { fileToBase64, renderMarkdown } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { Loader } from './shared/Loader';
import { ErrorMessage } from './shared/ErrorMessage';
import { ImageIcon } from './shared/icons';

const DEFAULT_PROMPT = "You are an expert personal trainer. Analyze the user's exercise form in this image. Provide specific, actionable feedback on their posture, alignment, and technique. Are they performing the exercise correctly and safely? What can they improve? Format your response in Markdown.";

export const PoseChecker: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);
    const { showToast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setError(null);
            setAnalysis(null);
            setLastFailedAction(null);
        } else {
            showToast("Please select a valid image file (JPEG, PNG, etc.).", "error");
            setImageFile(null);
            setImageUrl(null);
        }
    };

    const handleAnalyzeClick = useCallback(async () => {
        if (!imageFile) {
            setError("Please upload an image first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        setLastFailedAction(null);

        try {
            const base64Image = await fileToBase64(imageFile);
            const fullPrompt = prompt ? `${DEFAULT_PROMPT}\n\nUser's question: "${prompt}"` : DEFAULT_PROMPT;
            const result = await analyzePose(fullPrompt, base64Image, imageFile.type);
            setAnalysis(result);
            showToast("Pose analysis complete!", "success");
        } catch (e: any) {
            const errorMessage = e.message || 'The AI coach could not analyze the pose. Please check your image and connection, then try again.';
            setError(errorMessage);
            showToast(errorMessage, "error");
            setLastFailedAction(() => handleAnalyzeClick);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile, prompt, showToast]);

    const handleRetry = () => {
        if (lastFailedAction) {
            setError(null);
            lastFailedAction();
        }
    };

    return (
        <section className="bg-slate-800/50 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-700 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">AI Pose Checker</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">Get instant feedback on your form. For best results, use a clear, side-view photo of your exercise.</p>
            </div>
            
            {!imageUrl ? (
                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-500 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-12 h-12 mb-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
                        <p className="mb-2 text-base text-slate-300"><span className="font-semibold text-amber-400">Click to upload an image</span></p>
                        <p className="text-xs text-slate-500">PNG, JPG, WEBP</p>
                    </div>
                    <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            ) : (
                 <div className="flex flex-col items-center gap-4">
                    <img src={imageUrl} alt="Exercise pose preview" className="max-h-96 rounded-lg shadow-lg border border-slate-700" />
                     <button
                        onClick={() => {
                            setImageFile(null);
                            setImageUrl(null);
                            setAnalysis(null);
                        }}
                        className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500 transition-colors font-medium"
                    >
                        Change Image
                    </button>
                </div>
            )}

            <div>
                <label htmlFor="pose-prompt" className="block mb-2 text-sm font-medium text-slate-300">Any specific questions about your form? (Optional)</label>
                <input
                    id="pose-prompt"
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Is my back straight enough during this deadlift?"
                    className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3"
                    disabled={!imageFile}
                />
            </div>
            
            <div className="text-center">
                 <button
                    onClick={handleAnalyzeClick}
                    disabled={isLoading || !imageFile}
                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 disabled:from-amber-700/70 disabled:to-orange-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-400"
                >
                    {isLoading ? 'Analyzing Pose...' : 'Get AI Feedback'}
                </button>
            </div>
            
            {error && <ErrorMessage error={error} onRetry={handleRetry} />}
            {isLoading && <Loader text="Analyzing Pose..." subtext="Our AI coach is taking a close look at your form." />}
            
            {analysis && !isLoading && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 prose prose-invert">
                    <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 not-prose">AI Coach Feedback</h3>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }} />
                </div>
            )}
        </section>
    );
};