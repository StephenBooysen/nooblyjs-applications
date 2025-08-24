/**
 * @fileoverview Customer Service views module for noobly-application framework.
 * This module provides Express.js view registration and static file serving 
 * capabilities for the customer service application. It registers static routes to serve
 * service-related view files and templates through the Express application.
 * 
 * @author NooblyJS
 * @version 1.0.14
 * @since 1.0.0
 * @module LoggingViews
 */

'use strict';

const path = require('path');
const express = require('express');

/**
 * Registers customer service views with the Express application.
 * Sets up static file serving for service-related view templates and assets.
 * This function integrates the customer service views into the main Express
 * application by mounting static file middleware at the '/applications/customerservice' route.
 * 
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @returns {void}
 */
module.exports = (options, eventEmitter, logger) => {
  const app = options['express-app'];
  app.use('/customerservice', express.static(path.join(__dirname)));
};