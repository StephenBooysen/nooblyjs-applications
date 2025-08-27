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
            content.style.maxHeight = 'none'; // Allow natural height when expanded
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
                <i class="fas fa-${this.getSpaceIcon(space.name)}"></i>
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

        // Auto-select first space if none selected
        if (!this.currentSpace && this.data.spaces.length > 0) {
            this.selectSpace(this.data.spaces[0].id);
        }
    }

    renderFileTree(tree) {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        if (tree.length === 0) {
            this.renderEmptyFileTree();
            return;
        }

        // Store the full tree data for later use
        this.fullFileTree = tree;
        
        // Render only root level items initially (folders collapsed)
        fileTree.innerHTML = this.renderTreeNodes(tree, 0, true);
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

    renderTreeNodes(nodes, level = 0, isRoot = false) {
        return nodes.map(node => {
            if (node.type === 'folder') {
                const hasChildren = node.children && node.children.length > 0;
                const folderId = `folder-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
                
                return `
                    <div class="folder-item" data-folder-path="${node.path}" data-folder-id="${folderId}" style="padding-left: ${16 + level * 16}px">
                        ${hasChildren ? `
                            <div class="folder-toggle" data-folder-id="${folderId}">
                                <svg viewBox="0 0 24 24">
                                    <polyline points="9,18 15,12 9,6"></polyline>
                                </svg>
                            </div>
                        ` : ''}
                        <svg class="folder-icon" width="16" height="16">
                            <use href="#icon-folder"></use>
                        </svg>
                        <span>${node.name}</span>
                    </div>
                    ${hasChildren ? `
                        <div class="folder-children" data-folder-children="${folderId}">
                            ${this.renderTreeNodes(node.children, level + 1, false)}
                        </div>
                    ` : ''}
                `;
            } else if (node.type === 'document') {
                // Only show root-level documents initially
                if (isRoot || level > 0) {
                    const fileTypeInfo = this.getFileTypeInfo(node.path || node.name);
                    const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                    const iconColor = fileTypeInfo.color;
                    
                    return `
                        <div class="file-item" data-document-path="${node.path}" data-space-name="${node.spaceName}" style="padding-left: ${16 + level * 16}px">
                            <i class="fas ${iconClass}" style="color: ${iconColor}; width: 16px; text-align: center;"></i>
                            <span>${node.title || node.name}</span>
                        </div>
                    `;
                }
            }
            return '';
        }).join('');
    }

    bindFileTreeEvents() {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree) return;

        // Handle folder toggle clicks
        fileTree.querySelectorAll('.folder-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = toggle.dataset.folderId;
                this.toggleFolder(folderId);
            });
        });

        // Handle folder item clicks (for content loading)
        fileTree.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking the toggle
                if (e.target.closest('.folder-toggle')) return;
                
                const folderPath = item.dataset.folderPath;
                this.selectFolder(folderPath);
                this.loadFolderContent(folderPath);
            });
        });

        // Handle file item clicks
        fileTree.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const documentPath = item.dataset.documentPath;
                const spaceName = item.dataset.spaceName;
                this.openDocumentByPath(documentPath, spaceName);
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

    toggleFolder(folderId) {
        const folderItem = document.querySelector(`[data-folder-id="${folderId}"]`);
        const folderChildren = document.querySelector(`[data-folder-children="${folderId}"]`);
        
        if (!folderItem || !folderChildren) return;

        const isExpanded = folderItem.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            folderItem.classList.remove('expanded');
            folderChildren.classList.remove('expanded');
        } else {
            // Expand
            folderItem.classList.add('expanded');
            folderChildren.classList.add('expanded');
        }
    }

    async loadFolderContent(folderPath) {
        // Find the folder data from the full tree
        const folder = this.findFolderInTree(this.fullFileTree, folderPath);
        if (!folder) return;

        // Create a folder overview view
        const folderContent = this.createFolderOverview(folder);
        this.showFolderView(folderContent);
    }

    findFolderInTree(nodes, targetPath) {
        for (const node of nodes) {
            if (node.type === 'folder' && node.path === targetPath) {
                return node;
            }
            if (node.children) {
                const found = this.findFolderInTree(node.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    }

    createFolderOverview(folder) {
        const childFiles = folder.children ? folder.children.filter(c => c.type === 'document') : [];
        const childFolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];

        // Add child count to each folder for display
        const foldersWithCounts = childFolders.map(childFolder => ({
            ...childFolder,
            childCount: childFolder.children ? childFolder.children.length : 0
        }));

        return {
            title: folder.name,
            path: folder.path,
            spaceName: this.currentSpace?.name || 'Unknown Space',
            stats: {
                files: childFiles.length,
                folders: childFolders.length
            },
            files: childFiles,
            folders: foldersWithCounts
        };
    }

    showFolderView(folderContent) {
        // Switch to a custom folder view
        this.setActiveView('folder');
        
        // Update the main content to show folder overview
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        // Calculate total items for each type
        const totalFiles = folderContent.stats.files;
        const totalFolders = folderContent.stats.folders;
        
        // Create folder view HTML matching the reference design
        const folderViewHtml = `
            <div id="folderView" class="view">
                <div class="folder-header">
                    <nav class="breadcrumb">
                        <a href="#" id="backToSpace">${folderContent.spaceName}</a>
                        <span class="breadcrumb-separator">/</span>
                        <span>${folderContent.title}</span>
                    </nav>
                    
                    <div class="folder-title-section">
                        <svg class="folder-main-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                        </svg>
                        <div class="folder-title-info">
                            <h1>${folderContent.title}</h1>
                            <div class="folder-stats">
                                ${totalFiles > 0 ? `<span class="stat-badge">${totalFiles} file${totalFiles !== 1 ? 's' : ''}</span>` : ''}
                                ${totalFolders > 0 ? `<span class="stat-badge">${totalFolders} folder${totalFolders !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="folder-content">
                    ${folderContent.folders.length === 0 && folderContent.files.length === 0 ? `
                        <div class="empty-folder">
                            <svg width="48" height="48" class="empty-folder-icon">
                                <use href="#icon-folder"></use>
                            </svg>
                            <p>This folder is empty</p>
                        </div>
                    ` : `
                        <div class="items-grid">
                            ${folderContent.folders.map(folder => {
                                const childCount = folder.childCount || 0;
                                return `
                                    <div class="item-card folder-card" data-folder-path="${folder.path}">
                                        <svg class="item-icon folder-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                                        </svg>
                                        <div class="item-info">
                                            <div class="item-name">${folder.name}</div>
                                            <div class="item-meta">Folder • ${childCount} item${childCount !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            ${folderContent.files.map(file => {
                                const fileTypeInfo = this.getFileTypeInfo(file.path || file.name);
                                const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                                const iconColor = fileTypeInfo.color;
                                
                                return `
                                <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.spaceName}">
                                    <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                    <div class="item-info">
                                        <div class="item-name">${file.title || file.name}</div>
                                        <div class="item-meta">File • ${fileTypeInfo.category}</div>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Remove existing folder view if any
        const existingFolderView = document.getElementById('folderView');
        if (existingFolderView) {
            existingFolderView.remove();
        }

        // Add the new folder view
        mainContent.insertAdjacentHTML('beforeend', folderViewHtml);
        
        // Bind events for the folder view
        this.bindFolderViewEvents();
    }

    bindFolderViewEvents() {
        // Back to space button
        document.getElementById('backToSpace')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHome();
        });

        // Folder cards click events
        document.querySelectorAll('#folderView .folder-card').forEach(card => {
            card.addEventListener('click', () => {
                const folderPath = card.dataset.folderPath;
                this.loadFolderContent(folderPath);
            });
        });

        // File cards click events
        document.querySelectorAll('#folderView .file-card').forEach(card => {
            card.addEventListener('click', () => {
                const documentPath = card.dataset.documentPath;
                const spaceName = card.dataset.spaceName;
                this.openDocumentByPath(documentPath, spaceName);
            });
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

    getSpaceIcon(spaceName) {
        // Map space names to appropriate Font Awesome icon names
        const iconMappings = {
            'Architecture Documentation': 'sitemap',
            'Business Requirements': 'briefcase',
            'Development Guidelines': 'code',
            'API Documentation': 'plug',
            'Meeting Notes': 'sticky-note',
            'My Cool Space': 'folder'
        };

        // Look for keywords in space name if exact match not found
        const name = spaceName.toLowerCase();
        if (iconMappings[spaceName]) {
            return iconMappings[spaceName];
        } else if (name.includes('architecture')) {
            return 'sitemap';
        } else if (name.includes('business') || name.includes('requirement')) {
            return 'briefcase';
        } else if (name.includes('development') || name.includes('code')) {
            return 'code';
        } else if (name.includes('api')) {
            return 'plug';
        } else if (name.includes('meeting') || name.includes('notes')) {
            return 'sticky-note';
        } else {
            return 'folder';
        }
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

    async openDocumentByPath(documentPath, spaceName) {
        try {
            // Use enhanced API to get file content with metadata
            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(documentPath)}&spaceName=${encodeURIComponent(spaceName)}&enhanced=true`);
            
            if (!response.ok) {
                throw new Error(`Failed to load document: ${response.statusText}`);
            }
            
            const data = await response.json();
            const { content, metadata } = data;
            
            const document = {
                title: documentPath.split('/').pop(),
                path: documentPath,
                spaceName: spaceName,
                content: content,
                metadata: metadata
            };
            
            this.currentDocument = document;
            this.showEnhancedDocumentView(document);
        } catch (error) {
            console.error('Error loading document by path:', error);
            
            // Fallback: create a basic document structure
            const document = {
                title: documentPath.split('/').pop(),
                path: documentPath,
                spaceName: spaceName,
                content: `# ${documentPath.split('/').pop()}\n\nFailed to load content from ${documentPath}`,
                metadata: { category: 'markdown', viewer: 'markdown' }
            };
            
            this.currentDocument = document;
            this.showEnhancedDocumentView(document);
            this.showNotification('Failed to load document content', 'error');
        }
    }

    // Enhanced document viewer that routes to appropriate viewer based on file type
    showEnhancedDocumentView(document) {
        const viewer = document.metadata?.viewer || 'default';
        
        switch (viewer) {
            case 'pdf':
                this.showPdfViewer(document);
                break;
            case 'image':
                this.showImageViewer(document);
                break;
            case 'text':
                this.showTextViewer(document);
                break;
            case 'code':
                this.showCodeViewer(document);
                break;
            case 'markdown':
                this.showMarkdownViewer(document);
                break;
            default:
                this.showDefaultViewer(document);
                break;
        }
    }

    // PDF Viewer Implementation
    showPdfViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        const pdfUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = pdfUrl + '&download=true';
        
        contentElement.innerHTML = `
            <div class="pdf-viewer">
                <div class="pdf-toolbar">
                    <div class="file-info">
                        <i class="fas fa-file-pdf" style="color: #dc3545;"></i>
                        <span class="file-name">${doc.metadata.fileName}</span>
                        <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                    </div>
                    <div class="pdf-actions">
                        <a href="${downloadUrl}" download="${doc.metadata.fileName}" class="btn btn-primary">
                            <i class="fas fa-download"></i> Download PDF
                        </a>
                    </div>
                </div>
                <div class="pdf-container">
                    <iframe src="${pdfUrl}" width="100%" height="600px" style="border: none; border-radius: 8px;"></iframe>
                </div>
            </div>
        `;
        
        this.bindDocumentViewEvents();
    }

    // Image Viewer Implementation  
    showImageViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        const imageUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = imageUrl + '&download=true';
        
        contentElement.innerHTML = `
            <div class="image-viewer">
                <div class="image-toolbar">
                    <div class="file-info">
                        <i class="fas fa-image" style="color: #17a2b8;"></i>
                        <span class="file-name">${doc.metadata.fileName}</span>
                        <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                    </div>
                    <div class="image-actions">
                        <a href="${downloadUrl}" download="${doc.metadata.fileName}" class="btn btn-primary">
                            <i class="fas fa-download"></i> Download Image
                        </a>
                    </div>
                </div>
                <div class="image-container">
                    <img src="${imageUrl}" alt="${doc.metadata.fileName}" class="image-content" />
                </div>
            </div>
        `;
        
        this.bindDocumentViewEvents();
    }

    // Text File Viewer Implementation
    showTextViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        const lines = doc.content.split('\n');
        const numberedLines = lines.map((line, index) => `${(index + 1).toString().padStart(4, ' ')}: ${this.escapeHtml(line)}`).join('\n');
        
        contentElement.innerHTML = `
            <div class="text-viewer">
                <div class="text-toolbar">
                    <div class="file-info">
                        <i class="fas fa-file-text" style="color: #6c757d;"></i>
                        <span class="file-name">${doc.metadata.fileName}</span>
                        <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                        <span class="line-count">${lines.length} lines</span>
                    </div>
                    <div class="text-controls">
                        <label class="control-label">
                            <input type="checkbox" id="showLineNumbers" checked> Line Numbers
                        </label>
                        <label class="control-label">
                            <input type="checkbox" id="wrapText"> Line Wrap
                        </label>
                    </div>
                </div>
                <div class="text-container">
                    <pre id="textContent" class="text-content with-numbers">${numberedLines}</pre>
                </div>
            </div>
        `;
        
        // Bind text viewer controls
        const showLineNumbersCheckbox = document.getElementById('showLineNumbers');
        const wrapTextCheckbox = document.getElementById('wrapText');
        const textContent = document.getElementById('textContent');
        
        showLineNumbersCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                textContent.textContent = numberedLines;
                textContent.className = 'text-content with-numbers';
            } else {
                textContent.textContent = doc.content;
                textContent.className = 'text-content';
            }
        });
        
        wrapTextCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                textContent.style.whiteSpace = 'pre-wrap';
            } else {
                textContent.style.whiteSpace = 'pre';
            }
        });
        
        this.bindDocumentViewEvents();
    }

    // Code Viewer Implementation
    showCodeViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        const language = this.getLanguageFromExtension(doc.metadata.extension);
        const lines = doc.content.split('\n').length;
        
        contentElement.innerHTML = `
            <div class="code-viewer">
                <div class="code-toolbar">
                    <div class="file-info">
                        <i class="fas fa-file-code" style="color: #28a745;"></i>
                        <span class="file-name">${doc.metadata.fileName}</span>
                        <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                        <span class="line-count">${lines} lines</span>
                        <span class="language-badge">${language}</span>
                    </div>
                </div>
                <div class="code-container">
                    <pre class="line-numbers"><code class="language-${language}" id="codeContent">${this.escapeHtml(doc.content)}</code></pre>
                </div>
            </div>
        `;
        
        // Apply syntax highlighting
        if (typeof Prism !== 'undefined') {
            setTimeout(() => {
                Prism.highlightAllUnder(contentElement);
            }, 100);
        }
        
        this.bindDocumentViewEvents();
    }

    // Markdown Viewer Implementation (enhanced version of existing)
    showMarkdownViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        if (typeof marked !== 'undefined') {
            const renderedContent = marked.parse(doc.content);
            contentElement.innerHTML = `
                <div class="markdown-viewer">
                    <div class="markdown-content">
                        ${renderedContent}
                    </div>
                </div>
            `;
            
            // Apply syntax highlighting to code blocks
            if (typeof Prism !== 'undefined') {
                Prism.highlightAllUnder(contentElement);
            }
        } else {
            contentElement.innerHTML = `<pre class="markdown-fallback">${this.escapeHtml(doc.content)}</pre>`;
        }
        
        this.bindDocumentViewEvents();
    }

    // Default/Fallback Viewer Implementation
    showDefaultViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.getElementById('documentContent');
        if (!contentElement) return;
        
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        
        contentElement.innerHTML = `
            <div class="default-viewer">
                <div class="default-content">
                    <div class="file-icon-large">
                        <i class="fas fa-file" style="font-size: 4rem; color: #6c757d;"></i>
                    </div>
                    <div class="file-details">
                        <h3>${doc.metadata.fileName}</h3>
                        <p class="file-meta">
                            <span>Size: ${this.formatFileSize(doc.metadata.size)}</span><br>
                            <span>Modified: ${this.formatDate(doc.metadata.modified)}</span><br>
                            <span>Type: ${doc.metadata.extension || 'Unknown'}</span>
                        </p>
                        <p class="file-description">
                            This file type is not supported for inline viewing. You can download it to view with an appropriate application.
                        </p>
                        <a href="${downloadUrl}" download="${doc.metadata.fileName}" class="btn btn-primary">
                            <i class="fas fa-download"></i> Download File
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        this.bindDocumentViewEvents();
    }

    // Helper method to update document header
    updateDocumentHeader(doc) {
        const docTitle = document.getElementById('currentDocTitle');
        if (docTitle) {
            docTitle.textContent = doc.title;
        }
        
        const backToSpace = document.getElementById('docBackToSpace');
        if (backToSpace) {
            backToSpace.textContent = doc.spaceName || 'Space';
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

    showDocumentView(doc) {
        // Legacy method for backward compatibility - delegate to enhanced viewer
        if (doc.metadata) {
            this.showEnhancedDocumentView(doc);
            return;
        }
        
        // Fallback to original implementation for documents without metadata
        this.setActiveView('document');
        this.currentView = 'document';
        
        // Update document header
        const docTitle = document.getElementById('currentDocTitle');
        if (docTitle) {
            docTitle.textContent = doc.title;
        }
        
        // Update breadcrumb to show space
        const backToSpace = document.getElementById('docBackToSpace');
        if (backToSpace) {
            backToSpace.textContent = doc.spaceName || 'Space';
        }
        
        // Render document content
        const contentElement = document.getElementById('documentContent');
        if (contentElement && doc.content) {
            if (doc.content.startsWith('<img')) {
                contentElement.innerHTML = doc.content;
            } else if (typeof marked !== 'undefined') {
                // Render markdown content
                contentElement.innerHTML = marked.parse(doc.content);
                
                // Apply syntax highlighting if Prism is available
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(contentElement);
                }
            } else {
                // Fallback: display as preformatted text
                contentElement.innerHTML = `<pre>${this.escapeHtml(doc.content)}</pre>`;
            }
        } else {
            contentElement.innerHTML = '<div class="error-message">Failed to load document content</div>';
        }
        
        // Bind document action events
        this.bindDocumentViewEvents();
    }
    
    bindDocumentViewEvents() {
        // Edit document button
        const editBtn = document.getElementById('editDocBtn');
        if (editBtn) {
            editBtn.onclick = () => {
                this.editCurrentDocument();
            };
        }
        
        // Back to space button
        const backBtn = document.getElementById('docBackToSpace');
        if (backBtn) {
            backBtn.onclick = (e) => {
                e.preventDefault();
                this.showHome();
            };
        }
    }
    
    editCurrentDocument() {
        if (this.currentDocument) {
            // Switch to editor view with current document loaded
            this.showEditorView(this.currentDocument);
        }
    }
    
    showEditorView(doc) {
        // Implementation for showing editor with document content
        console.log('Opening editor for document:', doc);
        // TODO: Implement editor view
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // File type utilities
    getFileTypeInfo(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const fileName = filePath.split('/').pop() || '';
        
        // File category mappings matching backend
        const categories = {
            pdf: { 
                category: 'pdf', 
                viewer: 'pdf',
                extensions: ['pdf'],
                icon: 'file-pdf',
                color: '#dc3545'
            },
            image: {
                category: 'image',
                viewer: 'image', 
                extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
                icon: 'image',
                color: '#17a2b8'
            },
            text: {
                category: 'text',
                viewer: 'text',
                extensions: ['txt', 'csv', 'dat', 'log', 'ini', 'cfg', 'conf'],
                icon: 'file-text',
                color: '#6c757d'
            },
            markdown: {
                category: 'markdown',
                viewer: 'markdown',
                extensions: ['md', 'markdown'],
                icon: 'markdown',
                color: '#007bff'
            },
            code: {
                category: 'code',
                viewer: 'code',
                extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'mm', 'pl', 'sh', 'bash', 'ps1', 'bat', 'cmd'],
                icon: 'file-code',
                color: '#28a745'
            },
            web: {
                category: 'web',
                viewer: 'code',
                extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
                icon: 'code',
                color: '#fd7e14'
            },
            data: {
                category: 'data',
                viewer: 'code',
                extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'properties'],
                icon: 'brackets-curly',
                color: '#6f42c1'
            }
        };
        
        // Check by extension
        for (const [key, info] of Object.entries(categories)) {
            if (info.extensions.includes(ext)) {
                return {
                    category: info.category,
                    viewer: info.viewer,
                    extension: ext,
                    fileName: fileName,
                    icon: info.icon,
                    color: info.color
                };
            }
        }
        
        // Default fallback
        return {
            category: 'other',
            viewer: 'default',
            extension: ext,
            fileName: fileName,
            icon: 'file',
            color: '#6c757d'
        };
    }
    
    getLanguageFromExtension(extension) {
        const languageMap = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript', 
            'tsx': 'tsx',
            'vue': 'vue',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'r': 'r',
            'pl': 'perl',
            'sh': 'bash',
            'bash': 'bash',
            'ps1': 'powershell',
            'bat': 'batch',
            'cmd': 'batch',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'sql': 'sql',
            'md': 'markdown',
            'markdown': 'markdown'
        };
        
        return languageMap[extension.replace('.', '')] || extension.replace('.', '');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    getFileTypeIconClass(category) {
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'image': 'fa-image', 
            'text': 'fa-file-alt',
            'markdown': 'fa-file-alt',
            'code': 'fa-file-code',
            'web': 'fa-code',
            'data': 'fa-file-code', // Use file-code for data files since brackets-curly doesn't exist
            'other': 'fa-file'
        };
        
        return iconMap[category] || 'fa-file';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wikiApp = new WikiApp();
});