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
const passport = require('passport');
const path = require('path');
const { EventEmitter } = require('events');

// Iniitiate the Web and Api Interface
const app = express();
const PORT = process.env.PORT || 3002;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure session middleware before application initialization
app.use(session({
  secret: 'admin-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Configure Passport
const { configurePassport } = require('./src/auth/passport-config');
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

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

// Add sample data for warehouse application
async function addSampleData() {
    try {
        await dataserve.createContainer('inventory');
        await dataserve.createContainer('orders');

        // Add inventory items
        await dataserve.add('inventory', { id: 'SKU-001', name: 'Laptop', stock: 10, location: 'A1-B2-C3' });
        await dataserve.add('inventory', { id: 'SKU-002', name: 'Mouse', stock: 50, location: 'A1-B2-C4' });
        await dataserve.add('inventory', { id: 'SKU-003', name: 'Keyboard', stock: 30, location: 'A1-B2-C5' });

        // Add orders
        await dataserve.add('orders', { id: '1001', customerName: 'John Doe', status: 'new', priority: 'high', hasShortPicks: false, items: [{ sku: 'SKU-001', quantity: 1 }] });
        await dataserve.add('orders', { id: '1002', customerName: 'Jane Smith', status: 'picking', priority: 'medium', hasShortPicks: false, items: [{ sku: 'SKU-002', quantity: 2 }] });
        await dataserve.add('orders', { id: '1003', customerName: 'Peter Jones', status: 'packing', priority: 'low', hasShortPicks: true, items: [{ sku: 'SKU-003', quantity: 1 }] });
        await dataserve.add('orders', { id: '1004', customerName: 'Mary Williams', status: 'despatching', priority: 'high', hasShortPicks: false, items: [{ sku: 'SKU-001', quantity: 1 }, { sku: 'SKU-002', quantity: 1 }] });
        await dataserve.add('orders', { id: '1005', customerName: 'David Brown', status: 'despatched', priority: 'medium', hasShortPicks: false, items: [{ sku: 'SKU-003', quantity: 2 }] });
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
}
addSampleData();

// Authentication routes
const authRoutes = require('./src/auth/routes');
app.use('/api/auth', authRoutes);

// Launch the application manager
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Nooblyjs Applications Server running on port ${PORT}`);
});