# 04 — Node.js 및 OpenAI API 구현 지침

## 1. 구조
Vercel Node.js Functions로 서버 API를 제공한다.
- `POST /api/recommend`
- `POST /api/feedback`
- `GET /api/feedback-list`

브라우저는 이 API만 호출한다. OpenAI와 Supabase Service Role Key를 직접 호출하지 않는다.

## 2. POST /api/recommend
### 요청
```json
{ "destination": "제주도" }
```

### 검증
- HTTP method가 POST인지 확인
- JSON 파싱 실패 처리
- `destination`이 문자열인지 확인
- trim 후 1~100자 범위인지 확인
- 너무 큰 요청 본문 거부
- 요청 빈도 제한 적용(배포 환경에서 가능한 보호 수단 사용)

### OpenAI 호출
- API Key는 `process.env.OPENAI_API_KEY`
- 모델은 `process.env.OPENAI_MODEL`
- 시스템 지침으로 한국어 응답, 정확히 2개 추천, 구조화 JSON, 불확실한 사실 생성 금지를 전달
- JSON Schema 또는 Structured Outputs 기능을 지원하는 경우 이를 사용
- 모델의 출력 텍스트를 그대로 클라이언트에 전달하지 말고 파싱·검증한다.
- 모델 API가 실패하거나 시간 초과되면 서버 오류로 매핑한다.

### 서버 검증
- `recommendations` 배열 길이가 정확히 2인지 확인
- priority가 각각 1, 2인지 확인
- name, reason이 비어 있지 않은 문자열인지 확인
- budget currency 및 min/max 숫자 형식 검증
- min이 max보다 크지 않은지 확인
- assumptions, included, excluded가 문자열 배열인지 확인
- URL 등 명세에 없는 필드를 화면에서 신뢰하지 않는다.

### 응답
성공은 `200`, 잘못된 입력은 `400`, 서버/AI 오류는 `500` 또는 적절한 오류 코드로 반환한다.
```json
{
  "success": true,
  "data": {}
}
```
실패:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DESTINATION",
    "message": "여행지를 1~100자 이내로 입력해 주세요."
  }
}
```

## 3. POST /api/feedback
### 요청
```json
{ "content": "서비스 사용 의견입니다." }
```
### 처리
1. POST 여부와 JSON 형식 확인
2. 문자열 trim 및 1~1000자 검증
3. 서버에서 Supabase 클라이언트 생성
4. `feedback` 테이블에 content 삽입
5. 성공 시 생성된 id와 created_at 반환
6. 실패 시 안전한 오류 코드 반환

## 4. GET /api/feedback-list
- Supabase에서 피드백을 조회한다.
- `created_at DESC` 정렬
- 화면에 필요한 `id`, `content`, `created_at`만 반환
- 전체 목록 요구사항을 충족하되 데이터가 커질 경우 페이지네이션을 도입하기 전 사용자 승인과 PRD 변경이 필요하다.
- DB 오류 시 빈 배열로 위장하지 말고 실패 응답을 반환한다.

## 5. 오류 코드 권장 목록
| 코드 | 의미 | 사용자 메시지 예시 |
|---|---|---|
| INVALID_DESTINATION | 여행지 입력 오류 | 여행지를 1~100자 이내로 입력해 주세요. |
| INVALID_FEEDBACK | 피드백 입력 오류 | 피드백은 1~1000자로 작성해 주세요. |
| AI_UNAVAILABLE | AI 서비스 오류 | 추천 서비스를 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주세요. |
| AI_INVALID_RESPONSE | AI 응답 형식 오류 | 추천 결과를 만드는 중 문제가 발생했습니다. 다시 시도해 주세요. |
| DB_WRITE_FAILED | 피드백 저장 실패 | 피드백을 저장하지 못했습니다. 작성 내용은 유지됩니다. |
| DB_READ_FAILED | 피드백 조회 실패 | 피드백 목록을 불러오지 못했습니다. |
| RATE_LIMITED | 요청 과다 | 잠시 후 다시 시도해 주세요. |
| INTERNAL_ERROR | 알 수 없는 서버 오류 | 일시적인 오류가 발생했습니다. |

## 6. 보안 지침
- API Key는 서버 환경변수에만 둔다.
- 브라우저 번들에 비밀값이 포함되지 않았는지 배포 전 검색한다.
- CORS와 요청 origin 정책을 설정한다.
- 입력 길이 및 body 크기를 제한한다.
- 오류 응답에 stack trace, SQL, 키, 내부 경로를 포함하지 않는다.
- 로그는 오류 코드·요청 식별자 등 최소 정보 위주로 남긴다.
- 외부에서 공개되는 API이므로 rate limit 또는 이에 준하는 남용 방지책을 둔다.
- AI가 반환한 문자열은 HTML로 삽입하지 않는다.

## 7. 완료 기준
- 세 API가 명세된 method와 JSON 형식으로 동작한다.
- 입력 검증 실패 시 4xx가 반환된다.
- AI 호출 실패와 구조 검증 실패가 구분된다.
- DB 비밀키가 클라이언트에 노출되지 않는다.
- 서버 오류가 사용자에게 이해 가능한 메시지로 변환된다.
