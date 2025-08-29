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

        // User profile click
        document.getElementById('userProfile')?.addEventListener('click', () => {
            this.showUserProfileModal();
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
        
        // Initialize template button state (hidden by default)
        this.hideTemplateButton();

        // Global search with suggestions
        this.initSearchFunctionality();

        // Refresh recent files button
        document.getElementById('refreshRecentBtn')?.addEventListener('click', async () => {
            await this.loadRecentFiles();
        });

        // Context menu functionality
        this.initContextMenu();
    }

    initContextMenu() {
        const contextMenu = document.getElementById('fileContextMenu');
        let currentContextPath = null;

        // Prevent browser context menu on file tree
        document.getElementById('fileTree')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Add right-click event listeners to file tree items (will be added dynamically when tree is built)
        this.contextMenuTargetPath = null;

        // Context menu item clicks
        document.getElementById('contextCreateFolder')?.addEventListener('click', () => {
            console.log('Context menu Create Folder clicked, contextMenuTargetPath:', this.contextMenuTargetPath);
            this.hideContextMenu();
            this.showCreateFolderModal(this.contextMenuTargetPath);
        });

        document.getElementById('contextCreateFile')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.showCreateFileModal(this.contextMenuTargetPath);
        });

        document.getElementById('contextUpload')?.addEventListener('click', () => {
            this.hideContextMenu();
            this.showUploadDialog(this.contextMenuTargetPath);
        });

        document.getElementById('contextDelete')?.addEventListener('click', () => {
            console.log('Context menu Delete clicked, contextMenuTargetPath:', this.contextMenuTargetPath, 'contextMenuTargetType:', this.contextMenuTargetType);
            this.hideContextMenu();
            this.handleDeleteItem(this.contextMenuTargetPath, this.contextMenuTargetType);
        });

        // File upload handling
        document.getElementById('fileUploadInput')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files, this.contextMenuTargetPath);
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
    }

    showContextMenu(e, targetPath = null, targetType = 'folder') {
        e.preventDefault();
        e.stopPropagation();
        
        const contextMenu = document.getElementById('fileContextMenu');
        this.contextMenuTargetPath = targetPath || ''; // Empty string for root
        this.contextMenuTargetType = targetType;
        
        console.log('Context menu opened for path:', targetPath, 'type:', targetType); // Debug log
        
        // Position the context menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('fileContextMenu');
        contextMenu?.classList.add('hidden');
        this.contextMenuTargetPath = null;
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
            // Load user profile first
            await this.loadUserProfile();
            
            // Load user activity (starred and recent)
            await this.loadUserActivity();
            
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
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: API endpoint not available`);
            }
            const tree = await response.json();
            this.renderFileTree(tree);
        } catch (error) {
            console.log('File tree API not available, showing empty tree');
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
        return nodes.filter(node => {
            // Hide system folders (those starting with .)
            if (node.type === 'folder' && node.name.startsWith('.')) {
                return false;
            }
            return true;
        }).map(node => {
            if (node.type === 'folder') {
                const hasChildren = node.children && node.children.length > 0;
                const folderId = `folder-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
                
                return `
                    <div class="folder-item" data-folder-path="${node.path}" data-folder-id="${folderId}" style="padding-left: ${16 + level * 16}px">
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

        console.log('Binding file tree events. Current file tree HTML:', fileTree.innerHTML);
        console.log('Found folder items:', fileTree.querySelectorAll('.folder-item').length);

        // Handle folder item clicks for toggling
        fileTree.querySelectorAll('.folder-item').forEach(folderItem => {
            folderItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = folderItem.dataset.folderId;
                // Check if this folder has children
                const hasChildren = document.querySelector(`[data-folder-children="${folderId}"]`);
                if (hasChildren) {
                    this.toggleFolder(folderId);
                }
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

        // Add context menu functionality to folder items
        fileTree.querySelectorAll('.folder-item').forEach(folderItem => {
            console.log('Binding context menu to folder item:', folderItem, 'data-folder-path:', folderItem.dataset.folderPath);
            folderItem.addEventListener('contextmenu', (e) => {
                const folderPath = folderItem.dataset.folderPath;
                console.log('Context menu triggered on folder item, folderPath:', folderPath);
                this.showContextMenu(e, folderPath, 'folder');
            });
        });

        // Add context menu functionality to file items
        fileTree.querySelectorAll('.file-item').forEach(fileItem => {
            console.log('Binding context menu to file item:', fileItem, 'data-document-path:', fileItem.dataset.documentPath);
            fileItem.addEventListener('contextmenu', (e) => {
                e.stopPropagation(); // Prevent folder context menu from firing
                const filePath = fileItem.dataset.documentPath;
                console.log('Context menu triggered on file item, filePath:', filePath);
                this.showContextMenu(e, filePath, 'file');
            });
        });

        // Add context menu for file tree root (empty space)
        fileTree.addEventListener('contextmenu', (e) => {
            // Only show context menu if not clicking on a folder or file item
            if (!e.target.closest('.folder-item') && !e.target.closest('.file-item')) {
                this.showContextMenu(e, null, 'folder'); // null means root directory
            }
        });
    }

    async selectSpace(spaceId) {
        const space = this.data.spaces.find(s => s.id === spaceId);
        if (!space) return;

        this.currentSpace = space;
        this.renderSpacesList(); // Re-render to show selection
        await this.loadFileTree();
        this.updateWorkspaceHeader();
        
        // Show the space view with space content
        this.showSpaceView(space);
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
        const folderIcon = folderItem.querySelector('.folder-icon use');
        
        if (isExpanded) {
            // Collapse
            folderItem.classList.remove('expanded');
            folderChildren.classList.remove('expanded');
            if (folderIcon) {
                folderIcon.setAttribute('href', '#icon-folder');
            }
        } else {
            // Expand
            folderItem.classList.add('expanded');
            folderChildren.classList.add('expanded');
            if (folderIcon) {
                folderIcon.setAttribute('href', '#icon-folder-open');
            }
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

    // Space View Implementation
    async showSpaceView(space) {
        this.setActiveView('space');
        this.currentView = 'space';
        
        // Update space header
        const spaceNameElement = document.getElementById('currentSpaceName');
        if (spaceNameElement) {
            spaceNameElement.textContent = space.name;
        }
        
        // Bind back to home button
        document.getElementById('backToHome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHome();
        });
        
        // Load space content
        await this.loadSpaceContent(space);
    }

    async loadSpaceContent(space) {
        try {
            // Load recent files for this space
            await this.loadSpaceRecentFiles(space);
            
            // Load starred files for this space (placeholder for now)
            this.loadSpaceStarredFiles(space);
            
            // Load root files and folders
            await this.loadSpaceRootItems(space);
            
        } catch (error) {
            console.error('Error loading space content:', error);
        }
    }

    async loadSpaceRecentFiles(space) {
        const container = document.getElementById('spaceRecentFiles');
        if (!container) return;
        
        // Filter documents that belong to this space and sort by modification date
        const recentFiles = this.data.documents
            .filter(doc => doc.spaceId === space.id)
            .sort((a, b) => new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt))
            .slice(0, 6); // Show only 6 most recent
        
        if (recentFiles.length === 0) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-history"></use>
                    </svg>
                    <p>No recent files in this space</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentFiles.map(file => {
            const fileTypeInfo = this.getFileTypeInfo(file.path || file.title);
            const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
            const iconColor = fileTypeInfo.color;
            
            return `
                <div class="file-card" data-document-path="${file.path || file.title}" data-space-name="${file.spaceName}">
                    <i class="fas ${iconClass} file-card-icon" style="color: ${iconColor};"></i>
                    <div class="file-card-info">
                        <div class="file-card-name">${file.title}</div>
                        <div class="file-card-meta">Modified ${this.formatDate(file.modifiedAt || file.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Bind click events
        container.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', () => {
                const documentPath = card.dataset.documentPath;
                const spaceName = card.dataset.spaceName;
                this.openDocumentByPath(documentPath, spaceName);
            });
        });
    }

    loadSpaceStarredFiles(space) {
        const container = document.getElementById('spaceStarredFiles');
        if (!container) return;
        
        // Placeholder for starred files (would need to implement starring functionality)
        container.innerHTML = `
            <div class="no-content-message">
                <svg width="48" height="48" class="no-content-icon">
                    <use href="#icon-star"></use>
                </svg>
                <p>No starred files in this space</p>
                <small>Star files to see them here</small>
            </div>
        `;
    }

    async loadSpaceRootItems(space) {
        const container = document.getElementById('spaceRootItems');
        if (!container) return;
        
        try {
            // Get the folder tree for this space
            const response = await fetch(`/applications/wiki/api/spaces/${space.id}/folders`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: API endpoint not available`);
            }
            const tree = await response.json();
            
            if (tree.length === 0) {
                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-folder"></use>
                        </svg>
                        <p>No files or folders in this space</p>
                        <button id="createFirstFile" class="btn btn-primary" style="margin-top: 12px;">Create First File</button>
                    </div>
                `;
                
                // Bind create first file button
                document.getElementById('createFirstFile')?.addEventListener('click', () => {
                    this.showCreateFileModal();
                });
                return;
            }
            
            // Render root level items only
            const rootItems = tree.filter(item => !item.path.includes('/') || item.path.split('/').length === 1);
            
            container.innerHTML = `
                <div class="items-grid">
                    ${rootItems.map(item => {
                        if (item.type === 'folder') {
                            const childCount = item.children ? item.children.length : 0;
                            return `
                                <div class="item-card folder-card" data-folder-path="${item.path}">
                                    <i class="fas fa-folder item-icon" style="color: var(--text-secondary); font-size: 24px;"></i>
                                    <div class="item-info">
                                        <div class="item-name">${item.name}</div>
                                        <div class="item-meta">Folder • ${childCount} item${childCount !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                            `;
                        } else if (item.type === 'document') {
                            const fileTypeInfo = this.getFileTypeInfo(item.path || item.name);
                            const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                            const iconColor = fileTypeInfo.color;
                            
                            return `
                                <div class="item-card file-card" data-document-path="${item.path}" data-space-name="${item.spaceName}">
                                    <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                    <div class="item-info">
                                        <div class="item-name">${item.title || item.name}</div>
                                        <div class="item-meta">File • ${fileTypeInfo.category}</div>
                                    </div>
                                </div>
                            `;
                        }
                        return '';
                    }).join('')}
                </div>
            `;
            
            // Bind click events for folders and files
            container.querySelectorAll('.folder-card').forEach(card => {
                card.addEventListener('click', () => {
                    const folderPath = card.dataset.folderPath;
                    this.loadFolderContent(folderPath);
                });
            });
            
            container.querySelectorAll('.file-card').forEach(card => {
                card.addEventListener('click', () => {
                    const documentPath = card.dataset.documentPath;
                    const spaceName = card.dataset.spaceName;
                    this.openDocumentByPath(documentPath, spaceName);
                });
            });
            
        } catch (error) {
            console.log('Space root items API not available, showing placeholder');
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-folder"></use>
                    </svg>
                    <p>Space content will appear when backend is connected</p>
                    <button id="createFirstFile" class="btn btn-primary" style="margin-top: 12px;">Create First File</button>
                </div>
            `;
            
            // Bind create first file button
            document.getElementById('createFirstFile')?.addEventListener('click', () => {
                this.showCreateFileModal();
            });
        }
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

    showCreateFolderModal(prefilledPath = null) {
        if (!this.currentSpace) {
            alert('Please select a space first');
            return;
        }
        
        this.showModal('createFolderModal');
        
        if (prefilledPath !== null) {
            // Hide the location dropdown when pre-filled from context menu
            const folderLocationSelect = document.getElementById('folderLocation');
            const locationGroup = folderLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'none';
            }
            // Store the path for form submission
            this.prefilledFolderPath = prefilledPath;
            console.log('Creating folder with prefilled path:', prefilledPath); // Debug log
        } else {
            // Show the location dropdown for normal creation
            const folderLocationSelect = document.getElementById('folderLocation');
            const locationGroup = folderLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'block';
            }
            this.populateFolderLocationSelect();
            this.prefilledFolderPath = null;
        }
    }

    showCreateFileModal(prefilledPath = null) {
        if (!this.currentSpace) {
            alert('Please select a space first');
            return;
        }
        
        this.showModal('createFileModal');
        
        if (prefilledPath !== null) {
            // Hide the location dropdown when pre-filled from context menu
            const fileLocationSelect = document.getElementById('fileLocation');
            const locationGroup = fileLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'none';
            }
            // Store the path for form submission
            this.prefilledFilePath = prefilledPath;
            console.log('Creating file with prefilled path:', prefilledPath); // Debug log
        } else {
            // Show the location dropdown for normal creation
            const fileLocationSelect = document.getElementById('fileLocation');
            const locationGroup = fileLocationSelect?.parentElement;
            if (locationGroup) {
                locationGroup.style.display = 'block';
            }
            this.populateFileLocationSelect();
            this.prefilledFilePath = null;
        }
        
        this.populateTemplateSelect();
    }

    showUploadDialog(targetPath = null) {
        this.uploadTargetPath = targetPath || '';
        const fileInput = document.getElementById('fileUploadInput');
        fileInput?.click();
    }

    async handleFileUpload(files, targetPath = '') {
        if (!files || files.length === 0) return;
        
        const uploadPath = targetPath || '';
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('path', uploadPath);
                formData.append('spaceName', this.currentSpace?.name || 'Personal Space');
                
                const response = await fetch('/applications/wiki/api/files/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification(`File "${file.name}" uploaded successfully`, 'success');
                } else {
                    this.showNotification(`Failed to upload "${file.name}"`, 'error');
                }
            } catch (error) {
                console.error('Upload error:', error);
                this.showNotification(`Failed to upload "${file.name}"`, 'error');
            }
        }
        
        // Reset the file input
        const fileInput = document.getElementById('fileUploadInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Refresh the file tree
        await this.loadFileTree();
    }

    async handleDeleteItem(itemPath, itemType) {
        if (!itemPath && itemType === 'folder') {
            this.showNotification('Cannot delete root folder', 'error');
            return;
        }

        const itemName = itemPath ? itemPath.split('/').pop() : 'item';
        const itemTypeDisplay = itemType === 'folder' ? 'folder' : 'file';
        
        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete the ${itemTypeDisplay} "${itemName}"?\n\nThis action cannot be undone.${itemType === 'folder' ? ' All contents will be deleted.' : ''}`);
        
        if (!confirmed) {
            return;
        }

        try {
            let response;
            
            if (itemType === 'folder') {
                // Delete folder
                response = await fetch(`/applications/wiki/api/folders/${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceId: this.currentSpace?.id,
                        path: itemPath
                    })
                });
            } else {
                // Delete file
                response = await fetch(`/applications/wiki/api/documents/${encodeURIComponent(itemPath)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceId: this.currentSpace?.id,
                        path: itemPath
                    })
                });
            }

            const result = await response.json();

            if (response.ok && result.success) {
                this.showNotification(`${itemTypeDisplay.charAt(0).toUpperCase() + itemTypeDisplay.slice(1)} "${itemName}" deleted successfully`, 'success');
                
                // Refresh the file tree
                await this.loadFileTree();
                
                // If we're currently viewing the deleted item, go back to home
                if (this.currentDocument && itemType === 'file' && this.currentDocument.path === itemPath) {
                    this.showHome();
                }
            } else {
                throw new Error(result.message || `Failed to delete ${itemTypeDisplay}`);
            }
        } catch (error) {
            console.error(`Error deleting ${itemTypeDisplay}:`, error);
            this.showNotification(`Failed to delete ${itemTypeDisplay}`, 'error');
        }
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
    
    async populateTemplateSelect() {
        const select = document.getElementById('fileTemplate');
        if (!select) return;
        
        // Clear existing options except blank document
        select.innerHTML = '<option value="">Blank Document</option>';
        
        try {
            // Load templates from .templates folder
            const response = await fetch(`/applications/wiki/api/spaces/${this.currentSpace.id}/templates`);
            const templates = await response.json();
            
            // Add custom templates from .templates folder
            templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.path;
                option.textContent = template.title || template.name;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading templates for dropdown:', error);
            // Fall back to hardcoded templates if API fails
            const fallbackTemplates = [
                { value: 'basic', text: 'Basic Article' },
                { value: 'api', text: 'API Documentation' },
                { value: 'meeting', text: 'Meeting Notes' },
                { value: 'requirements', text: 'Requirements Doc' }
            ];
            
            fallbackTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.value;
                option.textContent = template.text;
                select.appendChild(option);
            });
        }
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
            // Use prefilled path if available, otherwise use form selection
            const parentPath = this.prefilledFolderPath !== null ? 
                this.prefilledFolderPath : 
                (formData.get('folderLocation') || '');
                
            console.log('Creating folder with parentPath:', parentPath, 'prefilledFolderPath:', this.prefilledFolderPath); // Debug log
                
            const response = await fetch('/applications/wiki/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('folderName'),
                    spaceId: this.currentSpace.id,
                    parentPath: parentPath
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
            const templateContent = await this.getTemplateContent(formData.get('fileTemplate'));
            
            // Use prefilled path if available, otherwise use form selection
            const folderPath = this.prefilledFilePath !== null ? 
                this.prefilledFilePath : 
                (formData.get('fileLocation') || '');
            
            const response = await fetch('/applications/wiki/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('fileName').replace('.md', ''),
                    spaceId: this.currentSpace.id,
                    folderPath: folderPath,
                    template: formData.get('fileTemplate'),
                    content: templateContent
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

    async getTemplateContent(templatePath) {
        if (!templatePath) return '';
        
        // Check if it's a custom template from .templates folder (path starts with .templates)
        if (templatePath.startsWith('.templates/')) {
            try {
                const response = await fetch(`/applications/wiki/api/documents/content`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        spaceName: this.currentSpace.name,
                        path: templatePath
                    })
                });
                
                const templateDoc = await response.json();
                return templateDoc.content || '';
                
            } catch (error) {
                console.error('Error loading custom template content:', error);
                return '';
            }
        } else {
            // Fall back to hardcoded templates for backward compatibility
            const templates = {
                basic: '# Document Title\n\n## Overview\n\nDescription of the document.\n\n## Content\n\nYour content here.',
                api: '# API Documentation\n\n## Endpoint\n\n`GET /api/endpoint`\n\n## Parameters\n\n| Parameter | Type | Description |\n|-----------|------|-------------|\n| param1 | string | Description |\n\n## Response\n\n```json\n{\n  "status": "success"\n}\n```',
                meeting: '# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:** \n\n## Discussion\n\n## Action Items\n\n- [ ] Task 1\n- [ ] Task 2',
                requirements: '# Requirements Document\n\n## Purpose\n\n## Scope\n\n## Requirements\n\n### Functional Requirements\n\n### Non-Functional Requirements\n\n## Acceptance Criteria'
            };
            return templates[templatePath] || '';
        }
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
    async showHome() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutHome');
        this.currentView = 'home';
        
        // Restore full home view
        this.restoreHomeView();
        
        // Load recent files for the homepage
        await this.loadRecentFiles();
        this.loadStarredFiles();
    }

    showRecent() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutRecent');
        this.currentView = 'recent';
        
        // Update workspace title
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Recent Documents';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Documents you have recently accessed';
        
        // Hide starred section and show only recent
        this.showRecentOnlyView();
        
        // Hide template button
        this.hideTemplateButton();
    }

    showStarred() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutStarred');
        this.currentView = 'starred';
        
        // Update workspace title
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Starred Documents';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Documents you have marked as favorites';
        
        // Hide recent section and show only starred
        this.showStarredOnlyView();
        
        // Hide template button
        this.hideTemplateButton();
    }

    showTemplates() {
        this.setActiveView('home');
        this.setActiveShortcut('shortcutTemplates');
        this.currentView = 'templates';
        
        // Update workspace title
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Document Templates';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Reusable templates for creating new documents';
        
        // Hide other sections and show only templates
        this.showTemplatesOnlyView();
    }
    
    showRecentOnlyView() {
        // Hide starred and templates sections, show only recent
        const starredSection = document.querySelector('.content-sections section:nth-child(2)');
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        
        if (starredSection) starredSection.style.display = 'none';
        if (templatesSection) templatesSection.style.display = 'none';
        
        // Load recent files
        this.loadRecentFiles();
    }
    
    showStarredOnlyView() {
        // Hide recent and templates sections, show only starred
        const recentSection = document.querySelector('.content-sections section:nth-child(1)');
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        
        if (recentSection) recentSection.style.display = 'none';
        if (templatesSection) templatesSection.style.display = 'none';
        
        // Load starred files
        this.loadStarredFiles();
    }
    
    showTemplatesOnlyView() {
        // Hide recent and starred sections, show only templates
        const recentSection = document.querySelector('.content-sections section:nth-child(1)');
        const starredSection = document.querySelector('.content-sections section:nth-child(2)');
        
        if (recentSection) recentSection.style.display = 'none';
        if (starredSection) starredSection.style.display = 'none';
        
        // Make sure templates section is visible
        const templatesSection = document.querySelector('.content-sections section:nth-child(3)');
        if (templatesSection) templatesSection.style.display = 'block';
        
        // Load templates
        this.loadTemplates();
    }
    
    restoreHomeView() {
        // Show all sections
        const sections = document.querySelectorAll('.content-sections section');
        sections.forEach(section => section.style.display = 'block');
        
        // Restore original titles
        const workspaceTitle = document.getElementById('workspaceTitle');
        const workspaceSubtitle = document.getElementById('workspaceSubtitle');
        if (workspaceTitle) workspaceTitle.textContent = 'Welcome to Architecture Artifacts';
        if (workspaceSubtitle) workspaceSubtitle.textContent = 'Your documentation workspace dashboard';
        
        // Hide template button
        this.hideTemplateButton();
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
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        const pdfUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = pdfUrl + '&download=true';
        
        // Remove any existing content after header and add PDF viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper pdf-viewer';
        contentWrapper.innerHTML = `
            <div class="pdf-info-bar">
                <div class="file-info">
                    <i class="fas fa-file-pdf" style="color: #dc3545;"></i>
                    <span class="file-name">${doc.metadata.fileName}</span>
                    <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                </div>
            </div>
            <div class="pdf-container">
                <iframe src="${pdfUrl}" width="100%" height="calc(100vh - 160px)" style="border: none; border-radius: 8px;"></iframe>
            </div>
        `;
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
        this.bindDocumentViewEvents();
    }

    // Image Viewer Implementation  
    showImageViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        const imageUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}`;
        const downloadUrl = imageUrl + '&download=true';
        
        // Remove any existing content after header and add image viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper image-viewer';
        contentWrapper.innerHTML = `
            <div class="image-info-bar">
                <div class="file-info">
                    <i class="fas fa-image" style="color: #17a2b8;"></i>
                    <span class="file-name">${doc.metadata.fileName}</span>
                    <span class="file-size">${this.formatFileSize(doc.metadata.size)}</span>
                </div>
            </div>
            <div class="image-container">
                <img src="${imageUrl}" alt="${doc.metadata.fileName}" class="image-content" />
            </div>
        `;
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
        this.bindDocumentViewEvents();
    }

    // Text File Viewer Implementation
    showTextViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        const lines = doc.content.split('\n');
        const numberedLines = lines.map((line, index) => `${(index + 1).toString().padStart(4, ' ')}: ${this.escapeHtml(line)}`).join('\n');
        
        // Remove any existing content after header and add text viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper text-viewer';
        contentWrapper.innerHTML = `
            <div class="text-info-bar">
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
        `;
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
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
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        const language = this.getLanguageFromExtension(doc.metadata.extension);
        const lines = doc.content.split('\n').length;
        
        // Remove any existing content after header and add code viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper code-viewer';
        contentWrapper.innerHTML = `
            <div class="code-info-bar">
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
        `;
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
        // Apply syntax highlighting
        if (typeof Prism !== 'undefined') {
            setTimeout(() => {
                Prism.highlightAllUnder(contentWrapper);
            }, 100);
        }
        
        this.bindDocumentViewEvents();
    }

    // Markdown Viewer Implementation (enhanced version of existing)
    showMarkdownViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        // Remove any existing content after header and add markdown viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper markdown-viewer';
        
        if (typeof marked !== 'undefined') {
            const renderedContent = marked.parse(doc.content);
            contentWrapper.innerHTML = `
                <div class="markdown-content">
                    ${renderedContent}
                </div>
            `;
            
            // Apply syntax highlighting to code blocks
            if (typeof Prism !== 'undefined') {
                setTimeout(() => Prism.highlightAllUnder(contentWrapper), 100);
            }
        } else {
            contentWrapper.innerHTML = `<pre class="markdown-fallback">${this.escapeHtml(doc.content)}</pre>`;
        }
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
        this.bindDocumentViewEvents();
    }

    // Default/Fallback Viewer Implementation
    showDefaultViewer(doc) {
        this.setActiveView('document');
        this.currentView = 'document';
        
        this.updateDocumentHeader(doc);
        
        const contentElement = document.querySelector('#documentView .document-container');
        if (!contentElement) return;
        
        const downloadUrl = `/applications/wiki/api/documents/content?path=${encodeURIComponent(doc.path)}&spaceName=${encodeURIComponent(doc.spaceName)}&download=true`;
        
        // Remove any existing content after header and add default viewer
        const header = contentElement.querySelector('.document-header');
        const existingContent = contentElement.querySelector('.document-content-wrapper');
        if (existingContent) existingContent.remove();
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'document-content-wrapper default-viewer';
        contentWrapper.innerHTML = `
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
                </div>
            </div>
        `;
        
        contentElement.appendChild(contentWrapper);
        
        // Setup download button functionality
        this.setupDownloadButton(downloadUrl, doc.metadata.fileName);
        
        // Setup star button functionality
        this.setupStarButton(doc);
        
        // Track document visit
        this.trackDocumentVisit(doc, 'viewed');
        
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
        
        // Show/hide edit button based on file type
        this.updateEditButton(doc);
    }
    
    // Helper method to setup download button functionality
    setupDownloadButton(downloadUrl, fileName) {
        const downloadBtn = document.getElementById('downloadDocBtn');
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                // Create temporary link for download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
        }
    }
    
    // Helper method to setup star button functionality
    setupStarButton(documentData) {
        const starBtn = document.getElementById('starDocBtn');
        if (starBtn) {
            // Remove existing event listener
            starBtn.onclick = null;
            
            // Update UI based on current star status
            this.updateStarButtonUI(documentData);
            
            // Add click handler
            starBtn.onclick = (e) => {
                e.preventDefault();
                this.toggleDocumentStar(documentData);
            };
        }
    }
    
    // Helper method to update edit button visibility
    updateEditButton(doc) {
        const editBtn = document.getElementById('editDocBtn');
        if (!editBtn) return;
        
        // Check if file type is editable
        const viewer = doc.metadata?.viewer || 'default';
        const isEditable = ['markdown', 'text', 'code', 'web', 'data'].includes(viewer);
        
        if (isEditable) {
            editBtn.style.display = 'flex';
        } else {
            editBtn.style.display = 'none';
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
            
            // Clean up context menu prefilled paths and show location dropdowns again
            if (modalId === 'createFolderModal') {
                this.prefilledFolderPath = null;
                const folderLocationSelect = document.getElementById('folderLocation');
                const locationGroup = folderLocationSelect?.parentElement;
                if (locationGroup) {
                    locationGroup.style.display = 'block';
                }
            } else if (modalId === 'createFileModal') {
                this.prefilledFilePath = null;
                const fileLocationSelect = document.getElementById('fileLocation');
                const locationGroup = fileLocationSelect?.parentElement;
                if (locationGroup) {
                    locationGroup.style.display = 'block';
                }
            }
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

    initSearchFunctionality() {
        const searchInput = document.getElementById('globalSearch');
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (!searchInput || !suggestionsContainer) return;
        
        // Initialize search state variables
        this.searchTimeout = null;
        this.currentSuggestionIndex = -1;
        this.isShowingSuggestions = false;
        
        // Handle input changes for suggestions
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(this.searchTimeout);
            
            if (query.length === 0) {
                this.hideSuggestions();
                return;
            }
            
            if (query.length >= 2) {
                this.searchTimeout = setTimeout(() => {
                    this.fetchSuggestions(query);
                }, 300);
            }
        });
        
        // Handle key navigation
        searchInput.addEventListener('keydown', (e) => {
            const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isShowingSuggestions && suggestionItems.length > 0) {
                        this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestionItems.length - 1);
                        this.highlightSuggestion(this.currentSuggestionIndex);
                    }
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isShowingSuggestions && suggestionItems.length > 0) {
                        this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
                        this.highlightSuggestion(this.currentSuggestionIndex);
                    }
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (this.isShowingSuggestions && this.currentSuggestionIndex >= 0 && suggestionItems[this.currentSuggestionIndex]) {
                        // Select the highlighted suggestion
                        const suggestionData = suggestionItems[this.currentSuggestionIndex].dataset;
                        this.selectSuggestion(suggestionData);
                    } else {
                        // Perform full search
                        this.performSearch();
                    }
                    break;
                    
                case 'Escape':
                    this.hideSuggestions();
                    searchInput.blur();
                    break;
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
        
        // Show suggestions when focusing if there's a query
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                this.fetchSuggestions(query);
            }
        });
    }
    
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/applications/wiki/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
            const suggestions = await response.json();
            
            this.displaySuggestions(suggestions);
        } catch (error) {
            console.error('Suggestions error:', error);
            this.hideSuggestions();
        }
    }
    
    displaySuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');
        
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        const html = suggestions.map(suggestion => {
            // Handle both string and object suggestions
            let title, icon, dataPath, dataSpaceName, dataType, subtitle;
            
            if (typeof suggestion === 'string') {
                // Simple string suggestion - use it as the search term
                title = suggestion;
                icon = this.getSuggestionIcon('search-term');
                dataPath = '';
                dataSpaceName = '';
                dataType = 'search-term';
                subtitle = 'Search for this term';
            } else {
                // Object suggestion with metadata
                title = suggestion.title || suggestion.name || 'Untitled';
                icon = this.getSuggestionIcon(suggestion.type || suggestion.baseType);
                dataPath = suggestion.path || suggestion.relativePath || '';
                dataSpaceName = suggestion.spaceName || suggestion.baseType || '';
                dataType = suggestion.type || 'document';
                subtitle = suggestion.spaceName ? `in ${suggestion.spaceName}` : '';
            }
            
            return `
                <div class="suggestion-item" 
                     data-path="${dataPath}" 
                     data-space-name="${dataSpaceName}"
                     data-title="${title}"
                     data-type="${dataType}">
                    <svg class="suggestion-icon" width="16" height="16">
                        <use href="#${icon}"></use>
                    </svg>
                    <div class="suggestion-text">
                        <div class="suggestion-title">${title}</div>
                        ${subtitle ? `<div class="suggestion-subtitle">${subtitle}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        // Add click handlers to suggestions
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset);
            });
        });
        
        container.classList.remove('hidden');
        this.isShowingSuggestions = true;
        this.currentSuggestionIndex = -1;
    }
    
    getSuggestionIcon(type) {
        switch (type) {
            case 'markdown':
            case 'wiki-document':
                return 'icon-file';
            case 'folder':
                return 'icon-folder';
            case 'code':
                return 'icon-edit';
            case 'image':
                return 'icon-eye';
            case 'search-term':
                return 'icon-search';
            default:
                return 'icon-file';
        }
    }
    
    highlightSuggestion(index) {
        const container = document.getElementById('searchSuggestions');
        const items = container.querySelectorAll('.suggestion-item');
        
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    selectSuggestion(suggestionData) {
        const { path, spaceName, title, type } = suggestionData;
        
        this.hideSuggestions();
        
        // If it's a search term or no specific document, update search box and perform search
        if (type === 'search-term' || (!path || !spaceName)) {
            const searchInput = document.getElementById('globalSearch');
            if (searchInput && title) {
                searchInput.value = title;
            }
            this.performSearch();
        } else {
            // It's a specific document, load it directly
            this.loadDocumentContent(path, spaceName, title);
        }
    }
    
    hideSuggestions() {
        const container = document.getElementById('searchSuggestions');
        container.classList.add('hidden');
        container.innerHTML = '';
        this.isShowingSuggestions = false;
        this.currentSuggestionIndex = -1;
    }

    async performSearch() {
        const searchInput = document.getElementById('globalSearch');
        const query = searchInput.value.trim();
        if (!query) return;

        this.hideSuggestions();

        try {
            const response = await fetch(`/applications/wiki/api/search?q=${encodeURIComponent(query)}&includeContent=false`);
            const results = await response.json();
            
            this.showSearchResults(query, results);
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed', 'error');
        }
    }

    showSearchResults(query, results) {
        // Update search query display
        const queryElement = document.getElementById('searchQuery');
        if (queryElement) {
            queryElement.textContent = `"${query}"`;
        }
        
        // Show search results view
        this.setActiveView('search');
        
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-search"></use>
                    </svg>
                    <p>No results found for "${query}"</p>
                    <p class="text-muted">Try different keywords or check your spelling</p>
                </div>
            `;
            return;
        }
        
        const resultsHtml = results.map(result => {
            const icon = this.getSuggestionIcon(result.type || 'document');
            const title = result.title || result.name || 'Untitled';
            const excerpt = result.excerpt || 'No description available';
            const path = result.path || result.relativePath || '';
            const spaceName = result.spaceName || 'Unknown Space';
            const modifiedDate = result.modifiedAt ? new Date(result.modifiedAt).toLocaleDateString() : '';
            
            return `
                <div class="search-result-item" 
                     data-path="${path}" 
                     data-space-name="${spaceName}"
                     data-title="${title}">
                    <div class="search-result-icon">
                        <svg width="20" height="20">
                            <use href="#${icon}"></use>
                        </svg>
                    </div>
                    <div class="search-result-content">
                        <h3 class="search-result-title">${title}</h3>
                        <p class="search-result-excerpt">${excerpt}</p>
                        <div class="search-result-meta">
                            <span class="search-result-space">${spaceName}</span>
                            ${modifiedDate ? `<span class="search-result-date">Modified ${modifiedDate}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="search-results-header">
                <h2>Found ${results.length} result${results.length === 1 ? '' : 's'}</h2>
            </div>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
        `;
        
        // Add click handlers to results
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const { path, spaceName, title } = item.dataset;
                this.loadDocumentContent(path, spaceName, title);
            });
        });
    }

    async loadDocumentContent(path, spaceName, title) {
        try {
            // Extract the correct space name and file path from the full path
            // The path format is "Personal Space/Areas/file.md" where "Personal Space" is the actual space
            let actualSpaceName = spaceName;
            let actualPath = path;
            
            // If the spaceName is "documents" (the base directory), extract space from path
            if (spaceName === 'documents' || spaceName === 'docs') {
                const pathParts = path.split('/');
                if (pathParts.length > 1) {
                    actualSpaceName = pathParts[0]; // First part is the space name
                    actualPath = pathParts.slice(1).join('/'); // Rest is the file path within the space
                }
            }
            
            console.log(`Loading document: ${actualPath} from space: ${actualSpaceName}`);
            
            const response = await fetch(`/applications/wiki/api/documents/content?path=${encodeURIComponent(actualPath)}&spaceName=${encodeURIComponent(actualSpaceName)}&enhanced=true`);
            const data = await response.json();
            
            if (response.ok) {
                // Track the visit
                await fetch('/applications/wiki/api/user/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: actualPath,
                        spaceName: actualSpaceName,
                        title: title,
                        action: 'viewed'
                    })
                });
                
                // Show document view
                this.displayDocument(data, actualSpaceName, actualPath);
            } else {
                throw new Error(data.error || 'Failed to load document');
            }
        } catch (error) {
            console.error('Error loading document:', error);
            this.showNotification('Failed to load document', 'error');
        }
    }

    displayDocument(documentData, spaceName, path) {
        this.setActiveView('document');
        
        // Update breadcrumb
        const spaceLink = document.getElementById('docBackToSpace');
        if (spaceLink) {
            spaceLink.textContent = spaceName;
            spaceLink.onclick = () => this.showHome();
        }
        
        const titleElement = document.getElementById('currentDocTitle');
        if (titleElement) {
            titleElement.textContent = documentData.metadata?.fileName || path;
        }
        
        // Render content based on viewer type
        const container = document.querySelector('#documentView .document-container');
        const existingContent = container.querySelector('.document-content');
        if (existingContent) {
            existingContent.remove();
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'document-content';
        
        if (documentData.metadata?.viewer === 'markdown') {
            // Render markdown
            contentDiv.innerHTML = `<div class="markdown-content">${marked.parse(documentData.content || '')}</div>`;
        } else {
            // Render as preformatted text
            contentDiv.innerHTML = `<pre class="document-text">${this.escapeHtml(documentData.content || 'No content available')}</pre>`;
        }
        
        container.appendChild(contentDiv);
        
        // Update edit button
        const editBtn = document.getElementById('editDocBtn');
        if (editBtn) {
            editBtn.onclick = () => this.editDocument(path, spaceName, documentData);
        }
        
        // Store current document info
        this.currentDocument = { path, spaceName, data: documentData };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    editDocument(path, spaceName, documentData) {
        // Switch to editor view and load the document content for editing
        this.setActiveView('editor');
        
        // Load the document title and content
        const titleInput = document.getElementById('docTitle');
        const editorTextarea = document.getElementById('editorTextarea');
        
        if (titleInput && documentData.title) {
            titleInput.value = documentData.title || documentData.metadata?.fileName || path;
        }
        
        if (editorTextarea && documentData.content) {
            editorTextarea.value = documentData.content;
        }
        
        // Store current document info for saving
        this.currentDocument = { 
            path, 
            spaceName, 
            data: documentData,
            isEditing: true 
        };
        
        // Update save button functionality
        const saveBtn = document.getElementById('saveDoc');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveCurrentDocument();
        }
    }

    async saveCurrentDocument() {
        if (!this.currentDocument || !this.currentDocument.isEditing) {
            this.showNotification('No document to save', 'error');
            return;
        }
        
        const titleInput = document.getElementById('docTitle');
        const editorTextarea = document.getElementById('editorTextarea');
        
        const title = titleInput?.value?.trim() || this.currentDocument.data.title;
        const content = editorTextarea?.value || '';
        
        try {
            const response = await fetch('/applications/wiki/api/documents/content', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: this.currentDocument.path,
                    spaceName: this.currentDocument.spaceName,
                    content: content
                })
            });
            
            if (response.ok) {
                this.showNotification('Document saved successfully', 'success');
                
                // Update the stored document data
                this.currentDocument.data.content = content;
                this.currentDocument.data.title = title;
                
                // Track the edit
                await fetch('/applications/wiki/api/user/visit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: this.currentDocument.path,
                        spaceName: this.currentDocument.spaceName,
                        title: title,
                        action: 'edited'
                    })
                });
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save document');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            this.showNotification('Failed to save document: ' + error.message, 'error');
        }
    }

    // Placeholder methods for not-yet-implemented features
    async loadRecentFiles() {
        const container = document.getElementById('recentFilesContent');
        if (!container) return;
        
        try {
            // Use activity data for recent files
            const recentFiles = this.data.recent || [];
            
            if (recentFiles.length === 0) {
                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-history"></use>
                        </svg>
                        <p>No recent files found</p>
                        <small>Files you access will appear here</small>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="items-grid">
                    ${recentFiles.map(file => {
                        const fileTypeInfo = this.getFileTypeInfo(file.path);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = this.getFileNameFromPath(file.path);
                        
                        return `
                            <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.space}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${fileName}</div>
                                    <div class="item-meta">File • ${fileTypeInfo.category} • Visited ${this.formatDate(file.lastVisited)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Bind click events
            container.querySelectorAll('.file-card').forEach(card => {
                card.addEventListener('click', () => {
                    const documentPath = card.dataset.documentPath;
                    const spaceName = card.dataset.spaceName;
                    this.openDocumentByPath(documentPath, spaceName);
                });
            });
            
        } catch (error) {
            console.error('Error loading recent files:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Error loading recent files</p>
                </div>
            `;
        }
    }

    loadStarredFiles() {
        const container = document.getElementById('starredFilesContent');
        if (!container) return;
        
        try {
            // Use activity data for starred files
            const starredFiles = this.data.starred || [];
            
            if (starredFiles.length === 0) {
                container.innerHTML = `
                    <div class="no-content-message">
                        <svg width="48" height="48" class="no-content-icon">
                            <use href="#icon-star"></use>
                        </svg>
                        <p>No starred files found</p>
                        <small>Star files to see them here</small>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="items-grid">
                    ${starredFiles.map(file => {
                        const fileTypeInfo = this.getFileTypeInfo(file.path);
                        const iconClass = this.getFileTypeIconClass(fileTypeInfo.category);
                        const iconColor = fileTypeInfo.color;
                        const fileName = this.getFileNameFromPath(file.path);
                        
                        return `
                            <div class="item-card file-card" data-document-path="${file.path}" data-space-name="${file.space}">
                                <i class="fas ${iconClass} item-icon" style="color: ${iconColor}; font-size: 24px;"></i>
                                <div class="item-info">
                                    <div class="item-name">${fileName}</div>
                                    <div class="item-meta">File • ${fileTypeInfo.category} • Starred ${this.formatDate(file.starredAt)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Bind click events
            container.querySelectorAll('.file-card').forEach(card => {
                card.addEventListener('click', () => {
                    const documentPath = card.dataset.documentPath;
                    const spaceName = card.dataset.spaceName;
                    this.openDocumentByPath(documentPath, spaceName);
                });
            });
            
        } catch (error) {
            console.error('Error loading starred files:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Error loading starred files</p>
                </div>
            `;
        }
    }

    async loadTemplates() {
        console.log('Loading templates...');
        
        const container = document.getElementById('templatesContent');
        if (!container) return;
        
        if (!this.currentSpace) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-clipboard"></use>
                    </svg>
                    <p>Select a space to view templates</p>
                </div>
            `;
            return;
        }
        
        try {
            // Try to load templates from backend API
            const response = await fetch(`/applications/wiki/api/spaces/${this.currentSpace.id}/templates`);
            
            if (!response.ok) {
                throw new Error(`Templates API returned ${response.status}: ${response.statusText}`);
            }
            
            const templates = await response.json();
            this.renderTemplatesContent(templates);
            
        } catch (error) {
            console.log('Templates API error:', error.message);
            // Show built-in templates fallback
            this.renderTemplatesFallback();
        }
    }
    
    showTemplateButton() {
        const templatesBtn = document.getElementById('templatesNewBtn');
        const createFileBtn = document.getElementById('createFileBtn');
        
        // Show template button
        if (templatesBtn) {
            templatesBtn.style.display = 'block';
            // Bind the click event if not already bound
            if (!templatesBtn._templatesBound) {
                templatesBtn.addEventListener('click', () => this.createNewTemplate());
                templatesBtn._templatesBound = true;
            }
        }
        
        // Hide create file button when in templates view
        if (createFileBtn) {
            createFileBtn.style.display = 'none';
        }
    }
    
    hideTemplateButton() {
        const templatesBtn = document.getElementById('templatesNewBtn');
        const createFileBtn = document.getElementById('createFileBtn');
        
        // Hide template button
        if (templatesBtn) {
            templatesBtn.style.display = 'none';
        }
        
        // Show create file button when not in templates view
        if (createFileBtn) {
            createFileBtn.style.display = 'block';
        }
    }
    
    renderTemplatesContent(templates) {
        const container = document.getElementById('templatesContent');
        if (!container) return;
        
        if (templates.length === 0) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-clipboard"></use>
                    </svg>
                    <p>No templates found</p>
                    <button id="createFirstTemplate" class="btn btn-primary">
                        <svg width="16" height="16">
                            <use href="#icon-plus"></use>
                        </svg>
                        Create First Template
                    </button>
                </div>
            `;
            
            // Bind create first template button
            document.getElementById('createFirstTemplate')?.addEventListener('click', () => {
                this.createNewTemplate();
            });
        } else {
            // Render templates with create button
            container.innerHTML = `
                <div class="templates-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                    ${templates.map(template => `
                        <div class="template-card" data-template-path="${template.path}" style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.2s ease; background: var(--card);">
                            <div class="template-icon" style="width: 48px; height: 48px; background: var(--accent-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: var(--accent);">
                                <svg width="24" height="24">
                                    <use href="#icon-clipboard"></use>
                                </svg>
                            </div>
                            <div class="template-info">
                                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: var(--foreground);">${template.title || template.name}</h4>
                                <p class="template-meta" style="margin: 0; font-size: 13px; color: var(--muted-foreground);">Custom Template • ${template.lastModified ? new Date(template.lastModified).toLocaleDateString() : ''}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Bind template card clicks
            container.querySelectorAll('.template-card').forEach(card => {
                card.addEventListener('click', () => {
                    const templatePath = card.dataset.templatePath;
                    this.editTemplate(templatePath);
                });
            });
            
            
            // Add hover styles
            const style = document.createElement('style');
            style.textContent = `
                .template-card:hover {
                    border-color: var(--accent) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `;
            container.appendChild(style);
        }
        
        // Show the template button in the header
        this.showTemplateButton();
    }
    
    renderTemplatesFallback() {
        const container = document.getElementById('templatesContent');
        if (!container) return;
        
        // Show a nice fallback with built-in templates until backend is ready
        const fallbackTemplates = [
            {
                name: 'Basic Document',
                description: 'Simple document template with title and sections',
                type: 'built-in',
                key: 'basic'
            },
            {
                name: 'API Documentation',
                description: 'Template for documenting REST APIs',
                type: 'built-in',
                key: 'api'
            },
            {
                name: 'Meeting Notes',
                description: 'Template for meeting minutes and action items',
                type: 'built-in',
                key: 'meeting'
            },
            {
                name: 'Requirements',
                description: 'Template for requirements documentation',
                type: 'built-in',
                key: 'requirements'
            }
        ];
        
        container.innerHTML = `
            <div class="templates-info-banner" style="background: var(--accent-bg); padding: 16px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
                <svg width="20" height="20" style="color: var(--accent-foreground);">
                    <use href="#icon-clipboard"></use>
                </svg>
                <div>
                    <strong>Built-in Templates Available</strong>
                    <p style="margin: 4px 0 0 0; color: var(--muted-foreground);">Custom templates will be available when the backend API is implemented.</p>
                </div>
            </div>
            <div class="templates-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                ${fallbackTemplates.map(template => `
                    <div class="template-card" data-template-key="${template.key}" style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.2s ease; background: var(--card);">
                        <div class="template-icon" style="width: 48px; height: 48px; background: var(--accent-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: var(--accent);">
                            <svg width="24" height="24">
                                <use href="#icon-clipboard"></use>
                            </svg>
                        </div>
                        <div class="template-info">
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: var(--foreground);">${template.name}</h4>
                            <p class="template-meta" style="margin: 0 0 12px 0; font-size: 14px; color: var(--muted-foreground);">${template.description}</p>
                            <span class="template-badge" style="background: var(--accent); color: var(--accent-foreground); padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">Built-in</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Bind template card clicks for preview/edit
        container.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const templateKey = card.dataset.templateKey;
                this.previewBuiltInTemplate(templateKey);
            });
        });
        
        // Show the template button in the header
        this.showTemplateButton();
    }
    
    async previewBuiltInTemplate(templateKey) {
        // Create a preview document with the built-in template content
        const content = await this.getTemplateContent(templateKey);
        const previewDoc = {
            title: `${templateKey.charAt(0).toUpperCase() + templateKey.slice(1)} Template Preview`,
            content: content,
            metadata: {
                viewer: 'markdown',
                isTemplate: true,
                isPreview: true
            }
        };
        
        this.currentDocument = previewDoc;
        this.showEnhancedDocumentView(previewDoc);
        this.showNotification('Previewing built-in template. Save to create a new document.', 'info');
    }
    
    createNewTemplate() {
        const templateName = prompt('Enter template name:');
        if (!templateName) return;
        
        // Create a template document object
        const templateDoc = {
            title: templateName,
            path: `.templates/${templateName}.md`,
            spaceName: this.currentSpace.name,
            content: '# ' + templateName + '\n\nYour template content goes here...',
            metadata: {
                viewer: 'markdown',
                isTemplate: true
            }
        };
        
        // Open in editor
        this.currentDocument = templateDoc;
        this.showEnhancedDocumentView(templateDoc);
    }
    
    async editTemplate(templatePath) {
        try {
            // Load template content
            const response = await fetch(`/applications/wiki/api/documents/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceName: this.currentSpace.name,
                    path: templatePath
                })
            });
            
            const templateDoc = await response.json();
            templateDoc.metadata = templateDoc.metadata || {};
            templateDoc.metadata.isTemplate = true;
            
            this.currentDocument = templateDoc;
            this.showEnhancedDocumentView(templateDoc);
            
        } catch (error) {
            console.error('Error loading template:', error);
            this.showNotification('Error loading template: ' + error.message, 'error');
        }
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
        const contentElement = document.querySelector('#documentView .document-container');
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
        const viewer = doc.metadata?.viewer || 'default';
        
        switch (viewer) {
            case 'markdown':
                this.showMarkdownEditor(doc);
                break;
            case 'text':
            case 'code':
            case 'web':
            case 'data':
                this.showTextCodeEditor(doc);
                break;
            default:
                this.showNotification('This file type cannot be edited', 'warning');
                return;
        }
    }
    
    // Markdown Editor Implementation
    showMarkdownEditor(doc) {
        this.setActiveView('editor');
        this.currentView = 'editor';
        this.isEditing = true;
        
        // Update editor header
        const titleInput = document.getElementById('docTitle');
        if (titleInput) {
            titleInput.value = doc.title;
        }
        
        const textarea = document.getElementById('editorTextarea');
        if (textarea) {
            textarea.value = doc.content || '';
            // Auto-resize textarea
            this.autoResizeTextarea(textarea);
        }
        
        // Show markdown editor pane, hide preview initially
        document.getElementById('markdownEditor')?.classList.remove('hidden');
        document.getElementById('previewPane')?.classList.add('hidden');
        
        // Bind editor events
        this.bindEditorEvents(doc);
    }
    
    // Text/Code Editor Implementation
    showTextCodeEditor(doc) {
        this.setActiveView('editor');
        this.currentView = 'editor';
        this.isEditing = true;
        
        // Update editor header
        const titleInput = document.getElementById('docTitle');
        if (titleInput) {
            titleInput.value = doc.title;
        }
        
        const textarea = document.getElementById('editorTextarea');
        if (textarea) {
            textarea.value = doc.content || '';
            // Set appropriate styling for code
            textarea.style.fontFamily = 'Monaco, Consolas, "Courier New", monospace';
            textarea.style.fontSize = '14px';
            textarea.style.lineHeight = '1.5';
            // Auto-resize textarea
            this.autoResizeTextarea(textarea);
        }
        
        // Show editor pane, hide preview for non-markdown files
        document.getElementById('markdownEditor')?.classList.remove('hidden');
        document.getElementById('previewPane')?.classList.add('hidden');
        
        // Hide preview button for non-markdown files
        const previewBtn = document.getElementById('previewDoc');
        if (previewBtn) {
            previewBtn.style.display = doc.metadata?.viewer === 'markdown' ? 'block' : 'none';
        }
        
        // Bind editor events
        this.bindEditorEvents(doc);
    }
    
    // Auto-resize textarea to fit content
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
        
        // Add input listener for dynamic resizing
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
        });
    }
    
    // Bind editor events
    bindEditorEvents(doc) {
        // Save button
        const saveBtn = document.getElementById('saveDoc');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveDocument(doc);
        }
        
        // Preview button (for markdown)
        const previewBtn = document.getElementById('previewDoc');
        if (previewBtn) {
            previewBtn.onclick = () => this.togglePreview(doc);
        }
        
        // Close button
        const closeBtn = document.getElementById('closeEditor');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeEditor(doc);
        }
        
        // Auto-save on Ctrl+S
        document.addEventListener('keydown', (e) => {
            if (this.isEditing && (e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDocument(doc);
            }
        });
        
        // Bind toolbar buttons for markdown
        if (doc.metadata?.viewer === 'markdown') {
            this.bindMarkdownToolbar();
        }
        
        // Track changes for unsaved indicator
        this.trackContentChanges();
    }
    
    // Bind markdown toolbar functionality
    bindMarkdownToolbar() {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        
        // Bold button
        document.getElementById('boldBtn')?.addEventListener('click', () => {
            this.wrapSelection('**', '**', 'bold text');
        });
        
        // Italic button
        document.getElementById('italicBtn')?.addEventListener('click', () => {
            this.wrapSelection('*', '*', 'italic text');
        });
        
        // Code button
        document.getElementById('codeBtn')?.addEventListener('click', () => {
            this.wrapSelection('`', '`', 'code');
        });
        
        // Heading buttons
        document.getElementById('h1Btn')?.addEventListener('click', () => {
            this.insertHeading(1);
        });
        
        document.getElementById('h2Btn')?.addEventListener('click', () => {
            this.insertHeading(2);
        });
        
        document.getElementById('h3Btn')?.addEventListener('click', () => {
            this.insertHeading(3);
        });
        
        // List buttons
        document.getElementById('listBtn')?.addEventListener('click', () => {
            this.insertList('- ');
        });
        
        document.getElementById('numberedListBtn')?.addEventListener('click', () => {
            this.insertList('1. ');
        });
        
        // Link button
        document.getElementById('linkBtn')?.addEventListener('click', () => {
            this.insertLink();
        });
    }
    
    // Helper method to wrap selected text
    wrapSelection(before, after, placeholder) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const replacement = selectedText || placeholder;
        
        const newText = textarea.value.substring(0, start) + 
                        before + replacement + after + 
                        textarea.value.substring(end);
        
        textarea.value = newText;
        
        // Set cursor position
        const newCursorPos = start + before.length + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }
    
    // Insert heading
    insertHeading(level) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Heading';
        
        const hashmarks = '#'.repeat(level);
        const replacement = `${hashmarks} ${selectedText}`;
        
        // If we're not at the start of a line, add a newline before
        const beforeCursor = textarea.value.substring(0, start);
        const needsNewlineBefore = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
        
        const newText = textarea.value.substring(0, start) + 
                        (needsNewlineBefore ? '\n' : '') + 
                        replacement + 
                        textarea.value.substring(end);
        
        textarea.value = newText;
        
        // Set cursor at end of heading
        const newCursorPos = start + (needsNewlineBefore ? 1 : 0) + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }
    
    // Insert list
    insertList(prefix) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const selectedText = textarea.value.substring(start, textarea.selectionEnd) || 'List item';
        
        const lines = selectedText.split('\n');
        const listItems = lines.map(line => prefix + (line.trim() || 'List item')).join('\n');
        
        // If we're not at the start of a line, add a newline before
        const beforeCursor = textarea.value.substring(0, start);
        const needsNewlineBefore = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
        
        const newText = textarea.value.substring(0, start) + 
                        (needsNewlineBefore ? '\n' : '') + 
                        listItems + 
                        textarea.value.substring(textarea.selectionEnd);
        
        textarea.value = newText;
        
        // Set cursor at end of list
        const newCursorPos = start + (needsNewlineBefore ? 1 : 0) + listItems.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }
    
    // Insert link
    insertLink() {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'link text';
        
        const linkText = `[${selectedText}](url)`;
        
        const newText = textarea.value.substring(0, start) + 
                        linkText + 
                        textarea.value.substring(end);
        
        textarea.value = newText;
        
        // Select the URL part for easy editing
        const urlStart = start + selectedText.length + 3; // position after ](
        const urlEnd = urlStart + 3; // length of 'url'
        textarea.setSelectionRange(urlStart, urlEnd);
        textarea.focus();
    }
    
    // Track content changes
    trackContentChanges() {
        const textarea = document.getElementById('editorTextarea');
        const titleInput = document.getElementById('docTitle');
        const statusElement = document.getElementById('editingStatus');
        
        if (!textarea || !titleInput || !statusElement) return;
        
        let hasUnsavedChanges = false;
        
        const updateStatus = () => {
            if (hasUnsavedChanges) {
                statusElement.textContent = 'Unsaved changes';
                statusElement.style.display = 'block';
            } else {
                statusElement.style.display = 'none';
            }
        };
        
        const markAsChanged = () => {
            hasUnsavedChanges = true;
            updateStatus();
        };
        
        this.markAsSaved = () => {
            hasUnsavedChanges = false;
            updateStatus();
        };
        
        textarea.addEventListener('input', markAsChanged);
        titleInput.addEventListener('input', markAsChanged);
        
        updateStatus();
    }
    
    // Save document
    async saveDocument(doc) {
        const titleInput = document.getElementById('docTitle');
        const textarea = document.getElementById('editorTextarea');
        
        if (!titleInput || !textarea) return;
        
        const title = titleInput.value.trim();
        const content = textarea.value;
        
        if (!title) {
            this.showNotification('Document title is required', 'error');
            return;
        }
        
        try {
            const response = await fetch('/applications/wiki/api/documents/content', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: doc.path,
                    spaceName: doc.spaceName,
                    content: content
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update current document
                this.currentDocument = {
                    ...doc,
                    title: title,
                    content: content
                };
                
                this.showNotification('Document saved successfully!', 'success');
                
                // Mark as saved to hide unsaved changes indicator
                if (this.markAsSaved) {
                    this.markAsSaved();
                }
                
                // Update file tree and other views
                await this.loadFileTree();
            } else {
                throw new Error(result.message || 'Failed to save document');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            this.showNotification('Failed to save document: ' + error.message, 'error');
        }
    }
    
    // Toggle preview for markdown
    togglePreview(doc) {
        const editorPane = document.getElementById('markdownEditor');
        const previewPane = document.getElementById('previewPane');
        const previewContent = document.getElementById('previewContent');
        const textarea = document.getElementById('editorTextarea');
        const previewBtn = document.getElementById('previewDoc');
        
        if (!editorPane || !previewPane || !previewContent || !textarea || !previewBtn) return;
        
        if (previewPane.classList.contains('hidden')) {
            // Show preview
            if (typeof marked !== 'undefined') {
                const renderedContent = marked.parse(textarea.value || '');
                previewContent.innerHTML = renderedContent;
                
                // Apply syntax highlighting
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(previewContent);
                }
            } else {
                previewContent.innerHTML = '<p>Markdown preview not available</p>';
            }
            
            previewPane.classList.remove('hidden');
            previewBtn.textContent = 'Edit';
        } else {
            // Hide preview
            previewPane.classList.add('hidden');
            previewBtn.textContent = 'Preview';
        }
    }
    
    // Close editor
    closeEditor(doc) {
        this.isEditing = false;
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Return to document view
        this.showEnhancedDocumentView(this.currentDocument || doc);
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
        
        // File category mappings matching backend - all icons now use consistent gray color
        const categories = {
            pdf: { 
                category: 'pdf', 
                viewer: 'pdf',
                extensions: ['pdf'],
                icon: 'file-pdf',
                color: '#666666'
            },
            image: {
                category: 'image',
                viewer: 'image', 
                extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
                icon: 'image',
                color: '#666666'
            },
            text: {
                category: 'text',
                viewer: 'text',
                extensions: ['txt', 'csv', 'dat', 'log', 'ini', 'cfg', 'conf'],
                icon: 'file-alt',
                color: '#666666'
            },
            markdown: {
                category: 'markdown',
                viewer: 'markdown',
                extensions: ['md', 'markdown'],
                icon: 'file-alt',
                color: '#666666'
            },
            code: {
                category: 'code',
                viewer: 'code',
                extensions: ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'mm', 'pl', 'sh', 'bash', 'ps1', 'bat', 'cmd'],
                icon: 'file-code',
                color: '#666666'
            },
            web: {
                category: 'web',
                viewer: 'code',
                extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
                icon: 'code',
                color: '#666666'
            },
            data: {
                category: 'data',
                viewer: 'code',
                extensions: ['json', 'xml', 'yaml', 'yml', 'toml', 'properties'],
                icon: 'file-code',
                color: '#666666'
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
            color: '#666666'
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

    getFileNameFromPath(filePath) {
        if (!filePath) return 'Untitled';
        return filePath.split('/').pop() || filePath;
    }

    // User Profile Management
    async loadUserProfile() {
        try {
            const response = await fetch('/applications/wiki/api/profile');
            if (response.ok) {
                this.userProfile = await response.json();
                this.updateUserProfileUI();
            } else {
                console.warn('Failed to load user profile, using defaults');
                this.userProfile = {
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'administrator'
                };
                this.updateUserProfileUI();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Use default profile
            this.userProfile = {
                name: 'Admin User',
                email: 'admin@example.com', 
                role: 'administrator'
            };
            this.updateUserProfileUI();
        }
    }

    updateUserProfileUI() {
        if (!this.userProfile) return;

        // Update header profile
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userInitials = document.getElementById('userInitials');
        
        if (userName) userName.textContent = this.userProfile.name || 'Admin User';
        if (userRole) userRole.textContent = this.capitalizeFirst(this.userProfile.role || 'administrator');
        if (userInitials) {
            const initials = this.getInitials(this.userProfile.name || 'Admin User');
            userInitials.textContent = initials;
        }

        // Update modal profile
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = this.getInitials(this.userProfile.name || 'Admin User');
        }
    }

    getInitials(name) {
        if (!name) return 'AU';
        return name.split(' ')
                   .map(part => part.charAt(0))
                   .join('')
                   .toUpperCase()
                   .substring(0, 2);
    }

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    showUserProfileModal() {
        if (!this.userProfile) {
            this.showNotification('User profile not loaded', 'error');
            return;
        }

        // Populate form with current profile data
        document.getElementById('profileName').value = this.userProfile.name || '';
        document.getElementById('profileEmail').value = this.userProfile.email || '';
        document.getElementById('profileRole').value = this.userProfile.role || 'administrator';
        document.getElementById('profileBio').value = this.userProfile.bio || '';
        document.getElementById('profileLocation').value = this.userProfile.location || '';
        document.getElementById('profileTimezone').value = this.userProfile.timezone || 'UTC';
        
        // Set preferences
        document.getElementById('emailNotifications').checked = this.userProfile.preferences?.emailNotifications ?? true;
        document.getElementById('darkMode').checked = this.userProfile.preferences?.darkMode ?? false;
        document.getElementById('defaultLanguage').value = this.userProfile.preferences?.defaultLanguage || 'en';

        // Show modal
        this.showModal('userProfileModal');

        // Bind form events
        this.bindUserProfileEvents();
    }

    bindUserProfileEvents() {
        // Close modal events
        document.getElementById('closeUserProfileModal')?.addEventListener('click', () => {
            this.hideModal('userProfileModal');
        });

        document.getElementById('cancelUserProfile')?.addEventListener('click', () => {
            this.hideModal('userProfileModal');
        });

        // Form submission
        const form = document.getElementById('userProfileForm');
        if (form) {
            form.removeEventListener('submit', this.handleUserProfileSubmit);
            form.addEventListener('submit', (e) => this.handleUserProfileSubmit(e));
        }

        // Change avatar button (placeholder)
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            this.showNotification('Avatar change feature coming soon!', 'info');
        });
    }

    async handleUserProfileSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = {
            name: formData.get('profileName'),
            email: formData.get('profileEmail'),
            role: formData.get('profileRole'),
            bio: formData.get('profileBio'),
            location: formData.get('profileLocation'),
            timezone: formData.get('profileTimezone'),
            preferences: {
                emailNotifications: formData.has('emailNotifications'),
                darkMode: formData.has('darkMode'),
                defaultLanguage: formData.get('defaultLanguage')
            }
        };

        try {
            const response = await fetch('/applications/wiki/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                this.userProfile = result.profile;
                this.updateUserProfileUI();
                this.hideModal('userProfileModal');
                this.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    }

    // User Activity Management
    async loadUserActivity() {
        try {
            const response = await fetch('/applications/wiki/api/user/activity');
            if (response.ok) {
                this.userActivity = await response.json();
                console.log('User activity loaded:', this.userActivity);
            } else {
                console.warn('Failed to load user activity, using defaults');
                this.userActivity = {
                    starred: [],
                    recent: []
                };
            }
        } catch (error) {
            console.error('Error loading user activity:', error);
            this.userActivity = {
                starred: [],
                recent: []
            };
        }
    }

    async trackDocumentVisit(document, action = 'viewed') {
        try {
            const response = await fetch('/applications/wiki/api/user/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: document.path,
                    spaceName: document.spaceName,
                    title: document.title,
                    action: action
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.userActivity.recent = result.recent;
            }
        } catch (error) {
            console.error('Error tracking document visit:', error);
        }
    }

    async toggleDocumentStar(documentData) {
        if (!documentData) return;

        const isStarred = this.isDocumentStarred(documentData);
        const action = isStarred ? 'unstar' : 'star';

        try {
            const response = await fetch('/applications/wiki/api/user/star', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: documentData.path,
                    spaceName: documentData.spaceName,
                    title: documentData.title,
                    action: action
                })
            });

            if (response.status === 401) {
                this.showNotification('Please log in to star documents', 'error');
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                this.userActivity.starred = result.starred;
                this.updateStarButtonUI(documentData);
                this.showNotification(
                    isStarred ? 'Document unstarred' : 'Document starred', 
                    'success'
                );
                
                // Update home page if visible
                if (this.currentView === 'home') {
                    this.updateHomePageContent();
                }
            } else {
                throw new Error(result.error || 'Failed to update star status');
            }
        } catch (error) {
            console.error('Error toggling star:', error);
            this.showNotification('Failed to update star status: ' + error.message, 'error');
        }
    }

    isDocumentStarred(documentData) {
        if (!this.userActivity || !this.userActivity.starred) return false;
        return this.userActivity.starred.some(item => 
            item.path === documentData.path && item.spaceName === documentData.spaceName
        );
    }

    updateStarButtonUI(documentData) {
        const starBtn = document.getElementById('starDocBtn');
        const starText = starBtn?.querySelector('.star-text');
        
        if (!starBtn || !starText) return;

        const isStarred = this.isDocumentStarred(documentData);
        
        if (isStarred) {
            starBtn.classList.add('starred');
            starText.textContent = 'Starred';
        } else {
            starBtn.classList.remove('starred');
            starText.textContent = 'Star';
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wikiApp = new WikiApp();
});