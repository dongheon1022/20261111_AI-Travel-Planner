// ==============================================================================
// api/feedback-list.js — 최신 피드백 전체 목록 조회 Serverless API (Vercel Functions)
// ==============================================================================

import 'dotenv/config'; // 로컬 환경변수 로드
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 1. HTTP Method 검증 (GET만 허용)
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET 요청만 지원합니다.',
      },
    });
  }

  try {
    // 2. Supabase 환경변수 확인
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project-id')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_READ_FAILED',
          message: '.env 파일에 유효한 Supabase 설정이 누락되었습니다.',
        },
      });
    }

    // 3. Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 4. feedback 테이블에서 최신순(created_at DESC)으로 데이터 조회
    const { data, error } = await supabase
      .from('feedback')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB Error] Feedback list fetch failed:', error.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_READ_FAILED',
          message: '피드백 목록을 불러오지 못했습니다.',
        },
      });
    }

    // 5. 성공 응답 반환
    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[API Error] feedback-list unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      },
    });
  }
}

