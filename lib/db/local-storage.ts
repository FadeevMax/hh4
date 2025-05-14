import fs from 'fs';
import path from 'path';

// Define the data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generic type for stored objects
interface StoredObject {
  id: string;
  [key: string]: any;
}

// Storage class for working with a specific collection
class LocalStorage<T extends StoredObject> {
  private filePath: string;
  
  constructor(collectionName: string) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    
    // Create empty collection file if it doesn't exist
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf8');
    }
  }
  
  // Read all items from storage
  async findAll(): Promise<T[]> {
    const data = fs.readFileSync(this.filePath, 'utf8');
    return JSON.parse(data) as T[];
  }
  
  // Find items by query
  async find(query: Partial<T>): Promise<T[]> {
    const items = await this.findAll();
    
    return items.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }
  
  // Find one item by ID
  async findById(id: string): Promise<T | null> {
    const items = await this.findAll();
    return items.find(item => item.id === id) || null;
  }
  
  // Create a new item
  async create(data: Omit<T, 'id'>): Promise<T> {
    const items = await this.findAll();
    
    // Generate a new ID
    const id = Date.now().toString();
    const newItem = { ...data, id } as T;
    
    // Save to storage
    fs.writeFileSync(this.filePath, JSON.stringify([...items, newItem], null, 2), 'utf8');
    
    return newItem;
  }
  
  // Update an existing item
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const items = await this.findAll();
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedItem = { ...items[index], ...data };
    items[index] = updatedItem;
    
    fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf8');
    
    return updatedItem;
  }
  
  // Delete an item
  async delete(id: string): Promise<boolean> {
    const items = await this.findAll();
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) {
      return false;
    }
    
    fs.writeFileSync(this.filePath, JSON.stringify(filteredItems, null, 2), 'utf8');
    
    return true;
  }
}

export default LocalStorage; 