import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  TextField,
  IconButton,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Initialize with welcome message
    setMessages([{
      id: 'welcome',
      text: t('chatbot.responses.welcome') || 'Hello! I\'m your AI farming assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    // Add user message to chat
    const userMsg = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Call AGRI-GPT API
      const response = await api.post('/agri-gpt/chat', {
        message: userMessage,
        context: {
          language: language
        }
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Add bot response
      const botMsg = {
        id: Date.now() + 1,
        text: response.data.text || response.data.conversation?.text || t('chatbot.responses.error') || 'I apologize, but I couldn\'t process that request.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        data: response.data
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      enqueueSnackbar(t('errors.networkError') || 'Network error. Please try again.', { variant: 'error' });
      
      // Add error message
      const errorMsg = {
        id: Date.now() + 1,
        text: t('chatbot.responses.error') || 'I apologize, but I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      enqueueSnackbar(t('errors.invalidImage') || 'Please select an image file', { variant: 'error' });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result.split(',')[1];
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('message', t('chatbot.detectDisease') || 'What disease is this?');

        const response = await api.post('/agri-gpt/chat/upload', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // Add user message with image
        const userMsg = {
          id: Date.now(),
          text: t('chatbot.detectDisease') || 'What disease is this?',
          sender: 'user',
          timestamp: new Date().toLocaleTimeString(),
          hasImage: true,
          image: base64Image
        };
        setMessages(prev => [...prev, userMsg]);

        // Add bot response
        const botMsg = {
          id: Date.now() + 1,
          text: response.data.text || response.data.conversation?.text || t('chatbot.responses.diseaseDetected') || 'Disease detected',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          data: response.data
        };
        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        console.error('Image upload error:', error);
        enqueueSnackbar(t('errors.uploadError') || 'Failed to upload image', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Container maxWidth="md" sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main' }}>
              {t('chatbot.title') || 'AI Assistant'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('chatbot.placeholder') || 'Ask about crops, diseases, weather...'}
            </Typography>
          </Box>
          <LanguageSwitcher variant="icon" />
        </Box>

        <Paper
          elevation={3}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: 'background.default'
            }}
          >
            {messages.length === 0 ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t('chatbot.loading') || 'Loading...'}
                </Typography>
              </Box>
            ) : (
              <List>
                {messages.map((msg) => (
                  <ListItem
                    key={msg.id}
                    sx={{
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        maxWidth: '70%',
                        gap: 1
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: msg.sender === 'user' ? 'primary.main' : 'secondary.main',
                          width: 32,
                          height: 32
                        }}
                      >
                        {msg.sender === 'user' ? <PersonIcon /> : <BotIcon />}
                      </Avatar>
                      <Box
                        sx={{
                          bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                          color: msg.sender === 'user' ? 'white' : 'text.primary',
                          p: 1.5,
                          borderRadius: 2,
                          boxShadow: 2
                        }}
                      >
                        {msg.hasImage && msg.image && (
                          <Box sx={{ mb: 1 }}>
                            <img
                              src={`data:image/jpeg;base64,${msg.image}`}
                              alt="Uploaded"
                              style={{ maxWidth: '200px', borderRadius: '8px' }}
                            />
                          </Box>
                        )}
                        <Typography variant="body1">{msg.text}</Typography>
                        {msg.data?.disease && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              label={`${t('chatbot.disease') || 'Disease'}: ${msg.data.disease.name}`}
                              size="small"
                              sx={{ mr: 1, mb: 0.5 }}
                            />
                            <Chip
                              label={`${t('chatbot.confidence') || 'Confidence'}: ${(msg.data.disease.confidence_score * 100).toFixed(1)}%`}
                              size="small"
                              color="success"
                            />
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {msg.timestamp}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
                {loading && (
                  <ListItem>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                        <BotIcon />
                      </Avatar>
                      <CircularProgress size={20} />
                    </Box>
                  </ListItem>
                )}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          <Box
            component="form"
            onSubmit={handleSend}
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              gap: 1,
              alignItems: 'center'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              color="primary"
            >
              <ImageIcon />
            </IconButton>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={t('chatbot.placeholder') || 'Ask about crops, diseases, weather...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.default',
                  '& fieldset': {
                    borderColor: 'divider'
                  }
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <IconButton
              type="submit"
              disabled={!message.trim() || loading}
              color="primary"
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Paper>
      </Container>
  );
}
