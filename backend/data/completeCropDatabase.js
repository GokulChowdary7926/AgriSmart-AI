
const cropDatabase = {
  cereals: {
    rice: {
      name: "Rice (Paddy)",
      scientificName: "Oryza sativa",
      localNames: ["Chawal", "Bhat", "Arisi"],
      category: "Cereal",
      seasons: ["kharif", "rabi"],
      idealClimate: {
        temperature: "20-35°C",
        idealTemp: "25-32°C",
        humidity: "Warm, humid (70-90%)",
        rainfall: "1000-2000 mm",
        sunlight: "6 hours/day"
      },
      soil: {
        types: ["Clay", "Clay Loam", "Silt"],
        pH: "5.5-7.0",
        drainage: "Poor (needs water retention)",
        organicMatter: "High"
      },
      landPreparation: {
        steps: [
          "Deep ploughing after harvest of previous crop",
          "2-3 ploughings with tractor/power tiller",
          "Puddling for transplanted rice (creates soft muddy condition)",
          "Level the field perfectly for uniform water distribution",
          "Incorporate 10-15 t/ha Farm Yard Manure (FYM)"
        ]
      },
      planting: {
        seedRate: "20-25 kg/ha (transplanting), 60-80 kg/ha (DSR)",
        spacing: "20×20 cm",
        depth: "2 cm",
        method: "Transplanting (nursery raised seedlings)",
        nurseryDays: 25,
        transplantAge: 25
      },
      nutrients: {
        nitrogen: "120 kg/ha (split: 1/3 basal, 1/3 tillering, 1/3 panicle initiation)",
        phosphorus: "60 kg/ha",
        potassium: "40 kg/ha",
        organicManure: "10 t/ha FYM",
        micronutrients: ["Zinc (25 kg ZnSO₄/ha)", "Iron", "Boron"]
      },
      irrigation: {
        method: "Continuous ponding (2-5 cm water depth)",
        alternatives: "Alternate Wetting Drying (AWD) or SRI practices",
        criticalStages: ["Tillering", "Panicle Initiation", "Flowering", "Grain Filling"],
        frequency: "Every 3 days",
        waterRequirement: "1200 mm"
      },
      weeding: {
        frequency: "1-2 weedings",
        methods: [
          "First weeding at 20-25 days after transplanting (DAT)",
          "Second weeding at 40-45 DAT if needed",
          "Use cono-weeder for mechanical weeding",
          "Apply pre-emergent herbicides like Butachlor or Pendimethalin",
          "Manual rogueing to remove off-type plants"
        ]
      },
      pests: [
        {
          name: "Brown Planthopper",
          symptoms: ["Hopper burn", "Yellowing of leaves", "Stunted growth"],
          organicControl: ["Neem oil spray (2%)", "Release of spiders and mirid bugs"],
          chemicalControl: ["Imidacloprid 17.8SL @ 0.3 ml/l", "Buprofezin 25SC @ 1.0 ml/l"],
          threshold: "5-10 hoppers/hill"
        },
        {
          name: "Leaf Folder",
          symptoms: ["Rolled leaves", "White streaks"],
          organicControl: ["Neem oil", "Biological control"],
          chemicalControl: ["Chlorantraniliprole", "Flubendiamide"]
        },
        {
          name: "Stem Borer",
          symptoms: ["Dead hearts", "White ears"],
          organicControl: ["Pheromone traps", "Trichogramma release"],
          chemicalControl: ["Cartap hydrochloride", "Fipronil"]
        }
      ],
      diseases: [
        {
          name: "Rice Blast",
          symptoms: ["Diamond-shaped lesions on leaves", "Node infection", "Empty panicles"],
          organicControl: ["Seed treatment with Trichoderma viride", "Spray neem oil"],
          chemicalControl: ["Tricyclazole 75WP @ 0.6 g/l", "Isoprothiolane 40EC @ 1.5 ml/l"],
          threshold: "First appearance of lesions"
        },
        {
          name: "Bacterial Blight",
          symptoms: ["Water-soaked lesions", "Yellow margins"],
          organicControl: ["Copper-based fungicides", "Field sanitation"],
          chemicalControl: ["Streptocycline", "Bactericides"]
        }
      ],
      ipmStrategies: [
        "Use resistant/tolerant varieties",
        "Seed treatment with fungicides/biocontrol agents",
        "Adopt ecological engineering by planting border crops",
        "Install pheromone traps @ 5/ha for stem borer",
        "Conserve natural enemies (spiders, dragonflies)",
        "Apply need-based pesticides only when threshold reached"
      ],
      harvest: {
        maturity: "120-150 days",
        indicators: [
          "80-85% grains turn yellow/straw color",
          "Grains hard (20-22% moisture)",
          "Panicles droop due to grain weight"
        ],
        method: "Manual cutting with sickle or combine harvester",
        yield: {
          rainfed: "3-6 t/ha (1.2-2.4 t/acre)",
          irrigated: "4-8 t/ha (1.6-3.2 t/acre)"
        }
      },
      postHarvest: [
        "Thresh immediately after harvest",
        "Sun dry to 14% moisture content",
        "Clean and grade using sieves/winnowing",
        "Store in airtight containers with neem leaves"
      ],
      varieties: ["Pusa Basmati 1509", "Swarna", "Samba Mahsuri", "IR-64"],
      intercrops: ["Azolla", "Fish culture"],
      rotationCrops: ["Wheat", "Pulses", "Oilseeds"],
      economics: {
        marketPrice: "₹25-40/kg",
        costOfCultivation: "₹45,000/ha",
        profitMargin: "35%"
      }
    },
    wheat: {
      name: "Wheat",
      scientificName: "Triticum aestivum",
      localNames: ["Gehun", "Godhi"],
      category: "Cereal",
      seasons: ["rabi"],
      idealClimate: {
        temperature: "10-25°C",
        idealTemp: "15-22°C",
        humidity: "50-70%",
        rainfall: "300-500 mm",
        sunlight: "8 hours/day"
      },
      soil: {
        types: ["Loam", "Clay Loam"],
        pH: "6.0-7.5",
        drainage: "Good",
        organicMatter: "Medium"
      },
      landPreparation: {
        steps: [
          "Deep ploughing with mouldboard plough after kharif crop",
          "2-3 harrowings to break clods",
          "Leveling with laser leveler for uniform irrigation",
          "Apply 10-15 t/ha well-decomposed FYM",
          "Prepare raised beds (60 cm wide) for bed planting"
        ]
      },
      planting: {
        seedRate: "100-125 kg/ha",
        spacing: "20-22 cm rows",
        depth: "5 cm",
        method: "Drilling with seed cum fertilizer drill"
      },
      nutrients: {
        nitrogen: "120 kg/ha (split: 50% basal, 25% first irrigation, 25% second irrigation)",
        phosphorus: "60 kg/ha",
        potassium: "40 kg/ha",
        organicManure: "10 t/ha FYM",
        micronutrients: ["Zinc (25 kg ZnSO₄/ha)", "Sulfur (40 kg S/ha)"]
      },
      irrigation: {
        method: "Border strip/flood irrigation",
        criticalStages: ["Crown Root Initiation", "Tillering", "Jointing", "Heading", "Milking"],
        frequency: "Every 21 days",
        waterRequirement: "450 mm"
      },
      weeding: {
        frequency: "1-2 weedings",
        methods: [
          "First weeding at 25-30 days after sowing (DAS)",
          "Use wheel hoe or hand hoe",
          "Apply herbicides: Sulfosulfuron + Metsulfuron for broadleaf",
          "Earthing up during 2nd irrigation"
        ]
      },
      pests: [
        {
          name: "Aphids",
          symptoms: ["Yellowing", "Stunted growth"],
          organicControl: ["Neem oil", "Ladybird beetles"],
          chemicalControl: ["Imidacloprid", "Dimethoate"]
        }
      ],
      diseases: [
        {
          name: "Yellow Rust",
          symptoms: ["Yellow pustules on leaves", "Premature drying"],
          organicControl: ["Spray neem oil (2%)"],
          chemicalControl: ["Tebuconazole 250EC @ 1 ml/l", "Propiconazole 25EC @ 1 ml/l"],
          threshold: "5% leaf area affected"
        },
        {
          name: "Karnal Bunt",
          symptoms: ["Fishy odor", "Black spores"],
          organicControl: ["Seed treatment", "Crop rotation"],
          chemicalControl: ["Carbendazim", "Propiconazole"]
        }
      ],
      ipmStrategies: [
        "Use certified seeds of resistant varieties",
        "Timely sowing (Nov 1-20 in North India)",
        "Balanced fertilizer application",
        "Crop rotation with legumes",
        "Install yellow sticky traps for aphids"
      ],
      harvest: {
        maturity: "140-160 days",
        indicators: [
          "Grains hard with 12-14% moisture",
          "Straw turns golden yellow",
          "No green tinge in grains"
        ],
        method: "Combine harvester or manual cutting",
        yield: {
          typical: "4-6 t/ha (1.6-2.4 t/acre)",
          highInput: "5-7 t/ha (2.0-2.8 t/acre)"
        }
      },
      postHarvest: [
        "Thresh immediately",
        "Clean with air-screen cleaner",
        "Dry to 12% moisture",
        "Store in metal bins with aluminum phosphide tablets"
      ],
      varieties: ["HD-2967", "PBW-550", "DBW-17", "WH-1105"],
      intercrops: ["Chickpea", "Mustard", "Linseed"],
      rotationCrops: ["Rice", "Cotton", "Maize"],
      economics: {
        marketPrice: "₹22-28/kg",
        costOfCultivation: "₹40,000/ha",
        profitMargin: "40%"
      }
    },
    maize: {
      name: "Maize (Corn)",
      scientificName: "Zea mays",
      localNames: ["Makka", "Bhutta"],
      category: "Cereal",
      seasons: ["kharif", "rabi"],
      idealClimate: {
        temperature: "18-30°C",
        idealTemp: "21-27°C",
        humidity: "Moderate",
        rainfall: "500-750 mm",
        sunlight: "Full sun"
      },
      soil: {
        types: ["Well-drained loams"],
        pH: "5.5-7.5",
        drainage: "Good",
        organicMatter: "Medium to High"
      },
      planting: {
        seedRate: "20-30 kg/ha",
        spacing: "60-75 cm × 20-25 cm",
        depth: "4-6 cm",
        method: "Direct sowing"
      },
      nutrients: {
        nitrogen: "High N demand - split: basal + V6 (knee-high) + tassel initiation",
        phosphorus: "60-80 kg/ha",
        potassium: "40-60 kg/ha",
        organicManure: "10-15 t/ha FYM"
      },
      irrigation: {
        method: "Furrow or drip irrigation",
        criticalStages: ["Tasseling", "Silking", "Grain filling"],
        frequency: "As needed",
        waterRequirement: "500-800 mm"
      },
      pests: [
        {
          name: "Stem Borers",
          symptoms: ["Dead hearts", "Tunneling in stems"],
          organicControl: ["Bt hybrids", "Pheromone traps", "Trichogramma"],
          chemicalControl: ["Chlorantraniliprole", "Emamectin"]
        },
        {
          name: "Fall Armyworm",
          symptoms: ["Window paning", "Holes in leaves"],
          organicControl: ["Neem", "Biological control"],
          chemicalControl: ["Spinosad", "Emamectin benzoate"]
        }
      ],
      diseases: [
        {
          name: "Leaf Blights",
          symptoms: ["Brown lesions", "Drying of leaves"],
          organicControl: ["Resistant varieties", "Crop rotation"],
          chemicalControl: ["Mancozeb", "Propiconazole"]
        }
      ],
      harvest: {
        maturity: "90-120 days",
        indicators: [
          "Kernels reach black layer",
          "Moisture ~20% (dry to 12-14%)",
          "Husks turn brown"
        ],
        method: "Combine harvester or manual",
        yield: {
          typical: "3-7 t/ha (1.2-2.8 t/acre)"
        }
      },
      economics: {
        marketPrice: "₹18-25/kg",
        costOfCultivation: "₹35,000/ha",
        profitMargin: "30%"
      }
    }
  },

  pulses: {
  },

  vegetables: {
    rootTuber: {
      potato: {
        name: "Potato",
        scientificName: "Solanum tuberosum",
        localNames: ["Alu", "Batata"],
        category: "Vegetable - Root & Tuber",
        seasons: ["rabi", "kharif"],
        idealClimate: {
          temperature: "15-20°C optimal for tuber formation",
          idealTemp: "18-22°C",
          humidity: "Moderate",
          rainfall: "500-700 mm",
          sunlight: "Full sun"
        },
        soil: {
          types: ["Well-drained loamy soil"],
          pH: "5.5-6.5",
          drainage: "Good (avoid waterlogging)",
          organicMatter: "High"
        },
        landPreparation: {
          steps: [
            "Deep ploughing, remove stones",
            "Raise ridges 60 cm apart",
            "Incorporate 10-15 t/ha FYM/compost"
          ]
        },
        planting: {
          seedRate: "2.5-3.5 t/ha of certified seed tubers",
          spacing: "60 cm × 20-25 cm",
          depth: "7-10 cm",
          method: "Cut into 50-60 g pieces with at least one eye"
        },
        nutrients: {
          nitrogen: "100-150 kg/ha",
          phosphorus: "60-80 kg/ha",
          potassium: "120-150 kg/ha (split doses)",
          organicManure: "10-15 t/ha FYM",
          micronutrients: "As needed"
        },
        irrigation: {
          method: "Frequent shallow irrigation",
          requirement: "Maintain 70-80% field capacity",
          criticalStages: ["Tuber initiation", "Tuber development"],
          avoid: "Avoid excess water during maturity"
        },
        weeding: {
          frequency: "2-3 mechanical/hand weedings",
          methods: ["Hilling improves aeration and tuber formation"]
        },
        pests: [
          {
            name: "Potato Tuber Moth",
            symptoms: ["Tunneling in tubers", "Larval damage"],
            organicControl: ["Pheromone traps", "Neem"],
            chemicalControl: ["Chlorantraniliprole", "Spinosad"]
          },
          {
            name: "Aphids",
            symptoms: ["Curling leaves", "Virus transmission"],
            organicControl: ["Neem oil", "Ladybird beetles"],
            chemicalControl: ["Imidacloprid", "Acetamiprid"]
          }
        ],
        diseases: [
          {
            name: "Late Blight",
            symptoms: ["Water-soaked lesions", "White mold", "Tuber rot"],
            organicControl: ["Copper-based fungicides", "Resistant varieties"],
            chemicalControl: ["Mancozeb", "Metalaxyl", "Cymoxanil"],
            threshold: "First appearance"
          }
        ],
        harvest: {
          maturity: "75-120 days depending on variety",
          indicators: [
            "Foliage yellows",
            "Skin sets (doesn't rub off)",
            "Tubers reach desired size"
          ],
          method: "Manual digging or mechanical harvester",
          yield: {
            typical: "20-30 t/ha (8.1-12.1 t/acre)"
          }
        },
        postHarvest: [
          "Cure at 15-20°C for 10-14 days",
          "Store at 4-8°C with 85-90% humidity",
          "Avoid exposure to light (greening)"
        ],
        economics: {
          marketPrice: "₹15-25/kg",
          costOfCultivation: "₹80,000/ha",
          profitMargin: "25%"
        }
      },
      sweetPotato: {
        name: "Sweet Potato",
        scientificName: "Ipomoea batatas",
        localNames: ["Shakarkandi"],
        category: "Vegetable - Root & Tuber",
        seasons: ["kharif", "rabi"],
        idealClimate: {
          temperature: "21-26°C",
          idealTemp: "24°C",
          humidity: "Moderate",
          rainfall: "750-1000 mm",
          sunlight: "Full sun"
        },
        soil: {
          types: ["Sandy loam", "Well-drained"],
          pH: "5.5-6.5",
          drainage: "Good",
          organicMatter: "Medium"
        },
        planting: {
          seedRate: "15,000-20,000 cuttings/ha",
          spacing: "60 cm × 30 cm",
          depth: "5-7 cm",
          method: "Each cutting 20-25 cm long"
        },
        nutrients: {
          nitrogen: "Low N",
          phosphorus: "50-60 kg/ha",
          potassium: "80-100 kg/ha",
          organicManure: "5-10 t/ha FYM"
        },
        irrigation: {
          method: "Moderate, especially during root initiation",
          avoid: "Avoid waterlogging"
        },
        harvest: {
          maturity: "90-150 days",
          indicators: ["Leaves yellowing", "Roots mature"],
          method: "Carefully lift roots to avoid damage",
          yield: {
            typical: "15-25 t/ha (6.1-10.1 t/acre)"
          }
        },
        economics: {
          marketPrice: "₹20-35/kg",
          costOfCultivation: "₹50,000/ha",
          profitMargin: "30%"
        }
      }
    },
    leafy: {
      spinach: {
        name: "Spinach (Palak)",
        scientificName: "Spinacia oleracea",
        localNames: ["Palak"],
        category: "Vegetable - Leafy",
        seasons: ["rabi", "kharif"],
        idealClimate: {
          temperature: "10-25°C",
          idealTemp: "15-20°C",
          humidity: "Moderate",
          rainfall: "400-600 mm",
          sunlight: "Partial shade to full sun"
        },
        soil: {
          types: ["Loamy", "Well-drained"],
          pH: "6-7",
          drainage: "Good",
          organicMatter: "High"
        },
        planting: {
          seedRate: "8-10 kg/ha",
          spacing: "20-30 cm rows",
          depth: "1-2 cm",
          method: "Direct sowing"
        },
        nutrients: {
          nitrogen: "60-80 kg/ha",
          phosphorus: "20-30 kg/ha",
          potassium: "20-30 kg/ha",
          organicManure: "2-3 t/ha compost"
        },
        irrigation: {
          method: "Frequent shallow irrigation",
          requirement: "Keep soil moist for tender leaves"
        },
        pests: [
          {
            name: "Aphids",
            symptoms: ["Curling leaves", "Stunted growth"],
            organicControl: ["Neem oil", "Soap solution"],
            chemicalControl: ["Imidacloprid"]
          }
        ],
        diseases: [
          {
            name: "Downy Mildew",
            symptoms: ["Yellow spots", "White mold"],
            organicControl: ["Copper fungicides", "Good air circulation"],
            chemicalControl: ["Mancozeb", "Metalaxyl"]
          }
        ],
        harvest: {
          maturity: "25-35 days",
          method: "Pick outer leaves; continuous harvesting possible",
          yield: {
            typical: "15-25 t/ha"
          }
        },
        economics: {
          marketPrice: "₹20-40/kg",
          costOfCultivation: "₹30,000/ha",
          profitMargin: "40%"
        }
      }
    },
    fruit: {
      tomato: {
        name: "Tomato",
        scientificName: "Solanum lycopersicum",
        localNames: ["Tamatar"],
        category: "Vegetable - Fruit",
        seasons: ["kharif", "rabi", "zaid"],
        idealClimate: {
          temperature: "20-30°C",
          idealTemp: "20-27°C",
          humidity: "60-80%",
          rainfall: "600-1000 mm",
          sunlight: "6 hours/day",
          note: "Frost-sensitive"
        },
        soil: {
          types: ["Well-drained loamy", "Sandy loam"],
          pH: "6-7",
          drainage: "Good",
          organicMatter: "High"
        },
        landPreparation: {
          steps: [
            "Deep ploughing",
            "Raise ridges 60 cm apart",
            "FYM 10 t/ha"
          ]
        },
        planting: {
          seedRate: "100-150 g/ha",
          spacing: "50 × 50 cm",
          depth: "0.5 cm",
          method: "Transplanting (seedling raised in nursery 4-6 weeks)"
        },
        nutrients: {
          nitrogen: "120-150 kg/ha",
          phosphorus: "60-80 kg/ha",
          potassium: "80-100 kg/ha",
          organicManure: "10 t/ha FYM",
          splitting: "Split doses"
        },
        irrigation: {
          method: "Regular, avoid water stress; drip irrigation recommended"
        },
        weeding: {
          frequency: "Early weeding",
          methods: ["Staking or trellising recommended"]
        },
        pests: [
          {
            name: "Fruit Borer",
            symptoms: ["Holes in fruits", "Larval damage"],
            organicControl: ["Pheromone traps", "Neem"],
            chemicalControl: ["Emamectin benzoate", "Spinosad"]
          },
          {
            name: "Aphids",
            symptoms: ["Curling leaves", "Virus transmission"],
            organicControl: ["Neem oil", "Biological control"],
            chemicalControl: ["Imidacloprid"]
          }
        ],
        diseases: [
          {
            name: "Bacterial Wilt",
            symptoms: ["Sudden wilting", "Brown vascular tissue"],
            organicControl: ["Resistant varieties", "Crop rotation"],
            chemicalControl: ["Streptocycline"]
          },
          {
            name: "Late Blight",
            symptoms: ["Water-soaked lesions", "White mold", "Fruit rot"],
            organicControl: ["Copper fungicides"],
            chemicalControl: ["Mancozeb", "Metalaxyl", "Cymoxanil"]
          }
        ],
        harvest: {
          maturity: "75-90 days after transplanting",
          indicators: ["Pick mature red fruits"],
          method: "Hand picking",
          yield: {
            typical: "40-60 t/ha"
          }
        },
        economics: {
          marketPrice: "₹15-40/kg",
          costOfCultivation: "₹1,20,000/ha",
          profitMargin: "35%"
        }
      },
      brinjal: {
        name: "Brinjal (Eggplant)",
        scientificName: "Solanum melongena",
        localNames: ["Baingan"],
        category: "Vegetable - Fruit",
        seasons: ["kharif", "rabi"],
        idealClimate: {
          temperature: "25-30°C",
          idealTemp: "27°C",
          humidity: "Moderate",
          rainfall: "600-800 mm",
          sunlight: "Full sun"
        },
        soil: {
          types: ["Well-drained loam"],
          pH: "6-7",
          drainage: "Good",
          organicMatter: "High"
        },
        planting: {
          seedRate: "200-300 g/ha",
          spacing: "60 × 60 cm",
          method: "Raise seedlings 6-8 weeks; transplant"
        },
        nutrients: {
          nitrogen: "120 kg/ha",
          phosphorus: "50 kg/ha",
          potassium: "80 kg/ha",
          organicManure: "10 t/ha FYM"
        },
        irrigation: {
          method: "Frequent, maintain soil moisture; avoid waterlogging"
        },
        pests: [
          {
            name: "Shoot and Fruit Borer",
            symptoms: ["Holes in fruits", "Wilted shoots"],
            organicControl: ["Pheromone traps", "Neem-based sprays"],
            chemicalControl: ["Emamectin benzoate", "Spinosad"]
          }
        ],
        diseases: [
          {
            name: "Wilt",
            symptoms: ["Yellowing", "Wilting"],
            organicControl: ["Resistant varieties", "Crop rotation"],
            chemicalControl: ["Carbendazim"]
          }
        ],
        harvest: {
          maturity: "70-90 days",
          indicators: ["Fruits shiny, firm; pick regularly"],
          yield: {
            typical: "20-30 t/ha"
          }
        },
        economics: {
          marketPrice: "₹20-35/kg",
          costOfCultivation: "₹80,000/ha",
          profitMargin: "30%"
        }
      }
    }
  },

  fruits: {
    banana: {
      name: "Banana",
      scientificName: "Musa spp.",
      localNames: ["Kela"],
      category: "Fruit",
      seasons: ["year_round"],
      idealClimate: {
        temperature: "26-30°C",
        idealTemp: "27°C",
        humidity: "High",
        rainfall: "1500-2000 mm",
        sunlight: "Full sun",
        note: "Sensitive to frost"
      },
      soil: {
        types: ["Deep, fertile, well-drained loam"],
        pH: "5.5-7.0",
        drainage: "Good",
        organicMatter: "High"
      },
      planting: {
        material: "Suckers / tissue-cultured plantlets",
        spacing: "2-3 m × 2-3 m",
        method: "Raised beds or pits; add 20-30 kg compost + 300 g NPK per pit"
      },
      nutrients: {
        nitrogen: "150-200 g per plant per year",
        phosphorus: "50-60 g per plant per year",
        potassium: "200-250 g per plant per year",
        organicManure: "Split doses",
        method: "Apply in circular band around plant"
      },
      irrigation: {
        method: "Frequent; maintain soil moisture; drip irrigation recommended"
      },
      weeding: {
        frequency: "Mulching and hand weeding",
        methods: ["Remove weeds near base"]
      },
      pests: [
        {
          name: "Banana Borer",
          symptoms: ["Tunneling in pseudostem"],
          organicControl: ["Biological control", "Sanitation"],
          chemicalControl: ["Carbofuran", "Chlorpyrifos"]
        }
      ],
      diseases: [
        {
          name: "Panama Disease",
          symptoms: ["Yellowing", "Wilting", "Death"],
          organicControl: ["Resistant varieties", "Crop rotation"],
          chemicalControl: ["No effective chemical control"]
        },
        {
          name: "Sigatoka Leaf Spot",
          symptoms: ["Brown spots on leaves"],
          organicControl: ["Resistant varieties"],
          chemicalControl: ["Mancozeb", "Propiconazole"]
        }
      ],
      harvest: {
        maturity: "9-12 months after planting",
        indicators: [
          "Bunches mature when fingers are full-sized but green",
          "Fingers start to fill out"
        ],
        method: "Cut entire bunch",
        yield: {
          typical: "30-40 t/ha"
        }
      },
      economics: {
        marketPrice: "₹15-30/kg",
        costOfCultivation: "₹2,00,000/ha",
        profitMargin: "40%"
      }
    },
    mango: {
      name: "Mango",
      scientificName: "Mangifera indica",
      localNames: ["Aam"],
      category: "Fruit",
      seasons: ["year_round"],
      idealClimate: {
        temperature: "24-30°C",
        idealTemp: "27°C",
        humidity: "Moderate",
        rainfall: "1000-1500 mm",
        sunlight: "Full sun",
        note: "Dry weather during flowering"
      },
      soil: {
        types: ["Deep, well-drained loam"],
        pH: "5.5-7.5",
        drainage: "Good",
        organicMatter: "Medium to High"
      },
      planting: {
        material: "Grafted saplings or air-layered plants",
        spacing: "8-10 m × 8-10 m",
        method: "Pits 1 m³; fill with FYM + compost"
      },
      nutrients: {
        nitrogen: "200-300 g per tree annually",
        phosphorus: "100-150 g per tree annually",
        potassium: "200-250 g per tree annually",
        organicManure: "Split doses",
        method: "Apply in circular band around tree"
      },
      irrigation: {
        method: "Frequent in first 2 years; reduced once established"
      },
      weeding: {
        frequency: "Mulching; prevent weed competition",
        methods: ["Light pruning"]
      },
      pests: [
        {
          name: "Mango Hoppers",
          symptoms: ["Sooty mold", "Honeydew"],
          organicControl: ["Neem/biopesticides"],
          chemicalControl: ["Imidacloprid", "Thiamethoxam"]
        },
        {
          name: "Fruit Fly",
          symptoms: ["Maggots in fruits"],
          organicControl: ["Bagging fruits", "Traps"],
          chemicalControl: ["Spinosad", "Malathion"]
        }
      ],
      diseases: [
        {
          name: "Powdery Mildew",
          symptoms: ["White powdery coating", "Fruit drop"],
          organicControl: ["Sulfur dust", "Neem oil"],
          chemicalControl: ["Tebuconazole", "Myclobutanil"]
        },
        {
          name: "Anthracnose",
          symptoms: ["Black spots", "Fruit rot"],
          organicControl: ["Copper fungicides"],
          chemicalControl: ["Carbendazim", "Mancozeb"]
        }
      ],
      harvest: {
        maturity: "3-5 years after planting",
        indicators: [
          "Mature fruits harvested when color and aroma develop",
          "Fruits change color"
        ],
        method: "Hand picking",
        yield: {
          typical: "8-12 t/ha"
        }
      },
      economics: {
        marketPrice: "₹30-80/kg",
        costOfCultivation: "₹3,00,000/ha",
        profitMargin: "50%"
      }
    }
  },

  oilseeds: {
    groundnut: {
      name: "Groundnut (Peanut)",
      scientificName: "Arachis hypogaea",
      localNames: ["Moongphali"],
      category: "Oilseed",
      seasons: ["kharif", "rabi"],
      idealClimate: {
        temperature: "25-35°C",
        idealTemp: "30°C",
        humidity: "Moderate",
        rainfall: "50-75 cm",
        sunlight: "Full sun"
      },
      soil: {
        types: ["Sandy loam", "Well-drained"],
        pH: "6-7",
        drainage: "Good",
        organicMatter: "Medium"
      },
      landPreparation: {
        steps: [
          "Deep ploughing",
          "Fine tilth",
          "Add 10-15 t/ha FYM"
        ]
      },
      planting: {
        seedRate: "80-100 kg/ha",
        spacing: "30 × 10 cm",
        depth: "5 cm",
        method: "Direct sowing"
      },
      nutrients: {
        nitrogen: "20-25 kg/ha",
        phosphorus: "40-50 kg/ha",
        potassium: "20-25 kg/ha",
        organicManure: "Basal application",
        note: "Legume - fixes N"
      },
      irrigation: {
        method: "Critical at pegging and flowering; avoid waterlogging"
      },
      weeding: {
        frequency: "Hand weeding 2-3 times",
        methods: ["Mulch recommended"]
      },
      pests: [
        {
          name: "Aphids",
          symptoms: ["Curling leaves", "Virus transmission"],
          organicControl: ["Neem oil"],
          chemicalControl: ["Imidacloprid"]
        }
      ],
      diseases: [
        {
          name: "Rust",
          symptoms: ["Orange pustules", "Leaf drop"],
          organicControl: ["Resistant varieties"],
          chemicalControl: ["Mancozeb", "Propiconazole"]
        },
        {
          name: "Leaf Spot",
          symptoms: ["Brown spots", "Defoliation"],
          organicControl: ["Crop rotation"],
          chemicalControl: ["Chlorothalonil"]
        }
      ],
      harvest: {
        maturity: "110-130 days",
        indicators: [
          "When leaves turn yellow",
          "Pods mature"
        ],
        method: "Dig plants, sun-dry pods",
        yield: {
          typical: "2-3 t/ha"
        }
      },
      economics: {
        marketPrice: "₹60-80/kg",
        costOfCultivation: "₹40,000/ha",
        profitMargin: "35%"
      }
    },
    mustard: {
      name: "Mustard / Rapeseed",
      scientificName: "Brassica juncea / Brassica napus",
      localNames: ["Sarson", "Rai"],
      category: "Oilseed",
      seasons: ["rabi"],
      idealClimate: {
        temperature: "10-25°C",
        idealTemp: "15-20°C",
        humidity: "Moderate",
        rainfall: "Light rainfall",
        sunlight: "Full sun"
      },
      soil: {
        types: ["Loamy"],
        pH: "6-7.5",
        drainage: "Well-drained",
        organicMatter: "Medium"
      },
      planting: {
        seedRate: "4-5 kg/ha",
        spacing: "30 cm rows",
        depth: "2-3 cm",
        method: "Direct sowing"
      },
      nutrients: {
        nitrogen: "40-50 kg/ha",
        phosphorus: "20-30 kg/ha",
        potassium: "20-30 kg/ha",
        organicManure: "10-15 t/ha FYM"
      },
      irrigation: {
        method: "Light irrigation during flowering; avoid waterlogging"
      },
      weeding: {
        frequency: "Hand weeding 1-2 times"
      },
      pests: [
        {
          name: "Aphids",
          symptoms: ["Curling leaves", "Honeydew"],
          organicControl: ["Neem oil"],
          chemicalControl: ["Imidacloprid"]
        }
      ],
      diseases: [
        {
          name: "White Rust",
          symptoms: ["White pustules", "Distorted growth"],
          organicControl: ["Resistant varieties"],
          chemicalControl: ["Mancozeb", "Metalaxyl"]
        },
        {
          name: "Alternaria Blight",
          symptoms: ["Brown spots", "Defoliation"],
          organicControl: ["Crop rotation"],
          chemicalControl: ["Chlorothalonil"]
        }
      ],
      harvest: {
        maturity: "90-120 days",
        indicators: [
          "Pods brown",
          "Seeds hard"
        ],
        method: "Cutting or threshing",
        yield: {
          typical: "1.0-1.5 t/ha"
        }
      },
      economics: {
        marketPrice: "₹50-70/kg",
        costOfCultivation: "₹30,000/ha",
        profitMargin: "40%"
      }
    }
  },

  spices: {
    turmeric: {
      name: "Turmeric",
      scientificName: "Curcuma longa",
      localNames: ["Haldi"],
      category: "Spice",
      seasons: ["kharif"],
      idealClimate: {
        temperature: "20-30°C",
        idealTemp: "25°C",
        humidity: "High",
        rainfall: "1500-2000 mm",
        sunlight: "Partial shade"
      },
      soil: {
        types: ["Well-drained loam"],
        pH: "5.5-7",
        drainage: "Good",
        organicMatter: "High"
      },
      landPreparation: {
        steps: [
          "Deep ploughing",
          "Raised beds",
          "25-30 t/ha FYM"
        ]
      },
      planting: {
        material: "Rhizomes",
        spacing: "30 × 20 cm",
        method: "Plant healthy rhizomes"
      },
      nutrients: {
        nitrogen: "100 kg/ha",
        phosphorus: "50-60 kg/ha",
        potassium: "100 kg/ha",
        organicManure: "Split doses"
      },
      irrigation: {
        method: "Frequent; maintain soil moisture; avoid waterlogging"
      },
      weeding: {
        frequency: "2-3 hand weedings",
        methods: ["Mulching recommended"]
      },
      pests: [
        {
          name: "Shoot Borer",
          symptoms: ["Wilted shoots"],
          organicControl: ["Neem sprays"],
          chemicalControl: ["Chlorantraniliprole"]
        }
      ],
      diseases: [
        {
          name: "Rhizome Rot",
          symptoms: ["Soft rot", "Foul smell"],
          organicControl: ["Fungicide treatment of rhizomes"],
          chemicalControl: ["Carbendazim", "Metalaxyl"]
        }
      ],
      harvest: {
        maturity: "7-9 months",
        indicators: [
          "Leaves yellow",
          "Rhizomes mature"
        ],
        method: "Dig rhizomes carefully",
        yield: {
          typical: "20-25 t/ha (green rhizomes)"
        }
      },
      economics: {
        marketPrice: "₹80-120/kg",
        costOfCultivation: "₹1,50,000/ha",
        profitMargin: "45%"
      }
    },
    redChilli: {
      name: "Red Chilli",
      scientificName: "Capsicum annuum",
      localNames: ["Lal Mirch"],
      category: "Spice",
      seasons: ["kharif", "rabi"],
      idealClimate: {
        temperature: "20-30°C",
        idealTemp: "25°C",
        humidity: "Moderate",
        rainfall: "600-800 mm",
        sunlight: "Full sun",
        note: "Frost-free"
      },
      soil: {
        types: ["Sandy loam"],
        pH: "6-7",
        drainage: "Good",
        organicMatter: "Medium"
      },
      planting: {
        seedRate: "0.5-1 kg/ha",
        spacing: "30-45 cm",
        method: "Transplant seedlings 30-45 cm apart"
      },
      nutrients: {
        nitrogen: "100 kg/ha",
        phosphorus: "50 kg/ha",
        potassium: "50-60 kg/ha",
        organicManure: "5-10 t/ha FYM"
      },
      irrigation: {
        method: "Frequent; avoid water stress; drip irrigation improves yield"
      },
      weeding: {
        frequency: "Hand weeding",
        methods: ["Mulch recommended"]
      },
      pests: [
        {
          name: "Aphids",
          symptoms: ["Curling leaves"],
          organicControl: ["Neem sprays"],
          chemicalControl: ["Imidacloprid"]
        },
        {
          name: "Fruit Borer",
          symptoms: ["Holes in fruits"],
          organicControl: ["Pheromone traps"],
          chemicalControl: ["Emamectin benzoate"]
        }
      ],
      diseases: [
        {
          name: "Powdery Mildew",
          symptoms: ["White powdery coating"],
          organicControl: ["Sulfur dust"],
          chemicalControl: ["Tebuconazole"]
        }
      ],
      harvest: {
        maturity: "90-120 days after transplanting",
        indicators: ["Pick ripe red fruits"],
        method: "Hand picking",
        yield: {
          typical: "2-3 t/ha dried chilli"
        }
      },
      economics: {
        marketPrice: "₹150-250/kg",
        costOfCultivation: "₹80,000/ha",
        profitMargin: "50%"
      }
    }
  },

  getCropInfo: function(cropName) {
    const normalizedName = cropName.toLowerCase().replace(/\s+/g, '');
    
    for (const category in this) {
      if (category === 'getCropInfo' || category === 'searchCrops' || category === 'getAllCrops') continue;
      if (typeof this[category] === 'object') {
        for (const cropKey in this[category]) {
          const crop = this[category][cropKey];
          if (crop.name && crop.name.toLowerCase().replace(/\s+/g, '') === normalizedName) {
            return crop;
          }
          if (cropKey.toLowerCase().replace(/\s+/g, '') === normalizedName) {
            return crop;
          }
          if (crop.localNames) {
            for (const localName of crop.localNames) {
              if (localName.toLowerCase().replace(/\s+/g, '') === normalizedName) {
                return crop;
              }
            }
          }
        }
      }
    }
    return null;
  },

  searchCrops: function(query) {
    const results = [];
    const normalizedQuery = query.toLowerCase();
    
    for (const category in this) {
      if (category === 'getCropInfo' || category === 'searchCrops' || category === 'getAllCrops') continue;
      if (typeof this[category] === 'object') {
        for (const cropKey in this[category]) {
          const crop = this[category][cropKey];
          if (crop.name && (
            crop.name.toLowerCase().includes(normalizedQuery) ||
            crop.scientificName?.toLowerCase().includes(normalizedQuery) ||
            crop.category?.toLowerCase().includes(normalizedQuery) ||
            crop.idealClimate?.temperature?.toLowerCase().includes(normalizedQuery) ||
            (crop.localNames && crop.localNames.some(name => name.toLowerCase().includes(normalizedQuery)))
          )) {
            results.push(crop);
          }
        }
      }
    }
    return results;
  },

  getAllCrops: function() {
    const allCrops = [];
    for (const category in this) {
      if (category === 'getCropInfo' || category === 'searchCrops' || category === 'getAllCrops') continue;
      if (typeof this[category] === 'object') {
        for (const cropKey in this[category]) {
          if (this[category][cropKey].name) {
            allCrops.push(this[category][cropKey]);
          }
        }
      }
    }
    return allCrops;
  }
};

module.exports = cropDatabase;













