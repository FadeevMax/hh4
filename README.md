# HH.ru Auto Apply

An automated job application system for HH.ru platform.

## Features

- Automated job applications on HH.ru
- Job search and filtering
- Application history tracking
- User authentication
- Settings management

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Node.js/Express (Backend)
- MongoDB (Database)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory with the following variables:
   ```
   HH_API_KEY=your_api_key
   HH_API_SECRET=your_api_secret
   MONGODB_URI=your_mongodb_uri
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
hh-auto-apply/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility functions
├── api/                 # API routes
├── types/              # TypeScript types
└── public/             # Static files
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
