const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

class CropRecommenderML {
  constructor() {
    this.modelPath = path.join(__dirname, '../../models');
    this.pythonScriptPath = path.join(__dirname, 'predict_crop.py');
    this.isPythonAvailable = this.checkPythonAvailability();
  }

  checkPythonAvailability() {
    try {
      const { execSync } = require('child_process');
      execSync('python3 --version', { stdio: 'ignore' });
      return true;
    } catch {
      try {
        execSync('python --version', { stdio: 'ignore' });
        return true;
      } catch {
        logger.warn('Python not available, using JavaScript fallback');
        return false;
      }
    }
  }

  async predict(features) {
    try {
      if (this.isPythonAvailable && fs.existsSync(this.pythonScriptPath)) {
        return await this.predictWithPython(features);
      } else {
        return this.predictWithJavaScript(features);
      }
    } catch (error) {
      logger.error('ML prediction error:', error);
      return this.predictWithJavaScript(features);
    }
  }

  async predictWithEnhancedModel(features, scriptPath) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, JSON.stringify(features)], {
        cwd: path.dirname(scriptPath),
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const result = JSON.parse(stdout.trim());
            logger.info('✅ Enhanced ML model prediction successful');
            resolve(result);
          } catch (e) {
            logger.warn('Failed to parse enhanced ML model output, using fallback');
            resolve(this.predictWithJavaScript(features));
          }
        } else {
          logger.warn(`Enhanced ML model script exited with code ${code}: ${stderr.substring(0, 200)}`);
          resolve(this.predictWithJavaScript(features));
        }
      });
      
      pythonProcess.on('error', (error) => {
        logger.warn(`Failed to run enhanced ML model script: ${error.message}`);
        resolve(this.predictWithJavaScript(features));
      });
    });
  }

  async predictWithPython(features) {
    const enhancedScriptPath = path.join(__dirname, 'predict_crop_enhanced.py');
    if (fs.existsSync(enhancedScriptPath)) {
      return await this.predictWithEnhancedModel(features, enhancedScriptPath);
    }
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        this.pythonScriptPath,
        JSON.stringify(features)
      ], {
        cwd: path.dirname(this.pythonScriptPath)
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const recommendations = JSON.parse(output.trim());
            resolve(recommendations);
          } catch (parseError) {
            logger.error('Failed to parse Python output:', parseError);
            resolve(this.predictWithJavaScript(features));
          }
        } else {
          logger.error('Python script error:', errorOutput);
          resolve(this.predictWithJavaScript(features));
        }
      });

      pythonProcess.on('error', (error) => {
        logger.error('Python process error:', error);
        resolve(this.predictWithJavaScript(features));
      });
    });
  }

  predictWithJavaScript(features) {
    const { temperature, rainfall, ph, humidity, soil_type, state } = features;
    
    const cropDatabase = [
      {
        name: 'Rice',
        tempRange: [20, 35],
        rainfallRange: [1000, 2500],
        phRange: [5.5, 7.0],
        humidityRange: [70, 95],
        suitableSoils: ['alluvial', 'clayey', 'loamy'],
        season: 'Kharif',
        baseScore: 90
      },
      {
        name: 'Wheat',
        tempRange: [10, 25],
        rainfallRange: [500, 1000],
        phRange: [6.0, 7.5],
        humidityRange: [50, 80],
        suitableSoils: ['alluvial', 'loamy', 'clay loam'],
        season: 'Rabi',
        baseScore: 85
      },
      {
        name: 'Maize',
        tempRange: [15, 30],
        rainfallRange: [500, 1500],
        phRange: [5.5, 7.5],
        humidityRange: [60, 85],
        suitableSoils: ['alluvial', 'loamy', 'sandy loam'],
        season: 'Kharif',
        baseScore: 80
      },
      {
        name: 'Cotton',
        tempRange: [20, 35],
        rainfallRange: [500, 1000],
        phRange: [6.0, 8.0],
        humidityRange: [50, 75],
        suitableSoils: ['black', 'clay', 'alluvial'],
        season: 'Kharif',
        baseScore: 75
      },
      {
        name: 'Sugarcane',
        tempRange: [20, 35],
        rainfallRange: [1500, 2500],
        phRange: [6.0, 7.5],
        humidityRange: [70, 90],
        suitableSoils: ['alluvial', 'black', 'red'],
        season: 'Year-round',
        baseScore: 70
      },
      {
        name: 'Groundnut',
        tempRange: [20, 30],
        rainfallRange: [500, 1000],
        phRange: [6.0, 7.0],
        humidityRange: [50, 70],
        suitableSoils: ['sandy', 'loamy', 'sandy loam'],
        season: 'Kharif',
        baseScore: 75
      },
      {
        name: 'Soybean',
        tempRange: [15, 30],
        rainfallRange: [500, 1500],
        phRange: [6.0, 7.5],
        humidityRange: [60, 80],
        suitableSoils: ['black', 'alluvial', 'loamy'],
        season: 'Kharif',
        baseScore: 80
      },
      {
        name: 'Pulses',
        tempRange: [15, 25],
        rainfallRange: [300, 800],
        phRange: [6.0, 7.5],
        humidityRange: [50, 70],
        suitableSoils: ['all types'],
        season: 'Rabi',
        baseScore: 75
      }
    ];

    const recommendations = cropDatabase.map(crop => {
      let score = crop.baseScore;
      let reasons = [];

      if (temperature >= crop.tempRange[0] && temperature <= crop.tempRange[1]) {
        const tempScore = 30;
        score += tempScore;
        reasons.push(`Ideal temperature (${temperature}°C)`);
      } else {
        const tempDiff = Math.min(
          Math.abs(temperature - crop.tempRange[0]),
          Math.abs(temperature - crop.tempRange[1])
        );
        const tempScore = Math.max(0, 30 - (tempDiff * 2));
        score += tempScore;
      }

      if (rainfall >= crop.rainfallRange[0] && rainfall <= crop.rainfallRange[1]) {
        const rainScore = 25;
        score += rainScore;
        reasons.push(`Adequate rainfall (${rainfall}mm)`);
      } else {
        const rainDiff = Math.min(
          Math.abs(rainfall - crop.rainfallRange[0]),
          Math.abs(rainfall - crop.rainfallRange[1])
        ) / crop.rainfallRange[1];
        const rainScore = Math.max(0, 25 - (rainDiff * 50));
        score += rainScore;
      }

      if (ph >= crop.phRange[0] && ph <= crop.phRange[1]) {
        const phScore = 20;
        score += phScore;
        reasons.push(`Optimal pH (${ph})`);
      } else {
        const phDiff = Math.min(
          Math.abs(ph - crop.phRange[0]),
          Math.abs(ph - crop.phRange[1])
        );
        const phScore = Math.max(0, 20 - (phDiff * 5));
        score += phScore;
      }

      if (crop.suitableSoils.includes('all types') || 
          crop.suitableSoils.some(s => soil_type?.toLowerCase().includes(s.toLowerCase()))) {
        const soilScore = 15;
        score += soilScore;
        reasons.push(`Suitable for ${soil_type} soil`);
      } else {
        score += 5;
      }

      if (humidity >= crop.humidityRange[0] && humidity <= crop.humidityRange[1]) {
        score += 10;
      } else {
        const humidityDiff = Math.min(
          Math.abs(humidity - crop.humidityRange[0]),
          Math.abs(humidity - crop.humidityRange[1])
        );
        const humidityScore = Math.max(0, 10 - (humidityDiff / 10));
        score += humidityScore;
      }

      score = Math.min(100, Math.max(0, Math.round(score)));

      return {
        crop: crop.name,
        confidence: score,
        season: crop.season,
        reason: reasons.length > 0 ? reasons.join(', ') : 'Suitable for your region',
        method: 'js_ml_scoring'
      };
    });

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  getFeatureImportance() {
    return {
      temperature: 0.30,
      rainfall: 0.25,
      ph: 0.20,
      soil_type: 0.15,
      humidity: 0.10
    };
  }
}

module.exports = new CropRecommenderML();


