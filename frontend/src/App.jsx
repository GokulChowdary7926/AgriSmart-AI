import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { LanguageProvider } from './contexts/LanguageContext';

import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/Layout';

import ProtectedRoute from './components/ProtectedRoute';

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
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Dashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Dashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/crops"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Crops />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/crop-recommendation"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <CropRecommendation />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/diseases"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Diseases />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/weather"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Weather />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/market"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Market />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/chat"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Chat />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/agri-chat"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <AgriChat />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Analytics />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/agri-map"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <AgriMap />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/government-schemes"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <GovernmentSchemes />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Settings />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Profile />
                            </Layout>
                          </ProtectedRoute>
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
