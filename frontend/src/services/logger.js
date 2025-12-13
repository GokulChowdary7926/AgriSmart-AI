class FrontendLogger {
  constructor() {
    this.levels = ['debug', 'info', 'warn', 'error'];
    this.currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
    this.logHistory = [];
    this.maxHistory = 100;
  }

  setLevel(level) {
    if (this.levels.includes(level)) {
      this.currentLevel = level;
    }
  }

  shouldLog(level) {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.currentLevel);
  }

  log(level, message, data = {}) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.shift();
    }

    const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    const styles = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red; font-weight: bold'
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`%c${consoleMessage}`, styles[level], data);
    } else {
      if (level === 'error' || level === 'warn') {
        console[level](consoleMessage, data);
      }
      
      this.sendToBackend(logEntry);
    }
  }

  async sendToBackend(logEntry) {
    try {
      if (process.env.NODE_ENV === 'production' && 
          (logEntry.level === 'error' || logEntry.level === 'warn')) {
        await fetch('/api/logs/client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
          keepalive: true // Ensure it sends even if page is unloading
        });
      }
    } catch (error) {
      console.error('Failed to send log to backend:', error);
    }
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  error(message, error = null, data = {}) {
    const errorData = {
      ...data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    this.log('error', message, errorData);
  }

  apiCall(endpoint, method, status, duration, data = {}) {
    this.info('API Call', {
      endpoint,
      method,
      status,
      duration,
      ...data
    });
  }

  componentMount(componentName, props = {}) {
    this.debug(`Component mounted: ${componentName}`, { props });
  }

  componentError(componentName, error, info) {
    this.error(`Component error: ${componentName}`, error, { info });
  }

  getHistory() {
    return [...this.logHistory];
  }

  clearHistory() {
    this.logHistory = [];
  }
}

const logger = new FrontendLogger();

export default logger;

export const useLogger = (componentName) => {
  const React = require('react');
  const loggerRef = React.useRef({
    mount: () => logger.componentMount(componentName),
    error: (error, info) => logger.componentError(componentName, error, info),
    debug: (message, data) => logger.debug(`[${componentName}] ${message}`, data),
    info: (message, data) => logger.info(`[${componentName}] ${message}`, data),
    warn: (message, data) => logger.warn(`[${componentName}] ${message}`, data),
    errorMsg: (message, error, data) => logger.error(`[${componentName}] ${message}`, error, data)
  });

  React.useEffect(() => {
    loggerRef.current.mount();
    return () => {
      logger.debug(`Component unmounted: ${componentName}`);
    };
  }, [componentName]);

  return loggerRef.current;
};






