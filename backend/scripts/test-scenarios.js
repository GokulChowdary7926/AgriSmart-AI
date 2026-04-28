
const logger = require('../utils/logger');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const DiseaseController = require('../controllers/DiseaseController');

async function testCropRecommendations() {
  logger.info('=== CROP RECOMMENDATION TESTS ===');

  const scenarios = [
    {
      name: 'Punjab – Kharif (monsoon) – rice belt',
      coords: { lat: 31.1471, lon: 75.3412 },
      notes: 'Should favour rice, maize or other kharif crops suited to alluvial soil and high rainfall.'
    },
    {
      name: 'Maharashtra – sugarcane/cotton zone',
      coords: { lat: 19.7515, lon: 75.7139 },
      notes: 'Black soils with moderate to high rainfall – sugarcane/cotton often strong candidates.'
    },
    {
      name: 'Karnataka – red soils, moderate rainfall',
      coords: { lat: 15.3173, lon: 75.7139 },
      notes: 'Red soils; pulses, oilseeds and millets should appear.'
    }
  ];

  for (const scenario of scenarios) {
    const { lat, lon } = scenario.coords;
    logger.info(`\n--- Scenario: ${scenario.name} ---`);
    logger.info(`Notes: ${scenario.notes}`);

    try {
      const engineData = await cropRecommendationEngine.getLocationData(
        lat,
        lon,
        null,   // let engine / weather service derive conditions
        null,
        null,
        'India'
      );

      const recommendations = engineData.recommendations || [];
      logger.info('Summary', {
        state: engineData.location?.state,
        soilType: engineData.soil?.soilType,
        ph: engineData.soil?.ph,
        temperature: engineData.weather?.temperature,
        rainfall: engineData.weather?.rainfall,
        recommendationCount: recommendations.length
      });

      const top = recommendations.slice(0, 5).map((r) => ({
        crop: r.crop || r.name || r.label,
        score: r.score || r.suitabilityScore,
        reason: r.reason || r.summary
      }));

      logger.info('Top recommendations', top);
    } catch (error) {
      logger.error(`Error in scenario "${scenario.name}"`, { error: error.message });
    }
  }
}

async function testDiseaseAndTreatment() {
  logger.info('\n=== DISEASE & TREATMENT TESTS ===');

  const mockReqRes = () => {
    const req = { query: {}, params: {} };
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
    return { req, res };
  };

  {
    const { req } = mockReqRes();
    req.query = { crop: 'tomato', limit: 5 };
    await DiseaseController.getAll(req, res);
    logger.info('Tomato diseases overview', {
      status: res.statusCode,
      count: res.body?.data?.length
    });
    if (Array.isArray(res.body?.data)) {
      logger.info('Sample diseases', res.body.data.map((d) => ({
        id: d._id,
        name: d.name,
        severity: d.severity || d.severityLevel
      })));
    }
  }

  {
    const { req } = mockReqRes();
    req.params = { id: '1' };
    req.query = { crop: 'tomato', severity: 'high' };
    await new Promise((resolve) => {
      const handler = require('../routes/diseases');
      resolve(handler);
    }).catch(() => {});
    logger.info('Medication test note', {
      info: 'Run backend and call GET /diseases/1/medication?crop=tomato&severity=high to see full treatment plan.'
    });
  }
}

async function main() {
  await testCropRecommendations();
  await testDiseaseAndTreatment();
  logger.info('\nAll test scenarios executed.');
}

main().catch((err) => {
  console.error('Test scenarios failed:', err);
  process.exit(1);
});

