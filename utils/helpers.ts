/**
 * Converts a File or Blob object to a Base64 encoded string.
 * @param file The file or blob to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Return only the base64 part
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * A simple function to convert a subset of Markdown to HTML.
 * Supports: ### headers, **bold**, and -/* lists.
 * This is not a full Markdown parser and is not XSS-safe.
 * Only use for displaying content from a trusted source like the Gemini API.
 * @param text The Markdown text to convert.
 * @returns An HTML string.
 */
export const renderMarkdown = (text: string | null | undefined): string => {
    if (!text) return '';

    let html = text
        // Headers (e.g., ### Title)
        .replace(/^### (.*$)/gim, '<h3 class="text-amber-400 font-semibold mt-4 mb-2">$1</h3>')
        // Bold text (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle lists line-by-line to correctly form <ul> blocks
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        const isListItem = line.match(/^[ \t]*[-*] (.*)/);
        if (isListItem) {
            const itemContent = isListItem[1];
            if (!inList) {
                inList = true;
                return `<ul><li>${itemContent}</li>`;
            }
            return `<li>${itemContent}</li>`;
        }
        
        if (inList) {
            inList = false;
            // The current line is not a list item, so close the list
            // and append the current line.
            return `</ul>${line}`;
        }
        return line;
    });

    // If the text ends with a list, close the ul tag
    if (inList) {
        processedLines.push('</ul>');
    }

    // Join lines and replace remaining newlines with <br> for paragraphs
    return processedLines.join('\n').replace(/\n/g, '<br />');
};