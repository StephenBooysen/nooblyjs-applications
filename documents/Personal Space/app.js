/**
 * @fileoverview The file define and instantiates the various NooblyJS applications.
 *
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-08-24
 */

'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { EventEmitter } = require('events');

// Iniitiate the Web and Api Interface
const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure session middleware before application initialization
app.use(session({
  secret: 'admin-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// initiate the event mechanism
const eventEmitter = new EventEmitter()
function patchEmitter(eventEmitter) {
  const originalEmit = eventEmitter.emit;
  eventEmitter.emit = function () {
    const eventName = arguments[0];
    const args = Array.from(arguments).slice(1);
    console.log(`Caught event: "${eventName}" with arguments:`, args);
    return originalEmit.apply(this, arguments);
  };
}(eventEmitter);

// Initiate the service Registry
const serviceRegistry = require('noobly-core');
serviceRegistry.initialize(app,eventEmitter);

const log = serviceRegistry.logger('console');
const cache = serviceRegistry.cache('memory');
const dataserve = serviceRegistry.dataServe('memory');
const filing = serviceRegistry.filing('local');
const queue = serviceRegistry.queue('memory');
const scheduling = serviceRegistry.scheduling('memory');
const searching = serviceRegistry.searching('memory');
const measuring = serviceRegistry.measuring('memory');
const notifying = serviceRegistry.notifying('memory');
const worker = serviceRegistry.working('memory');
const workflow = serviceRegistry.workflow('memory');

// Initiate the Application Registry
const applicationRegistry = require('./index');
applicationRegistry.initialize(app,eventEmitter,serviceRegistry);

const customerservice = applicationRegistry.getApplication("customerservice");
const delivery = applicationRegistry.getApplication("delivery");
const infrastructure = applicationRegistry.getApplication("infrastructure");
const marketing = applicationRegistry.getApplication("marketing");
const warehouse = applicationRegistry.getApplication("warehouse");
const wiki = applicationRegistry.getApplication("wiki");

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  req.session.authenticated = true;
  res.json({ success: true });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Launch the application manager
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Nooblyjs Applications Server running on port ${PORT}`);
});