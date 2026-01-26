import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@auth/core/types';

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;
const providers = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'メールアドレス', type: 'email' },
      password: { label: 'パスワード', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;
      const supabase = getSupabaseAuthClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) return null;
      const u = data.user;
      return {
        id: u.id,
        email: u.email ?? undefined,
        name: u.email?.split('@')[0] ?? u.user_metadata?.full_name ?? 'User',
        image: u.user_metadata?.avatar_url ?? undefined,
      } satisfies User;
    },
  }),
  ...(googleId && googleSecret
    ? [
        Google({
          clientId: googleId,
          clientSecret: googleSecret,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
];

export const { handlers, auth } = NextAuth({
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },
  },
});
