import fs from 'fs';

const cachePath = 'scripts/lenamiu_en_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// Fill the last 10 missing items (IDs 380..389)
const last10 = {
  380: "可是有人留言說 P'Pat 是個超級大壞蛋 怎麼又是壞人啦",
  381: "又來了 為什麼啦 為什麼我每次拿到的都是壞人角色啊",
  382: "但長得這麼善良演壞人才有反差感 長相善良演狠角色特別有張力",
  383: "這是為了打破既定印象嗎 製造強烈的反差萌嗎",
  384: "等等我剛剛在說什麼 哇 愛心點讚數快要衝破三百萬了",
  385: "天啊肯定是因為 Pat 的威力太強大了啦",
  386: "不過現在支持 Pat 的粉絲們 哎呀等等",
  387: "現在 Pat 暫時休息 彈幕還在狂刷 Paan Paan 打字都還沒打完",
  388: "不過大家冷靜一下 聽我說",
  389: "真的是 Pat 沒錯吧 好了各位觀眾 來聽第三個故事"
};

for (const [id, text] of Object.entries(last10)) {
  cache[id] = text;
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
console.log(`Cache updated! Total entries in cache: ${Object.keys(cache).length} / 929`);
