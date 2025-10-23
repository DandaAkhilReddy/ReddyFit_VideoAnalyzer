import { Content } from '@google/genai';
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponseStream } from '../services/geminiService';
import { ErrorMessage } from './shared/ErrorMessage';
import { SendIcon, LogoIcon } from './shared/icons';
import { renderMarkdown } from '../utils/helpers';

export const FitnessChat: React.FC = () => {
    const [history, setHistory] = useState<Content[]>([
        { role: 'model', parts: [{ text: "Hi! I'm Reddy, your AI fitness coach. How can I help you today?" }] }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [history, isLoading]);

    const fetchModelResponse = async (currentHistory: Content[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const stream = await getChatResponseStream(currentHistory);
            let modelResponse = '';
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setHistory(prev => {
                    const latestHistory = [...prev];
                    latestHistory[latestHistory.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
                    return latestHistory;
                });
            }
        } catch (err: any) {
            setError(err.message || "Sorry, I couldn't get a response. Please check your connection and try again.");
            // On error, remove the placeholder model message if one was added.
            setHistory(prev => {
                if (prev.length > 0 && prev[prev.length - 1].role === 'model' && prev[prev.length-1].parts[0].text === '') {
                    return prev.slice(0, -1);
                }
                return prev;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserContent: Content = { role: 'user', parts: [{ text: userInput }] };
        const newHistory = [...history, newUserContent];
        setHistory(newHistory);
        setUserInput('');
        
        await fetchModelResponse(newHistory);
    };

    const handleRetry = () => {
        // The history already contains the user's message that failed to get a response.
        // We just need to call the API again with the current history.
        if (history.length > 0 && history[history.length - 1].role === 'user') {
            fetchModelResponse(history);
        }
    };

    return (
        <section className="bg-slate-800/50 border border-slate-700 rounded-lg shadow-xl flex flex-col h-[75vh] max-h-[800px]">
            <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Chat with Reddy</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
                {history.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><LogoIcon className="w-5 h-5 text-slate-900" /></div>}
                        <div className={`max-w-md lg:max-w-lg p-3 rounded-2xl ${
                            msg.role === 'user' 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-none' 
                            : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }`}>
                            <div className="text-sm prose prose-invert max-w-none prose-p:my-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.parts[0].text) }} />
                        </div>
                    </div>
                ))}
                {isLoading && history[history.length-1].role === 'model' && (
                    <div className="flex items-end gap-3 justify-start">
                         <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><LogoIcon className="w-5 h-5 text-slate-900" /></div>
                        <div className="max-w-lg p-3 rounded-2xl rounded-bl-none bg-slate-700 flex items-center space-x-2">
                           <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-0"></span>
                           <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-150"></span>
                           <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-300"></span>
                        </div>
                    </div>
                )}
                 <div ref={chatEndRef} />
            </div>
            
            {error && <div className="px-4 pb-2"><ErrorMessage error={error} onRetry={handleRetry} /></div>}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ask a fitness question..."
                        className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 transition-colors"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !userInput.trim()} className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full hover:from-amber-600 hover:to-orange-700 disabled:from-amber-700/70 disabled:to-orange-800/70 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-amber-500/30">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </section>
    );
};