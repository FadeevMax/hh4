import mongoose from 'mongoose';
import dbConnect from '../db/connect';

// Define token interface
export interface Token {
  id: string;
  accessToken: string;
  refreshToken: string;
  expires: number; // Timestamp when the token expires
  userId: string;
}

// Define token schema
const tokenSchema = new mongoose.Schema<Token>({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expires: { type: Number, required: true },
  userId: { type: String, required: true, unique: true }
});

// Create or get the model
const TokenModel = mongoose.models.Token || mongoose.model<Token>('Token', tokenSchema);

const tokenModel = {
  // Find token by user ID
  async findByUserId(userId: string): Promise<Token | null> {
    await dbConnect();
    return TokenModel.findOne({ userId });
  },
  
  // Get the latest valid token for a user
  async getLatestToken(userId: string): Promise<Token | null> {
    const token = await this.findByUserId(userId);
    
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (token.expires <= Date.now()) {
      try {
        // Token is expired, try to refresh it
        const refreshed = await this.refreshToken(token);
        
        if (!refreshed) {
          // Couldn't refresh the token
          console.error('Could not refresh expired token');
          return null;
        }
        
        // Get the refreshed token
        return await this.findByUserId(userId);
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    }
    
    return token;
  },
  
  // Refresh a token with the HH.ru API
  async refreshToken(token: Token): Promise<boolean> {
    if (!token || !token.refreshToken) {
      return false;
    }
    
    try {
      console.log('Refreshing token for user:', token.userId);
      
      // Set up parameters for token refresh
      const clientId = process.env.NEXT_PUBLIC_HH_CLIENT_ID;
      const clientSecret = process.env.HH_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('Missing client credentials');
        return false;
      }
      
      // Create URL-encoded form body for refresh request
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refreshToken,
      });
      
      // Make the token refresh request to HH.ru
      const refreshResponse = await fetch('https://api.hh.ru/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        console.error('Error refreshing token:', errorData);
        
        // If refresh token is expired or invalid, remove it
        if (refreshResponse.status === 400 && 
            (errorData.error === 'invalid_grant' || errorData.error === 'invalid_request')) {
          await this.deleteToken(token.userId);
        }
        
        return false;
      }
      
      const refreshData = await refreshResponse.json();
      
      // Save the new tokens
      await this.saveToken(
        token.userId, 
        refreshData.access_token, 
        refreshData.refresh_token, 
        refreshData.expires_in
      );
      
      return true;
    } catch (error) {
      console.error('Error in token refresh:', error);
      return false;
    }
  },
  
  // Create or update token
  async saveToken(userId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<Token> {
    await dbConnect();
    const tokenData = {
      accessToken,
      refreshToken,
      expires: Date.now() + (expiresIn * 1000), // Convert seconds to milliseconds
      userId
    };
    
    return TokenModel.findOneAndUpdate(
      { userId },
      tokenData,
      { upsert: true, new: true }
    );
  },
  
  // Check if token is valid
  async isValid(userId: string): Promise<boolean> {
    const token = await this.getLatestToken(userId);
    return token !== null;
  },
  
  // Delete token
  async deleteToken(userId: string): Promise<boolean> {
    await dbConnect();
    const result = await TokenModel.deleteOne({ userId });
    return result.deletedCount > 0;
  }
};

export default tokenModel; 