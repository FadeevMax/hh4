import LocalStorage from '../db/local-storage';

// Define user interface
export interface User {
  id: string;
  username: string;
  hhId?: string; // HeadHunter ID (optional)
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt: number;
  lastLoginAt: number;
}

// Create user storage
const userStorage = new LocalStorage<User>('users');

export default {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    return userStorage.findById(id);
  },
  
  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    const users = await userStorage.find({ username });
    return users.length > 0 ? users[0] : null;
  },
  
  // Find user by HH.ru ID
  async findByHhId(hhId: string): Promise<User | null> {
    const users = await userStorage.find({ hhId });
    return users.length > 0 ? users[0] : null;
  },
  
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
    const now = Date.now();
    
    return userStorage.create({
      ...userData,
      createdAt: now,
      lastLoginAt: now
    });
  },
  
  // Update user
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    return userStorage.update(id, userData);
  },
  
  // Update user's last login time
  async updateLastLogin(id: string): Promise<User | null> {
    return userStorage.update(id, { lastLoginAt: Date.now() });
  },
  
  // Get all users
  async getAllUsers(): Promise<User[]> {
    return userStorage.findAll();
  }
}; 