import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  InputAdornment,
  Badge,
  Chip,
  CircularProgress,
  Drawer,
  AppBar,
  Toolbar,
  Button,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import logger from '../services/logger';

export default function AgriChat() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [radius, setRadius] = useState(50); // km
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const drawerRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/agri-chat/conversations');
      setConversations(response.data.data || []);
    } catch (error) {
      logger.error('Error loading conversations', error);
      enqueueSnackbar('Failed to load conversations', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const loadNearbyUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/agri-chat/nearby?radius=${radius * 1000}`);
      const users = response.data.data || [];
      setNearbyUsers(users);
      
      if (!response.data.success && users.length === 0) {
        enqueueSnackbar(response.data.message || 'No nearby sellers/dealers found. Try searching instead.', { 
          variant: 'info',
          autoHideDuration: 4000
        });
      } else if (users.length === 0) {
        enqueueSnackbar('No nearby sellers/dealers found. Try searching for users instead.', { 
          variant: 'info',
          autoHideDuration: 4000
        });
      }
    } catch (error) {
      console.error('Error loading nearby users:', error);
      setNearbyUsers([]);
      enqueueSnackbar(
        error.response?.data?.message || 
        'Unable to load nearby sellers/dealers. You can still search for users.', 
        { 
          variant: 'info',
          autoHideDuration: 5000
        }
      );
    } finally {
      setLoading(false);
    }
  }, [radius, enqueueSnackbar]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.warn('No token found, skipping socket connection');
      return;
    }

    if (socket && socket.connected) {
      logger.debug('Socket already connected, skipping new connection');
      return;
    }

    let newSocket;
    let isMounted = true;
    
    try {
      const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
      newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: false, // Reuse existing connection if available
        autoConnect: true
      });

      newSocket.on('connect', () => {
        if (isMounted) {
          logger.info('AgriChat socket connected');
          setIsConnected(true);
          loadConversations();
          loadNearbyUsers();
        }
      });

      newSocket.on('connect_error', (error) => {
        if (isMounted) {
          logger.warn('Socket connection error', { message: error.message });
          setIsConnected(false);
        }
      });

      newSocket.on('disconnect', (reason) => {
        if (isMounted) {
          logger.info('Socket disconnected', { reason });
          setIsConnected(false);
          if (reason === 'io server disconnect') {
            setTimeout(() => {
              if (isMounted && newSocket && !newSocket.connected) {
                newSocket.connect();
              }
            }, 2000);
          }
        }
      });

      newSocket.on('agri-chat:new-message', (message) => {
        if (selectedConversation && message.conversation.toString() === selectedConversation._id) {
          setMessages(prev => [...prev, message]);
        }
        loadConversations();
      });

      newSocket.on('agri-chat:message-sent', (message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('agri-chat:conversation-updated', (conversation) => {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversation._id ? conversation : conv
          )
        );
      });

      newSocket.on('agri-chat:typing', (data) => {
        if (data.isTyping) {
          setTypingUsers(prev => ({ ...prev, [data.userId]: true }));
        } else {
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[data.userId];
            return newState;
          });
        }
      });

      newSocket.on('agri-chat:error', (error) => {
        if (isMounted) {
          enqueueSnackbar(error.error || 'An error occurred', { variant: 'error' });
        }
      });

      if (isMounted) {
        setSocket(newSocket);
      }
    } catch (error) {
      logger.error('Failed to initialize socket', error);
      if (isMounted) {
        enqueueSnackbar('Failed to connect to chat server', { variant: 'error' });
      }
    }

    return () => {
      isMounted = false;
      if (newSocket) {
        if (newSocket.connected) {
          newSocket.disconnect();
        }
        newSocket.removeAllListeners();
      }
    };
  }, [loadConversations, loadNearbyUsers]); // Include dependencies to avoid stale closures

  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/agri-chat/conversation/${conversationId}/messages`);
      setMessages(response.data.data || []);
      scrollToBottom();
    } catch (error) {
      logger.error('Error loading messages', error);
      enqueueSnackbar('Failed to load messages', { variant: 'error' });
    } finally {
      setLoadingMessages(false);
    }
  }, [enqueueSnackbar]);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/agri-chat/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data || []);
    } catch (error) {
      logger.error('Error searching users', error);
    }
  }, []);

  const startConversation = async (otherUserId) => {
    try {
      const response = await api.post('/agri-chat/conversation', { otherUserId });
      const conversation = response.data.data;
      setSelectedConversation(conversation);
      setShowNearby(false);
      await loadMessages(conversation._id);
      await loadConversations();
    } catch (error) {
      logger.error('Error starting conversation', error);
      enqueueSnackbar('Failed to start conversation', { variant: 'error' });
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    const content = messageText.trim();
    setMessageText('');

    try {
      if (socket) {
        socket.emit('agri-chat:send-message', {
          conversationId: selectedConversation._id,
          content,
          type: 'text'
        });
      } else {
        await api.post('/agri-chat/message', {
          conversationId: selectedConversation._id,
          content,
          type: 'text'
        });
        await loadMessages(selectedConversation._id);
      }
      scrollToBottom();
    } catch (error) {
      logger.error('Error sending message', error);
      enqueueSnackbar('Failed to send message', { variant: 'error' });
    }
  };

  const handleTyping = () => {
    if (socket && selectedConversation) {
      socket.emit('agri-chat:typing', {
        conversationId: selectedConversation._id
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socket && selectedConversation) {
          socket.emit('agri-chat:stop-typing', {
            conversationId: selectedConversation._id
          });
        }
      }, 3000);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    loadConversations();
    loadNearbyUsers();
  }, [loadConversations, loadNearbyUsers]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
    }
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const getOtherParticipant = (conversation) => {
    return conversation.otherParticipant || 
           conversation.participants?.find(p => p._id !== user?._id);
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px - 48px)', bgcolor: 'background.default', m: -3, p: 0 }}>
      <Paper
        elevation={0}
        sx={{
          width: 350,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            AgriChat
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search sellers/dealers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={showNearby ? 'contained' : 'outlined'}
              startIcon={<LocationIcon />}
              onClick={() => {
                setShowNearby(!showNearby);
                if (!showNearby) loadNearbyUsers();
              }}
            >
              Nearby
            </Button>
          </Box>
        </Box>

        {searchQuery && searchResults.length > 0 && (
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', maxHeight: 200, overflow: 'auto' }}>
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
              Search Results
            </Typography>
            {searchResults.map((result) => (
              <ListItem
                key={result._id}
                button
                onClick={() => startConversation(result._id)}
                sx={{ py: 1 }}
              >
                <ListItemAvatar>
                  <Avatar>{result.name?.[0]?.toUpperCase() || 'U'}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={result.name}
                  secondary={`${result.role || 'user'} • ${result.farmerProfile?.location?.district || 'Unknown'}`}
                />
              </ListItem>
            ))}
          </Box>
        )}

        {showNearby && (
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', maxHeight: 300, overflow: 'auto' }}>
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Nearby Sellers/Dealers ({nearbyUsers.length})
              </Typography>
              <IconButton size="small" onClick={() => setShowNearby(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : nearbyUsers.length === 0 ? (
              <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  No nearby sellers/dealers found
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Try searching for users by name or check if your location is set in your profile
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchQuery('');
                    setShowNearby(false);
                  }}
                >
                  Search Users Instead
                </Button>
              </Box>
            ) : (
              nearbyUsers.map((nearbyUser) => (
                <ListItem
                  key={nearbyUser._id}
                  button
                  onClick={() => startConversation(nearbyUser._id)}
                  sx={{ py: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar>{nearbyUser.name?.[0]?.toUpperCase() || 'U'}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={nearbyUser.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {nearbyUser.role || 'user'} • {nearbyUser.distance} km away
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {nearbyUser.farmerProfile?.location?.district || 'Unknown location'}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </Box>
        )}

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading && conversations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No conversations yet. Search for sellers/dealers to start chatting!
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const unreadCount = conversation.unreadCount || 0;
                const isSelected = selectedConversation?._id === conversation._id;

                return (
                  <ListItem
                    key={conversation._id}
                    button
                    selected={isSelected}
                    onClick={() => setSelectedConversation(conversation)}
                    sx={{
                      bgcolor: isSelected ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={unreadCount} color="primary">
                        <Avatar>{otherParticipant?.name?.[0]?.toUpperCase() || 'U'}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: unreadCount > 0 ? 600 : 400 }}>
                            {otherParticipant?.name || 'Unknown User'}
                          </Typography>
                          {conversation.lastMessage?.timestamp && (
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            color: unreadCount > 0 ? 'text.primary' : 'text.secondary',
                            fontWeight: unreadCount > 0 ? 500 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {conversation.lastMessage?.text || 'No messages yet'}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        {selectedConversation ? (
          <>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'background.paper'
              }}
            >
              <Avatar sx={{ mr: 2 }}>
                {getOtherParticipant(selectedConversation)?.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {getOtherParticipant(selectedConversation)?.name || 'Unknown User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getOtherParticipant(selectedConversation)?.role || 'user'} •{' '}
                  {getOtherParticipant(selectedConversation)?.farmerProfile?.location?.district || 'Unknown'}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {loadingMessages ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No messages yet. Start the conversation!
                  </Typography>
                </Box>
              ) : (
                <>
                  {messages.map((message) => {
                    const isOwn = message.sender?._id === user?._id || message.sender?._id?.toString() === user?._id?.toString();
                    return (
                      <Box
                        key={message._id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          mb: 1
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            maxWidth: '70%',
                            bgcolor: isOwn ? 'primary.main' : 'background.paper',
                            color: isOwn ? 'primary.contrastText' : 'text.primary',
                            borderRadius: 2,
                            border: isOwn ? 'none' : '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          {!isOwn && (
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8 }}>
                              {message.sender?.name || 'Unknown'}
                            </Typography>
                          )}
                          <Typography variant="body2">{message.content}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              opacity: 0.7,
                              textAlign: 'right'
                            }}
                          >
                            {formatTime(message.createdAt)}
                            {isOwn && message.status === 'read' && ' ✓✓'}
                            {isOwn && message.status === 'delivered' && ' ✓'}
                          </Typography>
                        </Paper>
                      </Box>
                    );
                  })}
                  {Object.keys(typingUsers).length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {getOtherParticipant(selectedConversation)?.name || 'User'} is typing...
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </Box>

            <Box
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                gap: 1
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                multiline
                maxRows={4}
              />
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={!messageText.trim()}
                sx={{ alignSelf: 'flex-end' }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Select a conversation to start chatting
            </Typography>
            <Typography variant="body2">
              Search for nearby sellers/dealers or select an existing conversation
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

