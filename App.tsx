import React, { useState } from 'react';
import { GymAnalyzer } from './components/GymAnalyzer';
import { FitnessChat } from './components/FitnessChat';
import { PoseChecker } from './components/PoseChecker';
import { FitnessQA } from './components/FitnessQA';
import { CreatorStudio } from './components/ImageEditor';
import { Settings } from './components/Settings';
import { LogoIcon, GoogleIcon } from './components/shared/icons';
import { ToastContainer } from './components/shared/Toast';
import { useAuth } from './hooks/useAuth';

type Tab = 'analyzer' | 'pose' | 'chat' | 'qa' | 'editor' | 'settings';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analyzer');
    const [recordedVideo, setRecordedVideo] = useState<File | null>(null);
    const { user, loading, signInWithGoogle, signOutUser } = useAuth();

    const handleVideoRecorded = (videoFile: File) => {
        setRecordedVideo(videoFile);
        setActiveTab('analyzer');
    };

    const clearRecordedVideo = () => {
        setRecordedVideo(null);
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'analyzer':
                return <GymAnalyzer initialVideoFile={recordedVideo} onInitialVideoConsumed={clearRecordedVideo} />;
            case 'pose':
                return <PoseChecker />;
            case 'chat':
                return <FitnessChat />;
            case 'qa':
                return <FitnessQA />;
            case 'editor':
                return <CreatorStudio onVideoRecorded={handleVideoRecorded} />;
            case 'settings':
                return <Settings />;
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

    const AuthDisplay = () => {
        if (loading) {
            return <div className="h-10 w-24 bg-slate-700 animate-pulse rounded-md"></div>;
        }

        if (user) {
            return (
                <div className="flex items-center gap-3">
                    <img src={user.photoURL || undefined} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full border-2 border-slate-600" />
                    <span className="text-sm font-medium text-slate-300 hidden sm:inline">{user.displayName}</span>
                    <button onClick={signOutUser} className="px-3 py-1.5 text-xs font-semibold bg-slate-600 hover:bg-slate-500 rounded-md transition-colors">Sign Out</button>
                </div>
            );
        }

        return (
            <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-semibold shadow-sm text-sm"
            >
                <GoogleIcon className="w-5 h-5" />
                Sign In
            </button>
        );
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="relative text-center mb-10">
                        <div className="absolute top-0 right-0">
                           <AuthDisplay />
                        </div>
                        <div className="flex justify-center items-center gap-4 mb-2 pt-12 sm:pt-0">
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
                        <TabButton tab="editor" label="Creator Studio" />
                        <TabButton tab="settings" label="Settings" />
                    </nav>

                    <main className="fade-in">
                        {renderTabContent()}
                    </main>
                    <footer className="text-center mt-16 text-slate-500 text-sm">
                        <p>Powered by Gemini. AI-generated content may be inaccurate. Not medical advice.</p>
                    </footer>
                </div>
            </div>
        </>
    );
};

export default App;