/**
 * Simple JSON file-based data manager
 */

const fs = require('fs').promises;
const path = require('path');

class DataManager {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  getFilePath(type) {
    return path.join(this.dataDir, `${type}.json`);
  }

  async read(type) {
    try {
      const filePath = this.getFilePath(type);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      return [];
    }
  }

  async write(type, data) {
    try {
      const filePath = this.getFilePath(type);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${type} data:`, error);
      return false;
    }
  }

  async add(type, item) {
    const data = await this.read(type);
    
    // Generate ID if not provided
    if (!item.id) {
      const maxId = data.length > 0 ? Math.max(...data.map(d => d.id || 0)) : 0;
      item.id = maxId + 1;
    }
    
    data.push(item);
    await this.write(type, data);
    return item.id;
  }

  async update(type, id, updates) {
    const data = await this.read(type);
    const index = data.findIndex(item => item.id === id);
    
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      await this.write(type, data);
      return data[index];
    }
    return null;
  }

  async remove(type, id) {
    const data = await this.read(type);
    const filtered = data.filter(item => item.id !== id);
    
    if (filtered.length !== data.length) {
      await this.write(type, filtered);
      return true;
    }
    return false;
  }

  async find(type, filter = {}) {
    const data = await this.read(type);
    
    if (Object.keys(filter).length === 0) {
      return data;
    }
    
    return data.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  // Folder-specific methods
  async createFolder(spaceId, folderName, parentPath = '') {
    const folders = await this.read('folders');
    const folder = {
      id: folders.length > 0 ? Math.max(...folders.map(f => f.id || 0)) + 1 : 1,
      name: folderName,
      spaceId: spaceId,
      parentPath: parentPath,
      path: parentPath ? `${parentPath}/${folderName}` : folderName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    folders.push(folder);
    await this.write('folders', folders);
    return folder;
  }

  async getFolderTree(spaceId) {
    // Get space name from spaces data
    const spaces = await this.read('spaces');
    const space = spaces.find(s => s.id === spaceId);
    if (!space) {
      return [];
    }

    // Read from physical file system
    return this.getFolderTreeFromFileSystem(space.name);
  }

  async getFolderTreeFromFileSystem(spaceName) {
    try {
      const documentsDir = path.join(process.cwd(), 'documents');
      const spaceDir = path.join(documentsDir, spaceName);
      
      // Check if space directory exists
      try {
        await fs.access(spaceDir);
      } catch (error) {
        // Directory doesn't exist, return empty tree
        return [];
      }

      return await this.buildFileSystemTree(spaceDir, spaceName);
    } catch (error) {
      console.error('Error reading folder tree from file system:', error);
      return [];
    }
  }

  async buildFileSystemTree(dirPath, spaceName, relativePath = '') {
    const tree = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativeEntryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          // It's a folder
          const children = await this.buildFileSystemTree(fullPath, spaceName, relativeEntryPath);
          tree.push({
            type: 'folder',
            name: entry.name,
            path: relativeEntryPath,
            children: children
          });
        } else {
          // It's a file
          tree.push({
            type: 'document',
            name: entry.name,
            title: entry.name,
            path: relativeEntryPath,
            fileName: entry.name,
            spaceName: spaceName
          });
        }
      }
      
      // Sort: folders first, then files, both alphabetically
      tree.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
    } catch (error) {
      console.error('Error reading directory:', dirPath, error);
    }
    
    return tree;
  }

  buildFolderTree(folders, documents) {
    const tree = [];
    const folderMap = new Map();
    
    // Create folder nodes
    folders.forEach(folder => {
      folderMap.set(folder.path, {
        ...folder,
        type: 'folder',
        children: [],
        documents: []
      });
    });
    
    // Add documents to appropriate folders or root
    documents.forEach(doc => {
      const folderPath = doc.folderPath || '';
      if (folderPath && folderMap.has(folderPath)) {
        folderMap.get(folderPath).documents.push({
          ...doc,
          type: 'document'
        });
      } else {
        tree.push({
          ...doc,
          type: 'document'
        });
      }
    });
    
    // Build tree structure
    folders.forEach(folder => {
      if (!folder.parentPath) {
        // Root level folder
        tree.push(folderMap.get(folder.path));
      } else {
        // Child folder
        const parent = folderMap.get(folder.parentPath);
        if (parent) {
          parent.children.push(folderMap.get(folder.path));
        }
      }
    });
    
    return tree;
  }

  async updateDocumentFolder(documentId, newFolderPath) {
    const documents = await this.read('documents');
    const docIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (docIndex !== -1) {
      documents[docIndex].folderPath = newFolderPath;
      documents[docIndex].updatedAt = new Date().toISOString();
      await this.write('documents', documents);
      return documents[docIndex];
    }
    return null;
  }
}

module.exports = DataManager;