const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    enum: [
      'common',
      'auth',
      'crops',
      'diseases',
      'weather',
      'market',
      'analytics',
      'chatbot',
      'settings',
      'dashboard',
      'navigation',
      'errors',
      'forms',
      'notifications'
    ],
    default: 'common'
  },
  category: String,
  translations: {
    en: { type: String, required: true },
    hi: String,
    ta: String,
    te: String,
    kn: String,
    ml: String,
    bn: String,
    mr: String,
    gu: String,
    pa: String
  },
  description: String,
  variables: [String],
  isSystem: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastTranslatedAt: Date,
  translator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Index for efficient lookups
translationSchema.index({ key: 1, module: 1 }, { unique: true });
translationSchema.index({ module: 1, category: 1 });

// Pre-save to update timestamps
translationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to get translation for specific language
translationSchema.methods.getTranslation = function(language = 'en') {
  const lang = language.toLowerCase();
  return this.translations[lang] || 
         this.translations.en || 
         this.key;
};

// Static method to initialize common translations
translationSchema.statics.initializeCommonTranslations = async function() {
  const commonTranslations = [
    // Common UI Elements
    {
      key: 'app_name',
      module: 'common',
      category: 'branding',
      translations: {
        en: 'Agri-Smart',
        hi: 'एग्री-स्मार्ट',
        ta: 'அக்ரி-ஸ்மார்ட்',
        te: 'అగ్రి-స్మార్ట్',
        kn: 'ಅಗ್ರಿ-ಸ್ಮಾರ್ಟ್',
        ml: 'അഗ്രി-സ്മാർട്ട്',
        bn: 'এগ্রি-স্মার্ট',
        mr: 'अॅग्री-स्मार्ट',
        gu: 'એગ્રી-સ્માર્ટ',
        pa: 'ਐਗਰੀ-ਸਮਾਰਟ'
      }
    },
    {
      key: 'loading',
      module: 'common',
      category: 'ui',
      translations: {
        en: 'Loading...',
        hi: 'लोड हो रहा है...',
        ta: 'ஏற்றுகிறது...',
        te: 'లోడ్ అవుతోంది...',
        kn: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
        ml: 'ലോഡ് ചെയ്യുന്നു...',
        bn: 'লোড হচ্ছে...',
        mr: 'लोड होत आहे...',
        gu: 'લોડ થાય છે...',
        pa: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...'
      }
    },
    {
      key: 'save',
      module: 'common',
      category: 'actions',
      translations: {
        en: 'Save',
        hi: 'सेव करें',
        ta: 'சேமிக்கவும்',
        te: 'సేవ్ చేయండి',
        kn: 'ಉಳಿಸಿ',
        ml: 'സംരക്ഷിക്കുക',
        bn: 'সেভ করুন',
        mr: 'जतन करा',
        gu: 'સેવ કરો',
        pa: 'ਸੇਵ ਕਰੋ'
      }
    },
    {
      key: 'cancel',
      module: 'common',
      category: 'actions',
      translations: {
        en: 'Cancel',
        hi: 'रद्द करें',
        ta: 'ரத்துசெய்',
        te: 'రద్దు చేయండి',
        kn: 'ರದ್ದುಮಾಡಿ',
        ml: 'റദ്ദാക്കുക',
        bn: 'বাতিল করুন',
        mr: 'रद्द करा',
        gu: 'રદ કરો',
        pa: 'ਰੱਦ ਕਰੋ'
      }
    },
    {
      key: 'delete',
      module: 'common',
      category: 'actions',
      translations: {
        en: 'Delete',
        hi: 'हटाएं',
        ta: 'நீக்கு',
        te: 'తొలగించండి',
        kn: 'ಅಳಿಸಿ',
        ml: 'ഇല്ലാതാക്കുക',
        bn: 'মুছুন',
        mr: 'हटवा',
        gu: 'કાઢી નાખો',
        pa: 'ਮਿਟਾਓ'
      }
    },
    {
      key: 'edit',
      module: 'common',
      category: 'actions',
      translations: {
        en: 'Edit',
        hi: 'संपादित करें',
        ta: 'திருத்து',
        te: 'సవరించండి',
        kn: 'ಸಂಪಾದಿಸಿ',
        ml: 'എഡിറ്റ് ചെയ്യുക',
        bn: 'সম্পাদনা করুন',
        mr: 'संपादित करा',
        gu: 'સંપાદિત કરો',
        pa: 'ਸੰਪਾਦਨ ਕਰੋ'
      }
    },
    // Auth Translations
    {
      key: 'login',
      module: 'auth',
      category: 'actions',
      translations: {
        en: 'Login',
        hi: 'लॉगिन',
        ta: 'உள்நுழைக',
        te: 'లాగిన్',
        kn: 'ಲಾಗಿನ್',
        ml: 'ലോഗിൻ',
        bn: 'লগইন',
        mr: 'लॉगिन',
        gu: 'લોગિન',
        pa: 'ਲੌਗਿਨ'
      }
    },
    {
      key: 'register',
      module: 'auth',
      category: 'actions',
      translations: {
        en: 'Register',
        hi: 'पंजीकरण करें',
        ta: 'பதிவு செய்',
        te: 'నమోదు చేయండి',
        kn: 'ನೋಂದಣಿ ಮಾಡಿ',
        ml: 'രജിസ്റ്റർ ചെയ്യുക',
        bn: 'নিবন্ধন করুন',
        mr: 'नोंदणी करा',
        gu: 'નોંધણી કરો',
        pa: 'ਰਜਿਸਟਰ ਕਰੋ'
      }
    },
    {
      key: 'logout',
      module: 'auth',
      category: 'actions',
      translations: {
        en: 'Logout',
        hi: 'लॉगआउट',
        ta: 'வெளியேறு',
        te: 'లాగ్అవుట్',
        kn: 'ಲಾಗ್ ಔಟ್',
        ml: 'ലോഗ് ഔട്ട്',
        bn: 'লগআউট',
        mr: 'लॉगआउट',
        gu: 'લોગઆઉટ',
        pa: 'ਲੌਗਆਉਟ'
      }
    },
    // Crop Management
    {
      key: 'crops',
      module: 'crops',
      category: 'navigation',
      translations: {
        en: 'Crops',
        hi: 'फसलें',
        ta: 'பயிர்கள்',
        te: 'పంటలు',
        kn: 'ಪಂಪುಗಳು',
        ml: 'വിളകൾ',
        bn: 'ফসল',
        mr: 'पिके',
        gu: 'પાક',
        pa: 'ਫ਼ਸਲਾਂ'
      }
    },
    {
      key: 'dashboard',
      module: 'dashboard',
      category: 'navigation',
      translations: {
        en: 'Dashboard',
        hi: 'डैशबोर्ड',
        ta: 'டாஷ்போர்டு',
        te: 'డాష్బోర్డ్',
        kn: 'ಡ್ಯಾಶ್ಬೋರ್ಡ್',
        ml: 'ഡാഷ്ബോർഡ്',
        bn: 'ড্যাশবোর্ড',
        mr: 'डॅशबोर्ड',
        gu: 'ડેશબોર્ડ',
        pa: 'ਡੈਸ਼ਬੋਰਡ'
      }
    }
  ];

  for (const translation of commonTranslations) {
    await this.findOneAndUpdate(
      { key: translation.key, module: translation.module },
      { ...translation, isSystem: true },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Common translations initialized');
};

module.exports = mongoose.model('Translation', translationSchema);

