const Disease = require('../models/Disease');
const logger = require('../utils/logger');

class MedicationService {
  constructor() {
    this.treatmentWeights = {
      chemical: 1.0,
      organic: 0.8,
      biological: 0.7
    };
  }

  async getMedicationRecommendations(diseaseName, cropType, severity, location = {}) {
    try {
      const disease = await this.getDiseaseInfo(diseaseName);
      
      if (!disease) {
        return await this.getFallbackRecommendations(diseaseName, cropType);
      }

      const recommendations = {
        disease_info: {
          name: disease.name,
          scientificName: disease.scientificName,
          category: disease.type,
          severity: severity || 'medium'
        },
        severity_assessment: this.assessSeverity(disease, severity),
        immediate_actions: this.getImmediateActions(disease, severity),
        chemical_treatments: await this.filterTreatments(disease.treatments?.filter(t => t.type === 'chemical') || [], severity, cropType),
        organic_treatments: await this.filterTreatments(disease.treatments?.filter(t => t.type === 'organic') || [], severity, cropType),
        biological_treatments: await this.filterTreatments(disease.treatments?.filter(t => t.type === 'biological') || [], severity, cropType),
        cultural_practices: this.extractCulturalPractices(disease),
        treatment_plan: this.generateTreatmentPlan(disease, severity),
        schedule: this.generateApplicationSchedule(severity),
        cost_estimation: this.estimateTreatmentCost(disease, severity),
        safety_precautions: this.getSafetyPrecautions(disease),
        emergency_contacts: this.getEmergencyContacts()
      };

      return recommendations;
    } catch (error) {
      logger.error('Medication service error:', error);
      return this.getEmergencyRecommendations(diseaseName, cropType);
    }
  }

  async getDiseaseInfo(diseaseName) {
    const normalizedName = diseaseName.toLowerCase().trim();
    
    let disease = await Disease.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } },
        { scientificName: { $regex: new RegExp(`^${normalizedName}$`, 'i') } }
      ]
    });

    if (!disease) {
      disease = await Disease.findOne({
        $or: [
          { name: { $regex: new RegExp(normalizedName, 'i') } },
          { scientificName: { $regex: new RegExp(normalizedName, 'i') } }
        ]
      });
    }

    if (!disease) {
      disease = await Disease.findOne({
        $or: [
          { 'localNames.hi': { $regex: new RegExp(normalizedName, 'i') } },
          { 'localNames.ta': { $regex: new RegExp(normalizedName, 'i') } },
          { 'localNames.te': { $regex: new RegExp(normalizedName, 'i') } },
          { 'localNames.kn': { $regex: new RegExp(normalizedName, 'i') } },
          { 'localNames.ml': { $regex: new RegExp(normalizedName, 'i') } }
        ]
      });
    }

    return disease;
  }

  assessSeverity(disease, severity) {
    const levels = {
      low: {
        description: 'Early stage infection, minimal damage',
        action_required: 'Monitor and apply preventive measures',
        urgency: 'low'
      },
      medium: {
        description: 'Moderate infection, some damage visible',
        action_required: 'Start treatment within 2-3 days',
        urgency: 'medium'
      },
      high: {
        description: 'Severe infection, significant damage',
        action_required: 'Immediate treatment required',
        urgency: 'high'
      },
      critical: {
        description: 'Critical stage, risk of complete crop loss',
        action_required: 'Emergency treatment immediately',
        urgency: 'critical'
      }
    };

    return levels[severity] || levels.medium;
  }

  getImmediateActions(disease, severity) {
    const actions = [];

    if (severity === 'critical' || severity === 'high') {
      actions.push({
        action: 'Remove and destroy severely infected plant parts',
        timing: 'Immediately',
        priority: 'high'
      });
      
      actions.push({
        action: 'Isolate affected area to prevent spread',
        timing: 'Within 1 hour',
        priority: 'high'
      });
    }

    actions.push({
      action: 'Stop overhead irrigation if applicable',
      timing: 'Immediately',
      priority: 'medium'
    });

    if (severity === 'critical') {
      actions.push({
        action: 'Apply emergency chemical treatment',
        timing: 'Within 6 hours',
        priority: 'critical'
      });
    }

    return actions;
  }

  async filterTreatments(treatments, severity, cropType) {
    if (!treatments || treatments.length === 0) {
      return this.getDefaultTreatments(severity);
    }

      return treatments
      .filter(treatment => {
        if (treatment.suitableSeverity && !treatment.suitableSeverity.includes(severity)) {
          return false;
        }

        if (cropType && treatment.suitableCrops && !treatment.suitableCrops.includes(cropType.toLowerCase())) {
          return false;
        }

        return true;
      })
      .map(treatment => {
        let dosage = 'N/A';
        let frequency = 'N/A';
        let brands = [];
        let preparation = '';
        
        if (treatment.products && treatment.products.length > 0) {
          const product = treatment.products[0];
          dosage = product.dosage || treatment.dosage || this.getDefaultDosage(treatment.name, treatment.type);
          frequency = product.frequency || treatment.frequency || this.getDefaultFrequency(severity, treatment.type);
          brands = treatment.products.map(p => p.name).filter(Boolean);
          preparation = product.preparation || treatment.applicationMethod || '';
        } else {
          dosage = treatment.dosage || this.getDefaultDosage(treatment.name, treatment.type);
          frequency = treatment.frequency || this.getDefaultFrequency(severity, treatment.type);
          preparation = treatment.applicationMethod || treatment.timing || '';
        }
        
        return {
          ...treatment,
          name: treatment.name || 'Unknown Treatment',
          dosage: dosage,
          frequency: frequency,
          brands: brands.length > 0 ? brands : (treatment.brands || []),
          preparation: preparation,
          effectiveness: treatment.effectiveness || this.calculateDefaultEffectiveness(treatment.type, severity),
          safety_period: treatment.safety_period || this.getDefaultSafetyPeriod(treatment.type),
          price_range: treatment.cost || treatment.price_range || this.estimatePrice(treatment.name, treatment.type),
          priority: this.calculateTreatmentScore(treatment, severity)
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Top 5 treatments
  }

  calculateTreatmentScore(treatment, severity) {
    let score = treatment.effectiveness || 70;

    if (severity === 'critical') {
      score += 30;
    } else if (severity === 'high') {
      score += 20;
    } else if (severity === 'medium') {
      score += 10;
    }

    if (treatment.type === 'organic') {
      score += 15; // Safety bonus
    }

    return score;
  }

  getDefaultDosage(treatmentName, type) {
    const dosageMap = {
      'Chlorothalonil': '2-3 g/liter of water',
      'Mancozeb': '2-2.5 g/liter of water',
      'Azoxystrobin': '0.5-1 ml/liter of water',
      'Neem Oil': '2-5 ml/liter of water',
      'Baking Soda': '1-2 teaspoons per liter of water',
      'Trichoderma viride': '2-5 g/liter of water',
      'Copper Oxychloride': '2-3 g/liter of water',
      'Carbendazim': '1-2 g/liter of water',
      'Propiconazole': '0.5-1 ml/liter of water'
    };
    
    if (treatmentName) {
      for (const [key, value] of Object.entries(dosageMap)) {
        if (treatmentName.toLowerCase().includes(key.toLowerCase())) {
          return value;
        }
      }
    }
    
    if (type === 'chemical') {
      return '2-3 g/liter of water';
    } else if (type === 'organic') {
      return '2-5 ml/liter of water';
    } else if (type === 'biological') {
      return '2-5 g/liter of water';
    }
    
    return 'As per manufacturer instructions';
  }

  getDefaultFrequency(severity, type) {
    const frequencyMap = {
      critical: {
        chemical: 'Every 3-5 days for 3-4 applications',
        organic: 'Every 5-7 days for 4-6 applications',
        biological: 'Every 7-10 days for 3-4 applications'
      },
      high: {
        chemical: 'Every 5-7 days for 2-3 applications',
        organic: 'Every 7-10 days for 3-4 applications',
        biological: 'Every 10-14 days for 2-3 applications'
      },
      medium: {
        chemical: 'Every 7-10 days for 2 applications',
        organic: 'Every 10-14 days for 2-3 applications',
        biological: 'Every 14 days for 2 applications'
      },
      low: {
        chemical: 'Every 10-14 days for 1-2 applications',
        organic: 'Every 14 days for 2 applications',
        biological: 'Every 14-21 days for 1-2 applications'
      }
    };
    
    const severityLevel = severity || 'medium';
    const treatmentType = type || 'chemical';
    
    return frequencyMap[severityLevel]?.[treatmentType] || frequencyMap.medium[treatmentType] || 'Every 7-10 days';
  }

  calculateDefaultEffectiveness(type, severity) {
    const baseEffectiveness = {
      chemical: 85,
      organic: 70,
      biological: 75
    };
    
    const severityMultiplier = {
      critical: 0.9,
      high: 0.95,
      medium: 1.0,
      low: 1.05
    };
    
    const base = baseEffectiveness[type] || 70;
    const multiplier = severityMultiplier[severity] || 1.0;
    
    return Math.round(base * multiplier);
  }

  getDefaultSafetyPeriod(type) {
    const safetyPeriods = {
      chemical: '7-14 days (harvest interval)',
      organic: '0-1 day (safe for immediate use)',
      biological: '0-3 days (safe for immediate use)'
    };
    
    return safetyPeriods[type] || '7 days';
  }

  estimatePrice(treatmentName, type) {
    const priceMap = {
      'Chlorothalonil': '₹200-400 per 100g',
      'Mancozeb': '₹150-300 per 100g',
      'Azoxystrobin': '₹500-800 per 100ml',
      'Neem Oil': '₹100-200 per 100ml',
      'Baking Soda': '₹20-50 per 100g',
      'Trichoderma viride': '₹300-500 per 100g',
      'Copper Oxychloride': '₹200-350 per 100g',
      'Carbendazim': '₹250-400 per 100g',
      'Propiconazole': '₹400-600 per 100ml'
    };
    
    if (treatmentName) {
      for (const [key, value] of Object.entries(priceMap)) {
        if (treatmentName.toLowerCase().includes(key.toLowerCase())) {
          return value;
        }
      }
    }
    
    if (type === 'chemical') {
      return '₹200-500 per 100g/100ml';
    } else if (type === 'organic') {
      return '₹100-300 per 100ml';
    } else if (type === 'biological') {
      return '₹300-600 per 100g';
    }
    
    return 'Contact local supplier for pricing';
  }

  getDefaultTreatments(severity) {
    const defaults = {
      critical: [
        {
          name: 'Mancozeb 75% WP',
          dosage: '2.5g per liter of water',
          frequency: 'Every 7-10 days',
          effectiveness: 85,
          type: 'chemical',
          brands: ['Indofil M-45', 'Dithane M-45'],
          safety_period: '15 days before harvest',
          price_range: '₹400-₹600 per 250g'
        },
        {
          name: 'Copper Oxychloride 50% WP',
          dosage: '2g per liter of water',
          frequency: 'Every 10-12 days',
          effectiveness: 80,
          type: 'chemical',
          brands: ['Blitox', 'Fytolan'],
          safety_period: '7 days before harvest',
          price_range: '₹350-₹500 per 250g'
        }
      ],
      high: [
        {
          name: 'Chlorothalonil 75% WP',
          dosage: '2g per liter of water',
          frequency: 'Every 7-10 days',
          effectiveness: 90,
          type: 'chemical',
          brands: ['Kavach', 'Daconil'],
          safety_period: '7 days before harvest',
          price_range: '₹450-₹650 per 250g'
        }
      ],
      medium: [
        {
          name: 'Neem Oil Spray',
          dosage: '5ml neem oil + 2ml soap per liter',
          frequency: 'Every 5-7 days',
          effectiveness: 70,
          type: 'organic',
          brands: ['Neem Gold', 'Neem Plus'],
          safety_period: 'No waiting period',
          price_range: '₹200-₹300 per 100ml'
        }
      ],
      low: [
        {
          name: 'Baking Soda Spray',
          dosage: '1 tsp baking soda + 1 tsp oil + few drops soap per liter',
          frequency: 'Weekly',
          effectiveness: 65,
          type: 'organic',
          safety_period: 'No waiting period',
          price_range: '₹50-₹100'
        }
      ]
    };

    return defaults[severity] || defaults.medium;
  }

  extractCulturalPractices(disease) {
    const practices = [];
    
    if (disease.preventiveMeasures) {
      if (disease.preventiveMeasures.cultural) {
        practices.push(...disease.preventiveMeasures.cultural);
      }
      if (disease.preventiveMeasures.physical) {
        practices.push(...disease.preventiveMeasures.physical);
      }
    }

    practices.push(
      'Use disease-free certified seeds',
      'Practice crop rotation',
      'Maintain proper plant spacing',
      'Remove infected plant debris',
      'Avoid overhead irrigation during disease outbreak'
    );

    return practices.slice(0, 8); // Top 8 practices
  }

  generateTreatmentPlan(disease, severity) {
    const plan = {
      stage_1: {
        name: 'Immediate Actions (0-24 hours)',
        actions: this.getImmediateActions(disease, severity)
      },
      stage_2: {
        name: 'Short-term Control (2-7 days)',
        actions: [
          {
            action: 'Start regular spray schedule',
            frequency: 'Every 3-4 days for 2 weeks',
            products: disease.treatments?.slice(0, 2).map(t => t.name) || ['Systemic fungicide']
          }
        ]
      },
      stage_3: {
        name: 'Long-term Management (2-4 weeks)',
        actions: [
          {
            action: 'Implement cultural and biological controls',
            practices: this.extractCulturalPractices(disease).slice(0, 3)
          }
        ]
      },
      stage_4: {
        name: 'Prevention (Ongoing)',
        actions: [
          {
            action: 'Regular monitoring and preventive sprays',
            schedule: 'Every 10-15 days during susceptible periods'
          }
        ]
      }
    };

    return plan;
  }

  generateApplicationSchedule(severity) {
    const schedules = {
      critical: {
        day_1: 'Remove infected parts + Emergency spray',
        day_2_3: 'Second spray of systemic fungicide',
        day_4_7: 'Third spray (alternate fungicide)',
        day_8_14: 'Weekly monitoring + Preventive sprays',
        day_15_30: 'Fortnightly preventive sprays'
      },
      high: {
        day_1: 'First spray',
        day_3: 'Second spray',
        day_7: 'Third spray',
        day_14: 'Preventive spray',
        monthly: 'Continue preventive sprays'
      },
      medium: {
        day_1: 'First spray',
        day_7: 'Second spray',
        day_14: 'Third spray if needed',
        monthly: 'Monitor and spray if symptoms appear'
      },
      low: {
        day_1: 'Preventive spray',
        day_7: 'Monitor progress',
        day_14: 'Second spray if needed',
        monthly: 'Regular monitoring'
      }
    };

    return schedules[severity] || schedules.medium;
  }

  estimateTreatmentCost(disease, severity) {
    const costs = [];
    let totalCost = 0;

    const primaryTreatment = disease.treatments?.find(t => t.type === 'chemical') || this.getDefaultTreatments(severity)[0];
    
    if (primaryTreatment) {
      const quantity = this.calculateQuantity(severity);
      const avgCost = this.parseCostRange(primaryTreatment.price_range || '₹500');
      const treatmentCost = avgCost * quantity;
      
      costs.push({
        item: primaryTreatment.name,
        quantity: `${quantity} units`,
        estimated_cost: treatmentCost
      });
      
      totalCost += treatmentCost;
    }

    costs.push({
      item: 'Sprayer rental/usage',
      estimated_cost: 200
    });
    totalCost += 200;

    costs.push({
      item: 'Labor for application',
      estimated_cost: 500
    });
    totalCost += 500;

    return {
      total_estimated_cost: totalCost,
      cost_breakdown: costs,
      per_acre_cost: totalCost * 2.5, // Assuming 2.5 acres average
      government_subsidies: {
        available: true,
        scheme: 'Rashtriya Krishi Vikas Yojana (RKVY)',
        subsidy_percentage: 50,
        max_amount: '₹5000 per hectare',
        documents_required: ['Aadhaar Card', 'Land Documents', 'Bank Details']
      }
    };
  }

  calculateQuantity(severity) {
    const quantities = {
      critical: 5,
      high: 3,
      medium: 2,
      low: 1
    };
    return quantities[severity] || 2;
  }

  parseCostRange(costRange) {
    if (!costRange) return 500;
    
    const match = costRange.match(/(\d+)[^\d]*(\d+)?/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return (min + max) / 2;
    }
    return 500;
  }

  getSafetyPrecautions(disease) {
    return {
      chemical_treatments: [
        'Wear protective clothing (gloves, mask, goggles)',
        'Avoid spraying during windy conditions',
        'Do not eat, drink or smoke while spraying',
        'Wash hands and exposed skin after spraying',
        'Keep away from children and animals',
        'Store pesticides in original containers',
        'Do not reuse pesticide containers'
      ],
      reentry_period: '24-48 hours after spraying',
      harvest_waiting_period: disease.treatments?.[0]?.safety_period || '7 days',
      disposal: 'Triple rinse containers before disposal',
      emergency_contacts: {
        poison_control: '1800-11-6666',
        medical_emergency: '102',
        agriculture_helpline: '1551'
      }
    };
  }

  getEmergencyContacts() {
    return {
      national: [
        { name: 'Kisan Call Centre', number: '1800-180-1551', available: '24/7' },
        { name: 'Agriculture Ministry Helpline', number: '011-23382633', available: '9 AM - 6 PM' },
        { name: 'Poison Control Centre', number: '1800-11-6666', available: '24/7' },
        { name: 'Medical Emergency', number: '102', available: '24/7' }
      ],
      state_specific: {
        'maharashtra': [
          { name: 'Maharashtra Agri Dept', number: '022-22025252' }
        ],
        'punjab': [
          { name: 'Punjab Agri University', number: '0161-2401960' }
        ],
        'tamil_nadu': [
          { name: 'TNAU Helpline', number: '0422-6611200' }
        ],
        'karnataka': [
          { name: 'UAS Bangalore', number: '080-23330153' }
        ]
      }
    };
  }

  async getFallbackRecommendations(diseaseName, cropType) {
    return {
      disease: diseaseName,
      message: 'Specific information not found. General recommendations:',
      general_treatments: [
        {
          name: 'Broad-spectrum fungicide',
          recommendation: 'Mancozeb 75% WP @ 2g/liter',
          frequency: 'Every 7-10 days',
          type: 'chemical',
          effectiveness: 75
        },
        {
          name: 'Organic option',
          recommendation: 'Neem oil 1% + soap solution',
          frequency: 'Every 5-7 days',
          type: 'organic',
          effectiveness: 65
        }
      ],
      cultural_practices: [
        'Remove infected plant parts immediately',
        'Improve air circulation',
        'Avoid overhead irrigation',
        'Maintain proper plant nutrition'
      ],
      suggestion: 'Consult local agriculture officer for accurate diagnosis'
    };
  }

  getEmergencyRecommendations(diseaseName, cropType) {
    return {
      emergency: true,
      disease: diseaseName,
      immediate_actions: [
        '1. Remove and burn severely infected plants',
        '2. Isolate affected area',
        '3. Contact local agriculture department',
        '4. Avoid moving equipment from infected to healthy areas'
      ],
      emergency_contacts: {
        agriculture_department: '1551',
        kisan_call_center: '1800-180-1551',
        poison_control: '1800-11-6666'
      }
    };
  }
}

module.exports = new MedicationService();
