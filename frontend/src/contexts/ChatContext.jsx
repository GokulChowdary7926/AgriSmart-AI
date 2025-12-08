import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  // Get language from localStorage to avoid circular dependency with LanguageContext
  // Use a function to get current language when needed instead of storing in state
  const getLanguage = useCallback(() => {
    return localStorage.getItem('language') || 'en';
  }, []);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-connect socket when token is available
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize socket connection
  const connectSocket = useCallback((token) => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io('http://localhost:5001', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      if (!activeSession || activeSession.sessionId !== message.sessionId) {
        setUnreadCount(prev => prev + 1);
      }
    });

    newSocket.on('weather-alert', (alert) => {
      // Handle weather alerts
      console.log('Weather alert:', alert);
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket, activeSession]);

  // Start new chat session
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

  // Send message
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
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Load chat history
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
      console.error('Failed to load chat history:', error);
      throw error;
    }
  };

  // List chat sessions
  const listChatSessions = async (params = {}) => {
    try {
      const response = await api.get('/chatbot/sessions', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to list chat sessions:', error);
      throw error;
    }
  };

  // Update chat session
  const updateChatSession = async (sessionId, updates) => {
    try {
      const response = await api.put(`/chatbot/${sessionId}`, updates);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update chat session:', error);
      throw error;
    }
  };

  // Delete chat session
  const deleteChatSession = async (sessionId) => {
    try {
      await api.delete(`/chatbot/${sessionId}`);
      if (activeSession?.sessionId === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  };

  // Join farm room for real-time updates
  const joinFarmRoom = (farmId) => {
    if (socket && isConnected) {
      socket.emit('join-farm', farmId);
    }
  };

  // Send farm chat message
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

