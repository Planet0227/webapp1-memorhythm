import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * メール確認後の自動ログイン処理
 * Supabaseのセッションからユーザー情報を取得し、NextAuthのセッションを作成
 */
export async function POST(request: Request) {
  try {
    const { userId, email } = (await request.json()) as {
      userId?: string;
      email?: string;
    };

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'ユーザー情報がありません' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabaseのセッションを確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
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

    // 認証成功
    // クライアント側でNextAuthのセッションを作成するために、
    // ユーザー情報を返す（実際のログイン処理はクライアント側で行う）
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (e) {
    console.error('verify-email error', e);
    return NextResponse.json(
      { error: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
