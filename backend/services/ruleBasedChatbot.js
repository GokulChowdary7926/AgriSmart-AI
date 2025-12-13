const logger = require('../utils/logger');

class RuleBasedChatbot {
  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  initializeKnowledgeBase() {
    return {
      crops: {
        rice: {
          name: 'Rice (Paddy)',
          description: 'Rice is the staple food crop of India, grown in flooded fields.',
          seasons: {
            kharif: {
              sowing: 'June-July',
              harvesting: 'October-November',
              varieties: ['IR64', 'Swarna', 'Samba Mahsuri', 'BPT 5204'],
              duration: '120-150 days'
            },
            rabi: {
              sowing: 'November-December',
              harvesting: 'March-April',
              varieties: ['ADT 43', 'ADT 45', 'CO 51'],
              duration: '120-140 days'
            }
          },
          soil: 'Clay loam, alluvial soil with good water retention',
          water: 'Requires 1000-1500mm rainfall or irrigation',
          fertilizer: 'N: 120-150 kg/ha, P: 40-60 kg/ha, K: 40-60 kg/ha',
          diseases: ['Blast', 'Bacterial Blight', 'Brown Spot', 'Sheath Blight'],
          yield: '25-35 quintals per hectare'
        },
        wheat: {
          name: 'Wheat',
          description: 'Wheat is a major rabi crop in India, grown in winter season.',
          seasons: {
            rabi: {
              sowing: 'October-November',
              harvesting: 'March-April',
              varieties: ['HD2967', 'PBW343', 'WH542', 'DBW17'],
              duration: '120-150 days'
            }
          },
          soil: 'Well-drained loamy soil, pH 6.0-7.5',
          water: 'Requires 400-500mm water during growth',
          fertilizer: 'N: 100-120 kg/ha, P: 50-60 kg/ha, K: 40-50 kg/ha',
          diseases: ['Rust', 'Powdery Mildew', 'Karnal Bunt'],
          yield: '35-50 quintals per hectare'
        },
        tomato: {
          name: 'Tomato',
          description: 'Tomato is a popular vegetable crop grown throughout India.',
          seasons: {
            kharif: {
              sowing: 'June-July',
              harvesting: 'September-October',
              varieties: ['Pusa Ruby', 'Arka Vikas', 'PKM-1'],
              duration: '90-120 days'
            },
            rabi: {
              sowing: 'October-November',
              harvesting: 'February-March',
              varieties: ['Pusa Early Dwarf', 'Arka Abhijit'],
              duration: '90-120 days'
            }
          },
          soil: 'Well-drained sandy loam, pH 6.0-7.0',
          water: 'Requires regular irrigation, 500-800mm',
          fertilizer: 'N: 100-120 kg/ha, P: 50-60 kg/ha, K: 50-60 kg/ha',
          diseases: ['Early Blight', 'Late Blight', 'Bacterial Spot', 'Mosaic Virus'],
          yield: '200-300 quintals per hectare'
        },
        potato: {
          name: 'Potato',
          description: 'Potato is a major vegetable crop, grown in cool climates.',
          seasons: {
            rabi: {
              sowing: 'October-November',
              harvesting: 'February-March',
              varieties: ['Kufri Jyoti', 'Kufri Chandramukhi', 'Kufri Badshah'],
              duration: '90-120 days'
            }
          },
          soil: 'Well-drained sandy loam, pH 5.5-6.5',
          water: 'Requires 500-700mm water',
          fertilizer: 'N: 120-150 kg/ha, P: 60-80 kg/ha, K: 100-120 kg/ha',
          diseases: ['Late Blight', 'Early Blight', 'Bacterial Wilt'],
          yield: '200-300 quintals per hectare'
        },
        cotton: {
          name: 'Cotton',
          description: 'Cotton is a major commercial crop, important for textile industry.',
          seasons: {
            kharif: {
              sowing: 'May-June',
              harvesting: 'October-December',
              varieties: ['Bollgard II', 'RCH 2', 'MRC 7017'],
              duration: '150-180 days'
            }
          },
          soil: 'Black cotton soil, well-drained',
          water: 'Requires 600-800mm water',
          fertilizer: 'N: 80-100 kg/ha, P: 40-50 kg/ha, K: 40-50 kg/ha',
          diseases: ['Leaf Curl', 'Bacterial Blight', 'Fusarium Wilt'],
          yield: '15-25 quintals per hectare'
        }
      },
      diseases: {
        'rice blast': {
          name: 'Rice Blast',
          symptoms: 'Spindle-shaped lesions with gray centers, white to gray spots',
          treatment: 'Tricyclazole 75% WP (0.6g per liter), Carbendazim 50% WP',
          prevention: 'Use resistant varieties, avoid excessive nitrogen, proper spacing'
        },
        'bacterial blight': {
          name: 'Bacterial Blight',
          symptoms: 'Water-soaked lesions, yellow to white streaks along veins',
          treatment: 'Kasugamycin 3% SL, Copper hydroxide 77% WP',
          prevention: 'Use certified seeds, avoid overhead irrigation, crop rotation'
        },
        'wheat rust': {
          name: 'Wheat Rust',
          symptoms: 'Small orange-red pustules on leaves, yellowing and premature leaf drop',
          treatment: 'Propiconazole 25% EC, Tebuconazole 25% EC',
          prevention: 'Plant resistant varieties, early sowing, balanced fertilization'
        },
        'tomato blight': {
          name: 'Tomato Blight',
          symptoms: 'Dark spots on leaves and fruits, rapid spreading',
          treatment: 'Chlorothalonil 75% WP, Mancozeb 75% WP',
          prevention: 'Proper spacing, avoid overhead watering, crop rotation'
        }
      },
      general: {
        'soil preparation': 'Prepare soil by plowing 2-3 times, add organic manure (FYM) 4-5 tonnes per hectare, level the field, ensure proper drainage.',
        'fertilizer application': 'Apply fertilizers based on soil test. Generally: N-P-K in ratio 4:2:1 for most crops. Apply 50% N and full P, K as basal dose, remaining N in 2-3 splits.',
        'irrigation': 'Water requirement varies by crop: Rice needs continuous flooding, Wheat needs 4-5 irrigations, Vegetables need regular watering. Use drip irrigation for water efficiency.',
        'pest control': 'Use integrated pest management: Monitor regularly, use biological controls, apply pesticides only when threshold is reached, rotate pesticides to avoid resistance.',
        'harvesting': 'Harvest at proper maturity: Rice when 80% grains turn golden, Wheat when grains are hard, Vegetables at marketable size. Use proper tools and store in dry conditions.'
      }
    };
  }

  findAnswer(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    for (const [cropKey, cropData] of Object.entries(this.knowledgeBase.crops)) {
      if (lowerMessage.includes(cropKey) || lowerMessage.includes(cropData.name.toLowerCase())) {
        return this.generateCropResponse(cropData, lowerMessage);
      }
    }
    
    for (const [diseaseKey, diseaseData] of Object.entries(this.knowledgeBase.diseases)) {
      if (lowerMessage.includes(diseaseKey) || lowerMessage.includes(diseaseData.name.toLowerCase())) {
        return this.generateDiseaseResponse(diseaseData);
      }
    }
    
    for (const [topicKey, topicAnswer] of Object.entries(this.knowledgeBase.general)) {
      if (lowerMessage.includes(topicKey)) {
        return this.formatResponse(topicAnswer, 'general');
      }
    }
    
    if (lowerMessage.includes('fertilizer') || lowerMessage.includes('fertiliser')) {
      return this.formatResponse(this.knowledgeBase.general['fertilizer application'], 'fertilizer');
    }
    
    if (lowerMessage.includes('water') || lowerMessage.includes('irrigation')) {
      return this.formatResponse(this.knowledgeBase.general.irrigation, 'irrigation');
    }
    
    if (lowerMessage.includes('harvest') || lowerMessage.includes('harvesting')) {
      return this.formatResponse(this.knowledgeBase.general.harvesting, 'harvesting');
    }
    
    if (lowerMessage.includes('soil') || lowerMessage.includes('land preparation')) {
      return this.formatResponse(this.knowledgeBase.general['soil preparation'], 'soil');
    }
    
    return null;
  }

  generateCropResponse(cropData, message) {
    let response = `### **${cropData.name}**\n\n`;
    response += `${cropData.description}\n\n`;
    
    if (message.includes('season') || message.includes('sowing') || message.includes('when')) {
      response += `**Seasons & Sowing:**\n`;
      for (const [season, details] of Object.entries(cropData.seasons)) {
        response += `\n* **${season.charAt(0).toUpperCase() + season.slice(1)} Season:**\n`;
        response += `  - Sowing Time: ${details.sowing}\n`;
        response += `  - Harvesting: ${details.harvesting}\n`;
        response += `  - Duration: ${details.duration}\n`;
        response += `  - Recommended Varieties: ${details.varieties.join(', ')}\n`;
      }
    }
    
    if (message.includes('soil') || message.includes('land')) {
      response += `\n**Soil Requirements:**\n`;
      response += `- ${cropData.soil}\n`;
    }
    
    if (message.includes('water') || message.includes('irrigation') || message.includes('rain')) {
      response += `\n**Water Requirements:**\n`;
      response += `- ${cropData.water}\n`;
    }
    
    if (message.includes('fertilizer') || message.includes('fertiliser') || message.includes('nutrient')) {
      response += `\n**Fertilizer Requirements:**\n`;
      response += `- ${cropData.fertilizer}\n`;
    }
    
    if (message.includes('disease') || message.includes('pest') || message.includes('problem')) {
      response += `\n**Common Diseases:**\n`;
      cropData.diseases.forEach(disease => {
        response += `- ${disease}\n`;
      });
      response += `\nFor detailed treatment, use our Disease Detection feature.\n`;
    }
    
    if (message.includes('yield') || message.includes('production') || message.includes('output')) {
      response += `\n**Expected Yield:**\n`;
      response += `- ${cropData.yield}\n`;
    }
    
    if (!message.includes('season') && !message.includes('soil') && !message.includes('water') && 
        !message.includes('fertilizer') && !message.includes('disease') && !message.includes('yield')) {
      response += `\n**Key Information:**\n`;
      response += `- Soil: ${cropData.soil}\n`;
      response += `- Water: ${cropData.water}\n`;
      response += `- Fertilizer: ${cropData.fertilizer}\n`;
      response += `- Yield: ${cropData.yield}\n`;
    }
    
    return response;
  }

  generateDiseaseResponse(diseaseData) {
    let response = `### **${diseaseData.name}**\n\n`;
    response += `**Symptoms:**\n`;
    response += `- ${diseaseData.symptoms}\n\n`;
    response += `**Treatment:**\n`;
    response += `- ${diseaseData.treatment}\n\n`;
    response += `**Prevention:**\n`;
    response += `- ${diseaseData.prevention}\n\n`;
    response += `For more detailed diagnosis, upload an image using our Disease Detection feature.`;
    return response;
  }

  formatResponse(text, category) {
    let response = '';
    
    if (category === 'fertilizer') {
      response = `### **Fertilizer Application Guide**\n\n`;
    } else if (category === 'irrigation') {
      response = `### **Irrigation Management**\n\n`;
    } else if (category === 'harvesting') {
      response = `### **Harvesting Best Practices**\n\n`;
    } else if (category === 'soil') {
      response = `### **Soil Preparation**\n\n`;
    } else {
      response = `### **Agricultural Advice**\n\n`;
    }
    
    response += text;
    return response;
  }

  getResponse(message) {
    const answer = this.findAnswer(message);
    
    if (answer) {
      return {
        success: true,
        response: answer,
        provider: 'rule-based',
        source: 'Local Knowledge Base'
      };
    }
    
    return {
      success: false,
      response: `I understand you're asking about "${message}". While I'm currently experiencing limitations with AI services, I can help you with:\n\n🌾 **Crop Information** - Ask about Rice, Wheat, Tomato, Potato, Cotton\n🩺 **Disease Help** - Ask about Rice Blast, Bacterial Blight, Wheat Rust, Tomato Blight\n🌱 **General Topics** - Soil preparation, Fertilizer, Irrigation, Harvesting\n\nPlease try rephrasing your question or use our specific features:\n- Crop Recommendations\n- Disease Detection\n- Weather Forecast\n- Market Prices`,
      provider: 'fallback',
      source: 'Rule-Based Chatbot'
    };
  }
}

module.exports = new RuleBasedChatbot();








