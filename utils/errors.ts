/**
 * Custom error class for API key-related issues, particularly for video generation.
 */
export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiKeyError";
    }
}
