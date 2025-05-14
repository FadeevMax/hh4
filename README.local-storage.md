# HH Auto Apply - Local Storage

This project uses a simple file-based storage system instead of MongoDB. All data is stored in JSON files in the `data` directory.

## How It Works

The local storage system is designed to be simple but effective for development purposes:

1. JSON files are stored in the `data` directory
2. Each model has its own JSON file (e.g., `users.json`, `tokens.json`, etc.)
3. Models provide a simple API for CRUD operations

## Directory Structure

```
data/
  ├── users.json      # User accounts
  ├── tokens.json     # Authentication tokens
  ├── applications.json  # Job applications
  └── settings.json   # User settings
```

## Default User

The application comes with a default admin user:

- Username: `admin`
- Password: `admin123`

This user is hardcoded in the login API route for demonstration purposes. In a production application, you would store users with hashed passwords in the database.

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file based on `env.local.example`
4. Start the development server: `npm run dev`

## Data Security

Since all data is stored locally on your machine in simple JSON files, you don't need to worry about exposing credentials to external services. 

However, please note that:

1. All data is stored in plain text
2. The authentication tokens from HH.ru are stored in these files
3. This solution is meant for development and personal use only

## Backup & Reset

To backup your data, simply copy the entire `data` directory.

To reset the application data:

1. Stop the application
2. Delete all files in the `data` directory
3. Restart the application

## Production Use

For production use, you might want to consider:

1. Using a proper database (SQLite would be a good local option)
2. Encrypting sensitive data
3. Implementing proper user authentication with password hashing
4. Adding regular data backups

However, for personal use, this file-based system provides a simple solution that doesn't require setting up external services. 