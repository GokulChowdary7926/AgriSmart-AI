const natural = require('natural');
const logger = require('../utils/logger');

class LocalAgriLLMService {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.docs = [];
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    try {
      this.docs = this.buildKnowledgeDocuments();
      this.docs.forEach((doc) => {
        this.tfidf.addDocument(doc.text);
      });
      this.initialized = true;
      logger.info('[LocalAgriLLM] Initialized local retrieval model', {
        documents: this.docs.length
      });
    } catch (error) {
      logger.error('[LocalAgriLLM] Initialization failed', error);
      this.initialized = false;
    }
  }

  buildKnowledgeDocuments() {
    const docs = [];
    const cropData = require('../data/crop_data.json');
    const diseaseData = require('../data/disease_data.json');
    const marketData = require('../data/market_prices.json');

    const seenCrops = new Set();
    cropData.forEach((row) => {
      const crop = String(row.label || '').trim().toLowerCase();
      if (!crop || seenCrops.has(crop)) return;
      seenCrops.add(crop);

      docs.push({
        id: `crop-${crop}`,
        type: 'crop',
        title: crop,
        text: [
          `Crop ${crop}`,
          `nitrogen ${row.N}`,
          `phosphorus ${row.P}`,
          `potassium ${row.K}`,
          `temperature ${row.temperature}`,
          `humidity ${row.humidity}`,
          `ph ${row.ph}`,
          `rainfall ${row.rainfall}`,
          `cultivation advice for ${crop}`
        ].join(' ')
      });
    });

    diseaseData.forEach((row, index) => {
      const disease = String(row.disease_name || '').trim();
      const crop = String(row.crop_affected || '').trim();
      const symptoms = String(row.symptoms || '').trim();
      const treatment = String(row.treatment || '').trim();
      if (!disease) return;

      docs.push({
        id: `disease-${index}`,
        type: 'disease',
        title: disease,
        text: [
          `Disease ${disease}`,
          `crop affected ${crop}`,
          `symptoms ${symptoms}`,
          `treatment ${treatment}`,
          `disease control for ${crop}`
        ].join(' ')
      });
    });

    marketData.forEach((row, index) => {
      const commodity = String(row.commodity || '').trim();
      if (!commodity) return;

      docs.push({
        id: `market-${index}`,
        type: 'market',
        title: commodity,
        text: [
          `Commodity ${commodity}`,
          `market ${row.market}`,
          `price ${row.price}`,
          `unit ${row.unit}`,
          `date ${row.date}`,
          `market price trend ${commodity}`
        ].join(' ')
      });
    });

    return docs;
  }

  scoreDocuments(query) {
    const scored = [];
    this.tfidf.tfidfs(query, (index, measure) => {
      if (measure <= 0) return;
      scored.push({
        score: measure,
        doc: this.docs[index]
      });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5);
  }

  getRuleBasedFallback(query, language, location = null) {
    const normalized = String(query || '').toLowerCase();
    const isTamil = language === 'ta';
    const locationHint = this.formatLocationHint(location, language);

    const genericAgricultureKeywords = [
      'விவசாயம்', 'பயிர்தொழில்', 'விவசாயம் பற்றி', 'agriculture', 'farming', 'about farming', 'crop cultivation'
    ];
    if (genericAgricultureKeywords.some((k) => normalized.includes(k))) {
      if (isTamil) {
        return {
          success: true,
          response: [
            '### **விவசாயம் பற்றிய சுருக்கமான வழிகாட்டி**',
            '',
            locationHint ? `**உங்கள் இருப்பிடம்:** ${locationHint}` : '',
            locationHint ? '**இடத்திற்கான குறிப்பு:** தற்போதைய வெப்பநிலை, மழை நிலை மற்றும் மண் தன்மை அடிப்படையில் பயிர் தேர்வு செய்யவும்.' : '',
            locationHint ? '' : '',
            '**விவசாயத்தில் முக்கியமாக கவனிக்க வேண்டியவை:**',
            '1. **மண் மேலாண்மை** - மண் பரிசோதனை செய்து உர அளவை தீர்மானிக்கவும்.',
            '2. **பயிர் தேர்வு** - பருவம், நீர் வசதி, சந்தை தேவை அடிப்படையில் தேர்வு செய்யவும்.',
            '3. **பாசன திட்டம்** - அதிக நீர்/குறைந்த நீர் நிலையை தவிர்த்து சமநிலை பாசனம் செய்யவும்.',
            '4. **நோய்/பூச்சி கண்காணிப்பு** - ஆரம்ப அறிகுறிகளில் உடனடி நடவடிக்கை எடுக்கவும்.',
            '5. **சந்தை திட்டமிடல்** - விலை நிலவரம் பார்த்து அறுவடை மற்றும் விற்பனை திட்டமிடவும்.',
            '',
            '**நீங்கள் கேட்கலாம்:**',
            '- எந்த பயிர் உங்கள் நிலத்துக்கு பொருத்தம்?',
            '- உரம் மற்றும் பாசனம் எப்போது, எவ்வளவு?',
            '- நோய்/பூச்சி வந்தால் உடனடி தீர்வு என்ன?',
            '- தற்போதைய சந்தை விலை என்ன?'
          ].join('\n'),
          confidence: 0.78,
          sources: [{ type: 'advice', title: 'agriculture-overview-ta' }]
        };
      }
    }

    const soilFertilityKeywords = [
      'soil fertility',
      'soil health',
      'soil organic matter',
      'man val',
      'மண் வள',
      'மண் வளம்',
      'மண்ணின் வளம்',
      'மண் செழிப்பு'
    ];

    if (soilFertilityKeywords.some((k) => normalized.includes(k))) {
      if (isTamil) {
        return {
          success: true,
          response: [
            '### **மண் வளத்தை மேம்படுத்தும் நடைமுறை வழிகள்**',
            '',
            locationHint ? `**உங்கள் இருப்பிடம்:** ${locationHint}` : '',
            locationHint ? 'உங்கள் பகுதி மழை/வெப்பநிலை நிலையைப் பார்த்து கரிமப் பொருள் மற்றும் பாசன அட்டவணையை அமைக்கவும்.' : '',
            locationHint ? '' : '',
            '1. **கரிமப் பொருள் சேர்க்கவும்**',
            '- நன்றாக காய்ந்த பசளை/கம்போஸ்ட்/வெர்மி கம்போஸ்ட் ஏக்கருக்கு முறையாக சேர்க்கவும்.',
            '- பச்சை உரப் பயிர்கள் (சுண்டல், தினைப்பயிறு, சுண்டைக்கீரை வகைகள்) வளர்த்து மண்ணில் கலக்கவும்.',
            '',
            '2. **மண் பரிசோதனை செய்து உர மேலாண்மை செய்யவும்**',
            '- 6-12 மாதங்களுக்கு ஒருமுறை மண் பரிசோதனை செய்யவும்.',
            '- NPK மற்றும் நுண்ணூட்டங்கள் குறைபாடு அடிப்படையில் மட்டும் உரம் போடவும்.',
            '',
            '3. **உயிரியல் உரங்கள் பயன்படுத்தவும்**',
            '- அசோஸ்பிரில்லம், பாஸ்போபாக்டீரியா, மைக்கோரிசா போன்றவை வேர்ச் செயல்பாட்டை மேம்படுத்தும்.',
            '',
            '4. **பயிர் முறை மாற்றம் மற்றும் இடைச்செய்கை**',
            '- ஒரே பயிரை தொடர்ந்து போடாமல் பருப்பு வகைகளை சேர்த்து சுழற்சி செய்யவும்.',
            '',
            '5. **மண் அரிப்பை கட்டுப்படுத்தவும்**',
            '- மல்விங், வடிகால் மேலாண்மை, குறைந்த உழவு முறைகள் மூலம் மேல் மண் சேதத்தை குறைக்கவும்.',
            '',
            '6. **நீர் மேலாண்மை**',
            '- அதிக நீர்ப்பாய்ச்சலை தவிர்க்கவும்; ஈரப்பதம் சமநிலையுடன் வைத்திருக்கவும்.',
            '',
            '**சுருக்கம்:** கரிமப் பொருள் + மண் பரிசோதனை அடிப்படையிலான உரம் + பயிர் சுழற்சி என்ற மூன்று நடைமுறைகளை தொடர்ந்து செய்தால் 1-2 பருவங்களில் மண் வளம் கணிசமாக மேம்படும்.'
          ].join('\n'),
          confidence: 0.84,
          sources: [{ type: 'advice', title: 'soil-fertility-playbook' }]
        };
      }

      return {
        success: true,
        response: [
          '### **How to Improve Soil Fertility**',
          '',
          '1. Add well-decomposed FYM/compost regularly.',
          '2. Use soil testing and apply fertilizers based on deficiency.',
          '3. Include biofertilizers (Azospirillum/PSB/mycorrhiza).',
          '4. Follow crop rotation with legumes.',
          '5. Reduce soil erosion with mulch and better drainage.',
          '6. Maintain balanced irrigation (avoid waterlogging).',
          '',
          '**Key takeaway:** Organic matter + soil-test-based nutrients + crop rotation gives the most reliable improvement.'
        ].join('\n'),
        confidence: 0.82,
        sources: [{ type: 'advice', title: 'soil-fertility-playbook' }]
      };
    }

    return null;
  }

  answer(query, { language = 'en', location = null } = {}) {
    if (!this.initialized || !query || typeof query !== 'string') {
      return {
        success: false,
        response: language === 'ta'
          ? 'உள்ளக அறிவு மாதிரி தற்போது கிடைக்கவில்லை.'
          : 'Local knowledge model is currently unavailable.',
        confidence: 0
      };
    }

    const normalizedQuery = query.toLowerCase();
    const directAdvice = this.getRuleBasedFallback(normalizedQuery, language, location);
    if (directAdvice) {
      return directAdvice;
    }

    const top = this.scoreDocuments(normalizedQuery);
    if (top.length === 0) {
      return {
        success: false,
        response: language === 'ta'
          ? 'இந்த கேள்விக்கான துல்லியமான தரவு கிடைக்கவில்லை. பயிர், நோய் அல்லது சந்தை விலை பற்றிய குறிப்பிட்ட கேள்வியை முயற்சிக்கவும்.'
          : 'I could not find precise local data for this query. Try a specific crop, disease, or market-price question.',
        confidence: 0.2,
        sources: []
      };
    }

    const lines = top.map((item, i) => `- ${i + 1}. [${item.doc.type}] ${item.doc.title}`);
    const response = language === 'ta'
      ? `உள்ளக Agri-GPT தேடல் முடிவுகள்:\n${lines.join('\n')}\n\nஇந்த தலைப்புகளில் மேலும் விவரமாக கேளுங்கள்; நான் உள்ளக தரவிலிருந்து பதில் தருவேன்.`
      : `Local Agri-GPT search results:\n${lines.join('\n')}\n\nAsk a more specific follow-up and I will answer from local knowledge data.`;

    return {
      success: true,
      response,
      confidence: Math.min(0.75, top[0].score),
      sources: top.map((item) => ({ type: item.doc.type, title: item.doc.title }))
    };
  }

  formatLocationHint(location, language) {
    if (!location || typeof location !== 'object') return '';
    const city = String(location.city || '').trim();
    const district = String(location.district || '').trim();
    const state = String(location.state || '').trim();
    const lat = Number(location.lat || location.latitude);
    const lng = Number(location.lng || location.longitude);

    const parts = [district, city, state].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return language === 'ta'
        ? `அட்சரம் ${lat.toFixed(4)}, தீர்க்கரம் ${lng.toFixed(4)}`
        : `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
    }

    return '';
  }
}

module.exports = new LocalAgriLLMService();

