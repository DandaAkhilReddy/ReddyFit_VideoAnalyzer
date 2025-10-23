import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Goal = 'Build Muscle' | 'Lose Fat' | 'Improve Endurance';

interface UserPreferences {
  fitnessLevel: FitnessLevel;
  goal: Goal;
}

interface UserPreferencesContextType extends UserPreferences {
  setFitnessLevel: (level: FitnessLevel) => void;
  setGoal: (goal: Goal) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const PREFERENCES_KEY = 'reddyfit-user-preferences';

const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Basic validation to ensure stored data is somewhat valid
      if (parsed.fitnessLevel && parsed.goal) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load user preferences from localStorage", error);
  }
  // Return default values if nothing is stored or if data is invalid
  return {
    fitnessLevel: 'Intermediate',
    goal: 'Build Muscle',
  };
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save user preferences to localStorage", error);
    }
  }, [preferences]);

  const setFitnessLevel = useCallback((level: FitnessLevel) => {
    setPreferences(prev => ({ ...prev, fitnessLevel: level }));
  }, []);

  const setGoal = useCallback((goal: Goal) => {
    setPreferences(prev => ({ ...prev, goal: goal }));
  }, []);

  const value = { ...preferences, setFitnessLevel, setGoal };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
