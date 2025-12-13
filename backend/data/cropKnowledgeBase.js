
const cropKnowledgeBase = {
  cereals: {
    rice: {
      name: "Rice (Paddy)",
      category: "Cereal",
      idealClimate: {
        temperature: "20-35°C",
        humidity: "Warm, humid",
        rainfall: "120-150 days depending on variety",
        season: "Kharif (monsoon)"
      },
      soil: {
        type: "Clayey to silty loams with good water-retention",
        pH: "5.5-7.0",
        drainage: "Requires water retention"
      },
      landPreparation: {
        steps: [
          "2-3 ploughings",
          "Puddling for transplanted rice",
          "Level the field for even water",
          "Incorporate 10-15 t/ha FYM if available"
        ]
      },
      seedRate: {
        nursery: "20-25 kg/ha seed for 25-30 day-old seedlings",
        directSeeding: "60-80 kg/ha (DSR)",
        spacing: "20×20 cm for transplanted rice"
      },
      nutrientSchedule: {
        nitrogen: "Split: 1/3 basal (or at transplant), 1/3 at tillering, 1/3 at panicle initiation",
        phosphorus: "Base P as per soil test",
        potassium: "Base K as per soil test",
        micronutrients: "Apply Zn if deficient"
      },
      irrigation: {
        method: "Continuous ponding for traditional puddled rice",
        alternatives: "Alternate wetting and drying (AWD) or SRI practices use intermittent flooding—saves water",
        criticalStages: "Keep field moist during tillering and reproductive stage"
      },
      weeding: {
        frequency: "1-2 weedings",
        methods: "Use pre-emergent herbicides; manual weeding in smallholders"
      },
      pests: ["Brown planthopper", "Leaf folder", "Stem borer"],
      diseases: ["Rice blast", "Bacterial blight"],
      treatment: {
        ipm: [
          "Resistant varieties",
          "Seed treatment with Trichoderma/carbendazim for fungal control",
          "Pheromone traps and parasitoids for borers",
          "Azoxystrobin/tebuconazole for blast (follow labels & PHI)",
          "Avoid prophylactic sprays—use thresholds"
        ]
      },
      harvest: {
        indicators: "Grains hard, panicles golden",
        timing: "Harvest when grain moisture ~20% then dry to 14%",
        maturity: "120-150 days"
      },
      yield: {
        rainfed: "3-6 t/ha (≈1.2-2.4 t/acre)",
        irrigated: "4-8 t/ha (≈1.6-3.2 t/acre) in high-yield areas"
      }
    },
    wheat: {
      name: "Wheat",
      category: "Cereal",
      idealClimate: {
        temperature: "10-25°C during vegetative growth",
        condition: "Cool, temperate during vegetative growth; dry, sunny harvest",
        season: "Rabi (winter)"
      },
      soil: {
        type: "Well-drained loamy soils",
        pH: "6.0-7.5"
      },
      landPreparation: {
        steps: [
          "Deep ploughing after previous crop residues",
          "Level the seedbed",
          "Incorporate organic matter"
        ]
      },
      seedRate: {
        broadcast: "100-125 kg/ha",
        drill: "80-100 kg/ha with drill",
        spacing: "~20-22 cm row spacing",
        sowingWindow: "Oct-Dec (region-dependent)"
      },
      nutrientSchedule: {
        nitrogen: "2-3 splits (at sowing/tillering/booting)",
        phosphorus: "Basal P",
        potassium: "Basal K",
        micronutrients: "Apply S and Zn if soil deficient"
      },
      irrigation: {
        frequency: "3-5 irrigations typical",
        criticalStages: "Crown root initiation, heading, and grain filling"
      },
      weeding: {
        frequency: "1-2 mechanical/chemical weedings",
        methods: "Timely earthing-up in some systems"
      },
      pests: ["Aphids"],
      diseases: ["Rusts (leaf, stem, stripe)", "Fusarium (head blight)"],
      treatment: {
        ipm: [
          "Use rust-resistant varieties",
          "Fungicide spray at first rust sign (triazoles/strobilurins per label)",
          "Seed treatment (carbendazim or Trichoderma) to reduce seed-borne pathogens",
          "Monitor aphids and use selective insecticides/biocontrol"
        ]
      },
      harvest: {
        indicators: "Ears turn golden and grains hard",
        timing: "Harvest when grain moisture ~12-14%",
        maturity: "~140-160 days (depending on sowing)"
      },
      yield: {
        typical: "2.5-4.5 t/ha (≈1.0-1.8 t/acre)",
        highInput: "5-7 t/ha (≈2.0-2.8 t/acre)"
      }
    },
    maize: {
      name: "Maize (Corn)",
      category: "Cereal",
      idealClimate: {
        temperature: "18-30°C optimum",
        season: "Warm season crop"
      },
      soil: {
        type: "Well-drained loams",
        pH: "5.5-7.5"
      },
      landPreparation: {
        steps: [
          "Plough + level",
          "Incorporate compost/FYM",
          "Create ridges for row planting in heavy soils"
        ]
      },
      seedRate: {
        grain: "20-30 kg/ha for pure grain maize",
        spacing: "60-75 cm × 20-25 cm",
        depth: "4-6 cm"
      },
      nutrientSchedule: {
        nitrogen: "High N demand — basal P & K; sidedress N at V6 (knee-high) and possibly at tassel initiation",
        method: "Split fertilizer recommended"
      },
      irrigation: {
        criticalStages: "Critical at tasseling and grain filling",
        requirement: "Keep soil moisture adequate during reproductive stages"
      },
      weeding: {
        frequency: "1-2 weedings mechanically/chemically",
        methods: "Inter-row cultivation if feasible. Mulch for moisture conservation in small farms"
      },
      pests: ["Stem borers", "Fall armyworm", "Maize weevil (storage)"],
      diseases: ["Leaf blights", "Ear rot"],
      treatment: {
        ipm: [
          "Use Bt hybrids where available for stalk/ear borer",
          "Pheromone traps, Trichogramma for borers",
          "Spot insecticide (chlorantraniliprole, emamectin) if threshold exceeded",
          "Post-harvest drying to prevent storage pests and mycotoxins"
        ]
      },
      harvest: {
        grain: "Harvest when kernels reach black layer and moisture ~20% then dry to 12-14%",
        green: "For green maize (sweet), harvest earlier at milk stage",
        maturity: "~90-120 days"
      },
      yield: {
        typical: "3-7 t/ha grain (≈1.2-2.8 t/acre) in India (wide variability)"
      }
    },
    jowar: {
      name: "Jowar (Sorghum)",
      category: "Cereal",
      idealClimate: {
        temperature: "25-35°C ideal",
        condition: "Warm, tolerant to heat and drought"
      },
      soil: {
        type: "Wide adaptability—light to medium loams",
        tolerance: "Tolerates marginal soils"
      },
      seedRate: {
        hybrid: "6-8 kg/ha for hybrid (drill)",
        local: "10-12 kg/ha for local varieties (broadcast)",
        spacing: "45-60 cm row spacing"
      },
      nutrientSchedule: {
        nitrogen: "Moderate N requirement; basal P & K; split N at tillering",
        micronutrients: "Apply micro-nutrients as needed"
      },
      irrigation: {
        requirement: "Drought-tolerant; one or two irrigations at critical stages (flowering/grain filling) improve yield"
      },
      pests: ["Shoot fly", "Stem borer"],
      diseases: ["Grain mold", "Anthracnose"],
      treatment: {
        ipm: [
          "Resistant varieties",
          "Seed treatment with Thiram/Trichoderma",
          "Avoid late-season moisture to reduce grain mold",
          "Use biocontrol/spot insecticide for borers"
        ]
      },
      harvest: {
        indicators: "Panicles mature and grains hard",
        timing: "Harvest when dry",
        maturity: "~90-120 days depending on type"
      },
      yield: {
        lowInput: "1-3 t/ha (≈0.4-1.2 t/acre)",
        hybrid: "3-6 t/ha possible"
      }
    },
    bajra: {
      name: "Bajra (Pearl Millet)",
      category: "Cereal",
      idealClimate: {
        temperature: "30-40°C",
        condition: "Hot, hardy; thrives in low rainfall"
      },
      soil: {
        type: "Light to medium soils",
        tolerance: "Tolerates poor soils and salinity to some extent"
      },
      seedRate: {
        hybrid: "3-6 kg/ha for hybrids (drill)",
        local: "8-10 kg/ha broadcast for local types",
        spacing: "45-75 cm row spacing"
      },
      nutrientSchedule: {
        nitrogen: "Low to moderate N requirement",
        phosphorus: "Basal P, K as per soil test",
        sulfur: "S sometimes beneficial"
      },
      irrigation: {
        requirement: "Drought-tolerant — mostly rainfed; irrigation during grain filling boosts yield"
      },
      pests: ["Stem borer", "Head miner"],
      diseases: ["Downy mildew", "Blast"],
      treatment: {
        ipm: [
          "Resistant and tolerant hybrids",
          "Seed treatment with fungicide",
          "Use Trichoderma or neem for pests",
          "Timely sowing to avoid peak pest windows"
        ]
      },
      harvest: {
        indicators: "Panicles dry and seeds hard",
        timing: "Harvest when fully mature",
        maturity: "70-110 days"
      },
      yield: {
        typical: "1-2.5 t/ha (≈0.4-1.0 t/acre)",
        hybrid: "Hybrids can give higher yields"
      }
    },
    ragi: {
      name: "Ragi (Finger Millet)",
      category: "Cereal",
      idealClimate: {
        temperature: "20-30°C optimum",
        condition: "Warm temperate to tropical. Tolerant to erratic rainfall"
      },
      soil: {
        type: "Well-drained loam to red soils",
        pH: "5.0-7.0"
      },
      seedRate: {
        drill: "5-7 kg/ha (drill)",
        broadcast: "Broadcast higher",
        spacing: "30-45 cm",
        depth: "Shallow planting depth"
      },
      nutrientSchedule: {
        requirement: "Low nutrient requirement",
        nitrogen: "Small doses of N",
        phosphorus: "Basal P & K",
        organic: "FYM or compost recommended"
      },
      irrigation: {
        requirement: "Mostly rainfed; light irrigation at tillering and panicle initiation increases yield"
      },
      pests: ["Shoot fly"],
      diseases: ["Blast", "Ergot"],
      treatment: {
        ipm: [
          "Use resistant varieties",
          "Seed treatment with Trichoderma",
          "Remove infected plants",
          "Spot fungicides if severe (follow label & PHI)"
        ]
      },
      harvest: {
        indicators: "Panicles mature and stiff",
        timing: "Harvest when grains attain full hardness",
        maturity: "90-120 days"
      },
      yield: {
        typical: "1-2.5 t/ha (≈0.4-1.0 t/acre) depending on input level"
      }
    },
    barley: {
      name: "Barley",
      category: "Cereal",
      idealClimate: {
        temperature: "10-25°C for growth",
        condition: "Cool-season cereal"
      },
      soil: {
        type: "Well-drained loams",
        pH: "6.0-7.5"
      },
      seedRate: {
        drill: "80-120 kg/ha (drill)",
        spacing: "20 cm row spacing",
        season: "Sowing in rabi (winter) in many Indian zones"
      },
      nutrientSchedule: {
        nitrogen: "Moderate N (split applications)",
        phosphorus: "Basal P & K",
        sulfur: "S may improve protein in malting barley"
      },
      irrigation: {
        frequency: "2-4 irrigations depending on rainfall",
        sensitivity: "Sensitive to waterlogging"
      },
      pests: [],
      diseases: ["Powdery mildew", "Loose smut", "Barley yellow dwarf virus"],
      treatment: {
        ipm: [
          "Seed treatment for smut",
          "Fungicide sprays (triazoles) for powdery mildew",
          "Use certified seed and crop hygiene"
        ]
      },
      harvest: {
        indicators: "Heads golden, grains hard",
        timing: "Harvest when moisture suitable for storage",
        maturity: "~100-120 days"
      },
      yield: {
        typical: "2-4 t/ha (≈0.8-1.6 t/acre) in India"
      }
    },
    oats: {
      name: "Oats",
      category: "Cereal",
      idealClimate: {
        temperature: "12-25°C for optimal growth",
        condition: "Cool, temperate"
      },
      soil: {
        type: "Fertile, well-drained loams",
        pH: "6.0-7.0 preferred"
      },
      seedRate: {
        broadcast: "80-120 kg/ha (broadcast/drill)",
        spacing: "Similar to barley/wheat",
        season: "Sow in rabi or kharif depending on region & fodder need"
      },
      nutrientSchedule: {
        nitrogen: "Moderate N & P",
        potassium: "K as per soil test",
        organic: "Oats respond well to organic manures"
      },
      irrigation: {
        requirement: "Usually rainfed; supplemental irrigation during dry spells improves yields"
      },
      pests: ["Aphids"],
      diseases: ["Crown rust", "Loose smut"],
      treatment: {
        ipm: [
          "Use resistant varieties",
          "Seed treatment",
          "Fungicides on severe rust outbreaks"
        ]
      },
      harvest: {
        timing: "When seed moisture appropriate for threshing",
        maturity: "~100-120 days"
      },
      yield: {
        grain: "2-4 t/ha",
        fodder: "Fodder/green matter yields can be much higher when cut multiple times"
      }
    },
    littleMillet: {
      name: "Little Millet (Kutki)",
      category: "Cereal",
      idealClimate: {
        temperature: "20-30°C",
        condition: "Drought-prone areas; tolerant to heat and low rainfall"
      },
      soil: {
        type: "Well-drained, light soils",
        tolerance: "Grows on shallow soils"
      },
      seedRate: {
        broadcast: "5-8 kg/ha (broadcast)",
        spacing: "Variable",
        depth: "Sow shallow"
      },
      nutrientSchedule: {
        requirement: "Low input crop",
        nitrogen: "Small N & P application if possible",
        organic: "Benefits from FYM"
      },
      irrigation: {
        requirement: "Mostly rainfed; supplemental irrigation during grain filling increases yield"
      },
      pests: ["Shootfly"],
      diseases: ["Blast", "Smut"],
      treatment: {
        ipm: [
          "Resistant/locally adapted varieties",
          "Seed treatment",
          "Maintain good plant spacing and hygiene"
        ]
      },
      harvest: {
        indicators: "Panicles mature, seeds hard",
        method: "Cut and dry",
        maturity: "~60-90 days"
      },
      yield: {
        typical: "0.5-1.5 t/ha (≈0.2-0.6 t/acre) depending on inputs"
      }
    },
    foxtailMillet: {
      name: "Foxtail Millet",
      category: "Cereal",
      idealClimate: {
        temperature: "20-30°C",
        condition: "Warm, tolerant to drought"
      },
      soil: {
        type: "Adaptable; well-drained loam to sandy soils"
      },
      seedRate: {
        drill: "4-8 kg/ha (drill)",
        broadcast: "Broadcast higher",
        spacing: "30-45 cm row spacing"
      },
      nutrientSchedule: {
        requirement: "Low to moderate inputs",
        nitrogen: "Small basal N & P",
        organic: "FYM benefits strongly"
      },
      irrigation: {
        requirement: "Mostly rainfed; irrigation during grain filling helps yield"
      },
      pests: ["Head miner"],
      diseases: ["Blast", "Smut"],
      treatment: {
        ipm: [
          "Seed treatment",
          "Use tolerant varieties",
          "Timely harvest to avoid bird damage"
        ]
      },
      harvest: {
        indicators: "Panicles turn golden and seeds hard",
        timing: "Harvest at full maturity",
        maturity: "70-100 days"
      },
      yield: {
        typical: "0.6-1.5 t/ha (≈0.25-0.6 t/acre)"
      }
    }
  },

  pulses: {
    chickpea: {
      name: "Chickpea (Chana)",
      category: "Pulse",
      idealClimate: {
        temperature: "10-25°C",
        condition: "Cool, semi-arid; best in Rabi",
        season: "Rabi (winter)"
      },
      soil: {
        type: "Well-drained loamy soils",
        pH: "6.0-8.0",
        avoid: "Avoid waterlogged soils"
      },
      landPreparation: {
        steps: [
          "Deep plough after previous crop",
          "Break clods, level field",
          "Incorporate 5-10 t/ha FYM/compost if available"
        ]
      },
      seedRate: {
        drill: "50-80 kg/ha (drill)",
        spacing: "30-45 cm row spacing",
        depth: "Sow 4-6 cm deep",
        treatment: "Use certified seed and Rhizobium inoculation"
      },
      nutrientSchedule: {
        nitrogen: "Low N requirement (legume fixes N)",
        phosphorus: "Apply basal P (20-40 kg P₂O₅/ha)",
        potassium: "K as per soil test",
        micronutrients: "Apply S and Zn if deficient",
        organic: "Use 2-3 t/ha FYM where possible"
      },
      irrigation: {
        requirement: "Generally rainfed",
        criticalStages: "1-2 irrigations if dry—at flowering and pod filling stages",
        avoid: "Avoid excess moisture during maturity"
      },
      weeding: {
        frequency: "1-2 weedings (hand/mechanical) during early 30 days",
        methods: "Use mulches or intercrop with cereals in mixed systems"
      },
      pests: ["Pod borer (Helicoverpa)", "Aphids", "Cutworm"],
      diseases: ["Fusarium wilt", "Ascochyta blight", "Root rot"],
      treatment: {
        ipm: [
          "Seed treatment with Trichoderma or fungicides (e.g., Carbendazim) for seed-borne fungus",
          "Rhizobium inoculation for nodulation",
          "For pod borer: pheromone traps/Trichogramma and spot insecticide (chlorantraniliprole or emamectin) only above ET",
          "Use resistant varieties and crop rotation to manage wilt/Ascochyta"
        ]
      },
      harvest: {
        indicators: "Harvest when ~90% pods are brown and brittle",
        method: "Plants pulled and left to dry if necessary. Thresh and sun-dry to safe moisture",
        maturity: "90-120 days depending on season/variety"
      },
      yield: {
        typical: "1.0-2.0 t/ha (0.405-0.809 t/acre)"
      }
    },
    pigeonPea: {
      name: "Pigeon Pea (Arhar / Toor)",
      category: "Pulse",
      idealClimate: {
        temperature: "20-35°C range",
        condition: "Warm to hot; tolerant to drought",
        region: "Best in semi-arid tropics"
      },
      soil: {
        type: "Well-drained loam to red soils",
        pH: "6.0-7.5"
      },
      seedRate: {
        row: "10-15 kg/ha (row sowing)",
        spacing: "60-90 cm × 10-30 cm (commonly 90×30 cm for trees/shrub habit)",
        depth: "Plant ~4-6 cm deep",
        treatment: "Seed inoculation with Rhizobium recommended"
      },
      nutrientSchedule: {
        nitrogen: "Low to moderate N requirement",
        phosphorus: "Apply P 20-40 kg P₂O₅/ha at sowing",
        potassium: "K as per soil test",
        organic: "Organic manures valued"
      },
      irrigation: {
        requirement: "Mostly rainfed",
        benefit: "Supplemental irrigation at flowering and podding improves yields",
        advantage: "Deep rooting reduces water stress"
      },
      pests: ["Pod borers", "Leaf miners", "Helicoverpa"],
      diseases: ["Phytophthora blight", "Sterility mosaic", "Fusarium"],
      treatment: {
        ipm: [
          "Use resistant/tolerant varieties",
          "Seed treatment with Rhizobium",
          "For borers: Trichogramma, pheromone traps, and spot insecticide if above threshold",
          "Maintain plant spacing & sanitation; remove infected plants for mosaic"
        ]
      },
      harvest: {
        indicators: "Harvest when pods dry and seeds rattle",
        method: "Staggered pickings for long-duration varieties; main harvest when most pods brown",
        maturity: "150-200 days (long-duration types) but short-duration hybrids exist (~120 days)"
      },
      yield: {
        typical: "0.8-1.5 t/ha (0.324-0.607 t/acre)"
      }
    },
    greenGram: {
      name: "Green Gram (Moong)",
      category: "Pulse",
      idealClimate: {
        temperature: "25-35°C optimum",
        condition: "Warm subtropical",
        sensitivity: "Sensitive to waterlogging"
      },
      soil: {
        type: "Light loam to sandy loam",
        requirement: "Well-drained",
        pH: "6.0-7.5"
      },
      seedRate: {
        row: "10-25 kg/ha (row spacing 30-45 cm)",
        depth: "Sow 2-3 cm deep",
        treatment: "Seed inoculation with Rhizobium enhances N fixation"
      },
      nutrientSchedule: {
        nitrogen: "Low N (legume)",
        phosphorus: "Apply basal P (20-30 kg/ha)",
        potassium: "K as needed",
        micronutrients: "Micronutrients (Zn) if deficient"
      },
      irrigation: {
        requirement: "Rainfed or light irrigations",
        criticalStages: "Moisture crucial at flowering and pod filling",
        avoid: "Avoid excess moisture at maturity"
      },
      pests: ["Yellow mosaic virus (via whitefly)", "Pod fly", "Thrips"],
      diseases: ["Powdery mildew", "Cercospora leaf spot"],
      treatment: {
        ipm: [
          "Use resistant varieties and seed treatment",
          "Control whitefly with reflective mulches/biocontrols/spot insecticides; remove weed hosts",
          "Fungicides/organic sprays (Neem/Trichoderma) for leaf spots"
        ]
      },
      harvest: {
        indicators: "Harvest when 80-90% pods mature and seeds hard",
        method: "Cut and thresh after sun-drying",
        duration: "Short duration: 55-75 days; longer varieties 75-100 days"
      },
      yield: {
        typical: "0.5-1.2 t/ha (0.202-0.486 t/acre)"
      }
    },
    blackGram: {
      name: "Black Gram (Urad)",
      category: "Pulse",
      idealClimate: {
        temperature: "25-35°C",
        condition: "Warm",
        tolerance: "Partially tolerant to drought"
      },
      soil: {
        type: "Well-drained loams",
        pH: "6.0-7.5",
        note: "Heavy clay okay if drainage is adequate"
      },
      seedRate: {
        sole: "15-25 kg/ha for sole crop (row spacing 30-45 cm)",
        depth: "Sow 3-4 cm deep",
        treatment: "Inoculate seed with appropriate Rhizobium"
      },
      nutrientSchedule: {
        nitrogen: "Low N need",
        phosphorus: "Apply 20-40 kg P₂O₅/ha",
        potassium: "K as required",
        organic: "FYM helps"
      },
      irrigation: {
        requirement: "Mostly rainfed",
        benefit: "1-2 irrigations at flowering/pod fill improves yield",
        avoid: "Avoid waterlogging near maturity"
      },
      pests: ["Pod borer", "Aphids"],
      diseases: ["Mungbean yellow mosaic virus (whitefly vector)", "Powdery mildew", "Root rot in waterlogged soils"],
      treatment: {
        ipm: [
          "Use virus-resistant varieties, control whitefly with IPM",
          "Seed treatment and Trichoderma for soil-borne pathogens",
          "Use pheromone/biocontrols for borers"
        ]
      },
      harvest: {
        indicators: "Harvest when pods dry and seeds are hard",
        duration: "Typical crop duration 75-120 days depending on season"
      },
      yield: {
        typical: "0.5-1.2 t/ha (0.202-0.486 t/acre)"
      }
    },
    lentil: {
      name: "Lentil (Masoor)",
      category: "Pulse",
      idealClimate: {
        temperature: "10-25°C during vegetative growth",
        condition: "Cool and temperate to subtropical for Rabi",
        season: "Rabi (winter)"
      },
      soil: {
        type: "Well-drained loamy soils",
        pH: "6.0-8.0 (neutral to slightly alkaline is ok)",
        avoid: "Avoid heavy waterlogging"
      },
      seedRate: {
        row: "30-40 kg/ha (row spacing 20-30 cm)",
        depth: "Sow shallow (2-3 cm)",
        treatment: "Seed inoculation with Rhizobium increases nodulation"
      },
      nutrientSchedule: {
        nitrogen: "Low N (legume)",
        phosphorus: "Basal P 20-40 kg/ha",
        potassium: "K per soil test",
        sulfur: "Sulfur sometimes beneficial"
      },
      irrigation: {
        requirement: "Typically rainfed with supplemental irrigation during dry spells",
        benefit: "Irrigation at flowering/pod filling improves yield"
      },
      pests: ["Aphids"],
      diseases: ["Stemphylium blight", "Fusarium wilt"],
      treatment: {
        ipm: [
          "Use certified seed and resistant varieties where available",
          "Seed treatment with Trichoderma or fungicides",
          "Foliar fungicide for Stemphylium if severe",
          "Aphid monitoring and biocontrols can be used; use thresholds before spraying systemic insecticides"
        ]
      },
      harvest: {
        indicators: "Harvest when pods turn yellow-brown and seeds hard",
        method: "Cut plants and thresh after sun-drying",
        maturity: "Typically 90-120 days"
      },
      yield: {
        typical: "0.6-1.2 t/ha (0.243-0.486 t/acre)"
      }
    },
    horseGram: {
      name: "Horse Gram",
      category: "Pulse",
      idealClimate: {
        temperature: "Hot, dry",
        condition: "Tolerant to drought and poor soils",
        region: "Commonly grown in semi-arid zones"
      },
      soil: {
        type: "Sandy loam to shallow soils",
        tolerance: "Tolerant of low fertility"
      },
      seedRate: {
        broadcast: "20-25 kg/ha (broadcast/drill)",
        spacing: "30-45 cm rows",
        depth: "Sow 3-4 cm deep"
      },
      nutrientSchedule: {
        requirement: "Very low input crop",
        phosphorus: "Small basal P and K",
        organic: "FYM 2-3 t/ha beneficial",
        note: "Usually not fertilized heavily"
      },
      irrigation: {
        requirement: "Generally rainfed",
        benefit: "Responsive to one irrigation during pod filling"
      },
      pests: ["Stem fly", "Pod fly"],
      diseases: ["Rusts", "Root rot in waterlogged soils"],
      treatment: {
        ipm: [
          "Seed treatment with Trichoderma",
          "Use timely sowing to escape pest windows",
          "Cultural control and tolerant varieties where available"
        ]
      },
      harvest: {
        indicators: "Harvest when pods dry and turn brown",
        duration: "Short duration varieties mature in 70-90 days"
      },
      yield: {
        typical: "0.4-0.8 t/ha (0.162-0.324 t/acre)"
      }
    },
    fieldPea: {
      name: "Field Pea (Garden/Field Pea)",
      category: "Pulse",
      idealClimate: {
        temperature: "10-25°C for good pod set",
        condition: "Cool-season legume",
        season: "Often grown in Rabi (winter) or as a cool-season rainfed kharif in hills"
      },
      soil: {
        type: "Well-drained loam",
        pH: "Neutral pH best",
        note: "Heavy clay ok with drainage"
      },
      seedRate: {
        dense: "100-150 kg/ha (higher than some pulses) for dense stands",
        spacing: "30-45 cm row spacing",
        depth: "Sow 3-5 cm deep",
        note: "Varieties differ (dwarf vs climbing)"
      },
      nutrientSchedule: {
        nitrogen: "Low N (legume)",
        phosphorus: "Apply P 20-40 kg/ha",
        potassium: "K as needed",
        micronutrients: "Micronutrients (Zn, B) if deficient"
      },
      irrigation: {
        requirement: "Moderate",
        criticalStages: "Irrigate at flowering and pod fill in dry spells",
        avoid: "Avoid waterlogging"
      },
      pests: ["Pea weevil", "Aphids"],
      diseases: ["Powdery mildew", "Ascochyta blight"],
      treatment: {
        ipm: [
          "Use certified seed and resistant varieties",
          "Seed treatment for seed-borne disease",
          "Biocontrols and threshold-based sprays for aphids",
          "Fungicide for blight outbreaks"
        ]
      },
      harvest: {
        grain: "Harvest when pods mature but before shattering",
        green: "For green peas pick earlier (green stage)",
        maturity: "Dry peas mature in 90-120 days"
      },
      yield: {
        typical: "1.0-2.5 t/ha (0.405-1.012 t/acre)"
      }
    },
    cowpea: {
      name: "Cowpea (Lobia)",
      category: "Pulse",
      idealClimate: {
        temperature: "20-35°C",
        condition: "Warm-season tropical/subtropical",
        tolerance: "Tolerant to heat and moderate drought"
      },
      soil: {
        type: "Sandy loam to light soils",
        requirement: "Well-drained"
      },
      seedRate: {
        variable: "15-30 kg/ha depending on variety",
        spacing: "30-60 cm rows × 20-30 cm",
        depth: "Sow 3-4 cm deep",
        note: "For vegetable cowpea (yardlong), spacing and staking vary"
      },
      nutrientSchedule: {
        nitrogen: "Low N (legume)",
        phosphorus: "Basal P 20-40 kg/ha",
        potassium: "K per soil test",
        organic: "Organic manures beneficial"
      },
      irrigation: {
        requirement: "Mostly rainfed",
        benefit: "Irrigation during flowering and pod set increases yields"
      },
      pests: ["Pod borer", "Aphids", "Thrips"],
      diseases: ["Mosaic virus", "Root rot in poorly drained soils"],
      treatment: {
        ipm: [
          "Seed treatment and Rhizobium inoculation",
          "For borers: Trichogramma/pheromone traps and spot sprays when thresholds exceeded",
          "Virus control by vector management and rouging infected plants"
        ]
      },
      harvest: {
        grain: "For dry grain, harvest when pods mature and dry",
        vegetable: "For vegetable types, pick tender pods regularly",
        maturity: "Grain maturity ~70-110 days"
      },
      yield: {
        typical: "1.0-2.0 t/ha (0.405-0.809 t/acre)"
      }
    },
    soybean: {
      name: "Soybean (Soya bean)",
      category: "Pulse",
      idealClimate: {
        temperature: "20-30°C optimum",
        condition: "Warm season crop",
        requirement: "Good sunshine",
        season: "Planted in Kharif in most of India"
      },
      soil: {
        type: "Well-drained loam",
        pH: "6.0-7.5",
        avoid: "Avoid waterlogging—roots sensitive to excess moisture"
      },
      seedRate: {
        variable: "80-100 kg/ha (depends on seed size and spacing)",
        spacing: "45-60 cm with 5-7.5 cm intra-row (varies)",
        depth: "Seed depth ~3-4 cm",
        treatment: "Seed inoculation with Bradyrhizobium highly recommended"
      },
      nutrientSchedule: {
        nitrogen: "Low N need (legume)",
        phosphorus: "Apply basal P 20-40 kg/ha",
        potassium: "K as required",
        quality: "Sulfur and micronutrients based on soil tests increase oil/protein quality"
      },
      irrigation: {
        requirement: "Mostly rainfed Kharif",
        benefit: "Irrigation at flowering & pod fill increases yield in dry spells"
      },
      pests: ["Stem fly", "Pod borer", "Hairy caterpillar"],
      diseases: ["Yellow mosaic", "Charcoal rot", "Phytophthora root rot"],
      treatment: {
        ipm: [
          "Seed treatment with fungicide and Bradyrhizobium inoculant",
          "Use tolerant varieties, crop rotation, and timely fungicide for Phytophthora",
          "Scout and spray only above thresholds"
        ]
      },
      harvest: {
        indicators: "Harvest when leaves drop and pods brown",
        method: "Combine harvesting common in large areas",
        maturity: "Typically 100-140 days"
      },
      yield: {
        typical: "1.0-3.0 t/ha (0.405-1.214 t/acre)"
      }
    },
    mothBean: {
      name: "Moth Bean",
      category: "Pulse",
      idealClimate: {
        temperature: "Hot, arid to semi-arid",
        condition: "Tolerant to low rainfall and poor soils",
        region: "Grows well in sandy/rocky soils"
      },
      soil: {
        type: "Sandy loams to shallow soils",
        requirement: "Well-drained"
      },
      seedRate: {
        broadcast: "8-12 kg/ha (broadcast/drill)",
        spacing: "30-45 cm rows",
        depth: "Sow shallow (~2-3 cm)"
      },
      nutrientSchedule: {
        requirement: "Very low input crop",
        phosphorus: "Small basal P encourages early growth",
        organic: "FYM where available"
      },
      irrigation: {
        requirement: "Generally rainfed",
        benefit: "One irrigation at pod filling if possible",
        advantage: "Very drought hardy"
      },
      pests: ["Pod fly", "Jassids"],
      diseases: ["Web blight", "Powdery mildew"],
      treatment: {
        ipm: [
          "Seed treatment with Trichoderma or suitable fungicide",
          "Cultural measures: timely sowing, maintain spacing to reduce humidity",
          "Biological control where available"
        ]
      },
      harvest: {
        indicators: "Harvest when pods dry and rattle",
        method: "Dry and thresh",
        maturity: "70-100 days (varies)"
      },
      yield: {
        typical: "0.3-0.8 t/ha (0.121-0.324 t/acre)"
      }
    }
  },

  vegetables: {
    rootTuber: {
      potato: {
        name: "Potato",
        category: "Vegetable - Root & Tuber",
        idealClimate: {
          temperature: "15-20°C optimal for tuber formation",
          condition: "Cool temperate"
        },
        soil: {
          type: "Well-drained loamy soil",
          pH: "5.5-6.5",
          avoid: "Avoid waterlogging"
        },
        landPreparation: {
          steps: [
            "Deep ploughing, remove stones",
            "Raise ridges 60 cm apart",
            "Incorporate 10-15 t/ha FYM/compost"
          ]
        },
        seedRate: {
          seedTubers: "2.5-3.5 t/ha of certified seed tubers",
          method: "Cut into 50-60 g pieces with at least one eye",
          depth: "Plant 7-10 cm deep"
        },
        nutrientSchedule: {
          nitrogen: "100-150 kg N",
          phosphorus: "60-80 kg P₂O₅",
          potassium: "120-150 kg K₂O/ha (split doses)",
          micronutrients: "Micronutrients as needed"
        },
        irrigation: {
          method: "Frequent shallow irrigation",
          requirement: "Maintain 70-80% field capacity",
          avoid: "Avoid excess water during maturity"
        },
        weeding: {
          frequency: "2-3 mechanical/hand weedings",
          methods: "Hilling improves aeration and tuber formation"
        },
        pests: ["Potato tuber moth", "Aphids", "Nematodes"],
        diseases: ["Late blight"],
        treatment: {
          ipm: [
            "Fungicides for blight (preventive and curative)",
            "Pheromone traps for moth",
            "Crop rotation",
            "Certified disease-free seed"
          ]
        },
        harvest: {
          indicators: "Harvest 75-120 days depending on variety when foliage yellows",
          method: "Allow curing before storage"
        },
        yield: {
          typical: "20-30 t/ha (8.1-12.1 t/acre)"
        }
      },
      sweetPotato: {
        name: "Sweet Potato",
        category: "Vegetable - Root & Tuber",
        idealClimate: {
          temperature: "21-26°C",
          condition: "Warm, tropical/subtropical"
        },
        soil: {
          type: "Sandy loam, well-drained",
          pH: "5.5-6.5"
        },
        landPreparation: {
          steps: [
            "Ridge or flat beds",
            "Incorporate 5-10 t/ha FYM"
          ]
        },
        seedRate: {
          cuttings: "15,000-20,000 cuttings/ha",
          size: "Each cutting 20-25 cm long",
          depth: "Planted 5-7 cm deep"
        },
        nutrientSchedule: {
          nitrogen: "Low N",
          phosphorus: "50-60 kg P₂O₅",
          potassium: "80-100 kg K₂O/ha",
          organic: "FYM improves root development"
        },
        irrigation: {
          requirement: "Moderate, especially during root initiation",
          avoid: "Avoid waterlogging"
        },
        pests: ["Sweet potato weevil", "Leaf folder", "Nematodes"],
        diseases: ["Fungal root rot"],
        treatment: {
          ipm: [
            "Use virus-free cuttings",
            "Cultural control (remove infested roots)",
            "Neem-based sprays for pests"
          ]
        },
        harvest: {
          timing: "90-150 days after planting",
          indicators: "Leaves yellowing",
          method: "Carefully lift roots to avoid damage"
        },
        yield: {
          typical: "15-25 t/ha (6.1-10.1 t/acre)"
        }
      },
      tomato: {
        name: "Tomato",
        category: "Vegetable - Fruit",
        idealClimate: {
          temperature: "20-30°C",
          condition: "Warm season; frost-sensitive"
        },
        soil: {
          type: "Well-drained loamy",
          pH: "6-7"
        },
        landPreparation: {
          steps: [
            "Deep ploughing",
            "Ridges 60 cm apart",
            "FYM 10 t/ha"
          ]
        },
        seedRate: {
          seed: "100-150 g/ha",
          nursery: "Raise seedlings in nursery 4-6 weeks",
          spacing: "Transplant spacing 50 × 50 cm"
        },
        nutrientSchedule: {
          nitrogen: "120-150 kg N",
          phosphorus: "60-80 kg P₂O₅",
          potassium: "80-100 kg K₂O/ha",
          method: "Split doses"
        },
        irrigation: {
          requirement: "Regular, avoid water stress",
          method: "Drip irrigation recommended"
        },
        weeding: {
          requirement: "Early weeding",
          support: "Staking or trellising recommended"
        },
        pests: ["Fruit borer", "Aphids"],
        diseases: ["Bacterial wilt", "Late blight"],
        treatment: {
          ipm: [
            "Pheromone traps",
            "Neem/biopesticides",
            "Fungicides for blight",
            "Resistant varieties"
          ]
        },
        harvest: {
          timing: "75-90 days after transplanting",
          method: "Pick mature red fruits"
        },
        yield: {
          typical: "40-60 t/ha"
        }
      },
      onion: {
        name: "Onion",
        category: "Vegetable - Bulb",
        idealClimate: {
          temperature: "20-25°C for bulb formation",
          condition: "Cool, dry"
        },
        soil: {
          type: "Well-drained loamy",
          pH: "6-7"
        },
        landPreparation: {
          steps: [
            "Deep ploughing",
            "Ridges 30 cm apart",
            "Compost 5-10 t/ha"
          ]
        },
        seedRate: {
          seed: "4-6 kg/ha (seed) or 10-15 t/ha (sets)",
          spacing: "Rows 20-25 cm apart"
        },
        nutrientSchedule: {
          nitrogen: "100 kg N",
          phosphorus: "50-60 kg P₂O₅",
          potassium: "50-60 kg K₂O/ha"
        },
        irrigation: {
          requirement: "Frequent, especially during bulb formation",
          avoid: "Avoid waterlogging"
        },
        pests: ["Onion thrips"],
        diseases: ["Purple blotch", "Downy mildew", "Basal rot"],
        treatment: {
          ipm: [
            "Resistant varieties",
            "Neem sprays",
            "Fungicides for disease"
          ]
        },
        harvest: {
          timing: "90-120 days",
          indicators: "Tops dry and fall over",
          method: "Cure before storage"
        },
        yield: {
          typical: "15-25 t/ha"
        }
      },
      cabbage: {
        name: "Cabbage",
        category: "Vegetable - Leafy",
        idealClimate: {
          temperature: "15-20°C optimal",
          condition: "Cool season"
        },
        soil: {
          type: "Deep loamy soil",
          pH: "6-7"
        },
        landPreparation: {
          steps: [
            "Deep ploughing",
            "Incorporate 10-15 t/ha compost/FYM"
          ]
        },
        seedRate: {
          seed: "300-400 g/ha",
          transplant: "Transplant 35-45 days old seedlings",
          spacing: "50 × 50 cm"
        },
        nutrientSchedule: {
          nitrogen: "120-150 kg N",
          phosphorus: "60-80 kg P₂O₅",
          potassium: "80-100 kg K₂O/ha"
        },
        irrigation: {
          requirement: "Regular; maintain soil moisture, avoid water stress"
        },
        pests: ["Cabbage butterfly", "Aphids"],
        diseases: ["Clubroot", "Black rot"],
        treatment: {
          ipm: [
            "Pheromone traps",
            "Neem oil",
            "Fungicides for black rot",
            "Crop rotation"
          ]
        },
        harvest: {
          timing: "75-90 days",
          indicators: "Heads firm and compact"
        },
        yield: {
          typical: "25-35 t/ha"
        }
      }
    }
  },

  fruits: {
    banana: {
      name: "Banana",
      category: "Fruit",
      idealClimate: {
        temperature: "26-30°C",
        condition: "Tropical/subtropical; sensitive to frost"
      },
      soil: {
        type: "Deep, fertile, well-drained loam",
        pH: "5.5-7.0"
      },
      landPreparation: {
        steps: [
          "Raised beds or pits",
          "Add 20-30 kg compost + 300 g NPK per pit"
        ]
      },
      planting: {
        material: "Suckers / tissue-cultured plantlets",
        spacing: "2-3 m × 2-3 m"
      },
      nutrientSchedule: {
        nitrogen: "150-200 g N per plant per year",
        phosphorus: "50-60 g P₂O₅",
        potassium: "200-250 g K₂O (split doses)"
      },
      irrigation: {
        requirement: "Frequent; maintain soil moisture",
        method: "Drip irrigation recommended"
      },
      pests: ["Banana borer", "Aphids", "Nematodes"],
      diseases: ["Panama disease", "Sigatoka leaf spot"],
      treatment: {
        ipm: [
          "Resistant varieties",
          "Biocontrol agents",
          "Fungicide sprays",
          "Proper drainage"
        ]
      },
      harvest: {
        timing: "9-12 months after planting",
        indicators: "Bunches mature when fingers are full-sized but green"
      },
      yield: {
        typical: "30-40 t/ha"
      }
    },
    mango: {
      name: "Mango",
      category: "Fruit",
      idealClimate: {
        temperature: "24-30°C",
        condition: "Tropical/subtropical; dry weather during flowering"
      },
      soil: {
        type: "Deep, well-drained loam",
        pH: "5.5-7.5"
      },
      planting: {
        material: "Grafted saplings or air-layered plants",
        spacing: "8-10 m × 8-10 m"
      },
      nutrientSchedule: {
        nitrogen: "200-300 g N per tree annually",
        phosphorus: "100-150 g P₂O₅",
        potassium: "200-250 g K₂O (split doses)"
      },
      irrigation: {
        requirement: "Frequent in first 2 years; reduced once established"
      },
      pests: ["Mango hoppers", "Fruit fly"],
      diseases: ["Powdery mildew", "Anthracnose"],
      treatment: {
        ipm: [
          "Neem/biopesticides",
          "Bagging fruits",
          "Fungicide sprays for anthracnose"
        ]
      },
      harvest: {
        timing: "3-5 years after planting",
        indicators: "Mature fruits harvested when color and aroma develop"
      },
      yield: {
        typical: "8-12 t/ha"
      }
    },
    papaya: {
      name: "Papaya",
      category: "Fruit",
      idealClimate: {
        temperature: "22-28°C",
        condition: "Tropical; frost-sensitive"
      },
      soil: {
        type: "Well-drained loamy/sandy loam",
        pH: "6-7"
      },
      planting: {
        material: "Grafted / tissue-cultured seedlings",
        spacing: "2 m × 2 m"
      },
      nutrientSchedule: {
        nitrogen: "100-150 g N per plant per year",
        phosphorus: "50-60 g P₂O₅",
        potassium: "100-150 g K₂O",
        method: "Monthly foliar sprays"
      },
      pests: ["Papaya mealybug", "Fruit fly"],
      diseases: ["Powdery mildew", "Mosaic virus"],
      treatment: {
        ipm: [
          "Neem sprays",
          "Sticky traps",
          "Fungicide for mildew",
          "Remove infected plants"
        ]
      },
      harvest: {
        timing: "7-9 months",
        method: "Pick when fruits change color partially; multiple harvests possible"
      },
      yield: {
        typical: "40-50 t/ha"
      }
    }
  },

  oilseeds: {
    groundnut: {
      name: "Groundnut",
      category: "Oilseed",
      idealClimate: {
        temperature: "25-35°C",
        rainfall: "50-75 cm"
      },
      soil: {
        type: "Sandy loam; well-drained",
        pH: "6-7"
      },
      seedRate: {
        seed: "80-100 kg/ha",
        depth: "Sow 5 cm deep",
        spacing: "30 × 10 cm"
      },
      nutrientSchedule: {
        nitrogen: "20-25 kg N",
        phosphorus: "40-50 kg P₂O₅",
        potassium: "20-25 kg K₂O/ha",
        method: "Basal application"
      },
      irrigation: {
        criticalStages: "Critical at pegging and flowering",
        avoid: "Avoid waterlogging"
      },
      pests: ["Aphids", "Leaf miner"],
      diseases: ["Rust", "Leaf spot", "Stem rot"],
      treatment: {
        ipm: [
          "Resistant varieties",
          "Neem sprays",
          "Fungicide application for leaf spot"
        ]
      },
      harvest: {
        timing: "110-130 days",
        indicators: "When leaves turn yellow",
        method: "Dig plants, sun-dry pods"
      },
      yield: {
        typical: "2-3 t/ha"
      }
    },
    mustard: {
      name: "Mustard / Rapeseed",
      category: "Oilseed",
      idealClimate: {
        temperature: "10-25°C",
        condition: "Cool-season; light rainfall"
      },
      soil: {
        type: "Loamy",
        pH: "6-7.5",
        requirement: "Well-drained"
      },
      seedRate: {
        seed: "4-5 kg/ha",
        spacing: "Row spacing 30 cm",
        depth: "2-3 cm"
      },
      nutrientSchedule: {
        nitrogen: "40-50 kg N",
        phosphorus: "20-30 kg P₂O₅",
        potassium: "20-30 kg K₂O/ha"
      },
      irrigation: {
        requirement: "Light irrigation during flowering",
        avoid: "Avoid waterlogging"
      },
      pests: ["Aphids", "Mustard sawfly"],
      diseases: ["White rust", "Alternaria blight"],
      treatment: {
        ipm: [
          "Neem oil",
          "Resistant varieties",
          "Fungicide sprays for blight"
        ]
      },
      harvest: {
        timing: "90-120 days",
        indicators: "Pods brown",
        method: "Harvest by cutting or threshing"
      },
      yield: {
        typical: "1.0-1.5 t/ha"
      }
    },
    sunflower: {
      name: "Sunflower",
      category: "Oilseed",
      idealClimate: {
        temperature: "20-30°C",
        rainfall: "50-75 cm moderate rainfall"
      },
      soil: {
        type: "Loamy, well-drained",
        pH: "6-7"
      },
      seedRate: {
        seed: "20-25 kg/ha",
        spacing: "30 × 30 cm",
        method: "3-4 seeds/hill"
      },
      nutrientSchedule: {
        nitrogen: "60-70 kg N",
        phosphorus: "40-50 kg P₂O₅",
        potassium: "20-30 kg K₂O/ha"
      },
      pests: ["Sunflower stem weevil", "Aphids"],
      diseases: ["Downy mildew", "Rust"],
      treatment: {
        ipm: [
          "Neem sprays",
          "Fungicide for downy mildew",
          "Resistant varieties"
        ]
      },
      harvest: {
        timing: "100-120 days",
        indicators: "When back of flower heads turn yellow/brown",
        method: "Dry seeds before storage"
      },
      yield: {
        typical: "1.5-2.5 t/ha"
      }
    }
  },

  getCropInfo: function(cropName) {
    const normalizedName = cropName.toLowerCase().replace(/\s+/g, '');
    
    for (const category in this) {
      if (category === 'getCropInfo') continue;
      if (typeof this[category] === 'object') {
        for (const cropKey in this[category]) {
          const crop = this[category][cropKey];
          if (crop.name && crop.name.toLowerCase().replace(/\s+/g, '') === normalizedName) {
            return crop;
          }
          if (cropKey.toLowerCase().replace(/\s+/g, '') === normalizedName) {
            return crop;
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
      if (category === 'getCropInfo' || category === 'searchCrops') continue;
      if (typeof this[category] === 'object') {
        for (const cropKey in this[category]) {
          const crop = this[category][cropKey];
          if (crop.name && (
            crop.name.toLowerCase().includes(normalizedQuery) ||
            crop.category?.toLowerCase().includes(normalizedQuery) ||
            crop.idealClimate?.condition?.toLowerCase().includes(normalizedQuery)
          )) {
            results.push(crop);
          }
        }
      }
    }
    return results;
  }
};

module.exports = cropKnowledgeBase;














