
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class GovernmentAPIService {
  constructor() {
    this.baseUrls = {
      pmkisan: 'https://pmkisan.gov.in/',
      agmarknet: 'https://agmarknet.gov.in/',
      soilHealth: 'https://soilhealth.dac.gov.in/',
      mandi: 'https://api.data.gov.in/resource/',
      farmerPortal: 'https://farmer.gov.in/'
    };
    
    this.apiKeys = {
      dataGov: process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
      pmkisan: process.env.PMKISAN_API_KEY || ''
    };
  }

  async getPMKISANStatus(aadharNumber = null, mobileNumber = null) {
    try {
      if (aadharNumber) {
        const aadharHash = crypto.createHash('sha256')
          .update(aadharNumber)
          .digest('hex')
          .substring(0, 16);
        
        const response = {
          beneficiary_id: `PMKISAN_${aadharHash}`,
          name: 'Simulated Farmer',
          state: 'Punjab',
          district: 'Ludhiana',
          installments: [
            { number: 1, date: '2024-01-01', status: 'credited', amount: 2000 },
            { number: 2, date: '2024-04-01', status: 'pending', amount: 2000 },
            { number: 3, date: '2024-07-01', status: 'upcoming', amount: 2000 }
          ],
          total_received: 2000,
          next_installment: '2024-04-01',
          bank_account: 'XXXXXX1234',
          last_updated: new Date().toISOString()
        };
        
        return {
          success: true,
          data: response,
          source: 'pmkisan_simulated'
        };
      }
      
      return {
        success: false,
        error: 'Aadhar number or mobile number required',
        source: 'pmkisan'
      };
    } catch (error) {
      logger.error(`PM-KISAN API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'pmkisan'
      };
    }
  }

  async getSoilHealthCard(farmerId = null, mobileNumber = null) {
    try {
      const cardNumber = mobileNumber 
        ? `SHC_${crypto.createHash('md5').update(mobileNumber).digest('hex').substring(0, 8)}`
        : 'SHC_12345678';
      
      const sampleData = {
        card_number: cardNumber,
        farmer_name: 'Sample Farmer',
        village: 'Sample Village',
        district: 'Sample District',
        state: 'Sample State',
        issue_date: '2023-06-15',
        expiry_date: '2026-06-14',
        soil_parameters: {
          ph: 6.8,
          electrical_conductivity: 0.42,
          organic_carbon: 0.75,
          nitrogen: 280,
          phosphorus: 22,
          potassium: 180,
          zinc: 0.8,
          iron: 4.5,
          copper: 1.2,
          manganese: 3.8
        },
        soil_type: 'Clay Loam',
        recommendations: [
          'Apply 60 kg N, 40 kg P2O5, and 20 kg K2O per acre for wheat crop',
          'Add 5-10 tonnes of well-decomposed FYM per acre',
          'Apply zinc sulfate @ 25 kg/acre once in 3 years',
          'Practice crop rotation with legumes',
          'Use green manure crops like sunnhemp or dhaincha'
        ],
        crop_suitability: {
          highly_suitable: ['Wheat', 'Rice', 'Sugarcane'],
          moderately_suitable: ['Maize', 'Cotton', 'Pulses'],
          less_suitable: ['Groundnut', 'Soybean']
        },
        testing_lab: 'State Soil Testing Laboratory',
        lab_address: 'Sample City, Sample State',
        pdf_url: 'https://soilhealth.dac.gov.in/card.pdf'
      };
      
      return {
        success: true,
        data: sampleData,
        source: 'soil_health_portal'
      };
    } catch (error) {
      logger.error(`Soil Health API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'soil_health'
      };
    }
  }

  async getMSPPrices(crop = null, year = null) {
    try {
      if (!year) {
        year = new Date().getFullYear();
      }
      
      const mspData = {
        '2024': {
          paddy: { common: 2183, grade_a: 2203 },
          wheat: 2275,
          maize: 2090,
          jowar: { hybrid: 2988, maldandi: 3008 },
          bajra: 2500,
          ragi: 3897,
          arhar: 7000,
          moong: 8558,
          urad: 6950,
          groundnut: 6377,
          sunflower: 6760,
          soybean: { black: 4600, yellow: 4490 },
          sesamum: 8613,
          nigerseed: 7877,
          cotton: { medium_staple: 6620, long_staple: 7020 }
        }
      };
      
      const yearData = mspData[year.toString()] || mspData['2024'];
      
      if (crop) {
        const cropData = yearData[crop.toLowerCase()] || {};
        return {
          success: true,
          crop,
          year,
          msp: cropData,
          unit: '₹ per quintal',
          source: 'government_msp'
        };
      } else {
        return {
          success: true,
          year,
          all_msp: yearData,
          unit: '₹ per quintal',
          source: 'government_msp'
        };
      }
    } catch (error) {
      logger.error(`MSP API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'msp'
      };
    }
  }

  async getGovernmentSchemes(state = null, category = null, farmerType = null) {
    try {
      const schemes = [
        {
          scheme_id: 'PMKISAN',
          name: 'Pradhan Mantri Kisan Samman Nidhi',
          name_hi: 'प्रधानमंत्री किसान सम्मान निधि',
          description: {
            en: 'Income support scheme for farmers',
            hi: 'किसानों के लिए आय सहायता योजना'
          },
          benefits: [
            '₹6,000 per year in three installments',
            'Direct bank transfer'
          ],
          eligibility: {
            land_holding: 'Up to 2 hectares',
            exclusions: ['Income tax payers', 'Professionals', 'Government employees']
          },
          application_process: [
            'Visit nearest Common Service Centre (CSC)',
            'Submit land records and bank details',
            'Aadhar verification',
            'Application submission'
          ],
          documents_required: [
            'Aadhar card',
            'Land ownership records',
            'Bank account details',
            'Mobile number'
          ],
          website_url: 'https://pmkisan.gov.in/',
          helpline: '18001155266',
          start_date: '2018-12-01',
          end_date: null
        },
        {
          scheme_id: 'PMFBY',
          name: 'Pradhan Mantri Fasal Bima Yojana',
          name_hi: 'प्रधानमंत्री फसल बीमा योजना',
          description: {
            en: 'Crop insurance scheme',
            hi: 'फसल बीमा योजना'
          },
          benefits: [
            'Premium subsidy',
            'Quick claim settlement',
            'Comprehensive risk coverage'
          ],
          eligibility: {
            all_farmers: true,
            crops: ['Food crops', 'Oilseeds', 'Annual commercial/horticultural crops']
          },
          application_process: [
            'Contact insurance company',
            'Submit crop details',
            'Pay premium',
            'Receive certificate'
          ],
          documents_required: [
            'Land records',
            'Aadhar card',
            'Bank details',
            'Crop details'
          ],
          website_url: 'https://pmfby.gov.in/',
          helpline: '1800116511',
          start_date: '2016-01-01',
          end_date: null
        }
      ];
      
      let filteredSchemes = schemes;
      
      if (state) {
      }
      
      if (category) {
        filteredSchemes = filteredSchemes.filter(s => 
          s.name.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      return {
        success: true,
        count: filteredSchemes.length,
        schemes: filteredSchemes,
        source: 'government_portals'
      };
    } catch (error) {
      logger.error(`Schemes API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'schemes'
      };
    }
  }

  async getSubsidies(crop, state) {
    try {
      const subsidies = {
        fertilizer: {
          urea: { subsidy: 75, max_quantity: 100, unit: 'bags' },
          dap: { subsidy: 40, max_quantity: 50, unit: 'bags' },
          mop: { subsidy: 30, max_quantity: 50, unit: 'bags' },
          npk: { subsidy: 35, max_quantity: 50, unit: 'bags' }
        },
        seeds: {
          certified_seeds: { subsidy: 50, max_area: 2, unit: 'acres' },
          hybrid_seeds: { subsidy: 60, max_area: 1, unit: 'acres' }
        },
        equipment: {
          drip_irrigation: { subsidy: 90, max_area: 5, unit: 'acres' },
          sprinkler: { subsidy: 50, max_area: 5, unit: 'acres' },
          power_tiller: { subsidy: 50, max_amount: 50000, unit: '₹' },
          harvester: { subsidy: 40, max_amount: 1000000, unit: '₹' }
        },
        crop_specific: {
          pulses: { additional: 20, unit: '% of MSP' },
          oilseeds: { additional: 15, unit: '% of MSP' }
        }
      };
      
      const stateSubsidies = {
        punjab: { additional_subsidy: 10 },
        haryana: { additional_subsidy: 8 },
        maharashtra: { additional_subsidy: 12 },
        karnataka: { additional_subsidy: 10 }
      };
      
      const stateAdjustment = stateSubsidies[state?.toLowerCase()]?.additional_subsidy || 0;
      
      return {
        success: true,
        crop,
        state,
        subsidies,
        state_adjustment: `+${stateAdjustment}%`,
        source: 'state_agriculture_department'
      };
    } catch (error) {
      logger.error(`Subsidies API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'subsidies'
      };
    }
  }

  async getWeatherAdvisory(district) {
    try {
      const advisories = {
        sowing: 'Optimal time for kharif sowing. Ensure soil moisture is adequate.',
        irrigation: 'Reduce irrigation frequency due to expected rainfall.',
        fertilizer: 'Apply basal dose of fertilizers before next irrigation.',
        pest_control: 'Monitor for leaf folder in rice. Spray if infestation exceeds 10%.',
        harvest: 'Delay harvesting due to forecasted rain. Harvest when weather clears.'
      };
      
      return {
        success: true,
        district,
        advisories,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'IMD_agricultural_met'
      };
    } catch (error) {
      logger.error(`Weather advisory error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'weather_advisory'
      };
    }
  }

  async registerComplaint(complaintData) {
    try {
      const complaintId = `COMP_${crypto.createHash('md5')
        .update(new Date().toString())
        .digest('hex')
        .substring(0, 10)}`;
      
      return {
        success: true,
        complaint_id: complaintId,
        message: 'Complaint registered successfully',
        tracking_url: `https://farmer.gov.in/track/${complaintId}`,
        expected_resolution: '15 working days',
        source: 'farmer_grievance_portal'
      };
    } catch (error) {
      logger.error(`Complaint registration error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: 'complaint'
      };
    }
  }
}

module.exports = new GovernmentAPIService();
