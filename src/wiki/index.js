/**
 * @fileoverview Wiki Application
 * Factory module for creating a Wiki application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');

/**
 * Creates a logging service instance with the specified provider.
 * Automatically configures routes and views for the logging service.
 * @param {string} type - The logging provider type ('console', 'file')
 * @param {Object} options - Provider-specific configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @return {logging|loggingFile} Logging service instance with specified provider
 */
function createLogger(type, options, eventEmitter) {
  let logger;
  
  // Create logger instance based on provider type
  switch (type) {
    case 'file':
      logger = new loggingFile(options, eventEmitter);
      break;
    case 'console':
    default:
      logger = new logging(options, eventEmitter);
      break;
  }
  
  // Initialize routes and views for the logging service
  Routes(options, eventEmitter, logger);
  Views(options, eventEmitter, logger);
  
  return logger;
}

module.exports = createLogger;
