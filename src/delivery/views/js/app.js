class DeliveryPlatform {
    constructor() {
        this.currentView = 'login';
        this.currentOrder = null;
        this.data = {
            orders: []
        };
        this.filteredOrders = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        try {
            const response = await fetch('/applications/delivery/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            this.showLogin();
        }
    }

    bindEvents() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Navigation
        document.getElementById('dashboardLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('ordersLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showOrders();
        });

        // Filters
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterOrdersByStatus(e.target.value);
        });

        document.getElementById('ordersStatusFilter').addEventListener('change', () => {
            this.applyOrdersFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.applyOrdersFilters();
        });

        // Delivery actions
        document.getElementById('startDeliveryBtn').addEventListener('click', () => {
            this.startDelivery();
        });

        document.getElementById('markDeliveredBtn').addEventListener('click', () => {
            this.markDelivered();
        });

        document.getElementById('reportIssueBtn').addEventListener('click', () => {
            this.reportIssue();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/applications/delivery/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showDashboard();
            } else {
                errorDiv.textContent = data.message || 'Invalid credentials';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await fetch('/applications/delivery/api/logout', { method: 'POST' });
            this.showLogin();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('dashboardPage').classList.add('hidden');
        document.getElementById('username').focus();
    }

    async showDashboard() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('dashboardPage').classList.remove('hidden');
        
        this.hideAllViews();
        document.getElementById('dashboardView').classList.remove('hidden');
        this.currentView = 'dashboard';
        
        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById('dashboardLink').classList.add('active');
        
        await this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            const orders = await fetch('/applications/delivery/api/orders').then(r => r.json());
            this.data.orders = orders;
            
            this.updateDashboardStats();
            this.renderDashboardOrders();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Set default data for demo purposes
            this.data.orders = [
                {
                    id: 1,
                    customerName: 'John Smith',
                    phoneNumber: '+1-555-0123',
                    address: '123 Main St, City, State 12345',
                    orderTime: new Date().toISOString(),
                    status: 'waiting',
                    priority: 'High',
                    items: ['Package #001', 'Package #002']
                },
                {
                    id: 2,
                    customerName: 'Jane Doe',
                    phoneNumber: '+1-555-0456',
                    address: '456 Oak Ave, City, State 12345',
                    orderTime: new Date(Date.now() - 3600000).toISOString(),
                    status: 'delivery',
                    priority: 'Normal',
                    items: ['Package #003'],
                    startDeliveryTime: new Date(Date.now() - 1800000).toISOString()
                },
                {
                    id: 3,
                    customerName: 'Bob Wilson',
                    phoneNumber: '+1-555-0789',
                    address: '789 Pine St, City, State 12345',
                    orderTime: new Date(Date.now() - 7200000).toISOString(),
                    status: 'delivered',
                    priority: 'Low',
                    items: ['Package #004', 'Package #005'],
                    startDeliveryTime: new Date(Date.now() - 3600000).toISOString(),
                    deliveredTime: new Date(Date.now() - 1800000).toISOString()
                }
            ];
            this.updateDashboardStats();
            this.renderDashboardOrders();
        }
    }

    updateDashboardStats() {
        const waitingOrders = this.data.orders.filter(o => o.status === 'waiting').length;
        const deliveryOrders = this.data.orders.filter(o => o.status === 'delivery').length;
        const deliveredOrders = this.data.orders.filter(o => o.status === 'delivered').length;

        document.getElementById('waitingCount').textContent = waitingOrders;
        document.getElementById('deliveryCount').textContent = deliveryOrders;
        document.getElementById('deliveredCount').textContent = deliveredOrders;
    }

    renderDashboardOrders() {
        // Default to showing all recent orders
        this.filterOrdersByStatus('');
    }

    filterOrdersByStatus(status) {
        const statusFilter = document.getElementById('statusFilter');
        statusFilter.value = status;
        
        const filtered = status ? this.data.orders.filter(o => o.status === status) : this.data.orders;
        this.renderOrdersList(filtered, 'ordersList');
    }

    renderOrdersList(orders, containerId) {
        const container = document.getElementById(containerId);
        
        if (orders.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--muted-foreground);">No orders found.</div>';
            return;
        }

        // Use different rendering based on container
        if (containerId === 'ordersList') {
            // Dashboard widget style
            container.innerHTML = orders.slice(0, 5).map(order => `
                <div class="widget-item" onclick="app.showOrderDetail(${order.id})" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="widget-item-title">
                            <a href="#" onclick="app.showOrderDetail(${order.id}); return false;">#${order.id} - ${order.customerName}</a>
                        </div>
                        <span class="badge badge-secondary" style="font-size: 0.75rem;">${this.getStatusLabel(order.status)}</span>
                    </div>
                    <div class="widget-item-meta">
                        📍 ${order.address} | ${this.formatTime(order.orderTime)} | Priority: ${order.priority}
                    </div>
                </div>
            `).join('');
        } else {
            // Full list view style
            container.innerHTML = orders.map(order => `
                <div class="document-card" onclick="app.showOrderDetail(${order.id})" style="margin-bottom: var(--spacing-md); cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                        <h4 style="color: var(--primary); margin: 0;">#${order.id} - ${order.customerName}</h4>
                        <span class="badge badge-secondary">${this.getStatusLabel(order.status)}</span>
                    </div>
                    <p style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-primary);">
                        📍 ${order.address}
                    </p>
                    <div class="document-meta">
                        <span>Order Time: ${this.formatTime(order.orderTime)}</span>
                        <span>Priority: ${order.priority}</span>
                        <span>Items: ${order.items.length}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    showOrders() {
        this.hideAllViews();
        document.getElementById('ordersView').classList.remove('hidden');
        this.currentView = 'orders';

        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById('ordersLink').classList.add('active');

        this.filteredOrders = [...this.data.orders];
        this.renderOrdersList(this.filteredOrders, 'allOrdersList');
    }

    applyOrdersFilters() {
        const statusFilter = document.getElementById('ordersStatusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;

        let filtered = [...this.data.orders];

        if (statusFilter) {
            filtered = filtered.filter(o => o.status === statusFilter);
        }

        if (dateFilter) {
            const now = new Date();
            const filterDate = new Date();
            
            switch (dateFilter) {
                case 'today':
                    filterDate.setDate(now.getDate());
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
            }

            if (dateFilter !== '') {
                filtered = filtered.filter(o => new Date(o.orderTime) >= filterDate);
            }
        }

        this.filteredOrders = filtered;
        this.renderOrdersList(this.filteredOrders, 'allOrdersList');
    }

    showOrderDetail(orderId) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (!order) return;

        this.currentOrder = order;
        this.hideAllViews();
        document.getElementById('orderDetailView').classList.remove('hidden');
        this.currentView = 'orderDetail';

        this.renderOrderDetail();
    }

    renderOrderDetail() {
        const order = this.currentOrder;
        
        document.getElementById('orderDetailTitle').textContent = `Order for ${order.customerName}`;
        document.getElementById('orderDetailId').textContent = `#${order.id}`;

        // Order information grid
        const infoGrid = document.getElementById('orderInfoGrid');
        infoGrid.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg);">
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Customer Name</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">${order.customerName}</div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Phone Number</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">${order.phoneNumber}</div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Order Time</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">${this.formatDateTime(order.orderTime)}</div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Priority</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">${order.priority}</div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Items</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">${order.items.join(', ')}</div>
                </div>
            </div>
        `;

        // Map address
        document.getElementById('mapAddress').textContent = order.address;

        // Current status
        const statusBadge = document.getElementById('currentOrderStatus');
        statusBadge.textContent = this.getStatusLabel(order.status);
        statusBadge.className = 'badge badge-secondary';

        // Update action buttons based on status
        this.updateActionButtons();

        // Render timeline
        this.renderTimeline();
    }

    updateActionButtons() {
        const startBtn = document.getElementById('startDeliveryBtn');
        const deliveredBtn = document.getElementById('markDeliveredBtn');
        const status = this.currentOrder.status;

        // Reset button states
        startBtn.style.display = 'inline-flex';
        deliveredBtn.style.display = 'inline-flex';

        if (status === 'waiting') {
            startBtn.innerHTML = '<svg width="16" height="16"><use href="#icon-play"></use></svg>Start Delivery';
            startBtn.disabled = false;
            startBtn.className = 'btn btn-primary';
            deliveredBtn.disabled = true;
            deliveredBtn.className = 'btn btn-secondary';
        } else if (status === 'delivery') {
            startBtn.innerHTML = '<svg width="16" height="16"><use href="#icon-truck"></use></svg>En Route';
            startBtn.disabled = true;
            startBtn.className = 'btn btn-secondary';
            deliveredBtn.disabled = false;
            deliveredBtn.className = 'btn btn-primary';
        } else if (status === 'delivered') {
            startBtn.disabled = true;
            startBtn.className = 'btn btn-secondary';
            deliveredBtn.innerHTML = '<svg width="16" height="16"><use href="#icon-check-circle"></use></svg>Delivered ✓';
            deliveredBtn.disabled = true;
            deliveredBtn.className = 'btn btn-secondary';
        }
    }

    renderTimeline() {
        const container = document.getElementById('deliveryTimeline');
        const order = this.currentOrder;
        
        const timeline = [
            {
                status: 'Order Received',
                time: order.orderTime,
                icon: '📋',
                active: true
            },
            {
                status: 'Out for Delivery',
                time: order.startDeliveryTime,
                icon: '🚚',
                active: order.status === 'delivery' || order.status === 'delivered'
            },
            {
                status: 'Delivered',
                time: order.deliveredTime,
                icon: '✅',
                active: order.status === 'delivered'
            }
        ];

        container.innerHTML = timeline.map(item => `
            <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); padding: var(--spacing-md); border-radius: var(--radius); ${item.active ? 'background: var(--muted);' : 'opacity: 0.6;'}">
                <div style="font-size: 1.5rem; line-height: 1;">${item.icon}</div>
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); font-weight: 500; margin-bottom: var(--spacing-xs);">${item.status}</div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem;">${item.time ? this.formatDateTime(item.time) : 'Pending'}</div>
                </div>
            </div>
        `).join('');
    }

    startDelivery() {
        if (this.currentOrder.status !== 'waiting') return;

        this.currentOrder.status = 'delivery';
        this.currentOrder.startDeliveryTime = new Date().toISOString();
        
        // Update the order in the main data array
        const orderIndex = this.data.orders.findIndex(o => o.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            this.data.orders[orderIndex] = this.currentOrder;
        }

        this.updateActionButtons();
        this.renderTimeline();
        this.updateDashboardStats();
        this.showAlert('Delivery started! Order is now out for delivery.', 'success');
    }

    markDelivered() {
        if (this.currentOrder.status !== 'delivery') return;

        this.currentOrder.status = 'delivered';
        this.currentOrder.deliveredTime = new Date().toISOString();
        
        // Update the order in the main data array
        const orderIndex = this.data.orders.findIndex(o => o.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            this.data.orders[orderIndex] = this.currentOrder;
        }

        this.updateActionButtons();
        this.renderTimeline();
        this.updateDashboardStats();
        this.showAlert('Order marked as delivered successfully!', 'success');
    }

    reportIssue() {
        const issue = prompt('Please describe the delivery issue:');
        if (issue) {
            this.showAlert('Issue reported: ' + issue, 'info');
            // In a real app, this would send the issue to the server
        }
    }

    getStatusLabel(status) {
        const labels = {
            'waiting': 'Waiting',
            'delivery': 'Out for Delivery',
            'delivered': 'Delivered'
        };
        return labels[status] || status;
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';

        document.body.appendChild(alert);

        setTimeout(() => {
            if (document.body.contains(alert)) {
                document.body.removeChild(alert);
            }
        }, 3000);
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    hideAllViews() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('ordersView').classList.add('hidden');
        document.getElementById('orderDetailView').classList.add('hidden');
    }
}

// Initialize the app
const app = new DeliveryPlatform();