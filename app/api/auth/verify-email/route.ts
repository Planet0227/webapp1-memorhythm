import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * メール確認リンクの検証処理
 * - code(PKCE) はサーバーで exchange
 * - token_hash はサーバーで verifyOtp
 * その後、Supabase セッションのユーザーを確認して返す
 */
export async function POST(request: Request) {
  try {
    const { code, tokenHash, type } = (await request.json()) as {
      code?: string;
      tokenHash?: string;
      type?: EmailOtpType;
    };

    if (!code && !(tokenHash && type)) {
      return NextResponse.json(
        { error: '認証パラメータがありません' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

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

    // 認証成功。create-session API で NextAuth セッション作成へ進む。
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
