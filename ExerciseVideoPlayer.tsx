import React, { useState, useRef, useEffect } from 'react';

interface ExerciseVideoPlayerProps {
  src: string;
}

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);
const VolumeHighIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
);
const VolumeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
);
const LoopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>
);


export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({ src }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);
    const volumeIndicatorTimeoutRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(true);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

    const triggerVolumeIndicator = () => {
        if (volumeIndicatorTimeoutRef.current) {
            clearTimeout(volumeIndicatorTimeoutRef.current);
        }
        setShowVolumeIndicator(true);
        volumeIndicatorTimeoutRef.current = window.setTimeout(() => {
            setShowVolumeIndicator(false);
        }, 1200); // Show for 1.2 seconds
    };
    
    const togglePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };
    
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            if (isFinite(video.duration) && video.duration > 0) {
                setProgress((video.currentTime / video.duration) * 100);
            }
            setCurrentTime(video.currentTime);
        };
        
        const setVideoDuration = () => {
            if (isFinite(video.duration)) {
                setDuration(video.duration);
            }
        };

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', setVideoDuration);
        video.loop = isLooping;

        // Auto-play when source changes
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));


        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', setVideoDuration);
             if (volumeIndicatorTimeoutRef.current) {
                clearTimeout(volumeIndicatorTimeoutRef.current);
            }
        };
    }, [src, isLooping]);
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(videoRef.current && isFinite(videoRef.current.duration)) {
            const seekTime = (Number(e.target.value) / 100) * videoRef.current.duration;
            videoRef.current.currentTime = seekTime;
            setProgress(Number(e.target.value));
        }
    };
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        if(videoRef.current) videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        triggerVolumeIndicator();
    };

    const toggleMute = () => {
        if(videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
            triggerVolumeIndicator();
        }
    };

    const handlePlaybackRateChange = (rate: number) => {
        if(videoRef.current) videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
    }
    
    const formatTime = (time: number) => {
        if (!isFinite(time) || time < 0) {
            return '0:00';
        }
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative group w-full aspect-video bg-black rounded-md overflow-hidden">
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                onClick={togglePlayPause}
                onLoadedData={() => { // Ensure duration is set on load
                    if (videoRef.current && isFinite(videoRef.current.duration)) {
                        setDuration(videoRef.current.duration);
                    }
                }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex flex-col justify-between p-2">
                {/* Top controls (placeholder) */}
                <div></div>

                {/* Center play/pause button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-in-out">
                    <button onClick={togglePlayPause} className="text-white bg-black/60 rounded-full p-3 transform active:scale-90 transition-transform">
                         {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                    </button>
                </div>
                 
                {/* Volume Change Indicator */}
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${showVolumeIndicator ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`}>
                    <div className="bg-black/60 p-4 rounded-full">
                        {isMuted || volume === 0 
                            ? <VolumeOffIcon className="w-8 h-8 text-white"/> 
                            : <VolumeHighIcon className="w-8 h-8 text-white"/>}
                    </div>
                </div>

                {/* Bottom controls */}
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <input
                        type="range"
                        ref={progressRef}
                        min="0"
                        max="100"
                        value={isFinite(progress) ? progress : 0}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-amber-500"
                    />
                    <div className="flex items-center justify-between text-white text-xs mt-1">
                        <div className="flex items-center space-x-2">
                            <button onClick={togglePlayPause}>
                                {isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                            </button>
                             <div className="flex items-center space-x-1">
                                <button onClick={toggleMute}>
                                    {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5"/> : <VolumeHighIcon className="w-5 h-5"/>}
                                </button>
                                <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 h-1 accent-amber-400 cursor-pointer"/>
                            </div>
                            <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setIsLooping(!isLooping)} className={`${isLooping ? 'text-amber-400' : 'text-white'}`}>
                                <LoopIcon className="w-5 h-5"/>
                            </button>
                            <select value={playbackRate} onChange={(e) => handlePlaybackRateChange(Number(e.target.value))} className="bg-transparent text-white border-none text-xs focus:ring-0">
                                <option value={0.5}>0.5x</option>
                                <option value={1}>1x</option>
                                <option value={1.5}>1.5x</option>
                                <option value={2}>2x</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};