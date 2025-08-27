/**
 * @fileoverview Enhanced Search Indexer Service
 * Indexes markdown, text files (content) and other files (names) for comprehensive search
 * 
 * @author NooblyJS Core Team
 * @version 1.0.0
 * @since 2025-08-27
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

class SearchIndexer {
    constructor(logger) {
        this.logger = logger;
        this.index = {
            files: new Map(), // filename -> file info
            content: new Map(), // file path -> indexed content tokens
            tokens: new Map(), // token -> Set of file paths
        };
        this.documentsDir = path.resolve(__dirname, '../../../documents');
        this.docsDir = path.resolve(__dirname, '../../../docs');
        this.isIndexing = false;
        this.lastIndexTime = null;
        
        // File categories for different indexing strategies
        this.textFileExtensions = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.log']);
        this.searchableFileExtensions = new Set([
            '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
            '.mp4', '.mp3', '.wav', '.avi',
            '.zip', '.tar', '.gz'
        ]);
    }

    /**
     * Build complete search index
     */
    async buildIndex() {
        if (this.isIndexing) {
            this.logger.warn('Indexing already in progress');
            return;
        }

        this.isIndexing = true;
        this.logger.info('Starting search index build...');
        
        try {
            // Clear existing index
            this.clearIndex();
            
            // Index documents directory
            await this.indexDirectory(this.documentsDir, 'documents');
            
            // Index docs directory
            await this.indexDirectory(this.docsDir, 'docs');
            
            this.lastIndexTime = new Date();
            this.logger.info(`Search index built successfully. Indexed ${this.index.files.size} files with ${this.index.tokens.size} unique tokens`);
            
        } catch (error) {
            this.logger.error('Error building search index:', error);
        } finally {
            this.isIndexing = false;
        }
    }

    /**
     * Clear the search index
     */
    clearIndex() {
        this.index.files.clear();
        this.index.content.clear();
        this.index.tokens.clear();
    }

    /**
     * Index a directory recursively
     */
    async indexDirectory(dirPath, baseType) {
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                const relativePath = path.relative(baseType === 'documents' ? this.documentsDir : this.docsDir, itemPath);
                
                if (item.isDirectory()) {
                    await this.indexDirectory(itemPath, baseType);
                } else if (item.isFile()) {
                    await this.indexFile(itemPath, relativePath, baseType);
                }
            }
        } catch (error) {
            this.logger.warn(`Could not index directory ${dirPath}:`, error.message);
        }
    }

    /**
     * Index a single file
     */
    async indexFile(filePath, relativePath, baseType) {
        try {
            const stats = await fs.stat(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const fileName = path.basename(filePath);
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            
            // Create file entry
            const fileInfo = {
                path: filePath,
                relativePath: relativePath,
                name: fileName,
                size: stats.size,
                extension: ext,
                mimeType: mimeType,
                type: this.getFileType(ext, mimeType),
                baseType: baseType, // 'documents' or 'docs'
                modifiedTime: stats.mtime,
                isIndexed: false,
                tokens: new Set()
            };

            // Index file name tokens (always)
            const nameTokens = this.tokenize(fileName);
            nameTokens.forEach(token => {
                this.addTokenToIndex(token, relativePath);
                fileInfo.tokens.add(token);
            });

            // Index path tokens
            const pathTokens = this.tokenize(relativePath.replace(/[\/\\]/g, ' '));
            pathTokens.forEach(token => {
                this.addTokenToIndex(token, relativePath);
                fileInfo.tokens.add(token);
            });

            // Index content for text-based files
            if (this.textFileExtensions.has(ext) || mimeType.startsWith('text/')) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const contentTokens = this.tokenize(content);
                    
                    contentTokens.forEach(token => {
                        this.addTokenToIndex(token, relativePath);
                        fileInfo.tokens.add(token);
                    });
                    
                    fileInfo.isIndexed = true;
                    fileInfo.excerpt = this.generateExcerpt(content);
                    this.index.content.set(relativePath, content);
                    
                } catch (error) {
                    this.logger.warn(`Could not read content of ${filePath}:`, error.message);
                }
            }

            this.index.files.set(relativePath, fileInfo);
            
        } catch (error) {
            this.logger.warn(`Could not index file ${filePath}:`, error.message);
        }
    }

    /**
     * Add token to search index
     */
    addTokenToIndex(token, filePath) {
        if (!this.index.tokens.has(token)) {
            this.index.tokens.set(token, new Set());
        }
        this.index.tokens.get(token).add(filePath);
    }

    /**
     * Tokenize text into searchable tokens
     */
    tokenize(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ') // Replace non-word chars except hyphens
            .split(/\s+/)
            .filter(token => token.length >= 2) // Minimum token length
            .filter(token => !this.isStopWord(token));
    }

    /**
     * Check if token is a stop word
     */
    isStopWord(token) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        ]);
        return stopWords.has(token);
    }

    /**
     * Generate excerpt from content
     */
    generateExcerpt(content, maxLength = 200) {
        if (!content) return '';
        
        // Remove markdown syntax and extra whitespace
        const cleanContent = content
            .replace(/#{1,6}\s/g, '') // Remove headers
            .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Remove bold/italic
            .replace(/`([^`]+)`/g, '$1') // Remove inline code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
            .replace(/\n\s*\n/g, ' ') // Replace double newlines
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }
        
        return cleanContent.substring(0, maxLength).replace(/\s+\w*$/, '') + '...';
    }

    /**
     * Determine file type based on extension and mime type
     */
    getFileType(extension, mimeType) {
        if (['.md', '.markdown'].includes(extension)) return 'markdown';
        if (['.txt', '.log'].includes(extension)) return 'text';
        if (['.json', '.yaml', '.yml'].includes(extension)) return 'data';
        if (['.pdf'].includes(extension)) return 'pdf';
        if (mimeType.startsWith('image/')) return 'image';
        if (['.doc', '.docx', '.ppt', '.pptx'].includes(extension)) return 'office';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'other';
    }

    /**
     * Search the index
     */
    search(query, options = {}) {
        const {
            maxResults = 20,
            includeContent = false,
            fileTypes = [],
            baseTypes = [] // Filter by 'documents' or 'docs'
        } = options;

        if (!query || query.trim().length < 2) {
            return [];
        }

        const queryTokens = this.tokenize(query.trim());
        const results = new Map(); // path -> score

        // Score files based on token matches
        queryTokens.forEach(token => {
            if (this.index.tokens.has(token)) {
                const matchingFiles = this.index.tokens.get(token);
                matchingFiles.forEach(filePath => {
                    const currentScore = results.get(filePath) || 0;
                    results.set(filePath, currentScore + this.calculateTokenScore(token, filePath));
                });
            }
        });

        // Convert to array and sort by score
        let searchResults = Array.from(results.entries())
            .map(([filePath, score]) => {
                const fileInfo = this.index.files.get(filePath);
                return {
                    ...fileInfo,
                    score: score,
                    content: includeContent ? this.index.content.get(filePath) : undefined
                };
            })
            .filter(result => {
                // Apply filters
                if (fileTypes.length > 0 && !fileTypes.includes(result.type)) return false;
                if (baseTypes.length > 0 && !baseTypes.includes(result.baseType)) return false;
                return true;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);

        return searchResults;
    }

    /**
     * Calculate score for a token match in a file
     */
    calculateTokenScore(token, filePath) {
        const fileInfo = this.index.files.get(filePath);
        if (!fileInfo) return 0;

        let score = 1; // Base score

        // Boost if token matches filename
        if (fileInfo.name.toLowerCase().includes(token)) {
            score += 5;
        }

        // Boost based on file type (markdown and text files are more valuable)
        if (fileInfo.type === 'markdown') score += 2;
        if (fileInfo.type === 'text') score += 1;

        // Reduce score for very common tokens
        const tokenFrequency = this.index.tokens.get(token)?.size || 1;
        if (tokenFrequency > 10) {
            score *= 0.7;
        }

        return score;
    }

    /**
     * Get suggestions for autocomplete
     */
    getSuggestions(query, maxSuggestions = 10) {
        if (!query || query.length < 2) {
            return [];
        }

        const queryLower = query.toLowerCase();
        const suggestions = new Set();

        // Find tokens that start with query
        for (const [token] of this.index.tokens) {
            if (token.startsWith(queryLower) && token !== queryLower) {
                suggestions.add(token);
                if (suggestions.size >= maxSuggestions * 2) break; // Get extra to filter later
            }
        }

        // Find file names that contain query
        for (const [, fileInfo] of this.index.files) {
            const fileName = fileInfo.name.toLowerCase();
            if (fileName.includes(queryLower) && fileName !== queryLower) {
                suggestions.add(fileInfo.name);
                if (suggestions.size >= maxSuggestions * 2) break;
            }
        }

        return Array.from(suggestions)
            .slice(0, maxSuggestions)
            .sort((a, b) => {
                // Prioritize exact matches at start
                const aStartsWithQuery = a.startsWith(queryLower);
                const bStartsWithQuery = b.startsWith(queryLower);
                if (aStartsWithQuery && !bStartsWithQuery) return -1;
                if (!aStartsWithQuery && bStartsWithQuery) return 1;
                return a.length - b.length; // Then by length
            });
    }

    /**
     * Get index statistics
     */
    getStats() {
        const stats = {
            totalFiles: this.index.files.size,
            indexedFiles: 0,
            totalTokens: this.index.tokens.size,
            lastIndexTime: this.lastIndexTime,
            isIndexing: this.isIndexing,
            fileTypes: {},
            baseTypes: {}
        };

        for (const [, fileInfo] of this.index.files) {
            if (fileInfo.isIndexed) stats.indexedFiles++;
            stats.fileTypes[fileInfo.type] = (stats.fileTypes[fileInfo.type] || 0) + 1;
            stats.baseTypes[fileInfo.baseType] = (stats.baseTypes[fileInfo.baseType] || 0) + 1;
        }

        return stats;
    }

    /**
     * Incremental update - add or update a single file
     */
    async updateFile(filePath, baseType = 'documents') {
        const baseDir = baseType === 'documents' ? this.documentsDir : this.docsDir;
        const relativePath = path.relative(baseDir, filePath);
        
        // Remove old index entries for this file
        this.removeFileFromIndex(relativePath);
        
        // Re-index the file
        await this.indexFile(filePath, relativePath, baseType);
        
        this.logger.info(`Updated index for file: ${relativePath}`);
    }

    /**
     * Remove file from index
     */
    removeFileFromIndex(relativePath) {
        const fileInfo = this.index.files.get(relativePath);
        if (fileInfo) {
            // Remove tokens associated with this file
            fileInfo.tokens.forEach(token => {
                const tokenSet = this.index.tokens.get(token);
                if (tokenSet) {
                    tokenSet.delete(relativePath);
                    if (tokenSet.size === 0) {
                        this.index.tokens.delete(token);
                    }
                }
            });
            
            // Remove file entries
            this.index.files.delete(relativePath);
            this.index.content.delete(relativePath);
        }
    }
}

module.exports = SearchIndexer;