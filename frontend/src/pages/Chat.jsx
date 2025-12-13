import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Paper,
  TextField,
  IconButton,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Drawer,
  Tooltip,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Collapse
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Agriculture as AgricultureIcon,
  Cloud as CloudIcon,
  AttachMoney as MoneyIcon,
  LocalHospital as HospitalIcon,
  AccountBalance as SchemeIcon,
  Water as WaterIcon,
  Science as ScienceIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import logger from '../services/logger';
import api from '../services/api';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import CropDetailsCard from '../components/CropDetailsCard';

const TypingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
    <Typography
      variant="body2"
      sx={{
        fontSize: '0.875rem',
        color: 'text.secondary',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}
    >
      Analysing
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          gap: 0.3,
          ml: 0.5
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: 'pulse 1.4s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.3 },
              '50%': { opacity: 1 }
            }
          }}
          style={{ animationDelay: '0s' }}
        />
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: 'pulse 1.4s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.3 },
              '50%': { opacity: 1 }
            }
          }}
          style={{ animationDelay: '0.2s' }}
        />
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: 'pulse 1.4s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.3 },
              '50%': { opacity: 1 }
            }
          }}
          style={{ animationDelay: '0.4s' }}
        />
      </Box>
    </Typography>
  </Box>
);

export default function Chat() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [sessions, setSessions] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [popularQuestions, setPopularQuestions] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [typing, setTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedCropData, setSelectedCropData] = useState(null);
  const [cropDetailsDialogOpen, setCropDetailsDialogOpen] = useState(false);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const streamIntervalRef = useRef(null);

  useEffect(() => {
    initializeChat();
    fetchQuickReplies();
    fetchPopularQuestions();
    getUserLocation();
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const initializeChat = () => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '👋 **Hello! I\'m Agri-GPT**, your AI agricultural assistant.\n\nI can help you with:\n\n🌾 **Crop Recommendations** - Get personalized crop suggestions for your area\n🩺 **Disease Diagnosis** - Identify and treat plant diseases\n🌤️ **Weather Forecasts** - Plan your farming activities\n💰 **Market Prices** - Stay updated with current prices\n🏛️ **Government Schemes** - Learn about available benefits\n💧 **Irrigation Advice** - Optimize water usage\n\n**What would you like to know today?**',
      timestamp: new Date(),
      intent: 'welcome',
      suggestions: [
        'Crop advice for my area',
        'Current market prices',
        'Weather forecast',
        'Disease identification'
      ]
    };
    setMessages([welcomeMessage]);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 20.5937, lng: 78.9629 }); // Default India
        }
      );
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await api.get('/agri-gpt/quick-replies');
      if (response.data.success) {
        setQuickReplies(response.data.quickReplies || []);
      }
    } catch (error) {
      logger.error('Failed to fetch quick replies', error);
    }
  };

  const fetchPopularQuestions = async () => {
    try {
      const response = await api.get('/agri-gpt/popular-questions');
      if (response.data.success) {
        setPopularQuestions(response.data.popularQuestions || []);
      }
    } catch (error) {
      logger.error('Failed to fetch popular questions', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/agri-gpt/sessions');
      if (response.data.success) {
        setSessions(response.data.sessions || []);
      }
    } catch (error) {
      logger.error('Failed to load sessions', error);
    }
  };

  const streamResponse = (fullText, messageId) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    
    setStreamingMessage(messageId);
    setStreamingContent('');
    
    let currentIndex = 0;
    const words = fullText.split(/(\s+)/);
    let currentText = '';
    
    streamIntervalRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        const wordsToAdd = Math.min(1 + Math.floor(Math.random() * 3), words.length - currentIndex);
        for (let i = 0; i < wordsToAdd && currentIndex < words.length; i++) {
          currentText += words[currentIndex];
          currentIndex++;
        }
        setStreamingContent(currentText);
      } else {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        const botMsg = {
          id: messageId,
          role: 'assistant',
          content: fullText,
          timestamp: new Date()
        };
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== messageId || m.role !== 'assistant');
          return [...filtered, botMsg];
        });
        setStreamingMessage(null);
        setStreamingContent('');
      }
    }, 30);
  };

  const handleSendMessage = async (messageText = message) => {
    if (!messageText.trim() && !messageText) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setTyping(true);
    setLoading(true);

    const messageId = Date.now() + 1;
    const placeholderMsg = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true
    };
    setMessages(prev => [...prev, placeholderMsg]);

    try {
      const response = await api.post('/agri-gpt/chat', {
        message: messageText,
        sessionId: sessionId,
        language: language,
        location: userLocation,
        profile: {
          crops: user?.crops || [],
          landSize: user?.landSize || 0,
          experience: user?.experience || 'intermediate'
        }
      });

      if (response.data.success !== false && (response.data.message || response.data.response || response.data.text)) {
        const fullResponse = response.data.message || response.data.response || response.data.text;
        
        setMessages(prev => prev.filter(m => m.id !== messageId));
        
        streamResponse(fullResponse, messageId);

        setTimeout(() => {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? {
              ...m,
          intent: response.data.context || response.data.intent,
          data: response.data.context || response.data.data,
          cropDetails: response.data.cropDetails,
          suggestions: response.data.suggestions,
          confidence: response.data.confidence || 0.9,
          source: response.data.provider || response.data.source,
              provider: response.data.provider,
              streaming: false
            } : m
          ));
        }, fullResponse.length * 30 + 100);

        if (response.data.cropDetails) {
          setSelectedCropData(response.data.cropDetails);
          enqueueSnackbar('Detailed crop information available! Click "View Details" to see more.', { 
            variant: 'info',
            autoHideDuration: 4000
          });
        }

        if (response.data.sessionId) {
          setSessionId(response.data.sessionId);
        }
      } else if (response.data.error) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        const errorMsg = {
          id: messageId,
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${response.data.error}. Please try again.`,
          timestamp: new Date(),
          error: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      logger.error('Chat error', error);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      const errorMsg = {
        id: messageId,
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please check your connection and try again.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
      enqueueSnackbar('Failed to get response. Please try again.', { variant: 'error' });
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = (reply) => {
    handleSendMessage(reply);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Please upload an image file', { variant: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('message', 'Analyze this image and provide agricultural advice');
        formData.append('sessionId', sessionId);
        formData.append('language', language);
        if (userLocation) {
          formData.append('latitude', userLocation.lat);
          formData.append('longitude', userLocation.lng);
        }

        const response = await api.post('/agri-gpt/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          const botMsg = {
            id: Date.now() + 1,
            role: 'assistant',
            content: response.data.response || response.data.text || 'Image analyzed successfully',
            timestamp: new Date(),
            intent: response.data.intent,
            data: response.data.data,
            cropDetails: response.data.cropDetails,
            imageAnalysis: response.data.imageAnalysis
          };
          setMessages(prev => [...prev, botMsg]);

          if (response.data.cropDetails) {
            setSelectedCropData(response.data.cropDetails);
            setCropDetailsDialogOpen(true);
          }
        }
      } catch (error) {
        logger.error('Image upload error', error);
        enqueueSnackbar('Failed to analyze image. Please try again.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    enqueueSnackbar('Message copied to clipboard', { variant: 'success' });
    setMessageMenuAnchor(null);
  };

  const handleRegenerate = async (messageId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    setMessages(prev => prev.slice(0, messageIndex));
    setMessageMenuAnchor(null);
    await handleSendMessage(userMessage.content);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setMessageMenuAnchor(null);
  };

  const handleFeedback = async (messageId, isPositive) => {
    setFeedback(prev => ({ ...prev, [messageId]: isPositive }));
    try {
      await api.post('/agri-gpt/feedback', {
        messageId,
        isPositive,
        sessionId
      });
    } catch (error) {
      logger.error('Feedback error', error);
    }
  };

  const handleNewChat = () => {
    initializeChat();
    setSessionId(`session_${Date.now()}`);
    setSidebarOpen(false);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Modern Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {t('nav.chat') || 'Agri-GPT'}
        </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <LanguageSwitcher />
          {user && (
            <Tooltip title="Chat History">
              <IconButton 
                size="small" 
                onClick={() => setDrawerOpen(true)}
                sx={{ color: 'text.secondary' }}
              >
              <HistoryIcon />
            </IconButton>
            </Tooltip>
          )}
          <Tooltip title="New Chat">
            <IconButton 
              size="small" 
              onClick={handleNewChat}
              sx={{ color: 'text.secondary' }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Sidebar */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{ mb: 2 }}
          >
            New Chat
          </Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
            Recent Chats
          </Typography>
              <List>
            {sessions.slice(0, 10).map((session) => (
                  <ListItem
                key={session.sessionId}
                button
                onClick={() => {
                  setSidebarOpen(false);
                }}
                    sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemText
                  primary={session.title || 'Untitled Chat'}
                  secondary={new Date(session.updatedAt).toLocaleDateString()}
                  primaryTypographyProps={{ fontSize: '0.9rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Messages Container */}
      <Box 
        ref={messagesContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          px: { xs: 2, sm: 3, md: 4 },
          py: 3,
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '900px',
          mx: 'auto',
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'text.secondary'
            }
          }
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.isArray(messages) && messages.map((msg, index) => {
            const isStreaming = streamingMessage === msg.id && msg.role === 'assistant';
            const rawContent = isStreaming ? streamingContent : msg.content;
            const displayContent = typeof rawContent === 'string' 
              ? rawContent 
              : (rawContent && typeof rawContent === 'object' 
                  ? JSON.stringify(rawContent) 
                  : String(rawContent || ''));
            
            return (
            <Fade in={true} key={msg.id} timeout={300}>
              <Box
                sx={{
                  display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 2,
                      alignItems: 'flex-start',
                  maxWidth: '100%',
                  animation: 'fadeIn 0.3s ease-in'
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 36,
                    height: 36,
                    bgcolor: msg.role === 'user' 
                      ? 'primary.main' 
                      : theme.palette.mode === 'dark' 
                        ? '#4285f4' 
                        : '#1a73e8',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {msg.role === 'user' ? (
                    <PersonIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <BotIcon sx={{ fontSize: 20 }} />
                  )}
                      </Avatar>
                
                <Box sx={{ 
                  flex: 1,
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}>
                  <Box
                      sx={{
                      p: 2.5,
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      bgcolor: msg.role === 'user' 
                        ? 'primary.main' 
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.03)',
                      color: msg.role === 'user' 
                        ? 'white' 
                        : 'text.primary',
                      border: msg.role === 'assistant' 
                        ? '1px solid' 
                        : 'none',
                      borderColor: msg.role === 'assistant' 
                        ? 'divider' 
                        : 'transparent',
                      wordBreak: 'break-word',
                      lineHeight: 1.7,
                      position: 'relative',
                      '&:hover .message-actions': {
                        opacity: 1
                      },
                      boxShadow: msg.role === 'user' 
                        ? '0 2px 8px rgba(0,0,0,0.1)' 
                        : '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Message Actions */}
                    <Box
                      className="message-actions"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.5,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        bgcolor: msg.role === 'user' 
                          ? 'rgba(255,255,255,0.2)' 
                          : 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                        p: 0.5
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <>
                          <Tooltip title="Copy">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyMessage(msg.content)}
                              sx={{ 
                                color: msg.role === 'user' ? 'white' : 'text.secondary',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                              }}
                            >
                              <CopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Regenerate">
                            <IconButton
                              size="small"
                              onClick={() => handleRegenerate(msg.id)}
                              sx={{ 
                                color: msg.role === 'user' ? 'white' : 'text.secondary',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                              }}
                            >
                              <RefreshIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="More">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setMessageMenuAnchor(e.currentTarget);
                            setSelectedMessageId(msg.id);
                          }}
                          sx={{ 
                            color: msg.role === 'user' ? 'white' : 'text.secondary',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                          }}
                        >
                          <MoreVertIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                          </Box>
                          
                    {msg.role === 'assistant' ? (
                      <Box
                        sx={{
                          fontSize: '0.875rem',
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            mt: 1.5,
                            mb: 0.75,
                            fontWeight: 600,
                            color: 'text.primary'
                          },
                          '& h1': { fontSize: '1.25rem', mt: 0 },
                          '& h2': { fontSize: '1.1rem' },
                          '& h3': { fontSize: '1rem' },
                          '& h4': { fontSize: '0.95rem' },
                          '& p': {
                            mb: 1,
                            lineHeight: 1.6,
                            fontSize: '0.875rem'
                          },
                          '& ul, & ol': {
                            mb: 1,
                            pl: 2.5,
                            fontSize: '0.875rem'
                          },
                          '& li': {
                            mb: 0.4,
                            lineHeight: 1.5,
                            fontSize: '0.875rem'
                          },
                          '& strong, & b': {
                            fontWeight: 700,
                            color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1565c0',
                            fontSize: '0.875rem'
                          },
                          '& code': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(100, 181, 246, 0.15)' 
                              : 'rgba(33, 150, 243, 0.08)',
                            px: 0.4,
                            py: 0.2,
                            borderRadius: '3px',
                            fontSize: '0.85rem',
                            fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace",
                            color: theme.palette.mode === 'dark' ? '#81c784' : '#2e7d32',
                            fontWeight: 500
                          },
                          '& pre': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(0, 0, 0, 0.4)' 
                              : 'rgba(0, 0, 0, 0.04)',
                            borderLeft: `4px solid ${theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3'}`,
                            p: 1.5,
                            borderRadius: '0 6px 6px 0',
                            overflow: 'auto',
                            mb: 1.5,
                            mt: 1,
                            fontSize: '0.8rem',
                            lineHeight: 1.6,
                            '& code': {
                              bgcolor: 'transparent',
                              p: 0,
                              fontSize: '0.8rem',
                              color: 'text.primary',
                              fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace"
                            }
                          },
                          '& table': {
                            width: '100%',
                            borderCollapse: 'collapse',
                            mb: 1.5,
                            fontSize: '0.8rem',
                            display: 'table',
                            tableLayout: 'auto',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '6px',
                            overflow: 'hidden'
                          },
                          '& thead': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(0, 0, 0, 0.04)'
                          },
                          '& th': {
                            border: `1px solid ${theme.palette.divider}`,
                            px: 1.2,
                            py: 0.8,
                            textAlign: 'left',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.1)' 
                              : 'rgba(0, 0, 0, 0.05)',
                            color: 'text.primary'
                          },
                          '& td': {
                            border: `1px solid ${theme.palette.divider}`,
                            px: 1.2,
                            py: 0.8,
                            textAlign: 'left',
                            fontSize: '0.8rem',
                            color: 'text.primary'
                          },
                          '& tbody tr:nth-of-type(even)': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.02)' 
                              : 'rgba(0, 0, 0, 0.015)'
                          },
                          '& tbody tr:hover': {
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.04)' 
                              : 'rgba(0, 0, 0, 0.03)'
                          },
                          '& blockquote': {
                            borderLeft: `3px solid ${theme.palette.primary.main}`,
                            pl: 1.5,
                            ml: 0,
                            fontStyle: 'italic',
                            color: 'text.secondary',
                            mb: 1.5,
                            fontSize: '0.875rem'
                          },
                          '& hr': {
                            border: 'none',
                            height: '1px',
                            background: theme.palette.mode === 'dark'
                              ? 'linear-gradient(to right, transparent, rgba(100, 181, 246, 0.3), transparent)'
                              : 'linear-gradient(to right, transparent, rgba(33, 150, 243, 0.3), transparent)',
                            my: 2.5,
                            mx: 0
                          },
                          '& blockquote': {
                            borderLeft: `4px solid ${theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3'}`,
                            pl: 2,
                            ml: 0,
                            mr: 0,
                            fontStyle: 'italic',
                            color: 'text.secondary',
                            mb: 1.5,
                            mt: 1,
                            fontSize: '0.875rem',
                            bgcolor: theme.palette.mode === 'dark'
                              ? 'rgba(100, 181, 246, 0.05)'
                              : 'rgba(33, 150, 243, 0.03)',
                            py: 1,
                            borderRadius: '0 4px 4px 0'
                          },
                          '& ul, & ol': {
                            '& li': {
                              '& strong': {
                                color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1976d2',
                                fontWeight: 600
                              }
                            }
                          }
                        }}
                      >
                        {displayContent && displayContent.trim() !== '' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            key={isStreaming ? streamingContent.length : msg.content}
                          components={{
                          h1: ({node, ...props}) => (
                            <Typography 
                              variant="h6" 
                              component="h1" 
                              sx={{ 
                                fontSize: '1.35rem', 
                                fontWeight: 700,
                                color: theme.palette.mode === 'dark' ? '#e3f2fd' : '#1976d2',
                                mt: 2.5,
                                mb: 1,
                                lineHeight: 1.3
                              }} 
                              {...props} 
                            />
                          ),
                          h2: ({node, ...props}) => (
                            <Typography 
                              variant="subtitle1" 
                              component="h2" 
                              sx={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 700,
                                color: theme.palette.mode === 'dark' ? '#e3f2fd' : '#1976d2',
                                mt: 2,
                                mb: 0.75,
                                lineHeight: 1.3
                              }} 
                              {...props} 
                            />
                          ),
                          h3: ({node, ...props}) => (
                            <Typography 
                              variant="subtitle2" 
                              component="h3" 
                              sx={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 700,
                                color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1565c0',
                                mt: 2,
                                mb: 0.75,
                                pb: 0.5,
                                borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3'}`,
                                lineHeight: 1.4
                              }} 
                              {...props} 
                            />
                          ),
                          h4: ({node, ...props}) => (
                            <Typography 
                              variant="body1" 
                              component="h4" 
                              sx={{ 
                                fontSize: '1rem', 
                                fontWeight: 600,
                                color: theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
                                mt: 1.5,
                                mb: 0.5,
                                lineHeight: 1.4
                              }} 
                              {...props} 
                            />
                          ),
                          p: ({node, ...props}) => (
                            <Typography 
                              variant="body2" 
                              component="p" 
                              sx={{ 
                                fontSize: '0.875rem',
                                lineHeight: 1.7,
                                mb: 1.2,
                                color: 'text.primary'
                              }} 
                              {...props} 
                            />
                          ),
                          code: ({node, inline, className, children, ...props}) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            
                            return inline ? (
                              <Box 
                                component="code" 
                                sx={{ 
                                  fontSize: '0.85rem',
                                  fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace",
                                  bgcolor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : 'rgba(0, 0, 0, 0.06)',
                                  px: 0.4,
                                  py: 0.2,
                                  borderRadius: '3px',
                                  color: theme.palette.mode === 'dark' ? '#81c784' : '#2e7d32',
                                  fontWeight: 500
                                }} 
                                {...props}
                              >
                                {children}
                              </Box>
                            ) : (
                              <Box 
                                component="pre" 
                                sx={{ 
                                  fontSize: '0.8rem',
                                  fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace",
                                  bgcolor: theme.palette.mode === 'dark' 
                                    ? 'rgba(0, 0, 0, 0.3)' 
                                    : 'rgba(0, 0, 0, 0.04)',
                                  borderLeft: `4px solid ${theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3'}`,
                                  p: 1.5,
                                  borderRadius: '0 6px 6px 0',
                                  overflow: 'auto',
                                  mb: 1.5,
                                  mt: 1,
                                  lineHeight: 1.6,
                                  '& code': {
                                    bgcolor: 'transparent',
                                    p: 0,
                                    fontSize: '0.8rem',
                                    color: 'text.primary'
                                  }
                                }} 
                                {...props}
                              >
                                {language && (
                                  <Box 
                                    component="span" 
                                    sx={{ 
                                      display: 'block',
                                      fontSize: '0.7rem',
                                      color: 'text.secondary',
                                      mb: 0.5,
                                      textTransform: 'uppercase',
                                      fontWeight: 600,
                                      letterSpacing: '0.5px'
                                    }}
                                  >
                                    {language}
                                  </Box>
                                )}
                                <code>{children}</code>
                              </Box>
                            );
                          },
                          table: ({node, ...props}) => (
                            <Box 
                              component="table" 
                              sx={{ 
                                display: 'table', 
                                width: '100%',
                                borderCollapse: 'collapse',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                mb: 2,
                                mt: 1.5,
                                boxShadow: theme.palette.mode === 'dark' 
                                  ? '0 2px 8px rgba(0,0,0,0.3)' 
                                  : '0 2px 8px rgba(0,0,0,0.08)'
                              }} 
                              {...props} 
                            />
                          ),
                          thead: ({node, ...props}) => (
                            <Box 
                              component="thead" 
                              sx={{
                                bgcolor: theme.palette.mode === 'dark' 
                                  ? 'rgba(33, 150, 243, 0.2)' 
                                  : 'rgba(33, 150, 243, 0.1)'
                              }}
                              {...props} 
                            />
                          ),
                          tbody: ({node, ...props}) => <Box component="tbody" {...props} />,
                          th: ({node, ...props}) => (
                            <Box 
                              component="th" 
                              sx={{
                                px: 1.5,
                                py: 1,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.mode === 'dark' 
                                  ? 'rgba(33, 150, 243, 0.15)' 
                                  : 'rgba(33, 150, 243, 0.08)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textAlign: 'left',
                                color: theme.palette.mode === 'dark' ? '#90caf9' : '#1565c0',
                                '&:first-of-type': {
                                  pl: 1.5
                                }
                              }}
                              {...props} 
                            />
                          ),
                          td: ({node, ...props}) => (
                            <Box 
                              component="td" 
                              sx={{
                                px: 1.5,
                                py: 0.9,
                                border: `1px solid ${theme.palette.divider}`,
                                fontSize: '0.85rem',
                                color: 'text.primary',
                                '&:first-of-type': {
                                  pl: 1.5
                                }
                              }}
                              {...props} 
                            />
                          ),
                          tr: ({node, ...props}) => (
                            <Box 
                              component="tr" 
                              sx={{
                                '&:nth-of-type(even)': {
                                  bgcolor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.02)' 
                                    : 'rgba(0, 0, 0, 0.015)'
                                },
                                '&:hover': {
                                  bgcolor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(0, 0, 0, 0.03)'
                                }
                              }}
                              {...props} 
                            />
                          ),
                          ul: ({node, ...props}) => (
                            <Box 
                              component="ul" 
                              sx={{ 
                                fontSize: '0.875rem',
                                pl: 2.5,
                                mb: 1.5,
                                mt: 0.5,
                                '& li': {
                                  mb: 0.6,
                                  lineHeight: 1.7
                                }
                              }} 
                              {...props} 
                            />
                          ),
                          ol: ({node, ...props}) => (
                            <Box 
                              component="ol" 
                              sx={{ 
                                fontSize: '0.875rem',
                                pl: 2.5,
                                mb: 1.5,
                                mt: 0.5,
                                '& li': {
                                  mb: 0.8,
                                  lineHeight: 1.7
                                }
                              }} 
                              {...props} 
                            />
                          ),
                          li: ({node, ...props}) => (
                            <Box 
                              component="li" 
                              sx={{ 
                                fontSize: '0.875rem',
                                lineHeight: 1.7,
                                color: 'text.primary',
                                '& strong': {
                                  color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1976d2',
                                  fontWeight: 600
                                }
                              }} 
                              {...props} 
                            />
                          ),
                          hr: ({node, ...props}) => (
                            <Box
                              component="hr"
                              sx={{
                                border: 'none',
                                height: '1px',
                                background: theme.palette.mode === 'dark'
                                  ? 'linear-gradient(to right, transparent, rgba(100, 181, 246, 0.3), transparent)'
                                  : 'linear-gradient(to right, transparent, rgba(33, 150, 243, 0.3), transparent)',
                                my: 2.5,
                                mx: 0
                              }}
                              {...props}
                            />
                          ),
                          blockquote: ({node, ...props}) => (
                            <Box
                              component="blockquote"
                              sx={{
                                borderLeft: `4px solid ${theme.palette.mode === 'dark' ? '#64b5f6' : '#2196f3'}`,
                                pl: 2,
                                ml: 0,
                                mr: 0,
                                fontStyle: 'italic',
                                color: 'text.secondary',
                                mb: 1.5,
                                mt: 1,
                                fontSize: '0.875rem',
                                bgcolor: theme.palette.mode === 'dark'
                                  ? 'rgba(100, 181, 246, 0.05)'
                                  : 'rgba(33, 150, 243, 0.03)',
                                py: 1,
                                borderRadius: '0 4px 4px 0'
                              }}
                              {...props}
                            />
                          ),
                          strong: ({node, ...props}) => (
                            <Box
                              component="strong"
                              sx={{
                                fontWeight: 700,
                                color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1565c0'
                              }}
                              {...props}
                            />
                          ),
                          em: ({node, ...props}) => (
                            <Box
                              component="em"
                              sx={{
                                fontStyle: 'italic',
                                color: 'text.secondary'
                              }}
                              {...props}
                            />
                          )
                        }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.875rem',
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          Analysing
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              gap: 0.3,
                              ml: 0.5
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-block',
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: 'text.secondary',
                                animation: 'pulse 1.4s infinite',
                                '@keyframes pulse': {
                                  '0%, 100%': { opacity: 0.3 },
                                  '50%': { opacity: 1 }
                                }
                              }}
                              style={{ animationDelay: '0s' }}
                            />
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-block',
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: 'text.secondary',
                                animation: 'pulse 1.4s infinite',
                                '@keyframes pulse': {
                                  '0%, 100%': { opacity: 0.3 },
                                  '50%': { opacity: 1 }
                                }
                              }}
                              style={{ animationDelay: '0.2s' }}
                            />
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-block',
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: 'text.secondary',
                                animation: 'pulse 1.4s infinite',
                                '@keyframes pulse': {
                                  '0%, 100%': { opacity: 0.3 },
                                  '50%': { opacity: 1 }
                                }
                              }}
                              style={{ animationDelay: '0.4s' }}
                            />
                          </Box>
                                </Typography>
                      )}
                        {isStreaming && displayContent && displayContent.trim() !== '' && (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              width: '8px',
                              height: '16px',
                              bgcolor: 'primary.main',
                              ml: 0.5,
                              animation: 'blink 1s infinite',
                              '@keyframes blink': {
                                '0%, 50%': { opacity: 1 },
                                '51%, 100%': { opacity: 0 }
                              }
                            }}
                          />
                        )}
                        </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-line',
                          fontSize: '0.875rem',
                          fontWeight: 400
                        }}
                      >
                        {!displayContent || displayContent.trim() === '' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                            Analysing
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-flex',
                                gap: 0.3,
                                ml: 0.5
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: 'text.secondary',
                                  animation: 'pulse 1.4s infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 0.3 },
                                    '50%': { opacity: 1 }
                                  }
                                }}
                                style={{ animationDelay: '0s' }}
                              />
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: 'text.secondary',
                                  animation: 'pulse 1.4s infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 0.3 },
                                    '50%': { opacity: 1 }
                                  }
                                }}
                                style={{ animationDelay: '0.2s' }}
                              />
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: 'text.secondary',
                                  animation: 'pulse 1.4s infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 0.3 },
                                    '50%': { opacity: 1 }
                                  }
                                }}
                                style={{ animationDelay: '0.4s' }}
                              />
                            </Box>
                          </Box>
                        ) : (
                          displayContent
                        )}
                        {isStreaming && displayContent && displayContent.trim() !== '' && (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              width: '8px',
                              height: '16px',
                              bgcolor: 'white',
                              ml: 0.5,
                              animation: 'blink 1s infinite',
                              '@keyframes blink': {
                                '0%, 50%': { opacity: 1 },
                                '51%, 100%': { opacity: 0 }
                              }
                            }}
                          />
                        )}
                        </Typography>
                      )}

                    {/* Feedback buttons for assistant messages */}
                      {msg.role === 'assistant' && !msg.error && !isStreaming && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Tooltip title="Helpful">
                            <IconButton
                              size="small"
                              onClick={() => handleFeedback(msg.id, true)}
                            sx={{
                              color: feedback[msg.id] === true ? 'primary.main' : 'text.secondary',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            >
                            <ThumbUpIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Not helpful">
                            <IconButton
                              size="small"
                              onClick={() => handleFeedback(msg.id, false)}
                            sx={{
                              color: feedback[msg.id] === false ? 'error.main' : 'text.secondary',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            >
                            <ThumbDownIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        {msg.provider && (
                          <Chip
                            label={msg.provider}
                            size="small"
                            sx={{ height: 24, fontSize: '0.7rem', ml: 'auto' }}
                          />
                        )}
                        </Box>
                      )}
                  </Box>
                </Box>
              </Box>
            </Fade>
          );
          })}

          {/* Typing Indicator */}
          {typing && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Avatar 
                sx={{ 
                  width: 36,
                  height: 36,
                  bgcolor: theme.palette.mode === 'dark' ? '#4285f4' : '#1a73e8',
                  flexShrink: 0
                }}
              >
                <BotIcon sx={{ fontSize: 20 }} />
                      </Avatar>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '18px 18px 18px 4px',
                  bgcolor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <TypingIndicator />
              </Box>
            </Box>
                )}

                <div ref={messagesEndRef} />
        </Box>
            </Box>

      {/* Quick Replies */}
      {quickReplies.length > 0 && messages.length === 1 && !loading && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2, maxWidth: '900px', mx: 'auto', width: '100%' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            Quick suggestions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {quickReplies.slice(0, 4).map((reply, index) => (
              <Chip
                key={index}
                label={reply}
                onClick={() => handleSendMessage(reply)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

            {/* Input Area */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        maxWidth: '900px',
        mx: 'auto',
        width: '100%'
      }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            p: 1,
            borderRadius: '24px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`
            }
          }}
        >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
            style={{ display: 'none' }}
            id="chat-file-input"
                />
          <Tooltip title="Upload Image">
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
              sx={{ color: 'text.secondary', mr: 0.5 }}
                >
                  <ImageIcon />
                </IconButton>
          </Tooltip>
                <TextField
            inputRef={inputRef}
            multiline
            maxRows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about agriculture..."
            variant="standard"
            InputProps={{
              disableUnderline: true
            }}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                fontSize: '0.875rem',
                py: 1
              }
            }}
          />
                <IconButton
            onClick={() => handleSendMessage()}
            disabled={!message.trim() || loading}
            sx={{
              bgcolor: message.trim() && !loading ? 'primary.main' : 'transparent',
              color: message.trim() && !loading ? 'white' : 'text.disabled',
              '&:hover': {
                bgcolor: message.trim() && !loading ? 'primary.dark' : 'transparent'
              },
              transition: 'all 0.2s',
              ml: 0.5
            }}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: 'text.disabled' }} />
            ) : (
                  <SendIcon />
            )}
                </IconButton>
        </Paper>
              </Box>

      {/* Message Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          const msg = messages.find(m => m.id === selectedMessageId);
          if (msg) handleCopyMessage(msg.content);
        }}>
          <CopyIcon sx={{ mr: 1, fontSize: 18 }} /> Copy
        </MenuItem>
        {messages.find(m => m.id === selectedMessageId)?.role === 'assistant' && (
          <MenuItem onClick={() => handleRegenerate(selectedMessageId)}>
            <RefreshIcon sx={{ mr: 1, fontSize: 18 }} /> Regenerate
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteMessage(selectedMessageId)}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
        </MenuItem>
      </Menu>

      {/* History Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Chat History</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {sessions.map((session) => (
                  <ListItem
                key={session.sessionId}
                    button
                onClick={() => {
                  setDrawerOpen(false);
                }}
                  >
                    <ListItemText
                  primary={session.title || 'Untitled Chat'}
                  secondary={new Date(session.updatedAt).toLocaleDateString()}
                    />
                  </ListItem>
                ))}
              </List>
        </Box>
      </Drawer>

      {/* Crop Details Dialog */}
      <Dialog
        open={cropDetailsDialogOpen}
        onClose={() => setCropDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Crop Details</DialogTitle>
        <DialogContent>
          {selectedCropData && <CropDetailsCard cropData={selectedCropData} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
        </Box>
  );
}
