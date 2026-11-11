# 01 — 프로젝트 생성 및 개발 환경

## 1. 목표
Antigravity가 순수 HTML/CSS/JavaScript와 Node.js API로 프로젝트를 생성하도록 작업 순서와 파일 구조를 고정한다.

## 2. 권장 폴더 구조
```text
AI-Travel-Planner/
├── AGENTS.md
├── PRD.md
├── package.json
├── vercel.json
├── .gitignore
├── .env.example
├── index.html
├── assets/
│   └── reference-image.png
├── css/
│   └── style.css
├── js/
│   └── app.js
├── api/
│   ├── recommend.js
│   ├── feedback.js
│   └── feedback-list.js
└── docs/
    ├── 01_PROJECT_SETUP.md
    ├── 02_UI_GUIDELINES.md
    ├── 03_FEATURE_SPEC.md
    ├── 04_BACKEND_API.md
    ├── 05_DATABASE.md
    └── 06_ERROR_TEST_DEPLOY.md
```

폴더 구조는 명세를 만족하는 범위에서만 조정한다. 서버 코드를 브라우저에서 직접 실행되는 `js/` 폴더에 넣지 않는다.

## 3. 사전 준비
- Node.js LTS 설치
- Antigravity에서 프로젝트 폴더 열기
- OpenAI API Key 발급
- Supabase 프로젝트 생성
- Vercel 계정 및 프로젝트 연결
- 로컬 개발용 환경변수 파일 생성

## 4. package.json
필요한 서버 SDK만 설치한다. 권장 의존성:
- `@supabase/supabase-js`
- `openai`

개발 편의를 위한 스크립트:
- `dev`: Vercel 로컬 개발 서버 실행(필요 시 Vercel CLI 사용)
- `check`: 문법 및 기본 검증 스크립트(프로젝트에서 실제 제공하는 명령만 등록)

사용하지 않는 프레임워크나 UI 라이브러리를 추가하지 않는다.

## 5. 환경변수
`.env.example`에 아래 이름만 기록한다.
```env
OPENAI_API_KEY=
OPENAI_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```
`OPENAI_MODEL`은 실제 사용 가능한 모델 ID를 배포 환경에서 지정한다. 코드에 존재하지 않는 모델명을 임의로 하드코딩하지 않는다.

로컬에서는 `.env.local`을 사용하고 Git에 커밋하지 않는다. Vercel 프로젝트 설정에도 동일한 서버 환경변수를 등록한다.

## 6. .gitignore 필수 항목
```gitignore
node_modules/
.env
.env.*
!.env.example
.vercel/
.DS_Store
```

## 7. 개발 순서
1. 폴더 구조와 정적 페이지 생성
2. 원본 이미지 연결 및 반응형 레이아웃 구현
3. 프런트엔드 입력 검증과 상태 UI 구현
4. `POST /api/recommend` 구현
5. Supabase 테이블 및 피드백 API 구현
6. 최신순 피드백 목록 연결
7. 오류 처리와 보안 검토
8. 로컬 테스트 후 Vercel 배포

## 8. 완료 기준
- 순수 HTML/CSS/JS 구조를 유지한다.
- 브라우저 코드에서 서버 비밀키를 참조하지 않는다.
- 환경변수 예시가 제공된다.
- 문서에 기재된 폴더와 실제 파일 구조가 일치한다.
- 로컬 실행 방법이 README 또는 프로젝트 안내에 기록된다.
