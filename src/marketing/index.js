/**
 * @fileoverview Marketing Application
 * Factory module for creating a Marketing application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');

/**
 * Creates the Marketing service
 * 
 * @param {string} type - The logging provider type ('console', 'file')
 * @param {Object} options - Provider-specific configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 */
module.exports = (options, eventEmitter) => {
  Routes(options, eventEmitter);
  Views(options, eventEmitter);
}
