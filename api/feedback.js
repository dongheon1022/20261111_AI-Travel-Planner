// ==============================================================================
// api/feedback.js — 비회원 피드백 등록 Serverless API (Vercel Functions)
// ==============================================================================

import 'dotenv/config'; // 로컬 환경변수 로드
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 1. HTTP Method 검증
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
    const { content } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK',
          message: '피드백 내용을 입력해 주세요.',
        },
      });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK',
          message: '피드백은 1~1000자 이내로 작성해 주세요.',
        },
      });
    }

    // 3. Supabase 환경변수 확인
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project-id')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_WRITE_FAILED',
          message: '.env 파일에 유효한 Supabase 설정이 누락되었습니다.',
        },
      });
    }

    // 4. Supabase 클라이언트 초기화 (서버 전용 Service Role Key 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 5. feedback 테이블에 데이터 삽입 (파라미터화된 안전한 insert)
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ content: trimmedContent }])
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[DB Error] Feedback insert failed:', error.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_WRITE_FAILED',
          message: '피드백을 저장하지 못했습니다. 작성하신 내용은 화면에 유지됩니다.',
        },
      });
    }

    // 6. 성공 응답 반환
    return res.status(201).json({
      success: true,
      data: {
        id: data.id,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('[API Error] feedback unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      },
    });
  }
}

