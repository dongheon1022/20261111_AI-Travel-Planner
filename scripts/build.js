// ==============================================================================
// scripts/build.js — Vercel 배포용 정적 빌드 스크립트
// Vercel이 요구하는 'public' 출력 디렉터리를 자동으로 생성하고 정적 자산을 복사합니다.
// ==============================================================================

import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

// 1. 기존 public 디렉터리가 있다면 정리하고 새로 생성
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

// 2. index.html 파일 복사
if (fs.existsSync('index.html')) {
  fs.copyFileSync('index.html', path.join(publicDir, 'index.html'));
}

// 3. css, js, assets 정적 디렉터리들을 public/ 내부로 재귀 복사
const staticDirs = ['css', 'js', 'assets'];

for (const dir of staticDirs) {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(publicDir, dir), { recursive: true });
  }
}

console.log('✅ Vercel용 public 출력 디렉터리 빌드가 성공적으로 완료되었습니다.');
