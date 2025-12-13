import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import logger from '../services/logger';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const getLanguage = useCallback(() => {
    return localStorage.getItem('language') || 'en';
  }, []);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socket) {
      connectSocket(token);
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const connectSocket = useCallback((token) => {
    if (socket) {
      socket.disconnect();
    }

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 60000, // Increase timeout to 60 seconds
      pingTimeout: 60000, // Increase ping timeout
      pingInterval: 25000 // Ping every 25 seconds
    });

    newSocket.on('connect', () => {
      logger.info('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      logger.warn('Socket connection error', { message: error.message });
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { reason });
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      if (!activeSession || activeSession.sessionId !== message.sessionId) {
        setUnreadCount(prev => prev + 1);
      }
    });

    newSocket.on('weather-alert', (alert) => {
      logger.info('Weather alert received', { alert });
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket, activeSession]);

  const startChat = async (context = {}) => {
    try {
      const response = await api.post('/chatbot/start', { 
        context,
        language: getLanguage() // Include current language
      });
      const session = response.data.data;
      
      setActiveSession({
        sessionId: session.sessionId,
        title: session.sessionTitle
      });
      
      setMessages([session.welcomeMessage]);
      setUnreadCount(0);
      
      return session;
    } catch (error) {
      console.error('Failed to start chat:', error);
      throw error;
    }
  };

  const sendMessage = async (content, attachments = []) => {
    if (!activeSession) {
      throw new Error('No active chat session');
    }

    try {
      const response = await api.post(`/chatbot/${activeSession.sessionId}/message`, {
        content,
        attachments,
        language: getLanguage() // Include current language for response
      });

      const { userMessage, aiResponse } = response.data.data;
      
      setMessages(prev => [...prev, userMessage, aiResponse]);
      
      return { userMessage, aiResponse };
    } catch (error) {
      logger.error('Failed to send message', error);
      throw error;
    }
  };

  const loadChatHistory = async (sessionId) => {
    try {
      const response = await api.get(`/chatbot/${sessionId}/history`);
      const { messages: historyMessages } = response.data.data;
      
      setActiveSession({
        sessionId: response.data.data.sessionId,
        title: response.data.data.title
      });
      
      setMessages(historyMessages);
      setUnreadCount(0);
      
      return historyMessages;
    } catch (error) {
      logger.error('Failed to load chat history', error);
      throw error;
    }
  };

  const listChatSessions = async (params = {}) => {
    try {
      const response = await api.get('/chatbot/sessions', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to list chat sessions', error);
      throw error;
    }
  };

  const updateChatSession = async (sessionId, updates) => {
    try {
      const response = await api.put(`/chatbot/${sessionId}`, updates);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to update chat session', error);
      throw error;
    }
  };

  const deleteChatSession = async (sessionId) => {
    try {
      await api.delete(`/chatbot/${sessionId}`);
      if (activeSession?.sessionId === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (error) {
      logger.error('Failed to delete chat session', error);
      throw error;
    }
  };

  const joinFarmRoom = (farmId) => {
    if (socket && isConnected) {
      socket.emit('join-farm', farmId);
    }
  };

  const sendFarmMessage = (farmId, message) => {
    if (socket && isConnected) {
      socket.emit('chat-message', { farmId, message });
    }
  };

  const value = {
    socket,
    isConnected,
    activeSession,
    messages,
    unreadCount,
    connectSocket,
    startChat,
    sendMessage,
    loadChatHistory,
    listChatSessions,
    updateChatSession,
    deleteChatSession,
    joinFarmRoom,
    sendFarmMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

