/**
 * @fileoverview Delivery application views module for noobly-application framework.
 * This module provides Express.js view registration and static file serving 
 * capabilities for the delivvery application. It registers static routes to serve
 * delivery-related view files and templates through the Express application.
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
 * Registers delivery application views with the Express application.
 * Sets up static file serving for delivery-related view templates and assets.
 * This function integrates the delivery application views into the main Express
 * application by mounting static file middleware at the '/applications/delivery' route.
 * 
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @returns {void}
 */
module.exports = (options, eventEmitter, logger) => {
  const app = options['express-app'];
  app.use('/delivery', express.static(path.join(__dirname)));
};