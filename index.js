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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const eventEmitter = new EventEmitter()
patchEmitter(eventEmitter);

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

app.use(session({
  secret: 'admin-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

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

/**
 * Patch event emitter to capture all events for debugging
 */
function patchEmitter(eventEmitter) {
  const originalEmit = eventEmitter.emit;
  eventEmitter.emit = function () {
    const eventName = arguments[0];
    const args = Array.from(arguments).slice(1);
    console.log(`Caught event: "${eventName}" with arguments:`, args);
    return originalEmit.apply(this, arguments);
  };
}

// Launch the wiki
app.use(express.static(path.join(__dirname, 'public')));

const customerservice = require(path.join(__dirname, '/src/customerservice'))({'express-app': app}, eventEmitter);
const delivery = require(path.join(__dirname, '/src/delivery'))({'express-app': app}, eventEmitter);
const infrastructure = require(path.join(__dirname, '/src/infrastructure'))({'express-app': app}, eventEmitter);
const marketing = require(path.join(__dirname, '/src/marketing'))({'express-app': app}, eventEmitter);
const warehouse = require(path.join(__dirname, '/src/warehouse'))({'express-app': app}, eventEmitter);
const wiki = require(path.join(__dirname, '/src/wiki'))({'express-app': app}, eventEmitter);

app.listen(PORT, () => {
  console.log(`Nooblyjs Applications Server running on port ${PORT}`);
});