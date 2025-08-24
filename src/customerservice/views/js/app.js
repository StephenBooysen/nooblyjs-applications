class CustomerService {
    constructor() {
        this.currentView = 'login';
        this.currentQueue = null;
        this.currentCase = null;
        this.data = {
            cases: [],
            queues: ['Login', 'Orders', 'Deliveries', 'Payments', 'Refunds']
        };
        this.filteredCases = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        try {
            const response = await fetch('/applications/customerservice/api/auth/check');
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

        // Back links
        document.getElementById('backToDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToQueue').addEventListener('click', (e) => {
            e.preventDefault();
            this.showQueue(this.currentQueue);
        });

        // Filters
        document.getElementById('priorityFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        // Comment form
        document.getElementById('addCommentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddComment();
        });

        // Status buttons
        document.getElementById('setNewBtn').addEventListener('click', () => {
            this.updateCaseStatus('new');
        });

        document.getElementById('setInProgressBtn').addEventListener('click', () => {
            this.updateCaseStatus('inprogress');
        });

        document.getElementById('setDoneBtn').addEventListener('click', () => {
            this.updateCaseStatus('done');
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/applications/customerservice/api/login', {
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
            await fetch('/applications/customerservice/api/logout', { method: 'POST' });
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
            const cases = await fetch('/applications/customerservice/api/cases').then(r => r.json());
            this.data.cases = cases;
            
            this.updateDashboardStats();
            this.renderQueues();
            this.renderCriticalCases();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Set default demo data for demonstration purposes
            this.data.cases = [
                { 
                    id: 1, 
                    customerName: 'John Smith', 
                    customerEmail: 'john.smith@email.com',
                    subject: 'Login Issues with Account', 
                    priority: 'high', 
                    status: 'new', 
                    queue: 'Login',
                    createdAt: '2024-01-15T10:30:00Z',
                    comments: [
                        { id: 1, author: 'System', text: 'Case created automatically', createdAt: '2024-01-15T10:30:00Z' },
                        { id: 2, author: 'John Smith', text: 'I cannot log into my account. Getting error 500.', createdAt: '2024-01-15T10:35:00Z' }
                    ]
                },
                {
                    id: 2,
                    customerName: 'Sarah Johnson',
                    customerEmail: 'sarah.j@company.com',
                    subject: 'Payment Processing Failed',
                    priority: 'critical',
                    status: 'inprogress',
                    queue: 'Payments',
                    createdAt: '2024-01-15T09:15:00Z',
                    comments: [
                        { id: 1, author: 'System', text: 'Case escalated to critical priority', createdAt: '2024-01-15T09:15:00Z' },
                        { id: 2, author: 'Sarah Johnson', text: 'My payment was charged but order shows as failed', createdAt: '2024-01-15T09:20:00Z' },
                        { id: 3, author: 'Agent Mike', text: 'Investigating payment gateway logs', createdAt: '2024-01-15T09:45:00Z' }
                    ]
                },
                {
                    id: 3,
                    customerName: 'Mike Wilson',
                    customerEmail: 'mike.w@email.com',
                    subject: 'Delivery Status Inquiry',
                    priority: 'medium',
                    status: 'done',
                    queue: 'Deliveries',
                    createdAt: '2024-01-14T14:20:00Z',
                    comments: [
                        { id: 1, author: 'Mike Wilson', text: 'Where is my order #12345?', createdAt: '2024-01-14T14:20:00Z' },
                        { id: 2, author: 'Agent Lisa', text: 'Checking delivery status now', createdAt: '2024-01-14T14:25:00Z' },
                        { id: 3, author: 'Agent Lisa', text: 'Your order is out for delivery and will arrive today', createdAt: '2024-01-14T14:30:00Z' }
                    ]
                },
                {
                    id: 4,
                    customerName: 'Emma Davis',
                    customerEmail: 'emma.davis@email.com',
                    subject: 'Refund Request for Damaged Item',
                    priority: 'high',
                    status: 'new',
                    queue: 'Refunds',
                    createdAt: '2024-01-15T11:45:00Z',
                    comments: [
                        { id: 1, author: 'Emma Davis', text: 'Received damaged product. Need full refund.', createdAt: '2024-01-15T11:45:00Z' }
                    ]
                },
                {
                    id: 5,
                    customerName: 'Robert Brown',
                    customerEmail: 'r.brown@company.org',
                    subject: 'Order Modification Request',
                    priority: 'low',
                    status: 'inprogress',
                    queue: 'Orders',
                    createdAt: '2024-01-15T08:30:00Z',
                    comments: [
                        { id: 1, author: 'Robert Brown', text: 'Can I change my shipping address?', createdAt: '2024-01-15T08:30:00Z' },
                        { id: 2, author: 'Agent Tom', text: 'Let me check if your order has been processed', createdAt: '2024-01-15T08:35:00Z' }
                    ]
                }
            ];
            this.updateDashboardStats();
            this.renderQueues();
            this.renderCriticalCases();
        }
    }

    updateDashboardStats() {
        const openCases = this.data.cases.filter(c => c.status === 'new').length;
        const inProgressCases = this.data.cases.filter(c => c.status === 'inprogress').length;
        const closedCases = this.data.cases.filter(c => c.status === 'done').length;

        document.getElementById('openCases').textContent = openCases;
        document.getElementById('inProgressCases').textContent = inProgressCases;
        document.getElementById('closedCases').textContent = closedCases;
    }

    renderQueues() {
        const container = document.getElementById('queueGrid');
        container.innerHTML = this.data.queues.map(queue => {
            const queueCases = this.data.cases.filter(c => c.queue === queue);
            return `
                <div class="card" style="cursor: pointer;" onclick="app.showQueue('${queue}')">
                    <div class="card-content">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                            <h4 style="color: var(--primary); margin: 0;">${queue}</h4>
                            <span class="badge badge-secondary">${queueCases.length} cases</span>
                        </div>
                        <p style="margin: 0; color: var(--muted-foreground); font-size: 0.875rem;">
                            ${queueCases.filter(c => c.status === 'new').length} new, 
                            ${queueCases.filter(c => c.status === 'inprogress').length} in progress
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCriticalCases() {
        const container = document.getElementById('criticalCasesList');
        const criticalCases = this.data.cases.filter(c => c.priority === 'critical').slice(0, 5);
        
        if (criticalCases.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--muted-foreground); padding: var(--spacing-xl);">No critical cases at the moment.</div>';
            return;
        }

        container.innerHTML = criticalCases.map(caseItem => `
            <div class="card" style="cursor: pointer;" onclick="app.showCaseDetail(${caseItem.id})">
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                        <h4 style="color: var(--primary); margin: 0;">${caseItem.customerName}</h4>
                        <span class="badge badge-destructive">${caseItem.priority}</span>
                    </div>
                    <p style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-primary); font-weight: 500;">
                        ${caseItem.subject}
                    </p>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-style: italic;">
                        "${this.getLastComment(caseItem)}"
                    </div>
                </div>
            </div>
        `).join('');
    }

    getLastComment(caseItem) {
        if (caseItem.comments && caseItem.comments.length > 0) {
            const lastComment = caseItem.comments[caseItem.comments.length - 1];
            return lastComment.text.length > 100 ? 
                lastComment.text.substring(0, 100) + '...' : 
                lastComment.text;
        }
        return 'No comments yet';
    }

    showQueue(queueName) {
        this.currentQueue = queueName;
        this.hideAllViews();
        document.getElementById('queueView').classList.remove('hidden');
        this.currentView = 'queue';

        document.getElementById('queueTitle').textContent = `${queueName} Queue`;
        
        this.filteredCases = this.data.cases.filter(c => c.queue === queueName);
        this.renderQueueCases();
    }

    renderQueueCases() {
        const container = document.getElementById('queueCasesList');
        
        if (this.filteredCases.length === 0) {
            container.innerHTML = '<div style="padding: var(--spacing-xl); text-align: center; color: var(--muted-foreground);">No cases found matching the current filters.</div>';
            return;
        }

        container.innerHTML = this.filteredCases.map(caseItem => `
            <div class="card" style="cursor: pointer; margin-bottom: var(--spacing-md);" onclick="app.showCaseDetail(${caseItem.id})">
                <div class="card-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <span style="color: var(--muted-foreground); font-size: 0.875rem;">#${caseItem.id}</span>
                            <span class="badge badge-${this.getPriorityBadgeClass(caseItem.priority)}">${caseItem.priority}</span>
                        </div>
                        <span class="badge badge-${this.getStatusBadgeClass(caseItem.status)}">${caseItem.status}</span>
                    </div>
                    <h4 style="color: var(--primary); margin: 0 0 var(--spacing-sm) 0;">${caseItem.subject}</h4>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem;">
                        <div>Customer: ${caseItem.customerName}</div>
                        <div>Created: ${this.formatDate(caseItem.createdAt)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    applyFilters() {
        const priorityFilter = document.getElementById('priorityFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filtered = this.data.cases.filter(c => c.queue === this.currentQueue);

        if (priorityFilter) {
            filtered = filtered.filter(c => c.priority === priorityFilter);
        }

        if (statusFilter) {
            filtered = filtered.filter(c => c.status === statusFilter);
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
                filtered = filtered.filter(c => new Date(c.createdAt) >= filterDate);
            }
        }

        this.filteredCases = filtered;
        this.renderQueueCases();
    }

    async showCaseDetail(caseId) {
        const caseItem = this.data.cases.find(c => c.id === caseId);
        if (!caseItem) return;

        this.currentCase = caseItem;
        this.hideAllViews();
        document.getElementById('caseDetailView').classList.remove('hidden');
        this.currentView = 'caseDetail';

        // Load full case details with comments
        try {
            const fullCase = await fetch(`/applications/customerservice/api/cases/${caseId}`).then(r => r.json());
            this.currentCase = fullCase;
            this.renderCaseDetail();
        } catch (error) {
            console.error('Failed to load case details:', error);
            this.renderCaseDetail();
        }
    }

    renderCaseDetail() {
        const caseItem = this.currentCase;
        
        document.getElementById('caseDetailTitle').textContent = caseItem.subject;
        document.getElementById('caseDetailId').textContent = `#${caseItem.id}`;

        // Case information grid
        const infoGrid = document.getElementById('caseInfoGrid');
        infoGrid.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg);">
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Customer</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">
                        ${caseItem.customerName}
                    </div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Email</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">
                        ${caseItem.customerEmail}
                    </div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Priority</div>
                    <div style="margin-top: var(--spacing-xs);">
                        <span class="badge badge-${this.getPriorityBadgeClass(caseItem.priority)}">${caseItem.priority}</span>
                    </div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Queue</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">
                        ${caseItem.queue}
                    </div>
                </div>
                <div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem; font-weight: 500;">Created</div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-top: var(--spacing-xs);">
                        ${this.formatDateTime(caseItem.createdAt)}
                    </div>
                </div>
            </div>
        `;

        // Current status
        document.getElementById('currentCaseStatus').textContent = caseItem.status;
        document.getElementById('currentCaseStatus').className = `badge badge-${this.getStatusBadgeClass(caseItem.status)}`;

        // Comments
        this.renderComments();
    }

    renderComments() {
        const container = document.getElementById('commentsList');
        const comments = this.currentCase.comments || [];

        if (comments.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--muted-foreground); padding: var(--spacing-xl);">No comments yet.</div>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div style="border-bottom: 1px solid var(--border); padding: var(--spacing-md) 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                    <div style="font-weight: 600; color: var(--text-primary);">${comment.author}</div>
                    <div style="color: var(--muted-foreground); font-size: 0.875rem;">${this.formatDateTime(comment.createdAt)}</div>
                </div>
                <div style="color: var(--text-primary);">${comment.text}</div>
            </div>
        `).join('');
    }

    handleAddComment() {
        const commentText = document.getElementById('newComment').value.trim();
        if (!commentText) return;

        const newComment = {
            id: Date.now(),
            author: 'Current User',
            text: commentText,
            createdAt: new Date().toISOString()
        };

        if (!this.currentCase.comments) {
            this.currentCase.comments = [];
        }

        this.currentCase.comments.push(newComment);
        
        // Update the case in the main data array
        const caseIndex = this.data.cases.findIndex(c => c.id === this.currentCase.id);
        if (caseIndex !== -1) {
            this.data.cases[caseIndex] = this.currentCase;
        }

        this.renderComments();
        document.getElementById('newComment').value = '';

        // Show success message
        this.showAlert('Comment added successfully!', 'success');
    }

    updateCaseStatus(newStatus) {
        this.currentCase.status = newStatus;
        
        // Update the case in the main data array
        const caseIndex = this.data.cases.findIndex(c => c.id === this.currentCase.id);
        if (caseIndex !== -1) {
            this.data.cases[caseIndex] = this.currentCase;
        }

        // Add a system comment
        const statusComment = {
            id: Date.now(),
            author: 'System',
            text: `Case status changed to: ${newStatus}`,
            createdAt: new Date().toISOString()
        };

        if (!this.currentCase.comments) {
            this.currentCase.comments = [];
        }
        this.currentCase.comments.push(statusComment);

        this.renderCaseDetail();
        this.showAlert(`Case status updated to ${newStatus}!`, 'success');
    }

    showAlert(message, type) {
        // Create a temporary alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';

        document.body.appendChild(alert);

        // Remove after 3 seconds
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 3000);
    }

    getPriorityBadgeClass(priority) {
        switch (priority) {
            case 'critical': return 'destructive';
            case 'high': return 'warning';
            case 'medium': return 'secondary';
            case 'low': return 'secondary';
            default: return 'secondary';
        }
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'new': return 'warning';
            case 'inprogress': return 'primary';
            case 'done': return 'secondary';
            default: return 'secondary';
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    }

    hideAllViews() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('queueView').classList.add('hidden');
        document.getElementById('caseDetailView').classList.add('hidden');
    }
}

// Initialize the app
const app = new CustomerService();