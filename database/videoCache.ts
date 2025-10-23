// A simple in-memory cache to simulate a video database.
// In a real application, this would be a persistent store like IndexedDB or a remote database.

interface VideoCache {
    [key: string]: string;
}

// Pre-populate with some common exercises and public video URLs.
// These would be high-quality, pre-recorded videos in a real app.
const videoDatabase: VideoCache = {
    "Push-ups": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "Dumbbell Bicep Curl": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "Squats": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "Plank": "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"
};

/**
 * Retrieves a cached video URL for a given exercise.
 * Performs a case-insensitive search.
 * @param exerciseName The name of the exercise.
 * @returns The video URL if found, otherwise null.
 */
export const getCachedVideo = (exerciseName: string): string | null => {
    const lowerCaseExerciseName = exerciseName.toLowerCase().trim();
    for (const key in videoDatabase) {
        if (key.toLowerCase().trim() === lowerCaseExerciseName) {
            return videoDatabase[key];
        }
    }
    return null;
};

/**
 * Caches a new video URL for a given exercise.
 * @param exerciseName The name of the exercise.
 * @param videoUrl The URL of the video to cache.
 */
export const cacheVideo = (exerciseName: string, videoUrl: string): void => {
    // Avoid overwriting existing entries with the same name (case-insensitive)
    if (!getCachedVideo(exerciseName)) {
        videoDatabase[exerciseName] = videoUrl;
    }
    console.log("Video cached:", exerciseName);
};
