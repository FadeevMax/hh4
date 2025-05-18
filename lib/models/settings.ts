import mongoose from 'mongoose';
import dbConnect from '../db/connect';

// Define search filters
export interface SearchFilter {
  id: string;
  name: string;
  query: string;
  enabled: boolean;
}

// Define auto apply rules
export interface AutoApplyRule {
  enabled: boolean;
  maxApplicationsPerDay: number;
  blacklistedKeywords: string[];
  whitelistedCompanies: string[];
  blacklistedCompanies: string[];
}

// Define settings interface
export interface Settings {
  id: string;
  userId: string;
  searchFilters: SearchFilter[];
  autoApplyRules: AutoApplyRule;
  dailyApplicationCount: number;
  dailyApplicationReset: number; // Timestamp for when to reset daily count
}

// Define settings schema
const settingsSchema = new mongoose.Schema<Settings>({
  userId: { type: String, required: true, unique: true },
  searchFilters: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    query: { type: String, required: true },
    enabled: { type: Boolean, required: true }
  }],
  autoApplyRules: {
    enabled: { type: Boolean, default: false },
    maxApplicationsPerDay: { type: Number, default: 20 },
    blacklistedKeywords: { type: [String], default: [] },
    whitelistedCompanies: { type: [String], default: [] },
    blacklistedCompanies: { type: [String], default: [] }
  },
  dailyApplicationCount: { type: Number, default: 0 },
  dailyApplicationReset: { type: Number, required: true }
});

// Create or get the model
const SettingsModel = mongoose.models.Settings || mongoose.model<Settings>('Settings', settingsSchema);

// Default settings
const defaultAutoApplyRules: AutoApplyRule = {
  enabled: false,
  maxApplicationsPerDay: 20,
  blacklistedKeywords: [],
  whitelistedCompanies: [],
  blacklistedCompanies: [],
};

const settingsModel = {
  // Find settings by user ID
  async findByUserId(userId: string): Promise<Settings | null> {
    await dbConnect();
    return SettingsModel.findOne({ userId });
  },
  
  // Create or get user settings
  async getOrCreateSettings(userId: string): Promise<Settings> {
    await dbConnect();
    const existing = await this.findByUserId(userId);
    
    if (existing) {
      return existing;
    }
    
    // Initialize with default settings
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return SettingsModel.create({
      userId,
      searchFilters: [],
      autoApplyRules: defaultAutoApplyRules,
      dailyApplicationCount: 0,
      dailyApplicationReset: tomorrow.getTime()
    });
  },
  
  // Update settings
  async updateSettings(id: string, settings: Partial<Settings>): Promise<Settings | null> {
    await dbConnect();
    return SettingsModel.findByIdAndUpdate(id, settings, { new: true });
  },
  
  // Update search filters
  async updateSearchFilters(id: string, searchFilters: SearchFilter[]): Promise<Settings | null> {
    await dbConnect();
    return SettingsModel.findByIdAndUpdate(id, { searchFilters }, { new: true });
  },
  
  // Update auto apply rules
  async updateAutoApplyRules(id: string, autoApplyRules: Partial<AutoApplyRule>): Promise<Settings | null> {
    await dbConnect();
    const settings = await SettingsModel.findById(id);
    
    if (!settings) {
      return null;
    }
    
    const updatedRules = {
      ...settings.autoApplyRules,
      ...autoApplyRules
    };
    
    return SettingsModel.findByIdAndUpdate(id, { autoApplyRules: updatedRules }, { new: true });
  },
  
  // Increment daily application count
  async incrementApplicationCount(userId: string): Promise<Settings | null> {
    await dbConnect();
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      return null;
    }
    
    // Check if we need to reset the counter
    if (Date.now() >= settings.dailyApplicationReset) {
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return SettingsModel.findByIdAndUpdate(settings.id, {
        dailyApplicationCount: 1,
        dailyApplicationReset: tomorrow.getTime()
      }, { new: true });
    }
    
    // Increment counter
    return SettingsModel.findByIdAndUpdate(settings.id, {
      dailyApplicationCount: settings.dailyApplicationCount + 1
    }, { new: true });
  },
  
  // Check if daily limit is reached
  async isDailyLimitReached(userId: string): Promise<boolean> {
    await dbConnect();
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      return false;
    }
    
    // Check if we need to reset the counter
    if (Date.now() >= settings.dailyApplicationReset) {
      return false;
    }
    
    return settings.dailyApplicationCount >= settings.autoApplyRules.maxApplicationsPerDay;
  }
};

export default settingsModel; 