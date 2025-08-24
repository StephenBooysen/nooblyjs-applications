/**
 * @fileoverview Infrastructure Application
 * Factory module for creating a infrastructure application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');

/**
 * Creates the Infrastructure Application
 * Automatically configures routes and views for the marketing application.
 * @param {Object} options - Provider-specific configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 */
module.exports = (options, eventEmitter) => {
  Routes(options, eventEmitter);
  Views(options, eventEmitter);
}
