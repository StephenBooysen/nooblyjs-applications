/**
 * @fileoverview Marketing service views module for noobly-core framework.
 * This module provides Express.js view registration and static file serving 
 * capabilities for the Marketing application.
 * 
 * @author NooblyJS
 * @version 1.0.14
 * @since 1.0.0
 * @module Marketing
 */

'use strict';

const path = require('path');
const express = require('express');

/**
 * Registers Marketing application views with the Express application.
 * Sets up static file serving for marketing-related view templates and assets.
 * This function integrates the marketing application views into the main Express
 * application by mounting static file middleware at the '/marketing' route.
 * 
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @returns {void}
 */
module.exports = (options, eventEmitter) => {
  const app = options['express-app'];
  app.use('/applications/marketing', express.static(path.join(__dirname)));
};