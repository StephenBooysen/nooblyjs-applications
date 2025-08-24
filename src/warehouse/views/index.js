/**
 * @fileoverview Warehouse service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving 
 * warehouse for the warehouse service. 
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
 * Registers Warehouse service views with the Express application.
 * 
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @returns {void}
 */
module.exports = (options, eventEmitter, logger) => {
  const app = options['express-app'];
  app.use('/applications/warehouse', express.static(path.join(__dirname)));
};