const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const excludedDirs = new Set(['node_modules', '.next', '.git', '.git-tools']);
const excludedFiles = new Set(['.env.local']);

const secretPatterns = [
  /AIza[0-9A-Za-z-_]{35}/,
  /AQ\.[0-9A-Za-z-_]{40,}/,
  /GEMINI_API_KEY\s*=\s*(?!your_gemini_api_key_here\b|['"]?GEMINI_API_KEY:latest['"]?\b)\S+/,
  /WAQI_API_TOKEN\s*=\s*(?!['"]?(?:test-token|your_token_here|originalEnv|WAQI_API_TOKEN:latest)?['"]?\b)\S+/,
];

if (process.argv.includes('--staged')) {
  const diff = execSync('.\\.git-tools\\cmd\\git.exe diff --cached', { encoding: 'utf8' });
  const stagedHits = [];
  diff.split('\n').forEach((line, idx) => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const pattern of secretPatterns) {
        if (pattern.test(line)) {
          stagedHits.push({ line: idx + 1, snippet: line.trim() });
          break;
        }
      }
    }
  });

  if (stagedHits.length === 0) {
    console.log('CLEAN: Zero secrets found in git staged diff!');
    process.exit(0);
  } else {
    console.error('LEAK FOUND IN STAGED DIFF:', JSON.stringify(stagedHits, null, 2));
    process.exit(1);
  }
}

const foundHits = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) {
        scanDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      if (!excludedFiles.has(entry.name)) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(rootDir, fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const pattern of secretPatterns) {
            if (pattern.test(line)) {
              foundHits.push({
                file: relPath,
                line: index + 1,
                snippet: line.trim().slice(0, 80),
              });
              break;
            }
          }
        });
      }
    }
  }
}

scanDir(rootDir);

if (foundHits.length === 0) {
  console.log('CLEAN: Zero secrets found across workspace outside .env.local');
  process.exit(0);
} else {
  console.error('LEAK DETECTED:', JSON.stringify(foundHits, null, 2));
  process.exit(1);
}
