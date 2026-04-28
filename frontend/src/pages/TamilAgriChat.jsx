import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Send as SendIcon, Translate as TranslateIcon } from '@mui/icons-material';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const categorizeCrop = (key = '') => {
  const normalized = String(key).toLowerCase();
  const categories = {
    cereals: ['rice', 'wheat', 'maize', 'ragi', 'sorghum', 'pearlmillet'],
    pulses: ['blackgram', 'greengram', 'redgram', 'chickpea', 'beans'],
    oilseeds: ['groundnut', 'sesame', 'sunflower', 'mustard', 'soybean', 'cotton'],
    vegetables: ['tomato', 'chilli', 'brinjal', 'onion', 'okra', 'cabbage', 'cauliflower', 'coriander', 'tapioca'],
    fruits: ['banana', 'mango', 'grapes'],
    plantation_spices: ['sugarcane', 'coconut', 'turmeric', 'moringa']
  };
  const found = Object.entries(categories).find(([, keys]) => keys.includes(normalized));
  return found ? found[0] : 'others';
};

export default function TamilAgriChat() {
  const CROP_PANEL_PREFS_KEY = 'tamil-chat:supported-crops-prefs';
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [supportedCrops, setSupportedCrops] = useState([]);
  const [showAllSupportedCrops, setShowAllSupportedCrops] = useState(false);
  const [supportedCropSearch, setSupportedCropSearch] = useState('');
  const [selectedCropCategory, setSelectedCropCategory] = useState('all');
  const [language, setLanguage] = useState('ta');
  const [sessionId, setSessionId] = useState(null);
  const listBottomRef = useRef(null);

  const welcomeText = useMemo(
    () =>
      language === 'ta'
        ? 'வணக்கம்! நான் உங்கள் தமிழ்-ஆங்கில வேளாண் உதவியாளர். பயிர், நோய், சந்தை, வானிலை, அரசு திட்டங்கள் பற்றி கேளுங்கள்.'
        : 'Hello! I am your Tamil-English agriculture assistant. Ask about crops, diseases, weather, market prices, and schemes.',
    [language]
  );

  const filteredSupportedCrops = useMemo(() => {
    const search = String(supportedCropSearch || '').trim().toLowerCase();
    if (!search) return supportedCrops;
    return supportedCrops.filter((crop) =>
      String(crop?.english || '').toLowerCase().includes(search)
      || String(crop?.tamil || '').toLowerCase().includes(search)
      || String(crop?.key || '').toLowerCase().includes(search));
  }, [supportedCropSearch, supportedCrops]);
  const categoryFilteredCrops = useMemo(() => (
    selectedCropCategory === 'all'
      ? filteredSupportedCrops
      : filteredSupportedCrops.filter((crop) => categorizeCrop(crop?.key) === selectedCropCategory)
  ), [filteredSupportedCrops, selectedCropCategory]);
  const categoryLabels = useMemo(() => ({
    all: language === 'ta' ? 'அனைத்தும்' : 'All',
    cereals: language === 'ta' ? 'தானியங்கள்' : 'Cereals',
    pulses: language === 'ta' ? 'பருப்புகள்' : 'Pulses',
    oilseeds: language === 'ta' ? 'எண்ணெய் விதைகள்' : 'Oilseeds',
    vegetables: language === 'ta' ? 'காய்கறிகள்' : 'Vegetables',
    fruits: language === 'ta' ? 'பழங்கள்' : 'Fruits',
    plantation_spices: language === 'ta' ? 'தோட்ட/மசாலா பயிர்கள்' : 'Plantation & Spices',
    others: language === 'ta' ? 'பிற பயிர்கள்' : 'Other Crops'
  }), [language]);
  const groupedSupportedCrops = useMemo(() => {
    const grouped = categoryFilteredCrops.reduce((acc, crop) => {
      const category = categorizeCrop(crop?.key);
      acc[category] = acc[category] || [];
      acc[category].push(crop);
      return acc;
    }, {});
    const order = ['cereals', 'pulses', 'oilseeds', 'vegetables', 'fruits', 'plantation_spices', 'others'];
    return order
      .filter((category) => Array.isArray(grouped[category]) && grouped[category].length > 0)
      .map((category) => ({
        category,
        crops: showAllSupportedCrops ? grouped[category] : grouped[category].slice(0, 4)
      }))
      .slice(0, showAllSupportedCrops ? undefined : 3);
  }, [categoryFilteredCrops, showAllSupportedCrops]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await api.get('/chat/suggestions', { params: { lang: language } });
        setSuggestions(response?.data?.data?.suggestions || []);
      } catch (_) {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [language]);

  useEffect(() => {
    const fetchSupportedCrops = async () => {
      try {
        const response = await api.get('/chat/crops-supported');
        const payload = response?.data?.data || {};
        setSupportedCrops(Array.isArray(payload.crops) ? payload.crops : []);
      } catch (_) {
        setSupportedCrops([]);
      }
    };
    fetchSupportedCrops();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CROP_PANEL_PREFS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved?.search === 'string') setSupportedCropSearch(saved.search);
      if (typeof saved?.showAll === 'boolean') setShowAllSupportedCrops(saved.showAll);
      if (typeof saved?.category === 'string') setSelectedCropCategory(saved.category);
    } catch (_) {
      // Ignore malformed local preference payload.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CROP_PANEL_PREFS_KEY,
        JSON.stringify({
          search: supportedCropSearch,
          showAll: showAllSupportedCrops,
          category: selectedCropCategory
        })
      );
    } catch (_) {
      // Ignore storage write failures.
    }
  }, [supportedCropSearch, showAllSupportedCrops, selectedCropCategory]);

  useEffect(() => {
    listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (value = input) => {
    const message = String(value || '').trim();
    if (!message || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await api.post('/chat/bilingual', {
        message,
        language,
        sessionId
      });
      const payload = response?.data?.data || {};
      if (payload.sessionId) setSessionId(payload.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: payload.reply || (language === 'ta' ? 'பதில் கிடைக்கவில்லை' : 'No response available'),
          meta: `${payload.type || 'general'} • ${Math.round((payload.confidence || 0) * 100)}%`,
          source: payload.source || payload.metadata?.source || 'rule_engine',
          isFallback: Boolean(payload.isFallback ?? payload.metadata?.isFallback)
        }
      ]);
      if (Array.isArray(payload.quickReplies)) {
        setSuggestions(payload.quickReplies);
      }
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            language === 'ta'
              ? 'மன்னிக்கவும், இப்போது பதில் தர முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
              : 'Sorry, unable to process right now. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: 3 }}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">🌾 {language === 'ta' ? 'தமிழ் விவசாய உதவியாளர்' : 'Tamil Agri Assistant'}</Typography>
        <Button
          startIcon={<TranslateIcon />}
          variant="outlined"
          onClick={() => setLanguage((prev) => (prev === 'ta' ? 'en' : 'ta'))}
        >
          {language === 'ta' ? 'English' : 'தமிழ்'}
        </Button>
      </Paper>

      <Paper sx={{ p: 2, minHeight: 460, maxHeight: 560, overflow: 'auto', mb: 2 }}>
        {messages.length === 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="body1">{welcomeText}</Typography>
          </Paper>
        )}

        <Stack spacing={1.25}>
          {messages.map((msg, idx) => (
            <Box key={`${msg.role}-${idx}`} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper
                sx={{
                  px: 1.5,
                  py: 1.25,
                  maxWidth: '78%',
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.default',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                {msg.meta ? (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {msg.meta}
                  </Typography>
                ) : null}
              </Paper>
            </Box>
          ))}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Paper sx={{ p: 1.25 }}>
                <CircularProgress size={18} />
              </Paper>
            </Box>
          ) : null}
        </Stack>
        <div ref={listBottomRef} />
      </Paper>

      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {suggestions.slice(0, 6).map((item, idx) => (
            <Chip key={`${item}-${idx}`} label={item} onClick={() => sendMessage(item)} />
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.25, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={language === 'ta' ? 'உங்கள் கேள்வியை எழுதுங்கள்...' : 'Type your agriculture question...'}
        />
        <IconButton color="primary" onClick={() => sendMessage()} disabled={isLoading || !String(input || '').trim()}>
          <SendIcon />
        </IconButton>
      </Paper>
      <Typography variant="caption" color="text.secondary">
        {t('common.note', 'Note')}: {language === 'ta' ? 'இந்த சாட்பாட் விவசாய கேள்விகளுக்காக வடிவமைக்கப்பட்டது.' : 'This chatbot is designed for agriculture queries.'}
      </Typography>
    </Box>
  );
}
