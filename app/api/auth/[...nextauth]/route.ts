import NextAuth, { DefaultSession } from 'next-auth';
import { HHAuth } from '@/lib/auth';
import type { JWT } from 'next-auth/jwt';
import type { Account, Session } from 'next-auth';

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
        async request({ params }: { params: { code?: string } }) {
          if (!params.code) throw new Error('No code provided');
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
        async request({ tokens }: { tokens: TokenSet | { access_token?: string } }) {
          if (!tokens.access_token) throw new Error('No access_token provided');
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
    async jwt({ token, account }: { token: JWT; account?: Account | null }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST }; 