import mongoose from 'mongoose';
import dbConnect from '../db/connect';

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

// Define application schema
const applicationSchema = new mongoose.Schema<Application>({
  userId: { type: String, required: true },
  vacancyId: { type: String, required: true },
  vacancyTitle: { type: String, required: true },
  companyName: { type: String, required: true },
  salaryDisplay: { type: String, required: true },
  location: { type: String, required: true },
  appliedAt: { type: Number, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['applied', 'viewed', 'invited', 'rejected', 'cancelled']
  },
  url: { type: String, required: true }
});

// Create compound index for userId and vacancyId
applicationSchema.index({ userId: 1, vacancyId: 1 }, { unique: true });

// Create or get the model
const ApplicationModel = mongoose.models.Application || mongoose.model<Application>('Application', applicationSchema);

const applicationModel = {
  // Save a new application
  async saveApplication(applicationData: Omit<Application, 'id'>): Promise<Application> {
    await dbConnect();
    return ApplicationModel.create(applicationData);
  },
  
  // Find applications by user ID
  async findByUserId(userId: string): Promise<Application[]> {
    await dbConnect();
    return ApplicationModel.find({ userId });
  },
  
  // Find application by vacancy ID and user ID
  async findByVacancyAndUser(userId: string, vacancyId: string): Promise<Application | null> {
    await dbConnect();
    return ApplicationModel.findOne({ userId, vacancyId });
  },
  
  // Update application status
  async updateStatus(id: string, status: Application['status']): Promise<Application | null> {
    await dbConnect();
    return ApplicationModel.findByIdAndUpdate(id, { status }, { new: true });
  },
  
  // Get all applications
  async getAllApplications(): Promise<Application[]> {
    await dbConnect();
    return ApplicationModel.find();
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
    await dbConnect();
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