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

  // Read document content by file path (must be before :id route)
  app.get('/applications/wiki/api/documents/content', async (req, res) => {
    try {
      const documentPath = req.query.path;
      
      if (!documentPath) {
        return res.status(400).json({ error: 'Document path is required' });
      }

      logger.info(`Reading document content from path: ${documentPath}`);
      
      // Resolve the absolute path to the documents folder
      const documentsDir = path.resolve(__dirname, '../../../documents');
      const absolutePath = path.resolve(documentsDir, documentPath);
      
      // Security check: ensure the path is within the documents directory
      if (!absolutePath.startsWith(documentsDir)) {
        logger.warn(`Blocked attempt to access file outside documents directory: ${documentPath}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      try {
        // Read the file directly from the file system
        const fs = require('fs').promises;
        const content = await fs.readFile(absolutePath, 'utf8');
        
        logger.info(`Successfully read document from ${documentPath}`);
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(content);
      } catch (fileError) {
        logger.warn(`Failed to read file ${documentPath}: ${fileError.message}`);
        
        // Return a friendly error message as markdown content
        const errorContent = `# File Not Found\n\nThe requested document \`${documentPath}\` could not be found or read.\n\n**Possible reasons:**\n- File has been moved or deleted\n- Permission issues\n- File path is incorrect\n\nPlease check the file location and try again.`;
        
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

  app.get('/applications/wiki/api/search', async (req, res) => {
    try {
      const query = req.query.q?.trim() || '';

      if (!query) {
        return res.json([]);
      }

      logger.info(`Searching for: ${query}`);
      
      // Use the search service to find documents
      let searchResults = search.search(query);
      logger.info(`Search service returned: ${typeof searchResults}, value: ${JSON.stringify(searchResults)}`);
      
      // If no results from search service, fall back to basic text matching
      if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
        logger.info('No search service results, falling back to basic search');
        const allDocuments = await dataManager.read('documents');
        const queryLower = query.toLowerCase();
        
        searchResults = allDocuments
          .filter(doc => 
            doc.title.toLowerCase().includes(queryLower) ||
            doc.excerpt.toLowerCase().includes(queryLower) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(queryLower)))
          )
          .map(doc => ({ ...doc, score: calculateRelevanceScore(doc, queryLower) }))
          .sort((a, b) => b.score - a.score);
      }
      
      // Format results for frontend
      const formattedResults = searchResults.slice(0, 20).map(result => ({
        id: result.id,
        title: result.title,
        excerpt: result.excerpt,
        spaceName: result.spaceName,
        modifiedAt: result.modifiedAt,
        tags: result.tags || [],
        relevance: result.score || 0.5
      }));
      
      logger.info(`Found ${formattedResults.length} search results`);
      res.json(formattedResults);
    } catch (error) {
      logger.error('Error performing search:', error.message);
      logger.error('Search error stack:', error.stack);
      res.status(500).json({ error: 'Failed to perform search: ' + error.message });
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
