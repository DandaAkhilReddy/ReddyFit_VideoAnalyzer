/**
 * Extracts a specified number of frames from a video file.
 * @param videoFile The video file to process.
 * @param frameCount The number of frames to extract.
 * @param durationSeconds The time duration from the start of the video to extract frames from.
 * @param onProgress A callback function that receives the progress percentage (0-100).
 * @returns A promise that resolves with an array of base64-encoded image data URLs (JPEG).
 */
export const extractFramesFromVideo = (
    videoFile: File,
    frameCount: number = 16,
    durationSeconds: number = 16,
    onProgress?: (progress: number) => void
): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames: string[] = [];

        if (!ctx) {
            return reject(new Error("Could not create canvas context."));
        }

        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;

        video.onloadeddata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const interval = durationSeconds / frameCount;

            const captureFrame = (time: number): Promise<void> => {
                return new Promise((resolveFrame, rejectFrame) => {
                    video.currentTime = time;
                    video.onseeked = () => {
                        try {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            frames.push(canvas.toDataURL('image/jpeg', 0.85));
                            resolveFrame();
                        } catch (e) {
                            rejectFrame(e);
                        }
                    };
                    video.onerror = (e) => rejectFrame(new Error('Error seeking video'));
                });
            };

            try {
                for (let i = 0; i < frameCount; i++) {
                    // Seek to a point slightly after the interval to ensure the frame is ready
                    await captureFrame(i * interval + 0.01);
                    onProgress?.(((i + 1) / frameCount) * 100);
                }
                URL.revokeObjectURL(video.src);
                resolve(frames);
            } catch (error) {
                URL.revokeObjectURL(video.src);
                reject(error);
            }
        };

        video.onerror = () => {
            reject(new Error("Error loading video file. It may be corrupt or in an unsupported format."));
        };

        // Some browsers require play() to be called for seeking to work reliably.
        video.play().catch(() => {
            // This may fail if autoplay is blocked, but we can often proceed anyway.
        });
    });
};
