// ==============================================================================
// dev-server.js — 로컬 개발용 경량 서버
// Vercel 로그인이나 추가 도구 없이, 'npm start'만으로 즉시 브라우저에서 실행할 수 있습니다.
// ==============================================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// API 핸들러 함수들 불러오기
import recommendHandler from './api/recommend.js';
import feedbackHandler from './api/feedback.js';
import feedbackListHandler from './api/feedback-list.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// 지원하는 파일 확장자별 MIME 타입
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // 1. Vercel Function 모의 응답 헬퍼 함수 추가 (res.status 및 res.json 지원)
  res.status = function (statusCode) {
    res.statusCode = statusCode;
    return res;
  };
  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };

  // 2. 요청 본문(Body) 파싱 헬퍼 함수
  async function parseBody() {
    return new Promise((resolve) => {
      let bodyStr = '';
      req.on('data', (chunk) => {
        bodyStr += chunk;
      });
      req.on('end', () => {
        try {
          req.body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          req.body = {};
        }
        resolve();
      });
    });
  }

  // 3. API 라우팅 분기
  if (pathname === '/api/recommend') {
    await parseBody();
    return recommendHandler(req, res);
  }

  if (pathname === '/api/feedback') {
    await parseBody();
    return feedbackHandler(req, res);
  }

  if (pathname === '/api/feedback-list') {
    return feedbackListHandler(req, res);
  }

  // 4. 정적 파일(HTML, CSS, JS, 이미지) 서빙
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // 보안: 디렉토리 탐색(../) 방지
  if (!filePath.startsWith(__dirname)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 파일이 없을 경우 404
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found — 요청하신 파일을 찾을 수 없습니다.');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 AI Travel Planner 로컬 개발 서버가 실행되었습니다!`);
  console.log(`👉 브라우저 주소창에 입력하세요: http://localhost:${PORT}`);
  console.log('====================================================');
  console.log('종료하려면 터미널에서 Ctrl + C 를 누르세요.\n');
});

