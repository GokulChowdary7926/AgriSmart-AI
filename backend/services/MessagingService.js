
const twilio = require('twilio');
const logger = require('../utils/logger');

class MessagingService {
  constructor() {
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    this.twilioClient = null;
    if (this.twilioAccountSid && this.twilioAuthToken) {
      this.twilioClient = twilio(this.twilioAccountSid, this.twilioAuthToken);
    } else {
      logger.warn('Twilio credentials not configured');
    }
  }

  async sendMessage(toPhone, message, channel = 'sms', language = 'en', templateId = null, variables = {}) {
    try {
      const formattedPhone = this.formatPhoneNumber(toPhone);
      
      if (language !== 'en') {
        message = this.translateMessage(message, language);
      }
      
      message = this.addFooter(message, channel);
      
      if (channel === 'whatsapp') {
        return await this.sendWhatsApp(formattedPhone, message);
      } else if (channel === 'voice') {
        return await this.sendVoiceMessage(formattedPhone, message);
      } else if (channel === 'sms') {
        return await this.sendSMS(formattedPhone, message, templateId, variables);
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      return {
        success: false,
        error: error.message,
        channel
      };
    }
  }

  async sendSMS(toPhone, message, templateId = null, variables = {}) {
    try {
      if (this.twilioClient) {
        const twilioMessage = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: toPhone
        });
        
        return {
          success: true,
          message_id: twilioMessage.sid,
          status: twilioMessage.status,
          channel: 'sms',
          provider: 'twilio'
        };
      }
      
      logger.info(`SMS to ${toPhone}: ${message}`);
      return {
        success: true,
        message_id: 'simulated',
        status: 'sent',
        channel: 'sms',
        provider: 'simulated'
      };
    } catch (error) {
      logger.error(`Error sending SMS: ${error.message}`);
      return {
        success: false,
        error: error.message,
        channel: 'sms'
      };
    }
  }

  async sendWhatsApp(toPhone, message) {
    try {
      if (!this.twilioClient || !this.twilioWhatsAppNumber) {
        return await this.sendSMS(toPhone, message);
      }
      
      const whatsappMessage = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${this.twilioWhatsAppNumber}`,
        to: `whatsapp:${toPhone}`
      });
      
      return {
        success: true,
        message_id: whatsappMessage.sid,
        status: whatsappMessage.status,
        channel: 'whatsapp',
        provider: 'twilio'
      };
    } catch (error) {
      logger.error(`Error sending WhatsApp: ${error.message}`);
      return await this.sendSMS(toPhone, message);
    }
  }

  async sendVoiceMessage(toPhone, message) {
    try {
      if (!this.twilioClient) {
        return {
          success: false,
          error: 'Twilio not configured for voice',
          channel: 'voice'
        };
      }
      
      const twiml = `
        <Response>
            <Say voice="alice" language="en-IN">
                ${message}
            </Say>
            <Pause length="1"/>
            <Say voice="alice" language="en-IN">
                This message is from AgriSmart AI. Jai Kisan!
            </Say>
        </Response>
      `;
      
      const call = await this.twilioClient.calls.create({
        twiml: twiml,
        to: toPhone,
        from: this.twilioPhoneNumber
      });
      
      return {
        success: true,
        call_id: call.sid,
        status: call.status,
        channel: 'voice',
        provider: 'twilio'
      };
    } catch (error) {
      logger.error(`Error sending voice message: ${error.message}`);
      return {
        success: false,
        error: error.message,
        channel: 'voice'
      };
    }
  }

  async sendBulkMessages(phoneNumbers, message, channel = 'sms', language = 'en') {
    const results = [];
    
    for (const phone of phoneNumbers) {
      const result = await this.sendMessage(phone, message, channel, language);
      results.push({
        phone,
        ...result
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    };
  }

  async sendAgriculturalAlert(userId, alertType, data, channel = 'sms') {
    try {
      const user = await this.getUserPreferences(userId);
      
      const message = this.generateAlertMessage(alertType, data, user.language);
      
      return await this.sendMessage(
        user.phone,
        message,
        channel,
        user.language
      );
    } catch (error) {
      logger.error(`Error sending agricultural alert: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateAlertMessage(alertType, data, language = 'en') {
    const templates = {
      weather_alert: {
        en: `🌧️ Weather Alert for ${data.location}: ${data.condition}. Temperature: ${data.temp}°C. Advice: ${data.advice}`,
        hi: `🌧️ ${data.location} के लिए मौसम चेतावनी: ${data.condition}. तापमान: ${data.temp}°C. सलाह: ${data.advice}`,
        te: `🌧️ ${data.location} కోసం వాతావరణ హెచ్చరిక: ${data.condition}. ఉష్ణోగ్రత: ${data.temp}°C. సలహా: ${data.advice}`
      },
      pest_alert: {
        en: `⚠️ Pest Alert: ${data.pest_name} detected in ${data.crop}. Severity: ${data.severity}. Control: ${data.control_measures}`,
        hi: `⚠️ कीट चेतावनी: ${data.crop} में ${data.pest_name} पाया गया। गंभीरता: ${data.severity}. नियंत्रण: ${data.control_measures}`,
        te: `⚠️ పురుగు హెచ్చరిక: ${data.crop} లో ${data.pest_name} కనుగొనబడింది. తీవ్రత: ${data.severity}. నియంత్రణ: ${data.control_measures}`
      },
      irrigation_reminder: {
        en: `💧 Irrigation Reminder: Time to water your ${data.crop} field. Recommended: ${data.amount} liters per acre.`,
        hi: `💧 सिंचाई अनुस्मारक: अपने ${data.crop} खेत में पानी देने का समय। अनुशंसित: ${data.amount} लीटर प्रति एकड़।`,
        te: `💧 నీటి పారుదల రిమైండర్: మీ ${data.crop} ఫీల్డ్‌కి నీరు పెట్టే సమయం. సిఫారసు: ఎకరాకు ${data.amount} లీటర్లు.`
      },
      market_update: {
        en: `📈 Market Update: ${data.crop} price in ${data.market}: ₹${data.price}/q. Trend: ${data.trend}. Best time to ${data.action}.`,
        hi: `📈 बाजार अपडेट: ${data.market} में ${data.crop} की कीमत: ₹${data.price}/क्विंटल। रुझान: ${data.trend}. ${data.action} का सबसे अच्छा समय।`,
        te: `📈 మార్కెట్ అప్‌డేట్: ${data.market} లో ${data.crop} ధర: ₹${data.price}/క్వింటల్. ట్రెండ్: ${data.trend}. ${data.action} చేయడానికి ఉత్తమ సమయం.`
      },
      government_scheme: {
        en: `🏛️ New Scheme: ${data.scheme_name}. Benefits: ${data.benefits}. Apply by: ${data.deadline}. More: ${data.link}`,
        hi: `🏛️ नई योजना: ${data.scheme_name}. लाभ: ${data.benefits}. आवेदन की अंतिम तिथि: ${data.deadline}. अधिक जानकारी: ${data.link}`,
        te: `🏛️ కొత్త పథకం: ${data.scheme_name}. ప్రయోజనాలు: ${data.benefits}. దరఖాస్తు చేసుకోవడానికి గడువు: ${data.deadline}. మరింత: ${data.link}`
      }
    };
    
    const template = templates[alertType]?.[language] || templates[alertType]?.en || `Alert: ${JSON.stringify(data)}`;
    
    try {
      return template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
    } catch (error) {
      return `Alert: ${JSON.stringify(data)}`;
    }
  }

  formatPhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    
    if (!phone.startsWith('+')) {
      if (digits.startsWith('91')) {
        return `+${digits}`;
      } else if (digits.length === 10) {
        return `+91${digits}`;
      } else {
        return `+${digits}`;
      }
    }
    
    return phone;
  }

  translateMessage(message, targetLanguage) {
    
    const translations = {
      en: {
        weather: 'Weather',
        alert: 'Alert',
        price: 'Price',
        market: 'Market',
        crop: 'Crop',
        disease: 'Disease',
        treatment: 'Treatment'
      },
      hi: {
        weather: 'मौसम',
        alert: 'चेतावनी',
        price: 'मूल्य',
        market: 'बाजार',
        crop: 'फसल',
        disease: 'रोग',
        treatment: 'उपचार'
      },
      te: {
        weather: 'వాతావరణం',
        alert: 'హెచ్చరిక',
        price: 'ధర',
        market: 'మార్కెట్',
        crop: 'పంట',
        disease: 'వ్యాధి',
        treatment: 'చికిత్స'
      }
    };
    
    if (targetLanguage === 'en') {
      return message;
    }
    
    let translated = message;
    const translationMap = translations[targetLanguage] || {};
    
    for (const [engWord, transWord] of Object.entries(translationMap)) {
      translated = translated.replace(new RegExp(engWord, 'gi'), transWord);
    }
    
    return translated;
  }

  addFooter(message, channel) {
    let footer = '';
    
    if (channel === 'sms') {
      footer = '\n\n- AgriSmart AI (Reply HELP for help)';
    } else if (channel === 'whatsapp') {
      footer = '\n\n_AgriSmart AI - Your Farming Assistant_';
    } else if (channel === 'voice') {
      footer = '';
    }
    
    return message + footer;
  }

  async getUserPreferences(userId) {
    return {
      phone: '+911234567890',
      language: 'en',
      preferred_channel: 'sms',
      receive_alerts: true,
      alert_types: ['weather', 'pest', 'market']
    };
  }
}

module.exports = new MessagingService();
