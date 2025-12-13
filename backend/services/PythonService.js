const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('../config');
const logger = require('../utils/logger');
const fs = require('fs');

class PythonService {
  constructor() {
    this.pythonPath = config.ml.pythonPath;
    this.isAvailable = false;
    this.pythonVersion = null;
    this.installedPackages = {};
  }

  async initialize() {
    try {
      await this.checkPythonAvailability();
      
      await this.checkRequiredPackages();
      
      await this.testMLScripts();
      
      this.isAvailable = true;
      logger.info('✅ Python environment validated successfully');
      return true;
    } catch (error) {
      logger.error('❌ Python environment validation failed:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  async checkPythonAvailability() {
    try {
      const { stdout } = await execPromise(`${this.pythonPath} --version`);
      this.pythonVersion = stdout.trim();
      logger.info(`✅ Python detected: ${this.pythonVersion}`);
      return true;
    } catch (error) {
      throw new Error(`Python not found at ${this.pythonPath}: ${error.message}`);
    }
  }

  async checkRequiredPackages() {
    const requiredPackages = {
      'numpy': '>=1.19.0',
      'pandas': '>=1.3.0',
      'scikit-learn': '>=0.24.0',
      'xgboost': '>=1.5.0',
      'joblib': '>=1.0.0',
      'requests': '>=2.26.0'
    };

    const script = `
import sys
import importlib.util

required = ${JSON.stringify(requiredPackages)}
installed = {}
missing = []
incompatible = []

for pkg, req_version in required.items():
    try:
        spec = importlib.util.find_spec(pkg)
        if spec is None:
            missing.append(pkg)
        else:
            try:
                if sys.version_info >= (3, 8):
                    import importlib.metadata
                    version = importlib.metadata.version(pkg)
                else:
                    import pkg_resources
                    version = pkg_resources.get_distribution(pkg).version
                installed[pkg] = version
            except:
                installed[pkg] = "installed"
    except Exception as e:
        missing.append(pkg)

result = {"installed": installed, "missing": missing, "incompatible": incompatible}
import json
print(json.dumps(result))
    `;

    try {
      const { stdout, stderr } = await execPromise(`${this.pythonPath} -c "${script.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      this.installedPackages = result.installed;
      
      if (result.missing.length > 0) {
        logger.warn(`⚠️ Missing Python packages: ${result.missing.join(', ')}`);
        logger.info(`💡 Install missing packages: pip install ${result.missing.join(' ')}`);
      }
      
      if (result.incompatible.length > 0) {
        logger.warn(`⚠️ Incompatible Python package versions: ${result.incompatible.join(', ')}`);
      }
      
      if (result.missing.length === 0 && result.incompatible.length === 0) {
        logger.info('✅ All required Python packages are installed');
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Failed to check Python packages:', error.message);
      if (error.stderr) {
        logger.error('Python error output:', error.stderr);
      }
      throw error;
    }
  }

  async testMLScripts() {
    const scripts = [
      { path: 'backend/services/ml/predict_crop.py', name: 'Crop Prediction' },
      { path: 'backend/services/ml/predict_crop_enhanced.py', name: 'Enhanced Crop Prediction' },
      { path: 'ml-models/disease-detection/train-disease-model.py', name: 'Disease Model Training' }
    ];

    let validatedCount = 0;

    for (const script of scripts) {
      try {
        if (!fs.existsSync(script.path)) {
          logger.warn(`⚠️ ML script not found: ${script.path}`);
          continue;
        }

        const { stdout, stderr } = await execPromise(
          `${this.pythonPath} -m py_compile "${script.path}"`,
          { timeout: 5000 }
        );
        
        if (stderr && stderr.includes('SyntaxError')) {
          logger.error(`❌ Syntax error in ${script.name}: ${stderr}`);
        } else {
          logger.info(`✅ ML script validated: ${script.name}`);
          validatedCount++;
        }
      } catch (error) {
        if (error.message.includes('SyntaxError') || error.stderr?.includes('SyntaxError')) {
          logger.error(`❌ Syntax error in ${script.name}`);
        } else {
          logger.warn(`⚠️ Failed to validate ML script ${script.name}: ${error.message}`);
        }
      }
    }

    if (validatedCount === 0) {
      logger.warn('⚠️ No ML scripts were validated (scripts may not exist)');
    }

    return validatedCount;
  }

  async executeScript(scriptPath, args = []) {
    if (!this.isAvailable) {
      throw new Error('Python environment not available');
    }

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [scriptPath, ...args], {
        cwd: process.cwd(),
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
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            resolve(stdout);
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr || stdout}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python script execution timeout'));
      }, 300000);
    });
  }

  getStatus() {
    return {
      available: this.isAvailable,
      pythonVersion: this.pythonVersion,
      installedPackages: this.installedPackages,
      pythonPath: this.pythonPath
    };
  }
}

const pythonService = new PythonService();

if (require.main !== module) {
  pythonService.initialize().catch(err => {
    logger.error('Failed to initialize Python service:', err);
  });
}

module.exports = pythonService;







