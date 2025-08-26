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
  // Initialize noobly-core services for the wiki
  const dataServe = serviceRegistry.dataServe('memory');
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
      await initializeWikiData(dataServe, filing, cache, logger, queue, search);
    } catch (error) {
      logger.error('Failed to initialize wiki data:', error);
    }
  })();
  
  // Start background queue worker
  startQueueWorker({ dataServe, filing, cache, logger, queue, search });
  
  Routes(options, eventEmitter, { dataServe, filing, cache, logger, queue, search });
  Views(options, eventEmitter, { dataServe, filing, cache, logger, queue, search });
}

/**
 * Initialize default wiki data
 */
async function initializeWikiData(dataServe, filing, cache, logger, queue, search) {
  try {
    // Check if spaces already exist
    const existingSpaces = await dataServe.get('wiki:spaces');
    if (!existingSpaces) {
      logger.info('Initializing default wiki data');
      
      // Initialize default spaces
      const defaultSpaces = [
        {
          id: 1,
          name: 'Architecture Documentation',
          description: 'Enterprise architecture patterns, decisions, and guidelines',
          icon: '🏗️',
          visibility: 'team',
          documentCount: 3,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-08-20T14:30:00Z',
          author: 'Solution Architect'
        },
        {
          id: 2,
          name: 'Business Requirements',
          description: 'Product requirements, user stories, and business logic documentation',
          icon: '💼',
          visibility: 'public',
          documentCount: 2,
          createdAt: '2024-02-01T09:00:00Z',
          updatedAt: '2024-08-19T16:45:00Z',
          author: 'Business Analyst'
        },
        {
          id: 3,
          name: 'Development Guidelines',
          description: 'Coding standards, best practices, and technical guides',
          icon: '👨‍💻',
          visibility: 'team',
          documentCount: 2,
          createdAt: '2024-01-20T11:30:00Z',
          updatedAt: '2024-08-21T09:15:00Z',
          author: 'Tech Lead'
        },
        {
          id: 4,
          name: 'API Documentation',
          description: 'REST API specifications, endpoints, and integration guides',
          icon: '🔌',
          visibility: 'public',
          documentCount: 1,
          createdAt: '2024-03-10T08:00:00Z',
          updatedAt: '2024-08-18T13:20:00Z',
          author: 'Backend Developer'
        },
        {
          id: 5,
          name: 'Meeting Notes',
          description: 'Project meetings, architecture reviews, and decision records',
          icon: '📝',
          visibility: 'private',
          documentCount: 1,
          createdAt: '2024-01-05T14:00:00Z',
          updatedAt: '2024-08-23T10:30:00Z',
          author: 'Project Manager'
        }
      ];
      
      await dataServe.put('wiki:spaces', defaultSpaces);
      await dataServe.put('wiki:nextSpaceId', 6);
      
      // Initialize default documents
      const defaultDocuments = [
        {
          id: 1,
          title: 'Microservices Architecture Overview',
          spaceId: 1,
          spaceName: 'Architecture Documentation',
          excerpt: 'Comprehensive guide to our microservices architecture, including service boundaries and communication patterns.',
          author: 'Solution Architect',
          createdAt: '2024-08-15T10:00:00Z',
          modifiedAt: '2024-08-20T14:30:00Z',
          views: 45,
          tags: ['microservices', 'architecture', 'patterns']
        },
        {
          id: 2,
          title: 'User Authentication Requirements',
          spaceId: 2,
          spaceName: 'Business Requirements',
          excerpt: 'Detailed requirements for multi-factor authentication implementation across all client applications.',
          author: 'Business Analyst',
          createdAt: '2024-08-10T09:30:00Z',
          modifiedAt: '2024-08-19T16:45:00Z',
          views: 32,
          tags: ['authentication', 'security', 'requirements']
        },
        {
          id: 3,
          title: 'React Component Library Standards',
          spaceId: 3,
          spaceName: 'Development Guidelines',
          excerpt: 'Guidelines for creating reusable React components with TypeScript and consistent styling patterns.',
          author: 'Frontend Lead',
          createdAt: '2024-08-12T11:00:00Z',
          modifiedAt: '2024-08-21T09:15:00Z',
          views: 58,
          tags: ['react', 'components', 'standards']
        },
        {
          id: 4,
          title: 'Wiki API Specification',
          spaceId: 4,
          spaceName: 'API Documentation',
          excerpt: 'REST API endpoints for the wiki system including authentication, spaces, and document management.',
          author: 'Backend Developer',
          createdAt: '2024-08-14T13:00:00Z',
          modifiedAt: '2024-08-18T13:20:00Z',
          views: 28,
          tags: ['api', 'wiki', 'documentation']
        },
        {
          id: 5,
          title: 'Architecture Review - August 2024',
          spaceId: 5,
          spaceName: 'Meeting Notes',
          excerpt: 'Monthly architecture review covering system performance, scalability improvements, and technical debt.',
          author: 'Enterprise Architect',
          createdAt: '2024-08-23T10:00:00Z',
          modifiedAt: '2024-08-23T10:30:00Z',
          views: 12,
          tags: ['meeting', 'architecture', 'review']
        }
      ];
      
      await dataServe.put('wiki:documents', defaultDocuments);
      await dataServe.put('wiki:nextDocumentId', 6);
      
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
      // Still initialize document files even if data exists
      try {
        await initializeDocumentFiles({ filing, logger });
      } catch (error) {
        logger.error('Error initializing document files:', error);
      }
    }
  } catch (error) {
    logger.error('Error initializing wiki data:', error);
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
