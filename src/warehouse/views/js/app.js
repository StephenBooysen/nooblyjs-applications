class WarehouseManagement {
    constructor() {
        this.currentView = 'login';
        this.currentOrder = null;
        this.currentItem = null;
        this.data = {
            orders: [],
            inventory: [],
            queues: ['New', 'Picking', 'Packing', 'Despatching', 'Despatched']
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
            const response = await fetch('/applications/warehouse/api/auth/check');
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

        document.getElementById('inventoryLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showInventory();
        });

        // Back links
        document.getElementById('backToDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToDashboardFromInventory').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToOrders').addEventListener('click', (e) => {
            e.preventDefault();
            this.showOrders();
        });

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        // Picking actions
        document.getElementById('completePickBtn').addEventListener('click', () => {
            this.completePick();
        });

        document.getElementById('partialPickBtn').addEventListener('click', () => {
            this.partialPick();
        });

        document.getElementById('cancelPickBtn').addEventListener('click', () => {
            this.showOrders();
        });

        // Inventory actions
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.showItemModal();
        });

        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleItemSubmit();
        });

        document.getElementById('closeItemModal').addEventListener('click', () => {
            this.hideModal('itemModal');
        });

        document.getElementById('cancelItemBtn').addEventListener('click', () => {
            this.hideModal('itemModal');
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/applications/warehouse/login', {
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
            await fetch('/applications/warehouse/logout', { method: 'POST' });
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
            const [orders, inventory] = await Promise.all([
                fetch('/applications/warehouse/api/orders').then(r => r.json()),
                fetch('/applications/warehouse/api/inventory').then(r => r.json())
            ]);

            this.data.orders = orders;
            this.data.inventory = inventory;
            
            this.updateDashboardStats();
            this.renderQueues();
            this.renderRecentOrders();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats() {
        const today = new Date().toDateString();
        const todayOrders = this.data.orders.filter(o => 
            new Date(o.createdAt).toDateString() === today
        );

        const waitingOrders = todayOrders.filter(o => o.status === 'waiting').length;
        const inProgressOrders = todayOrders.filter(o => o.status === 'picking').length;
        const doneOrders = todayOrders.filter(o => ['packing', 'despatching', 'despatched'].includes(o.status)).length;
        const shortPicks = this.data.orders.filter(o => o.hasShortPicks).length;

        document.getElementById('waitingOrders').textContent = waitingOrders;
        document.getElementById('inProgressOrders').textContent = inProgressOrders;
        document.getElementById('doneOrders').textContent = doneOrders;
        document.getElementById('shortPicks').textContent = shortPicks;
    }

    renderQueues() {
        const container = document.getElementById('queueGrid');
        const statusMap = {
            'New': 'waiting',
            'Picking': 'picking',
            'Packing': 'packing',
            'Despatching': 'despatching',
            'Despatched': 'despatched'
        };

        container.innerHTML = this.data.queues.map(queue => {
            const status = statusMap[queue];
            const queueOrders = this.data.orders.filter(o => o.status === status);
            return `
                <div class="queue-item" onclick="app.showOrdersByStatus('${status}')">
                    <div class="queue-name">${queue}</div>
                    <div class="queue-count">${queueOrders.length}</div>
                </div>
            `;
        }).join('');
    }

    renderRecentOrders() {
        const container = document.getElementById('recentOrdersList');
        const recentOrders = this.data.orders.slice(0, 10);
        
        if (recentOrders.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No orders found.</p>';
            return;
        }

        container.innerHTML = recentOrders.map(order => `
            <div class="order-item" onclick="app.showOrderDetail(${order.id})">
                <div class="order-header">
                    <div class="order-id">#${order.id}</div>
                    <div class="order-status ${order.status}">${order.status}</div>
                </div>
                <div class="order-details">
                    Customer: ${order.customerName} | Items: ${order.items.length}
                </div>
                <div class="order-meta">
                    <span>Created: ${this.formatDate(order.createdAt)}</span>
                    <span>Priority: ${order.priority}</span>
                </div>
            </div>
        `).join('');
    }

    showOrders(title = 'All Orders') {
        this.hideAllViews();
        document.getElementById('ordersView').classList.remove('hidden');
        this.currentView = 'orders';

        document.getElementById('ordersTitle').textContent = title;
        this.filteredOrders = [...this.data.orders];
        this.renderOrders();
    }

    showOrdersByStatus(status) {
        this.hideAllViews();
        document.getElementById('ordersView').classList.remove('hidden');
        this.currentView = 'orders';

        const statusNames = {
            'waiting': 'New Orders',
            'picking': 'Picking Orders',
            'packing': 'Packing Orders',
            'despatching': 'Despatching Orders',
            'despatched': 'Despatched Orders'
        };

        document.getElementById('ordersTitle').textContent = statusNames[status] || 'Orders';
        document.getElementById('statusFilter').value = status;
        
        this.filteredOrders = this.data.orders.filter(o => o.status === status);
        this.renderOrders();
    }

    renderOrders() {
        const container = document.getElementById('ordersList');
        
        if (this.filteredOrders.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6c757d;">No orders found matching the current filters.</div>';
            return;
        }

        container.innerHTML = this.filteredOrders.map(order => `
            <div class="order-item" onclick="app.showOrderDetail(${order.id})">
                <div class="order-header">
                    <div class="order-id">#${order.id}</div>
                    <div class="order-status ${order.status}">${order.status}</div>
                </div>
                <div class="order-details">
                    Customer: ${order.customerName} | Items: ${order.items.length}
                    ${order.hasShortPicks ? ' | ⚠️ Has Short Picks' : ''}
                </div>
                <div class="order-meta">
                    <span>Created: ${this.formatDate(order.createdAt)}</span>
                    <span>Priority: ${order.priority}</span>
                </div>
            </div>
        `).join('');
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;
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
                filtered = filtered.filter(o => new Date(o.createdAt) >= filterDate);
            }
        }

        this.filteredOrders = filtered;
        this.renderOrders();
    }

    showOrderDetail(orderId) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (!order) return;

        if (order.status === 'picking') {
            this.showPicking(order);
        } else {
            this.showAlert(`Order #${orderId} is currently in ${order.status} status`, 'info');
        }
    }

    showPicking(order) {
        this.currentOrder = order;
        this.hideAllViews();
        document.getElementById('pickingView').classList.remove('hidden');
        this.currentView = 'picking';

        document.getElementById('pickingTitle').textContent = `Pick Order #${order.id}`;
        document.getElementById('pickingOrderId').textContent = `#${order.id}`;
        
        this.renderPickingItems();
    }

    renderPickingItems() {
        const container = document.getElementById('pickingItems');
        const order = this.currentOrder;

        container.innerHTML = order.items.map((item, index) => {
            const inventoryItem = this.data.inventory.find(inv => inv.sku === item.sku);
            const availableStock = inventoryItem ? inventoryItem.stock : 0;
            
            return `
                <div class="pick-item">
                    <div class="pick-item-header">
                        <div class="item-name">${item.name}</div>
                        <div class="item-location">${inventoryItem ? inventoryItem.location : 'Unknown'}</div>
                    </div>
                    <div class="pick-item-details">
                        <div class="detail-item">
                            <div class="detail-label">SKU</div>
                            <div class="detail-value">${item.sku}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Required</div>
                            <div class="detail-value">${item.quantity}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Available</div>
                            <div class="detail-value">${availableStock}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Status</div>
                            <div class="detail-value" id="pickStatus${index}">${item.pickStatus || 'Pending'}</div>
                        </div>
                    </div>
                    <div class="pick-actions">
                        <label>Pick Quantity:</label>
                        <input type="number" class="pick-quantity" id="pickQty${index}" 
                               min="0" max="${Math.min(item.quantity, availableStock)}" 
                               value="${Math.min(item.quantity, availableStock)}">
                        <button class="btn btn-success btn-small" onclick="app.pickItem(${index})">Pick</button>
                        <button class="btn btn-warning btn-small" onclick="app.shortPickItem(${index})">Short Pick</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    pickItem(itemIndex) {
        const pickQty = parseInt(document.getElementById(`pickQty${itemIndex}`).value);
        const item = this.currentOrder.items[itemIndex];
        
        item.pickedQuantity = pickQty;
        item.pickStatus = pickQty >= item.quantity ? 'Picked' : 'Short Pick';
        
        // Update inventory
        const inventoryItem = this.data.inventory.find(inv => inv.sku === item.sku);
        if (inventoryItem) {
            inventoryItem.stock -= pickQty;
        }
        
        document.getElementById(`pickStatus${itemIndex}`).textContent = item.pickStatus;
        this.showAlert(`Picked ${pickQty} of ${item.name}`, 'success');
    }

    shortPickItem(itemIndex) {
        const item = this.currentOrder.items[itemIndex];
        item.pickStatus = 'Short Pick';
        item.pickedQuantity = 0;
        
        document.getElementById(`pickStatus${itemIndex}`).textContent = 'Short Pick';
        document.getElementById(`pickQty${itemIndex}`).value = 0;
        this.showAlert(`${item.name} marked as short pick`, 'warning');
    }

    completePick() {
        const allPicked = this.currentOrder.items.every(item => 
            item.pickStatus === 'Picked' || item.pickStatus === 'Short Pick'
        );
        
        if (!allPicked) {
            this.showAlert('Please pick or short pick all items before completing', 'warning');
            return;
        }

        const hasShortPicks = this.currentOrder.items.some(item => item.pickStatus === 'Short Pick');
        
        this.currentOrder.status = 'packing';
        this.currentOrder.hasShortPicks = hasShortPicks;
        
        // Update the order in the main data array
        const orderIndex = this.data.orders.findIndex(o => o.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            this.data.orders[orderIndex] = this.currentOrder;
        }

        this.showAlert('Pick completed successfully!', 'success');
        setTimeout(() => {
            this.showOrders();
        }, 1500);
    }

    partialPick() {
        this.currentOrder.status = 'waiting';
        this.currentOrder.hasShortPicks = true;
        
        // Update the order in the main data array
        const orderIndex = this.data.orders.findIndex(o => o.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            this.data.orders[orderIndex] = this.currentOrder;
        }

        this.showAlert('Order saved as partial pick', 'warning');
        setTimeout(() => {
            this.showOrders();
        }, 1500);
    }

    showInventory() {
        this.hideAllViews();
        document.getElementById('inventoryView').classList.remove('hidden');
        this.currentView = 'inventory';
        this.renderInventory();
    }

    renderInventory() {
        const container = document.getElementById('inventoryGrid');
        
        if (this.data.inventory.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6c757d;">No inventory items found.</div>';
            return;
        }

        container.innerHTML = this.data.inventory.map(item => {
            const stockLevel = item.stock > 50 ? 'high' : item.stock > 20 ? 'medium' : 'low';
            
            return `
                <div class="inventory-item">
                    <div class="inventory-header">
                        <div class="inventory-name">${item.name}</div>
                        <div class="stock-level ${stockLevel}">${stockLevel}</div>
                    </div>
                    <div class="inventory-details">
                        <div class="detail-item">
                            <div class="detail-label">SKU</div>
                            <div class="detail-value">${item.sku}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Location</div>
                            <div class="detail-value">${item.location}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Stock</div>
                            <div class="detail-value">${item.stock}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Description</div>
                            <div class="detail-value">${item.description || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="inventory-actions">
                        <input type="number" class="stock-input" id="stock${item.id}" 
                               value="${item.stock}" min="0">
                        <button class="btn btn-success btn-small" onclick="app.updateStock(${item.id})">Update</button>
                        <button class="btn btn-secondary btn-small" onclick="app.editItem(${item.id})">Edit</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStock(itemId) {
        const newStock = parseInt(document.getElementById(`stock${itemId}`).value);
        const itemIndex = this.data.inventory.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            this.data.inventory[itemIndex].stock = newStock;
            this.showAlert('Stock updated successfully!', 'success');
            this.renderInventory();
        }
    }

    editItem(itemId) {
        const item = this.data.inventory.find(item => item.id === itemId);
        if (item) {
            this.currentItem = item;
            this.showItemModal(item);
        }
    }

    showItemModal(item = null) {
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('itemModalTitle');
        
        if (item) {
            title.textContent = 'Edit Item';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemSku').value = item.sku;
            document.getElementById('itemLocation').value = item.location;
            document.getElementById('itemStock').value = item.stock;
            document.getElementById('itemDescription').value = item.description || '';
        } else {
            title.textContent = 'Add New Item';
            document.getElementById('itemForm').reset();
            this.currentItem = null;
        }
        
        modal.classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    handleItemSubmit() {
        const form = document.getElementById('itemForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (this.currentItem) {
            // Edit existing item
            const itemIndex = this.data.inventory.findIndex(item => item.id === this.currentItem.id);
            if (itemIndex !== -1) {
                this.data.inventory[itemIndex] = { ...this.currentItem, ...data, stock: parseInt(data.stock) };
            }
        } else {
            // Add new item
            const newId = Math.max(...this.data.inventory.map(item => item.id), 0) + 1;
            const newItem = {
                id: newId,
                ...data,
                stock: parseInt(data.stock)
            };
            this.data.inventory.push(newItem);
        }
        
        this.hideModal('itemModal');
        this.renderInventory();
        this.showAlert('Item saved successfully!', 'success');
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

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    hideAllViews() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('ordersView').classList.add('hidden');
        document.getElementById('pickingView').classList.add('hidden');
        document.getElementById('inventoryView').classList.add('hidden');
    }
}

// Initialize the app
const app = new WarehouseManagement();