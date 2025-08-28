/**
 * @fileoverview Wiki API routes for Express.js application.
 * Provides RESTful endpoints for structured wiki operations 
 *
 * @author NooblyJS Core Team
 * @version 1.0.14
 * @since 1.0.0
 */

'use strict';
const path = require('path')
const mime = require('mime-types');
const SearchIndexer = require('../activities/searchIndexer');

/**
 * Configures and registers wiki routes with the Express application.
 * Integrates with noobly-core services for data persistence, caching, file storage, etc.
 *
 * @param {Object} options - Configuration options object
 * @param {Object} options.express-app - The Express application instance
 * @param {Object} eventEmitter - Event emitter for logging and notifications
 * @param {Object} services - NooblyJS Core services (dataServe, filing, cache, logger, queue, search)
 * @return {void}
 */
module.exports = (options, eventEmitter, services) => {

  const app = options['express-app'];
  const { dataManager, filing, cache, logger, queue, search } = services;
  
  // Initialize enhanced search indexer
  const searchIndexer = new SearchIndexer(logger);
  
  // Build initial index (async, non-blocking)
  setImmediate(() => {
    searchIndexer.buildIndex().catch(error => {
      logger.error('Failed to build initial search index:', error);
    });
  });
 
  app.post('/applications/wiki/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password') {
      req.session.wikiAuthenticated = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.post('/applications/wiki/logout', (req, res) => {
    req.session.wikiAuthenticated = false;
    res.json({ success: true });
  });

  app.get('/applications/wiki/api/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.wikiAuthenticated });
  });

  // User profile endpoints
  app.get('/applications/wiki/api/profile', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Try to get user profile from cache first
      const cacheKey = 'wiki:user:profile:admin';
      let userProfile = await cache.get(cacheKey);

      if (!userProfile) {
        // Load from dataServe or create default profile
        try {
          userProfile = await dataManager.read('userProfile');
          if (!userProfile) {
            // Create default user profile
            userProfile = {
              id: 'admin',
              username: 'admin',
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'administrator',
              bio: 'System administrator of the wiki platform.',
              location: '',
              timezone: 'UTC',
              preferences: {
                emailNotifications: true,
                darkMode: false,
                defaultLanguage: 'en'
              },
              avatar: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // Save default profile
            await dataManager.write('userProfile', userProfile);
            logger.info('Created default user profile');
          }

          // Cache for 30 minutes
          await cache.put(cacheKey, userProfile, 1800);
          logger.info('Loaded user profile from dataServe and cached');
        } catch (error) {
          logger.error('Error loading user profile from dataServe:', error);
          // Return default profile without saving
          userProfile = {
            id: 'admin',
            username: 'admin',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'administrator',
            bio: '',
            location: '',
            timezone: 'UTC',
            preferences: {
              emailNotifications: true,
              darkMode: false,
              defaultLanguage: 'en'
            },
            avatar: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        logger.info('Loaded user profile from cache');
      }

      res.json(userProfile);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.put('/applications/wiki/api/profile', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const {
        name,
        email,
        role,
        bio,
        location,
        timezone,
        preferences
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Get current profile
      let currentProfile;
      try {
        currentProfile = await dataManager.read('userProfile');
      } catch (error) {
        logger.warn('No existing user profile found, creating new one');
      }

      // Create updated profile
      const updatedProfile = {
        ...(currentProfile || {}),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || 'administrator',
        bio: bio || '',
        location: location || '',
        timezone: timezone || 'UTC',
        preferences: {
          emailNotifications: preferences?.emailNotifications ?? true,
          darkMode: preferences?.darkMode ?? false,
          defaultLanguage: preferences?.defaultLanguage || 'en'
        },
        updatedAt: new Date().toISOString(),
        // Preserve existing fields
        id: 'admin',
        username: 'admin',
        avatar: currentProfile?.avatar || null,
        createdAt: currentProfile?.createdAt || new Date().toISOString()
      };

      // Save updated profile
      await dataManager.write('userProfile', updatedProfile);

      // Clear cache to force refresh
      const cacheKey = 'wiki:user:profile:admin';
      await cache.delete(cacheKey);

      logger.info(`Updated user profile for admin: ${name}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // User activity tracking endpoints
  app.get('/applications/wiki/api/user/activity', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = 'admin'; // For now, we'll use 'admin' as the default user
      
      // Try to get user activity from dataServe
      let userActivity = await dataManager.read(`userActivity_${userId}`);
      
      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        logger.info(`No existing activity found for user ${userId}, creating new activity record`);
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save initial activity record
        await dataManager.write(`userActivity_${userId}`, userActivity);
      }

      res.json(userActivity);
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });

  app.post('/applications/wiki/api/user/star', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;
      
      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = 'admin';
      
      // Get current user activity
      let userActivity = await dataManager.read(`userActivity_${userId}`);
      
      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const documentInfo = {
        path: path,
        spaceName: spaceName,
        title: title,
        starredAt: new Date().toISOString()
      };

      if (action === 'star') {
        // Add to starred if not already starred
        const isAlreadyStarred = userActivity.starred.some(item => 
          item.path === path && item.spaceName === spaceName
        );
        
        if (!isAlreadyStarred) {
          userActivity.starred.unshift(documentInfo);
        }
      } else if (action === 'unstar') {
        // Remove from starred
        userActivity.starred = userActivity.starred.filter(item => 
          !(item.path === path && item.spaceName === spaceName)
        );
      }

      userActivity.updatedAt = new Date().toISOString();
      
      // Save updated activity
      await dataManager.write(`userActivity_${userId}`, userActivity);
      
      logger.info(`Document ${action}red: ${title} by user ${userId}`);

      res.json({
        success: true,
        message: `Document ${action}red successfully`,
        starred: userActivity.starred
      });
    } catch (error) {
      logger.error('Error updating star status:', error);
      res.status(500).json({ error: 'Failed to update star status' });
    }
  });

  app.post('/applications/wiki/api/user/visit', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.wikiAuthenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { path, spaceName, title, action } = req.body;
      
      if (!path || !spaceName || !title) {
        return res.status(400).json({ error: 'Path, spaceName, and title are required' });
      }

      const userId = 'admin';
      
      // Get current user activity
      let userActivity = await dataManager.read(`userActivity_${userId}`);
      
      // If result is empty array or doesn't have expected structure, create new activity record
      if (Array.isArray(userActivity) || !userActivity || !userActivity.hasOwnProperty('starred')) {
        userActivity = {
          userId: userId,
          starred: [],
          recent: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const documentInfo = {
        path: path,
        spaceName: spaceName,
        title: title,
        action: action, // 'viewed' or 'edited'
        visitedAt: new Date().toISOString()
      };

      // Remove existing entry for this document if it exists
      userActivity.recent = userActivity.recent.filter(item => 
        !(item.path === path && item.spaceName === spaceName)
      );

      // Add to beginning of recent list
      userActivity.recent.unshift(documentInfo);

      // Keep only last 20 recent items
      userActivity.recent = userActivity.recent.slice(0, 20);

      userActivity.updatedAt = new Date().toISOString();
      
      // Save updated activity
      await dataManager.write(`userActivity_${userId}`, userActivity);
      
      logger.info(`Document visit tracked: ${title} (${action}) by user ${userId}`);

      res.json({
        success: true,
        message: 'Visit tracked successfully',
        recent: userActivity.recent
      });
    } catch (error) {
      logger.error('Error tracking visit:', error);
      res.status(500).json({ error: 'Failed to track visit' });
    }
  });

  // Wiki API endpoints with caching
  app.get('/applications/wiki/api/spaces', async (req, res) => {
    try {
      // Check cache first
      const cacheKey = 'wiki:spaces:list';
      let spaces = await cache.get(cacheKey);
      
      if (!spaces) {
        // Load from dataServe using the new container-based approach
        try {
          logger.info('Attempting to find spaces in wiki container...');
          spaces = await dataManager.read('spaces');
          logger.info(`Find result: ${spaces ? JSON.stringify(spaces).substring(0, 100) : 'null'}`);
          
          if (!spaces || !Array.isArray(spaces)) {
            logger.warn('No spaces found or invalid result, initializing empty array');
            spaces = [];
          }
          
          // Cache for 5 minutes
          await cache.put(cacheKey, spaces, 300);
          logger.info(`Loaded ${spaces.length} spaces from dataServe and cached`);
        } catch (error) {
          logger.error('Error loading spaces from dataServe:', error.message, error.stack);
          spaces = [];
        }
      } else {
        logger.info('Loaded spaces from cache');
      }
      
      res.json(spaces);
    } catch (error) {
      logger.error('Error fetching spaces:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch spaces', details: error.message });
    }
  });

  app.get('/applications/wiki/api/documents', async (req, res) => {
    try {
      // Check cache first
      const cacheKey = 'wiki:documents:list';
      let documents = await cache.get(cacheKey);
      
      if (!documents) {
        // Load from dataServe using the new container-based approach
        try {
          documents = await dataManager.read('documents');
          if (!documents) documents = [];
          
          // Cache for 5 minutes
          await cache.put(cacheKey, documents, 300);
          logger.info(`Loaded ${documents.length} documents from dataServe and cached`);
        } catch (error) {
          logger.warn('Could not load documents from dataServe:', error.message);
          documents = [];
        }
      } else {
        logger.info('Loaded documents from cache');
      }
      
      res.json(documents);
    } catch (error) {
      logger.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.get('/applications/wiki/api/recent', async (req, res) => {
    try {
      const cacheKey = 'wiki:recent:activity';
      let recent = await cache.get(cacheKey);
      
      if (!recent) {
        const documents = await dataManager.read('documents');
        const spaces = await dataManager.read('spaces');
        
        // Combine and sort by modification date
        const recentItems = [
          ...documents.map(doc => ({ ...doc, type: 'document' })),
          ...spaces.map(space => ({ ...space, type: 'space' }))
        ].sort((a, b) => new Date(b.modifiedAt || b.updatedAt) - new Date(a.modifiedAt || a.updatedAt))
         .slice(0, 10);
        
        recent = recentItems;
        await cache.put(cacheKey, recent, 300); // 5 minutes
        logger.info('Generated recent activity list');
      }
      
      res.json(recent);
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
  });

  // Utility function to determine file category and viewer type
  function getFileTypeInfo(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // File category mappings
    const categories = {
      // PDF files
      pdf: { 
        category: 'pdf', 
        viewer: 'pdf',
        extensions: ['.pdf'],
        mimes: ['application/pdf']
      },
      
      // Images
      image: {
        category: 'image',
        viewer: 'image', 
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
        mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/webp', 'image/x-icon']
      },
      
      // Text files
      text: {
        category: 'text',
        viewer: 'text',
        extensions: ['.txt', '.csv', '.dat', '.log', '.ini', '.cfg', '.conf'],
        mimes: ['text/plain', 'text/csv']
      },
      
      // Markdown
      markdown: {
        category: 'markdown',
        viewer: 'markdown',
        extensions: ['.md', '.markdown'],
        mimes: ['text/markdown']
      },
      
      // Code files
      code: {
        category: 'code',
        viewer: 'code',
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.mm', '.pl', '.sh', '.bash', '.ps1', '.bat', '.cmd'],
        mimes: ['text/javascript', 'application/javascript', 'text/typescript', 'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++', 'text/x-csharp']
      },
      
      // Web files (HTML, CSS)
      web: {
        category: 'web',
        viewer: 'code',
        extensions: ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
        mimes: ['text/html', 'text/css']
      },
      
      // Data/Configuration files
      data: {
        category: 'data',
        viewer: 'code',
        extensions: ['.json', '.xml', '.yaml', '.yml', '.toml', '.properties'],
        mimes: ['application/json', 'application/xml', 'text/xml', 'application/yaml', 'application/x-yaml']
      }
    };
    
    // Check by extension first, then MIME type
    for (const [key, info] of Object.entries(categories)) {
      if (info.extensions.includes(ext) || info.mimes.includes(mimeType)) {
        return {
          category: info.category,
          viewer: info.viewer,
          extension: ext,
          mimeType: mimeType,
          fileName: fileName
        };
      }
    }
    
    // Default fallback
    return {
      category: 'other',
      viewer: 'default',
      extension: ext,
      mimeType: mimeType,
      fileName: fileName
    };
  }

  // Read document content by file path (must be before :id route)
  app.get('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const { path: documentPath, spaceName, metadata, download } = req.query;
      
      if (!documentPath || !spaceName) {
        return res.status(400).json({ error: 'Document path and space name are required' });
      }

      logger.info(`Reading document content from path: ${documentPath} in space: ${spaceName}`);
      
      // Resolve the absolute path to the documents folder
      const documentsDir = path.resolve(__dirname, '../../../documents');
      const absolutePath = path.resolve(documentsDir, spaceName, documentPath);
      
      // Security check: ensure the path is within the documents directory
      if (!absolutePath.startsWith(documentsDir)) {
        logger.warn(`Blocked attempt to access file outside documents directory: ${documentPath}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
        const fs = require('fs').promises;
        const stats = await fs.stat(absolutePath);
        const contentType = mime.lookup(absolutePath) || 'application/octet-stream';
        const fileTypeInfo = getFileTypeInfo(documentPath, contentType);
        
        // If only metadata is requested, return file info without content
        if (metadata === 'true') {
          return res.json({
            ...fileTypeInfo,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
            path: documentPath,
            spaceName: spaceName
          });
        }
        
        // Determine encoding based on file category
        let encoding = null;
        if (['text', 'markdown', 'code', 'web', 'data'].includes(fileTypeInfo.category) || 
            contentType.startsWith('text/') || 
            contentType === 'application/json' ||
            contentType === 'application/xml') {
          encoding = 'utf8';
        }

        // Read the file content
        const content = await fs.readFile(absolutePath, { encoding });
        
        logger.info(`Successfully read document from ${documentPath}`);
        
        // Return enhanced response with metadata
        if (req.query.enhanced === 'true') {
          res.json({
            content: encoding ? content : content.toString('base64'),
            metadata: {
              ...fileTypeInfo,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              path: documentPath,
              spaceName: spaceName,
              encoding: encoding || 'base64'
            }
          });
        } else {
          // Legacy response for backward compatibility
          res.setHeader('Content-Type', contentType);
          
          // Handle download functionality
          if (download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="${fileTypeInfo.fileName}"`);
          }
          
          res.send(content);
        }
      } catch (fileError) {
        logger.warn(`Failed to read file ${documentPath}: ${fileError.message}`);
        
        if (metadata === 'true' || req.query.enhanced === 'true') {
          return res.status(404).json({ 
            error: 'File not found',
            message: `The file ${documentPath} could not be found or read.`,
            details: fileError.message 
          });
        }
        
        // Return a friendly error message as markdown content
        const errorContent = `# File Not Found\n\nThe requested document \
${documentPath}\
 could not be found or read.\n\n**Possible reasons:**\n- File has been moved or deleted\n- Permission issues\n- File path is incorrect\n\nPlease check the file location and try again.`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(404).send(errorContent);
      }
    } catch (error) {
      logger.error('Error in document content endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/applications/wiki/api/documents/recent', async (req, res) => {
    try {
      const cacheKey = 'wiki:documents:recent';
      let recentDocs = await cache.get(cacheKey);
      
      if (!recentDocs) {
        const documents = await dataManager.read('documents');
        recentDocs = documents
          .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
          .slice(0, 10);
        
        await cache.put(cacheKey, recentDocs, 300); // 5 minutes
        logger.info('Generated recent documents list');
      }
      
      res.json(recentDocs);
    } catch (error) {
      logger.error('Error fetching recent documents:', error);
      res.status(500).json({ error: 'Failed to fetch recent documents' });
    }
  });

  app.get('/applications/wiki/api/documents/popular', async (req, res) => {
    try {
      const cacheKey = 'wiki:documents:popular';
      let popularDocs = await cache.get(cacheKey);
      
      if (!popularDocs) {
        const documents = await dataManager.read('documents');
        popularDocs = documents
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 10);
        
        await cache.put(cacheKey, popularDocs, 600); // 10 minutes - less frequent updates
        logger.info('Generated popular documents list');
      }
      
      res.json(popularDocs);
    } catch (error) {
      logger.error('Error fetching popular documents:', error);
      res.status(500).json({ error: 'Failed to fetch popular documents' });
    }
  });

  app.get('/applications/wiki/api/spaces/:id/documents', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.id);
      const cacheKey = `wiki:space:${spaceId}:documents`;
      
      let spaceDocuments = await cache.get(cacheKey);
      
      if (!spaceDocuments) {
        const allDocuments = await dataManager.read('documents');
        spaceDocuments = allDocuments.filter(doc => doc.spaceId === spaceId);
        
        await cache.put(cacheKey, spaceDocuments, 300); // 5 minutes
        logger.info(`Loaded documents for space ${spaceId}`);
      }
      
      res.json(spaceDocuments);
    } catch (error) {
      logger.error('Error fetching space documents:', error);
      res.status(500).json({ error: 'Failed to fetch space documents' });
    }
  });

  app.get('/applications/wiki/api/documents/:id', async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const cacheKey = `wiki:document:${docId}:full`;
      
      let document = await cache.get(cacheKey);
      
      if (!document) {
        // Get document metadata from dataServe
        const allDocuments = await dataManager.read('documents');
        const docMeta = allDocuments.find(doc => doc.id === docId);
        
        if (!docMeta) {
          return res.status(404).json({ error: 'Document not found' });
        }
        
        // Get document content from filing service
        const filePath = `documents/${docId}.md`;
        let content = '';
        
        try {
          const rawContent = await filing.read(filePath);
          content = Buffer.isBuffer(rawContent) ? rawContent.toString('utf8') : rawContent;
          logger.info(`Loaded document content for ${docId} from filing service`);
        } catch (error) {
          logger.warn(`No content file found for document ${docId}, using default content`);
          // Default content for documents without files
          content = `# ${docMeta.title}\n\n${docMeta.excerpt || 'No content available yet.'}\n\nThis document is ready for editing.`;
          
          // Create the file with default content
          queue.enqueue({
            type: 'createDocumentFile',
            documentId: docId,
            content: content
          });
        }
        
        document = {
          ...docMeta,
          content: content
        };
        
        // Increment view count
        docMeta.views = (docMeta.views || 0) + 1;
        docMeta.lastViewed = new Date().toISOString();
        
        // Update document metadata in background
        queue.enqueue({
          type: 'updateDocumentMetadata',
          documentId: docId,
          updates: { views: docMeta.views, lastViewed: docMeta.lastViewed }
        });
        
        // Cache the full document for 10 minutes
        await cache.put(cacheKey, document, 600);
        
        // Index document for search
        search.add(docId.toString(), {
          id: docId,
          title: docMeta.title,
          content: content,
          tags: docMeta.tags || [],
          spaceName: docMeta.spaceName,
          excerpt: docMeta.excerpt
        });
      }
      
      res.json(document);
    } catch (error) {
      logger.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // Enhanced search endpoint with comprehensive file indexing
  app.get('/applications/wiki/api/search', async (req, res) => {
    try {
      const query = req.query.q?.trim() || '';
      const fileTypes = req.query.fileTypes ? req.query.fileTypes.split(',') : [];
      const baseTypes = req.query.baseTypes ? req.query.baseTypes.split(',') : [];
      const includeContent = req.query.includeContent === 'true';

      if (!query) {
        return res.json([]);
      }

      logger.info(`Enhanced search for: ${query}, fileTypes: ${fileTypes}, baseTypes: ${baseTypes}`);
      
      // Use the enhanced search indexer
      let searchResults = searchIndexer.search(query, {
        maxResults: 20,
        includeContent: includeContent,
        fileTypes: fileTypes,
        baseTypes: baseTypes
      });
      
      // Fall back to original search for wiki documents if no file results
      if (searchResults.length === 0) {
        logger.info('No file search results, falling back to document search');
        const allDocuments = await dataManager.read('documents');
        const queryLower = query.toLowerCase();
        
        const docResults = allDocuments
          .filter(doc => 
            doc.title.toLowerCase().includes(queryLower) ||
            doc.excerpt.toLowerCase().includes(queryLower) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(queryLower)))
          )
          .map(doc => ({ 
            ...doc, 
            score: calculateRelevanceScore(doc, queryLower),
            type: 'wiki-document',
            baseType: 'wiki'
          }))
          .sort((a, b) => b.score - a.score);
          
        searchResults = docResults;
      }
      
      // Format results for frontend
      const formattedResults = searchResults.slice(0, 20).map(result => ({
        id: result.id || result.relativePath,
        title: result.title || result.name,
        excerpt: result.excerpt || result.excerpt,
        path: result.relativePath || result.path,
        spaceName: result.spaceName || result.baseType,
        modifiedAt: result.modifiedAt || result.modifiedTime,
        tags: result.tags || [],
        type: result.type,
        size: result.size,
        relevance: result.score || 0.5,
        content: result.content // Only included if requested
      }));
      
      logger.info(`Found ${formattedResults.length} enhanced search results`);
      res.json(formattedResults);
    } catch (error) {
      logger.error('Error performing enhanced search:', error.message);
      logger.error('Search error stack:', error.stack);
      res.status(500).json({ error: 'Failed to perform search: ' + error.message });
    }
  });

  // Search suggestions endpoint for autocomplete
  app.get('/applications/wiki/api/search/suggestions', async (req, res) => {
    try {
      const query = req.query.q?.trim() || '';
      const maxSuggestions = parseInt(req.query.limit) || 10;

      if (!query) {
        return res.json([]);
      }

      const suggestions = searchIndexer.getSuggestions(query, maxSuggestions);
      res.json(suggestions);
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      res.status(500).json({ error: 'Failed to get search suggestions' });
    }
  });

  // Search index statistics endpoint
  app.get('/applications/wiki/api/search/stats', async (req, res) => {
    try {
      const stats = searchIndexer.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting search stats:', error);
      res.status(500).json({ error: 'Failed to get search statistics' });
    }
  });

  // Rebuild search index endpoint
  app.post('/applications/wiki/api/search/rebuild', async (req, res) => {
    try {
      // Rebuild index in background
      setImmediate(() => {
        searchIndexer.buildIndex().catch(error => {
          logger.error('Failed to rebuild search index:', error);
        });
      });
      
      res.json({ success: true, message: 'Index rebuild started' });
    } catch (error) {
      logger.error('Error starting index rebuild:', error);
      res.status(500).json({ error: 'Failed to start index rebuild' });
    }
  });
  
  // Helper function to calculate relevance score
  function calculateRelevanceScore(doc, query) {
    let score = 0;
    const queryWords = query.split(' ');
    
    queryWords.forEach(word => {
      if (doc.title.toLowerCase().includes(word)) score += 3;
      if (doc.excerpt.toLowerCase().includes(word)) score += 2;
      if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(word))) score += 2;
    });
    
    return score / queryWords.length;
  }

  app.post('/applications/wiki/api/spaces', async (req, res) => {
    try {
      const { name, description, visibility } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Space name is required' });
      }

      // Get next space ID
      const spaces = await dataManager.read('spaces');
      let nextId = spaces.length > 0 ? Math.max(...spaces.map(s => s.id)) + 1 : 1;
      
      const newSpace = {
        id: nextId,
        name,
        description: description || '',
        icon: '📁',
        visibility: visibility || 'private',
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'Current User'
      };

      // Add to spaces list
      spaces.push(newSpace);
      await dataManager.write('spaces', spaces);
      
      // Update next ID
      // Next ID is calculated dynamically
      
      // Clear relevant caches
      await cache.delete('wiki:spaces:list');
      await cache.delete('wiki:recent:activity');
      
      logger.info(`Created new space: ${name} (ID: ${nextId})`);
      
      res.json({ success: true, space: newSpace });
    } catch (error) {
      logger.error('Error creating space:', error);
      res.status(500).json({ success: false, message: 'Failed to create space' });
    }
  });

  app.post('/applications/wiki/api/documents', async (req, res) => {
    try {
      const { title, content, spaceId, tags } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: 'Document title is required' });
      }

      // Get next document ID
      const allDocuments = await dataManager.read('documents');
      let nextId = allDocuments.length > 0 ? Math.max(...allDocuments.map(d => d.id)) + 1 : 1;
      
      // Find space name if spaceId provided
      let spaceName = 'Personal';
      if (spaceId) {
        const spaces = await dataManager.read('spaces');
        const space = spaces.find(s => s.id === parseInt(spaceId));
        spaceName = space ? space.name : 'Unknown Space';
      }
      
      const newDocument = {
        id: nextId,
        title,
        spaceId: spaceId ? parseInt(spaceId) : null,
        spaceName,
        excerpt: content ? content.substring(0, 150).replace(/[#*`]/g, '') + (content.length > 150 ? '...' : '') : 'No content yet',
        author: 'Current User',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        views: 0,
        tags: tags || []
      };

      // Save document content to filing service
      if (content) {
        const filePath = `documents/${nextId}.md`;
        await filing.create(filePath, content);
        logger.info(`Saved document content to ${filePath}`);
      }
      
      // Add to documents list
      allDocuments.push(newDocument);
      await dataManager.write('documents', allDocuments);
      
      // Update next ID
      // Next ID is calculated dynamically
      
      // Update space document count
      if (spaceId) {
        queue.enqueue({
          type: 'updateSpaceDocumentCount',
          spaceId: parseInt(spaceId)
        });
      }
      
      // Index for search
      search.add(nextId.toString(), {
        id: nextId,
        title,
        content: content || '',
        tags: tags || [],
        spaceName,
        excerpt: newDocument.excerpt
      });
      
      // Clear relevant caches
      await cache.delete('wiki:documents:list');
      await cache.delete('wiki:documents:recent');
      await cache.delete('wiki:recent:activity');
      if (spaceId) {
        await cache.delete(`wiki:space:${spaceId}:documents`);
      }
      
      logger.info(`Created new document: ${title} (ID: ${nextId})`);
      
      res.json({ success: true, document: newDocument });
    } catch (error) {
      logger.error('Error creating document:', error);
      res.status(500).json({ success: false, message: 'Failed to create document' });
    }
  });

  app.put('/applications/wiki/api/documents', async (req, res) => {
    try {
      const { id, title, content, spaceId, tags } = req.body;

      if (!id || !title) {
        return res.status(400).json({ success: false, message: 'Document ID and title are required' });
      }

      const docId = parseInt(id);
      
      // Get current documents
      const documents = await dataServe.get('wiki:documents') || [];
      const docIndex = documents.findIndex(doc => doc.id === docId);
      
      if (docIndex === -1) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      
      // Find space name if spaceId provided
      let spaceName = documents[docIndex].spaceName;
      if (spaceId && spaceId !== documents[docIndex].spaceId) {
        const spaces = await dataManager.read('spaces');
        const space = spaces.find(s => s.id === parseInt(spaceId));
        spaceName = space ? space.name : 'Unknown Space';
      }
      
      // Update document metadata
      const updatedDocument = {
        ...documents[docIndex],
        title,
        spaceId: spaceId ? parseInt(spaceId) : documents[docIndex].spaceId,
        spaceName,
        excerpt: content ? content.substring(0, 150).replace(/[#*`]/g, '') + (content.length > 150 ? '...' : '') : documents[docIndex].excerpt,
        modifiedAt: new Date().toISOString(),
        tags: tags || documents[docIndex].tags || []
      };
      
      documents[docIndex] = updatedDocument;
      
      // Save updated documents list
      await dataManager.write('documents', documents);
      
      // Update document content in filing service
      if (content !== undefined) {
        const filePath = `documents/${docId}.md`;
        await filing.create(filePath, content);
        logger.info(`Updated document content in ${filePath}`);
      }
      
      // Update search index
      search.add(docId.toString(), {
        id: docId,
        title,
        content: content || '',
        tags: tags || [],
        spaceName,
        excerpt: updatedDocument.excerpt
      });
      
      // Clear relevant caches
      await cache.delete('wiki:documents:list');
      await cache.delete('wiki:documents:recent');
      await cache.delete('wiki:recent:activity');
      await cache.delete(`wiki:document:${docId}:full`);
      if (updatedDocument.spaceId) {
        await cache.delete(`wiki:space:${updatedDocument.spaceId}:documents`);
      }
      
      logger.info(`Updated document: ${title} (ID: ${docId})`);
      
      res.json({ success: true, document: updatedDocument });
    } catch (error) {
      logger.error('Error updating document:', error);
      res.status(500).json({ success: false, message: 'Failed to update document' });
    }
  });

  // Folder management routes
  
  // Get folder tree for a space
  app.get('/applications/wiki/api/spaces/:spaceId/folders', async (req, res) => {
    try {
      const spaceId = parseInt(req.params.spaceId);
      logger.info(`Fetching folder tree for space ${spaceId}`);
      
      const tree = await dataManager.getFolderTree(spaceId);
      res.json(tree);
    } catch (error) {
      logger.error('Error fetching folder tree:', error);
      res.status(500).json({ error: 'Failed to fetch folder tree' });
    }
  });

  // Create a new folder
  app.post('/applications/wiki/api/folders', async (req, res) => {
    try {
      const { name, spaceId, parentPath } = req.body;
      
      if (!name || !spaceId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Folder name and space ID are required' 
        });
      }

      logger.info(`Creating folder: ${name} in space ${spaceId}`);
      
      const folder = await dataManager.createFolder(spaceId, name, parentPath);
      
      // Clear folder tree cache
      await cache.delete(`wiki:folders:${spaceId}`);
      
      logger.info(`Created folder: ${name} (ID: ${folder.id})`);
      
      res.json({ success: true, folder });
    } catch (error) {
      logger.error('Error creating folder:', error);
      res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
  });

  // Save document content by file path
  app.put('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const { path: documentPath, spaceName, content } = req.body;
      
      if (!documentPath || !spaceName || content === undefined) {
        return res.status(400).json({ error: 'Document path, space name, and content are required' });
      }

      logger.info(`Saving document content to path: ${documentPath} in space: ${spaceName}`);
      
      // Resolve the absolute path to the documents folder
      const documentsDir = path.resolve(__dirname, '../../../documents');
      const absolutePath = path.resolve(documentsDir, spaceName, documentPath);
      
      // Security check: ensure the path is within the documents directory
      if (!absolutePath.startsWith(documentsDir)) {
        logger.warn(`Blocked attempt to save file outside documents directory: ${documentPath}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
        const fs = require('fs').promises;
        
        // Ensure the directory exists
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file content
        await fs.writeFile(absolutePath, content, 'utf8');
        
        // Get file stats for response
        const stats = await fs.stat(absolutePath);
        
        logger.info(`Successfully saved document to ${documentPath}`);
        
        // Update search index for searchable files
        const fileTypeInfo = getFileTypeInfo(documentPath, mime.lookup(absolutePath) || 'text/plain');
        if (['text', 'markdown', 'code', 'web', 'data'].includes(fileTypeInfo.category)) {
          // Clear search cache to refresh results
          await cache.delete('wiki:search:*');
          
          // Re-index this document
          setImmediate(() => {
            try {
              searchIndexer.indexFile(absolutePath, {
                name: path.basename(documentPath),
                relativePath: documentPath,
                spaceName: spaceName
              });
            } catch (indexError) {
              logger.warn('Failed to update search index for saved file:', indexError.message);
            }
          });
        }
        
        res.json({
          success: true,
          message: 'File saved successfully',
          metadata: {
            size: stats.size,
            modified: stats.mtime,
            path: documentPath,
            spaceName: spaceName
          }
        });
      } catch (fileError) {
        logger.error(`Failed to save file ${documentPath}:`, fileError);
        res.status(500).json({ 
          error: 'Failed to save file',
          message: fileError.message 
        });
      }
    } catch (error) {
      logger.error('Error in save document content endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Move document to folder
  app.put('/applications/wiki/api/documents/:id/move', async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { folderPath } = req.body;
      
      logger.info(`Moving document ${documentId} to folder: ${folderPath || 'root'}`);
      
      const updatedDoc = await dataManager.updateDocumentFolder(documentId, folderPath);
      
      if (!updatedDoc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      
      // Clear relevant caches
      await cache.delete(`wiki:document:${documentId}:full`);
      await cache.delete('wiki:documents:list');
      
      logger.info(`Moved document ${documentId} to folder: ${folderPath || 'root'}`);
      
      res.json({ success: true, document: updatedDoc });
    } catch (error) {
      logger.error('Error moving document:', error);
      res.status(500).json({ success: false, message: 'Failed to move document' });
    }
  });

  // Application status endpoint
  app.get('/applications/wiki/api/status', (req, res) => {
    res.json({ 
      status: 'running',
      application: 'Wiki Management',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

};
