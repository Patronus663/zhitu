import fs from 'fs';
import { FetchClient, Config } from 'coze-coding-dev-sdk';

const url = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F2012-2024%E5%B9%B4%E5%BE%AE%E7%A7%AF%E5%88%86II%E6%9C%9F%E6%9C%AB.pdf&nonce=7d55e81b-8d31-40c6-804a-5a26990693df&project_id=7673849978095452187&sign=395f43f8425992c875bccbd0db683ff8841a8a8ce38f9134915e93ee252569c4';

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