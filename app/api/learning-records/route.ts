import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { REVIEW_INTERVALS } from '@/lib/constants';
import { getNextReviewDate } from '@/lib/dateUtils';

type LearningRecordRow = {
  id: string;
  content: string;
  learning_started_at: string;
  created_at: string;
};

function normalizeLimit(rawLimit: string | null): number {
  const parsed = Number.parseInt(rawLimit ?? '20', 10); // limitを10進数に変換(初期値20)
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;// 無限やNaNでないか判定
  return Math.min(parsed, 100);// 最大100件
}

//　学習履歴を取得
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: '履歴取得にはログインが必要です' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = normalizeLimit(url.searchParams.get('limit'));

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('learning_records') //操作するテーブル
      .select('id, content, learning_started_at, created_at') //必要なカラムに絞る
      .eq('user_id', userId) //ユーザーid一致のデータのみに絞る
      .order('learning_started_at', { ascending: false }) //学習開始順（降順）にソート
      .limit(limit); //取得数の制限

    if (error) {
      console.error('learning-record fetch error', error);
      return NextResponse.json(
        { error: '履歴の取得に失敗しました。' },
        { status: 500 }
      );
    }

    //履歴の形式を整形
    const records = (data as LearningRecordRow[]).map((record) => {
      const nextReviewDate = getNextReviewDate(
        new Date(record.learning_started_at),
        REVIEW_INTERVALS
      );

      return {
        id: record.id,
        content: record.content,
        learningStartedAt: record.learning_started_at,
        createdAt: record.created_at,
        nextReviewAt: nextReviewDate?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ ok: true, records });
  } catch (e) {
    console.error('learning-record GET error', e);
    return NextResponse.json(
      { error: '履歴取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 学習内容の新規登録
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // エラー処理
    if (!userId) {
      return NextResponse.json(
        { error: '保存にはログインが必要です' },
        { status: 401 }
      );
    }

    const { content, learningStartedAt } = (await request.json()) as {
      content?: string;
      learningStartedAt?: string;
    };
    // エラー処理
    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return NextResponse.json(
        { error: '学習内容を入力してください' },
        { status: 400 }
      );
    }
    // エラー処理
    const startedAt = learningStartedAt
      ? new Date(learningStartedAt)
      : new Date();
    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json(
        { error: '学習開始日の形式が不正です' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('learning_records') // 1. 対象テーブルを指定
      .insert({                 // 2. 挿入するデータをオブジェクトで指定
        user_id: userId,        // 誰のデータか（Auth.jsから取得したID）
        content: trimmedContent,// 学習内容（空白除去済み）
        learning_started_at: startedAt.toISOString(), // 日時（ISO形式の文字列）
      })
      .select('id') // 3. 挿入に成功した後、そのデータの 'id' 列だけを返してと頼む
      .single();    // 4. 結果を「配列」ではなく「1つのオブジェクト」として受け取る

    if (error) {
      console.error('learning-record insert error', error);
      return NextResponse.json(
        { error: '保存に失敗しました。DB設定を確認してください。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, recordId: data.id });
  } catch (e) {
    console.error('learning-record POST error', e);
    return NextResponse.json(
      { error: '保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
