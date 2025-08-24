class EmailMarketing {
    constructor() {
        this.currentView = 'login';
        this.currentCampaign = null;
        this.currentSegment = null;
        this.data = {
            campaigns: [],
            segments: [],
            customers: []
        };
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
    }

    async checkAuth() {
        try {
            const response = await fetch('/applications/marketing/api/auth/check');
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

        document.getElementById('campaignsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showCampaignsList();
        });

        document.getElementById('segmentsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSegmentsList();
        });

        // Widget clicks
        document.getElementById('campaignsWidget').addEventListener('click', () => {
            this.showCampaignsList();
        });

        document.getElementById('segmentsWidget').addEventListener('click', () => {
            this.showSegmentsList();
        });

        // Back links
        document.getElementById('backToDashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToDashboardFromSegments').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('backToCampaigns').addEventListener('click', (e) => {
            e.preventDefault();
            this.showCampaignsList();
        });

        document.getElementById('backToSegmentsList').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSegmentsList();
        });

        // Create buttons
        document.getElementById('createCampaignBtn').addEventListener('click', () => {
            this.showCampaignForm();
        });

        document.getElementById('createSegmentBtn').addEventListener('click', () => {
            this.showSegmentForm();
        });

        // Campaign form
        document.getElementById('campaignForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCampaignSubmit();
        });

        document.getElementById('cancelCampaignBtn').addEventListener('click', () => {
            this.showCampaignsList();
        });

        // Segment form
        document.getElementById('segmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSegmentSubmit();
        });

        document.getElementById('cancelSegmentBtn').addEventListener('click', () => {
            this.showSegmentsList();
        });

        // Campaign detail actions
        document.getElementById('editCampaignBtn').addEventListener('click', () => {
            this.showCampaignForm(this.currentCampaign);
        });

        document.getElementById('deleteCampaignBtn').addEventListener('click', () => {
            this.handleDeleteCampaign();
        });

        // Segment detail actions
        document.getElementById('addCustomerBtn').addEventListener('click', () => {
            this.showAddCustomerModal();
        });

        document.getElementById('uploadCsvBtn').addEventListener('click', () => {
            this.showUploadCsvModal();
        });

        document.getElementById('deleteSegmentBtn').addEventListener('click', () => {
            this.handleDeleteSegment();
        });

        // Filters
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterRecipients(e.target.value);
        });

        // Modals
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Add Customer Modal
        document.getElementById('closeCustomerModal').addEventListener('click', () => {
            this.hideModal('addCustomerModal');
        });

        document.getElementById('cancelAddCustomer').addEventListener('click', () => {
            this.hideModal('addCustomerModal');
        });

        document.getElementById('addCustomerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCustomer();
        });

        // CSV Upload Modal
        document.getElementById('closeCsvModal').addEventListener('click', () => {
            this.hideModal('uploadCsvModal');
        });

        document.getElementById('cancelCsvUpload').addEventListener('click', () => {
            this.hideModal('uploadCsvModal');
        });

        document.getElementById('csvUpload').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });

        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.handleCsvUpload(e.target.files[0]);
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/applications/marketing/login', {
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
            await fetch('/applications/marketing/logout', { method: 'POST' });
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
            const [campaigns, segments] = await Promise.all([
                fetch('/applications/marketing/api/campaigns').then(r => r.json()),
                fetch('/applications/marketing/api/segments').then(r => r.json())
            ]);

            this.data.campaigns = campaigns;
            this.data.segments = segments;

            this.updateDashboardWidgets();
            this.renderRecentCampaigns();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardWidgets() {
        // Campaign metrics
        const totalClicks = this.data.campaigns.reduce((sum, c) => sum + c.clicks, 0);
        const totalOpens = this.data.campaigns.reduce((sum, c) => sum + c.opens, 0);
        const totalFails = this.data.campaigns.reduce((sum, c) => sum + c.bounces, 0);

        document.getElementById('totalCampaigns').textContent = this.data.campaigns.length;
        document.getElementById('campaignClicks').textContent = totalClicks;
        document.getElementById('campaignOpens').textContent = totalOpens;
        document.getElementById('campaignFails').textContent = totalFails;

        // Segment metrics
        const totalCustomers = this.data.segments.reduce((sum, s) => sum + s.customerCount, 0);
        document.getElementById('totalSegments').textContent = this.data.segments.length;
        document.getElementById('totalCustomers').textContent = totalCustomers;
    }

    renderRecentCampaigns() {
        const container = document.getElementById('campaignsList');
        const recentCampaigns = this.data.campaigns.slice(0, 5);

        container.innerHTML = recentCampaigns.map(campaign => `
            <div class="widget-item" onclick="app.showCampaignDetail(${campaign.id})" style="cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="widget-item-title">
                        <a href="#" onclick="app.showCampaignDetail(${campaign.id}); return false;">${campaign.name}</a>
                    </div>
                    <span class="badge badge-secondary" style="font-size: 0.75rem;">${campaign.status}</span>
                </div>
                <div class="widget-item-meta">
                    Sent: ${campaign.sent} | Opens: ${campaign.opens} | Clicks: ${campaign.clicks} | ${this.formatDate(campaign.createdAt)}
                </div>
            </div>
        `).join('');
    }

    showCampaignsList() {
        this.hideAllViews();
        document.getElementById('campaignsListView').classList.remove('hidden');
        this.currentView = 'campaignsList';
        
        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById('campaignsLink').classList.add('active');
        
        this.renderAllCampaigns();
    }

    renderAllCampaigns() {
        const container = document.getElementById('allCampaignsList');
        container.innerHTML = this.data.campaigns.map(campaign => `
            <div class="document-card" onclick="app.showCampaignDetail(${campaign.id})" style="margin-bottom: var(--spacing-md); cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                    <h4 style="color: var(--primary); margin: 0;">${campaign.name}</h4>
                    <span class="badge badge-secondary">${campaign.status}</span>
                </div>
                <p style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-primary);">
                    Sent: ${campaign.sent} | Opens: ${campaign.opens} | Clicks: ${campaign.clicks} | Bounces: ${campaign.bounces}
                </p>
                <div class="document-meta">
                    <span>Created: ${this.formatDate(campaign.createdAt)}</span>
                    <span>Subject: ${campaign.subject || 'No subject'}</span>
                </div>
            </div>
        `).join('');
    }

    async showCampaignDetail(campaignId) {
        const campaign = this.data.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        this.currentCampaign = campaign;
        this.hideAllViews();
        document.getElementById('campaignDetailView').classList.remove('hidden');
        this.currentView = 'campaignDetail';

        document.getElementById('campaignDetailTitle').textContent = campaign.name;
        this.renderCampaignMetrics(campaign);
        this.renderEmailContent(campaign);
        await this.loadCampaignRecipients(campaignId);
    }

    renderCampaignMetrics(campaign) {
        const container = document.getElementById('campaignDetailMetrics');
        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${campaign.sent}</div>
                <div class="metric-label">Sent</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${campaign.opens}</div>
                <div class="metric-label">Opens</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${campaign.clicks}</div>
                <div class="metric-label">Clicks</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${campaign.bounces}</div>
                <div class="metric-label">Bounces</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((campaign.opens / campaign.sent) * 100).toFixed(1)}%</div>
                <div class="metric-label">Open Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((campaign.clicks / campaign.sent) * 100).toFixed(1)}%</div>
                <div class="metric-label">Click Rate</div>
            </div>
        `;
    }

    renderEmailContent(campaign) {
        document.getElementById('emailContent').innerHTML = campaign.content;
    }

    async loadCampaignRecipients(campaignId) {
        try {
            const recipients = await fetch(`/applications/marketing/api/campaigns/${campaignId}/recipients`).then(r => r.json());
            this.currentRecipients = recipients;
            this.renderRecipients(recipients);
        } catch (error) {
            console.error('Failed to load recipients:', error);
        }
    }

    renderRecipients(recipients) {
        const tbody = document.getElementById('recipientsTableBody');
        tbody.innerHTML = recipients.map(recipient => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: var(--spacing-md); color: var(--text-primary);">${recipient.email}</td>
                <td style="padding: var(--spacing-md); color: var(--text-primary);">${recipient.name}</td>
                <td style="padding: var(--spacing-md);"><span class="badge badge-secondary">${recipient.status}</span></td>
                <td style="padding: var(--spacing-md); color: var(--muted-foreground);">${recipient.sentAt || '-'}</td>
                <td style="padding: var(--spacing-md); color: var(--muted-foreground);">${recipient.openedAt || '-'}</td>
                <td style="padding: var(--spacing-md); color: var(--muted-foreground);">${recipient.clickedAt || '-'}</td>
            </tr>
        `).join('');
    }

    filterRecipients(status) {
        if (!this.currentRecipients) return;
        
        const filtered = status ? 
            this.currentRecipients.filter(r => r.status === status) : 
            this.currentRecipients;
        
        this.renderRecipients(filtered);
    }

    showSegmentsList() {
        this.hideAllViews();
        document.getElementById('segmentsListView').classList.remove('hidden');
        this.currentView = 'segmentsList';
        
        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById('segmentsLink').classList.add('active');
        
        this.renderSegments();
    }

    renderSegments() {
        const container = document.getElementById('segmentsList');
        container.innerHTML = this.data.segments.map(segment => `
            <div class="document-card" onclick="app.showSegmentDetail(${segment.id})" style="margin-bottom: var(--spacing-md); cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                    <h4 style="color: var(--primary); margin: 0;">${segment.name}</h4>
                    <span class="badge badge-secondary">${segment.customerCount} customers</span>
                </div>
                <p style="margin: 0; color: var(--text-primary);">
                    ${segment.description || 'No description provided'}
                </p>
                <div class="document-meta" style="margin-top: var(--spacing-sm);">
                    <span>Created: ${this.formatDate(segment.createdAt || new Date())}</span>
                </div>
            </div>
        `).join('');
    }

    async showSegmentDetail(segmentId) {
        const segment = this.data.segments.find(s => s.id === segmentId);
        if (!segment) return;

        this.currentSegment = segment;
        this.hideAllViews();
        document.getElementById('segmentDetailView').classList.remove('hidden');
        this.currentView = 'segmentDetail';

        document.getElementById('segmentDetailTitle').textContent = segment.name;
        await this.loadSegmentCustomers(segmentId);
    }

    async loadSegmentCustomers(segmentId) {
        try {
            const customers = await fetch(`/applications/marketing/ap/segments/${segmentId}/customers`).then(r => r.json());
            this.currentSegmentCustomers = customers;
            this.renderSegmentCustomers(customers);
        } catch (error) {
            console.error('Failed to load segment customers:', error);
        }
    }

    renderSegmentCustomers(customers) {
        const tbody = document.getElementById('segmentCustomersTableBody');
        tbody.innerHTML = customers.map(customer => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: var(--spacing-md); color: var(--text-primary);">${customer.email}</td>
                <td style="padding: var(--spacing-md); color: var(--text-primary);">${customer.name}</td>
                <td style="padding: var(--spacing-md);"><span class="badge badge-secondary">${customer.status}</span></td>
                <td style="padding: var(--spacing-md); color: var(--muted-foreground);">${customer.addedDate}</td>
                <td style="padding: var(--spacing-md);">
                    <button class="btn btn-sm btn-secondary" onclick="app.removeCustomerFromSegment(${customer.id})">
                        Remove
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showCampaignForm(campaign = null) {
        this.hideAllViews();
        document.getElementById('campaignFormView').classList.remove('hidden');
        this.currentView = 'campaignForm';

        const title = campaign ? 'Edit Campaign' : 'Create Campaign';
        document.getElementById('campaignFormTitle').textContent = title;

        this.populateSegmentSelect();

        if (campaign) {
            document.getElementById('campaignName').value = campaign.name;
            document.getElementById('campaignSubject').value = campaign.subject;
            document.getElementById('campaignSegment').value = campaign.segmentId;
            document.getElementById('campaignContent').value = campaign.content;
        } else {
            document.getElementById('campaignForm').reset();
        }
    }

    populateSegmentSelect() {
        const select = document.getElementById('campaignSegment');
        select.innerHTML = '<option value="">Select a segment</option>' +
            this.data.segments.map(segment => 
                `<option value="${segment.id}">${segment.name}</option>`
            ).join('');
    }

    handleCampaignSubmit() {
        const form = document.getElementById('campaignForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (this.currentCampaign) {
            // Edit existing campaign
            const index = this.data.campaigns.findIndex(c => c.id === this.currentCampaign.id);
            this.data.campaigns[index] = { ...this.currentCampaign, ...data };
        } else {
            // Create new campaign
            const newId = Math.max(...this.data.campaigns.map(c => c.id), 0) + 1;
            const newCampaign = {
                id: newId,
                ...data,
                status: 'draft',
                sent: 0,
                opens: 0,
                clicks: 0,
                bounces: 0,
                createdAt: new Date().toISOString()
            };
            this.data.campaigns.push(newCampaign);
        }

        this.showCampaignsList();
        this.updateDashboardWidgets();
    }

    showSegmentForm(segment = null) {
        this.hideAllViews();
        document.getElementById('segmentFormView').classList.remove('hidden');
        this.currentView = 'segmentForm';

        const title = segment ? 'Edit Segment' : 'Create Segment';
        document.getElementById('segmentFormTitle').textContent = title;

        if (segment) {
            document.getElementById('segmentNameInput').value = segment.name;
            document.getElementById('segmentDescription').value = segment.description;
        } else {
            document.getElementById('segmentForm').reset();
        }
    }

    handleSegmentSubmit() {
        const form = document.getElementById('segmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (this.currentSegment) {
            // Edit existing segment
            const index = this.data.segments.findIndex(s => s.id === this.currentSegment.id);
            this.data.segments[index] = { ...this.currentSegment, ...data };
        } else {
            // Create new segment
            const newId = Math.max(...this.data.segments.map(s => s.id), 0) + 1;
            const newSegment = {
                id: newId,
                ...data,
                customerCount: 0,
                createdAt: new Date().toISOString()
            };
            this.data.segments.push(newSegment);
        }

        this.showSegmentsList();
        this.updateDashboardWidgets();
    }

    handleDeleteCampaign() {
        if (confirm('Are you sure you want to delete this campaign?')) {
            const index = this.data.campaigns.findIndex(c => c.id === this.currentCampaign.id);
            this.data.campaigns.splice(index, 1);
            this.showCampaignsList();
            this.updateDashboardWidgets();
        }
    }

    handleDeleteSegment() {
        if (confirm('Are you sure you want to delete this segment?')) {
            const index = this.data.segments.findIndex(s => s.id === this.currentSegment.id);
            this.data.segments.splice(index, 1);
            this.showSegmentsList();
            this.updateDashboardWidgets();
        }
    }

    showAddCustomerModal() {
        this.showModal('addCustomerModal');
    }

    showUploadCsvModal() {
        this.showModal('uploadCsvModal');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        document.getElementById('overlay').classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        document.getElementById('overlay').classList.add('hidden');
    }

    handleAddCustomer() {
        const form = document.getElementById('addCustomerForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Add customer to current segment
        const newCustomer = {
            id: Date.now(),
            ...data,
            status: 'active',
            addedDate: new Date().toLocaleDateString()
        };

        if (!this.currentSegmentCustomers) {
            this.currentSegmentCustomers = [];
        }

        this.currentSegmentCustomers.push(newCustomer);
        this.renderSegmentCustomers(this.currentSegmentCustomers);
        
        // Update segment count
        this.currentSegment.customerCount++;
        const segmentIndex = this.data.segments.findIndex(s => s.id === this.currentSegment.id);
        this.data.segments[segmentIndex] = this.currentSegment;

        this.hideModal('addCustomerModal');
        form.reset();
    }

    handleCsvUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const customers = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length >= 2 && values[0] && values[1]) {
                    customers.push({
                        id: Date.now() + i,
                        email: values[0],
                        name: values[1],
                        status: 'active',
                        addedDate: new Date().toLocaleDateString()
                    });
                }
            }

            if (!this.currentSegmentCustomers) {
                this.currentSegmentCustomers = [];
            }

            this.currentSegmentCustomers.push(...customers);
            this.renderSegmentCustomers(this.currentSegmentCustomers);
            
            // Update segment count
            this.currentSegment.customerCount += customers.length;
            const segmentIndex = this.data.segments.findIndex(s => s.id === this.currentSegment.id);
            this.data.segments[segmentIndex] = this.currentSegment;

            this.hideModal('uploadCsvModal');
        };

        reader.readAsText(file);
    }

    removeCustomerFromSegment(customerId) {
        if (confirm('Are you sure you want to remove this customer?')) {
            this.currentSegmentCustomers = this.currentSegmentCustomers.filter(c => c.id !== customerId);
            this.renderSegmentCustomers(this.currentSegmentCustomers);
            
            // Update segment count
            this.currentSegment.customerCount--;
            const segmentIndex = this.data.segments.findIndex(s => s.id === this.currentSegment.id);
            this.data.segments[segmentIndex] = this.currentSegment;
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    hideAllViews() {
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('campaignsListView').classList.add('hidden');
        document.getElementById('campaignDetailView').classList.add('hidden');
        document.getElementById('segmentsListView').classList.add('hidden');
        document.getElementById('segmentDetailView').classList.add('hidden');
        document.getElementById('campaignFormView').classList.add('hidden');
        document.getElementById('segmentFormView').classList.add('hidden');
    }
}

// Initialize the app
const app = new EmailMarketing();