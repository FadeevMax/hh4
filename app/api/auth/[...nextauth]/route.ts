import NextAuth, { DefaultSession, NextAuthConfig } from 'next-auth';
import { HHAuth } from '@/lib/auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
  }
}

interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface HHProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const handler = NextAuth({
  providers: [
    {
      id: 'hh',
      name: 'HH.ru',
      type: 'oauth',
      authorization: HHAuth.getAuthUrl(),
      token: {
        url: 'https://hh.ru/oauth/token',
        async request({ params }: { params: { code: string } }) {
          const response = await HHAuth.getAccessToken(params.code);
          return {
            tokens: {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + response.expires_in,
            },
          };
        },
      },
      userinfo: {
        url: 'https://api.hh.ru/me',
        async request({ tokens }: { tokens: TokenSet }) {
          return HHAuth.getUserInfo(tokens.access_token);
        },
      },
      clientId: process.env.HH_CLIENT_ID,
      clientSecret: process.env.HH_CLIENT_SECRET,
      profile(profile: HHProfile) {
        return {
          id: profile.id,
          name: profile.first_name + ' ' + profile.last_name,
          email: profile.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
} satisfies NextAuthConfig);

export { handler as GET, handler as POST }; 