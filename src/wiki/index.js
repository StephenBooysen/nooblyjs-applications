/**
 * @fileoverview Wiki Application
 * Factory module for creating a Wiki application instance.
 * 
 * @author NooblyJS Team
 * @version 1.0.14
 * @since 2025-08-22
 */

'use strict';

const Routes = require('./routes');
const Views = require('./views');
const { initializeDocumentFiles } = require('./activities/documentContent');
const { processTask } = require('./activities/taskProcessor');
const DataManager = require('./components/dataManager');

/**
 * Creates the wiki service
 * Automatically configures routes and views for the wiki service.
 * Integrates with noobly-core services for data persistence, file storage, caching, etc.
 * @param {Object} options - Configuration options
 * @param {EventEmitter} eventEmitter - Global event emitter for inter-service communication
 * @param {Object} serviceRegistry - NooblyJS Core service registry
 * @return {void}
 */
module.exports = (options, eventEmitter, serviceRegistry) => {
  // Initialize data manager for JSON file storage
  const dataManager = new DataManager('./data');
  
  // Initialize noobly-core services for the wiki
  const filing = serviceRegistry.filing('local', { 
    baseDir: './wiki-files' 
  });
  const cache = serviceRegistry.cache('memory');
  const logger = serviceRegistry.logger('console');
  const queue = serviceRegistry.queue('memory');
  const search = serviceRegistry.searching('memory');
  
  // Initialize wiki data if not exists
  (async () => {
    try {
      await initializeWikiData(dataManager, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize wiki data:', error);
    }
  })();
  
  // Start background queue worker
  startQueueWorker({ dataManager, filing, cache, logger, queue, search });
  
  // Register routes and views
  Routes(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
  Views(options, eventEmitter, { dataManager, filing, cache, logger, queue, search });
}

/**
 * Initialize default wiki data
 */
async function initializeWikiData(dataManager, filing, cache, logger, queue, search) {
  try {
    logger.info('Starting wiki data initialization with JSON file storage...');
    
    // Check if we already have stored wiki data
    const existingSpaces = await dataManager.read('spaces');
    const existingDocuments = await dataManager.read('documents');
    
    if (existingSpaces.length === 0 || existingDocuments.length === 0) {
      logger.info('Initializing default wiki data');
      
      // Initialize default spaces
      const defaultSpaces = [
        {
          id: 1,
          name: 'Personal Space',
          description: 'This space is for you personal data',
          icon: '🏗️',
          visibility: 'private',
          documentCount: 0,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-08-20T14:30:00Z',
          author: 'System'
        }
      ];
      
      logger.info(`Storing ${defaultSpaces.length} spaces with JSON file storage...`);
      
      // Store spaces
      await dataManager.write('spaces', defaultSpaces);
      logger.info('Stored all spaces to spaces.json');
      
      // Initialize default documents
      const defaultDocuments = [
      ];
      
      // Store documents
      await dataManager.write('documents', defaultDocuments);
      logger.info('Stored all documents to documents.json');
      
      // Initialize document content files
      await initializeDocumentFiles({ filing, logger });
      
      // Index documents for search
      defaultDocuments.forEach(doc => {
        search.add(doc.id.toString(), {
          id: doc.id,
          title: doc.title,
          content: '', // Will be filled when files are read
          tags: doc.tags || [],
          spaceName: doc.spaceName,
          excerpt: doc.excerpt
        });
      });
      
      logger.info('Default wiki data initialized successfully');
    } else {
      logger.info('Wiki data already exists, skipping initialization');
    }
    
    // Always initialize document files
    try {
      await initializeDocumentFiles({ filing, logger });
    } catch (error) {
      logger.error('Error initializing document files:', error);
    }
    
    // Always populate search index
    try {
      const documents = await dataManager.read('documents');
      documents.forEach(doc => {
        search.add(doc.id.toString(), {
          id: doc.id,
          title: doc.title,
          content: '', // Will be filled when files are read
          tags: doc.tags || [],
          spaceName: doc.spaceName,
          excerpt: doc.excerpt
        });
      });
      logger.info(`Populated search index with ${documents.length} documents`);
    } catch (error) {
      logger.error('Error populating search index:', error);
    }
  } catch (error) {
    logger.error('Error initializing wiki data:', error.message);
    logger.error('Stack trace:', error.stack);
  }
}

/**
 * Start background queue worker for processing tasks
 */
function startQueueWorker(services) {
  const { queue, logger } = services;
  
  // Process queue every 5 seconds
  setInterval(async () => {
    try {
      const task = queue.dequeue();
      if (task && task.type) {
        logger.info(`Processing task: ${task.type}`);
        await processTask(services, task);
        logger.info(`Completed task: ${task.type}`);
      }
    } catch (error) {
      logger.error('Error processing queue task:', error);
    }
  }, 5000);
  
  logger.info('Wiki queue worker started');
}
