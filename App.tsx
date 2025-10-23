import React, { useState } from 'react';
import { GymAnalyzer } from './components/GymAnalyzer';
import { FitnessChat } from './components/FitnessChat';
import { PoseChecker } from './components/PoseChecker';
import { FitnessQA } from './components/FitnessQA';
import { LogoIcon } from './components/shared/icons';

type Tab = 'analyzer' | 'chat' | 'pose' | 'qa';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analyzer');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'analyzer':
                return <GymAnalyzer />;
            case 'pose':
                return <PoseChecker />;
            case 'chat':
                return <FitnessChat />;
            case 'qa':
                return <FitnessQA />;
            default:
                return <GymAnalyzer />;
        }
    };

    const TabButton = ({ tab, label }: { tab: Tab; label:string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm sm:text-base font-semibold rounded-md transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 ${
                activeTab === tab 
                ? 'text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
        >
            {label}
            {activeTab === tab && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-amber-500 rounded-full"></span>
            )}
        </button>
    );

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-10">
                    <div className="flex justify-center items-center gap-4 mb-2">
                        <LogoIcon className="w-12 h-12 text-amber-500" />
                        <h1 className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 tracking-tight">ReddyFit AI Pro</h1>
                    </div>
                    <p className="text-slate-400 mt-2 text-lg">Your all-in-one AI-powered personal trainer.</p>
                </header>

                <nav className="mb-10 p-2 bg-slate-800/50 ring-1 ring-slate-700 rounded-lg shadow-lg flex justify-center flex-wrap gap-x-2 sm:gap-x-4">
                    <TabButton tab="analyzer" label="Gym Analyzer" />
                    <TabButton tab="pose" label="Pose Checker" />
                    <TabButton tab="chat" label="Fitness Chat" />
                    <TabButton tab="qa" label="Fitness Q&A" />
                </nav>

                <main className="fade-in">
                    {renderTabContent()}
                </main>
                 <footer className="text-center mt-16 text-slate-500 text-sm">
                    <p>Powered by Gemini. AI-generated content may be inaccurate. Not medical advice.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;