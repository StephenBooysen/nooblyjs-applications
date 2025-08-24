/**
 * @fileoverview Wiki Application
 * The client side javascript library that encapsulates the Wiki application
 * 
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-08-22
 */
class WikiApp {
    constructor() {
        this.currentView = 'login';
        this.currentSpace = null;
        this.currentDocument = null;
        this.isEditing = false;
        this.data = {
            spaces: [],
            documents: [],
            templates: [],
            recent: []
        };
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.initMarkdown();
    }

    async checkAuth() {
        try {
            const response = await fetch('/applications/wiki/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
                await this.loadInitialData();
                this.showHome();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        document.getElementById('homeLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHome();
        });

        document.getElementById('spacesLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSpaces();
        });

        document.getElementById('createLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showEditor();
        });

        document.getElementById('templatesLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTemplates();
        });

        // Search
        document.getElementById('globalSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
        });

        document.getElementById('searchBtn').addEventListener('click', () => {
            const query = document.getElementById('globalSearch').value;
            if (query.trim()) {
                this.performSearch(query);
            }
        });

        // Quick actions
        document.getElementById('quickCreateDoc').addEventListener('click', () => {
            this.showEditor();
        });

        document.getElementById('quickCreateSpace').addEventListener('click', () => {
            this.showCreateSpaceModal();
        });

        document.getElementById('quickBrowse').addEventListener('click', () => {
            this.showSpaces();
        });

        // Space management
        document.getElementById('createSpaceBtn').addEventListener('click', () => {
            this.showCreateSpaceModal();
        });

        document.getElementById('createSpaceFromView').addEventListener('click', () => {
            this.showCreateSpaceModal();
        });

        // Modal events
        document.getElementById('closeCreateSpaceModal').addEventListener('click', () => {
            this.hideCreateSpaceModal();
        });

        document.getElementById('cancelCreateSpace').addEventListener('click', () => {
            this.hideCreateSpaceModal();
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.hideCreateSpaceModal();
        });

        document.getElementById('createSpaceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateSpace();
        });

        // Editor events
        document.getElementById('saveDoc').addEventListener('click', () => {
            this.saveDocument();
        });

        document.getElementById('previewDoc').addEventListener('click', () => {
            this.togglePreview();
        });

        document.getElementById('closeEditor').addEventListener('click', () => {
            this.closeEditor();
        });

        // Navigation breadcrumbs
        document.getElementById('backToSpaces').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSpaces();
        });

        document.getElementById('docBackToSpace').addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentSpace) {
                this.showSpace(this.currentSpace);
            } else {
                this.showSpaces();
            }
        });

        // Document actions
        document.getElementById('editDocBtn').addEventListener('click', () => {
            this.editCurrentDocument();
        });

        document.getElementById('shareDocBtn').addEventListener('click', () => {
            this.shareDocument();
        });

        document.getElementById('docHistory').addEventListener('click', () => {
            this.showDocumentHistory();
        });

        // Space actions
        document.getElementById('createDocInSpace').addEventListener('click', () => {
            this.createDocumentInSpace();
        });

        document.getElementById('spaceSettings').addEventListener('click', () => {
            this.showSpaceSettings();
        });
    }

    initMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });
        }
    }

    async loadInitialData() {
        try {
            const [spacesRes, docsRes, recentRes] = await Promise.all([
                fetch('/applications/wiki/api/spaces'),
                fetch('/applications/wiki/api/documents'),
                fetch('/applications/wiki/api/recent')
            ]);

            this.data.spaces = await spacesRes.json();
            this.data.documents = await docsRes.json();
            this.data.recent = await recentRes.json();

            this.updateSidebar();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/applications/wiki/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                await this.loadInitialData();
                this.showHome();
            } else {
                errorDiv.textContent = data.message || 'Invalid credentials';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await fetch('/applications/wiki/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            this.showLogin();
        }
    }

    showLogin() {
        this.hideAllViews();
        document.getElementById('loginPage').classList.remove('hidden');
        this.currentView = 'login';
        this.updateNavigation();
    }

    showHome() {
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('homeView').classList.remove('hidden');
        this.currentView = 'home';
        this.updateNavigation();
        this.loadHomeData();
    }

    showSpaces() {
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('spacesView').classList.remove('hidden');
        this.currentView = 'spaces';
        this.updateNavigation();
        this.loadSpacesView();
    }

    showSpace(space) {
        this.currentSpace = space;
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('spaceView').classList.remove('hidden');
        this.currentView = 'space';
        this.updateNavigation();
        this.loadSpaceView(space);
    }

    showEditor(document = null) {
        this.currentDocument = document;
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('editorView').classList.remove('hidden');
        this.currentView = 'editor';
        this.updateNavigation();
        this.initEditor(document);
    }

    showDocument(document) {
        this.currentDocument = document;
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('documentView').classList.remove('hidden');
        this.currentView = 'document';
        this.updateNavigation();
        this.loadDocumentView(document);
    }

    showSearch(query) {
        this.hideAllViews();
        document.getElementById('wikiApp').classList.remove('hidden');
        document.getElementById('searchView').classList.remove('hidden');
        this.currentView = 'search';
        this.updateNavigation();
        this.performSearch(query);
    }

    showTemplates() {
        // Implement templates view
        console.log('Templates view - to be implemented');
    }

    hideAllViews() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('wikiApp').classList.add('hidden');
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
    }

    updateNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        switch (this.currentView) {
            case 'home':
                document.getElementById('homeLink').classList.add('active');
                break;
            case 'spaces':
            case 'space':
                document.getElementById('spacesLink').classList.add('active');
                break;
            case 'editor':
                document.getElementById('createLink').classList.add('active');
                break;
            case 'templates':
                document.getElementById('templatesLink').classList.add('active');
                break;
        }
    }

    updateSidebar() {
        this.updateSpacesList();
        this.updateRecentList();
    }

    updateSpacesList() {
        const spacesList = document.getElementById('spacesList');
        spacesList.innerHTML = '';

        this.data.spaces.forEach(space => {
            const spaceItem = document.createElement('a');
            spaceItem.href = '#';
            spaceItem.className = 'space-item';
            spaceItem.innerHTML = `
                <svg class="space-icon" width="16" height="16">
                    <use href="#icon-folder"></use>
                </svg>
                <span>${space.name}</span>
            `;
            spaceItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSpace(space);
            });
            spacesList.appendChild(spaceItem);
        });
    }

    updateRecentList() {
        const recentList = document.getElementById('recentList');
        recentList.innerHTML = '';

        this.data.recent.forEach(item => {
            const recentItem = document.createElement('a');
            recentItem.href = '#';
            recentItem.className = 'recent-item';
            const iconId = item.type === 'space' ? 'icon-folder' : 'icon-file';
            recentItem.innerHTML = `
                <svg class="recent-icon" width="16" height="16">
                    <use href="#${iconId}"></use>
                </svg>
                <span>${item.title}</span>
            `;
            recentItem.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.type === 'space') {
                    this.showSpace(item);
                } else {
                    this.showDocument(item);
                }
            });
            recentList.appendChild(recentItem);
        });
    }

    async loadHomeData() {
        try {
            const [recentModifiedRes, popularRes] = await Promise.all([
                fetch('/applications/wiki/api/documents/recent'),
                fetch('/applications/wiki/api/documents/popular')
            ]);

            const recentModified = await recentModifiedRes.json();
            const popularContent = await popularRes.json();

            this.renderRecentlyModified(recentModified);
            this.renderPopularContent(popularContent);
        } catch (error) {
            console.error('Failed to load home data:', error);
        }
    }

    renderRecentlyModified(documents) {
        const container = document.getElementById('recentlyModified');
        container.innerHTML = '';

        if (documents.length === 0) {
            container.innerHTML = '<p class="text-tertiary">No recent documents</p>';
            return;
        }

        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'widget-item';
            item.innerHTML = `
                <div class="widget-item-title">
                    <a href="#" data-doc-id="${doc.id}">${doc.title}</a>
                </div>
                <div class="widget-item-meta">
                    <span>${doc.spaceName}</span> • 
                    <span>${this.formatDate(doc.modifiedAt)}</span>
                </div>
            `;
            item.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                this.showDocument(doc);
            });
            container.appendChild(item);
        });
    }

    renderPopularContent(documents) {
        const container = document.getElementById('popularContent');
        container.innerHTML = '';

        if (documents.length === 0) {
            container.innerHTML = '<p class="text-tertiary">No popular content yet</p>';
            return;
        }

        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'widget-item';
            item.innerHTML = `
                <div class="widget-item-title">
                    <a href="#" data-doc-id="${doc.id}">${doc.title}</a>
                </div>
                <div class="widget-item-meta">
                    <span>${doc.spaceName}</span> • 
                    <span>${doc.views} views</span>
                </div>
            `;
            item.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                this.showDocument(doc);
            });
            container.appendChild(item);
        });
    }

    loadSpacesView() {
        const spacesGrid = document.getElementById('spacesGrid');
        spacesGrid.innerHTML = '';

        this.data.spaces.forEach(space => {
            const spaceCard = document.createElement('div');
            spaceCard.className = 'space-card glassmorphism';
            spaceCard.innerHTML = `
                <h3>${space.name}</h3>
                <p>${space.description || 'No description'}</p>
                <div class="space-meta">
                    <span>${space.documentCount || 0} documents</span>
                    <span>Updated ${this.formatDate(space.updatedAt)}</span>
                </div>
            `;
            spaceCard.addEventListener('click', () => {
                this.showSpace(space);
            });
            spacesGrid.appendChild(spaceCard);
        });
    }

    async loadSpaceView(space) {
        document.getElementById('currentSpaceName').textContent = space.name;
        
        try {
            const response = await fetch(`/applications/wiki/api/spaces/${space.id}/documents`);
            const documents = await response.json();
            
            const spaceContent = document.getElementById('spaceContent');
            spaceContent.innerHTML = '';

            if (documents.length === 0) {
                spaceContent.innerHTML = `
                    <div class="empty-state glassmorphism">
                        <h3>No documents yet</h3>
                        <p>Create your first document in this space.</p>
                        <button class="btn btn-primary" onclick="app.createDocumentInSpace()">
                            + Create Document
                        </button>
                    </div>
                `;
                return;
            }

            const documentsGrid = document.createElement('div');
            documentsGrid.className = 'documents-grid';
            
            documents.forEach(doc => {
                const docCard = document.createElement('div');
                docCard.className = 'document-card glassmorphism';
                docCard.innerHTML = `
                    <h4>${doc.title}</h4>
                    <p>${doc.excerpt || 'No preview available'}</p>
                    <div class="document-meta">
                        <span>Modified ${this.formatDate(doc.modifiedAt)}</span>
                        <span>by ${doc.author}</span>
                    </div>
                `;
                docCard.addEventListener('click', () => {
                    this.showDocument(doc);
                });
                documentsGrid.appendChild(docCard);
            });
            
            spaceContent.appendChild(documentsGrid);
        } catch (error) {
            console.error('Failed to load space documents:', error);
        }
    }

    initEditor(document = null) {
        const titleInput = document.getElementById('docTitle');
        const textarea = document.getElementById('editorTextarea');
        
        if (document) {
            titleInput.value = document.title || '';
            textarea.value = document.content || '';
        } else {
            titleInput.value = '';
            textarea.value = '';
        }

        // Auto-save functionality
        let saveTimeout;
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveDocument(true); // Auto-save
            }, 5000);
        };

        titleInput.addEventListener('input', autoSave);
        textarea.addEventListener('input', autoSave);
    }

    togglePreview() {
        const editorPane = document.getElementById('markdownEditor');
        const previewPane = document.getElementById('previewPane');
        const previewBtn = document.getElementById('previewDoc');
        
        if (previewPane.classList.contains('hidden')) {
            // Show split view
            const content = document.getElementById('editorTextarea').value;
            const previewContent = document.getElementById('previewContent');
            
            if (typeof marked !== 'undefined') {
                previewContent.innerHTML = marked.parse(content);
            } else {
                previewContent.innerHTML = '<p>Markdown parser not available</p>';
            }
            
            editorPane.classList.add('split');
            previewPane.classList.remove('hidden');
            previewBtn.textContent = 'Hide Preview';
        } else {
            // Hide preview
            editorPane.classList.remove('split');
            previewPane.classList.add('hidden');
            previewBtn.textContent = 'Preview';
        }
    }

    async saveDocument(isAutoSave = false) {
        const title = document.getElementById('docTitle').value.trim();
        const content = document.getElementById('editorTextarea').value;
        
        if (!title && !isAutoSave) {
            alert('Please enter a document title');
            return;
        }

        const documentData = {
            title: title || 'Untitled',
            content: content,
            spaceId: this.currentSpace?.id || null
        };

        if (this.currentDocument?.id) {
            documentData.id = this.currentDocument.id;
        }

        try {
            const response = await fetch('/applications/wiki/api/documents', {
                method: this.currentDocument?.id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(documentData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentDocument = result.document;
                if (!isAutoSave) {
                    this.showNotification('Document saved successfully', 'success');
                }
                // Refresh data
                await this.loadInitialData();
            } else {
                if (!isAutoSave) {
                    this.showNotification(result.message || 'Failed to save document', 'error');
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            if (!isAutoSave) {
                this.showNotification('Failed to save document', 'error');
            }
        }
    }

    closeEditor() {
        if (this.currentSpace) {
            this.showSpace(this.currentSpace);
        } else {
            this.showHome();
        }
    }

    async loadDocumentView(document) {
        document.getElementById('currentDocTitle').textContent = document.title;
        
        try {
            const response = await fetch(`/applications/wiki/api/documents/${document.id}`);
            const fullDocument = await response.json();
            
            const content = document.getElementById('documentContent');
            if (typeof marked !== 'undefined') {
                content.innerHTML = marked.parse(fullDocument.content || '');
            } else {
                content.innerHTML = '<pre>' + (fullDocument.content || 'Content not available') + '</pre>';
            }
        } catch (error) {
            console.error('Failed to load document:', error);
            document.getElementById('documentContent').innerHTML = '<p>Failed to load document content</p>';
        }
    }

    editCurrentDocument() {
        this.showEditor(this.currentDocument);
    }

    shareDocument() {
        // Implement document sharing
        const shareUrl = `${window.location.origin}/applications/wiki/doc/${this.currentDocument.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            this.showNotification('Share link copied to clipboard', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy share link', 'error');
        });
    }

    showDocumentHistory() {
        // Implement document history view
        console.log('Document history - to be implemented');
    }

    createDocumentInSpace() {
        this.showEditor();
    }

    showSpaceSettings() {
        // Implement space settings
        console.log('Space settings - to be implemented');
    }

    async performSearch(query) {
        if (!query.trim()) return;

        document.getElementById('searchQuery').textContent = `"${query}"`;
        
        try {
            const response = await fetch(`/applications/wiki/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            
            this.renderSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.renderSearchResults([]);
        }
    }

    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state glassmorphism">
                    <h3>No results found</h3>
                    <p>Try different keywords or check your spelling.</p>
                </div>
            `;
            return;
        }

        results.forEach(result => {
            const resultCard = document.createElement('div');
            resultCard.className = 'search-result';
            resultCard.innerHTML = `
                <h3>${result.title}</h3>
                <p>${result.excerpt}</p>
                <div class="search-meta">
                    <span>${result.spaceName}</span> • 
                    <span>Modified ${this.formatDate(result.modifiedAt)}</span>
                </div>
            `;
            resultCard.addEventListener('click', () => {
                this.showDocument(result);
            });
            container.appendChild(resultCard);
        });
    }

    showCreateSpaceModal() {
        document.getElementById('createSpaceModal').classList.remove('hidden');
        document.getElementById('overlay').classList.remove('hidden');
        document.getElementById('spaceName').focus();
    }

    hideCreateSpaceModal() {
        document.getElementById('createSpaceModal').classList.add('hidden');
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('createSpaceForm').reset();
    }

    async handleCreateSpace() {
        const formData = new FormData(document.getElementById('createSpaceForm'));
        const spaceData = {
            name: formData.get('spaceName'),
            description: formData.get('spaceDescription'),
            visibility: formData.get('spaceVisibility')
        };

        try {
            const response = await fetch('/applications/wiki/api/spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spaceData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.hideCreateSpaceModal();
                this.showNotification('Space created successfully', 'success');
                await this.loadInitialData();
                this.showSpace(result.space);
            } else {
                this.showNotification(result.message || 'Failed to create space', 'error');
            }
        } catch (error) {
            console.error('Create space error:', error);
            this.showNotification('Failed to create space', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            padding: 12px 16px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--border-radius-sm);
            color: var(--text-primary);
            z-index: 3000;
            backdrop-filter: blur(20px);
            box-shadow: var(--glass-shadow);
        `;
        
        if (type === 'success') {
            notification.style.borderColor = 'var(--success-color)';
            notification.style.color = 'var(--success-color)';
        } else if (type === 'error') {
            notification.style.borderColor = 'var(--danger-color)';
            notification.style.color = 'var(--danger-color)';
        }

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else if (diffInHours < 24 * 7) {
            return `${Math.floor(diffInHours / 24)} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize the application
const app = new WikiApp();