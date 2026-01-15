const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const BACKUP_DIR = path.join(__dirname, 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'backups.json');

// バックアップディレクトリ作成
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// バックアップデータの初期化
if (!fs.existsSync(BACKUP_FILE)) {
  fs.writeFileSync(BACKUP_FILE, JSON.stringify([]), 'utf8');
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv',
  '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Table API - バックアップ一覧取得
  if (pathname === '/tables/backups' && req.method === 'GET') {
    try {
      const backups = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
      const limit = parseInt(parsedUrl.query.limit) || 50;
      const sort = parsedUrl.query.sort || '-created_at';
      
      let sorted = [...backups];
      if (sort === '-created_at') {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      
      const limited = sorted.slice(0, limit);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: limited }));
    } catch (err) {
      console.error('バックアップ取得エラー:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'バックアップ取得失敗' }));
    }
    return;
  }

  // Table API - バックアップ作成
  if (pathname === '/tables/backups' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const backups = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        
        const newBackup = {
          id: Date.now().toString(),
          backup_name: data.backup_name,
          backup_data: data.backup_data,
          backup_type: data.backup_type || 'manual',
          entry_count: data.entry_count || 0,
          account_count: data.account_count || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        backups.push(newBackup);
        
        // 最新5件のみ保持（古いものを自動削除）
        backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (backups.length > 5) {
          const removed = backups.splice(5);
          console.log(`🗑️ 古いバックアップを${removed.length}件削除しました`);
        }
        
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(backups, null, 2), 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: newBackup.id }));
        console.log('✅ バックアップ作成:', newBackup.backup_name);
      } catch (err) {
        console.error('バックアップ保存エラー:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'バックアップ保存失敗' }));
      }
    });
    return;
  }

  // 静的ファイル配信
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}/`);
  console.log(`📦 Backup file: ${BACKUP_FILE}`);
});
