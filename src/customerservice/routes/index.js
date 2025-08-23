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
 
  // Service routes
  app.get('/customerservice', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customerservice', 'index.html'));
  });
  
  app.get('/customerservice/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customerservice', 'index.html'));
  });
  
  app.post('/customerservice/login', (req, res) => {
    const { username, password } = req.body;
  
    if (username === 'admin' && password === 'password') {
      req.session.serviceAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
  
  app.post('/customerservice/logout', (req, res) => {
    req.session.serviceAuthenticated = false;
    res.json({ success: true });
  });
  
  app.get('/api/customerservice/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.serviceAuthenticated });
  });
  
  app.get('/api/customerservice/cases', (req, res) => {
    res.json([
      {
        id: 1,
        customerName: 'John Smith',
        customerEmail: 'john.smith@email.com',
        subject: 'Cannot login to account',
        priority: 'critical',
        status: 'new',
        queue: 'Login',
        createdAt: '2024-07-11T08:30:00Z',
        comments: [
          {
            id: 1,
            author: 'John Smith',
            text: 'I have been trying to login for the past hour but keep getting an error message saying my credentials are invalid. I know my password is correct.',
            createdAt: '2024-07-11T08:30:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'Thank you for contacting us. I can see there might be an issue with your account. Let me investigate this for you.',
            createdAt: '2024-07-11T09:15:00Z'
          }
        ]
      },
      {
        id: 2,
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah.j@email.com',
        subject: 'Order #12345 not received',
        priority: 'high',
        status: 'inprogress',
        queue: 'Orders',
        createdAt: '2024-07-10T14:20:00Z',
        comments: [
          {
            id: 1,
            author: 'Sarah Johnson',
            text: 'I placed order #12345 three days ago but it has not arrived yet. The tracking shows it was delivered but I never received it.',
            createdAt: '2024-07-10T14:20:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'I apologize for the inconvenience. I am checking with our delivery partner to locate your package.',
            createdAt: '2024-07-10T15:45:00Z'
          }
        ]
      },
      {
        id: 3,
        customerName: 'Mike Brown',
        customerEmail: 'mike.brown@email.com',
        subject: 'Delivery damaged package',
        priority: 'medium',
        status: 'new',
        queue: 'Deliveries',
        createdAt: '2024-07-11T10:15:00Z',
        comments: [
          {
            id: 1,
            author: 'Mike Brown',
            text: 'My package arrived today but the box was completely crushed and the items inside are damaged.',
            createdAt: '2024-07-11T10:15:00Z'
          }
        ]
      },
      {
        id: 4,
        customerName: 'Lisa Wilson',
        customerEmail: 'lisa.w@email.com',
        subject: 'Payment failed but money deducted',
        priority: 'critical',
        status: 'new',
        queue: 'Payments',
        createdAt: '2024-07-11T11:45:00Z',
        comments: [
          {
            id: 1,
            author: 'Lisa Wilson',
            text: 'I tried to make a payment for my order but the transaction failed. However, the money was still deducted from my bank account.',
            createdAt: '2024-07-11T11:45:00Z'
          }
        ]
      },
      {
        id: 5,
        customerName: 'David Chen',
        customerEmail: 'david.chen@email.com',
        subject: 'Refund request for cancelled order',
        priority: 'medium',
        status: 'done',
        queue: 'Refunds',
        createdAt: '2024-07-09T16:30:00Z',
        comments: [
          {
            id: 1,
            author: 'David Chen',
            text: 'I cancelled my order #67890 yesterday and would like to request a refund.',
            createdAt: '2024-07-09T16:30:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'Your refund has been processed and should appear in your account within 3-5 business days.',
            createdAt: '2024-07-10T09:20:00Z'
          }
        ]
      },
      {
        id: 6,
        customerName: 'Emma Davis',
        customerEmail: 'emma.davis@email.com',
        subject: 'Wrong item delivered',
        priority: 'high',
        status: 'inprogress',
        queue: 'Deliveries',
        createdAt: '2024-07-10T13:10:00Z',
        comments: [
          {
            id: 1,
            author: 'Emma Davis',
            text: 'I ordered a blue sweater but received a red one instead. Order number is #54321.',
            createdAt: '2024-07-10T13:10:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'I sincerely apologize for the mix-up. I am arranging for the correct item to be sent to you and a return label for the wrong item.',
            createdAt: '2024-07-10T14:30:00Z'
          }
        ]
      },
      {
        id: 7,
        customerName: 'Robert Taylor',
        customerEmail: 'rob.taylor@email.com',
        subject: 'Account locked after password reset',
        priority: 'medium',
        status: 'new',
        queue: 'Login',
        createdAt: '2024-07-11T09:45:00Z',
        comments: [
          {
            id: 1,
            author: 'Robert Taylor',
            text: 'I reset my password using the forgot password feature, but now my account seems to be locked.',
            createdAt: '2024-07-11T09:45:00Z'
          }
        ]
      },
      {
        id: 8,
        customerName: 'Jennifer White',
        customerEmail: 'jen.white@email.com',
        subject: 'Duplicate charge on credit card',
        priority: 'high',
        status: 'new',
        queue: 'Payments',
        createdAt: '2024-07-11T12:20:00Z',
        comments: [
          {
            id: 1,
            author: 'Jennifer White',
            text: 'I was charged twice for the same order. I can see two identical charges on my credit card statement.',
            createdAt: '2024-07-11T12:20:00Z'
          }
        ]
      }
    ]);
  });
  
  app.get('/api/customerservice/cases/:id', (req, res) => {
    const caseId = parseInt(req.params.id);
  
    // Get all cases and find the specific one
    const cases = [
      {
        id: 1,
        customerName: 'John Smith',
        customerEmail: 'john.smith@email.com',
        subject: 'Cannot login to account',
        priority: 'critical',
        status: 'new',
        queue: 'Login',
        createdAt: '2024-07-11T08:30:00Z',
        comments: [
          {
            id: 1,
            author: 'John Smith',
            text: 'I have been trying to login for the past hour but keep getting an error message saying my credentials are invalid. I know my password is correct.',
            createdAt: '2024-07-11T08:30:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'Thank you for contacting us. I can see there might be an issue with your account. Let me investigate this for you.',
            createdAt: '2024-07-11T09:15:00Z'
          }
        ]
      },
      {
        id: 2,
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah.j@email.com',
        subject: 'Order #12345 not received',
        priority: 'high',
        status: 'inprogress',
        queue: 'Orders',
        createdAt: '2024-07-10T14:20:00Z',
        comments: [
          {
            id: 1,
            author: 'Sarah Johnson',
            text: 'I placed order #12345 three days ago but it has not arrived yet. The tracking shows it was delivered but I never received it.',
            createdAt: '2024-07-10T14:20:00Z'
          },
          {
            id: 2,
            author: 'Support Agent',
            text: 'I apologize for the inconvenience. I am checking with our delivery partner to locate your package.',
            createdAt: '2024-07-10T15:45:00Z'
          }
        ]
      }
    ];
  
    const foundCase = cases.find(c => c.id === caseId);
    if (foundCase) {
      res.json(foundCase);
    } else {
      res.status(404).json({ error: 'Case not found' });
    }
  });

};
