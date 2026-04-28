import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Box, CircularProgress } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { LanguageProvider } from './contexts/LanguageContext';

import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/Layout';

import ProtectedRoute from './components/ProtectedRoute';

const lazyWithRetry = (factory, key) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const message = String(error?.message || '');
      const isChunkFetchError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('ChunkLoadError');

      if (isChunkFetchError) {
        const storageKey = `lazy-retry:${key}`;
        const hasRetried = sessionStorage.getItem(storageKey) === '1';
        if (!hasRetried) {
          sessionStorage.setItem(storageKey, '1');
          window.location.reload();
          return new Promise(() => {}); // Keep suspense fallback until reload.
        }
      }

      throw error;
    }
  });

const Login = lazyWithRetry(() => import('./pages/Login'), 'login');
const Register = lazyWithRetry(() => import('./pages/Register'), 'register');
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'), 'forgot-password');
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'), 'reset-password');
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail'), 'verify-email');
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 'dashboard');
const Crops = lazyWithRetry(() => import('./pages/Crops'), 'crops');
const CropRecommendation = lazyWithRetry(() => import('./pages/CropRecommendation'), 'crop-recommendation');
const Diseases = lazyWithRetry(() => import('./pages/Diseases'), 'diseases');
const Weather = lazyWithRetry(() => import('./pages/Weather'), 'weather');
const Market = lazyWithRetry(() => import('./pages/Market'), 'market');
const Chat = lazyWithRetry(() => import('./pages/Chat'), 'chat');
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'settings');
const Analytics = lazyWithRetry(() => import('./pages/Analytics'), 'analytics');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'profile');
const GovernmentSchemes = lazyWithRetry(() => import('./pages/GovernmentSchemes'), 'government-schemes');
const AgriChat = lazyWithRetry(() => import('./pages/AgriChat'), 'agri-chat');
const TamilAgriChat = lazyWithRetry(() => import('./pages/TamilAgriChat'), 'tamil-agri-chat');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      refetchOnWindowFocus: false
    }
  }
});

function App() {
  const routeFallback = (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress />
    </Box>
  );

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
                    <Suspense fallback={routeFallback}>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
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
                          path="/tamil-agri-chat"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <TamilAgriChat />
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
                        <Route
                          path="/agri-map"
                          element={<Navigate to="/dashboard" replace />}
                        />
                        <Route
                          path="*"
                          element={<Navigate to="/dashboard" replace />}
                        />
                      </Routes>
                    </Suspense>
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
