import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';

/**
 * SupabaseのセッションからNextAuthのセッションを作成
 * メール確認後の自動ログイン用
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Supabaseのセッションを確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '認証セッションが無効です' },
        { status: 401 }
      );
    }

    // メールアドレスが確認されているかチェック
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'メールアドレスがまだ確認されていません' },
        { status: 400 }
      );
    }

    // NextAuthのJWTトークンを作成
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('AUTH_SECRET is not set');
    }

    const token = await encode({
      token: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.email?.split('@')[0] ?? user.user_metadata?.full_name ?? 'User',
        picture: user.user_metadata?.avatar_url ?? undefined,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60, // 30日
    });

    // NextAuthのセッションCookieを設定
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30日
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] ?? user.user_metadata?.full_name ?? 'User',
      },
    });
  } catch (e) {
    console.error('create-session error', e);
    return NextResponse.json(
      { error: 'セッション作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
