
const fs = require('fs');
const path = require('path');

const existingDB = require('./cropKnowledgeBase.js');

const additionalCrops = {
  vegetables: {
    rootTuber: {
      yam: {
        name: "Yam (Dioscorea)",
        category: "Vegetable - Root & Tuber",
        idealClimate: {
          temperature: "25-30°C",
          condition: "Tropical/subtropical"
        },
        soil: {
          type: "Deep, well-drained loamy soil",
          pH: "5.5-6.5"
        },
        planting: {
          material: "1-2 t/ha of tuber pieces",
          size: "100-150 g per piece",
          depth: "10-15 cm depth"
        },
        nutrients: {
          nitrogen: "80-100 kg/ha",
          phosphorus: "30-50 kg/ha",
          potassium: "60-80 kg/ha",
          organicManure: "10-15 t/ha compost/FYM"
        },
        harvest: {
          maturity: "7-10 months",
          indicators: ["Leaves yellowing", "Tubers mature"],
          yield: {
            typical: "12-20 t/ha (4.86-8.1 t/acre)"
          }
        }
      },
      tapioca: {
        name: "Tapioca / Cassava",
        category: "Vegetable - Root & Tuber",
        idealClimate: {
          temperature: "25-30°C",
          condition: "Tropical; frost-free"
        },
        soil: {
          type: "Sandy loam to clay loam",
          pH: "5.5-6.5"
        },
        planting: {
          material: "10,000-12,000 stem cuttings/ha",
          size: "20-25 cm long, 2-3 nodes",
          depth: "5-7 cm deep"
        },
        nutrients: {
          nitrogen: "50-100 kg/ha",
          phosphorus: "20-40 kg/ha",
          potassium: "60-80 kg/ha",
          note: "K important for starch accumulation"
        },
        harvest: {
          maturity: "8-12 months",
          yield: {
            typical: "12-25 t/ha (4.86-10.1 t/acre)"
          }
        }
      }
    },
    leafy: {
      amaranthus: {
        name: "Amaranthus (Chaulai)",
        category: "Vegetable - Leafy",
        idealClimate: {
          temperature: "20-35°C",
          condition: "Warm"
        },
        soil: {
          type: "Well-drained loamy soil",
          pH: "6-7"
        },
        planting: {
          seedRate: "5-6 kg/ha",
          spacing: "25 cm rows",
          depth: "1-2 cm deep"
        },
        nutrients: {
          nitrogen: "50-70 kg/ha",
          phosphorus: "20-30 kg/ha",
          potassium: "20-25 kg/ha",
          organicManure: "2-3 t/ha compost"
        },
        harvest: {
          maturity: "25-30 days",
          method: "Harvest tender leaves; multiple pickings possible",
          yield: {
            typical: "12-20 t/ha"
          }
        }
      }
    },
    bulb: {
      garlic: {
        name: "Garlic",
        category: "Vegetable - Bulb",
        idealClimate: {
          temperature: "15-25°C",
          condition: "Cool season; requires dry weather during maturity"
        },
        soil: {
          type: "Well-drained sandy loam",
          pH: "6-7"
        },
        planting: {
          material: "500-600 kg/ha of cloves",
          spacing: "10 × 15 cm",
          depth: "4-5 cm deep"
        },
        nutrients: {
          nitrogen: "100-120 kg/ha",
          phosphorus: "50-60 kg/ha",
          potassium: "50-60 kg/ha",
          organicManure: "5-10 t/ha compost"
        },
        harvest: {
          maturity: "120-150 days",
          indicators: ["Leaves turn yellow"],
          method: "Cure bulbs before storage",
          yield: {
            typical: "8-12 t/ha"
          }
        }
      }
    },
    fruit: {
      okra: {
        name: "Okra (Ladyfinger / Bhindi)",
        category: "Vegetable - Fruit",
        idealClimate: {
          temperature: "25-35°C",
          condition: "Warm; sensitive to frost"
        },
        soil: {
          type: "Well-drained sandy loam",
          pH: "6-7"
        },
        planting: {
          seedRate: "8-10 kg/ha",
          spacing: "30 × 30 cm",
          depth: "2-3 cm deep"
        },
        nutrients: {
          nitrogen: "60-80 kg/ha",
          phosphorus: "40-50 kg/ha",
          potassium: "40-50 kg/ha",
          organicManure: "5-10 t/ha compost"
        },
        harvest: {
          maturity: "50-60 days",
          method: "Pick tender pods 8-12 cm long; continuous harvesting",
          yield: {
            typical: "10-15 t/ha"
          }
        }
      },
      cucumber: {
        name: "Cucumber",
        category: "Vegetable - Fruit",
        idealClimate: {
          temperature: "20-30°C",
          condition: "Warm"
        },
        soil: {
          type: "Sandy loam",
          pH: "6-7",
          requirement: "Well-drained"
        },
        planting: {
          seedRate: "2-3 kg/ha",
          spacing: "1-1.5 m",
          method: "2-3 seeds per hill"
        },
        nutrients: {
          nitrogen: "60-80 kg/ha",
          phosphorus: "40-50 kg/ha",
          potassium: "50-60 kg/ha",
          organicManure: "5-10 t/ha FYM"
        },
        harvest: {
          maturity: "45-60 days",
          method: "Pick tender fruits 15-25 cm long; pick regularly",
          yield: {
            typical: "15-20 t/ha"
          }
        }
      }
    }
  },
  
  fruits: {
    guava: {
      name: "Guava",
      category: "Fruit",
      idealClimate: {
        temperature: "20-30°C",
        condition: "Tropical/subtropical; drought-tolerant"
      },
      soil: {
        type: "Loamy to sandy loam",
        pH: "5.5-7.0"
      },
      planting: {
        material: "Grafted / air-layered plants",
        spacing: "5 × 5 m"
      },
      nutrients: {
        nitrogen: "150-200 g per plant per year",
        phosphorus: "50-75 g per plant per year",
        potassium: "100-150 g per plant per year"
      },
      harvest: {
        maturity: "2-3 years after planting",
        indicators: ["Fruits harvested when greenish-yellow or slightly soft"],
        yield: {
          typical: "10-15 t/ha"
        }
      }
    },
    pomegranate: {
      name: "Pomegranate",
      category: "Fruit",
      idealClimate: {
        temperature: "25-35°C",
        condition: "Semi-arid to tropical"
      },
      soil: {
        type: "Loamy, well-drained",
        pH: "5.5-7.5"
      },
      planting: {
        material: "Grafted / high-yielding cultivars",
        spacing: "3-4 m × 3-4 m"
      },
      nutrients: {
        nitrogen: "100-150 g per plant per year",
        phosphorus: "50-75 g per plant per year",
        potassium: "80-100 g per plant per year"
      },
      harvest: {
        maturity: "18-24 months",
        indicators: ["Fruits mature when red color develops"],
        yield: {
          typical: "12-15 t/ha"
        }
      }
    }
  },
  
  oilseeds: {
    sesame: {
      name: "Sesame / Til",
      category: "Oilseed",
      idealClimate: {
        temperature: "25-35°C",
        condition: "Warm; drought-tolerant"
      },
      soil: {
        type: "Loamy to sandy",
        pH: "5.5-7"
      },
      planting: {
        seedRate: "5-7 kg/ha",
        spacing: "30 × 10 cm",
        depth: "2-3 cm"
      },
      nutrients: {
        nitrogen: "20-25 kg/ha",
        phosphorus: "20-30 kg/ha",
        potassium: "Optional"
      },
      harvest: {
        maturity: "90-120 days",
        indicators: ["When leaves turn yellow"],
        method: "Cut plants, dry, thresh",
        yield: {
          typical: "0.5-1.0 t/ha"
        }
      }
    },
    castor: {
      name: "Castor",
      category: "Oilseed",
      idealClimate: {
        temperature: "20-35°C",
        condition: "Warm; drought-tolerant"
      },
      soil: {
        type: "Loamy to red sandy",
        pH: "6-7"
      },
      planting: {
        seedRate: "4-5 kg/ha",
        spacing: "90 × 60 cm",
        depth: "3-4 cm"
      },
      nutrients: {
        nitrogen: "50-60 kg/ha",
        phosphorus: "20-30 kg/ha",
        potassium: "20-25 kg/ha"
      },
      harvest: {
        maturity: "120-150 days",
        method: "Pick mature capsules; sun-dry before storage",
        yield: {
          typical: "1-2 t/ha"
        }
      }
    }
  },
  
  spices: {
    cumin: {
      name: "Cumin / Jeera",
      category: "Spice",
      idealClimate: {
        temperature: "20-30°C",
        condition: "Semi-arid; low rainfall"
      },
      soil: {
        type: "Light loamy/sandy",
        pH: "7-8"
      },
      planting: {
        seedRate: "8-10 kg/ha",
        spacing: "30 cm row spacing"
      },
      nutrients: {
        nitrogen: "20-25 kg/ha",
        phosphorus: "10-15 kg/ha"
      },
      irrigation: {
        frequency: "4-5 irrigations during growing season",
        avoid: "Avoid waterlogging"
      },
      harvest: {
        maturity: "110-120 days",
        method: "Cut plants; dry seeds before threshing",
        yield: {
          typical: "8-10 q/ha"
        }
      }
    },
    coriander: {
      name: "Coriander",
      category: "Spice",
      idealClimate: {
        temperature: "15-25°C",
        condition: "Cool to warm"
      },
      soil: {
        type: "Well-drained loamy",
        pH: "6-7"
      },
      planting: {
        seedRate: "5-6 kg/ha",
        spacing: "30 cm row spacing"
      },
      nutrients: {
        nitrogen: "30 kg/ha",
        phosphorus: "20 kg/ha"
      },
      harvest: {
        maturity: "70-90 days",
        indicators: ["Seeds brown"],
        method: "Cut and dry",
        yield: {
          typical: "8-10 q/ha"
        }
      }
    }
  }
};

function expandCropDatabase() {
  if (!existingDB.vegetables) {
    existingDB.vegetables = {};
  }
  
  if (!existingDB.vegetables.rootTuber) {
    existingDB.vegetables.rootTuber = {};
  }
  Object.assign(existingDB.vegetables.rootTuber, additionalCrops.vegetables.rootTuber);
  
  if (!existingDB.vegetables.leafy) {
    existingDB.vegetables.leafy = {};
  }
  Object.assign(existingDB.vegetables.leafy, additionalCrops.vegetables.leafy);
  
  if (!existingDB.vegetables.bulb) {
    existingDB.vegetables.bulb = {};
  }
  Object.assign(existingDB.vegetables.bulb, additionalCrops.vegetables.bulb);
  
  if (!existingDB.vegetables.fruit) {
    existingDB.vegetables.fruit = {};
  }
  Object.assign(existingDB.vegetables.fruit, additionalCrops.vegetables.fruit);
  
  if (!existingDB.fruits) {
    existingDB.fruits = {};
  }
  Object.assign(existingDB.fruits, additionalCrops.fruits);
  
  if (!existingDB.oilseeds) {
    existingDB.oilseeds = {};
  }
  Object.assign(existingDB.oilseeds, additionalCrops.oilseeds);
  
  if (!existingDB.spices) {
    existingDB.spices = {};
  }
  Object.assign(existingDB.spices, additionalCrops.spices);
  
  return existingDB;
}

module.exports = expandCropDatabase();













