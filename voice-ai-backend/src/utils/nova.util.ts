// src/utils/nova.util.ts

// 轻量版 Levenshtein 距离，用来做模糊匹配
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // 删除
        dp[i][j - 1] + 1,        // 插入
        dp[i - 1][j - 1] + cost, // 替换
      );
    }
  }

  return dp[m][n];
}

// 把常见中文写法、标点等统一成 nova
function normalizeForNova(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/诺娃|諾娃|诺瓦|諾瓦/g, 'nova')  // 中文也映射到 nova
    .replace(/[，。！？、,.!?]/g, ' ')          // 去掉标点
    .replace(/\s+/g, ' ')
    .trim();
}

// 判断一个 token 是否“像 nova”
function looksLikeNovaToken(token: string): boolean {
  if (!token) return false;

  const simple = token.replace(/[^a-z]/g, '');
  if (!simple) return false;

  if (simple.includes('nova')) return true;

  const d = levenshtein(simple, 'nova');

  if (d <= 1) return true;
  if (d === 2 && simple[0] === 'n') return true;

  return false;
}

// 暴露给外面用的函数
export function shouldGoCallNova(raw: string): boolean {
  const clean = normalizeForNova(raw);

  if (!clean) return false;

  const directPatterns = [
    'nova',
    'no va',
    'no-va',
    'n0va',
    'nover',
    'nofa',
    'nava',
    'noah',
  ];

  if (directPatterns.some((p) => clean.includes(p))) {
    return true;
  }

  const tokens = clean.split(' ');
  return tokens.some(looksLikeNovaToken);
}
