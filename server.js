const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const serviceRegistry = require('noobly-core');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

serviceRegistry.initialize(app);
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

app.use(express.static(path.join(__dirname, 'public')));
app.use('/ui-template', express.static(path.join(__dirname, 'ui-template')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  //if (username === 'admin' && password === 'password') {
    req.session.authenticated = true;
    res.json({ success: true });
  //} else {
  //  res.status(401).json({ success: false, message: 'Invalid credentials' });
  //}
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.get('/api/servers', (req, res) => {
  res.json([
    { id: 1, name: 'Web Server 01', status: 'running', type: 'Apache', description: 'Main web server handling HTTP requests' },
    { id: 2, name: 'Database Server 01', status: 'running', type: 'MySQL', description: 'Primary database server' },
    { id: 3, name: 'Cache Server 01', status: 'stopped', type: 'Redis', description: 'Redis cache server for session storage' }
  ]);
});

app.get('/api/databases', (req, res) => {
  res.json([
    { id: 1, name: 'UserDB', status: 'running', type: 'PostgreSQL', size: '2.5GB', description: 'User data and authentication' },
    { id: 2, name: 'AnalyticsDB', status: 'running', type: 'MongoDB', size: '1.2GB', description: 'Analytics and reporting data' },
    { id: 3, name: 'LogsDB', status: 'running', type: 'InfluxDB', size: '800MB', description: 'System logs and metrics' }
  ]);
});

app.get('/api/storage', (req, res) => {
  res.json([
    { id: 1, name: 'Primary Storage', status: 'healthy', type: 'SSD', used: '45GB', total: '100GB', description: 'Main application storage' },
    { id: 2, name: 'Backup Storage', status: 'healthy', type: 'HDD', used: '120GB', total: '500GB', description: 'Automated backup storage' },
    { id: 3, name: 'Archive Storage', status: 'healthy', type: 'Cloud', used: '2TB', total: '5TB', description: 'Long-term archive storage' }
  ]);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'servermanagement', 'index.html'));
});

app.get('/servermanagement', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'servermanagement', 'index.html'));
});

// Marketing routes
app.get('/marketing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketing', 'index.html'));
});

app.get('/marketing/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marketing', 'index.html'));
});

app.post('/marketing/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'password') {
    req.session.marketingAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/marketing/logout', (req, res) => {
  req.session.marketingAuthenticated = false;
  res.json({ success: true });
});

app.get('/api/marketing/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session.marketingAuthenticated });
});

app.get('/api/marketing/campaigns', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Summer Sale 2024',
      subject: 'Get 50% Off Summer Collection!',
      status: 'sent',
      segmentId: 1,
      sent: 1250,
      opens: 425,
      clicks: 89,
      bounces: 23,
      content: '<h1>Summer Sale!</h1><p>Don\'t miss out on our biggest sale of the year. Get 50% off all summer items.</p><a href="#" style="background: #ff6b6b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Shop Now</a>',
      createdAt: '2024-06-15T10:00:00Z'
    },
    {
      id: 2,
      name: 'Product Launch - Smart Watch',
      subject: 'Introducing Our Latest Smart Watch',
      status: 'sent',
      segmentId: 2,
      sent: 890,
      opens: 267,
      clicks: 45,
      bounces: 12,
      content: '<h1>New Smart Watch</h1><p>Experience the future on your wrist with our latest smart watch featuring advanced health monitoring.</p><img src="https://via.placeholder.com/300x200" alt="Smart Watch"><a href="#" style="background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Learn More</a>',
      createdAt: '2024-06-10T14:30:00Z'
    },
    {
      id: 3,
      name: 'Weekly Newsletter #24',
      subject: 'Your Weekly Update',
      status: 'scheduled',
      segmentId: 3,
      sent: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      content: '<h1>Weekly Newsletter</h1><p>Stay updated with the latest news and updates from our team.</p>',
      createdAt: '2024-06-20T09:00:00Z'
    }
  ]);
});

app.get('/api/marketing/segments', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Premium Customers',
      description: 'Customers who have made purchases over $500',
      customerCount: 1250,
      createdAt: '2024-05-01T10:00:00Z'
    },
    {
      id: 2,
      name: 'Tech Enthusiasts',
      description: 'Customers interested in technology products',
      customerCount: 890,
      createdAt: '2024-05-15T14:30:00Z'
    },
    {
      id: 3,
      name: 'Newsletter Subscribers',
      description: 'All newsletter subscribers',
      customerCount: 3420,
      createdAt: '2024-04-01T09:00:00Z'
    },
    {
      id: 4,
      name: 'Mobile App Users',
      description: 'Customers who use our mobile app',
      customerCount: 567,
      createdAt: '2024-05-20T16:45:00Z'
    }
  ]);
});

app.get('/api/marketing/campaigns/:id/recipients', (req, res) => {
  const campaignId = parseInt(req.params.id);
  
  // Sample recipients data based on campaign
  const recipients = [
    {
      id: 1,
      email: 'john.doe@example.com',
      name: 'John Doe',
      status: 'clicked',
      sentAt: '2024-06-15T10:15:00Z',
      openedAt: '2024-06-15T11:30:00Z',
      clickedAt: '2024-06-15T11:35:00Z'
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      status: 'opened',
      sentAt: '2024-06-15T10:15:00Z',
      openedAt: '2024-06-15T14:20:00Z',
      clickedAt: null
    },
    {
      id: 3,
      email: 'bob.wilson@example.com',
      name: 'Bob Wilson',
      status: 'sent',
      sentAt: '2024-06-15T10:15:00Z',
      openedAt: null,
      clickedAt: null
    },
    {
      id: 4,
      email: 'sarah.jones@example.com',
      name: 'Sarah Jones',
      status: 'bounced',
      sentAt: '2024-06-15T10:15:00Z',
      openedAt: null,
      clickedAt: null
    },
    {
      id: 5,
      email: 'mike.brown@example.com',
      name: 'Mike Brown',
      status: 'clicked',
      sentAt: '2024-06-15T10:15:00Z',
      openedAt: '2024-06-15T16:45:00Z',
      clickedAt: '2024-06-15T16:50:00Z'
    }
  ];
  
  res.json(recipients);
});

app.get('/api/marketing/segments/:id/customers', (req, res) => {
  const segmentId = parseInt(req.params.id);
  
  // Sample customers data based on segment
  const customers = [
    {
      id: 1,
      email: 'premium1@example.com',
      name: 'Premium Customer 1',
      status: 'active',
      addedDate: '2024-05-01'
    },
    {
      id: 2,
      email: 'premium2@example.com',
      name: 'Premium Customer 2',
      status: 'active',
      addedDate: '2024-05-05'
    },
    {
      id: 3,
      email: 'premium3@example.com',
      name: 'Premium Customer 3',
      status: 'bounced',
      addedDate: '2024-05-10'
    },
    {
      id: 4,
      email: 'premium4@example.com',
      name: 'Premium Customer 4',
      status: 'active',
      addedDate: '2024-05-15'
    }
  ];
  
  res.json(customers);
});

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

// Delivery routes
app.get('/delivery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delivery', 'index.html'));
});

app.get('/delivery/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delivery', 'index.html'));
});

app.post('/delivery/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'password') {
    req.session.deliveryAuthenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/delivery/logout', (req, res) => {
  req.session.deliveryAuthenticated = false;
  res.json({ success: true });
});

app.get('/api/delivery/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session.deliveryAuthenticated });
});

app.get('/api/delivery/orders', (req, res) => {
  res.json([
    {
      id: 2001,
      customerName: 'John Smith',
      phoneNumber: '+1 (555) 123-4567',
      address: '123 Main Street, Downtown, New York, NY 10001',
      status: 'waiting',
      priority: 'high',
      orderTime: '2024-07-11T08:30:00Z',
      startDeliveryTime: null,
      deliveredTime: null,
      items: ['Pizza Margherita', 'Coca Cola', 'Garlic Bread']
    },
    {
      id: 2002,
      customerName: 'Sarah Johnson',
      phoneNumber: '+1 (555) 234-5678',
      address: '456 Oak Avenue, Midtown, New York, NY 10002',
      status: 'delivery',
      priority: 'medium',
      orderTime: '2024-07-11T09:15:00Z',
      startDeliveryTime: '2024-07-11T10:00:00Z',
      deliveredTime: null,
      items: ['Chicken Burger', 'French Fries', 'Milkshake']
    },
    {
      id: 2003,
      customerName: 'Mike Brown',
      phoneNumber: '+1 (555) 345-6789',
      address: '789 Pine Street, Uptown, New York, NY 10003',
      status: 'delivered',
      priority: 'low',
      orderTime: '2024-07-11T07:45:00Z',
      startDeliveryTime: '2024-07-11T08:30:00Z',
      deliveredTime: '2024-07-11T09:15:00Z',
      items: ['Sushi Combo', 'Miso Soup', 'Green Tea']
    },
    {
      id: 2004,
      customerName: 'Lisa Wilson',
      phoneNumber: '+1 (555) 456-7890',
      address: '321 Elm Street, Brooklyn, New York, NY 11201',
      status: 'waiting',
      priority: 'high',
      orderTime: '2024-07-11T10:20:00Z',
      startDeliveryTime: null,
      deliveredTime: null,
      items: ['Thai Curry', 'Jasmine Rice', 'Spring Rolls']
    },
    {
      id: 2005,
      customerName: 'David Chen',
      phoneNumber: '+1 (555) 567-8901',
      address: '654 Maple Drive, Queens, New York, NY 11101',
      status: 'delivery',
      priority: 'medium',
      orderTime: '2024-07-11T11:00:00Z',
      startDeliveryTime: '2024-07-11T11:30:00Z',
      deliveredTime: null,
      items: ['Mexican Tacos', 'Guacamole', 'Corona Beer']
    },
    {
      id: 2006,
      customerName: 'Emma Davis',
      phoneNumber: '+1 (555) 678-9012',
      address: '987 Cedar Lane, Bronx, New York, NY 10451',
      status: 'waiting',
      priority: 'medium',
      orderTime: '2024-07-11T11:45:00Z',
      startDeliveryTime: null,
      deliveredTime: null,
      items: ['Indian Biryani', 'Naan Bread', 'Lassi']
    },
    {
      id: 2007,
      customerName: 'Robert Taylor',
      phoneNumber: '+1 (555) 789-0123',
      address: '159 Birch Road, Staten Island, New York, NY 10301',
      status: 'delivered',
      priority: 'low',
      orderTime: '2024-07-10T18:30:00Z',
      startDeliveryTime: '2024-07-10T19:00:00Z',
      deliveredTime: '2024-07-10T19:45:00Z',
      items: ['Italian Pasta', 'Caesar Salad', 'Tiramisu']
    },
    {
      id: 2008,
      customerName: 'Jennifer White',
      phoneNumber: '+1 (555) 890-1234',
      address: '753 Willow Street, Manhattan, New York, NY 10004',
      status: 'waiting',
      priority: 'high',
      orderTime: '2024-07-11T12:15:00Z',
      startDeliveryTime: null,
      deliveredTime: null,
      items: ['Greek Gyros', 'Tzatziki Sauce', 'Pita Bread']
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});