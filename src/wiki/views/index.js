/**
 * @fileoverview Wiki service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving 
 * capabilities for the Wiki service. It registers static routes to serve
 * Wiki-related view files and templates through the Express application.
 * 
 * @author NooblyJS
 * @version 1.0.0
 * @module Wiki
 */

'use strict';

const path = require('path');
const express = require('express');

/**
 * Wiki service views module for noobly-applications framework.
 * This module provides Express.js view registration and static file serving 
 * capabilities for the Wiki service. It registers static routes to serve
 * Wiki-related view files and templates through the Express application..
 * 
 * @function
 * @param {Object} options - Configuration options for the views setup
 * @param {express.Application} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter instance for inter-service communication
 * @returns {void}
 */
module.exports = (options, eventEmitter, logger) => {
  const app = options['express-app'];
  app.use('/wiki', express.static(path.join(__dirname)));
};