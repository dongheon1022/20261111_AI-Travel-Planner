# 05 — Supabase 데이터베이스 지침

## 1. 목적
로그인 없이 작성되는 사용자 피드백을 Supabase에 저장하고, 모든 피드백을 최신순으로 화면 하단에 표시한다.

## 2. 테이블
테이블명: `feedback`

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | uuid | 예 | 기본키 |
| content | text | 예 | 피드백 본문 |
| created_at | timestamptz | 예 | 생성 시각 |

이 MVP에서는 이름·이메일·회원 ID를 저장하지 않는다.

## 3. SQL
Supabase SQL Editor에서 다음 SQL을 실행한다.
```sql
create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  content text not null
    check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_desc_idx
  on public.feedback (created_at desc);
```

## 4. 접근 정책
권장 방식은 **서버 API만 DB에 접근**하는 것이다.
- Supabase Service Role Key는 Vercel 서버 환경변수에만 저장한다.
- 브라우저에 Service Role Key를 전달하지 않는다.
- 서버 API에서 insert/select를 수행한다.
- RLS를 활성화하고, 브라우저의 anon 역할에 직접 쓰기/읽기 권한을 주지 않는 구성을 기본으로 한다.
- Service Role은 RLS를 우회하므로 서버에서 입력 검증을 반드시 수행한다.

RLS 활성화:
```sql
alter table public.feedback enable row level security;
```
서버 Service Role 사용 구조에서는 anon용 정책을 만들 필요가 없다. 브라우저에서 직접 Supabase에 접근하도록 구현을 바꾸지 않는다.

## 5. 서버 데이터 처리
### 저장
Supabase JS SDK를 사용해 `content`를 insert한다. SQL 문자열을 직접 이어 붙이지 않는다. insert 결과에서 필요한 `id`, `created_at`만 반환한다.

### 조회
- 선택 컬럼: `id, content, created_at`
- 정렬: `created_at` 내림차순
- 최신순 정렬을 DB 쿼리에서 수행한다.
- DB 조회 실패를 빈 목록으로 변환하지 않는다.

## 6. 프런트엔드 표시
- 날짜는 한국어 로케일로 읽기 쉽게 표시한다.
- 내용은 `textContent`로 렌더링한다.
- 줄바꿈을 보존하려면 CSS `white-space: pre-wrap`을 사용한다.
- 피드백에 HTML 태그가 포함되어도 태그로 실행하지 않는다.
- 새 글 저장 성공 후 목록을 다시 불러온다.

## 7. 개인정보 및 운영 유의사항
- 피드백 폼에 민감한 개인정보를 입력하지 말라는 안내를 표시하는 것을 권장한다.
- IP 주소나 브라우저 식별자를 별도 저장하지 않는다.
- 스팸 방지를 위해 요청 빈도 제한과 서버 측 길이 검증을 적용한다.
- 삭제 기능과 보존 기간은 현재 범위에 포함되지 않는다. 운영 전 개인정보 처리방침 및 데이터 보존 정책을 별도로 검토한다.

## 8. 완료 기준
- Supabase에 `feedback` 테이블이 존재한다.
- 비회원 피드백이 서버 API를 통해 저장된다.
- 새로고침 후에도 데이터가 유지된다.
- 최신 글이 목록 맨 위에 표시된다.
- HTML/스크립트 문자열이 실행되지 않고 텍스트로 표시된다.
- Service Role Key가 프런트엔드 코드와 브라우저 응답에 노출되지 않는다.
