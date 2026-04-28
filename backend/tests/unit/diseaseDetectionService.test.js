const diseaseDetectionService = require('../../services/diseaseDetectionService');

describe('diseaseDetectionService', () => {
  describe('getTopPredictions', () => {
    test('returns [] for null / undefined / empty input', () => {
      expect(diseaseDetectionService.getTopPredictions(null)).toEqual([]);
      expect(diseaseDetectionService.getTopPredictions(undefined)).toEqual([]);
      expect(diseaseDetectionService.getTopPredictions([])).toEqual([]);
    });

    test('clamps probabilities to [0,1] and converts to a percentage', () => {
      const probs = new Array(diseaseDetectionService.classes.length).fill(0);
      probs[0] = 1.5;
      probs[1] = -0.4;
      probs[2] = 0.5;
      const top = diseaseDetectionService.getTopPredictions(probs, 3);
      expect(top.length).toBe(3);
      expect(top[0].probability).toBeLessThanOrEqual(100);
      expect(top[0].probability).toBeGreaterThanOrEqual(0);
      const minProb = Math.min(...top.map((p) => p.probability));
      expect(minProb).toBeGreaterThanOrEqual(0);
    });

    test('sorts descending and limits to topK', () => {
      const probs = new Array(diseaseDetectionService.classes.length).fill(0);
      probs[3] = 0.9;
      probs[5] = 0.7;
      probs[1] = 0.5;
      const top = diseaseDetectionService.getTopPredictions(probs, 2);
      expect(top.length).toBe(2);
      expect(top[0].probability).toBeGreaterThanOrEqual(top[1].probability);
    });

    test('treats NaN entries as 0', () => {
      const probs = new Array(diseaseDetectionService.classes.length).fill(0);
      probs[0] = Number.NaN;
      probs[1] = 0.8;
      const top = diseaseDetectionService.getTopPredictions(probs, 1);
      expect(top.length).toBe(1);
      expect(top[0].probability).toBeGreaterThan(0);
    });

    test('accepts iterable (Float32Array-like) input', () => {
      const probs = Float32Array.from(
        new Array(diseaseDetectionService.classes.length).fill(0).map((_, i) => (i === 4 ? 0.91 : 0))
      );
      const top = diseaseDetectionService.getTopPredictions(probs, 1);
      expect(top.length).toBe(1);
      expect(top[0].probability).toBeGreaterThan(0);
    });
  });

  describe('normalizeDiseaseName', () => {
    test('returns "Unknown Disease" for falsy input', () => {
      expect(diseaseDetectionService.normalizeDiseaseName(null)).toBe('Unknown Disease');
      expect(diseaseDetectionService.normalizeDiseaseName('')).toBe('Unknown Disease');
    });

    test('reformats Crop___healthy → "Crop Healthy"', () => {
      expect(diseaseDetectionService.normalizeDiseaseName('Tomato___healthy')).toBe('Tomato Healthy');
    });

    test('returns name unchanged when no separator present', () => {
      expect(diseaseDetectionService.normalizeDiseaseName('Some Random Name')).toBe('Some Random Name');
    });

    test('maps Crop___Disease_With_Underscores → Crop Disease With Underscores', () => {
      const out = diseaseDetectionService.normalizeDiseaseName('Wheat___Some_New_Disease');
      expect(out).toBe('Wheat Some New Disease');
    });
  });

  describe('getDiseaseDetails', () => {
    test('returns generic info for invalid input', async () => {
      const a = await diseaseDetectionService.getDiseaseDetails(null);
      const b = await diseaseDetectionService.getDiseaseDetails(123);
      expect(a.name).toBe('Unknown Disease');
      expect(b.name).toBe('Unknown Disease');
    });

    test('exact-matches a known database key', async () => {
      const out = await diseaseDetectionService.getDiseaseDetails('Powdery Mildew');
      expect(out.name).toBe('Powdery Mildew');
      expect(out.type).toBe('Fungal');
      expect(Array.isArray(out.organicTreatment)).toBe(true);
    });

    test('fuzzy-matches via case-insensitive substring lookup', async () => {
      const out = await diseaseDetectionService.getDiseaseDetails('Wheat Rust outbreak');
      expect(out.name).toBe('Wheat Rust');
    });

    test('falls back to generic info for an unknown disease', async () => {
      const out = await diseaseDetectionService.getDiseaseDetails('__totally_unknown_disease_xyz__');
      expect(out.name).toBe('__totally_unknown_disease_xyz__');
      expect(out.type).toBe('Unknown');
      expect(out.scientificName).toBe('Not identified');
    });
  });

  describe('getGenericDiseaseInfo', () => {
    test('returns the standard generic envelope with prevention/treatment arrays', () => {
      const info = diseaseDetectionService.getGenericDiseaseInfo('X');
      expect(info.name).toBe('X');
      expect(Array.isArray(info.prevention)).toBe(true);
      expect(Array.isArray(info.organicTreatment)).toBe(true);
      expect(Array.isArray(info.chemicalTreatment)).toBe(true);
      expect(info.severity).toBe('Medium');
    });

    test('uses "Unknown Disease" when no name is provided', () => {
      expect(diseaseDetectionService.getGenericDiseaseInfo().name).toBe('Unknown Disease');
      expect(diseaseDetectionService.getGenericDiseaseInfo(null).name).toBe('Unknown Disease');
    });
  });

  describe('getTreatmentPlan', () => {
    test('returns full treatment plan for a known disease', () => {
      const plan = diseaseDetectionService.getTreatmentPlan('Powdery Mildew');
      expect(plan.diseaseName).toBe('Powdery Mildew');
      expect(plan.organicTreatment.options.length).toBeGreaterThan(0);
      expect(plan.chemicalTreatment.options.length).toBeGreaterThan(0);
      expect(Array.isArray(plan.immediateActions)).toBe(true);
      expect(Array.isArray(plan.precautions)).toBe(true);
    });

    test('falls back to generic plan for an unknown disease', () => {
      const plan = diseaseDetectionService.getTreatmentPlan('__unknown_xyz__');
      expect(plan.diseaseName).toBe('__unknown_xyz__');
      expect(plan.diseaseType).toBe('Unknown');
      expect(plan.organicTreatment.effectiveness).toBeDefined();
    });

    test('coerces invalid input ("", null, number) to "Unknown Disease"', () => {
      expect(diseaseDetectionService.getTreatmentPlan(null).diseaseName).toBe('Unknown Disease');
      expect(diseaseDetectionService.getTreatmentPlan('').diseaseName).toBe('Unknown Disease');
      expect(diseaseDetectionService.getTreatmentPlan(42).diseaseName).toBe('Unknown Disease');
    });

    test('chooses recovery time based on severity', () => {
      const high = diseaseDetectionService.getTreatmentPlan('Wheat Rust');
      const med = diseaseDetectionService.getTreatmentPlan('Potato Early Blight');
      expect(high.recoveryTime).toBe('2-3 weeks');
      expect(med.recoveryTime).toBe('1-2 weeks');
    });
  });

  describe('detectDiseaseFromImage / fallbackDetection orchestration', () => {
    test('falls back deterministically when no TF model is loaded', async () => {
      diseaseDetectionService.model = null;
      const buf = Buffer.from('not-a-real-image');
      const result = await diseaseDetectionService.detectDiseaseFromImage(buf);
      expect(result).toBeDefined();
      expect(result._quality).toBeDefined();
      expect(result._quality.isFallback).toBe(true);
      expect(result.primaryDisease).toBeDefined();
      expect(typeof result.primaryDisease.name).toBe('string');
      expect(result.treatment).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(Array.isArray(result.predictions)).toBe(true);
    });

    test('fallbackDetection returns the standard envelope with isFallback=true', async () => {
      const result = await diseaseDetectionService.fallbackDetection(Buffer.from('x'));
      expect(result._quality.isFallback).toBe(true);
      expect(result._quality.modelUsed).toMatch(/^fallback/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.note).toMatch(/fallback/i);
    });
  });

  describe('analyzeImageColors', () => {
    test('returns the basic-fallback descriptor', async () => {
      const out = await diseaseDetectionService.analyzeImageColors(Buffer.from(''));
      expect(out.analysisMethod).toBe('basic-fallback');
      expect(typeof out.dominantColor).toBe('string');
      expect(typeof out.healthIndicator).toBe('string');
      expect(typeof out.spotsDetected).toBe('boolean');
    });
  });

  describe('calculateHealthScore', () => {
    test('produces a 0-100 integer score', () => {
      expect(diseaseDetectionService.calculateHealthScore(0, 0)).toBe(0);
      const max = diseaseDetectionService.calculateHealthScore(2, 5);
      expect(max).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(100);
      expect(Number.isInteger(max)).toBe(true);
    });

    test('weights green channel more heavily than edge density', () => {
      const greenHeavy = diseaseDetectionService.calculateHealthScore(0.9, 0);
      const edgeHeavy = diseaseDetectionService.calculateHealthScore(0, 0.9);
      expect(greenHeavy).toBeGreaterThan(edgeHeavy);
    });
  });
});
