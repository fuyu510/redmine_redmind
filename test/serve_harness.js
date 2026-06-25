'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4599;

const sampleOutline = [
  '- 프로젝트 계획',
  '  - 1단계 조사',
  '    - 시장 분석',
  '    - 경쟁사 분석',
  '    - 사용자 인터뷰',
  '  - 2단계 설계',
  '    - 정보 구조',
  '    - UI 설계',
  '    - 프로토타입',
  '  - 3단계 개발',
  '    - 백엔드 API',
  '    - 프론트엔드',
  '    - 데이터베이스',
  '  - 4단계 테스트',
  '    - 단위 테스트',
  '    - 통합 테스트',
  '  - 5단계 배포',
  '    - 스테이징',
  '    - 프로덕션'
].join('\n');

const outlineB64 = Buffer.from(sampleOutline, 'utf8').toString('base64');
let lastPayload = null;

const mime = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function harness() {
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
    '<meta name="csrf-token" content="test-csrf-token"><title>Mindmap harness</title>' +
    '<link rel="stylesheet" href="/assets/stylesheets/mind-elixir.css">' +
    '<link rel="stylesheet" href="/assets/stylesheets/redmine_redmind.css">' +
    '<script>window.RedmineRedmindConfig={saveUrl:"/mindmaps/save",i18n:' +
    '{edit:"편집",save:"저장",cancel:"취소",editTitle:"마인드맵 편집기",' +
    'fullscreen:"전체화면",close:"닫기",view:"마인드맵",' +
    'saved:"저장되었습니다",conflict:"내용이 변경되었습니다",failed:"저장 실패"}};</script>' +
    '<script src="/assets/javascripts/mindmap_outline.js"></script>' +
    '<script src="/assets/javascripts/mind-elixir.iife.js"></script>' +
    '<script src="/assets/javascripts/redmine_redmind.js"></script>' +
    '</head><body><h1>Redmine Redmind harness</h1>' +
    '<div class="mindmap-wrapper" data-mindmap-outline="' + outlineB64 + '" ' +
    'data-mindmap-title="" data-mindmap-editable="true" ' +
    'data-mindmap-object-type="WikiContent" data-mindmap-object-id="1" ' +
    'data-mindmap-version="3"><div class="mindmap-diagram"></div></div>' +
    '</body></html>';
}

function serveAsset(req, res) {
  const rel = req.url.split('?')[0].replace(/^\/assets\//, '');
  const file = path.join(ASSETS, rel);
  if (!file.startsWith(ASSETS)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url === '/mindmaps/save') {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      try { lastPayload = JSON.parse(body); } catch (e) { lastPayload = { parseError: true, raw: body }; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', outline: (lastPayload && lastPayload.outline) || '' }));
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/__last') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lastPayload));
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(harness());
    return;
  }
  if (req.method === 'GET' && req.url.indexOf('/assets/') === 0) {
    serveAsset(req, res);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('harness listening on http://127.0.0.1:' + PORT);
});
