// ==============================================================================
// api/recommend.js — 맞춤 여행지 및 예산 추천 Serverless API (Vercel Functions)
// ==============================================================================

import 'dotenv/config'; // 로컬 실행 시 .env 파일 로드
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화 (API Key는 서버 환경변수에서만 안전하게 읽음)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS 및 응답 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 1. HTTP Method 검증 (오직 POST만 허용)
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 지원합니다.',
      },
    });
  }

  try {
    // 2. 요청 본문(body) 유효성 검사
    const { destination } = req.body || {};

    if (!destination || typeof destination !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DESTINATION',
          message: '여행지를 올바르게 입력해 주세요.',
        },
      });
    }

    const trimmedDestination = destination.trim();
    if (trimmedDestination.length < 1 || trimmedDestination.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DESTINATION',
          message: '여행지를 1~100자 이내로 입력해 주세요.',
        },
      });
    }

    // 3. 환경변수 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your_openai_api_key_here')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AI_UNAVAILABLE',
          message: '.env 파일에 유효한 OPENAI_API_KEY를 설정해 주세요.',
        },
      });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // 4. OpenAI 호출용 시스템 지침과 프롬프트 구성
    const systemPrompt = `당신은 사용자의 취향을 파악해 대안 여행지를 추천하는 전문 여행 큐레이터 AI입니다.
반드시 아래 규칙을 엄격히 준수하여 순수 JSON 포맷으로만 응답해야 합니다.

[추천 규칙]
1. 사용자가 입력한 여행지와 분위기, 활동, 자연환경, 문화 측면에서 밀접하게 관련 있는 '다른' 대안 여행지 정확히 2곳을 추천하십시오.
2. 원래 사용자가 입력한 여행지를 결과에 중복으로 넣지 마십시오.
3. 추천 우선순위를 1순위, 2순위로 명확히 부여하십시오.
4. 실재 여부가 불확실하거나 가상의 장소를 지어내지 마십시오.
5. 추천 이유는 간결하고 매력적인 한국어 문장(2~3문장)으로 작성하십시오.

[예산 가이드 규칙]
1. 기본 가정: 1인 기준, 2박 3일, 현지 체류 중심 (숙박, 식비, 시내 교통 포함 / 항공권 및 장거리 이동비 제외).
2. 금액은 확정 가격이 아닌 '참고 추정치'입니다.
3. 화폐 단위(currency)는 한국 원화(KRW)를 기본으로 하되, 해외 여행지인 경우 현지 통화 또는 KRW로 합리적인 최소(min), 최대(max) 범위를 제시하십시오.
4. min은 max보다 클 수 없습니다.

[응답 JSON 스키마]
{
  "recommendations": [
    {
      "priority": 1,
      "name": "여행지 명칭 (도시/지역)",
      "region": "국가 또는 세부 지역",
      "reason": "추천 이유 설명"
    },
    {
      "priority": 2,
      "name": "여행지 명칭 (도시/지역)",
      "region": "국가 또는 세부 지역",
      "reason": "추천 이유 설명"
    }
  ],
  "budget": {
    "currency": "KRW",
    "min": 350000,
    "max": 550000,
    "assumptions": [
      "1인 기준",
      "2박 3일",
      "항공 및 장거리 교통비 제외",
      "현지 일반 숙소 및 식사 기준"
    ],
    "included": ["2박 숙박비", "일반 식비", "현지 대중교통", "기본 관광지 입장료"],
    "excluded": ["출발지-목적지 항공/KTX 등 장거리 교통비", "개인 쇼핑비 및 유흥비", "여행자 보험"],
    "disclaimer": "실제 비용은 여행 시기, 예약 시점 및 개인 소비 스타일에 따라 차이가 날 수 있는 참고 추정치입니다."
  }
}`;

    const userPrompt = `입력한 여행지: "${trimmedDestination}"
위 여행지와 취향상 잘 어울리는 대체 여행지 2곳과 2박 3일 1인 참고 예산을 지정된 JSON 규격으로 반환해 주세요.`;

    // 5. OpenAI API 호출 (Structured JSON 모드 사용)
    const completion = await openai.chat.completions.create({
      model: model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: 'AI 응답을 수신하지 못했습니다. 다시 시도해 주세요.',
        },
      });
    }

    // 6. JSON 파싱 및 데이터 구조 유효성 검증
    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '추천 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.',
        },
      });
    }

    // 추천 목록 배열 검증 (반드시 정확히 2개여야 함)
    const recs = parsedData.recommendations;
    if (!Array.isArray(recs) || recs.length !== 2) {
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '추천 여행지 개수가 규격(정확히 2곳)과 다릅니다.',
        },
      });
    }

    // 각 추천 아이템 검증
    for (let i = 0; i < 2; i++) {
      const item = recs[i];
      if (!item.name || !item.reason) {
        return res.status(502).json({
          success: false,
          error: {
            code: 'AI_INVALID_RESPONSE',
            message: '추천 여행지 필수 정보가 누락되었습니다.',
          },
        });
      }
      // 우선순위 번호 강제 보정 (1, 2)
      item.priority = i + 1;
      item.name = String(item.name).trim();
      item.region = item.region ? String(item.region).trim() : '';
      item.reason = String(item.reason).trim();
    }

    // 예산 데이터 검증 및 기본값 보정
    const budget = parsedData.budget || {};
    const minVal = Number(budget.min) || 0;
    const maxVal = Number(budget.max) || minVal;

    const sanitizedBudget = {
      currency: budget.currency ? String(budget.currency).toUpperCase() : 'KRW',
      min: Math.min(minVal, maxVal),
      max: Math.max(minVal, maxVal),
      assumptions: Array.isArray(budget.assumptions) && budget.assumptions.length > 0
        ? budget.assumptions.map(String)
        : ['1인 기준', '2박 3일', '항공 및 장거리 교통비 제외'],
      included: Array.isArray(budget.included) && budget.included.length > 0
        ? budget.included.map(String)
        : ['현지 숙박', '식비', '현지 교통'],
      excluded: Array.isArray(budget.excluded) && budget.excluded.length > 0
        ? budget.excluded.map(String)
        : ['항공권', '개인 쇼핑'],
      disclaimer: budget.disclaimer
        ? String(budget.disclaimer)
        : '실제 비용은 여행 시기 및 예약 조건에 따라 달라질 수 있는 참고 추정치입니다.',
    };

    // 7. 성공 응답 반환
    return res.status(200).json({
      success: true,
      data: {
        destination: trimmedDestination,
        recommendations: recs,
        budget: sanitizedBudget,
      },
    });
  } catch (error) {
    console.error('[API Error] recommend failed:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AI_UNAVAILABLE',
        message: '추천 서비스를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      },
    });
  }
}

