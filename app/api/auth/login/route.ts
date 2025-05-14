import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/lib/models/user';

// For now, we'll use a simple hardcoded list of valid credentials
// In a real app, you'd store these securely hashed in the database
const VALID_CREDENTIALS = [
  { username: 'admin', password: 'admin123' }
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // First check if this user already exists in our local storage
    const existingUser = await UserModel.findByUsername(username);

    if (existingUser) {
      // For an existing user, we'd normally validate password hash
      // But for this demo, we'll just check against the hardcoded list
      const isValid = VALID_CREDENTIALS.some(
        cred => cred.username === username && cred.password === password
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Update last login time
      await UserModel.updateLastLogin(existingUser.id);

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email
        }
      });
    } else {
      // Check against hardcoded credentials
      const validCredential = VALID_CREDENTIALS.find(
        cred => cred.username === username && cred.password === password
      );

      if (!validCredential) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Create a new user
      const newUser = await UserModel.createUser({
        username: username
      });

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
} 