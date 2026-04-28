const marketPriceAPIService = require('./marketPriceAPIService');
const governmentSchemeService = require('./governmentSchemeService');

class TamilAgriChatbotService {
  constructor() {
    this.intentClassifier = {
      disease: {
        keywords: ['disease', 'pest', 'yellow', 'spot', 'wilt', 'blight', 'infection'],
        tamilKeywords: ['நோய்', 'பூச்சி', 'மஞ்சள்', 'புள்ளி', 'அழுகல்', 'வாடுதல்', 'இலை சுருட்டு']
      },
      crop: {
        keywords: ['crop', 'cultivation', 'seed', 'sowing', 'harvest', 'variety', 'recommend', 'recommendation', 'best crop', 'suitable crop', 'my area', 'location', 'rice', 'paddy', 'wheat', 'maize', 'tomato', 'groundnut', 'beans', 'chilli', 'brinjal', 'cotton', 'sugarcane', 'banana', 'coconut', 'ragi', 'millet', 'blackgram', 'greengram', 'turmeric', 'onion', 'cassava', 'tapioca', 'sorghum', 'pearl millet', 'redgram', 'pigeon pea', 'chickpea', 'sesame', 'sunflower', 'mustard', 'soybean', 'coriander', 'okra', 'cabbage', 'cauliflower', 'moringa', 'mango', 'grapes', 'vegetable'],
        tamilKeywords: ['நெல்', 'தக்காளி', 'மிளகாய்', 'கத்தரி', 'சாகுபடி', 'விதை', 'அறுவடை', 'பரிந்துரை', 'எந்த பயிர்', 'என் பகுதி', 'இடம்', 'பயிர்', 'அரிசி', 'கோதுமை', 'மக்காச்சோளம்', 'நிலக்கடலை', 'பீன்ஸ்', 'பயறு', 'காய்கறி', 'பருத்தி', 'கரும்பு', 'வாழை', 'தேங்காய்', 'கேழ்வரகு', 'கம்பு', 'உளுந்து', 'பாசிப்பயறு', 'மஞ்சள்', 'வெங்காயம்', 'மரவள்ளிக்கிழங்கு', 'சோளம்', 'துவரை', 'கொண்டைக்கடலை', 'எள்', 'சூரியகாந்தி', 'கடுகு', 'சோயாபீன்', 'கொத்தமல்லி', 'வெண்டை', 'முட்டைக்கோஸ்', 'பூக்கோசு', 'முருங்கை', 'மாம்பழம்', 'திராட்சை']
      },
      weather: {
        keywords: ['weather', 'rain', 'temperature', 'humidity', 'forecast', 'climate'],
        tamilKeywords: ['வானிலை', 'மழை', 'வெயில்', 'வெப்பநிலை', 'ஈரப்பதம்']
      },
      soil: {
        keywords: [
          'soil', 'fertility', 'organic', 'organic farming', 'compost', 'manure',
          'npk', 'ph', 'micronutrient', 'vermicompost', 'soil health'
        ],
        tamilKeywords: [
          'மண்', 'மண் வளம்', 'உரம்', 'கரிம', 'இயற்கை விவசாயம்', 'கம்போஸ்ட்',
          'சாணம்', 'நுண்ணூட்டச்சத்து', 'மண்புழு உரம்', 'pH'
        ]
      },
      market: {
        keywords: ['market', 'price', 'mandi', 'rate', 'sell', 'trading'],
        tamilKeywords: ['விலை', 'சந்தை', 'மண்டி', 'விற்பனை', 'கொள்முதல்']
      },
      scheme: {
        keywords: ['scheme', 'subsidy', 'government', 'pm kisan', 'insurance', 'loan'],
        tamilKeywords: ['திட்டம்', 'மானியம்', 'அரசு', 'கடன்', 'காப்பீடு']
      },
      general: {
        keywords: ['hello', 'help', 'thanks'],
        tamilKeywords: ['வணக்கம்', 'உதவி', 'நன்றி']
      }
    };

    this.cropKnowledge = {
      'நெல்': {
        english: 'Rice',
        season: 'சம்பா / குறுவை',
        soil: 'களிமண் கலந்த மண்',
        water: 'தொடர்ச்சியான நீர் மேலாண்மை தேவை'
      },
      'தக்காளி': {
        english: 'Tomato',
        season: 'ஜூன்-ஜூலை அல்லது நவம்பர்-டிசம்பர்',
        soil: 'நல்ல வடிகால் வசதி கொண்ட களிமண்',
        water: 'வாரத்தில் 2-3 முறை பாசனம்'
      },
      rice: {
        tamil: 'நெல்',
        season: 'Samba / Kuruvai',
        seasonTa: 'சம்பா / குறுவை',
        soil: 'Clay loam',
        soilTa: 'களிமண் கலந்த வளமான மண்',
        water: 'Standing water + stage-wise irrigation'
      },
      wheat: {
        tamil: 'கோதுமை',
        season: 'Rabi (Nov-Dec sowing)',
        seasonTa: 'ரபி (நவம்பர்-டிசம்பர் விதைப்பு)',
        soil: 'Well-drained loam to clay loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: '4-6 irrigations at critical growth stages'
      },
      beans: {
        tamil: 'பீன்ஸ்',
        season: 'குளிர் முதல் மிதமான பருவம் (அக்-பிப் பொருத்தம்)',
        seasonTa: 'குளிர் முதல் மிதமான பருவம் (அக்-பிப் பொருத்தம்)',
        soil: 'கரிமச்சத்து நிறைந்த நல்ல வடிகால் வசதி மண்',
        soilTa: 'கரிமச்சத்து நிறைந்த நல்ல வடிகால் வசதி மண்',
        water: 'சிறிய அளவில் அடிக்கடி பாசனம்; நீர்நிலை தேங்கல் தவிர்க்கவும்'
      },
      tomato: {
        tamil: 'தக்காளி',
        season: 'Jun-Jul / Nov-Dec',
        seasonTa: 'ஜூன்-ஜூலை / நவம்பர்-டிசம்பர்',
        soil: 'Well-drained loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மண்வகை',
        water: '2-3 irrigations per week'
      },
      chilli: {
        tamil: 'மிளகாய்',
        season: 'Jun-Jul / Sep-Oct',
        seasonTa: 'ஜூன்-ஜூலை / செப்-அக்',
        soil: 'Well-drained sandy loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மணற்பாங்கான மண்',
        water: 'Regular light irrigation; avoid water stagnation'
      },
      brinjal: {
        tamil: 'கத்தரி',
        season: 'Year-round with suitable local window',
        seasonTa: 'உள்ளூர் பருவத்தைப் பொறுத்து ஆண்டு முழுவதும்',
        soil: 'Fertile well-drained loam',
        soilTa: 'வளமான நல்ல வடிகால் வசதி கொண்ட மண்',
        water: 'Frequent irrigation at flowering/fruiting stage'
      },
      cotton: {
        tamil: 'பருத்தி',
        season: 'Kharif (Jun-Aug sowing)',
        seasonTa: 'கரீப் (ஜூன்-ஆகஸ்ட் விதைப்பு)',
        soil: 'Deep black soil / well-drained clay loam',
        soilTa: 'ஆழமான கருப்பு மண் / நல்ல வடிகால் வசதி கொண்ட களிமண்',
        water: 'Moderate irrigation; avoid prolonged waterlogging'
      },
      sugarcane: {
        tamil: 'கரும்பு',
        season: 'Jan-Mar / Jul-Oct (region-wise)',
        seasonTa: 'ஜனவரி-மார்ச் / ஜூலை-அக்டோபர் (பகுதி அடிப்படையில்)',
        soil: 'Deep fertile loam with good drainage',
        soilTa: 'ஆழமான வளமான நல்ல வடிகால் வசதி கொண்ட மண்',
        water: 'Regular irrigation with critical stage focus'
      },
      banana: {
        tamil: 'வாழை',
        season: 'Year-round (best with assured irrigation)',
        seasonTa: 'ஆண்டு முழுவதும் (நிலையான பாசன வசதி இருந்தால் சிறந்தது)',
        soil: 'Rich loam with high organic matter',
        soilTa: 'கரிமச்சத்து அதிகமான வளமான கலவை மண்',
        water: 'Frequent irrigation; moisture must be maintained'
      },
      coconut: {
        tamil: 'தேங்காய்',
        season: 'Year-round planting possible',
        seasonTa: 'ஆண்டு முழுவதும் நடவு செய்யலாம்',
        soil: 'Well-drained sandy loam to laterite',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மணற்பாங்கான கலவை மண் முதல் லேட்டரைட் மண்',
        water: 'Regular basin irrigation during dry spells'
      },
      ragi: {
        tamil: 'கேழ்வரகு',
        season: 'Kharif / Rabi (rainfed and irrigated windows)',
        seasonTa: 'கரீப் / ரபி (மழை சார்ந்த மற்றும் பாசன பருவம்)',
        soil: 'Red loam to light black soil',
        soilTa: 'சிவப்பு கலவை மண் முதல் இலகு கருப்பு மண்',
        water: 'Low to moderate water requirement'
      },
      blackgram: {
        tamil: 'உளுந்து',
        season: 'Kharif / Rabi',
        seasonTa: 'கரீப் / ரபி',
        soil: 'Well-drained loam to clay loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட கலவை மண் முதல் களிமண் கலவை மண்',
        water: 'Low to moderate irrigation requirement'
      },
      greengram: {
        tamil: 'பாசிப்பயறு',
        season: 'Kharif / Summer',
        seasonTa: 'கரீப் / கோடை',
        soil: 'Sandy loam with good drainage',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மணற்பாங்கான கலவை மண்',
        water: 'Low water requirement; avoid stagnation'
      },
      turmeric: {
        tamil: 'மஞ்சள்',
        season: 'Apr-Jun planting window',
        seasonTa: 'ஏப்ரல்-ஜூன் நடவு பருவம்',
        soil: 'Well-drained fertile loam rich in organic matter',
        soilTa: 'கரிமச்சத்து அதிகமான நல்ல வடிகால் வசதி கொண்ட வளமான மண்',
        water: 'Uniform moisture required throughout growth'
      },
      onion: {
        tamil: 'வெங்காயம்',
        season: 'Rabi / Late Kharif',
        seasonTa: 'ரபி / தாமதமான கரீப்',
        soil: 'Loose fertile loam with good aeration',
        soilTa: 'காற்றோட்டம் நல்ல, தளர்வான வளமான கலவை மண்',
        water: 'Light and frequent irrigation'
      },
      tapioca: {
        tamil: 'மரவள்ளிக்கிழங்கு',
        season: 'Jan-Feb / Jun-Jul',
        seasonTa: 'ஜனவரி-பிப்ரவரி / ஜூன்-ஜூலை',
        soil: 'Light sandy loam to red loam',
        soilTa: 'இலகு மணற்பாங்கான கலவை மண் முதல் சிவப்பு கலவை மண்',
        water: 'Moderate irrigation with good drainage'
      },
      sorghum: {
        tamil: 'சோளம்',
        season: 'Kharif / Rabi',
        seasonTa: 'கரீப் / ரபி',
        soil: 'Red loam to medium black soil',
        soilTa: 'சிவப்பு கலவை மண் முதல் நடுத்தர கருப்பு மண்',
        water: 'Low to moderate water requirement'
      },
      pearlmillet: {
        tamil: 'கம்பு',
        season: 'Kharif (rainfed)',
        seasonTa: 'கரீப் (மழை சார்ந்த)',
        soil: 'Light textured sandy loam',
        soilTa: 'இலகுவான மணற்பாங்கான கலவை மண்',
        water: 'Low water requirement'
      },
      redgram: {
        tamil: 'துவரை',
        season: 'Kharif',
        seasonTa: 'கரீப்',
        soil: 'Well-drained loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: 'Low to moderate irrigation'
      },
      chickpea: {
        tamil: 'கொண்டைக்கடலை',
        season: 'Rabi',
        seasonTa: 'ரபி',
        soil: 'Sandy loam to clay loam',
        soilTa: 'மணற்பாங்கான கலவை மண் முதல் களிமண் கலவை மண்',
        water: 'Low water requirement'
      },
      sesame: {
        tamil: 'எள்',
        season: 'Kharif / Summer',
        seasonTa: 'கரீப் / கோடை',
        soil: 'Well-drained light soils',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட இலகு மண்',
        water: 'Low to moderate irrigation'
      },
      sunflower: {
        tamil: 'சூரியகாந்தி',
        season: 'Kharif / Rabi / Summer',
        seasonTa: 'கரீப் / ரபி / கோடை',
        soil: 'Well-drained loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: 'Moderate irrigation at critical stages'
      },
      mustard: {
        tamil: 'கடுகு',
        season: 'Rabi',
        seasonTa: 'ரபி',
        soil: 'Loam to clay loam',
        soilTa: 'கலவை மண் முதல் களிமண் கலவை மண்',
        water: 'Low to moderate water requirement'
      },
      soybean: {
        tamil: 'சோயாபீன்',
        season: 'Kharif',
        seasonTa: 'கரீப்',
        soil: 'Fertile well-drained loam',
        soilTa: 'வளமான நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: 'Moderate irrigation; avoid stagnation'
      },
      coriander: {
        tamil: 'கொத்தமல்லி',
        season: 'Rabi / Cool season',
        seasonTa: 'ரபி / குளிர் பருவம்',
        soil: 'Well-drained sandy loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மணற்பாங்கான கலவை மண்',
        water: 'Light and frequent irrigation'
      },
      okra: {
        tamil: 'வெண்டை',
        season: 'Year-round (best in warm season)',
        seasonTa: 'ஆண்டு முழுவதும் (சூடான பருவம் சிறந்தது)',
        soil: 'Well-drained fertile loam',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட வளமான கலவை மண்',
        water: 'Moderate and regular irrigation'
      },
      cabbage: {
        tamil: 'முட்டைக்கோஸ்',
        season: 'Cool season',
        seasonTa: 'குளிர் பருவம்',
        soil: 'Well-drained loam rich in organic matter',
        soilTa: 'கரிமச்சத்து நிறைந்த நல்ல வடிகால் வசதி கொண்ட மண்',
        water: 'Regular moisture required'
      },
      cauliflower: {
        tamil: 'பூக்கோசு',
        season: 'Cool season',
        seasonTa: 'குளிர் பருவம்',
        soil: 'Fertile well-drained loam',
        soilTa: 'வளமான நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: 'Regular irrigation without waterlogging'
      },
      moringa: {
        tamil: 'முருங்கை',
        season: 'Year-round',
        seasonTa: 'ஆண்டு முழுவதும்',
        soil: 'Well-drained sandy loam to red soil',
        soilTa: 'நல்ல வடிகால் வசதி கொண்ட மணற்பாங்கான கலவை மண் முதல் சிவப்பு மண்',
        water: 'Low to moderate irrigation'
      },
      mango: {
        tamil: 'மாம்பழம்',
        season: 'Perennial orchard crop',
        seasonTa: 'நிரந்தர தோட்டப் பயிர்',
        soil: 'Deep well-drained loam',
        soilTa: 'ஆழமான நல்ல வடிகால் வசதி கொண்ட கலவை மண்',
        water: 'Irrigate during dry period and fruit set'
      },
      grapes: {
        tamil: 'திராட்சை',
        season: 'Perennial with seasonal pruning cycles',
        seasonTa: 'நிரந்தர பயிர் (பருவ வெட்டும் சுழற்சி உடன்)',
        soil: 'Well-drained loam with good aeration',
        soilTa: 'காற்றோட்டம் நல்ல, வடிகால் வசதி உள்ள கலவை மண்',
        water: 'Precise irrigation based on pruning/fruiting stage'
      }
    };
  }

  detectLanguage(text) {
    return /[\u0B80-\u0BFF]/.test(String(text || '')) ? 'ta' : 'en';
  }

  resolvePreferredLanguage(context = {}, fallbackText = '') {
    const preferred = String(context?.preferred_language || context?.language || '')
      .toLowerCase()
      .split('-')[0]
      .trim();
    if (preferred === 'ta' || preferred === 'en') return preferred;
    return this.detectLanguage(fallbackText);
  }

  tokenizeMessage(text) {
    return String(text || '')
      .toLowerCase()
      .split(/[\s,.;:!?()"'-]+/)
      .filter(Boolean);
  }

  identifyIntent(tokens, language) {
    let bestIntent = { name: 'general', confidence: 0.35 };
    Object.entries(this.intentClassifier).forEach(([intentName, intentData]) => {
      const primaryKeywords = language === 'ta' ? intentData.tamilKeywords : intentData.keywords;
      const secondaryKeywords = language === 'ta' ? intentData.keywords : intentData.tamilKeywords;
      const keywords = [...primaryKeywords, ...secondaryKeywords];
      const matches = tokens.filter((token) => keywords.some((k) => token.includes(k) || k.includes(token))).length;
      const confidence = matches / Math.max(1, Math.min(tokens.length, 5));
      if (confidence > bestIntent.confidence) bestIntent = { name: intentName, confidence };
    });
    return bestIntent;
  }

  shouldForceCropIntent(message, entities = {}) {
    const normalized = String(message || '').toLowerCase();
    const hasHelpWord = [
      'help', 'advice', 'guide', 'support', 'how to',
      'உதவி', 'வழிகாட்டி', 'ஆலோசனை', 'எப்படி'
    ].some((keyword) => normalized.includes(keyword));
    const hasCropEntity = Array.isArray(entities?.crops) && entities.crops.length > 0;
    const hasCropKeyword = [
      'crop', 'cultivation', 'harvest', 'seed',
      'பயிர்', 'சாகுபடி', 'அறுவடை', 'விதை'
    ].some((keyword) => normalized.includes(keyword));
    return (hasHelpWord && hasCropEntity) || (hasCropKeyword && hasCropEntity);
  }

  extractEntities(tokens) {
    const crops = [];
    const knownCrops = Object.keys(this.cropKnowledge);
    const aliases = {
      paddy: 'rice',
      wheat: 'wheat',
      beans: 'beans',
      tomato: 'tomato',
      chilli: 'chilli',
      brinjal: 'brinjal',
      cotton: 'cotton',
      sugarcane: 'sugarcane',
      banana: 'banana',
      coconut: 'coconut',
      ragi: 'ragi',
      fingermillet: 'ragi',
      blackgram: 'blackgram',
      greengram: 'greengram',
      turmeric: 'turmeric',
      onion: 'onion',
      tapioca: 'tapioca',
      cassava: 'tapioca',
      sorghum: 'sorghum',
      cholam: 'sorghum',
      pearlmillet: 'pearlmillet',
      cumbu: 'pearlmillet',
      redgram: 'redgram',
      pigeonpea: 'redgram',
      tur: 'redgram',
      chickpea: 'chickpea',
      bengalgram: 'chickpea',
      sesame: 'sesame',
      gingelly: 'sesame',
      sunflower: 'sunflower',
      mustard: 'mustard',
      soybean: 'soybean',
      coriander: 'coriander',
      okra: 'okra',
      ladyfinger: 'okra',
      cabbage: 'cabbage',
      cauliflower: 'cauliflower',
      moringa: 'moringa',
      mango: 'mango',
      grapes: 'grapes',
      arisi: 'rice',
      gothumai: 'wheat',
      beanscrop: 'beans',
      milagai: 'chilli',
      kathiri: 'brinjal',
      நெல்: 'நெல்',
      அரிசி: 'நெல்',
      கோதுமை: 'wheat',
      பீன்ஸ்: 'beans',
      பயறு: 'beans',
      தக்காளி: 'tomato',
      மிளகாய்: 'chilli',
      கத்தரி: 'brinjal',
      பருத்தி: 'cotton',
      கரும்பு: 'sugarcane',
      வாழை: 'banana',
      தேங்காய்: 'coconut',
      கேழ்வரகு: 'ragi',
      உளுந்து: 'blackgram',
      பாசிப்பயறு: 'greengram',
      மஞ்சள்: 'turmeric',
      வெங்காயம்: 'onion',
      மரவள்ளிக்கிழங்கு: 'tapioca',
      சோளம்: 'sorghum',
      கம்பு: 'pearlmillet',
      துவரை: 'redgram',
      கொண்டைக்கடலை: 'chickpea',
      எள்: 'sesame',
      சூரியகாந்தி: 'sunflower',
      கடுகு: 'mustard',
      சோயாபீன்: 'soybean',
      கொத்தமல்லி: 'coriander',
      வெண்டை: 'okra',
      முட்டைக்கோஸ்: 'cabbage',
      பூக்கோசு: 'cauliflower',
      முருங்கை: 'moringa',
      மாம்பழம்: 'mango',
      திராட்சை: 'grapes',
      nel: 'நெல்'
    };
    tokens.forEach((token) => {
      if (aliases[token]) {
        crops.push(aliases[token]);
        return;
      }
      const found = knownCrops.find((name) => token.includes(name) || name.includes(token));
      if (found) crops.push(found);
    });
    return { crops: [...new Set(crops)] };
  }

  async buildMarketResult(language, state) {
    const prices = await marketPriceAPIService.getRealTimePrices('tomato', state).catch(() =>
      marketPriceAPIService.generateMockPrices('Tomato', state)
    );
    const top = (prices || []).slice(0, 5);
    const lines = top.map((p) => {
      const price = typeof p.price === 'object' ? p.price.value : p.price;
      const market = p.market?.name || p.market?.location || p.state || 'Local market';
      return `- ${market}: ₹${Number(price || 0).toFixed(2)}/kg`;
    });

    if (language === 'ta') {
      return {
        reply: [
          '### **சந்தை விலை புதுப்பிப்பு**',
          '',
          '### **இன்றைய முக்கிய விலை (Top Markets)**',
          ...lines,
          '',
          '### **பகுப்பாய்வு (Analysis)**',
          '- அதிக விலை வரும் சந்தையை முன்னுரிமையாக தேர்வு செய்யவும்.',
          '- போக்குவரத்து செலவு மற்றும் எடை இழப்பை கணக்கில் கொண்டு நிகர விலையை ஒப்பிடவும்.',
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. அருகிலுள்ள 2-3 சந்தை விலையை ஒப்பிடவும்.',
          '2. தரம் (Grade) அடிப்படையில் வகைப்படுத்தி விற்கவும்.',
          '3. விலை உயர்வுக்கான 2-3 நாள் போக்கை பார்த்து விற்பனை நாள் முடிவு செய்யவும்.'
        ].join('\n'),
        type: 'market_price',
        structuredData: { state, prices: top }
      };
    }

    return {
      reply: [
        '### **Market Price Update**',
        '',
        '### **Top Market Prices**',
        ...lines,
        '',
        '### **Analysis**',
        '- Prioritize markets with better net realization, not just headline price.',
        '- Include transport and handling losses before finalizing mandi.',
        '',
        '### **Next Steps**',
        '1. Compare 2-3 nearby mandis.',
        '2. Sort produce by grade before sale.',
        '3. Check 2-3 day trend and pick the best selling window.'
      ].join('\n'),
      type: 'market_price',
      structuredData: { state, prices: top }
    };
  }

  async buildSchemeResult(language, state, district) {
    const recommendations = await governmentSchemeService.recommendSchemes(
      {
        location: { state, district: district || '' },
        farmDetails: { landSize: 1, landOwnership: true },
        annualIncome: 100000,
        cropsGrown: ['rice']
      },
      { showOnlyEligible: false }
    ).catch(() => governmentSchemeService.getFallbackRecommendations({ location: { state } }));

    const top = (recommendations?.allSchemes || []).slice(0, 4);
    const schemeLines = top.map((s) => `- **${s.name}** (${s.schemeId || 'ID'})`);

    if (language === 'ta') {
      return {
        reply: [
          '### **அரசு திட்டங்கள் (முன்னுரிமை)**',
          '',
          '### **உங்களுக்கு பொருந்தக்கூடிய திட்டங்கள்**',
          ...schemeLines,
          '',
          '### **தேவையான ஆவணங்கள் (Common Documents)**',
          '- ஆதார், வங்கி கணக்கு விவரம், நில ஆவணம்/பட்டா',
          '- விவசாயி பதிவு / பயிர் விவரம்',
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. அருகிலுள்ள வேளாண்மை அலுவலகத்தில் தகுதி சரிபார்க்கவும்.',
          '2. தேவையான ஆவணங்களை ஒரே கோப்பாக தயார் செய்யவும்.',
          '3. ஆன்லைன்/ஆஃப்லைன் விண்ணப்பித்து நிலையை தொடர்ந்து கண்காணிக்கவும்.'
        ].join('\n'),
        type: 'government_scheme',
        structuredData: { state, schemes: top }
      };
    }
    return {
      reply: [
        '### **Government Schemes (Top Matches)**',
        '',
        '### **Recommended Schemes**',
        ...schemeLines,
        '',
        '### **Common Documents**',
        '- Aadhaar, bank passbook, and land ownership/lease proof',
        '- Farmer registration and crop details',
        '',
        '### **Next Steps**',
        '1. Verify eligibility at nearest agriculture office.',
        '2. Prepare all documents in one set.',
        '3. Apply and track status weekly.'
      ].join('\n'),
      type: 'government_scheme',
      structuredData: { state, schemes: top }
    };
  }

  buildDiseaseResult(language, crop) {
    const tamil = language === 'ta';
    const normalized = String(crop || '').trim().toLowerCase();
    const cropAliasToKey = {
      'நெல்': 'rice',
      அரிசி: 'rice',
      paddy: 'rice',
      gothumai: 'wheat',
      கோதுமை: 'wheat',
      மக்காச்சோளம்: 'maize',
      தக்காளி: 'tomato',
      பீன்ஸ்: 'beans',
      பயறு: 'beans',
      மிளகாய்: 'chilli',
      கத்தரி: 'brinjal',
      நிலக்கடலை: 'groundnut',
      பருத்தி: 'cotton',
      கரும்பு: 'sugarcane',
      வாழை: 'banana',
      தேங்காய்: 'coconut',
      கேழ்வரகு: 'ragi',
      உளுந்து: 'blackgram',
      பாசிப்பயறு: 'greengram',
      மஞ்சள்: 'turmeric',
      வெங்காயம்: 'onion',
      மரவள்ளிக்கிழங்கு: 'tapioca',
      சோளம்: 'sorghum',
      கம்பு: 'pearlmillet',
      துவரை: 'redgram',
      கொண்டைக்கடலை: 'chickpea',
      எள்: 'sesame',
      சூரியகாந்தி: 'sunflower',
      கடுகு: 'mustard',
      சோயாபீன்: 'soybean',
      கொத்தமல்லி: 'coriander',
      வெண்டை: 'okra',
      முட்டைக்கோஸ்: 'cabbage',
      பூக்கோசு: 'cauliflower',
      முருங்கை: 'moringa',
      மாம்பழம்: 'mango',
      திராட்சை: 'grapes'
    };
    const key = cropAliasToKey[normalized] || normalized || 'tomato';

    const diseaseProfiles = {
      rice: { diseaseEn: 'Blast / Bacterial Leaf Blight', diseaseTa: 'பிளாஸ்ட் / இலை கருகல்', symptomsEn: 'Leaf spindle spots and tip drying', symptomsTa: 'இலையில் நீள்வட்ட புள்ளி, நுனி கருகல்' },
      wheat: { diseaseEn: 'Rust / Loose Smut', diseaseTa: 'ரஸ்ட் / ஸ்மட்', symptomsEn: 'Rusty pustules and black powdery heads', symptomsTa: 'இலை/தண்டில் சிவப்பு-பழுப்பு புள்ளி, கருப்பு தூள் தானியங்கள்' },
      maize: { diseaseEn: 'Leaf Blight', diseaseTa: 'இலை கருகல்', symptomsEn: 'Long necrotic lesions on leaves', symptomsTa: 'இலையில் நீளமான கருகிய புள்ளிகள்' },
      tomato: { diseaseEn: 'Leaf Curl / Early Blight', diseaseTa: 'இலை சுருட்டு / ஆரம்ப கருகல்', symptomsEn: 'Leaf curl with yellowing and concentric spots', symptomsTa: 'இலை சுருட்டல், மஞ்சளாதல், வளைய புள்ளிகள்' },
      beans: { diseaseEn: 'Anthracnose / Rust', diseaseTa: 'ஆந்த்ராக்னோஸ் / ரஸ்ட்', symptomsEn: 'Dark sunken lesions on pods and stems', symptomsTa: 'பயிறு தோல்/தண்டில் கரும்புள்ளி, தாழ்வு காயங்கள்' },
      chilli: { diseaseEn: 'Dieback / Fruit Rot', diseaseTa: 'டைபேக் / கனிஅழுகல்', symptomsEn: 'Branch dieback and fruit rotting spots', symptomsTa: 'கிளை வாடல், கனியில் அழுகிய புள்ளி' },
      brinjal: { diseaseEn: 'Wilt / Shoot and Fruit Borer damage', diseaseTa: 'வாடல் / கொத்து-கனி துளைப்பான் சேதம்', symptomsEn: 'Sudden wilt and bore holes in fruits', symptomsTa: 'திடீர் வாடல், கனியில் துளை சேதம்' },
      groundnut: { diseaseEn: 'Tikka Leaf Spot / Rust', diseaseTa: 'டிக்கா இலைப் புள்ளி / ரஸ்ட்', symptomsEn: 'Brown leaf spots with defoliation', symptomsTa: 'பழுப்பு இலைப் புள்ளி, இலை உதிர்தல்' },
      cotton: { diseaseEn: 'Boll Rot / Leaf Curl', diseaseTa: 'போல் அழுகல் / இலை சுருட்டு', symptomsEn: 'Boll discoloration and curling leaves', symptomsTa: 'போலில் நிறமாற்றம், இலை சுருட்டல்' },
      sugarcane: { diseaseEn: 'Red Rot', diseaseTa: 'சிவப்பு அழுகல்', symptomsEn: 'Red streaks in cane internodes', symptomsTa: 'கரும்பு உள்ளே சிவப்பு கோடு/அழுகல்' },
      banana: { diseaseEn: 'Panama Wilt / Sigatoka', diseaseTa: 'பனாமா வாடல் / சிகட்டோகா', symptomsEn: 'Yellowing leaves and pseudostem wilt', symptomsTa: 'இலை மஞ்சளாதல், போலித் தண்டு வாடல்' },
      coconut: { diseaseEn: 'Bud Rot / Root Wilt', diseaseTa: 'மொட்டு அழுகல் / வேர் வாடல்', symptomsEn: 'Crown rot and decline in leaf vigor', symptomsTa: 'மேல் மொட்டு அழுகல், இலை வளர்ச்சி குறைவு' },
      ragi: { diseaseEn: 'Blast', diseaseTa: 'பிளாஸ்ட்', symptomsEn: 'Neck and finger blast symptoms', symptomsTa: 'கதிர் கழுத்து மற்றும் விரல் பகுதி கருகல்' },
      blackgram: { diseaseEn: 'YMV / Powdery Mildew', diseaseTa: 'மஞ்சள் மோசைக் / தூள் பூஞ்சை', symptomsEn: 'Yellow mosaic patches and powdery growth', symptomsTa: 'மஞ்சள் மோசைக் புள்ளி, வெள்ளை தூள் படலம்' },
      greengram: { diseaseEn: 'YMV', diseaseTa: 'மஞ்சள் மோசைக்', symptomsEn: 'Patchy yellow mosaic on leaves', symptomsTa: 'இலையில் மஞ்சள் மோசைக் புள்ளிகள்' },
      turmeric: { diseaseEn: 'Leaf Spot / Rhizome Rot', diseaseTa: 'இலைப் புள்ளி / கிழங்கு அழுகல்', symptomsEn: 'Brown spots and rhizome soft rot', symptomsTa: 'பழுப்பு இலைப் புள்ளி, கிழங்கு மென்மை அழுகல்' },
      onion: { diseaseEn: 'Purple Blotch / Basal Rot', diseaseTa: 'ஊதா பிளாட்ஷ் / அடிப்பகுதி அழுகல்', symptomsEn: 'Purple lesions and basal stem decay', symptomsTa: 'ஊதா புள்ளி, அடிப்பகுதி தண்டு அழுகல்' },
      tapioca: { diseaseEn: 'Mosaic / Tuber Rot', diseaseTa: 'மோசைக் / கிழங்கு அழுகல்', symptomsEn: 'Leaf mosaic and root/tuber rot', symptomsTa: 'இலை மோசைக், வேர்/கிழங்கு அழுகல்' },
      sorghum: { diseaseEn: 'Downy Mildew / Grain Mold', diseaseTa: 'டவுனி மில்ட்யூ / தானிய பூஞ்சை', symptomsEn: 'Chlorotic leaves and moldy earheads', symptomsTa: 'இலை வெண்மை, கதிரில் பூஞ்சை வளர்ச்சி' },
      pearlmillet: { diseaseEn: 'Downy Mildew / Ergot', diseaseTa: 'டவுனி மில்ட்யூ / எர்காட்', symptomsEn: 'Stunted growth and malformed earheads', symptomsTa: 'வளர்ச்சி குறைவு, கதிர் வடிவ மாற்றம்' },
      redgram: { diseaseEn: 'Wilt / Sterility Mosaic', diseaseTa: 'வாடல் / மலட்டுத் மோசைக்', symptomsEn: 'Sudden wilt and bushy malformed growth', symptomsTa: 'திடீர் வாடல், புதர்மயமான மாற்றம்' },
      chickpea: { diseaseEn: 'Fusarium Wilt', diseaseTa: 'ஃப்யூசேரியம் வாடல்', symptomsEn: 'Yellowing and wilting from base', symptomsTa: 'அடிப்பகுதியிலிருந்து மஞ்சளாதல் மற்றும் வாடல்' },
      sesame: { diseaseEn: 'Phyllody / Leaf Spot', diseaseTa: 'பில்லோடி / இலைப் புள்ளி', symptomsEn: 'Floral deformation and leaf spots', symptomsTa: 'மலர் வடிவ மாற்றம், இலைப் புள்ளி' },
      sunflower: { diseaseEn: 'Alternaria Blight', diseaseTa: 'ஆல்டர்நேரியா கருகல்', symptomsEn: 'Target-like leaf spots and head rot', symptomsTa: 'இலையில் வளையப் புள்ளி, தலை அழுகல்' },
      mustard: { diseaseEn: 'White Rust / Alternaria', diseaseTa: 'வெள்ளை ரஸ்ட் / ஆல்டர்நேரியா', symptomsEn: 'White pustules and dark leaf spots', symptomsTa: 'வெள்ளை குடைபோன்ற புள்ளி, கருப்பு இலைப் புள்ளி' },
      soybean: { diseaseEn: 'Rust / Root Rot', diseaseTa: 'ரஸ்ட் / வேர் அழுகல்', symptomsEn: 'Rusty lesions and root decay', symptomsTa: 'ரஸ்ட் புள்ளி, வேர் அழுகல்' },
      coriander: { diseaseEn: 'Stem Gall / Powdery Mildew', diseaseTa: 'தண்டு கட்டி / தூள் பூஞ்சை', symptomsEn: 'Stem swellings and white powdery growth', symptomsTa: 'தண்டில் கட்டி, வெள்ளை தூள் படலம்' },
      okra: { diseaseEn: 'YVMV', diseaseTa: 'மஞ்சள் நரம்பு மோசைக்', symptomsEn: 'Yellow vein mosaic and stunting', symptomsTa: 'நரம்பு மஞ்சளாதல், வளர்ச்சி குறைவு' },
      cabbage: { diseaseEn: 'Black Rot / Downy Mildew', diseaseTa: 'கருப்பு அழுகல் / டவுனி மில்ட்யூ', symptomsEn: 'V-shaped lesions from leaf margins', symptomsTa: 'இலை விளிம்பில் V வடிவ கருகல்' },
      cauliflower: { diseaseEn: 'Downy Mildew / Black Rot', diseaseTa: 'டவுனி மில்ட்யூ / கருப்பு அழுகல்', symptomsEn: 'Leaf yellowing with curd infection', symptomsTa: 'இலை மஞ்சளாதல், பூக்கோசு பகுதி பாதிப்பு' },
      moringa: { diseaseEn: 'Leaf Spot / Dieback', diseaseTa: 'இலைப் புள்ளி / கிளை வாடல்', symptomsEn: 'Necrotic leaf spots and branch dieback', symptomsTa: 'கருகிய இலைப் புள்ளி, கிளை வாடல்' },
      mango: { diseaseEn: 'Anthracnose / Powdery Mildew', diseaseTa: 'ஆந்த்ராக்னோஸ் / தூள் பூஞ்சை', symptomsEn: 'Flower drop and black fruit spots', symptomsTa: 'மலர்த் துளைவு, கனியில் கரும்புள்ளி' },
      grapes: { diseaseEn: 'Downy Mildew / Powdery Mildew', diseaseTa: 'டவுனி மில்ட்யூ / தூள் பூஞ்சை', symptomsEn: 'Leaf oil spots and white powder on bunches', symptomsTa: 'இலையில் எண்ணெய் புள்ளி, கொத்துகளில் வெள்ளை தூள்' }
    };

    const profile = diseaseProfiles[key] || diseaseProfiles.tomato;
    const details = this.cropKnowledge[key] || this.cropKnowledge[crop] || {};
    const cropLabelTa = details?.tamil || String(crop || '').trim() || 'பயிர்';
    const cropLabelEn = key || 'crop';

    return {
      reply: tamil
        ? [
            `### **${cropLabelTa} நோய் கண்டறிதல் வழிகாட்டி**`,
            '',
            `### **சந்தேகிக்கப்படும் நோய் (Likely Disease)**`,
            `- ${profile.diseaseTa}`,
            '',
            '### **அறிகுறிகள் (Symptoms)**',
            `- ${profile.symptomsTa}`,
            '- பாதிக்கப்பட்ட பகுதி விரைவாக பரவுகிறதா என்பதை தினசரி பதிவு செய்யவும்.',
            '',
            '### **உடனடி மேலாண்மை (Immediate Action)**',
            '- பாதிக்கப்பட்ட இலை/கிளைகளை நீக்கி வயலுக்கு வெளியே அழிக்கவும்.',
            '- வயலில் காற்றோட்டம் மற்றும் வடிகால் நிலையை மேம்படுத்தவும்.',
            '',
            '### **சிகிச்சை (Treatment)**',
            '- உயிரியல் முன்னுரிமை: நீம் சார்ந்த தெளிப்பு அல்லது ட்ரைகோடெர்மா போன்ற பரிந்துரைக்கப்பட்ட உயிரியல் முறைகள்.',
            '- தீவிரம் அதிகமாக இருந்தால் உள்ளூர் வேளாண்மை அலுவலர் பரிந்துரைத்த மருந்தை மட்டும் அளவோடு பயன்படுத்தவும்.',
            '',
            '### **தடுப்பு (Prevention)**',
            '- சுத்தமான விதை/நாற்று பயன்படுத்தவும்.',
            '- சுழற்சி சாகுபடி மற்றும் சமநிலை உரமிடல் கடைபிடிக்கவும்.',
            '',
            '### **அடுத்த படிகள் (Next Steps)**',
            '1. 48 மணி நேரத்தில் மறுபரிசோதனை செய்யவும்.',
            '2. அறிகுறி தொடர்ந்தால் அருகிலுள்ள KVK/வேளாண்மை அலுவலகத்தில் மாதிரி காட்டவும்.'
          ].join('\n')
        : [
            `### **${cropLabelEn} Disease Guide**`,
            '',
            '### **Likely Disease**',
            `- ${profile.diseaseEn}`,
            '',
            '### **Symptoms**',
            `- ${profile.symptomsEn}`,
            '- Track spread pattern daily (leaf/branch/fruit area).',
            '',
            '### **Immediate Action**',
            '- Remove and destroy infected plant parts outside the field.',
            '- Improve airflow and drainage to reduce disease pressure.',
            '',
            '### **Treatment**',
            '- Prefer biological options first (neem-based sprays or recommended bio-agents).',
            '- If severe, apply only locally recommended plant protection dose.',
            '',
            '### **Prevention**',
            '- Use healthy seed/seedlings and clean tools.',
            '- Follow crop rotation and balanced nutrient management.',
            '',
            '### **Next Steps**',
            '1. Recheck after 48 hours.',
            '2. If spread continues, consult local agriculture officer/KVK.'
          ].join('\n'),
      type: 'disease_diagnosis',
      structuredData: {
        diseaseName: tamil ? profile.diseaseTa : profile.diseaseEn,
        confidence: 0.86,
        crop: key
      }
    };
  }

  buildCropResult(language, crop) {
    const key = crop || (language === 'ta' ? 'நெல்' : 'rice');
    const details = this.cropKnowledge[key] || this.cropKnowledge.rice;
    const fertilizerProfiles = {
      rice: {
        ta: ['அடிப்படை உரம்: கம்போஸ்ட்/FYM 2-3 டன்/ஏக்கர்.', 'நைட்ரஜன்: 3 தவணைகளாக (விதைப்பு, தளிர், கதிர் முன்).', 'சிங்க் குறைபாடு இருந்தால் ZnSO4 பரிந்துரைப்படி இடவும்.'],
        en: ['Basal: 2-3 tons/acre compost/FYM.', 'Nitrogen: split into 3 stages (sowing, tillering, panicle initiation).', 'Apply ZnSO4 where zinc deficiency is observed.']
      },
      wheat: {
        ta: ['அடிப்படை: FYM + பாஸ்பரஸ் முழுமையாக விதைப்பு முன்.', 'நைட்ரஜன்: CRI, tillering கட்டங்களில் பிரித்து இடவும்.', 'சல்பர் குறைபாடு இருந்தால் கூடுதல் சல்பர் அளிக்கவும்.'],
        en: ['Basal: FYM + full phosphorus before sowing.', 'Split nitrogen at CRI and tillering stages.', 'Add sulfur if deficiency symptoms appear.']
      },
      maize: {
        ta: ['அடிப்படை உரம்: கரிம உரம் + சமநிலை NPK.', 'நைட்ரஜன்: முழங்கால் உயரம் மற்றும் தாச்சல் முன் பிரிப்பு.', 'போரான்/ஜிங்க் குறைபாடு இருந்தால் இலைத் தெளிப்பு.'],
        en: ['Basal organic manure + balanced NPK.', 'Split nitrogen at knee-high and pre-tasseling stages.', 'Use Zn/B foliar spray if needed.']
      },
      tomato: {
        ta: ['நிலத் தயாரிப்பில் கம்போஸ்ட் அதிகப்படுத்தவும்.', 'நைட்ரஜன் அதிகப்படியாக தவிர்த்து சமநிலை NPK.', 'காய்க்கும் கட்டத்தில் பொட்டாசியம் அதிகரிக்கவும்.'],
        en: ['Increase compost at land preparation.', 'Avoid excess nitrogen; keep balanced NPK.', 'Increase potassium during fruiting stage.']
      },
      chilli: {
        ta: ['அடிப்படையாக கரிம உரம் + பாஸ்பரஸ்.', 'வளர்ச்சி கட்டங்களில் பிரிப்பு நைட்ரஜன்.', 'பூ/கனி கட்டத்தில் பொட்டாசியம் மற்றும் கால்சியம் ஆதரவு.'],
        en: ['Use organic manure + basal phosphorus.', 'Split nitrogen across vegetative stages.', 'Support with potassium and calcium during flowering/fruiting.']
      },
      brinjal: {
        ta: ['FYM அடிப்படை உரமாக போதுமான அளவு இடவும்.', 'நைட்ரஜன் 2-3 தவணை பிரிப்பு.', 'மைக்ரோநியூட்ரியன்ட் கலவை இலைத் தெளிப்பு தேவைக்கேற்ப.'],
        en: ['Apply adequate FYM as basal manure.', 'Split nitrogen into 2-3 applications.', 'Use micronutrient foliar mix when required.']
      },
      beans: {
        ta: ['அடிப்படையாக கரிம உரம் + பாஸ்பரஸ் இடவும்.', 'உயிர் உரங்கள் (Rhizobium/PSB) பயன்படுத்தவும்.', 'அதிக நைட்ரஜன் தவிர்த்து மலர்க்காலத்தில் பொட்டாசியம் ஆதரவு அளிக்கவும்.'],
        en: ['Use organic manure and basal phosphorus.', 'Apply biofertilizers (Rhizobium/PSB).', 'Avoid excess nitrogen; support with potassium at flowering.']
      },
      groundnut: {
        ta: ['அடிப்படையாக FYM மற்றும் ஜிப்சம் பரிந்துரைப்படி.', 'பாஸ்பரஸ் மற்றும் கால்சியம் சமநிலையாக அளிக்கவும்.', 'நுண்ணூட்டச்சத்து குறைபாடு இருந்தால் இலைத் தெளிப்பு.'],
        en: ['Apply FYM and gypsum as recommended.', 'Maintain balanced phosphorus and calcium.', 'Use micronutrient foliar spray where deficiency appears.']
      },
      cotton: {
        ta: ['அடிப்படை கரிம உரம் + சமநிலை NPK.', 'நைட்ரஜன் 3 தவணைகளில் பிரித்து இடவும்.', 'போல் உருவாகும் கட்டத்தில் பொட்டாசியம் அதிகரிக்கவும்.'],
        en: ['Use basal organic manure with balanced NPK.', 'Split nitrogen into 3 doses.', 'Increase potassium support during boll formation.']
      },
      sugarcane: {
        ta: ['நடவு முன் நிறைவு கரிம உரம் இடவும்.', 'N மற்றும் K ஐ கட்டங்களாக பிரித்து இடவும்.', 'டிராஷ் மல்வ்சிங் மூலம் மண் வளம் மேம்படுத்தவும்.'],
        en: ['Apply substantial organic manure before planting.', 'Split N and K across growth stages.', 'Use trash mulching to improve soil fertility.']
      },
      banana: {
        ta: ['குழி நிரப்பும்போது FYM/கம்போஸ்ட் அதிகம் பயன்படுத்தவும்.', 'மாதாந்திர கட்டங்களில் பிரிப்பு NPK அளிக்கவும்.', 'மக்னீசியம்/போரான் குறைபாடு வந்தால் உடனடி திருத்தம் செய்யவும்.'],
        en: ['Use rich FYM/compost at pit filling.', 'Provide split NPK in monthly stages.', 'Correct Mg/B deficiencies quickly when observed.']
      },
      coconut: {
        ta: ['வட்ட குழியில் கரிம உரம் மற்றும் பச்சை உரம் பயன்படுத்தவும்.', 'வருடத்திற்கு 2 தவணைகளில் NPK இடவும்.', 'போரான்/மக்னீசியம் குறைபாடு இருந்தால் திருத்த உரம் வழங்கவும்.'],
        en: ['Apply organic manure and green leaf manure in basin.', 'Apply NPK in two splits annually.', 'Correct boron/magnesium deficiencies as needed.']
      },
      ragi: {
        ta: ['அடிப்படை உரமாக FYM + பாஸ்பரஸ்.', 'நைட்ரஜன் பிரிப்பு 2 தவணை.', 'மழை சார்ந்த பகுதியில் குறைந்த செலவு சமநிலை உரமிடல் பின்பற்றவும்.'],
        en: ['Apply FYM with basal phosphorus.', 'Split nitrogen into 2 doses.', 'Use cost-efficient balanced nutrition under rainfed conditions.']
      },
      blackgram: {
        ta: ['விதை சிகிச்சை + Rhizobium பயன்படுத்தவும்.', 'குறைந்த நைட்ரஜன், போதுமான பாஸ்பரஸ் வழங்கவும்.', 'மைக்ரோநியூட்ரியன்ட் தெளிப்பு மலர்க்கட்டத்தில் உதவும்.'],
        en: ['Use seed treatment with Rhizobium.', 'Keep nitrogen low and ensure adequate phosphorus.', 'Micronutrient spray helps during flowering stage.']
      },
      greengram: {
        ta: ['உயிர் உரம் மற்றும் கரிம உரம் முன்னுரிமை.', 'குறைந்த N, போதுமான P மற்றும் K வழங்கவும்.', 'குறுகிய கால பயிர் என்பதால் துல்லியமான ஆரம்ப உரமிடல் அவசியம்.'],
        en: ['Prioritize biofertilizers and organic inputs.', 'Provide low N with adequate P and K.', 'Because of short duration, precise early nutrition is critical.']
      },
      turmeric: {
        ta: ['கிழங்கு நடவு முன் கம்போஸ்ட்/FYM போதுமான அளவு.', 'NPK ஐ பல தவணைகளில் பிரித்து இடவும்.', 'மல்சிங் + கரிமப் பொருள் மூலம் ஈரப்பதம் மற்றும் மண் வளம் பாதுகாக்கவும்.'],
        en: ['Apply sufficient compost/FYM before rhizome planting.', 'Split NPK into multiple doses.', 'Use mulching and organics to conserve moisture and fertility.']
      },
      onion: {
        ta: ['நிலத் தயாரிப்பில் கரிம உரம் சேர்க்கவும்.', 'N ஐ பிரித்து வழங்கி அதிகப்படியாக தவிர்க்கவும்.', 'பொட்டாசியம் மற்றும் சல்பர் சமநிலை கிழங்கு தரத்திற்கு முக்கியம்.'],
        en: ['Incorporate organic manure at land prep.', 'Split N and avoid over-application.', 'Balanced potassium and sulfur are key for bulb quality.']
      },
      tapioca: {
        ta: ['நடவு முன் FYM இடவும்.', 'NPK கட்டங்களாக பிரித்து வேர் வளர்ச்சிக்கு ஆதரவு அளிக்கவும்.', 'மண் ஈரப்பதத்தை வைத்தே உரமிடல் நேரத்தை தீர்மானிக்கவும்.'],
        en: ['Apply FYM before planting.', 'Split NPK in stages to support root bulking.', 'Time fertilizer application based on soil moisture.']
      },
      sorghum: {
        ta: ['அடிப்படை உரம் + பாஸ்பரஸ் முக்கியம்.', 'நைட்ரஜன் 2 தவணை பிரிப்பு.', 'மழை நிலைக்கு ஏற்ப அளவை சீரமைக்கவும்.'],
        en: ['Basal nutrition with phosphorus is important.', 'Split nitrogen into 2 doses.', 'Adjust dose according to rainfall/soil moisture.']
      },
      pearlmillet: {
        ta: ['குறைந்த உள்ளீட்டில் கரிம உரம் மற்றும் அடிப்படை P வழங்கவும்.', 'நைட்ரஜன் பிரிப்பு ஒரு அல்லது இரண்டு தவணை.', 'வறட்சியை கருத்தில் கொண்டு பாதுகாப்பான அளவு உரமிடவும்.'],
        en: ['Use organic inputs with basal phosphorus under low-input systems.', 'Split nitrogen once or twice.', 'Keep fertilizer dose conservative under drought-prone conditions.']
      },
      redgram: {
        ta: ['உயிர் உரம் + அடிப்படை பாஸ்பரஸ் முக்கியம்.', 'அதிக நைட்ரஜன் தேவையில்லை.', 'பூ/பட்டை கட்டத்தில் நுண்ணூட்டச்சத்து தெளிப்பு உதவும்.'],
        en: ['Biofertilizers with basal phosphorus are essential.', 'High nitrogen is usually not required.', 'Micronutrient spray helps during flowering/pod set.']
      },
      chickpea: {
        ta: ['விதை சிகிச்சை + Rhizobium பரிந்துரை.', 'பாஸ்பரஸ் அடிப்படை உரமாக அளிக்கவும்.', 'நைட்ரஜன் குறைந்த அளவே போதுமானது.'],
        en: ['Seed treatment with Rhizobium is recommended.', 'Apply phosphorus as basal dose.', 'Only low nitrogen is generally sufficient.']
      },
      sesame: {
        ta: ['அடிப்படை கரிம உரம் + சமநிலை NPK.', 'நைட்ரஜன் அதிகப்படியாக தவிர்க்கவும்.', 'போரான் குறைபாடு இருந்தால் திருத்தி கனிதரத்தை மேம்படுத்தவும்.'],
        en: ['Use basal organics with balanced NPK.', 'Avoid excess nitrogen.', 'Correct boron deficiency to improve seed set.']
      },
      sunflower: {
        ta: ['நிலத் தயாரிப்பில் FYM சேர்க்கவும்.', 'NPK ஐ முக்கிய கட்டங்களில் பிரித்து அளிக்கவும்.', 'சல்பர்/போரான் ஆதரவு எண்ணெய் தரத்தை உயர்த்தும்.'],
        en: ['Incorporate FYM at land preparation.', 'Split NPK across key growth stages.', 'Sulfur/boron support can improve oil quality.']
      },
      mustard: {
        ta: ['அடிப்படை பாஸ்பரஸ் மற்றும் சல்பர் முக்கியம்.', 'நைட்ரஜன் 2 தவணைகளில் பிரித்து இடவும்.', 'மண் பரிசோதனை அடிப்படையில் மைக்ரோநியூட்ரியன்ட் சேர்க்கவும்.'],
        en: ['Basal phosphorus and sulfur are important.', 'Split nitrogen into 2 applications.', 'Add micronutrients based on soil-test recommendation.']
      },
      soybean: {
        ta: ['Rhizobium விதை சிகிச்சை பரிந்துரைக்கப்படுகிறது.', 'பாஸ்பரஸ் மற்றும் பொட்டாசியம் போதுமான அளவில் அளிக்கவும்.', 'நைட்ரஜன் குறைவாகவே தேவையாகும்.'],
        en: ['Rhizobium seed treatment is recommended.', 'Ensure adequate phosphorus and potassium.', 'Nitrogen requirement is generally low.']
      },
      coriander: {
        ta: ['கரிம உரம் அடிப்படையாக இடவும்.', 'மிதமான NPK போதுமானது.', 'அடர்த்தியான இலை வளர்ச்சி வேண்டுமெனில் சமநிலை நைட்ரஜன் அளிக்கவும்.'],
        en: ['Apply organics as basal manure.', 'Moderate balanced NPK is sufficient.', 'Use balanced nitrogen for good leafy growth.']
      },
      okra: {
        ta: ['நடவு முன் FYM சேர்க்கவும்.', 'NPK ஐ 2-3 தவணைகளில் பிரித்து இடவும்.', 'காய்க்கும் கட்டத்தில் பொட்டாசியம் ஆதரவு தரத்தை உயர்த்தும்.'],
        en: ['Apply FYM before sowing.', 'Split NPK into 2-3 applications.', 'Potassium support during fruiting improves pod quality.']
      },
      cabbage: {
        ta: ['அடிப்படையில் அதிக கரிமப் பொருள் தேவை.', 'நைட்ரஜன் கட்டங்களாக பிரித்து இலை/முட்டை உருவாக்க கட்டத்தில் ஆதரவு.', 'கால்சியம், போரான் குறைபாடு தவிர்க்க கவனம் செலுத்தவும்.'],
        en: ['Requires high organic matter at basal stage.', 'Split nitrogen to support leaf/head formation.', 'Watch and correct calcium/boron deficiencies.']
      },
      cauliflower: {
        ta: ['கரிம உரம் + சமநிலை NPK வழங்கவும்.', 'வளர்ச்சி கட்டங்களில் பிரிப்பு நைட்ரஜன்.', 'கரை சிதைவு தவிர்க்க கால்சியம்/போரான் மேலாண்மை அவசியம்.'],
        en: ['Provide organics with balanced NPK.', 'Split nitrogen across growth stages.', 'Manage calcium/boron to avoid curd disorders.']
      },
      moringa: {
        ta: ['நடவு குழியில் கரிம உரம் அதிகரிக்கவும்.', 'விளைச்சல் பருவங்களில் பிரிப்பு NPK வழங்கவும்.', 'நீண்டகால தோட்ட பராமரிப்பில் வருடாந்திர கரிம உரமிடல் தொடரவும்.'],
        en: ['Increase organics in planting pits.', 'Provide split NPK during production phases.', 'Continue annual organic manuring for perennial vigor.']
      },
      mango: {
        ta: ['வயதுக்கேற்ற மரத்திற்கு ஆண்டு உர திட்டம் பின்பற்றவும்.', 'பூக்கும் முன் மற்றும் கனி கட்டத்தில் சமநிலை NPK.', 'கரிமப் பொருள் மற்றும் மைக்ரோநியூட்ரியன்ட் பராமரிப்பு அவசியம்.'],
        en: ['Follow age-based annual nutrient schedule per tree.', 'Use balanced NPK pre-flowering and fruit set.', 'Maintain organics and micronutrients consistently.']
      },
      grapes: {
        ta: ['வெட்டும் சுழற்சிக்கு ஏற்ப உர அட்டவணை திட்டமிடவும்.', 'கிளை வளர்ச்சி மற்றும் கனி கட்டங்களில் தனி NPK கவனம்.', 'மக்னீசியம்/கால்சியம் சமநிலை கனித் தரத்திற்கு முக்கியம்.'],
        en: ['Plan fertilizer schedule based on pruning cycle.', 'Adjust NPK separately for shoot and berry stages.', 'Maintain magnesium/calcium balance for fruit quality.']
      }
    };
    const defaultPlanTa = ['அடிப்படை உரமாக கம்போஸ்ட்/FYM பயன்படுத்தவும்.', 'நைட்ரஜன் உரத்தை 2-3 தவணைகளில் இடவும்.', 'மண் பரிசோதனை அடிப்படையில் pH/NPK சமநிலை பராமரிக்கவும்.'];
    const defaultPlanEn = ['Use compost/FYM as basal nutrition.', 'Split nitrogen into 2-3 doses by crop stage.', 'Maintain pH/NPK balance based on soil test.'];
    const fertilizerPlan = fertilizerProfiles[key] || { ta: defaultPlanTa, en: defaultPlanEn };
    if (language === 'ta') {
      const displayCropName = details?.tamil || key;
      const seasonText = details?.seasonTa || details?.season || '';
      const soilText = details?.soilTa || details?.soil || '';
      return {
        reply: [
          `### **${displayCropName} சாகுபடி வழிகாட்டி**`,
          '',
          '### **பருவம் (Season)**',
          `- ${seasonText}`,
          '',
          '### **மண் (Soil)**',
          `- ${soilText}`,
          '- மண் பரிசோதனை அடிப்படையில் pH/NPK சமநிலை உறுதி செய்யவும்.',
          '',
          '### **நீர் மேலாண்மை (Water)**',
          `- ${details.water}`,
          '- நிலத்தின் ஈரப்பதத்தை வைத்து கட்டுப்படுத்தப்பட்ட பாசனம் செய்யவும்.',
          '',
          '### **உர திட்டம் (Fertilizer)**',
          ...fertilizerPlan.ta.map((line) => `- ${line}`),
          '',
          '### **பூச்சி/நோய் மேலாண்மை (Pest Control)**',
          '- வாரத்தில் குறைந்தது 2 முறை புல ஆய்வு செய்யவும்.',
          '- தொடக்க அறிகுறியிலேயே உயிரியல் மேலாண்மை முன்னுரிமை அளிக்கவும்.',
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. உங்கள் பகுதி வானிலை + சந்தை விலை பார்த்து விதைப்பு தேதி முடிவு செய்யவும்.',
          '2. சிறிய பகுதியிலிருந்து தொடங்கி வயல்வெளி முழுவதும் விரிவாக்கவும்.'
        ].join('\n'),
        type: 'cultivation_guide',
        structuredData: { crop: key, details }
      };
    }
    return {
      reply: [
        `### **${key} Cultivation Guide**`,
        '',
        '### **Season**',
        `- ${details.season}`,
        '',
        '### **Soil**',
        `- ${details.soil}`,
        '- Confirm pH/NPK through soil testing before major fertilizer application.',
        '',
        '### **Water**',
        `- ${details.water}`,
        '- Use controlled irrigation based on growth stage and field moisture.',
        '',
        '### **Fertilizer**',
        ...fertilizerPlan.en.map((line) => `- ${line}`),
        '',
        '### **Pest Control**',
        '- Scout field at least twice weekly.',
        '- Prioritize early biological control before chemical escalation.',
        '',
        '### **Next Steps**',
        '1. Align sowing date with local weather and market window.',
        '2. Start with a pilot patch and scale based on field response.'
      ].join('\n'),
      type: 'cultivation_guide',
      structuredData: { crop: key, details }
    };
  }

  buildCropRecommendationResult(language, state, district = '', context = {}) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const isKharifWindow = month >= 6 && month <= 10;
    const isRabiWindow = month >= 11 || month <= 3;
    const season = isKharifWindow ? 'Kharif / Kuruvai-Samba' : isRabiWindow ? 'Rabi / Navarai' : 'Zaid / Summer';
    const seasonTa = isKharifWindow ? 'கரீப் / குறுவை-சம்பா' : isRabiWindow ? 'ரபி / நவரை' : 'கோடை / சைத்';
    const locationLabel = district ? `${district}, ${state}` : state;

    const hasRiceHistory = Array.isArray(context?.profile?.crops)
      && context.profile.crops.some((crop) => String(crop).toLowerCase().includes('rice'));

    const recommendations = [
      {
        cropTa: 'நெல்',
        cropEn: 'Rice (Paddy)',
        whyTa: 'உங்கள் பகுதியில் நீர் மேலாண்மை கிடைத்தால் நிலையான வருமானம் தரும்.',
        whyEn: 'Stable option with good procurement support when irrigation is available.',
        soil: 'களிமண் கலந்த வளமான மண்',
        water: 'மிதம் முதல் அதிகம்',
        seasonFit: 'High'
      },
      {
        cropTa: 'மக்காச்சோளம்',
        cropEn: 'Maize',
        whyTa: 'குறைந்த காலத்தில் நல்ல விளைச்சல்; கால்நடை தீவன சந்தை தேவை உள்ளது.',
        whyEn: 'Short-duration crop with steady feed-market demand.',
        soil: 'நல்ல வடிகால் வசதி கொண்ட மண்வகை',
        water: 'மிதம்',
        seasonFit: 'High'
      },
      {
        cropTa: 'நிலக்கடலை',
        cropEn: 'Groundnut',
        whyTa: 'எண்ணெய் விதை பயிராக நல்ல சந்தை வாய்ப்பு.',
        whyEn: 'Profitable oilseed option with broad mandi demand.',
        soil: 'மணற்பாங்கான கலவை மண்',
        water: 'குறைவு முதல் மிதம்',
        seasonFit: 'Medium'
      }
    ];

    if (hasRiceHistory) {
      recommendations[0].seasonFit = 'Very High';
      recommendations[0].whyTa = 'நீங்கள் முன்பு நெல் பயிரிட்டதால் அனுபவ அடிப்படையில் ஆபத்து குறையும்.';
      recommendations[0].whyEn = 'Your existing paddy experience reduces execution risk and improves consistency.';
    }

    if (language === 'ta') {
      const fertilizerPlan = [
        'அடிப்படை உரம்: ஏக்கருக்கு நல்ல முறையில் மாட்டு சாணம்/கம்போஸ்ட் 2-3 டன்.',
        'NPK திட்டம்: மண் பரிசோதனை அடிப்படையில், நைட்ரஜனை 2-3 தவணைகளாக பிரித்து இடவும்.',
        'மைக்ரோ நியூட்ரியன்ட்: சிங்க்/போரான் குறைபாடு இருந்தால் இலைத் தெளிப்பாக வழங்கவும்.'
      ];
      const pestPlan = [
        'வாரத்திற்கு 2 முறை புல ஆய்வு செய்து ஆரம்ப அறிகுறியிலேயே கட்டுப்படுத்தவும்.',
        'மஞ்சள் ஒட்டும் பொறிகள்/பெரோமோன் டிராப் வைத்து பூச்சி கண்காணிக்கவும்.',
        'தேவைப்பட்டால் மட்டுமே பரிந்துரைக்கப்பட்ட அளவில் மருந்து பயன்படுத்தவும்.'
      ];
      return {
        reply: [
          `### **${locationLabel} பகுதியுக்கான பயிர் பரிந்துரை**`,
          '',
          `### **பருவம் (Season)**`,
          `**தற்போதைய பருவம்:** ${seasonTa}`,
          `**இடம்:** ${locationLabel}`,
          '',
          '### **பயிர் பரிந்துரை (Crop Advice)**',
          '**முன்னுரிமை பயிர்கள் (காரணத்துடன்):**',
          ...recommendations.map((r, idx) => `${idx + 1}. **${r.cropTa}** - ${r.whyTa}`),
          '',
          '### **மண் (Soil) & நீர் (Water) பொருத்தம்**',
          '**தேர்வு அட்டவணை:**',
          '| பயிர் | மண் பொருத்தம் | நீர் தேவை | பருவ பொருத்தம் |',
          '|---|---|---|---|',
          ...recommendations.map((r) => `| ${r.cropTa} | ${r.soil} | ${r.water} | ${r.seasonFit === 'Very High' ? 'மிக அதிகம்' : r.seasonFit === 'High' ? 'அதிகம்' : 'மிதம்'} |`),
          '',
          '### **உர மேலாண்மை (Fertilizer Plan)**',
          ...fertilizerPlan.map((item) => `- ${item}`),
          '',
          '### **பூச்சி/நோய் கட்டுப்பாடு (Pest Control)**',
          ...pestPlan.map((item) => `- ${item}`),
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. மண் பரிசோதனை செய்து pH, NPK நிலையை உறுதி செய்யவும்.',
          '2. ஒரு ஏக்கரில் முன்மாதிரி விதைப்பு செய்து உள்ளூர் முடிவை சரிபார்க்கவும்.',
          '3. அருகிலுள்ள சந்தை/மண்டி விலை போக்கை பார்த்து இறுதி பயிர் முடிவு செய்யவும்.',
          '',
          '**பாதுகாப்பு குறிப்பு:** உள்ளூர் வேளாண்மை அலுவலர் ஆலோசனையுடன் உர/மருந்து அளவை உறுதி செய்யவும்.'
        ].join('\n'),
        type: 'crop_recommendation',
        structuredData: {
          location: locationLabel,
          season,
          recommendations
        }
      };
    }

    return {
      reply: [
        `### **Crop Recommendations for ${locationLabel}**`,
        '',
        '### **Season**',
        `**Current season:** ${season}`,
        `**Location:** ${locationLabel}`,
        '',
        '### **Crop Advice**',
        '**Top crop choices (with reasons):**',
        ...recommendations.map((r, idx) => `${idx + 1}. **${r.cropEn}** - ${r.whyEn}`),
        '',
        '### **Soil & Water Suitability**',
        '**Selection matrix:**',
        '| Crop | Soil fit | Water need | Season fit |',
        '|---|---|---|---|',
        ...recommendations.map((r) => `| ${r.cropEn} | ${r.soil} | ${r.water} | ${r.seasonFit} |`),
        '',
        '### **Fertilizer Plan**',
        '- Basal dose: Add 2-3 tons/acre of FYM/compost before sowing.',
        '- Split N application into 2-3 stages based on crop growth.',
        '- Use micronutrient foliar spray if soil test shows deficiency.',
        '',
        '### **Pest Control**',
        '- Scout field twice per week for early pest/disease symptoms.',
        '- Use sticky traps/pheromone traps for monitoring.',
        '- Apply plant protection chemicals only at recommended dose and need basis.',
        '',
        '### **Next Steps**',
        '1. Run a soil test and confirm pH/NPK.',
        '2. Start a pilot sowing in a small patch before scaling.',
        '3. Verify local mandi trend for final crop mix decision.',
        '',
        '**Safety note:** Confirm fertilizer/pesticide dose with local agriculture officer before application.'
      ].join('\n'),
      type: 'crop_recommendation',
      structuredData: {
        location: locationLabel,
        season,
        recommendations
      }
    };
  }

  isCropRecommendationQuery(message, tokens = []) {
    const normalized = String(message || '').toLowerCase();
    const hasRecommendationWord = [
      'recommend', 'recommendation', 'best crop', 'suitable crop', 'my area', 'based on my location',
      'பரிந்துரை', 'எந்த பயிர்', 'என் பகுதி', 'என் இடம்', 'இடத்தை அடிப்படையாக'
    ].some((keyword) => normalized.includes(keyword));

    const hasCropSignal = tokens.some((token) => [
      'crop', 'crops', 'farm', 'farming', 'நெல்', 'பயிர்', 'சாகுபடி'
    ].some((keyword) => token.includes(keyword) || keyword.includes(token)));

    return hasRecommendationWord || (hasCropSignal && normalized.includes('area'));
  }

  buildWeatherResult(language) {
    if (language === 'ta') {
      return {
        reply: [
          '### **வானிலை ஆலோசனை (Weather Advisory)**',
          '',
          '### **நிலைமை (Current Outlook)**',
          '- அடுத்த 48 மணி நேரத்தில் மழை சாத்தியம் உள்ளது.',
          '',
          '### **பயிர் பாதுகாப்பு நடவடிக்கை**',
          '- கனமழைக்கு முன் வயல் வடிகால் வழிகளை சுத்தப்படுத்தவும்.',
          '- உடனடி உரமிடலை தவிர்த்து, மழைக்குப் பிறகு நில ஈரப்பதம் பார்த்து இடவும்.',
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. மழை எச்சரிக்கை நாளில் பாசனத்தை குறைக்கவும்.',
          '2. பயிர் விழுதல் அபாயம் உள்ள பகுதிகளில் ஆதரவு கம்பங்கள் அமைக்கவும்.'
        ].join('\n'),
        type: 'weather_forecast',
        structuredData: { advisory: 'rain_likely_48h' }
      };
    }
    return {
      reply: [
        '### **Weather Advisory**',
        '',
        '### **Current Outlook**',
        '- Rain is likely in the next 48 hours.',
        '',
        '### **Field Actions**',
        '- Keep field drainage channels open before expected rainfall.',
        '- Avoid heavy fertilizer application until post-rain moisture stabilizes.',
        '',
        '### **Next Steps**',
        '1. Reduce irrigation on warning days.',
        '2. Protect lodging-prone crop sections with support where needed.'
      ].join('\n'),
      type: 'weather_forecast',
      structuredData: { advisory: 'rain_likely_48h' }
    };
  }

  buildSoilResult(language) {
    if (language === 'ta') {
      return {
        reply: [
          '### **மண் வள மேம்பாட்டு திட்டம் (Soil Fertility Improvement)**',
          '',
          '### **மண் நிலை மதிப்பீடு (Assessment)**',
          '- முதல் படியாக மண் பரிசோதனை செய்து pH, NPK, மைக்ரோநியூட்ரியன்ட் நிலையை அறியவும்.',
          '- pH 6.5-7.5 இருப்பது பெரும்பாலான பயிர்களுக்கு சிறந்தது.',
          '',
          '### **கரிம மேலாண்மை (Organic Methods)**',
          '- ஏக்கருக்கு 2-3 டன் நன்கு மக்கிய கம்போஸ்ட்/FYM சேர்க்கவும்.',
          '- மண்புழு உரம் மற்றும் பச்சை உரம் (green manure) பயன்படுத்தி கரிமப்பொருள் அளவை உயர்த்தவும்.',
          '- பயிர் மீதிகளை எரிக்காமல் மண்ணில் கலக்கவும்.',
          '',
          '### **உர அட்டவணை (Fertilizer Strategy)**',
          '- NPK-ஐ மண் பரிசோதனை அடிப்படையில் சமநிலையாக பயன்படுத்தவும்.',
          '- நைட்ரஜன் உரத்தை 2-3 தவணைகளில் பிரித்து இடவும்.',
          '- சிங்க்/போரான் குறைபாடு இருந்தால் இலைத் தெளிப்பு அளிக்கவும்.',
          '',
          '### **மண் பாதுகாப்பு (Soil Protection)**',
          '- மூல்ச் (mulch) பயன்படுத்தி ஈரப்பதம் மற்றும் நுண்ணுயிர் செயற்பாட்டை மேம்படுத்தவும்.',
          '- சுழற்சி சாகுபடி மற்றும் இடைநடு மூலம் மண் சோர்வை குறைக்கவும்.',
          '',
          '### **அடுத்த படிகள் (Next Steps)**',
          '1. இந்த வாரத்தில் மண் பரிசோதனை மாதிரி கொடுக்கவும்.',
          '2. கரிமப் பொருள் சேர்க்கை + சமநிலை உர திட்டத்தை 30 நாட்களுக்கு பின்பற்றவும்.',
          '3. 45 நாட்களில் மீளாய்வு செய்து திருத்தப்பட்ட திட்டம் அமைக்கவும்.'
        ].join('\n'),
        type: 'soil_fertility',
        structuredData: {
          category: 'soil_management',
          priority: ['soil_test', 'organic_matter', 'balanced_npk']
        }
      };
    }

    return {
      reply: [
        '### **Soil Fertility Improvement Plan**',
        '',
        '### **Assessment**',
        '- Start with a soil test to confirm pH, NPK, and micronutrient status.',
        '- A pH range of 6.5-7.5 is ideal for most crops.',
        '',
        '### **Organic Methods**',
        '- Add 2-3 tons/acre of well-decomposed compost/FYM.',
        '- Use vermicompost and green manure to improve soil organic carbon.',
        '- Incorporate crop residues instead of burning.',
        '',
        '### **Fertilizer Strategy**',
        '- Apply balanced NPK as per soil test recommendation.',
        '- Split nitrogen into 2-3 doses across crop stages.',
        '- Use foliar micronutrients (Zn/B) when deficiency appears.',
        '',
        '### **Soil Protection**',
        '- Use mulching to conserve moisture and improve microbial activity.',
        '- Follow crop rotation/intercropping to reduce soil fatigue.',
        '',
        '### **Next Steps**',
        '1. Submit soil sample this week.',
        '2. Follow organic matter + balanced nutrient plan for 30 days.',
        '3. Reassess after 45 days and adjust doses.'
      ].join('\n'),
      type: 'soil_fertility',
      structuredData: {
        category: 'soil_management',
        priority: ['soil_test', 'organic_matter', 'balanced_npk']
      }
    };
  }

  buildGeneralResult(language, context = {}, entities = {}) {
    const state = context?.location?.state || 'Tamil Nadu';
    const district = context?.location?.district || '';
    const locationLabel = district ? `${district}, ${state}` : state;
    const primaryCrop = Array.isArray(entities?.crops) && entities.crops.length > 0 ? entities.crops[0] : null;
    const cropLabelTa = primaryCrop
      ? (this.cropKnowledge?.[primaryCrop]?.tamil || this.cropKnowledge?.[primaryCrop]?.english || primaryCrop)
      : 'நெல் / கோதுமை / தக்காளி';
    const cropLabelEn = primaryCrop
      ? (this.cropKnowledge?.[primaryCrop]?.english || this.cropKnowledge?.[primaryCrop]?.tamil || primaryCrop)
      : 'rice / wheat / tomato';

    if (language === 'ta') {
      return {
        reply: [
          '### **விவசாய உதவி மையம்**',
          '',
          'நான் தமிழ்-ஆங்கில விவசாய உதவி சாட்பாட். நீங்கள் கேட்கும் கேள்விக்கு விரிவான விளக்கத்துடன் பதில் தருகிறேன்.',
          '',
          '### **உடனடி செயல் திட்டம் (Actionable Plan)**',
          `- **இடம்:** ${locationLabel}`,
          `- **பயிர் கவனம்:** ${cropLabelTa}`,
          '- மண் பரிசோதனை + வானிலை நிலை + சந்தை விலை அடிப்படையில் முடிவு எடுக்கவும்.',
          '- இன்று குறைந்தது ஒரு வயல் கண்காணிப்பு பதிவு (பூச்சி/நோய்/ஈரப்பதம்) செய்யவும்.',
          '',
          '### **நீங்கள் கேட்கக்கூடிய தலைப்புகள்**',
          '- பயிர் சாகுபடி (எ.கா., நெல், தக்காளி)',
          '- நோய்/பூச்சி கட்டுப்பாடு',
          '- சந்தை விலை பகுப்பாய்வு',
          '- அரசு மானியம்/திட்டங்கள்',
          '- வானிலை அடிப்படையிலான ஆலோசனை',
          '',
          '### **சிறந்த பதிலுக்காக**',
          '- பயிர் பெயர்',
          '- உங்கள் இடம் (மாவட்டம்/மாநிலம்)',
          '- தற்போதைய பிரச்சினை',
          '',
          `**உதாரணம்:** "${cropLabelTa} சாகுபடி அடுத்த 30 நாட்கள் திட்டம் சொல்லுங்கள்"`
        ].join('\n'),
        type: 'general_response',
        structuredData: {}
      };
    }
    return {
      reply: [
        '### **Agriculture Help Center**',
        '',
        'I provide detailed Tamil-English agriculture guidance for each query.',
        '',
        '### **Actionable Starter Plan**',
        `- **Location:** ${locationLabel}`,
        `- **Crop focus:** ${cropLabelEn}`,
        '- Base decisions on soil test, local weather trend, and market movement.',
        '- Record one field observation today (pest pressure, moisture, growth stage).',
        '',
        '### **Topics You Can Ask**',
        '- Crop cultivation',
        '- Pest and disease management',
        '- Market price analysis',
        '- Government schemes/subsidies',
        '- Weather-based field decisions',
        '',
        '### **For Better Accuracy**',
        '- Crop name',
        '- Location (district/state)',
        '- Current field issue',
        '',
        `**Example:** "Give me a 30-day cultivation plan for ${cropLabelEn} in my area"`
      ].join('\n'),
      type: 'general_response',
      structuredData: {}
    };
  }

  buildSuggestions(language) {
    if (language === 'ta') {
      return [
        'என் தக்காளி செடி மஞ்சளாகிறது',
        'நெல் சாகுபடி முறை சொல்லுங்கள்',
        'இன்றைய சந்தை விலை என்ன?',
        'அரசு மானிய திட்டங்கள் என்ன?',
        'மழை இருக்கும் நாளில் என்ன செய்ய வேண்டும்?'
      ];
    }
    return [
      'My tomato leaves are turning yellow',
      'Tell me rice cultivation steps',
      'What are today market prices?',
      'Which government schemes apply to me?',
      'What to do before heavy rain?'
    ];
  }

  getSupportedCrops() {
    const crops = Object.entries(this.cropKnowledge)
      .filter(([key, value]) => /^[a-z]/i.test(key) && value && typeof value === 'object')
      .map(([key, value]) => ({
        key,
        english: value.english || key,
        tamil: value.tamil || key,
        season: value.season || '',
        seasonTa: value.seasonTa || value.season || '',
        soil: value.soil || '',
        soilTa: value.soilTa || value.soil || ''
      }))
      .sort((a, b) => a.english.localeCompare(b.english));

    return {
      total: crops.length,
      crops
    };
  }

  async processMessage(message, context = {}) {
    const startedAt = Date.now();
    const language = this.resolvePreferredLanguage(context, message);
    const tokens = this.tokenizeMessage(message);
    const entities = this.extractEntities(tokens);
    const intent = this.identifyIntent(tokens, language);
    const resolvedIntent = this.shouldForceCropIntent(message, entities)
      ? { ...intent, name: 'crop', confidence: Math.max(intent.confidence || 0, 0.75) }
      : intent;
    const cropEntityExists = Array.isArray(entities?.crops) && entities.crops.length > 0;
    const protectedNonCropIntents = ['market', 'scheme', 'weather', 'soil', 'disease'];
    const finalIntent = cropEntityExists && !protectedNonCropIntents.includes(resolvedIntent.name)
      ? { ...resolvedIntent, name: 'crop', confidence: Math.max(resolvedIntent.confidence || 0, 0.72) }
      : resolvedIntent;
    const state = context?.location?.state || 'Tamil Nadu';
    const district = context?.location?.district || '';

    let result;
    if (this.isCropRecommendationQuery(message, tokens)) {
      result = this.buildCropRecommendationResult(language, state, district, context);
    } else if (finalIntent.name === 'market') {
      result = await this.buildMarketResult(language, state);
    } else if (finalIntent.name === 'scheme') {
      result = await this.buildSchemeResult(language, state, district);
    } else if (finalIntent.name === 'disease') {
      result = this.buildDiseaseResult(language, entities.crops[0]);
    } else if (finalIntent.name === 'crop') {
      result = this.buildCropResult(language, entities.crops[0]);
    } else if (finalIntent.name === 'weather') {
      result = this.buildWeatherResult(language);
    } else if (finalIntent.name === 'soil') {
      result = this.buildSoilResult(language);
    } else {
      result = this.buildGeneralResult(language, context, entities);
    }

    return {
      success: true,
      reply: result.reply,
      type: result.type,
      language,
      intent: finalIntent.name,
      confidence: Number((finalIntent.confidence || 0.35).toFixed(2)),
      entities,
      structuredData: result.structuredData || {},
      quickReplies: this.buildSuggestions(language),
      metadata: {
        processingTimeMs: Date.now() - startedAt,
        source: 'rule_engine',
        modelVersion: 'ta-en-v1'
      }
    };
  }
}

module.exports = new TamilAgriChatbotService();
