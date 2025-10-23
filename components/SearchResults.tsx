import React from 'react';
import { GroundingChunk } from '@google/genai';
import { renderMarkdown } from '../utils/helpers';

interface SearchResultsProps {
    answer: string;
    sources: GroundingChunk[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ answer, sources }) => {
    return (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-6 fade-in">
            <div className="prose prose-invert max-w-none">
                <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 not-prose">Answer:</h3>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />
            </div>
            {sources && sources.length > 0 && (
                <div>
                    <h4 className="font-semibold text-slate-300 mb-2">Sources:</h4>
                    <ul className="space-y-2 text-sm">
                        {sources.map((source, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-amber-400 mt-1">&#8227;</span>
                                <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                    {source.web?.title || source.web?.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
