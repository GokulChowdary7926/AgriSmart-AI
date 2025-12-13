const mongoose = require('mongoose');
const Disease = require('../models/Disease');
require('dotenv').config();

const commonDiseases = [
  {
    name: 'Leaf Blight',
    scientificName: 'Alternaria solani',
    type: 'fungal',
    category: 'leaf',
    cropNames: ['tomato', 'potato', 'pepper', 'eggplant'],
    symptoms: {
      visual: [
        {
          part: 'leaves',
          description: 'Small, dark brown to black spots with concentric rings',
          image: ''
        },
        {
          part: 'leaves',
          description: 'Yellow halo around spots',
          image: ''
        }
      ],
      growth: ['Reduced growth', 'Premature leaf drop'],
      yieldImpact: 'Can cause 20-50% yield loss',
      spreadRate: 'Moderate to fast in humid conditions'
    },
    favorableConditions: {
      temperature: { min: 20, max: 30, optimal: 25 },
      humidity: { min: 60, max: 90 },
      rainfall: 'Moderate to high',
      season: ['monsoon', 'autumn']
    },
    treatments: [
      {
        name: 'Chlorothalonil 75% WP',
        type: 'chemical',
        dosage: '2g per liter of water',
        application: 'Spray thoroughly on both sides of leaves',
        frequency: 'Every 7-10 days',
        safety_period: '7 days before harvest',
        effectiveness: 90,
        suitableCrops: ['tomato', 'potato', 'pepper'],
        suitableSeverity: ['medium', 'high', 'critical'],
        response_time: 'short_term',
        price_range: '₹400-₹600 per 250g',
        brands: ['Kavach', 'Daconil'],
        precautions: [
          'Use protective clothing',
          'Avoid spraying during flowering',
          'Do not mix with alkaline substances'
        ]
      },
      {
        name: 'Mancozeb 75% WP',
        type: 'chemical',
        dosage: '2.5g per liter of water',
        application: 'First spray at disease appearance',
        frequency: 'Every 10-12 days',
        safety_period: '15 days before harvest',
        effectiveness: 85,
        suitableSeverity: ['low', 'medium'],
        response_time: 'short_term',
        price_range: '₹400-₹550 per 250g',
        brands: ['Indofil M-45', 'Dithane M-45']
      },
      {
        name: 'Azoxystrobin 23% SC',
        type: 'chemical',
        dosage: '1ml per liter of water',
        application: 'Alternate with contact fungicides',
        frequency: 'Every 10-14 days',
        safety_period: '7 days before harvest',
        effectiveness: 92,
        suitableSeverity: ['high', 'critical'],
        response_time: 'immediate',
        price_range: '₹800-₹1200 per 100ml',
        brands: ['Amistar', 'Heritage']
      },
      {
        name: 'Neem Oil Spray',
        type: 'organic',
        composition: 'Neem oil 1% + soap solution',
        dosage: '5ml neem oil + 2ml soap per liter',
        application: 'Spray early morning or late evening',
        frequency: 'Every 5-7 days',
        effectiveness: 70,
        suitableSeverity: ['low', 'medium'],
        response_time: 'short_term',
        price_range: '₹200-₹300 per 100ml',
        brands: ['Neem Gold', 'Neem Plus'],
        preparation: 'Mix neem oil with soap solution, then dilute in water'
      },
      {
        name: 'Baking Soda Spray',
        type: 'organic',
        composition: 'Baking soda + vegetable oil + soap',
        dosage: '1 tsp baking soda + 1 tsp oil + few drops soap per liter',
        application: 'Spray on affected areas',
        frequency: 'Weekly',
        effectiveness: 65,
        suitableSeverity: ['low'],
        response_time: 'short_term',
        price_range: '₹50-₹100'
      },
      {
        name: 'Trichoderma viride',
        type: 'biological',
        dosage: '5g per liter of water',
        application: 'Soil drenching and foliar spray',
        frequency: 'Every 15 days',
        effectiveness: 75,
        suitableSeverity: ['low', 'medium'],
        response_time: 'long_term',
        price_range: '₹300-₹500 per 100g',
        brands: ['Ecoderma', 'Tricho-SRM'],
        mode_of_action: 'Competes with pathogen for space and nutrients'
      }
    ],
    preventiveMeasures: [{
      cultural: [
        'Use disease-free seeds',
        'Practice crop rotation',
        'Maintain proper spacing',
        'Remove infected plant debris'
      ],
      biological: [
        'Use Trichoderma-based biofungicides',
        'Apply compost tea'
      ],
      chemical: [
        'Preventive fungicide sprays',
        'Seed treatment with fungicides'
      ],
      physical: [
        'Avoid overhead irrigation',
        'Ensure good air circulation'
      ]
    }],
    severityLevel: 4,
    localNames: {
      hi: 'पत्ती झुलसा रोग',
      ta: 'இலை கருகல் நோய்',
      te: 'ఆకు కుళ్లు రోగం',
      kn: 'ಎಲೆ ಬ್ಲೈಟ್ ರೋಗ',
      ml: 'ഇല ബ്ലൈറ്റ് രോഗം'
    }
  },
  {
    name: 'Powdery Mildew',
    scientificName: 'Erysiphe cichoracearum',
    type: 'fungal',
    category: 'leaf',
    cropNames: ['cucumber', 'pumpkin', 'squash', 'melon'],
    symptoms: {
      visual: [
        {
          part: 'leaves',
          description: 'White powdery spots on upper leaf surface',
          image: ''
        },
        {
          part: 'leaves',
          description: 'Leaves turn yellow and curl',
          image: ''
        }
      ],
      growth: ['Stunted growth', 'Reduced fruit quality'],
      yieldImpact: 'Can cause 10-30% yield loss',
      spreadRate: 'Fast in dry, warm conditions'
    },
    favorableConditions: {
      temperature: { min: 20, max: 27, optimal: 22 },
      humidity: { min: 50, max: 70 },
      rainfall: 'Low',
      season: ['winter', 'spring']
    },
    treatments: [
      {
        name: 'Sulfur-based fungicides',
        type: 'chemical',
        products: [
          {
            name: 'Wettable Sulfur',
            dosage: '2g per liter',
            frequency: 'Every 7-10 days',
            precautions: 'Do not use in hot weather'
          }
        ],
        applicationMethod: 'Foliar spray',
        timing: 'Early morning',
        effectiveness: 80,
        cost: 'Low'
      }
    ],
    preventiveMeasures: [{
      cultural: [
        'Plant resistant varieties',
        'Avoid dense planting',
        'Remove infected leaves'
      ],
      biological: [
        'Baking soda solution (1 tsp per liter)',
        'Milk solution (1:9 ratio)'
      ],
      chemical: [],
      physical: [
        'Good air circulation',
        'Avoid overhead watering'
      ]
    }],
    severityLevel: 3,
    localNames: {
      hi: 'सफेद फफूंद',
      ta: 'வெள்ளை பூஞ்சை',
      te: 'తెల్లని ఫంగస్',
      kn: 'ಬಿಳಿ ಬೂಷ್ಟು',
      ml: 'വെള്ള ഫംഗസ്'
    }
  },
  {
    name: 'Rust',
    scientificName: 'Puccinia spp.',
    type: 'fungal',
    category: 'leaf',
    cropNames: ['wheat', 'barley', 'corn', 'beans'],
    symptoms: {
      visual: [
        {
          part: 'leaves',
          description: 'Orange to brown pustules on leaves',
          image: ''
        },
        {
          part: 'stems',
          description: 'Rust-colored spots on stems',
          image: ''
        }
      ],
      growth: ['Reduced photosynthesis', 'Premature senescence'],
      yieldImpact: 'Can cause 30-50% yield loss',
      spreadRate: 'Very fast in windy conditions'
    },
    favorableConditions: {
      temperature: { min: 15, max: 25, optimal: 20 },
      humidity: { min: 80, max: 100 },
      rainfall: 'High',
      season: ['monsoon']
    },
    treatments: [
      {
        name: 'Triazole fungicides',
        type: 'chemical',
        products: [
          {
            name: 'Propiconazole',
            dosage: '1ml per liter',
            frequency: 'Every 10-14 days',
            precautions: 'Follow label instructions'
          }
        ],
        applicationMethod: 'Foliar spray',
        timing: 'Early morning',
        effectiveness: 85,
        cost: 'Medium'
      }
    ],
    preventiveMeasures: [{
      cultural: [
        'Plant resistant varieties',
        'Early planting',
        'Crop rotation'
      ],
      biological: [],
      chemical: [
        'Seed treatment',
        'Preventive fungicide application'
      ],
      physical: [
        'Remove alternate hosts',
        'Destroy crop residues'
      ]
    }],
    severityLevel: 4,
    localNames: {
      hi: 'जंग रोग',
      ta: 'துரு நோய்',
      te: 'తుప్పు రోగం',
      kn: 'ತುಕ್ಕು ರೋಗ',
      ml: 'തുപ്പ് രോഗം'
    }
  },
  {
    name: 'Bacterial Spot',
    scientificName: 'Xanthomonas spp.',
    type: 'bacterial',
    category: 'leaf',
    cropNames: ['tomato', 'pepper', 'chili'],
    symptoms: {
      visual: [
        {
          part: 'leaves',
          description: 'Small, water-soaked spots that turn brown',
          image: ''
        },
        {
          part: 'fruits',
          description: 'Raised, scabby lesions on fruits',
          image: ''
        }
      ],
      growth: ['Leaf drop', 'Reduced fruit quality'],
      yieldImpact: 'Can cause 20-40% yield loss',
      spreadRate: 'Fast in warm, wet conditions'
    },
    favorableConditions: {
      temperature: { min: 24, max: 30, optimal: 27 },
      humidity: { min: 70, max: 90 },
      rainfall: 'High',
      season: ['monsoon', 'summer']
    },
    treatments: [
      {
        name: 'Copper-based bactericides',
        type: 'chemical',
        products: [
          {
            name: 'Copper Hydroxide',
            dosage: '2g per liter',
            frequency: 'Every 7-10 days',
            precautions: 'Can cause phytotoxicity'
          }
        ],
        applicationMethod: 'Foliar spray',
        timing: 'Early morning',
        effectiveness: 70,
        cost: 'Medium'
      }
    ],
    preventiveMeasures: [{
      cultural: [
        'Use certified disease-free seeds',
        'Avoid overhead irrigation',
        'Practice crop rotation'
      ],
      biological: [
        'Bacillus subtilis products',
        'Copper-based biofungicides'
      ],
      chemical: [
        'Seed treatment with hot water',
        'Preventive copper sprays'
      ],
      physical: [
        'Sanitize tools',
        'Remove infected plants'
      ]
    }],
    severityLevel: 3,
    localNames: {
      hi: 'जीवाणु धब्बा',
      ta: 'பாக்டீரியா புள்ளி',
      te: 'బాక్టీరియా స్పాట్',
      kn: 'ಬ್ಯಾಕ್ಟೀರಿಯಾ ಸ್ಪಾಟ್',
      ml: 'ബാക്ടീരിയ സ്പോട്ട്'
    }
  },
  {
    name: 'Mosaic Virus',
    scientificName: 'Tobacco Mosaic Virus',
    type: 'viral',
    category: 'whole_plant',
    cropNames: ['tomato', 'tobacco', 'pepper', 'cucumber'],
    symptoms: {
      visual: [
        {
          part: 'leaves',
          description: 'Mottled, mosaic pattern of light and dark green',
          image: ''
        },
        {
          part: 'leaves',
          description: 'Leaf distortion and curling',
          image: ''
        }
      ],
      growth: ['Severe stunting', 'Reduced fruit set'],
      yieldImpact: 'Can cause 50-80% yield loss',
      spreadRate: 'Very fast through contact'
    },
    favorableConditions: {
      temperature: { min: 20, max: 30, optimal: 25 },
      humidity: { min: 50, max: 70 },
      rainfall: 'Moderate',
      season: ['all']
    },
    treatments: [
      {
        name: 'No direct cure - management only',
        type: 'cultural',
        products: [],
        applicationMethod: 'Prevention',
        timing: 'Before planting',
        effectiveness: 90,
        cost: 'Low'
      }
    ],
    preventiveMeasures: [{
      cultural: [
        'Use virus-free seeds',
        'Remove infected plants immediately',
        'Control aphid vectors',
        'Avoid smoking near plants'
      ],
      biological: [
        'Beneficial insects for aphid control',
        'Resistant varieties'
      ],
      chemical: [
        'Insecticides for vector control',
        'No direct treatment available'
      ],
      physical: [
        'Sanitize all tools',
        'Wash hands before handling plants',
        'Use protective clothing'
      ]
    }],
    severityLevel: 5,
    localNames: {
      hi: 'मोज़ेक वायरस',
      ta: 'மொசைக் வைரஸ்',
      te: 'మొజైక్ వైరస్',
      kn: 'ಮೊಸೈಕ್ ವೈರಸ್',
      ml: 'മൊസൈക് വൈറസ്'
    }
  }
];

async function seedDiseases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrismart');
    console.log('✅ Connected to MongoDB');

    const diseaseNames = commonDiseases.map(d => d.name);
    await Disease.deleteMany({ name: { $in: diseaseNames } });
    console.log('✅ Cleared existing common diseases');

    const inserted = await Disease.insertMany(commonDiseases);
    console.log(`✅ Seeded ${inserted.length} common diseases`);

    await Disease.createIndexes();
    console.log('✅ Indexes created');

    const count = await Disease.countDocuments();
    console.log(`✅ Total diseases in database: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding diseases:', error);
    process.exit(1);
  }
}

seedDiseases();

