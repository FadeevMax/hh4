import mongoose from 'mongoose';
import dbConnect from '../db/connect';

// Define user interface
export interface User {
  id: string;
  username: string;
  hhId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: number;
  lastLoginAt: number;
}

// Define user schema
const userSchema = new mongoose.Schema<User>({
  username: { type: String, required: true, unique: true },
  hhId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Number, required: true },
  lastLoginAt: { type: Number, required: true }
});

// Create or get the model
const UserModel = mongoose.models.User || mongoose.model<User>('User', userSchema);

const userModel = {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    await dbConnect();
    return UserModel.findById(id);
  },
  
  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    await dbConnect();
    return UserModel.findOne({ username });
  },
  
  // Find user by HH.ru ID
  async findByHhId(hhId: string): Promise<User | null> {
    await dbConnect();
    return UserModel.findOne({ hhId });
  },
  
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
    await dbConnect();
    const now = Date.now();
    
    return UserModel.create({
      ...userData,
      createdAt: now,
      lastLoginAt: now
    });
  },
  
  // Update user
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    await dbConnect();
    return UserModel.findByIdAndUpdate(id, userData, { new: true });
  },
  
  // Update user's last login time
  async updateLastLogin(id: string): Promise<User | null> {
    await dbConnect();
    return UserModel.findByIdAndUpdate(
      id,
      { lastLoginAt: Date.now() },
      { new: true }
    );
  },
  
  // Get all users
  async getAllUsers(): Promise<User[]> {
    await dbConnect();
    return UserModel.find();
  }
};

export default userModel; 