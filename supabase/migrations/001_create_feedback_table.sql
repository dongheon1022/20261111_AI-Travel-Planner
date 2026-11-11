-- ==============================================================================
-- 001_create_feedback_table.sql
-- 목적: 비회원 피드백을 저장할 feedback 테이블 및 인덱스, RLS 보안 설정
-- 실행 위치: Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. UUID 생성을 위한 pgcrypto 확장 기능 활성화 (이미 활성화되어 있을 수 있음)
create extension if not exists pgcrypto;

-- 2. 비회원 피드백 저장용 feedback 테이블 생성
-- - id: UUID 형태의 기본키 (자동 생성)
-- - content: 피드백 본문 (공백 제외 1자 이상 1000자 이하 제약 조건)
-- - created_at: 작성 일시 (기본값 현재 시각)
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  content text not null
    check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- 3. 피드백 목록 최신순 조회를 위한 인덱스 생성
create index if not exists feedback_created_at_desc_idx
  on public.feedback (created_at desc);

-- 4. 행 단위 보안 (Row Level Security, RLS) 활성화
-- 서버 API(Service Role Key)에서만 안전하게 접근하도록 브라우저 직접 접근(anon)을 차단합니다.
alter table public.feedback enable row level security;

