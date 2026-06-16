const https = require('https');

const REPO = 'yarikleto/ScreenPing';

// Compare "1.2.3" style versions (a leading "v" on either side is tolerated).
// Returns true when `latest` is strictly newer than `current`.
function isNewer(latest, current) {
  const parse = (v) =>
    String(v)
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: 'api.github.com',
        path: `/repos/${REPO}/releases/latest`,
        // GitHub returns 403 without a User-Agent.
        headers: { 'User-Agent': 'ScreenPing', Accept: 'application/vnd.github+json' },
        timeout: 8000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GitHub API HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// Resolves to { version, url } when a newer release exists, otherwise null.
// Never throws — offline / rate-limited / API errors just mean "no update".
async function checkForUpdate(currentVersion) {
  try {
    const release = await fetchLatestRelease();
    if (release && release.tag_name && isNewer(release.tag_name, currentVersion)) {
      return { version: release.tag_name.replace(/^v/, ''), url: release.html_url };
    }
  } catch {
    // ignore — silently skip the notification
  }
  return null;
}

module.exports = { checkForUpdate, isNewer };
