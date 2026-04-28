const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('../config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class PythonService {
  constructor() {
    this.pythonPath = config.ml.pythonPath;
    this.isAvailable = false;
    this.pythonVersion = null;
    this.installedPackages = {};
    this.repoRoot = path.resolve(__dirname, '..', '..');
  }

  async initialize() {
    try {
      await this.checkPythonAvailability();
      
      const packageStatus = await this.checkRequiredPackages();
      
      const scriptStatus = await this.testMLScripts();
      
      this.isAvailable = true;
      logger.info('Python environment ready', {
        version: this.pythonVersion,
        packagesInstalled: Object.keys(this.installedPackages).length,
        missingPackages: packageStatus.missing.length,
        incompatiblePackages: packageStatus.incompatible.length,
        scriptsValidated: scriptStatus.validatedCount,
        scriptsExpected: scriptStatus.totalScripts
      });
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
      return true;
    } catch (error) {
      throw new Error(`Python not found at ${this.pythonPath}: ${error.message}`);
    }
  }

  async checkRequiredPackages() {
    const requiredPackages = {
      'numpy': { importName: 'numpy', minVersion: '>=1.19.0' },
      'pandas': { importName: 'pandas', minVersion: '>=1.3.0' },
      'scikit-learn': { importName: 'sklearn', minVersion: '>=0.24.0' },
      'xgboost': { importName: 'xgboost', minVersion: '>=1.5.0' },
      'joblib': { importName: 'joblib', minVersion: '>=1.0.0' },
      'requests': { importName: 'requests', minVersion: '>=2.26.0' }
    };

    const script = `
import sys
import importlib.util

required = ${JSON.stringify(requiredPackages)}
installed = {}
missing = []
incompatible = []

for pkg, details in required.items():
    try:
        import_name = details.get("importName", pkg)
        spec = importlib.util.find_spec(import_name)
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
      const { stdout } = await execPromise(`${this.pythonPath} -c "${script.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      this.installedPackages = result.installed;
      
      if (result.missing.length > 0) {
        logger.warn(`⚠️ Missing Python packages: ${result.missing.join(', ')}`);
        logger.info(`💡 Install missing packages: pip install ${result.missing.join(' ')}`);
      }
      
      if (result.incompatible.length > 0) {
        logger.warn(`⚠️ Incompatible Python package versions: ${result.incompatible.join(', ')}`);
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
      {
        paths: [
          path.join(this.repoRoot, 'backend', 'services', 'ml', 'predict_crop.py')
        ],
        name: 'Crop Prediction'
      },
      {
        paths: [
          path.join(this.repoRoot, 'backend', 'services', 'ml', 'predict_crop_enhanced.py')
        ],
        name: 'Enhanced Crop Prediction'
      },
      {
        paths: [
          path.join(this.repoRoot, 'ml-models', 'disease-detection', 'train-disease-model.py'),
          path.join(this.repoRoot, 'backend', 'ml-models', 'train-disease-model.py'),
          path.join(this.repoRoot, 'ml-models', 'disease-detection', 'train.py')
        ],
        name: 'Disease Model Training'
      }
    ];

    let validatedCount = 0;

    for (const script of scripts) {
      try {
        const scriptPath = script.paths.find((candidatePath) => fs.existsSync(candidatePath));
        if (!scriptPath) {
          logger.warn(`⚠️ ML script not found: ${script.paths[0]}`);
          continue;
        }

        const { stderr } = await execPromise(
          `${this.pythonPath} -m py_compile "${scriptPath}"`,
          { timeout: 5000 }
        );
        
        if (stderr && stderr.includes('SyntaxError')) {
          logger.error(`❌ Syntax error in ${script.name}: ${stderr}`);
        } else {
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

    return { validatedCount, totalScripts: scripts.length };
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

module.exports = pythonService;










