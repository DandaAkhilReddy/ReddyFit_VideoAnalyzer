import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useToast } from './useToast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = useCallback(async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            showToast("Successfully signed in!", "success");
        } catch (error: any) {
            console.error("Error signing in with Google: ", error);
            showToast(`Sign-in failed: ${error.message}`, "error");
        }
    }, [showToast]);

    const signOutUser = useCallback(async () => {
        try {
            await signOut(auth);
            showToast("You have been signed out.", "info");
        } catch (error: any) {
            console.error("Error signing out: ", error);
            showToast(`Sign-out failed: ${error.message}`, "error");
        }
    }, [showToast]);

    const value = { user, loading, signInWithGoogle, signOutUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};