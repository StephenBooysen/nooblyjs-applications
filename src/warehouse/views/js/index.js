class WarehouseDashboard {
    constructor() {
        this.orders = [];
        this.inventory = [];
        this.analytics = {};
        this.sessionId = localStorage.getItem('warehouse-session');
        
        // DOM elements
        this.elements = {
            ordersWaiting: document.getElementById('orders-waiting'),
            ordersInProgress: document.getElementById('orders-in-progress'),
            ordersCompleted: document.getElementById('orders-completed'),
            shortPicks: document.getElementById('short-picks'),
            lowStockItems: document.getElementById('low-stock-items'),
            inventoryValue: document.getElementById('inventory-value'),
            
            // Stage counts
            newOrdersCount: document.getElementById('new-orders-count'),
            pickingCount: document.getElementById('picking-count'),
            packingCount: document.getElementById('packing-count'),
            despatchingCount: document.getElementById('despatching-count'),
            despatchedCount: document.getElementById('despatched-count'),
            
            // Queues
            newOrdersQueue: document.getElementById('new-orders-queue'),
            pickingQueue: document.getElementById('picking-queue'),
            packingQueue: document.getElementById('packing-queue'),
            despatchingQueue: document.getElementById('despatching-queue'),
            despatchedQueue: document.getElementById('despatched-queue'),
            
            // Performance metrics
            ordersProcessed: document.getElementById('orders-processed'),
            avgPickTime: document.getElementById('avg-pick-time'),
            pickAccuracy: document.getElementById('pick-accuracy'),
            alertsContainer: document.getElementById('alerts-container'),
            
            // Controls
            refreshBtn: document.getElementById('refresh-pipeline'),
            globalSearch: document.getElementById('global-search')
        };
        
        this.queues = {
            'new': this.elements.newOrdersQueue,
            'picking': this.elements.pickingQueue,
            'packing': this.elements.packingQueue,
            'despatching': this.elements.despatchingQueue,
            'despatched': this.elements.despatchedQueue
        };
        
        this.init();
    }
    
    async init() {
        // Check authentication
        if (!this.sessionId) {
            window.location.href = '/applications/warehouse/login';
            return;
        }
        
        // Verify session
        try {
            const authCheck = await this.fetchWithAuth('/applications/warehouse/api/auth/check');
            if (!authCheck.ok) {
                localStorage.removeItem('warehouse-session');
                window.location.href = '/applications/warehouse/login';
                return;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/applications/warehouse/login';
            return;
        }
        
        this.bindEvents();
        await this.loadDashboardData();
        this.startRealTimeUpdates();
    }
    
    bindEvents() {
        // Refresh button
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }
        
        // Global search
        if (this.elements.globalSearch) {
            this.elements.globalSearch.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
        }
        
        // Drag and drop for pipeline
        Object.values(this.queues).forEach(queue => {
            if (queue) {
                queue.addEventListener('dragover', this.handleDragOver.bind(this));
                queue.addEventListener('drop', this.handleDrop.bind(this));
            }
        });
    }
    
    async fetchWithAuth(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': this.sessionId,
                ...options.headers
            }
        });
    }
    
    async loadDashboardData() {
        try {
            // Load all dashboard data in parallel
            const [ordersRes, inventoryRes, analyticsRes] = await Promise.all([
                this.fetchWithAuth('/applications/warehouse/api/orders'),
                this.fetchWithAuth('/applications/warehouse/api/inventory'),
                this.fetchWithAuth('/applications/warehouse/api/analytics/dashboard')
            ]);
            
            if (ordersRes.ok) {
                this.orders = await ordersRes.json();
            }
            
            if (inventoryRes.ok) {
                this.inventory = await inventoryRes.json();
            }
            
            if (analyticsRes.ok) {
                this.analytics = await analyticsRes.json();
            }
            
            this.updateDashboard();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    updateDashboard() {
        this.updateStatistics();
        this.updatePipeline();
        this.updatePerformanceMetrics();
        this.updateAlerts();
    }
    
    updateStatistics() {
        // Update main statistics
        if (this.analytics.ordersWaiting !== undefined) {
            this.updateElement(this.elements.ordersWaiting, this.analytics.ordersWaiting);
        }
        
        if (this.analytics.ordersInProgress !== undefined) {
            this.updateElement(this.elements.ordersInProgress, this.analytics.ordersInProgress);
        }
        
        if (this.analytics.ordersCompleted !== undefined) {
            this.updateElement(this.elements.ordersCompleted, this.analytics.ordersCompleted);
        }
        
        if (this.analytics.shortPicks !== undefined) {
            this.updateElement(this.elements.shortPicks, this.analytics.shortPicks);
        }
        
        if (this.analytics.lowStockItems !== undefined) {
            this.updateElement(this.elements.lowStockItems, this.analytics.lowStockItems);
        }
        
        if (this.analytics.totalInventoryValue !== undefined) {
            this.updateElement(this.elements.inventoryValue, `$${this.formatNumber(this.analytics.totalInventoryValue)}`);
        }
    }
    
    updatePipeline() {
        // Clear queues
        Object.values(this.queues).forEach(queue => {
            if (queue) queue.innerHTML = '';
        });
        
        // Update stage counts
        const statusCounts = this.analytics.ordersByStatus || {};
        this.updateElement(this.elements.newOrdersCount, statusCounts.new || 0);
        this.updateElement(this.elements.pickingCount, statusCounts.picking || 0);
        this.updateElement(this.elements.packingCount, statusCounts.packing || 0);
        this.updateElement(this.elements.despatchingCount, statusCounts.despatching || 0);
        this.updateElement(this.elements.despatchedCount, statusCounts.despatched || 0);
        
        // Render orders in pipeline
        this.orders.forEach(order => {
            const orderCard = this.createOrderCard(order);
            const queueEl = this.queues[order.status];
            if (queueEl) {
                queueEl.appendChild(orderCard);
            }
        });
    }
    
    createOrderCard(order) {
        const card = document.createElement('div');
        card.className = `order-card${order.hasShortPicks ? ' has-short-picks' : ''}`;
        card.setAttribute('draggable', true);
        card.dataset.orderId = order.id;
        
        const priorityClass = `priority-${order.priority}`;
        const statusClass = `status-${order.status}`;
        
        card.innerHTML = `
            <h4>Order #${order.id}</h4>
            <p>${order.customerName}</p>
            <div class="order-meta">
                <span class="priority-badge ${priorityClass}">${order.priority}</span>
                ${order.hasShortPicks ? '<span class="status-badge">⚠️ Short Pick</span>' : ''}
            </div>
        `;
        
        card.addEventListener('dragstart', this.handleDragStart.bind(this));
        card.addEventListener('click', () => {
            window.location.href = `/applications/warehouse/orders?id=${order.id}`;
        });
        
        return card;
    }
    
    updatePerformanceMetrics() {
        // Update performance metrics (mock data for now)
        this.updateElement(this.elements.ordersProcessed, `${this.analytics.ordersCompleted || 0} orders`);
        this.updateElement(this.elements.avgPickTime, `${Math.random() * 10 + 5 | 0} minutes`);
        this.updateElement(this.elements.pickAccuracy, `${95 + Math.random() * 4 | 0}% accurate`);
    }
    
    updateAlerts() {
        const alerts = [];
        
        if (this.analytics.lowStockItems > 0) {
            alerts.push({
                type: 'warning',
                title: `${this.analytics.lowStockItems} items low on stock`,
                message: 'Consider reordering soon'
            });
        }
        
        if (this.analytics.shortPicks > 0) {
            alerts.push({
                type: 'danger',
                title: `${this.analytics.shortPicks} orders with short picks`,
                message: 'Review and resolve stock issues'
            });
        }
        
        if (alerts.length === 0) {
            this.elements.alertsContainer.innerHTML = `
                <div class="widget-item">
                    <div class="widget-item-title">No alerts</div>
                    <div class="widget-item-meta">All systems operating normally</div>
                </div>
            `;
        } else {
            this.elements.alertsContainer.innerHTML = alerts.map(alert => `
                <div class="widget-item">
                    <div class="widget-item-title">${alert.title}</div>
                    <div class="widget-item-meta">${alert.message}</div>
                </div>
            `).join('');
        }
    }
    
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.orderId);
        e.target.style.opacity = '0.5';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    async handleDrop(e) {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('text/plain');
        const draggedElement = document.querySelector(`[data-order-id="${orderId}"]`);
        
        if (draggedElement) {
            draggedElement.style.opacity = '1';
        }
        
        const targetQueue = e.target.closest('.pipeline-stage');
        if (targetQueue) {
            const newStatus = targetQueue.querySelector('.order-queue').id.replace('-queue', '').replace('new-orders', 'new').replace('despatching', 'despatching');
            
            try {
                const response = await this.fetchWithAuth(`/applications/warehouse/api/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.ok) {
                    await this.loadDashboardData();
                } else {
                    console.error('Failed to update order status');
                    this.showError('Failed to update order status');
                }
            } catch (error) {
                console.error('Error updating order status:', error);
                this.showError('Failed to update order status');
            }
        }
    }
    
    handleGlobalSearch(query) {
        if (query.length < 2) {
            return;
        }
        
        // Filter orders and highlight matches
        const orderCards = document.querySelectorAll('.order-card');
        orderCards.forEach(card => {
            const orderId = card.dataset.orderId;
            const order = this.orders.find(o => o.id === orderId);
            
            if (order) {
                const matchesSearch = 
                    order.id.toLowerCase().includes(query.toLowerCase()) ||
                    order.customerName.toLowerCase().includes(query.toLowerCase());
                    
                card.style.display = matchesSearch ? 'block' : 'none';
            }
        });
    }
    
    startRealTimeUpdates() {
        // Refresh dashboard data every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }
    
    updateElement(element, value) {
        if (element && value !== undefined) {
            element.textContent = value;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
    
    showError(message) {
        // Simple error notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WarehouseDashboard();
});