class AdminDashboard {
    constructor() {
        this.currentView = 'login';
        this.currentType = null;
        this.currentItem = null;
        this.data = {
            servers: [],
            databases: [],
            storage: []
        };
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check');
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
        // Login form
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

        document.getElementById('backToDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToList').addEventListener('click', (e) => {
            e.preventDefault();
            this.showList(this.currentType);
        });

        // Widget clicks
        document.querySelectorAll('.widget').forEach(widget => {
            widget.addEventListener('click', () => {
                const type = widget.dataset.type;
                this.showList(type);
            });
        });

        // Add item button
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.showForm(this.currentType);
        });

        // Form actions
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        document.getElementById('cancelFormBtn').addEventListener('click', () => {
            this.showList(this.currentType);
        });

        // Edit and delete buttons
        document.getElementById('editItemBtn').addEventListener('click', () => {
            this.showForm(this.currentType, this.currentItem);
        });

        document.getElementById('deleteItemBtn').addEventListener('click', () => {
            this.handleDelete();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/login', {
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
            await fetch('/logout', { method: 'POST' });
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
            const [servers, databases, storage] = await Promise.all([
                fetch('/api/servers').then(r => r.json()),
                fetch('/api/databases').then(r => r.json()),
                fetch('/api/storage').then(r => r.json())
            ]);

            this.data.servers = servers;
            this.data.databases = databases;
            this.data.storage = storage;

            this.updateDashboardWidgets();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardWidgets() {
        // Servers
        const runningServers = this.data.servers.filter(s => s.status === 'running').length;
        document.getElementById('serversCount').textContent = this.data.servers.length;
        document.getElementById('serversStatus').textContent = `${runningServers} running`;

        // Databases
        const runningDatabases = this.data.databases.filter(d => d.status === 'running').length;
        document.getElementById('databasesCount').textContent = this.data.databases.length;
        document.getElementById('databasesStatus').textContent = `${runningDatabases} running`;

        // Storage
        const healthyStorage = this.data.storage.filter(s => s.status === 'healthy').length;
        document.getElementById('storageCount').textContent = this.data.storage.length;
        document.getElementById('storageStatus').textContent = `${healthyStorage} healthy`;
    }

    showList(type) {
        this.hideAllViews();
        document.getElementById('listView').classList.remove('hidden');
        this.currentView = 'list';
        this.currentType = type;

        const title = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById('listTitle').textContent = title;
        
        this.renderList(type);
    }

    renderList(type) {
        const container = document.getElementById('itemsList');
        const items = this.data[type];

        container.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item.id}" onclick="app.showDetail('${type}', ${item.id})">
                <div class="item-header">
                    <div class="item-name">${item.name}</div>
                    <div class="status ${item.status}">${item.status}</div>
                </div>
                <div class="item-details">
                    ${this.getItemDetails(type, item)}
                </div>
            </div>
        `).join('');
    }

    getItemDetails(type, item) {
        switch (type) {
            case 'servers':
                return `Type: ${item.type}`;
            case 'databases':
                return `Type: ${item.type} | Size: ${item.size}`;
            case 'storage':
                return `Type: ${item.type} | Used: ${item.used} / ${item.total}`;
            default:
                return '';
        }
    }

    showDetail(type, itemId) {
        const item = this.data[type].find(i => i.id === itemId);
        if (!item) return;

        this.hideAllViews();
        document.getElementById('detailView').classList.remove('hidden');
        this.currentView = 'detail';
        this.currentItem = item;

        document.getElementById('detailTitle').textContent = item.name;
        this.renderDetail(type, item);
    }

    renderDetail(type, item) {
        const container = document.getElementById('detailInfo');
        const fields = this.getDetailFields(type, item);

        container.innerHTML = fields.map(field => `
            <div class="info-item">
                <div class="info-label">${field.label}</div>
                <div class="info-value">${field.value}</div>
            </div>
        `).join('');
    }

    getDetailFields(type, item) {
        const common = [
            { label: 'ID', value: item.id },
            { label: 'Name', value: item.name },
            { label: 'Status', value: item.status },
            { label: 'Description', value: item.description }
        ];

        switch (type) {
            case 'servers':
                return [...common, { label: 'Type', value: item.type }];
            case 'databases':
                return [...common, { label: 'Type', value: item.type }, { label: 'Size', value: item.size }];
            case 'storage':
                return [...common, { label: 'Type', value: item.type }, { label: 'Used', value: item.used }, { label: 'Total', value: item.total }];
            default:
                return common;
        }
    }

    showForm(type, item = null) {
        this.hideAllViews();
        document.getElementById('formView').classList.remove('hidden');
        this.currentView = 'form';

        const title = item ? `Edit ${type.slice(0, -1)}` : `Add ${type.slice(0, -1)}`;
        document.getElementById('formTitle').textContent = title;

        this.renderForm(type, item);
    }

    renderForm(type, item) {
        const container = document.getElementById('formFields');
        const fields = this.getFormFields(type);

        container.innerHTML = fields.map(field => `
            <div class="form-group">
                <label for="${field.name}">${field.label}</label>
                <input type="${field.type}" id="${field.name}" name="${field.name}" 
                       value="${item ? item[field.name] || '' : ''}" required>
            </div>
        `).join('');
    }

    getFormFields(type) {
        const common = [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'status', label: 'Status', type: 'text' },
            { name: 'description', label: 'Description', type: 'text' }
        ];

        switch (type) {
            case 'servers':
                return [...common, { name: 'type', label: 'Type', type: 'text' }];
            case 'databases':
                return [...common, { name: 'type', label: 'Type', type: 'text' }, { name: 'size', label: 'Size', type: 'text' }];
            case 'storage':
                return [...common, { name: 'type', label: 'Type', type: 'text' }, { name: 'used', label: 'Used', type: 'text' }, { name: 'total', label: 'Total', type: 'text' }];
            default:
                return common;
        }
    }

    handleFormSubmit() {
        const form = document.getElementById('itemForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (this.currentItem) {
            // Edit existing item
            const index = this.data[this.currentType].findIndex(i => i.id === this.currentItem.id);
            this.data[this.currentType][index] = { ...this.currentItem, ...data };
        } else {
            // Add new item
            const newId = Math.max(...this.data[this.currentType].map(i => i.id), 0) + 1;
            this.data[this.currentType].push({ id: newId, ...data });
        }

        this.showList(this.currentType);
        this.updateDashboardWidgets();
    }

    handleDelete() {
        if (confirm('Are you sure you want to delete this item?')) {
            const index = this.data[this.currentType].findIndex(i => i.id === this.currentItem.id);
            this.data[this.currentType].splice(index, 1);
            this.showList(this.currentType);
            this.updateDashboardWidgets();
        }
    }

    hideAllViews() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('detailView').classList.add('hidden');
        document.getElementById('formView').classList.add('hidden');
    }
}

// Initialize the app
const app = new AdminDashboard();