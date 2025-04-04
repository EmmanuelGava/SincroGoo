import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
      accessToken: string;
      refreshToken: string;
      supabaseToken?: string;
    } & DefaultSession['user']
  }
} 