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
            const response = await fetch('/api/delivery/auth/check');
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

        // Back links
        document.getElementById('backToDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToOrders').addEventListener('click', (e) => {
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
            const response = await fetch('/delivery/login', {
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
            await fetch('/delivery/logout', { method: 'POST' });
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
        
        await this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            const orders = await fetch('/api/delivery/orders').then(r => r.json());
            this.data.orders = orders;
            
            this.updateDashboardStats();
            this.renderDashboardOrders();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
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
        // Default to showing waiting orders
        this.filterOrdersByStatus('waiting');
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
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6c757d;">No orders found.</div>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" onclick="app.showOrderDetail(${order.id})">
                <div class="order-header">
                    <div class="order-id">#${order.id}</div>
                    <div class="order-status ${order.status}">${this.getStatusLabel(order.status)}</div>
                </div>
                <div class="order-details">
                    <strong>${order.customerName}</strong>
                </div>
                <div class="order-address">
                    📍 ${order.address}
                </div>
                <div class="order-meta">
                    <span>Order Time: ${this.formatTime(order.orderTime)}</span>
                    <span>Priority: ${order.priority}</span>
                </div>
            </div>
        `).join('');
    }

    showOrders() {
        this.hideAllViews();
        document.getElementById('ordersView').classList.remove('hidden');
        this.currentView = 'orders';

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
            <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${order.customerName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${order.phoneNumber}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Delivery Address</div>
                <div class="info-value">${order.address}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Order Time</div>
                <div class="info-value">${this.formatDateTime(order.orderTime)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">${order.priority}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Items</div>
                <div class="info-value">${order.items.join(', ')}</div>
            </div>
        `;

        // Map address
        document.getElementById('mapAddress').textContent = order.address;

        // Current status
        document.getElementById('currentOrderStatus').textContent = this.getStatusLabel(order.status);
        document.getElementById('currentOrderStatus').className = `order-status ${order.status}`;

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
        startBtn.style.display = 'inline-block';
        deliveredBtn.style.display = 'inline-block';

        if (status === 'waiting') {
            startBtn.textContent = 'Start Delivery';
            startBtn.disabled = false;
            deliveredBtn.disabled = true;
        } else if (status === 'delivery') {
            startBtn.textContent = 'En Route';
            startBtn.disabled = true;
            deliveredBtn.disabled = false;
        } else if (status === 'delivered') {
            startBtn.disabled = true;
            deliveredBtn.textContent = 'Delivered ✓';
            deliveredBtn.disabled = true;
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
            <div class="timeline-item ${item.active ? 'active' : ''}">
                <div class="timeline-icon">${item.icon}</div>
                <div class="timeline-content">
                    <div class="timeline-status">${item.status}</div>
                    <div class="timeline-time">${item.time ? this.formatDateTime(item.time) : 'Pending'}</div>
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