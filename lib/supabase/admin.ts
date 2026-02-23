import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 管理者用として以下の設定を加えています。
//autoRefreshToken: false / persistSession: false:
//通常、ユーザーがログインする際はセッションを維持するが、管理用クライアントはAPI呼び出しごとに使い捨てられることが多いため、余計なセッション管理機能をオフにしている