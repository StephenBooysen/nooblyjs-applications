/**
 * @fileoverview Logging API routes for Express.js application.
 * Provides RESTful endpoints for structured logging operations including
 * info, warning, error level logging, and service status monitoring.
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';
const path = require('path')

/**
 * Configures and registers wiki routes with the Express application.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @return {void}
 */
module.exports = (options, eventEmitter) => {

  const app = options['express-app'];

  // Warehouse routes
  app.get('/warehouse', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'warehouse', 'index.html'));
  });

  app.get('/warehouse/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'warehouse', 'index.html'));
  });

  app.post('/warehouse/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password') {
      req.session.warehouseAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.post('/warehouse/logout', (req, res) => {
    req.session.warehouseAuthenticated = false;
    res.json({ success: true });
  });

  app.get('/api/warehouse/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.warehouseAuthenticated });
  });

  app.get('/api/warehouse/orders', (req, res) => {
    res.json([
      {
        id: 1001,
        customerName: 'John Smith',
        status: 'picking',
        priority: 'high',
        createdAt: '2024-07-11T08:30:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU001', name: 'Wireless Headphones', quantity: 2, pickedQuantity: 0, pickStatus: 'Pending' },
          { sku: 'SKU002', name: 'USB Cable', quantity: 3, pickedQuantity: 0, pickStatus: 'Pending' },
          { sku: 'SKU003', name: 'Phone Case', quantity: 1, pickedQuantity: 0, pickStatus: 'Pending' }
        ]
      },
      {
        id: 1002,
        customerName: 'Sarah Johnson',
        status: 'waiting',
        priority: 'medium',
        createdAt: '2024-07-11T09:15:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU004', name: 'Bluetooth Speaker', quantity: 1, pickedQuantity: 0, pickStatus: 'Pending' },
          { sku: 'SKU005', name: 'Power Bank', quantity: 2, pickedQuantity: 0, pickStatus: 'Pending' }
        ]
      },
      {
        id: 1003,
        customerName: 'Mike Brown',
        status: 'packing',
        priority: 'high',
        createdAt: '2024-07-11T07:45:00Z',
        hasShortPicks: true,
        items: [
          { sku: 'SKU006', name: 'Smart Watch', quantity: 1, pickedQuantity: 1, pickStatus: 'Picked' },
          { sku: 'SKU007', name: 'Screen Protector', quantity: 2, pickedQuantity: 1, pickStatus: 'Short Pick' }
        ]
      },
      {
        id: 1004,
        customerName: 'Lisa Wilson',
        status: 'despatching',
        priority: 'medium',
        createdAt: '2024-07-10T16:20:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU008', name: 'Laptop Stand', quantity: 1, pickedQuantity: 1, pickStatus: 'Picked' },
          { sku: 'SKU009', name: 'Wireless Mouse', quantity: 1, pickedQuantity: 1, pickStatus: 'Picked' }
        ]
      },
      {
        id: 1005,
        customerName: 'David Chen',
        status: 'despatched',
        priority: 'low',
        createdAt: '2024-07-10T14:10:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU010', name: 'Desk Lamp', quantity: 1, pickedQuantity: 1, pickStatus: 'Picked' }
        ]
      },
      {
        id: 1006,
        customerName: 'Emma Davis',
        status: 'picking',
        priority: 'high',
        createdAt: '2024-07-11T10:00:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU011', name: 'Gaming Keyboard', quantity: 1, pickedQuantity: 0, pickStatus: 'Pending' },
          { sku: 'SKU012', name: 'Gaming Mouse Pad', quantity: 1, pickedQuantity: 0, pickStatus: 'Pending' }
        ]
      },
      {
        id: 1007,
        customerName: 'Robert Taylor',
        status: 'waiting',
        priority: 'medium',
        createdAt: '2024-07-11T11:30:00Z',
        hasShortPicks: false,
        items: [
          { sku: 'SKU013', name: 'Monitor Stand', quantity: 1, pickedQuantity: 0, pickStatus: 'Pending' },
          { sku: 'SKU014', name: 'HDMI Cable', quantity: 2, pickedQuantity: 0, pickStatus: 'Pending' }
        ]
      }
    ]);
  });

  app.get('/api/warehouse/inventory', (req, res) => {
    res.json([
      {
        id: 1,
        name: 'Wireless Headphones',
        sku: 'SKU001',
        location: 'A1-B2-C3',
        stock: 45,
        description: 'Premium wireless headphones with noise cancellation'
      },
      {
        id: 2,
        name: 'USB Cable',
        sku: 'SKU002',
        location: 'A2-B1-C5',
        stock: 120,
        description: 'USB-C to USB-A cable, 2 meters'
      },
      {
        id: 3,
        name: 'Phone Case',
        sku: 'SKU003',
        location: 'A1-B3-C1',
        stock: 78,
        description: 'Protective silicone phone case'
      },
      {
        id: 4,
        name: 'Bluetooth Speaker',
        sku: 'SKU004',
        location: 'A3-B2-C4',
        stock: 32,
        description: 'Portable Bluetooth speaker with 12-hour battery'
      },
      {
        id: 5,
        name: 'Power Bank',
        sku: 'SKU005',
        location: 'A2-B3-C2',
        stock: 55,
        description: '10000mAh portable power bank'
      },
      {
        id: 6,
        name: 'Smart Watch',
        sku: 'SKU006',
        location: 'A1-B1-C4',
        stock: 28,
        description: 'Fitness tracking smart watch'
      },
      {
        id: 7,
        name: 'Screen Protector',
        sku: 'SKU007',
        location: 'A2-B2-C1',
        stock: 15,
        description: 'Tempered glass screen protector'
      },
      {
        id: 8,
        name: 'Laptop Stand',
        sku: 'SKU008',
        location: 'A3-B1-C3',
        stock: 22,
        description: 'Adjustable aluminum laptop stand'
      },
      {
        id: 9,
        name: 'Wireless Mouse',
        sku: 'SKU009',
        location: 'A1-B2-C5',
        stock: 67,
        description: 'Ergonomic wireless mouse'
      },
      {
        id: 10,
        name: 'Desk Lamp',
        sku: 'SKU010',
        location: 'A3-B3-C2',
        stock: 19,
        description: 'LED desk lamp with adjustable brightness'
      },
      {
        id: 11,
        name: 'Gaming Keyboard',
        sku: 'SKU011',
        location: 'A2-B1-C4',
        stock: 35,
        description: 'Mechanical gaming keyboard with RGB lighting'
      },
      {
        id: 12,
        name: 'Gaming Mouse Pad',
        sku: 'SKU012',
        location: 'A1-B3-C3',
        stock: 89,
        description: 'Large gaming mouse pad with anti-slip base'
      },
      {
        id: 13,
        name: 'Monitor Stand',
        sku: 'SKU013',
        location: 'A3-B2-C1',
        stock: 18,
        description: 'Dual monitor adjustable stand'
      },
      {
        id: 14,
        name: 'HDMI Cable',
        sku: 'SKU014',
        location: 'A2-B3-C5',
        stock: 95,
        description: 'HDMI 2.1 cable, 3 meters'
      }
    ]);
  });

};
