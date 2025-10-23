import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences, FitnessLevel, Goal } from '../hooks/useUserPreferences';
import * as dbService from '../database/dbService';
import { useToast } from '../hooks/useToast';

export const Settings: React.FC = () => {
    const { user } = useAuth();
    const { fitnessLevel, setFitnessLevel, goal, setGoal } = useUserPreferences();
    const { showToast } = useToast();

    const handleClearData = async () => {
        if (window.confirm("Are you sure you want to delete all cached workout plans and videos? This action cannot be undone.")) {
            try {
                await dbService.clearAllData();
                showToast("Application data has been cleared successfully.", "success");
            } catch (error) {
                console.error("Failed to clear app data:", error);
                showToast("Failed to clear application data. Please try again.", "error");
            }
        }
    };

    const fitnessLevels: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
    const goals: Goal[] = ['Build Muscle', 'Lose Fat', 'Improve Endurance'];

    return (
        <section className="space-y-10 max-w-3xl mx-auto">
            <div className="text-center">
                 <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                    Profile & Settings
                </h2>
                 <p className="text-sm text-slate-400 mt-1">Manage your profile, preferences, and application data.</p>
            </div>
            
            {user && (
                 <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700 flex items-center gap-4">
                    <img src={user.photoURL || undefined} alt={user.displayName || 'User'} className="w-16 h-16 rounded-full border-2 border-slate-600" />
                    <div>
                        <h3 className="text-xl font-semibold text-white">{user.displayName}</h3>
                        <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                </div>
            )}

            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700 space-y-6">
                <h3 className="text-xl font-semibold text-amber-400 border-b border-slate-700 pb-3">Workout Personalization</h3>
                <p className="text-sm text-slate-400">
                    Set your preferences below to get workout plans tailored to your needs. This will affect the plans generated in the 'Gym Analyzer' tab.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                        <label htmlFor="fitness-level" className="block mb-2 text-sm font-medium text-slate-300">Your Fitness Level</label>
                        <select
                            id="fitness-level"
                            value={fitnessLevel}
                            onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5"
                        >
                            {fitnessLevels.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="goal" className="block mb-2 text-sm font-medium text-slate-300">Your Primary Goal</label>
                        <select
                            id="goal"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value as Goal)}
                            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5"
                        >
                             {goals.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700 space-y-4">
                 <h3 className="text-xl font-semibold text-amber-400 border-b border-slate-700 pb-3">Data Management</h3>
                 <p className="text-sm text-slate-400">
                    Your generated workout plans and videos are stored locally in your browser's database for faster access. This data is private and is not uploaded anywhere.
                 </p>
                 <div>
                    <button
                        onClick={handleClearData}
                        className="px-5 py-2 bg-red-700/90 text-white rounded-md hover:bg-red-800/90 transition-colors font-semibold text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500"
                    >
                        Clear All App Data
                    </button>
                    <p className="text-xs text-slate-500 mt-2">This will remove all saved workout plans and demo videos from this browser.</p>
                 </div>
            </div>
        </section>
    );
};
