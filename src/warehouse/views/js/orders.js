class OrdersManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentView = 'list';
        this.sessionId = localStorage.getItem('warehouse-session');
        
        this.elements = {
            // Search and filters
            orderSearch: document.getElementById('order-search'),
            filterBtn: document.getElementById('filter-btn'),
            filterPanel: document.getElementById('filter-panel'),
            statusFilter: document.getElementById('status-filter'),
            priorityFilter: document.getElementById('priority-filter'),
            
            // Statistics
            newOrdersCount: document.getElementById('new-orders-count'),
            pickingOrdersCount: document.getElementById('picking-orders-count'),
            shortPicksCount: document.getElementById('short-picks-count'),
            completedOrdersCount: document.getElementById('completed-orders-count'),
            
            // Views
            ordersListView: document.getElementById('orders-list-view'),
            ordersKanbanView: document.getElementById('orders-kanban-view'),
            ordersTable: document.getElementById('orders-table'),
            ordersTableBody: document.getElementById('orders-table-body'),
            ordersLoading: document.getElementById('orders-loading'),
            
            // Kanban columns
            kanbanNew: document.getElementById('kanban-new'),
            kanbanPicking: document.getElementById('kanban-picking'),
            kanbanPacking: document.getElementById('kanban-packing'),
            kanbanDespatching: document.getElementById('kanban-despatching'),
            kanbanDespatched: document.getElementById('kanban-despatched'),
            
            // Kanban counts
            kanbanNewCount: document.getElementById('kanban-new-count'),
            kanbanPickingCount: document.getElementById('kanban-picking-count'),
            kanbanPackingCount: document.getElementById('kanban-packing-count'),
            kanbanDespatchingCount: document.getElementById('kanban-despatching-count'),
            kanbanDespatchedCount: document.getElementById('kanban-despatched-count'),
            
            // Modals
            orderModal: document.getElementById('order-modal'),
            orderModalOverlay: document.getElementById('order-modal-overlay'),
            modalOrderContent: document.getElementById('modal-order-content'),
            closeOrderModal: document.getElementById('close-order-modal'),
            
            newOrderModal: document.getElementById('new-order-modal'),
            newOrderModalOverlay: document.getElementById('new-order-modal-overlay'),
            newOrderForm: document.getElementById('new-order-form'),
            closeNewOrderModal: document.getElementById('close-new-order-modal'),
            
            // Buttons
            newOrderBtn: document.getElementById('new-order-btn'),
            viewBtns: document.querySelectorAll('.view-btn')
        };
        
        this.kanbanColumns = {
            new: this.elements.kanbanNew,
            picking: this.elements.kanbanPicking,
            packing: this.elements.kanbanPacking,
            despatching: this.elements.kanbanDespatching,
            despatched: this.elements.kanbanDespatched
        };
        
        this.init();
    }
    
    async init() {
        if (!this.sessionId) {
            window.location.href = '/applications/warehouse/login';
            return;
        }
        
        this.bindEvents();
        await this.loadOrders();
        this.parseURLParams();
    }
    
    bindEvents() {
        // Search
        this.elements.orderSearch?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Filter toggle
        this.elements.filterBtn?.addEventListener('click', () => {
            this.toggleFilterPanel();
        });
        
        // Filter changes
        this.elements.statusFilter?.addEventListener('change', () => this.applyFilters());
        this.elements.priorityFilter?.addEventListener('change', () => this.applyFilters());
        
        // View toggle
        this.elements.viewBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // New order
        this.elements.newOrderBtn?.addEventListener('click', () => {
            this.showNewOrderModal();
        });
        
        // Modal close
        this.elements.closeOrderModal?.addEventListener('click', () => {
            this.hideOrderModal();
        });
        
        this.elements.closeNewOrderModal?.addEventListener('click', () => {
            this.hideNewOrderModal();
        });
        
        // Modal overlay close
        this.elements.orderModalOverlay?.addEventListener('click', () => {
            this.hideOrderModal();
        });
        
        this.elements.newOrderModalOverlay?.addEventListener('click', () => {
            this.hideNewOrderModal();
        });
        
        // New order form
        this.elements.newOrderForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewOrder();
        });
    }
    
    async loadOrders() {
        try {
            this.elements.ordersLoading.style.display = 'block';
            this.elements.ordersTable.style.display = 'none';
            
            const response = await fetch('/applications/warehouse/api/orders', {
                headers: {
                    'x-session-id': this.sessionId
                }
            });
            
            if (response.ok) {
                this.orders = await response.json();
                this.filteredOrders = [...this.orders];
                this.updateDisplay();
            } else {
                throw new Error('Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Failed to load orders');
        } finally {
            this.elements.ordersLoading.style.display = 'none';
            this.elements.ordersTable.style.display = 'block';
        }
    }
    
    updateDisplay() {
        this.updateStatistics();
        if (this.currentView === 'list') {
            this.renderTableView();
        } else {
            this.renderKanbanView();
        }
    }
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        
        this.updateElement(this.elements.newOrdersCount, stats.new);
        this.updateElement(this.elements.pickingOrdersCount, stats.picking);
        this.updateElement(this.elements.shortPicksCount, stats.shortPicks);
        this.updateElement(this.elements.completedOrdersCount, stats.completed);
    }
    
    calculateStatistics() {
        return this.orders.reduce((stats, order) => {
            if (order.status === 'new') stats.new++;
            else if (order.status === 'picking') stats.picking++;
            else if (order.status === 'despatched') stats.completed++;
            
            if (order.hasShortPicks) stats.shortPicks++;
            
            return stats;
        }, { new: 0, picking: 0, completed: 0, shortPicks: 0 });
    }
    
    renderTableView() {
        this.elements.ordersTableBody.innerHTML = '';
        
        this.filteredOrders.forEach(order => {
            const row = this.createTableRow(order);
            this.elements.ordersTableBody.appendChild(row);
        });
    }
    
    createTableRow(order) {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        const createdDate = new Date(order.createdAt).toLocaleDateString();
        const priorityClass = `priority-${order.priority}`;
        const statusClass = `status-${order.status}`;
        
        row.innerHTML = `
            <div class="table-cell" data-label="Order ID">#${order.id}</div>
            <div class="table-cell" data-label="Customer">${order.customerName}</div>
            <div class="table-cell" data-label="Status">
                <span class="status-badge ${statusClass}">${order.status}</span>
            </div>
            <div class="table-cell" data-label="Priority">
                <span class="priority-badge ${priorityClass}">${order.priority}</span>
            </div>
            <div class="table-cell" data-label="Items">${order.items?.length || 0}</div>
            <div class="table-cell" data-label="Created">${createdDate}</div>
            <div class="table-cell" data-label="Actions">
                <button class="btn btn-sm btn-ghost" onclick="ordersManager.viewOrder('${order.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    View
                </button>
            </div>
        `;
        
        return row;
    }
    
    renderKanbanView() {
        // Clear kanban columns
        Object.values(this.kanbanColumns).forEach(column => {
            if (column) column.innerHTML = '';
        });
        
        // Update counts
        const statusCounts = { new: 0, picking: 0, packing: 0, despatching: 0, despatched: 0 };
        
        this.filteredOrders.forEach(order => {
            const column = this.kanbanColumns[order.status];
            if (column) {
                const card = this.createKanbanCard(order);
                column.appendChild(card);
                statusCounts[order.status]++;
            }
        });
        
        // Update counts
        this.updateElement(this.elements.kanbanNewCount, statusCounts.new);
        this.updateElement(this.elements.kanbanPickingCount, statusCounts.picking);
        this.updateElement(this.elements.kanbanPackingCount, statusCounts.packing);
        this.updateElement(this.elements.kanbanDespatchingCount, statusCounts.despatching);
        this.updateElement(this.elements.kanbanDespatchedCount, statusCounts.despatched);
    }
    
    createKanbanCard(order) {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.orderId = order.id;
        
        const priorityClass = `priority-${order.priority}`;
        
        card.innerHTML = `
            <h4>#${order.id}</h4>
            <p>${order.customerName}</p>
            <div class="order-meta">
                <span class="priority-badge ${priorityClass}">${order.priority}</span>
                ${order.hasShortPicks ? '<span class="status-badge">⚠️ Short Pick</span>' : ''}
            </div>
        `;
        
        card.addEventListener('click', () => this.viewOrder(order.id));
        
        return card;
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        this.elements.viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Toggle views
        this.elements.ordersListView?.classList.toggle('hidden', view !== 'list');
        this.elements.ordersKanbanView?.classList.toggle('hidden', view !== 'kanban');
        
        this.updateDisplay();
    }
    
    toggleFilterPanel() {
        this.elements.filterPanel?.classList.toggle('hidden');
    }
    
    applyFilters() {
        const statusFilter = this.elements.statusFilter?.value;
        const priorityFilter = this.elements.priorityFilter?.value;
        
        this.filteredOrders = this.orders.filter(order => {
            const matchesStatus = !statusFilter || order.status === statusFilter;
            const matchesPriority = !priorityFilter || order.priority === priorityFilter;
            
            return matchesStatus && matchesPriority;
        });
        
        this.updateDisplay();
    }
    
    handleSearch(query) {
        if (!query) {
            this.filteredOrders = [...this.orders];
        } else {
            this.filteredOrders = this.orders.filter(order => 
                order.id.toLowerCase().includes(query.toLowerCase()) ||
                order.customerName.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        this.updateDisplay();
    }
    
    async viewOrder(orderId) {
        try {
            const response = await fetch(`/applications/warehouse/api/orders/${orderId}`, {
                headers: {
                    'x-session-id': this.sessionId
                }
            });
            
            if (response.ok) {
                const order = await response.json();
                this.showOrderDetails(order);
            } else {
                throw new Error('Failed to load order details');
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Failed to load order details');
        }
    }
    
    showOrderDetails(order) {
        const priorityClass = `priority-${order.priority}`;
        const statusClass = `status-${order.status}`;
        
        document.getElementById('modal-order-title').textContent = `Order #${order.id}`;
        
        this.elements.modalOrderContent.innerHTML = `
            <div class="order-details">
                <div class="order-header">
                    <div class="order-info">
                        <h3>${order.customerName}</h3>
                        <div class="order-badges">
                            <span class="status-badge ${statusClass}">${order.status}</span>
                            <span class="priority-badge ${priorityClass}">${order.priority} priority</span>
                            ${order.hasShortPicks ? '<span class="status-badge">⚠️ Has Short Picks</span>' : ''}
                        </div>
                    </div>
                    <div class="order-dates">
                        <p><strong>Created:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                        ${order.updatedAt ? `<p><strong>Updated:</strong> ${new Date(order.updatedAt).toLocaleString()}</p>` : ''}
                    </div>
                </div>
                
                <div class="order-items">
                    <h4>Items (${order.items.length})</h4>
                    <div class="items-list">
                        ${order.items.map(item => `
                            <div class="item-row">
                                <div class="item-info">
                                    <strong>${item.name || item.sku}</strong>
                                    <span class="item-sku">${item.sku}</span>
                                    <span class="item-location">${item.location || 'N/A'}</span>
                                </div>
                                <div class="item-quantity">
                                    <span>Qty: ${item.quantity}</span>
                                    ${item.pickedQuantity > 0 ? `<span>Picked: ${item.pickedQuantity}</span>` : ''}
                                    <span class="pick-status ${item.pickStatus || 'pending'}">${item.pickStatus || 'pending'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="order-metadata">
                    <h4>Shipping Information</h4>
                    <p><strong>Method:</strong> ${order.metadata?.shipping?.method || 'Standard'}</p>
                    <p><strong>Address:</strong> ${order.metadata?.shipping?.address || 'Not specified'}</p>
                    ${order.metadata?.specialInstructions ? `<p><strong>Special Instructions:</strong> ${order.metadata.specialInstructions}</p>` : ''}
                </div>
            </div>
        `;
        
        this.showOrderModal();
    }
    
    showOrderModal() {
        this.elements.orderModal?.classList.remove('hidden');
        this.elements.orderModalOverlay?.classList.remove('hidden');
    }
    
    hideOrderModal() {
        this.elements.orderModal?.classList.add('hidden');
        this.elements.orderModalOverlay?.classList.add('hidden');
    }
    
    showNewOrderModal() {
        this.elements.newOrderModal?.classList.remove('hidden');
        this.elements.newOrderModalOverlay?.classList.remove('hidden');
    }
    
    hideNewOrderModal() {
        this.elements.newOrderModal?.classList.add('hidden');
        this.elements.newOrderModalOverlay?.classList.add('hidden');
        this.elements.newOrderForm?.reset();
    }
    
    async createNewOrder() {
        try {
            const formData = new FormData(this.elements.newOrderForm);
            const orderData = {
                customerName: formData.get('customer-name'),
                priority: formData.get('priority'),
                metadata: {
                    shipping: {
                        address: formData.get('shipping-address'),
                        method: 'standard'
                    },
                    specialInstructions: formData.get('special-instructions')
                },
                items: [] // In a real implementation, you'd collect items
            };
            
            const response = await fetch('/applications/warehouse/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': this.sessionId
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                this.hideNewOrderModal();
                await this.loadOrders();
                this.showSuccess('Order created successfully');
            } else {
                throw new Error('Failed to create order');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showError('Failed to create order');
        }
    }
    
    parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('status')) {
            this.elements.statusFilter.value = params.get('status');
        }
        
        if (params.get('id')) {
            this.viewOrder(params.get('id'));
        }
        
        this.applyFilters();
    }
    
    updateElement(element, value) {
        if (element && value !== undefined) {
            element.textContent = value;
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize orders manager
let ordersManager;
document.addEventListener('DOMContentLoaded', () => {
    ordersManager = new OrdersManager();
});