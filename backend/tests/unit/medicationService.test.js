const medicationService = require('../../services/medicationService');

describe('medicationService pure helpers', () => {
  describe('assessSeverity', () => {
    test.each(['low', 'medium', 'high', 'critical'])('returns descriptor for %s', (sev) => {
      const result = medicationService.assessSeverity({}, sev);
      expect(result.urgency).toBe(sev);
      expect(typeof result.description).toBe('string');
      expect(typeof result.action_required).toBe('string');
    });

    test('falls back to medium for unknown severity', () => {
      expect(medicationService.assessSeverity({}, 'banana').urgency).toBe('medium');
    });
  });

  describe('getImmediateActions', () => {
    test('returns critical-stage emergency action for critical severity', () => {
      const actions = medicationService.getImmediateActions({}, 'critical');
      expect(actions.some((a) => /emergency chemical/i.test(a.action))).toBe(true);
      expect(actions.some((a) => a.priority === 'critical')).toBe(true);
    });

    test('omits critical actions for low severity', () => {
      const actions = medicationService.getImmediateActions({}, 'low');
      expect(actions.some((a) => a.priority === 'critical')).toBe(false);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('generateApplicationSchedule', () => {
    test.each(['low', 'medium', 'high', 'critical'])('returns schedule for %s', (sev) => {
      const sched = medicationService.generateApplicationSchedule(sev);
      expect(sched).toBeDefined();
      expect(typeof sched).toBe('object');
      expect(Object.keys(sched).length).toBeGreaterThan(0);
    });

    test('falls back to medium for unknown severity', () => {
      const sched = medicationService.generateApplicationSchedule('weird');
      const medium = medicationService.generateApplicationSchedule('medium');
      expect(sched).toEqual(medium);
    });
  });

  describe('calculateQuantity', () => {
    test('scales with severity', () => {
      expect(medicationService.calculateQuantity('low')).toBe(1);
      expect(medicationService.calculateQuantity('medium')).toBe(2);
      expect(medicationService.calculateQuantity('high')).toBe(3);
      expect(medicationService.calculateQuantity('critical')).toBe(5);
    });

    test('defaults to medium quantity for unknown', () => {
      expect(medicationService.calculateQuantity('unknown')).toBe(2);
    });
  });

  describe('parseCostRange', () => {
    test('returns 500 for falsy / unparseable input', () => {
      expect(medicationService.parseCostRange(null)).toBe(500);
      expect(medicationService.parseCostRange('')).toBe(500);
      expect(medicationService.parseCostRange('cheap')).toBe(500);
    });

    test('extracts a single price', () => {
      expect(medicationService.parseCostRange('₹450')).toBe(450);
    });

    test('averages a range', () => {
      expect(medicationService.parseCostRange('₹400-600')).toBe(500);
    });
  });

  describe('estimateTreatmentCost', () => {
    test('returns subsidy info, breakdown, and a positive total', () => {
      const result = medicationService.estimateTreatmentCost(
        { treatments: [{ type: 'chemical', name: 'Mancozeb', price_range: '₹400-600' }] },
        'medium'
      );
      expect(result.total_estimated_cost).toBeGreaterThan(0);
      expect(Array.isArray(result.cost_breakdown)).toBe(true);
      expect(result.cost_breakdown.length).toBeGreaterThanOrEqual(1);
      expect(result.government_subsidies.available).toBe(true);
      expect(result.per_acre_cost).toBeGreaterThan(result.total_estimated_cost - 1);
    });

    test('falls back to default treatment when disease has none', () => {
      const result = medicationService.estimateTreatmentCost({ treatments: [] }, 'high');
      expect(result.total_estimated_cost).toBeGreaterThan(0);
    });
  });

  describe('getEmergencyContacts', () => {
    test('returns national + state-specific contacts with required shape', () => {
      const contacts = medicationService.getEmergencyContacts();
      expect(Array.isArray(contacts.national)).toBe(true);
      expect(contacts.national.length).toBeGreaterThanOrEqual(2);
      contacts.national.forEach((c) => {
        expect(typeof c.name).toBe('string');
        expect(typeof c.number).toBe('string');
      });
      expect(typeof contacts.state_specific).toBe('object');
      expect(contacts.state_specific.maharashtra).toBeDefined();
    });
  });

  describe('getFallbackRecommendations', () => {
    test('returns disease-keyed message + general treatments + cultural practices', async () => {
      const result = await medicationService.getFallbackRecommendations('mystery_blight', 'tomato');
      expect(result.disease).toBe('mystery_blight');
      expect(typeof result.message).toBe('string');
      expect(Array.isArray(result.general_treatments)).toBe(true);
      expect(result.general_treatments.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.cultural_practices)).toBe(true);
    });
  });

  describe('getEmergencyRecommendations', () => {
    test('returns immediate measures and helplines for any disease', () => {
      const result = medicationService.getEmergencyRecommendations('rust', 'wheat');
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('getMedicationRecommendations (mongo-disconnected fallback)', () => {
    test('falls back deterministically when DB is not ready', async () => {
      const result = await medicationService.getMedicationRecommendations(
        '__nonexistent__',
        'wheat',
        'low'
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('filterTreatments', () => {
    test('returns default treatments for empty/null input', async () => {
      const a = await medicationService.filterTreatments([], 'high');
      const b = await medicationService.filterTreatments(null, 'high');
      expect(Array.isArray(a)).toBe(true);
      expect(Array.isArray(b)).toBe(true);
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
    });

    test('drops treatments whose suitableSeverity excludes the requested severity', async () => {
      const treatments = [
        { name: 'A', type: 'chemical', suitableSeverity: ['low'] },
        { name: 'B', type: 'chemical', suitableSeverity: ['high', 'critical'] }
      ];
      const out = await medicationService.filterTreatments(treatments, 'high');
      expect(out.find((t) => t.name === 'A')).toBeUndefined();
      expect(out.find((t) => t.name === 'B')).toBeDefined();
    });

    test('drops treatments whose suitableCrops excludes the requested crop (case-insensitive)', async () => {
      const treatments = [
        { name: 'A', type: 'chemical', suitableCrops: ['rice'] },
        { name: 'B', type: 'chemical', suitableCrops: ['tomato'] }
      ];
      const out = await medicationService.filterTreatments(treatments, 'medium', 'TOMATO');
      expect(out.find((t) => t.name === 'A')).toBeUndefined();
      expect(out.find((t) => t.name === 'B')).toBeDefined();
    });

    test('caps results at 5 and sorts by priority desc', async () => {
      const treatments = Array.from({ length: 8 }, (_, i) => ({
        name: `T${i}`,
        type: 'chemical',
        effectiveness: 50 + i
      }));
      const out = await medicationService.filterTreatments(treatments, 'medium');
      expect(out.length).toBe(5);
      for (let i = 1; i < out.length; i++) {
        expect(out[i - 1].priority).toBeGreaterThanOrEqual(out[i].priority);
      }
    });

    test('uses product-level dosage/frequency/preparation when products[] present', async () => {
      const out = await medicationService.filterTreatments(
        [
          {
            name: 'Custom',
            type: 'chemical',
            products: [
              { name: 'BrandX', dosage: '1 ml/L', frequency: 'weekly', preparation: 'mix in tank' },
              { name: 'BrandY' }
            ]
          }
        ],
        'high'
      );
      expect(out[0].dosage).toBe('1 ml/L');
      expect(out[0].frequency).toBe('weekly');
      expect(out[0].preparation).toBe('mix in tank');
      expect(out[0].brands).toEqual(expect.arrayContaining(['BrandX', 'BrandY']));
    });

    test('falls back to treatment-level fields and getDefaultDosage when no products', async () => {
      const out = await medicationService.filterTreatments(
        [{ name: 'Mancozeb 75 WP', type: 'chemical' }],
        'medium'
      );
      expect(out[0].dosage).toMatch(/2-2\.5 g\/liter/);
      expect(out[0].frequency).toMatch(/Every/);
    });
  });

  describe('getDefaultDosage', () => {
    test('matches a known active ingredient (case-insensitive substring)', () => {
      expect(medicationService.getDefaultDosage('Neem oil concentrate', 'organic')).toMatch(/ml\/liter/);
      expect(medicationService.getDefaultDosage('Carbendazim 50 WP', 'chemical')).toMatch(/g\/liter/);
    });

    test('falls back by type when name has no known active ingredient', () => {
      expect(medicationService.getDefaultDosage('UnknownX', 'chemical')).toBe('2-3 g/liter of water');
      expect(medicationService.getDefaultDosage('UnknownX', 'organic')).toBe('2-5 ml/liter of water');
      expect(medicationService.getDefaultDosage('UnknownX', 'biological')).toBe('2-5 g/liter of water');
    });

    test('returns the manufacturer-instructions default for unknown type', () => {
      expect(medicationService.getDefaultDosage(null, 'mystery')).toBe('As per manufacturer instructions');
      expect(medicationService.getDefaultDosage(undefined, undefined)).toBe('As per manufacturer instructions');
    });
  });

  describe('getDefaultFrequency', () => {
    test.each([
      ['critical', 'chemical', /3-5 days/],
      ['high', 'organic', /7-10 days/],
      ['medium', 'biological', /14 days/],
      ['low', 'chemical', /10-14 days/]
    ])('returns %s/%s schedule', (sev, type, re) => {
      expect(medicationService.getDefaultFrequency(sev, type)).toMatch(re);
    });

    test('falls back to medium when severity is unknown', () => {
      const fallback = medicationService.getDefaultFrequency('weird', 'chemical');
      expect(fallback).toBe(medicationService.getDefaultFrequency('medium', 'chemical'));
    });

    test('uses chemical default when type is missing', () => {
      const result = medicationService.getDefaultFrequency('medium', undefined);
      expect(result).toBe(medicationService.getDefaultFrequency('medium', 'chemical'));
    });

    test('returns generic catch-all when neither severity nor type maps cleanly', () => {
      const result = medicationService.getDefaultFrequency('weird', 'mystery');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
