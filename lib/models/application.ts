import LocalStorage from '../db/local-storage';

// Define application interface
export interface Application {
  id: string;
  userId: string;
  vacancyId: string;
  vacancyTitle: string;
  companyName: string;
  salaryDisplay: string;
  location: string;
  appliedAt: number;
  status: 'applied' | 'viewed' | 'invited' | 'rejected' | 'cancelled';
  url: string;
}

// Create application storage
const applicationStorage = new LocalStorage<Application>('applications');

const applicationModel = {
  // Save a new application
  async saveApplication(applicationData: Omit<Application, 'id'>): Promise<Application> {
    return applicationStorage.create(applicationData);
  },
  
  // Find applications by user ID
  async findByUserId(userId: string): Promise<Application[]> {
    return applicationStorage.find({ userId });
  },
  
  // Find application by vacancy ID and user ID
  async findByVacancyAndUser(userId: string, vacancyId: string): Promise<Application | null> {
    const applications = await applicationStorage.find({ userId, vacancyId });
    return applications.length > 0 ? applications[0] : null;
  },
  
  // Update application status
  async updateStatus(id: string, status: Application['status']): Promise<Application | null> {
    return applicationStorage.update(id, { status });
  },
  
  // Get all applications
  async getAllApplications(): Promise<Application[]> {
    return applicationStorage.findAll();
  },
  
  // Get application statistics for a user
  async getUserStats(userId: string): Promise<{
    total: number;
    applied: number;
    viewed: number;
    invited: number;
    rejected: number;
    cancelled: number;
  }> {
    const applications = await this.findByUserId(userId);
    
    return {
      total: applications.length,
      applied: applications.filter(app => app.status === 'applied').length,
      viewed: applications.filter(app => app.status === 'viewed').length,
      invited: applications.filter(app => app.status === 'invited').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      cancelled: applications.filter(app => app.status === 'cancelled').length,
    };
  }
};

export default applicationModel; 