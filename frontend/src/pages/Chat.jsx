import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  History as HistoryIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import logger from '../services/logger';
import api, { getApiErrorMessage } from '../services/api';
import { detectRealtimeLocation, getStoredLocation } from '../services/realtimeLocation';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import CropDetailsCard from '../components/CropDetailsCard';
import { normalizeSessionMessages } from './chatSessionUtils';

const extractApiPayload = (responseData) => {
  const dataPayload = responseData?.data && typeof responseData.data === 'object' ? responseData.data : {};
  return {
    ...dataPayload,
    ...responseData
  };
};

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

const inferMessageLanguage = (text, fallbackLanguage = 'en') => {
  const value = String(text || '').trim();
  if (!value) return String(fallbackLanguage || 'en').toLowerCase().split('-')[0];
  if (/[\u0B80-\u0BFF]/.test(value)) return 'ta';
  if (/[a-z]/i.test(value)) return 'en';
  return String(fallbackLanguage || 'en').toLowerCase().split('-')[0];
};

const isSimpleCropCommand = (text) => {
  const value = String(text || '').toLowerCase().trim();
  if (!value) return false;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length > 3) return false;
  const cropTerms = [
    'rice', 'paddy', 'wheat', 'maize', 'tomato', 'groundnut', 'cotton', 'sugarcane',
    'beans', 'chilli', 'brinjal', 'banana', 'coconut', 'ragi', 'blackgram', 'greengram', 'turmeric', 'onion', 'tapioca', 'cassava',
    'sorghum', 'cholam', 'pearl millet', 'pearlmillet', 'cumbu', 'redgram', 'pigeon pea', 'chickpea', 'sesame', 'gingelly',
    'sunflower', 'mustard', 'soybean', 'coriander', 'okra', 'ladyfinger', 'cabbage', 'cauliflower', 'moringa', 'mango', 'grapes',
    'நெல்', 'அரிசி', 'கோதுமை', 'மக்காச்சோளம்', 'தக்காளி', 'நிலக்கடலை', 'பருத்தி', 'கரும்பு', 'பீன்ஸ்', 'பயறு', 'மிளகாய்', 'கத்தரி',
    'வாழை', 'தேங்காய்', 'கேழ்வரகு', 'உளுந்து', 'பாசிப்பயறு', 'மஞ்சள்', 'வெங்காயம்', 'மரவள்ளிக்கிழங்கு',
    'சோளம்', 'கம்பு', 'துவரை', 'கொண்டைக்கடலை', 'எள்', 'சூரியகாந்தி', 'கடுகு', 'சோயாபீன்', 'கொத்தமல்லி', 'வெண்டை',
    'முட்டைக்கோஸ்', 'பூக்கோசு', 'முருங்கை', 'மாம்பழம்', 'திராட்சை'
  ];
  return tokens.some((token) => cropTerms.some((term) => token.includes(term) || term.includes(token)));
};

const buildStructuredFallbackFromUserInput = (userInput, language = 'en', location = null) => {
  const query = String(userInput || '').toLowerCase();
  const state = location?.state || 'Tamil Nadu';
  const district = location?.district || location?.city || '';
  const locationLabel = district ? `${district}, ${state}` : state;
  const cropAliasMap = [
    { key: 'rice', en: 'Rice (Paddy)', ta: 'நெல்', aliases: ['rice', 'paddy', 'நெல்', 'அரிசி'] },
    { key: 'wheat', en: 'Wheat', ta: 'கோதுமை', aliases: ['wheat', 'கோதுமை', 'gothumai'] },
    { key: 'maize', en: 'Maize', ta: 'மக்காச்சோளம்', aliases: ['maize', 'corn', 'மக்காச்சோளம்'] },
    { key: 'tomato', en: 'Tomato', ta: 'தக்காளி', aliases: ['tomato', 'தக்காளி'] },
    { key: 'groundnut', en: 'Groundnut', ta: 'நிலக்கடலை', aliases: ['groundnut', 'peanut', 'நிலக்கடலை'] },
    { key: 'beans', en: 'Beans', ta: 'பீன்ஸ்', aliases: ['beans', 'பீன்ஸ்', 'பயறு'] },
    { key: 'chilli', en: 'Chilli', ta: 'மிளகாய்', aliases: ['chilli', 'chili', 'மிளகாய்'] },
    { key: 'brinjal', en: 'Brinjal', ta: 'கத்தரி', aliases: ['brinjal', 'eggplant', 'கத்தரி'] },
    { key: 'cotton', en: 'Cotton', ta: 'பருத்தி', aliases: ['cotton', 'பருத்தி'] },
    { key: 'sugarcane', en: 'Sugarcane', ta: 'கரும்பு', aliases: ['sugarcane', 'கரும்பு'] },
    { key: 'banana', en: 'Banana', ta: 'வாழை', aliases: ['banana', 'வாழை'] },
    { key: 'coconut', en: 'Coconut', ta: 'தேங்காய்', aliases: ['coconut', 'தேங்காய்'] },
    { key: 'ragi', en: 'Ragi', ta: 'கேழ்வரகு', aliases: ['ragi', 'finger millet', 'கேழ்வரகு'] },
    { key: 'blackgram', en: 'Blackgram', ta: 'உளுந்து', aliases: ['blackgram', 'urad', 'உளுந்து'] },
    { key: 'greengram', en: 'Greengram', ta: 'பாசிப்பயறு', aliases: ['greengram', 'moong', 'பாசிப்பயறு'] },
    { key: 'turmeric', en: 'Turmeric', ta: 'மஞ்சள்', aliases: ['turmeric', 'மஞ்சள்'] },
    { key: 'onion', en: 'Onion', ta: 'வெங்காயம்', aliases: ['onion', 'வெங்காயம்'] },
    { key: 'tapioca', en: 'Tapioca', ta: 'மரவள்ளிக்கிழங்கு', aliases: ['tapioca', 'cassava', 'மரவள்ளிக்கிழங்கு'] },
    { key: 'sorghum', en: 'Sorghum', ta: 'சோளம்', aliases: ['sorghum', 'cholam', 'சோளம்'] },
    { key: 'pearlmillet', en: 'Pearl Millet', ta: 'கம்பு', aliases: ['pearl millet', 'pearlmillet', 'cumbu', 'கம்பு'] },
    { key: 'redgram', en: 'Redgram', ta: 'துவரை', aliases: ['redgram', 'pigeon pea', 'pigeonpea', 'tur', 'துவரை'] },
    { key: 'chickpea', en: 'Chickpea', ta: 'கொண்டைக்கடலை', aliases: ['chickpea', 'bengalgram', 'கொண்டைக்கடலை'] },
    { key: 'sesame', en: 'Sesame', ta: 'எள்', aliases: ['sesame', 'gingelly', 'எள்'] },
    { key: 'sunflower', en: 'Sunflower', ta: 'சூரியகாந்தி', aliases: ['sunflower', 'சூரியகாந்தி'] },
    { key: 'mustard', en: 'Mustard', ta: 'கடுகு', aliases: ['mustard', 'கடுகு'] },
    { key: 'soybean', en: 'Soybean', ta: 'சோயாபீன்', aliases: ['soybean', 'சோயாபீன்'] },
    { key: 'coriander', en: 'Coriander', ta: 'கொத்தமல்லி', aliases: ['coriander', 'கொத்தமல்லி'] },
    { key: 'okra', en: 'Okra', ta: 'வெண்டை', aliases: ['okra', 'ladyfinger', 'வெண்டை'] },
    { key: 'cabbage', en: 'Cabbage', ta: 'முட்டைக்கோஸ்', aliases: ['cabbage', 'முட்டைக்கோஸ்'] },
    { key: 'cauliflower', en: 'Cauliflower', ta: 'பூக்கோசு', aliases: ['cauliflower', 'பூக்கோசு'] },
    { key: 'moringa', en: 'Moringa', ta: 'முருங்கை', aliases: ['moringa', 'drumstick', 'முருங்கை'] },
    { key: 'mango', en: 'Mango', ta: 'மாம்பழம்', aliases: ['mango', 'மாம்பழம்'] },
    { key: 'grapes', en: 'Grapes', ta: 'திராட்சை', aliases: ['grapes', 'திராட்சை'] }
  ];
  const matchedCrop = cropAliasMap.find((crop) => crop.aliases.some((alias) => query.includes(alias)));
  const isCultivationOrHarvestQuery = [
    'cultivation', 'harvest', 'harvesting', 'sowing', 'seed', 'season',
    'சாகுபடி', 'அறுவடை', 'விதைப்பு', 'பருவம்'
  ].some((keyword) => query.includes(keyword));
  const isCropRecommendationQuery = [
    'crop recommendation', 'recommendation', 'best crop', 'my area', 'location',
    'பயிர் பரிந்துரை', 'எந்த பயிர்', 'என் பகுதி', 'என் இடம்'
  ].some((keyword) => query.includes(keyword));

  if (matchedCrop && isCultivationOrHarvestQuery) {
    if (language === 'ta') {
      return [
        `### **${matchedCrop.ta} சாகுபடி & அறுவடை வழிகாட்டி (${locationLabel})**`,
        '',
        '### **பருவம் (Season)**',
        matchedCrop.key === 'wheat'
          ? '- ரபி பருவம் (நவம்பர்-டிசம்பர் விதைப்பு, மார்ச்-ஏப்ரல் அறுவடை).'
          : matchedCrop.key === 'rice'
            ? '- சம்பா / குறுவை (பகுதி வானிலை அடிப்படையில்).'
            : '- உள்ளூர் பருவம் + வானிலை கணிப்பை வைத்து விதைப்பு தேதி நிர்ணயிக்கவும்.',
        '',
        '### **மண் & நிலத் தயாரிப்பு**',
        '- மண் பரிசோதனை செய்து pH, NPK மதிப்பை உறுதி செய்யவும்.',
        '- ஏக்கருக்கு 2-3 டன் கம்போஸ்ட்/FYM சேர்த்து நிலத்தை தயார் செய்யவும்.',
        '',
        '### **நீர் மேலாண்மை**',
        matchedCrop.key === 'wheat'
          ? '- முக்கிய கட்டங்களில் 4-6 பாசனம் (CRI, tillering, flowering, grain filling).'
          : '- வளர்ச்சி கட்டத்தைப் பொறுத்து கட்டுப்படுத்தப்பட்ட பாசனம் செய்யவும்.',
        '',
        '### **உர திட்டம்**',
        '- அடிப்படை உரம் + நைட்ரஜன் பிரிப்பு (2-3 தவணை).',
        '- குறைபாடு இருந்தால் மைக்ரோநியூட்ரியன்ட் இலைத் தெளிப்பு செய்யவும்.',
        '',
        '### **அறுவடை**',
        '- தானிய ஈரப்பதம்/பழுப்பு நிலையை பார்த்து அறுவடை நாள் தேர்வு செய்யவும்.',
        '- அறுவடைக்கு முன் 5-7 நாட்கள் பாசனம் குறைக்கவும்.',
        '',
        '### **அடுத்த படிகள் (Next Steps)**',
        '1. இந்த வாரம் மண் பரிசோதனை + விதை திட்டம்.',
        '2. பாசனம் & உர அட்டவணையை காலண்டரில் நிரப்பவும்.',
        '3. அறுவடை முன் சந்தை விலை போக்கை சரிபார்க்கவும்.'
      ].join('\n');
    }

    return [
      `### **${matchedCrop.en} Cultivation & Harvesting Guide (${locationLabel})**`,
      '',
      '### **Season**',
      matchedCrop.key === 'wheat'
        ? '- Rabi season (sow in Nov-Dec, harvest in Mar-Apr).'
        : matchedCrop.key === 'rice'
          ? '- Samba/Kuruvai windows based on local weather.'
          : '- Finalize sowing window using local weather trend.',
      '',
      '### **Soil & Land Preparation**',
      '- Run a soil test for pH and NPK status.',
      '- Add 2-3 tons/acre of compost/FYM before sowing.',
      '',
      '### **Water Management**',
      matchedCrop.key === 'wheat'
        ? '- Plan 4-6 irrigations at critical stages (CRI, tillering, flowering, grain filling).'
        : '- Use stage-wise controlled irrigation.',
      '',
      '### **Fertilizer Plan**',
      '- Basal application + split nitrogen in 2-3 doses.',
      '- Add micronutrient foliar spray if deficiency appears.',
      '',
      '### **Harvesting**',
      '- Harvest at proper grain maturity/moisture stage.',
      '- Reduce irrigation 5-7 days before harvest.',
      '',
      '### **Next Steps**',
      '1. Complete soil test and seed plan this week.',
      '2. Create irrigation/fertilizer schedule by crop stage.',
      '3. Check mandi trend before harvest window.'
    ].join('\n');
  }

  if (matchedCrop) {
    if (language === 'ta') {
      return [
        `### **${matchedCrop.ta} சாகுபடி விரிவான வழிகாட்டி (${locationLabel})**`,
        '',
        '### **பருவம்**',
        matchedCrop.key === 'wheat'
          ? '- ரபி பருவம் சிறந்தது.'
          : matchedCrop.key === 'rice'
            ? '- சம்பா / குறுவை பருவம் பொருத்தமானது.'
            : '- உள்ளூர் வானிலை அடிப்படையில் விதைப்பு தேதி தேர்வு செய்யவும்.',
        '',
        '### **மண் மற்றும் பாசனம்**',
        '- மண் பரிசோதனை செய்து pH, NPK அளவை உறுதி செய்யவும்.',
        '- வளர்ச்சி கட்டத்திற்கேற்ற கட்டுப்படுத்தப்பட்ட பாசனம் செய்யவும்.',
        '',
        '### **உர மற்றும் பாதுகாப்பு**',
        '- கம்போஸ்ட்/FYM அடிப்படை உரமாக பயன்படுத்தவும்.',
        '- நைட்ரஜன் உரத்தை 2-3 தவணைகளில் பிரித்து இடவும்.',
        '- பூச்சி/நோய் அறிகுறிகளை வாரம் 2 முறை கண்காணிக்கவும்.',
        '',
        '### **அடுத்த படிகள்**',
        '1. விதைப்பு தேதி + உர அட்டவணையை திட்டமிடவும்.',
        '2. உள்ளூர் சந்தை போக்கை பார்த்து அறுவடைத் திட்டம் அமைக்கவும்.'
      ].join('\n');
    }

    return [
      `### **${matchedCrop.en} Detailed Cultivation Guide (${locationLabel})**`,
      '',
      '### **Season**',
      matchedCrop.key === 'wheat'
        ? '- Rabi window is typically best.'
        : matchedCrop.key === 'rice'
          ? '- Samba/Kuruvai windows are usually suitable.'
          : '- Finalize sowing date based on local weather.',
      '',
      '### **Soil and Irrigation**',
      '- Run a soil test and confirm pH/NPK status.',
      '- Use stage-wise controlled irrigation.',
      '',
      '### **Fertilizer and Protection**',
      '- Apply compost/FYM as basal dose.',
      '- Split nitrogen into 2-3 applications.',
      '- Monitor field twice weekly for pests/diseases.',
      '',
      '### **Next Steps**',
      '1. Create sowing + fertilizer schedule.',
      '2. Track local mandi trend for harvest planning.'
    ].join('\n');
  }

  if (!isCropRecommendationQuery) {
    return language === 'ta'
      ? 'உங்கள் கேள்வியை பெற்றுள்ளேன். பயிர் பெயர், பகுதி, பிரச்சினை ஆகியவற்றை கூறினால் துல்லியமான விவசாய ஆலோசனை தருகிறேன்.'
      : 'I received your question. Share crop name, area, and issue to get precise agriculture advice.';
  }

  if (language === 'ta') {
    return [
      `### **${locationLabel} பகுதியுக்கான பயிர் பரிந்துரை**`,
      '',
      '### **பருவம் (Season)**',
      '**தற்போதைய பருவம்:** கோடை / சைத்',
      '',
      '### **மண்**',
      '- களிமண் கலந்த வடிகால் வசதி கொண்ட மண் சிறந்தது.',
      '- மண் pH 6.5 முதல் 7.5 இடையில் இருந்தால் விளைச்சல் மேம்படும்.',
      '',
      '### **நீர்**',
      '- நெல்: மிதமான முதல் அதிக நீர் தேவை.',
      '- மக்காச்சோளம்/நிலக்கடலை: கட்டுப்படுத்தப்பட்ட பாசனம் போதுமானது.',
      '',
      '### **உர மேலாண்மை**',
      '- அடிப்படை உரமாக ஏக்கருக்கு 2-3 டன் கம்போஸ்ட்/மாட்டு சாணம் இடவும்.',
      '- NPK அளவை மண் பரிசோதனை அடிப்படையில் 2-3 தவணைகளாக பிரித்து இடவும்.',
      '- குறைபாடு இருந்தால் மைக்ரோநியூட்ரியன்ட் இலைத் தெளிப்பு செய்யவும்.',
      '',
      '### **பூச்சி கட்டுப்பாடு**',
      '- வாரத்திற்கு 2 முறை புல ஆய்வு செய்யவும்.',
      '- மஞ்சள் ஒட்டும் பொறி மற்றும் பெரோமோன் டிராப் பயன்படுத்தவும்.',
      '- தேவைப்பட்டால் மட்டுமே பரிந்துரைக்கப்பட்ட அளவில் மருந்து பயன்படுத்தவும்.',
      '',
      '### **அடுத்த படிகள் (Next Steps)**',
      '1. மண் பரிசோதனை செய்து பொருத்தமான பயிரை இறுதி செய்யவும்.',
      '2. சிறிய பகுதியிலிருந்து தொடங்கி முடிவை மதிப்பீடு செய்யவும்.',
      '3. அருகிலுள்ள மண்டி விலை பார்த்து பயிர் கலவையை தீர்மானிக்கவும்.'
    ].join('\n');
  }

  return [
    `### **Crop Recommendations for ${locationLabel}**`,
    '',
    '### **Season**',
    '**Current season:** Zaid / Summer',
    '',
    '### **Soil**',
    '- Prefer well-drained loam to clay-loam soils.',
    '- Maintain pH near 6.5-7.5 for better nutrient availability.',
    '',
    '### **Water**',
    '- Rice requires medium-to-high irrigation support.',
    '- Maize/groundnut can perform with controlled irrigation.',
    '',
    '### **Fertilizer**',
    '- Apply 2-3 tons/acre FYM or compost as basal dose.',
    '- Split NPK application into 2-3 growth stages.',
    '- Use micronutrient foliar spray when deficiency is observed.',
    '',
    '### **Pest Control**',
    '- Scout field twice weekly for early symptoms.',
    '- Use sticky/pheromone traps for monitoring.',
    '- Apply plant protection chemicals only at recommended dose.',
    '',
    '### **Next Steps**',
    '1. Complete soil test and finalize crop mix.',
    '2. Start with a pilot patch before scaling.',
    '3. Validate local mandi trend before final sowing decision.'
  ].join('\n');
};

const sanitizeAssistantResponse = (text, language = 'en', userInput = '', location = null) => {
  const value = String(text || '').trim();
  if (!value) return value;
  const normalized = value.toLowerCase();
  const looksLikeUpstreamLimitError =
    normalized.includes('query length limit exceeded') ||
    normalized.includes('max allowed query');

  if (!looksLikeUpstreamLimitError) return value;
  return buildStructuredFallbackFromUserInput(userInput, language, location);
};

const isAgricultureQuery = (input, { hasRecentAgriContext = false } = {}) => {
  const text = String(input || '').trim().toLowerCase();
  if (!text) return false;
  const normalized = text.replace(/[\s\-_/]+/g, '');
  const containsKeyword = (keyword) => {
    const key = String(keyword || '').toLowerCase();
    if (!key) return false;
    return text.includes(key) || normalized.includes(key.replace(/[\s\-_/]+/g, ''));
  };

  const explicitNonAgri = [
    'coding', 'programming', 'javascript', 'python code', 'interview question',
    'movie', 'song', 'cricket score', 'football score', 'stock tips', 'crypto', 'bitcoin'
  ];
  if (explicitNonAgri.some((keyword) => containsKeyword(keyword))) {
    return false;
  }

  const agriKeywords = [
    'agri', 'agriculture', 'farm', 'farming', 'farmer', 'crop', 'crops', 'seed', 'sowing',
    'harvest', 'harvesting', 'irrigation', 'soil', 'fertility', 'fertilizer', 'fertiliser',
    'pest', 'disease', 'plant', 'weather', 'rainfall', 'market price', 'mandi', 'yield',
    'organic farming', 'compost', 'manure', 'npk', 'ph', 'livestock', 'dairy',
    // Core crop names and common commodity terms
    'rice', 'paddy', 'wheat', 'maize', 'onion', 'tomato', 'potato', 'groundnut', 'cotton', 'sugarcane',
    'pearlmillet', 'pearl millet', 'kambu', 'cumbu', 'sorghum', 'millet',
    'விவசாய', 'பயிர்', 'விதை', 'நடவு', 'அறுவடை', 'மண்', 'உரம்', 'பாசனம்',
    'நோய்', 'பூச்சி', 'விளைச்சல்', 'சந்தை', 'வானிலை', 'கால்நடை', 'பசளை',
    'கம்போஸ்ட்', 'நெல்', 'அரிசி', 'கோதுமை', 'கரும்பு', 'பருத்தி', 'மக்காச்சோளம்', 'வெங்காயம்', 'தக்காளி', 'கம்பு', 'சோளம்'
  ];

  const followUpKeywords = [
    'detail', 'details', 'detailed', 'explain', 'explanation', 'more', 'elaborate',
    'விவரம்', 'விரிவாக', 'விரிவான', 'விளக்கம்', 'மேலும்'
  ];

  if (followUpKeywords.some((keyword) => containsKeyword(keyword))) {
    return hasRecentAgriContext;
  }

  // Accept common single-token crop queries to avoid false blocks.
  const likelyCropTokens = [
    'pearlmillet', 'pearlmillet', 'bajra', 'cumbu', 'kambu', 'sorghum', 'ragi',
    'rice', 'paddy', 'wheat', 'maize', 'millet',
    'நெல்', 'கோதுமை', 'மக்காச்சோளம்', 'கம்பு', 'சோளம்', 'கேழ்வரகு'
  ];
  const compactToken = normalized;
  if (compactToken && !compactToken.includes(' ') && likelyCropTokens.some((token) => compactToken === token || compactToken.includes(token))) {
    return true;
  }

  return agriKeywords.some((keyword) => containsKeyword(keyword));
};

const hasRecentAgricultureContext = (messageList) => {
  const recentMessages = Array.isArray(messageList) ? messageList.slice(-8) : [];
  return recentMessages.some((msg) => {
    if (!msg || msg.role !== 'assistant') return false;
    const content = typeof msg.content === 'string' ? msg.content : '';
    return isAgricultureQuery(content, { hasRecentAgriContext: false });
  });
};

const TypingIndicator = ({ label }) => (
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
      {label}
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
  const CROP_PANEL_PREFS_KEY = 'chat:supported-crops-prefs';
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [sessions, setSessions] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [supportedCrops, setSupportedCrops] = useState([]);
  const [showAllSupportedCrops, setShowAllSupportedCrops] = useState(false);
  const [supportedCropSearch, setSupportedCropSearch] = useState('');
  const [selectedCropCategory, setSelectedCropCategory] = useState('all');
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

  const getWelcomeMessage = () => ({
    id: 'welcome',
    role: 'assistant',
    content: t('chatbot.responses.welcome'),
    timestamp: new Date(),
    intent: 'welcome',
    suggestions: [
      t('chatbot.suggestions.crop'),
      t('chatbot.suggestions.market'),
      t('chatbot.suggestions.weather'),
      t('chatbot.suggestions.disease')
    ]
  });

  useEffect(() => {
    initializeChat();
    fetchQuickReplies();
    fetchSupportedCrops();
    getUserLocation();
    if (user) {
      loadSessions();
    }
  }, [user, language]);

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
    setMessages([getWelcomeMessage()]);
  };

  const getUserLocation = async () => {
    try {
      const liveLocation = await detectRealtimeLocation(api, language);
      if (liveLocation) {
        setUserLocation(liveLocation);
        return;
      }
    } catch (error) {
      logger.warn('Live location unavailable, trying cached location', error);
    }

    const storedLocation = getStoredLocation();
    if (storedLocation) {
      setUserLocation(storedLocation);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await api.get('/agri-gpt/quick-replies');
      if (response.data.success) {
        const payload = extractApiPayload(response.data);
        setQuickReplies(payload.quickReplies || []);
      }
    } catch (error) {
      logger.error('Failed to fetch quick replies', error);
    }
  };

  const fetchSupportedCrops = async () => {
    try {
      const response = await api.get('/chat/crops-supported');
      if (response?.data?.success) {
        const payload = extractApiPayload(response.data);
        setSupportedCrops(Array.isArray(payload.crops) ? payload.crops : []);
      }
    } catch (error) {
      logger.error('Failed to load supported crops', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/agri-gpt/sessions');
      if (response.data.success) {
        const payload = extractApiPayload(response.data);
        setSessions(payload.sessions || []);
      }
    } catch (error) {
      logger.error('Failed to load sessions', error);
    }
  };

  const handleSelectSession = async (selectedSessionId) => {
    if (!selectedSessionId) return;

    try {
      setLoading(true);
      const response = await api.get(`/agri-gpt/sessions/${selectedSessionId}`);
      if (response?.data?.success) {
        const payload = extractApiPayload(response.data);
        setSessionId(selectedSessionId);
        setMessages(normalizeSessionMessages(payload.messages, getWelcomeMessage));
        return;
      }
      throw new Error(getApiErrorMessage(response?.data, 'Unable to load selected chat session.'));
    } catch (error) {
      logger.error('Failed to load selected session', error);
      enqueueSnackbar(
        getApiErrorMessage(error, t('chatbot.loadSessionFailed', 'Unable to load this chat. Please try again.')),
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
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

    const inferredLanguage = inferMessageLanguage(messageText, language);
    const uiLanguage = String(language || 'en').toLowerCase().split('-')[0];
    const responseLanguage = uiLanguage === 'ta' && isSimpleCropCommand(messageText)
      ? 'ta'
      : inferredLanguage;
    const hasRecentAgriContext = hasRecentAgricultureContext(messages);
    if (!isAgricultureQuery(messageText, { hasRecentAgriContext })) {
      const nonAgriText = responseLanguage === 'ta'
        ? '### **இது விவசாய உதவி சாட்பாட்**\n\nஇந்த சாட்பாட் **விவசாயம் தொடர்பான கேள்விகளுக்கே** பதில் வழங்கும்.\n\n**தயவு செய்து இந்த தலைப்புகளில் கேளுங்கள்:**\n- பயிர் பரிந்துரை\n- மண் வளம் மற்றும் உர மேலாண்மை\n- நோய் / பூச்சி கட்டுப்பாடு\n- பாசனம் மற்றும் வானிலை ஆலோசனை\n- சந்தை விலை மற்றும் அரசு திட்டங்கள்'
        : '### **This is an agriculture-focused chatbot**\n\nI answer **agriculture-related questions only**.\n\n**Please ask about topics like:**\n- Crop recommendations\n- Soil fertility and fertilizer planning\n- Pest and disease management\n- Irrigation and weather guidance\n- Market prices and government schemes';

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: nonAgriText,
        timestamp: new Date(),
        source: 'AgriSmart AI',
        provider: 'AgriSmart AI'
      };
      setMessages(prev => [...prev, botMsg]);
      return;
    }

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
      const activeLocation = userLocation || getStoredLocation();
      const response = await api.post('/agri-gpt/chat', {
        message: messageText,
        sessionId: sessionId,
        language: responseLanguage,
        location: activeLocation,
        hasRecentAgriContext,
        recentMessages: messages
          .slice(-6)
          .map((msg) => ({
            role: msg?.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg?.content === 'string' ? msg.content.slice(0, 300) : ''
          }))
          .filter((msg) => msg.content),
        profile: {
          crops: user?.crops || [],
          landSize: user?.landSize || 0,
          experience: user?.experience || 'intermediate'
        }
      });
      const payload = extractApiPayload(response.data);

      if (response.data.success !== false && (payload.message || payload.response || payload.text)) {
        const fullResponse = sanitizeAssistantResponse(
          payload.message || payload.response || payload.text,
          responseLanguage,
          messageText,
          activeLocation
        );
        
        setMessages(prev => prev.filter(m => m.id !== messageId));
        
        streamResponse(fullResponse, messageId);

        setTimeout(() => {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? {
              ...m,
          intent: payload.context || payload.intent,
          data: payload.context || payload.data,
          cropDetails: payload.cropDetails,
          suggestions: payload.suggestions,
          confidence: payload.confidence || 0.9,
          source: 'AgriSmart AI',
              provider: 'AgriSmart AI',
              streaming: false
            } : m
          ));
        }, fullResponse.length * 30 + 100);

        if (payload.cropDetails) {
          setSelectedCropData(payload.cropDetails);
          enqueueSnackbar(t('chatbot.cropDetailsAvailable', 'Detailed crop information available! Click "View Details" to see more.'), { 
            variant: 'info',
            autoHideDuration: 4000
          });
        }

        if (payload.sessionId) {
          setSessionId(payload.sessionId);
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        const backendErrorMessage = getApiErrorMessage(response.data, 'Please try again.');
        const errorMsg = {
          id: messageId,
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${backendErrorMessage}. Please try again.`,
          timestamp: new Date(),
          error: true
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      logger.error('Chat error', error);
      const isNetworkError =
        !error?.response ||
        String(error?.message || '').toLowerCase().includes('network') ||
        String(error?.code || '').toLowerCase().includes('network');

      const fallbackResponse = buildStructuredFallbackFromUserInput(
        messageText,
        responseLanguage,
        userLocation || getStoredLocation()
      );
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (isNetworkError) {
        const botMsg = {
          id: messageId,
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date(),
          source: 'AgriSmart AI',
          provider: 'AgriSmart AI',
          fallback: true
        };
        setMessages(prev => [...prev, botMsg]);
        enqueueSnackbar(
          t('chatbot.networkFallback', 'Network issue detected. Showing locally generated guidance.'),
          { variant: 'warning' }
        );
      } else {
        const backendErrorMessage = getApiErrorMessage(
          error,
          "I'm having trouble connecting right now. Please check your connection and try again."
        );
      const errorMsg = {
        id: messageId,
        role: 'assistant',
          content: `I apologize, but ${backendErrorMessage}`,
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
        enqueueSnackbar(
          getApiErrorMessage(error, t('chatbot.failedToGetResponse', 'Failed to get response. Please try again.')),
          { variant: 'error' }
        );
      }
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const normalizedCropSearch = String(supportedCropSearch || '').trim().toLowerCase();
  const filteredSupportedCrops = normalizedCropSearch
    ? supportedCrops.filter((item) =>
      String(item?.english || '').toLowerCase().includes(normalizedCropSearch)
      || String(item?.tamil || '').toLowerCase().includes(normalizedCropSearch)
      || String(item?.key || '').toLowerCase().includes(normalizedCropSearch))
    : supportedCrops;
  const categoryFilteredCrops = selectedCropCategory === 'all'
    ? filteredSupportedCrops
    : filteredSupportedCrops.filter((item) => categorizeCrop(item?.key) === selectedCropCategory);
  const categoryLabels = {
    all: language === 'ta' ? 'அனைத்தும்' : 'All',
    cereals: language === 'ta' ? 'தானியங்கள்' : 'Cereals',
    pulses: language === 'ta' ? 'பருப்புகள்' : 'Pulses',
    oilseeds: language === 'ta' ? 'எண்ணெய் விதைகள்' : 'Oilseeds',
    vegetables: language === 'ta' ? 'காய்கறிகள்' : 'Vegetables',
    fruits: language === 'ta' ? 'பழங்கள்' : 'Fruits',
    plantation_spices: language === 'ta' ? 'தோட்ட/மசாலா பயிர்கள்' : 'Plantation & Spices',
    others: language === 'ta' ? 'பிற பயிர்கள்' : 'Other Crops'
  };
  const groupedSupportedCrops = categoryFilteredCrops.reduce((acc, item) => {
    const category = categorizeCrop(item?.key);
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});
  const orderedCategories = ['cereals', 'pulses', 'oilseeds', 'vegetables', 'fruits', 'plantation_spices', 'others'];
  const groupedEntries = orderedCategories
    .filter((category) => Array.isArray(groupedSupportedCrops[category]) && groupedSupportedCrops[category].length > 0)
    .map((category) => ({
      category,
      crops: showAllSupportedCrops ? groupedSupportedCrops[category] : groupedSupportedCrops[category].slice(0, 4)
    }))
    .slice(0, showAllSupportedCrops ? undefined : 3);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      enqueueSnackbar(t('chatbot.uploadImageFile', 'Please upload an image file'), { variant: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setLoading(true);
        const activeLocation = userLocation || getStoredLocation();
        const formData = new FormData();
        formData.append('image', file);
        formData.append('message', 'Analyze this image and provide agricultural advice');
        formData.append('sessionId', sessionId);
        formData.append('language', language);
        if (activeLocation) {
          formData.append('location', JSON.stringify(activeLocation));
          formData.append('latitude', String(activeLocation.lat));
          formData.append('longitude', String(activeLocation.lng));
        }

        const response = await api.post('/agri-gpt/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const payload = extractApiPayload(response.data);

        if (response.data.success) {
          const safeResponse = sanitizeAssistantResponse(
            payload.response || payload.text || 'Image analyzed successfully',
            language
          );
          const botMsg = {
            id: Date.now() + 1,
            role: 'assistant',
            content: safeResponse,
            timestamp: new Date(),
            intent: payload.intent,
            data: payload.data,
            cropDetails: payload.cropDetails,
            imageAnalysis: payload.imageAnalysis
          };
          setMessages(prev => [...prev, botMsg]);

          if (payload.cropDetails) {
            setSelectedCropData(payload.cropDetails);
            setCropDetailsDialogOpen(true);
          }
        }
      } catch (error) {
        logger.error('Image upload error', error);
        enqueueSnackbar(getApiErrorMessage(error, t('chatbot.failedToAnalyzeImage', 'Failed to analyze image. Please try again.')), { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    enqueueSnackbar(t('chatbot.messageCopied', 'Message copied to clipboard'), { variant: 'success' });
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
            aria-label={t('common.menu', 'Open chat sidebar')}
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
                aria-label={t('chatbot.chatHistory', 'Open chat history')}
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
              aria-label={t('chatbot.newChat', 'Start new chat')}
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
                  handleSelectSession(session.sessionId);
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
          {Array.isArray(messages) && messages.map((msg) => {
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
                              aria-label={t('common.copy', 'Copy message')}
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
                              aria-label={t('chatbot.regenerate', 'Regenerate response')}
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
                          aria-label={t('common.more', 'More options')}
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
                          '& hr': {
                            border: 'none',
                            height: '1px',
                            background: theme.palette.mode === 'dark'
                              ? 'linear-gradient(to right, transparent, rgba(100, 181, 246, 0.3), transparent)'
                              : 'linear-gradient(to right, transparent, rgba(33, 150, 243, 0.3), transparent)',
                            my: 2.5,
                            mx: 0
                          },
                          '& ul li strong, & ol li strong': {
                            color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1976d2',
                            fontWeight: 600
                          }
                        }}
                      >
                        {displayContent && displayContent.trim() !== '' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            key={isStreaming ? streamingContent.length : msg.content}
                          components={{
                          h1: ({...props}) => (
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
                          h2: ({...props}) => (
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
                          h3: ({...props}) => (
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
                          h4: ({...props}) => (
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
                          p: ({...props}) => (
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
                          code: ({ inline, className, children, ...props}) => {
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
                          table: ({...props}) => (
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
                          thead: ({...props}) => (
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
                          tbody: ({...props}) => <Box component="tbody" {...props} />,
                          th: ({...props}) => (
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
                          td: ({...props}) => (
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
                          tr: ({...props}) => (
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
                          ul: ({...props}) => (
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
                          ol: ({...props}) => (
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
                          li: ({...props}) => (
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
                          hr: ({...props}) => (
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
                          blockquote: ({...props}) => (
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
                          strong: ({...props}) => (
                            <Box
                              component="strong"
                              sx={{
                                fontWeight: 700,
                                color: theme.palette.mode === 'dark' ? '#bbdefb' : '#1565c0'
                              }}
                              {...props}
                            />
                          ),
                          em: ({...props}) => (
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
                              aria-label={t('chatbot.feedbackHelpful', 'Mark as helpful')}
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
                              aria-label={t('chatbot.feedbackNotHelpful', 'Mark as not helpful')}
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
                        </Box>
                      )}
                  </Box>
                </Box>
              </Box>
            </Fade>
          );
          })}

          {/* Typing Indicator */}
          {typing && !streamingMessage && !messages.some((msg) => msg?.streaming) && (
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
                      <TypingIndicator label={t('chatbot.typing', 'Analysing')} />
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
                key={`${reply}-${index}`}
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
          <Tooltip title={t('chatbot.uploadImage', 'Upload Image')}>
                <IconButton
                  aria-label={t('chatbot.uploadImage', 'Upload image')}
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
            placeholder={t('chatbot.placeholder')}
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
          <CopyIcon sx={{ mr: 1, fontSize: 18 }} /> {t('common.copy', 'Copy')}
        </MenuItem>
        {messages.find(m => m.id === selectedMessageId)?.role === 'assistant' && (
          <MenuItem onClick={() => handleRegenerate(selectedMessageId)}>
            <RefreshIcon sx={{ mr: 1, fontSize: 18 }} /> {t('chatbot.regenerate', 'Regenerate')}
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteMessage(selectedMessageId)}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> {t('common.delete')}
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
            <Typography variant="h6">{t('chatbot.chatHistory', 'Chat History')}</Typography>
            <IconButton
              aria-label={t('common.close', 'Close history drawer')}
              onClick={() => setDrawerOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {sessions.map((session) => (
                  <ListItem
                key={session.sessionId}
                    button
                onClick={() => {
                  handleSelectSession(session.sessionId);
                  setDrawerOpen(false);
                }}
                  >
                    <ListItemText
                  primary={session.title || t('chatbot.untitledChat', 'Untitled Chat')}
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
        <DialogTitle>{t('chatbot.cropDetails', 'Crop Details')}</DialogTitle>
        <DialogContent>
          {selectedCropData && <CropDetailsCard cropData={selectedCropData} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropDetailsDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
        </Box>
  );
}
