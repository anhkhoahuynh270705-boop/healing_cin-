import { cp, mkdir, rm } from 'node:fs/promises';

const from = new URL('../dist/rap-phim-chua-lanh/browser/', import.meta.url);
const to = new URL('../backend/src/main/resources/static/', import.meta.url);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log('Đã chép Angular build vào Spring Boot static resources.');
