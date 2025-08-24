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
                <div class="queue-item" onclick="app.showQueue('${queue}')">
                    <div class="queue-name">${queue}</div>
                    <div class="queue-count">${queueCases.length}</div>
                </div>
            `;
        }).join('');
    }

    renderCriticalCases() {
        const container = document.getElementById('criticalCasesList');
        const criticalCases = this.data.cases.filter(c => c.priority === 'critical').slice(0, 5);
        
        if (criticalCases.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No critical cases at the moment.</p>';
            return;
        }

        container.innerHTML = criticalCases.map(caseItem => `
            <div class="case-item" onclick="app.showCaseDetail(${caseItem.id})">
                <div class="case-header">
                    <div class="case-customer">${caseItem.customerName}</div>
                    <div class="case-priority ${caseItem.priority}">${caseItem.priority}</div>
                </div>
                <div class="case-subject">${caseItem.subject}</div>
                <div class="case-comment">"${this.getLastComment(caseItem)}"</div>
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
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6c757d;">No cases found matching the current filters.</div>';
            return;
        }

        container.innerHTML = this.filteredCases.map(caseItem => `
            <div class="case-list-item" onclick="app.showCaseDetail(${caseItem.id})">
                <div class="case-list-header">
                    <div class="flex items-center gap-2">
                        <span class="case-id">#${caseItem.id}</span>
                        <span class="case-priority ${caseItem.priority}">${caseItem.priority}</span>
                    </div>
                    <span class="case-status ${caseItem.status}">${caseItem.status}</span>
                </div>
                <div class="case-subject">${caseItem.subject}</div>
                <div class="case-meta">
                    <span>Customer: ${caseItem.customerName}</span>
                    <span>Created: ${this.formatDate(caseItem.createdAt)}</span>
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
            <div class="info-item">
                <div class="info-label">Customer</div>
                <div class="info-value">${caseItem.customerName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${caseItem.customerEmail}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">
                    <span class="case-priority ${caseItem.priority}">${caseItem.priority}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                    <span class="case-status ${caseItem.status}">${caseItem.status}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Queue</div>
                <div class="info-value">${caseItem.queue}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Created</div>
                <div class="info-value">${this.formatDateTime(caseItem.createdAt)}</div>
            </div>
        `;

        // Current status
        document.getElementById('currentCaseStatus').textContent = caseItem.status;
        document.getElementById('currentCaseStatus').className = `case-status ${caseItem.status}`;

        // Comments
        this.renderComments();
    }

    renderComments() {
        const container = document.getElementById('commentsList');
        const comments = this.currentCase.comments || [];

        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No comments yet.</p>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <div class="comment-author">${comment.author}</div>
                    <div class="comment-date">${this.formatDateTime(comment.createdAt)}</div>
                </div>
                <div class="comment-text">${comment.text}</div>
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