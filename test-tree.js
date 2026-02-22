import fs from 'fs';
const raw = fs.readFileSync('src/docs/.source/index.json', 'utf8');
const data = JSON.parse(raw);
console.log(JSON.stringify(data, null, 2));
