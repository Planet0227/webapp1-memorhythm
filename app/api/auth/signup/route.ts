import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上にしてください' },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    // 確認メールのリダイレクト先を設定（確認後に認証待ちページに戻る）
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/verify-email`,
      },
    });
    if (error) {
      const msg =
        error.message === 'User already registered'
          ? 'このメールアドレスは既に登録されています'
          : error.message === 'Error sending confirmation email'
            ? '確認メールの送信に失敗しました。Supabase の Email Provider / Custom SMTP 設定（Sender, Host, Port, 認証情報）を確認してください。'
          : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (!data.user) {
      return NextResponse.json(
        { error: '登録に失敗しました' },
        { status: 500 }
      );
    }
    // Supabase は「メール確認が必要な場合」session を返さないため、
    // email_confirmed_at ではなく session の有無で判定する。
    const requiresEmailConfirmation = !data.session;
    return NextResponse.json({
      ok: true,
      requiresEmailConfirmation,
      email: email, // 認証待ちページに渡すためにメールアドレスを返す
    });
  } catch (e) {
    console.error('signup error', e);
    return NextResponse.json(
      { error: '登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
