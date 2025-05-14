import LocalStorage from '../db/local-storage';

// Define search filters
export interface SearchFilter {
  text: string;
  area?: string;
  experience?: string;
  employment?: string;
  schedule?: string;
  salary?: number;
  currency?: string;
  onlyWithSalary?: boolean;
}

// Define auto apply rules
export interface AutoApplyRule {
  enabled: boolean;
  resumeId?: string;
  coverLetterTemplate?: string;
  maxApplicationsPerDay: number;
  blacklistedKeywords: string[];
  whitelistedCompanies: string[];
  blacklistedCompanies: string[];
  salaryThreshold?: number;
}

// Define settings interface
export interface Settings {
  id: string;
  userId: string;
  searchFilters: SearchFilter[];
  autoApplyRules: AutoApplyRule;
  lastRun?: number;
  dailyApplicationCount: number;
  dailyApplicationReset: number; // Timestamp for when to reset daily count
}

// Create settings storage
const settingsStorage = new LocalStorage<Settings>('settings');

// Default settings
const defaultAutoApplyRules: AutoApplyRule = {
  enabled: false,
  maxApplicationsPerDay: 20,
  blacklistedKeywords: [],
  whitelistedCompanies: [],
  blacklistedCompanies: [],
};

export default {
  // Find settings by user ID
  async findByUserId(userId: string): Promise<Settings | null> {
    const settingsList = await settingsStorage.find({ userId });
    return settingsList.length > 0 ? settingsList[0] : null;
  },
  
  // Create or get user settings
  async getOrCreateSettings(userId: string): Promise<Settings> {
    const existing = await this.findByUserId(userId);
    
    if (existing) {
      return existing;
    }
    
    // Initialize with default settings
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return settingsStorage.create({
      userId,
      searchFilters: [],
      autoApplyRules: defaultAutoApplyRules,
      dailyApplicationCount: 0,
      dailyApplicationReset: tomorrow.getTime()
    });
  },
  
  // Update settings
  async updateSettings(id: string, settings: Partial<Settings>): Promise<Settings | null> {
    return settingsStorage.update(id, settings);
  },
  
  // Update search filters
  async updateSearchFilters(id: string, searchFilters: SearchFilter[]): Promise<Settings | null> {
    return settingsStorage.update(id, { searchFilters });
  },
  
  // Update auto apply rules
  async updateAutoApplyRules(id: string, autoApplyRules: Partial<AutoApplyRule>): Promise<Settings | null> {
    const settings = await settingsStorage.findById(id);
    
    if (!settings) {
      return null;
    }
    
    const updatedRules = {
      ...settings.autoApplyRules,
      ...autoApplyRules
    };
    
    return settingsStorage.update(id, { autoApplyRules: updatedRules });
  },
  
  // Increment daily application count
  async incrementApplicationCount(userId: string): Promise<Settings | null> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      return null;
    }
    
    // Check if we need to reset the counter
    const now = Date.now();
    if (now > settings.dailyApplicationReset) {
      // Reset counter
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return settingsStorage.update(settings.id, {
        dailyApplicationCount: 1,
        dailyApplicationReset: tomorrow.getTime()
      });
    }
    
    // Increment counter
    return settingsStorage.update(settings.id, {
      dailyApplicationCount: settings.dailyApplicationCount + 1
    });
  },
  
  // Check if daily limit is reached
  async isDailyLimitReached(userId: string): Promise<boolean> {
    const settings = await this.findByUserId(userId);
    
    if (!settings) {
      return false;
    }
    
    // Check if we need to reset the counter first
    const now = Date.now();
    if (now > settings.dailyApplicationReset) {
      return false; // New day, new limit
    }
    
    return settings.dailyApplicationCount >= settings.autoApplyRules.maxApplicationsPerDay;
  }
}; 