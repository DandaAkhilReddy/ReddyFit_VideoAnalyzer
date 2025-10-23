import React, { useState, useCallback, useRef, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { Loader } from './shared/Loader';
import { ErrorMessage } from './shared/ErrorMessage';
import { ImageIcon, SparklesIcon, RecordIcon, StopIcon, PlayIcon } from './shared/icons';

type Mode = 'image' | 'video';
type RecordingStatus = 'idle' | 'recording' | 'preview';

// --- Image Editor Component ---
const ImageEditor: React.FC = () => {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    const resetState = () => {
        setOriginalFile(null);
        setOriginalUrl(null);
        setEditedUrl(null);
        setPrompt('');
        setError(null);
        setIsLoading(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        resetState();
        if (file && file.type.startsWith('image/')) {
            setOriginalFile(file);
            setOriginalUrl(URL.createObjectURL(file));
        } else {
            showToast("Please select a valid image file (JPEG, PNG, etc.).", "error");
        }
    };

    const handleEditClick = useCallback(async () => {
        if (!originalFile || !prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setEditedUrl(null);
        try {
            const base64Image = await fileToBase64(originalFile);
            const resultBase64 = await editImage(prompt, base64Image, originalFile.type);
            setEditedUrl(`data:${originalFile.type};base64,${resultBase64}`);
            showToast("Image edited successfully!", "success");
        } catch (e: any) {
            const errorMessage = e.message || 'The AI could not edit the image.';
            setError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    }, [originalFile, prompt, showToast]);

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">AI Image Editor</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">Use text to edit your images with the power of Gemini.</p>
            </div>
            {!originalUrl ? (
                <label htmlFor="image-upload-editor" className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-500 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-12 h-12 mb-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
                        <p className="mb-2 text-base text-slate-300"><span className="font-semibold text-amber-400">Click to upload an image</span></p>
                        <p className="text-xs text-slate-500">PNG, JPG, WEBP</p>
                    </div>
                    <input id="image-upload-editor" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            ) : (
                <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center"><h3 className="font-semibold mb-2 text-slate-300">Original</h3><img src={originalUrl} alt="Original" className="rounded-lg shadow-md border border-slate-700 w-full" /></div>
                        <div className="text-center"><h3 className="font-semibold mb-2 text-slate-300">Edited</h3><div className="aspect-square bg-slate-800 rounded-lg shadow-md border border-slate-700 w-full flex items-center justify-center">{isLoading ? <Loader text="Generating..."/> : (editedUrl ? <img src={editedUrl} alt="Edited" className="rounded-lg w-full"/> : <p className="text-slate-500">Your edited image will appear here</p>)}</div></div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="edit-prompt" className="block mb-2 text-sm font-medium text-slate-300">Describe your edit</label>
                            <input id="edit-prompt" type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Add a retro filter, make the sky dramatic..." className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3" disabled={isLoading} />
                        </div>
                         {error && <ErrorMessage error={error} onRetry={handleEditClick} />}
                        <div className="flex justify-center flex-wrap gap-4 pt-4">
                             <button onClick={resetState} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500 transition-colors font-medium">Change Image</button>
                            <button onClick={handleEditClick} disabled={isLoading || !prompt.trim()} className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 disabled:from-amber-700/70 disabled:to-orange-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-amber-500/30"><SparklesIcon className="w-5 h-5" />Generate Edit</button>
                            {editedUrl && <a href={editedUrl} download={`edited-${originalFile?.name || 'image.png'}`} className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-green-500/30">Download Image</a>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Video Recorder Component ---
const VideoRecorder: React.FC<{ onVideoRecorded: (videoFile: File) => void }> = ({ onVideoRecorded }) => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const { showToast } = useToast();

    const cleanupStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => cleanupStream();
    }, [cleanupStream]);

    const startPreview = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            showToast("Video recording is not supported on your browser.", "error");
            return;
        }
        try {
            cleanupStream();
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            mediaStreamRef.current = stream;
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }
        } catch (err) {
            showToast("Camera access was denied. Please enable camera permissions.", "error");
            console.error("Camera access denied:", err);
        }
    }, [showToast, cleanupStream]);

    useEffect(() => {
        if (status === 'idle') {
            startPreview();
        }
    }, [status, startPreview]);

    const handleStartRecording = () => {
        if (!mediaStreamRef.current) {
            showToast("Camera is not available.", "error");
            return;
        }
        setStatus('recording');
        const recordedChunks: BlobPart[] = [];
        const mediaRecorder = new MediaRecorder(mediaStreamRef.current);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            setRecordedBlob(blob);
            setRecordedUrl(URL.createObjectURL(blob));
            setStatus('preview');
            cleanupStream();
        };

        mediaRecorder.start();
        showToast("Recording started!", "info");
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            showToast("Recording stopped.", "info");
        }
    };

    const handleRecordAgain = () => {
        setStatus('idle');
        setRecordedBlob(null);
        setRecordedUrl(null);
    };

    const handleAnalyze = () => {
        if (recordedBlob) {
            const videoFile = new File([recordedBlob], `recorded-video-${Date.now()}.webm`, { type: recordedBlob.type });
            onVideoRecorded(videoFile);
        }
    };

    return (
        <div className="space-y-6">
             <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Video Recorder</h2>
                <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">Record a short video of your gym or an exercise for AI analysis.</p>
            </div>
            <div className="w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden border border-slate-700">
                <video ref={videoPreviewRef} playsInline autoPlay muted className={`w-full ${status === 'preview' && !recordedUrl ? 'hidden': ''}`} />
                {status === 'preview' && recordedUrl && (
                     <video src={recordedUrl} controls autoPlay className="w-full" />
                )}
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4">
                {status === 'idle' && (
                    <button onClick={handleStartRecording} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold shadow-lg">
                        <RecordIcon className="w-6 h-6" /> Start Recording
                    </button>
                )}
                 {status === 'recording' && (
                    <button onClick={handleStopRecording} className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors font-semibold shadow-lg">
                        <StopIcon className="w-6 h-6" /> Stop Recording
                    </button>
                )}
                {status === 'preview' && (
                    <>
                        <button onClick={handleRecordAgain} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500 transition-colors font-medium">Record Again</button>
                        <button onClick={handleAnalyze} className="flex justify-center items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 font-semibold shadow-lg">
                            <PlayIcon className="w-5 h-5" /> Analyze Video
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main Creator Studio Component ---
export const CreatorStudio: React.FC<{ onVideoRecorded: (videoFile: File) => void }> = ({ onVideoRecorded }) => {
    const [mode, setMode] = useState<Mode>('image');

    const ModeButton: React.FC<{ targetMode: Mode, label: string }> = ({ targetMode, label }) => (
        <button
            onClick={() => setMode(targetMode)}
            className={`px-5 py-2 rounded-md font-semibold transition-colors text-sm ${mode === targetMode ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
            {label}
        </button>
    );

    return (
        <section className="bg-slate-800/50 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-700">
            <div className="flex justify-center mb-8 p-1 bg-slate-800 rounded-lg space-x-2 max-w-xs mx-auto">
                <ModeButton targetMode="image" label="Image Editor" />
                <ModeButton targetMode="video" label="Video Recorder" />
            </div>
            {mode === 'image' ? <ImageEditor /> : <VideoRecorder onVideoRecorded={onVideoRecorded} />}
        </section>
    );
};