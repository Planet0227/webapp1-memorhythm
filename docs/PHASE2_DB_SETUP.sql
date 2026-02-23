-- Phase 2: 学習内容保存テーブル
-- Supabase SQL Editor で実行してください

create table if not exists public.learning_records (
  id uuid primary key default gen_random_uuid(),  -- ランダムなidを生成
  user_id text not null,  --空を許さない
  content text not null check (char_length(trim(content)) > 0), --空を許さない
  learning_started_at timestamptz not null, --空を許さない
  created_at timestamptz not null default timezone('utc', now())  
);

create index if not exists learning_records_user_id_created_at_idx
  on public.learning_records (user_id, created_at desc);


--create index if not exists:  もし同じ名前の索引がまだ無ければ、新しく作ってね
--learning_records_user_id_created_at_idx:  索引の名前。慣習として「テーブル名＋列名＋idx」と付けることが多い
--on public.learning_records: 「どのテーブル」に対して索引を作るかを指定
--(user_id, created_at desc): 「どの列」を順番に並べておくかを指定
----user_id: まずユーザーごとにまとめる
----created_at desc: さらに、その中を日付が新しい順（desc = 降順）に並べる