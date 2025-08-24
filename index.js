/**
 * @fileoverview NooblyJS Core - Application Registry
 * A powerful set of modular Node.js Applications with singleton pattern.
 */

const EventEmitter = require('events');
const path = require('path');
const serviceRegistry = require('noobly-core');

const {
  createApiKeyAuthMiddleware,
  generateApiKey,
} = require('./src/middleware/apiKeyAuth');

class ApplicatioRegistry {
  constructor() {
    this.applications = new Map();
    this.initialized = false;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initializes the application registry with an Express app
   * @param {Object} expressApp - Express application instance
   * @param {Object} eventEmitter - EventEmitter instance
   * @param {Object} globalOptions - Global configuration options
   */
  initialize(expressApp, eventEmitter, serviceRegistry, globalOptions = {}) {
    if (this.initialized) {s
      return this;
    }

    this.expressApp = expressApp;
    this.eventEmitter = eventEmitter;
    this.serviceRegistry = serviceRegistry;

    this.globalOptions = {
      'express-app': expressApp,
      ...globalOptions,
    };

    // Setup API key authentication if configured
    if (globalOptions.apiKeys && globalOptions.apiKeys.length > 0) {
      this.authMiddleware = createApiKeyAuthMiddleware(
        {
          apiKeys: globalOptions.apiKeys,
          requireApiKey: globalOptions.requireApiKey !== false,
          excludePaths: globalOptions.excludePaths || [
            '/services/*/status',
            '/services/',
            '/services/*/views/*',
          ],
        },
        this.eventEmitter,
      );

      // Store auth config for services to use
      this.globalOptions.authMiddleware = this.authMiddleware;

      // Log API key authentication setup
      this.eventEmitter.emit('api-auth-setup', {
        message: 'API key authentication enabled',
        keyCount: globalOptions.apiKeys.length,
        requireApiKey: globalOptions.requireApiKey !== false,
      });
    }

    // Serve the application registry landing page
    this.expressApp.get('/applications/', (req, res) => {
      res.sendFile(path.join(__dirname, 'src/views', 'index.html'));
    });

    this.initialized = true;
    return this;
  }

  /**
   * Gets or creates a application instance (singleton pattern)
   * @param {string} applicationName - Name of the application
   * @param {Object} options - Application-specific options
   * @returns {Object} Service instance
   */
  getApplication(applicationName, options = {}) {
    
    if (!this.initialized) {
      throw new Error(
        'ApplicationRegistry must be initialized before getting services',
      );
    }

    const applicationKey = `${applicationName}`;

    if (this.applications.has(applicationKey)) {
      return this.services.get(applicationKey);
    }

    const mergedOptions = {
      ...this.globalOptions,
      ...options,
    };

    let application;
    try {
      const applicationFactory = require(`${__dirname}/src/${applicationName}`);
      application = applicationFactory(mergedOptions, this.eventEmitter, this.serviceRegistry);
    } catch (error) {
      throw new Error(
        `Failed to create application '${applicationName}' : ${error.message}`,
      );
    }

    this.applications.set(applicationKey, application);
    return application;
  }

  /**
   * Get the event emitter for inter-application communication
   * @returns {EventEmitter} The global event emitter
   */
  getEventEmitter() {
    return this.eventEmitter;
  }

  /**
   * Lists all initialized applications
   * @returns {Array} Array of application keys
   */
  listSApplications() {
    return Array.from(this.applications.keys());
  }

  /**
   * Generate a new API key
   * @param {number} length - Length of the API key (default: 32)
   * @returns {string} Generated API key
   */
  generateApiKey(length = 32) {
    return generateApiKey(length);
  }

  /**
   * Clears all application instances (useful for testing)
   */
  reset() {
    this.applications.clear();
    this.initialized = false;
    this.eventEmitter.removeAllListeners();
  }
}

// Export singleton instance
const applicationRegistry = new ApplicatioRegistry();

module.exports = applicationRegistry;
