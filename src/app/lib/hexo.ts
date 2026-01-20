// 解析 front-matter
// 支持 Windows 换行符 \r\n 和 Unix 换行符 \n
export function parseFrontMatter(content: string): { title?: string; date?: string; body: string } {
  // 支持 \r\n 和 \n 换行符
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { body: content };
  }

  const frontMatter = match[1];
  const result: { title?: string; date?: string; body: string } = {
    body: content.substring(match[0].length).trim(),
  };

  // 支持引号包裹的标题，如 title: "Hello: World" 或 title: 'Hello: World'
  const titleMatch = frontMatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  const dateMatch = frontMatter.match(/^date:\s*(.+)$/m);
  if (dateMatch) result.date = dateMatch[1].trim();

  return result;
}

// 统一的日期格式化函数（使用本地时间）
export function formatDate(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  // 使用本地时间而不是 UTC 时间
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 生成 front-matter
export function generateFrontMatter(title: string, date?: string): string {
  const dateStr = date || formatDate();

  return `---
title: ${title}
date: ${dateStr}
---`;
}

// 格式化文件名
export function formatFilename(title: string): string {
  // 移除特殊字符，保留中文、字母、数字、连字符和空格
  let filename = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  
  return `${filename}.md`;
}

// 从文件名提取标题
export function extractTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
