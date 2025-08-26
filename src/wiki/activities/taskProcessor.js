/**
 * @fileoverview Background task processor for wiki operations
 * Handles queued tasks for document management, search indexing, and cache invalidation
 * 
 * @author NooblyJS Team
 * @version 1.0.0
 * @since 2025-08-25
 */

'use strict';

/**
 * Process background tasks from the queue
 * @param {Object} services - NooblyJS Core services
 * @param {Object} task - Task to process
 */
async function processTask(services, task) {
  const { dataManager, filing, cache, logger, search } = services;
  
  try {
    switch (task.type) {
      case 'createDocumentFile':
        await handleCreateDocumentFile(services, task);
        break;
        
      case 'updateDocumentMetadata':
        await handleUpdateDocumentMetadata(services, task);
        break;
        
      case 'updateSpaceDocumentCount':
        await handleUpdateSpaceDocumentCount(services, task);
        break;
        
      case 'indexDocumentForSearch':
        await handleIndexDocumentForSearch(services, task);
        break;
        
      case 'generateThumbnail':
        await handleGenerateThumbnail(services, task);
        break;
        
      case 'cleanupExpiredCache':
        await handleCleanupExpiredCache(services, task);
        break;
        
      default:
        logger.warn(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    logger.error(`Error processing task ${task.type}:`, error);
    throw error;
  }
}

/**
 * Create a document file in the filing system
 */
async function handleCreateDocumentFile(services, task) {
  const { filing, logger } = services;
  const { documentId, content } = task;
  
  try {
    const filePath = `documents/${documentId}.md`;
    await filing.create(filePath, content);
    logger.info(`Created document file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to create document file for ${documentId}:`, error);
    throw error;
  }
}

/**
 * Update document metadata (views, last viewed, etc.)
 */
async function handleUpdateDocumentMetadata(services, task) {
  const { dataManager, cache, logger } = services;
  const { documentId, updates } = task;
  
  try {
    const documents = await dataManager.read('documents');
    const docIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (docIndex !== -1) {
      // Update the document
      documents[docIndex] = { ...documents[docIndex], ...updates };
      await dataManager.write('documents', documents);
      
      // Clear related caches
      await cache.delete('wiki:documents:list');
      await cache.delete('wiki:documents:popular');
      await cache.delete(`wiki:document:${documentId}:full`);
      
      logger.info(`Updated metadata for document ${documentId}`);
    }
  } catch (error) {
    logger.error(`Failed to update metadata for document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Update space document count
 */
async function handleUpdateSpaceDocumentCount(services, task) {
  const { dataManager, cache, logger } = services;
  const { spaceId } = task;
  
  try {
    const spaces = await dataManager.read('spaces');
    const documents = await dataManager.read('documents');
    
    const spaceIndex = spaces.findIndex(space => space.id === spaceId);
    if (spaceIndex !== -1) {
      // Count documents in this space
      const documentCount = documents.filter(doc => doc.spaceId === spaceId).length;
      
      spaces[spaceIndex].documentCount = documentCount;
      spaces[spaceIndex].updatedAt = new Date().toISOString();
      
      await dataManager.write('spaces', spaces);
      
      // Clear related caches
      await cache.delete('wiki:spaces:list');
      await cache.delete('wiki:recent:activity');
      
      logger.info(`Updated document count for space ${spaceId}: ${documentCount} documents`);
    }
  } catch (error) {
    logger.error(`Failed to update document count for space ${spaceId}:`, error);
    throw error;
  }
}

/**
 * Index a document for search
 */
async function handleIndexDocumentForSearch(services, task) {
  const { search, filing, logger } = services;
  const { documentId, title, spaceName, tags } = task;
  
  try {
    // Get document content from filing service
    const filePath = `documents/${documentId}.md`;
    let content = '';
    
    try {
      content = await filing.read(filePath);
    } catch (error) {
      logger.warn(`No content file found for document ${documentId}`);
    }
    
    // Index the document
    search.add(documentId.toString(), {
      id: documentId,
      title,
      content,
      tags: tags || [],
      spaceName,
      excerpt: content.substring(0, 150).replace(/[#*`]/g, '') + (content.length > 150 ? '...' : '')
    });
    
    logger.info(`Indexed document ${documentId} for search`);
  } catch (error) {
    logger.error(`Failed to index document ${documentId} for search:`, error);
    throw error;
  }
}

/**
 * Generate thumbnail or preview for document
 */
async function handleGenerateThumbnail(services, task) {
  const { filing, logger } = services;
  const { documentId, content } = task;
  
  try {
    // Extract first paragraph or section for thumbnail
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const thumbnail = lines.slice(0, 3).join('\n').substring(0, 200);
    
    // Store thumbnail
    const thumbnailPath = `thumbnails/${documentId}.txt`;
    await filing.create(thumbnailPath, thumbnail);
    
    logger.info(`Generated thumbnail for document ${documentId}`);
  } catch (error) {
    logger.error(`Failed to generate thumbnail for document ${documentId}:`, error);
    throw error;
  }
}

/**
 * Cleanup expired cache entries
 */
async function handleCleanupExpiredCache(services, task) {
  const { cache, logger } = services;
  
  try {
    // This is implementation-specific to the cache provider
    // For memory cache, we might not need to do anything as it handles TTL automatically
    logger.info('Cache cleanup task completed');
  } catch (error) {
    logger.error('Failed to cleanup expired cache:', error);
    throw error;
  }
}

module.exports = {
  processTask,
  handleCreateDocumentFile,
  handleUpdateDocumentMetadata,
  handleUpdateSpaceDocumentCount,
  handleIndexDocumentForSearch,
  handleGenerateThumbnail,
  handleCleanupExpiredCache
};