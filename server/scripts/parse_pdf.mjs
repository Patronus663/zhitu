import fs from 'fs';
import { FetchClient, Config } from 'coze-coding-dev-sdk';

// 用法：node scripts/parse_pdf.mjs <pdf下载URL>
// URL 由调用方提供（签名链接会过期，禁止硬编码进仓库）
const url = process.argv[2];
if (!url) {
  console.error('用法: node scripts/parse_pdf.mjs <pdf下载URL>');
  process.exit(1);
}

const client = new FetchClient(new Config());
const resp = await client.fetch(url);
console.log('status:', resp.status_code, resp.status_message, 'type:', resp.filetype);
const text = (resp.content || [])
  .filter((i) => i.type === 'text')
  .map((i) => i.text)
  .join('\n');
fs.writeFileSync('/tmp/pdf_content.txt', text);
console.log('title:', resp.title);
console.log('text length:', text.length);
console.log('--- first 1500 chars ---');
console.log(text.slice(0, 1500));
