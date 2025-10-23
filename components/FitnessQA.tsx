import React, { useState, useCallback } from 'react';
import { getGroundedAnswer } from '../services/geminiService';
import { Loader } from './shared/Loader';
import { ErrorMessage } from './shared/ErrorMessage';
import { SparklesIcon } from './shared/icons';
import { GroundingChunk } from '@google/genai';
import { renderMarkdown } from '../utils/helpers';


interface Answer {
    text: string;
    sources: GroundingChunk[];
}

export const FitnessQA: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<Answer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setError("Please enter a question to get an answer.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnswer(null);

        try {
            const result = await getGroundedAnswer(query);
            setAnswer(result);
        } catch (e: any) {
            setError(e.message || "There was a problem fetching the answer. Please try your question again.");
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        executeSearch(question);
    };

    const handleExampleClick = (q: string) => {
        setQuestion(q);
        executeSearch(q);
    }
    
    const exampleQuestions = [
        "What are the latest findings on creatine supplementation for women?",
        "Compare the benefits of HIIT vs. LISS cardio for fat loss.",
        "What is the recommended protein intake for building muscle in 2024?"
    ];

    return (
        <section className="bg-slate-800/50 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-700 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Fitness Q&A with Google Search</h2>
                <p className="text-sm text-slate-400 mt-1">Ask about recent fitness trends, studies, or news for up-to-date answers.</p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., What are the benefits of cold plunges?"
                    className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3"
                />
                 <button type="submit" disabled={isLoading} className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md hover:from-amber-600 hover:to-orange-700 disabled:from-amber-700/70 disabled:to-orange-800/70 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-amber-500/30">
                    <SparklesIcon className="w-5 h-5" />
                    Get Answer
                </button>
            </form>
            
            <div className="text-center">
                <p className="text-sm font-semibold text-slate-400 mb-2">Or try one of these:</p>
                <div className="flex flex-wrap justify-center gap-2">
                {exampleQuestions.map((q, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleExampleClick(q)} 
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-full hover:bg-slate-600 hover:text-white transition-colors"
                        disabled={isLoading}
                    >
                        {q}
                    </button>
                ))}
                </div>
            </div>

            {error && <ErrorMessage error={error} onRetry={() => executeSearch(question)} />}
            {isLoading && <Loader text="Searching for answers..." subtext="Consulting the latest information to give you an accurate response." />}

            {answer && !isLoading && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-6">
                    <div className="prose prose-invert max-w-none">
                        <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 not-prose">Answer:</h3>
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(answer.text) }} />
                    </div>
                    {answer.sources && answer.sources.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-slate-300 mb-2">Sources:</h4>
                            <ul className="space-y-2 text-sm">
                                {answer.sources.map((source, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-1">&#8227;</span>
                                        <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                            {source.web?.title || source.web?.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};