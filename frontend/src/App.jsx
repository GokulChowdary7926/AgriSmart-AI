import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/Layout';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Crops from './pages/Crops';
import CropRecommendation from './pages/CropRecommendation';
import Diseases from './pages/Diseases';
import Weather from './pages/Weather';
import Market from './pages/Market';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import GovernmentSchemes from './pages/GovernmentSchemes';
import AgriMap from './pages/AgriMap';
import AgriChat from './pages/AgriChat';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AuthProvider>
                <ChatProvider>
                  <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/*"
                        element={
                          <Layout>
                            <Routes>
                              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                              <Route path="/crops" element={<ProtectedRoute><Crops /></ProtectedRoute>} />
                              <Route path="/crop-recommendation" element={<ProtectedRoute><CropRecommendation /></ProtectedRoute>} />
                              <Route path="/diseases" element={<ProtectedRoute><Diseases /></ProtectedRoute>} />
                              <Route path="/weather" element={<ProtectedRoute><Weather /></ProtectedRoute>} />
                              <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
                              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                              <Route path="/agri-chat" element={<ProtectedRoute><AgriChat /></ProtectedRoute>} />
                              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                              <Route path="/government-schemes" element={<ProtectedRoute><GovernmentSchemes /></ProtectedRoute>} />
                              <Route path="/agri-map" element={<ProtectedRoute><AgriMap /></ProtectedRoute>} />
                            </Routes>
                          </Layout>
                        }
                      />
                    </Routes>
                  </SnackbarProvider>
                </ChatProvider>
              </AuthProvider>
            </Router>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

