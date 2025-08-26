/**
 * @fileoverview Updated Wiki Application with new layout
 * Handles the new collapsible sidebar design with folders and files
 * 
 * @author NooblyJS Team
 * @version 2.0.0
 * @since 2025-08-26
 */
class WikiApp {
    constructor() {
        this.currentView = 'login';
        this.currentSpace = null;
        this.currentDocument = null;
        this.currentFolder = null;
        this.isEditing = false;
        this.data = {
            spaces: [],
            documents: [],
            folders: [],
            templates: [],
            recent: [],
            starred: []
        };
        this.sidebarState = {
            shortcuts: true,
            spaces: true
        };
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.initMarkdown();
        this.initSidebar();
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
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Sidebar collapsible sections
        document.getElementById('shortcutsHeader')?.addEventListener('click', () => {
            this.toggleSidebarSection('shortcuts');
        });

        document.getElementById('spacesHeader')?.addEventListener('click', () => {
            this.toggleSidebarSection('spaces');
        });

        // Shortcuts navigation
        document.getElementById('shortcutHome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHome();
        });

        document.getElementById('shortcutRecent')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRecent();
        });

        document.getElementById('shortcutStarred')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showStarred();
        });

        document.getElementById('shortcutTemplates')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showTemplates();
        });

        // File actions
        document.getElementById('createFolderBtn')?.addEventListener('click', () => {
            this.showCreateFolderModal();
        });

        document.getElementById('createFileBtn')?.addEventListener('click', () => {
            this.showCreateFileModal();
        });

        document.getElementById('createNewMarkdownBtn')?.addEventListener('click', () => {
            this.showCreateFileModal();
        });

        // Space actions
        document.getElementById('createSpaceBtn')?.addEventListener('click', () => {
            this.showCreateSpaceModal();
        });

        // Modal events
        this.bindModalEvents();

        // Global search
        document.getElementById('globalSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        document.getElementById('searchBtn')?.addEventListener('click', () => {
            this.performSearch();
        });
    }

    bindModalEvents() {
        // Create space modal
        document.getElementById('createSpaceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateSpace();
        });

        document.getElementById('closeCreateSpaceModal')?.addEventListener('click', () => {
            this.hideModal('createSpaceModal');
        });

        document.getElementById('cancelCreateSpace')?.addEventListener('click', () => {
            this.hideModal('createSpaceModal');
        });

        // Create folder modal
        document.getElementById('createFolderForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateFolder();
        });

        document.getElementById('closeCreateFolderModal')?.addEventListener('click', () => {
            this.hideModal('createFolderModal');
        });

        document.getElementById('cancelCreateFolder')?.addEventListener('click', () => {
            this.hideModal('createFolderModal');
        });

        // Create file modal
        document.getElementById('createFileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateFile();
        });

        document.getElementById('closeCreateFileModal')?.addEventListener('click', () => {
            this.hideModal('createFileModal');
        });

        document.getElementById('cancelCreateFile')?.addEventListener('click', () => {
            this.hideModal('createFileModal');
        });

        // Overlay click to close modals
        document.getElementById('overlay')?.addEventListener('click', () => {
            this.hideAllModals();
        });
    }

    initSidebar() {
        // Set initial collapsed states
        this.updateSidebarSection('shortcuts', this.sidebarState.shortcuts);
        this.updateSidebarSection('spaces', this.sidebarState.spaces);
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

    toggleSidebarSection(section) {
        this.sidebarState[section] = !this.sidebarState[section];
        this.updateSidebarSection(section, this.sidebarState[section]);
    }

    updateSidebarSection(section, isExpanded) {
        const header = document.getElementById(`${section}Header`);
        const content = document.getElementById(`${section}Content`);
        
        if (!header || !content) return;

        if (isExpanded) {
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            header.classList.add('collapsed');
            content.classList.add('collapsed');
            content.style.maxHeight = '0px';
        }
    }

    async loadInitialData() {
        try {
            // Load spaces
            const spacesResponse = await fetch('/applications/wiki/api/spaces');
            this.data.spaces = await spacesResponse.json();

            // Load documents  
            const documentsResponse = await fetch('/applications/wiki/api/documents');
            this.data.documents = await documentsResponse.json();

            this.renderSpacesList();
            this.loadFileTree();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadFileTree() {
        if (!this.currentSpace) {
            this.renderEmptyFileTree();
            return;
        }

        try {
            const response = await fetch(`/applications/wiki/api/spaces/${this.currentSpace.id}/folders`);
            const tree = await response.json();
            this.renderFileTree(tree);
        } catch (error) {
            console.error('Error loading file tree:', error);
            this.renderEmptyFileTree();
        }
    }

    renderSpacesList() {
        const spacesList = document.getElementById('spacesList');
        if (!spacesList) return;

        if (this.data.spaces.length === 0) {
            spacesList.innerHTML = '<div class="no-spaces">No spaces available</div>';
            return;
        }

        spacesList.innerHTML = this.data.spaces.map(space => `
            <div class="space-item ${this.currentSpace?.id === space.id ? 'selected' : ''}" 
                 data-space-id="${space.id}">
                <i class="flaticon-${this.getSpaceIcon(space.name)}"></i>
                <span class="space-name">${space.name}</span>
            </div>
        `).join('');

        // Update spaces count
        const spacesCount = document.querySelector('.spaces-count');
        if (spacesCount) {
            spacesCount.textContent = this.data.spaces.length;
        }

        // Bind click events
        spacesList.querySelectorAll('.space-item').forEach(item => {
            item.addEventListener('click', () => {
                const spaceId = parseInt(item.dataset.spaceId);
                this.selectSpace(spaceId);
            });
        });
    }

    renderFileTree(tree) {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        if (tree.length === 0) {
            this.renderEmptyFileTree();
            return;
        }

        fileTree.innerHTML = this.renderTreeNodes(tree);
        this.bindFileTreeEvents();
    }

    renderEmptyFileTree() {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        fileTree.innerHTML = `
            <div class="empty-tree">
                <div class="empty-message">
                    ${this.currentSpace ? 'No files or folders' : 'Select a space to view files'}
                </div>
            </div>
        `;
    }

    renderTreeNodes(nodes, level = 0) {
        return nodes.map(node => {
            if (node.type === 'folder') {
                return `
                    <div class="folder-item" data-folder-path="${node.path}" style="padding-left: ${16 + level * 16}px">
                        <svg class="folder-icon" width="16" height="16">
                            <use href="#icon-folder"></use>
                        </svg>
                        <span>${node.name}</span>
                    </div>
                    ${node.children ? this.renderTreeNodes(node.children, level + 1) : ''}
                    ${node.documents ? this.renderTreeNodes(node.documents, level + 1) : ''}
                `;
            } else {
                return `
                    <div class="file-item" data-document-id="${node.id}" style="padding-left: ${16 + level * 16}px">
                        <svg class="file-icon" width="16" height="16">
                            <use href="#icon-file"></use>
                        </svg>
                        <span>${node.title}</span>
                    </div>
                `;
            }
        }).join('');
    }

    bindFileTreeEvents() {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        fileTree.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const folderPath = item.dataset.folderPath;
                this.selectFolder(folderPath);
            });
        });

        fileTree.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const documentId = parseInt(item.dataset.documentId);
                this.openDocument(documentId);
            });
        });
    }

    async selectSpace(spaceId) {
        const space = this.data.spaces.find(s => s.id === spaceId);
        if (!space) return;

        this.currentSpace = space;
        this.renderSpacesList(); // Re-render to show selection
        await this.loadFileTree();
        this.updateWorkspaceHeader();
    }

    selectFolder(folderPath) {
        this.currentFolder = folderPath;
        // Update file tree selection
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.folderPath === folderPath);
        });
    }

    updateWorkspaceHeader() {
        const titleEl = document.getElementById('workspaceTitle');
        const subtitleEl = document.getElementById('workspaceSubtitle');

        if (this.currentSpace) {
            if (titleEl) titleEl.textContent = `Welcome to ${this.currentSpace.name}`;
            if (subtitleEl) subtitleEl.textContent = this.currentSpace.description || 'Your documentation workspace dashboard';
        } else {
            if (titleEl) titleEl.textContent = 'Welcome to Design Artifacts Wiki';
            if (subtitleEl) subtitleEl.textContent = 'Your documentation workspace dashboard';
        }
    }

    // Modal methods
    showCreateSpaceModal() {
        this.showModal('createSpaceModal');
    }

    showCreateFolderModal() {
        if (!this.currentSpace) {
            alert('Please select a space first');
            return;
        }
        this.showModal('createFolderModal');
        this.populateFolderLocationSelect();
    }

    showCreateFileModal() {
        if (!this.currentSpace) {
            alert('Please select a space first');
            return;
        }
        this.showModal('createFileModal');
        this.populateFileLocationSelect();
    }

    populateFolderLocationSelect() {
        const select = document.getElementById('folderLocation');
        if (!select) return;

        // Clear existing options except root
        select.innerHTML = '<option value="">Root</option>';
        
        // Add existing folders as options
        // This would be populated from the current folder tree
    }

    populateFileLocationSelect() {
        const select = document.getElementById('fileLocation');
        if (!select) return;

        // Clear existing options except root
        select.innerHTML = '<option value="">Root</option>';
        
        // Add existing folders as options
        // This would be populated from the current folder tree
    }

    async handleCreateSpace() {
        const form = document.getElementById('createSpaceForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/applications/wiki/api/spaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('spaceName'),
                    description: formData.get('spaceDescription'),
                    visibility: formData.get('spaceVisibility')
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hideModal('createSpaceModal');
                form.reset();
                await this.loadInitialData();
                this.showNotification('Space created successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to create space');
            }
        } catch (error) {
            console.error('Error creating space:', error);
            this.showNotification('Failed to create space', 'error');
        }
    }

    async handleCreateFolder() {
        const form = document.getElementById('createFolderForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/applications/wiki/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('folderName'),
                    spaceId: this.currentSpace.id,
                    parentPath: formData.get('folderLocation') || ''
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hideModal('createFolderModal');
                form.reset();
                await this.loadFileTree();
                this.showNotification('Folder created successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to create folder');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            this.showNotification('Failed to create folder', 'error');
        }
    }

    async handleCreateFile() {
        const form = document.getElementById('createFileForm');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/applications/wiki/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('fileName').replace('.md', ''),
                    spaceId: this.currentSpace.id,
                    folderPath: formData.get('fileLocation') || '',
                    template: formData.get('fileTemplate'),
                    content: this.getTemplateContent(formData.get('fileTemplate'))
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hideModal('createFileModal');
                form.reset();
                await this.loadFileTree();
                this.showNotification('File created successfully!', 'success');
            } else {
                throw new Error(result.message || 'Failed to create file');
            }
        } catch (error) {
            console.error('Error creating file:', error);
            this.showNotification('Failed to create file', 'error');
        }
    }

    getTemplateContent(template) {
        const templates = {
            basic: '# Document Title\n\n## Overview\n\nDescription of the document.\n\n## Content\n\nYour content here.',
            api: '# API Documentation\n\n## Endpoint\n\n`GET /api/endpoint`\n\n## Parameters\n\n| Parameter | Type | Description |\n|-----------|------|-------------|\n| param1 | string | Description |\n\n## Response\n\n```json\n{\n  "status": "success"\n}\n```',
            meeting: '# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:** \n\n## Discussion\n\n## Action Items\n\n- [ ] Task 1\n- [ ] Task 2',
            requirements: '# Requirements Document\n\n## Purpose\n\n## Scope\n\n## Requirements\n\n### Functional Requirements\n\n### Non-Functional Requirements\n\n## Acceptance Criteria'
        };
        return templates[template] || '';
    }

    // View methods
    showHome() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutHome');
        this.currentView = 'home';
    }

    showRecent() {
        this.setActiveView('recent');
        this.setActiveShortcut('shortcutRecent');
        this.loadRecentFiles();
    }

    showStarred() {
        this.setActiveView('starred');  
        this.setActiveShortcut('shortcutStarred');
        this.loadStarredFiles();
    }

    showTemplates() {
        this.setActiveView('templates');
        this.setActiveShortcut('shortcutTemplates');
        this.loadTemplates();
    }

    setActiveView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
    }

    setActiveShortcut(shortcutId) {
        document.querySelectorAll('.shortcut-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeShortcut = document.getElementById(shortcutId);
        if (activeShortcut) {
            activeShortcut.classList.add('active');
        }
    }

    async openDocument(documentId) {
        try {
            const response = await fetch(`/applications/wiki/api/documents/${documentId}`);
            const document = await response.json();
            
            this.currentDocument = document;
            this.showDocumentView(document);
        } catch (error) {
            console.error('Error loading document:', error);
            this.showNotification('Failed to load document', 'error');
        }
    }

    // Utility methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        
        if (modal && overlay) {
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('overlay');
        
        if (modal && overlay) {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.getElementById('overlay')?.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Login/Logout methods
    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('wikiApp').classList.add('hidden');
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/applications/wiki/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            
            if (result.success) {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('wikiApp').classList.remove('hidden');
                await this.loadInitialData();
                this.showHome();
            } else {
                document.getElementById('loginError').textContent = result.message || 'Login failed';
                document.getElementById('loginError').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('loginError').textContent = 'Login failed';
            document.getElementById('loginError').classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await fetch('/applications/wiki/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.showLogin();
        this.currentView = 'login';
        this.currentSpace = null;
        this.currentDocument = null;
    }

    async performSearch() {
        const query = document.getElementById('globalSearch').value.trim();
        if (!query) return;

        try {
            const response = await fetch(`/applications/wiki/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            
            this.showSearchResults(query, results);
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed', 'error');
        }
    }

    showSearchResults(query, results) {
        // Implementation for showing search results
        console.log('Search results:', results);
    }

    // Placeholder methods for not-yet-implemented features
    loadRecentFiles() {
        console.log('Loading recent files...');
    }

    loadStarredFiles() {
        console.log('Loading starred files...');
    }

    loadTemplates() {
        console.log('Loading templates...');
    }

    showDocumentView(document) {
        console.log('Showing document:', document);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wikiApp = new WikiApp();
});