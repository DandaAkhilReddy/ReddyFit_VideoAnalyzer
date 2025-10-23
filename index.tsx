import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './hooks/useAuth';
import { UserPreferencesProvider } from './hooks/useUserPreferences';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <App />
        </UserPreferencesProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);