const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

module.exports = function(options, eventEmitter, serviceRegistry) {
    const router = express.Router();
    const dataserve = serviceRegistry.dataServe('memory');
    const cache = serviceRegistry.cache('memory');
    const logger = serviceRegistry.logger('console');
    
    // Serve static files (CSS, JS, etc.)
    router.use('/css', express.static(path.join(__dirname, '../views/css')));
    router.use('/js', express.static(path.join(__dirname, '../views/js')));
    
    // Initialize containers
    dataserve.createContainer('orders').catch(() => {});
    dataserve.createContainer('inventory').catch(() => {});
    dataserve.createContainer('users').catch(() => {});
    dataserve.createContainer('sessions').catch(() => {});
    
    // Middleware for session management
    const requireAuth = async (req, res, next) => {
        const sessionId = req.headers['x-session-id'];
        if (!sessionId) {
            return res.status(401).json({ error: 'Session ID required' });
        }
        
        try {
            const sessions = await dataserve.jsonFind('sessions', session => session.sessionId === sessionId);
            if (sessions.length === 0 || sessions[0].expiresAt < Date.now()) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }
            req.user = sessions[0].user;
            next();
        } catch (error) {
            res.status(500).json({ error: 'Session validation failed' });
        }
    };
    
    // Initialize sample data
    const initializeSampleData = async () => {
        try {
            // Check if data already exists
            const existingOrders = await dataserve.jsonFind('orders', () => true);
            if (existingOrders.length === 0) {
                // Create sample orders
                const sampleOrders = [
                    {
                        id: 'ORD-001',
                        customerName: 'Acme Corporation',
                        status: 'new',
                        priority: 'high',
                        createdAt: new Date().toISOString(),
                        hasShortPicks: false,
                        items: [
                            { sku: 'SKU-001', name: 'Widget A', quantity: 5, pickedQuantity: 0, pickStatus: 'pending', location: 'A1-B2-C3' },
                            { sku: 'SKU-002', name: 'Widget B', quantity: 2, pickedQuantity: 0, pickStatus: 'pending', location: 'A2-B1-C2' }
                        ],
                        metadata: {
                            shipping: { method: 'express', address: '123 Main St, City, State' },
                            specialInstructions: 'Handle with care'
                        }
                    },
                    {
                        id: 'ORD-002',
                        customerName: 'Beta Industries',
                        status: 'picking',
                        priority: 'medium',
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        hasShortPicks: true,
                        items: [
                            { sku: 'SKU-003', name: 'Gadget C', quantity: 3, pickedQuantity: 2, pickStatus: 'short_pick', location: 'B1-C2-D3' }
                        ],
                        metadata: {
                            shipping: { method: 'standard', address: '456 Oak Ave, Town, State' },
                            specialInstructions: ''
                        }
                    },
                    {
                        id: 'ORD-003',
                        customerName: 'Gamma Solutions',
                        status: 'despatched',
                        priority: 'low',
                        createdAt: new Date(Date.now() - 172800000).toISOString(),
                        hasShortPicks: false,
                        items: [
                            { sku: 'SKU-001', name: 'Widget A', quantity: 1, pickedQuantity: 1, pickStatus: 'picked', location: 'A1-B2-C3' }
                        ],
                        metadata: {
                            shipping: { method: 'standard', address: '789 Pine St, Village, State' },
                            specialInstructions: 'Fragile items'
                        }
                    }
                ];
                
                for (const order of sampleOrders) {
                    await dataserve.add('orders', order);
                }
                
                // Create sample inventory
                const sampleInventory = [
                    {
                        id: 'INV-001',
                        name: 'Widget A',
                        sku: 'SKU-001',
                        location: 'A1-B2-C3',
                        stock: 150,
                        description: 'Premium quality widget with enhanced features',
                        stockLevel: 'high',
                        lastUpdated: new Date().toISOString(),
                        reorderPoint: 20,
                        supplierInfo: { name: 'Widget Supplier Inc', leadTime: 7 }
                    },
                    {
                        id: 'INV-002',
                        name: 'Widget B',
                        sku: 'SKU-002',
                        location: 'A2-B1-C2',
                        stock: 45,
                        description: 'Standard widget for general use',
                        stockLevel: 'medium',
                        lastUpdated: new Date().toISOString(),
                        reorderPoint: 15,
                        supplierInfo: { name: 'Widget Supplier Inc', leadTime: 5 }
                    },
                    {
                        id: 'INV-003',
                        name: 'Gadget C',
                        sku: 'SKU-003',
                        location: 'B1-C2-D3',
                        stock: 8,
                        description: 'Advanced gadget with smart features',
                        stockLevel: 'low',
                        lastUpdated: new Date().toISOString(),
                        reorderPoint: 10,
                        supplierInfo: { name: 'Gadget Corp', leadTime: 14 }
                    }
                ];
                
                for (const item of sampleInventory) {
                    await dataserve.add('inventory', item);
                }
                
                logger.info('Sample warehouse data initialized');
            }
        } catch (error) {
            logger.error('Error initializing sample data:', error);
        }
    };
    
    // Initialize sample data on startup
    initializeSampleData();

    // Static routes
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/index.html'));
    });
    
    router.get('/orders', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/orders.html'));
    });
    
    router.get('/picking', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/picking.html'));
    });
    
    router.get('/inventory', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/inventory.html'));
    });
    
    router.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/login.html'));
    });
    
    // Health check endpoint
    router.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Authentication API
    router.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Simple authentication (in production, use proper password hashing)
            if (username === 'admin' && password === 'password') {
                const sessionId = uuidv4();
                const user = { id: 'admin', username: 'admin', role: 'manager' };
                
                await dataserve.add('sessions', {
                    sessionId,
                    user,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                });
                
                res.json({ success: true, sessionId, user });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.post('/api/auth/logout', async (req, res) => {
        try {
            const sessionId = req.headers['x-session-id'];
            if (sessionId) {
                const sessions = await dataserve.jsonFind('sessions', session => session.sessionId === sessionId);
                if (sessions.length > 0) {
                    // In a real implementation, you'd delete the session
                    // For now, we'll just mark it as expired
                }
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.get('/api/auth/check', async (req, res) => {
        try {
            const sessionId = req.headers['x-session-id'];
            if (!sessionId) {
                return res.json({ authenticated: false });
            }
            
            const sessions = await dataserve.jsonFind('sessions', session => session.sessionId === sessionId);
            if (sessions.length === 0 || sessions[0].expiresAt < Date.now()) {
                return res.json({ authenticated: false });
            }
            
            res.json({ authenticated: true, user: sessions[0].user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Order Management API
    router.get('/api/orders', async (req, res) => {
        try {
            const { status, priority, search } = req.query;
            let orders = await dataserve.jsonFind('orders', () => true);
            
            // Apply filters
            if (status) {
                orders = orders.filter(order => order.status === status);
            }
            if (priority) {
                orders = orders.filter(order => order.priority === priority);
            }
            if (search) {
                orders = orders.filter(order => 
                    order.customerName.toLowerCase().includes(search.toLowerCase()) ||
                    order.id.toLowerCase().includes(search.toLowerCase())
                );
            }
            
            res.json(orders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.get('/api/orders/:id', async (req, res) => {
        try {
            const orders = await dataserve.jsonFind('orders', order => order.id === req.params.id);
            if (orders.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            res.json(orders[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/api/orders', async (req, res) => {
        try {
            const order = {
                id: `ORD-${Date.now()}`,
                ...req.body,
                status: req.body.status || 'new',
                createdAt: new Date().toISOString(),
                hasShortPicks: false
            };
            const newOrder = await dataserve.add('orders', order);
            res.json(newOrder);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.put('/api/orders/:id/status', async (req, res) => {
        try {
            const { status } = req.body;
            const orders = await dataserve.jsonFind('orders', order => order.id === req.params.id);
            
            if (orders.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            // Update order status
            const order = orders[0];
            order.status = status;
            order.updatedAt = new Date().toISOString();
            
            // In a real implementation, you'd update the stored order
            // For now, we'll emit an event for real-time updates
            eventEmitter.emit('order-status-updated', { orderId: order.id, status });
            
            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Picking API
    router.get('/api/picking/orders', async (req, res) => {
        try {
            const pickingOrders = await dataserve.jsonFind('orders', order => 
                order.status === 'new' || order.status === 'picking'
            );
            res.json(pickingOrders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.post('/api/picking/orders/:id/start', async (req, res) => {
        try {
            const orders = await dataserve.jsonFind('orders', order => order.id === req.params.id);
            if (orders.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            const order = orders[0];
            order.status = 'picking';
            order.pickingStartedAt = new Date().toISOString();
            
            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.post('/api/picking/orders/:id/items/:sku/pick', async (req, res) => {
        try {
            const { pickedQuantity, pickType } = req.body; // pickType: 'complete', 'partial', 'short'
            const orders = await dataserve.jsonFind('orders', order => order.id === req.params.id);
            
            if (orders.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            const order = orders[0];
            const item = order.items.find(item => item.sku === req.params.sku);
            
            if (!item) {
                return res.status(404).json({ error: 'Item not found in order' });
            }
            
            item.pickedQuantity = pickedQuantity;
            
            if (pickType === 'short' || pickedQuantity < item.quantity) {
                item.pickStatus = 'short_pick';
                order.hasShortPicks = true;
            } else {
                item.pickStatus = 'picked';
            }
            
            // Update inventory
            const inventory = await dataserve.jsonFind('inventory', inv => inv.sku === req.params.sku);
            if (inventory.length > 0) {
                inventory[0].stock -= pickedQuantity;
                inventory[0].lastUpdated = new Date().toISOString();
                
                // Update stock level categorization
                if (inventory[0].stock <= inventory[0].reorderPoint) {
                    inventory[0].stockLevel = 'low';
                } else if (inventory[0].stock <= inventory[0].reorderPoint * 2) {
                    inventory[0].stockLevel = 'medium';
                } else {
                    inventory[0].stockLevel = 'high';
                }
            }
            
            // Check if all items are picked
            const allItemsPicked = order.items.every(item => item.pickStatus !== 'pending');
            if (allItemsPicked) {
                order.status = 'packing';
                order.pickingCompletedAt = new Date().toISOString();
            }
            
            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Inventory API
    router.get('/api/inventory', async (req, res) => {
        try {
            const { stockLevel, search, location } = req.query;
            let items = await dataserve.jsonFind('inventory', () => true);
            
            // Apply filters
            if (stockLevel) {
                items = items.filter(item => item.stockLevel === stockLevel);
            }
            if (search) {
                items = items.filter(item => 
                    item.name.toLowerCase().includes(search.toLowerCase()) ||
                    item.sku.toLowerCase().includes(search.toLowerCase())
                );
            }
            if (location) {
                items = items.filter(item => item.location.includes(location));
            }
            
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.get('/api/inventory/:id', async (req, res) => {
        try {
            const items = await dataserve.jsonFind('inventory', item => item.id === req.params.id);
            if (items.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }
            res.json(items[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/api/inventory', async (req, res) => {
        try {
            const item = {
                id: `INV-${Date.now()}`,
                ...req.body,
                lastUpdated: new Date().toISOString()
            };
            const newItem = await dataserve.add('inventory', item);
            res.json(newItem);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    router.put('/api/inventory/:id/adjust', async (req, res) => {
        try {
            const { adjustment, reason } = req.body;
            const items = await dataserve.jsonFind('inventory', item => item.id === req.params.id);
            
            if (items.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }
            
            const item = items[0];
            item.stock += adjustment;
            item.lastUpdated = new Date().toISOString();
            
            // Log the adjustment (in a real system, you'd store this in an audit table)
            logger.info(`Inventory adjustment: ${item.sku} adjusted by ${adjustment} (${reason})`);
            
            res.json(item);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Analytics API
    router.get('/api/analytics/dashboard', async (req, res) => {
        try {
            const orders = await dataserve.jsonFind('orders', () => true);
            const inventory = await dataserve.jsonFind('inventory', () => true);
            
            const analytics = {
                ordersWaiting: orders.filter(o => o.status === 'new').length,
                ordersInProgress: orders.filter(o => ['picking', 'packing', 'despatching'].includes(o.status)).length,
                ordersCompleted: orders.filter(o => o.status === 'despatched').length,
                shortPicks: orders.filter(o => o.hasShortPicks).length,
                lowStockItems: inventory.filter(i => i.stockLevel === 'low').length,
                totalInventoryValue: inventory.reduce((sum, item) => sum + (item.stock * (item.unitPrice || 10)), 0),
                ordersByStatus: {
                    new: orders.filter(o => o.status === 'new').length,
                    picking: orders.filter(o => o.status === 'picking').length,
                    packing: orders.filter(o => o.status === 'packing').length,
                    despatching: orders.filter(o => o.status === 'despatching').length,
                    despatched: orders.filter(o => o.status === 'despatched').length
                }
            };
            
            res.json(analytics);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};