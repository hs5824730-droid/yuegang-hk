/**
 * Chinese display variants. Site copy is written once in Cantonese (粵語, Traditional script);
 * the 繁體中文 variant is derived from it as standard written Chinese (書面語).
 */
export type ZhVariant = 'yue' | 'hant';
export type SiteLanguage = ZhVariant | 'en';

/** Whole phrases first, so idioms read naturally instead of word-by-word. */
const PHRASES: [string, string][] = [
  ['你淨係收租就得', '您只需收租即可'], ['一蚊都唔收', '分文不收'], ['得㗎！', '可以！'], ['得㗎', '可以'], ['冇問題', '沒問題'],
  ['執執修修', '小型維修'], ['執靚', '翻新'], ['吉屋', '空置單位'], ['吉住', '空置'], ['搞掂', '辦妥'], ['一手包辦', '全程處理'],
  ['傾偈', '溝通'], ['傾吓', '聊聊'], ['問吓', '查詢'], ['睇吓', '看看'], ['試吓', '試試'], ['撳一下', '按一下'],
  ['話我哋知', '告訴我們'], ['話你知', '告訴您'], ['同我哋講', '告訴我們'], ['同你講', '向您說明'],
  ['你層樓', '您的物業'], ['層樓', '物業'], ['點樣', '怎樣'], ['點計', '如何計算'], ['點收', '如何收費'], ['都可以', '也可以'], ['或者', '或'], ['點解', '為什麼'], ['點算', '怎麼辦'], ['做咩', '做什麼'], ['乜嘢', '什麼'],
  ['而家', '現在'], ['即刻', '立即'], ['聽日', '明天'], ['啱啱', '剛剛'], ['搵啱', '找到合適的'], ['唔啱', '不合適'],
  ['淨係', '只是'], ['淨放租', '只放租'], ['同埋', '以及'], ['係咪', '是否'], ['唔係', '不是'], ['唔使', '無須'], ['唔好', '不要'],
  ['唔會', '不會'], ['唔可以', '不可以'], ['唔知', '不知道'], ['唔止', '不只'], ['留低', '留下'], ['幾多', '多少'], ['幾耐', '多久'],
  ['邊個', '哪位'], ['邊度', '哪裡'], ['邊啲', '哪些'], ['邊區', '哪區'], ['喺度', '在這裡'], ['呢度', '這裡'], ['呢啲', '這些'], ['一啲', '一些'],
  ['做嘢', '辦事'], ['嘢', '事'], ['咁樣', '這樣'], ['好快', '很快'], ['好多', '很多'], ['靚', '美觀'],
];
/** Single Cantonese characters, applied after the phrases. */
const CHARS: [RegExp, string][] = [
  [/我哋/g, '我們'], [/你哋/g, '你們'], [/佢哋/g, '他們'], [/佢/g, '他'], [/嘅/g, '的'], [/係/g, '是'], [/冇/g, '沒有'],
  [/唔/g, '不'], [/喺/g, '在'], [/咗/g, '了'], [/啲/g, '些'], [/呢/g, '這'], [/嗰/g, '那'], [/咁/g, '這麼'], [/嚟/g, '來'],
  [/俾/g, '給'], [/畀/g, '給'], [/攞/g, '拿'], [/搵/g, '找'], [/撳/g, '按'], [/咩/g, '什麼'], [/揀/g, '選擇'], [/啱/g, '合適'],
  [/(?<!睇)睇(?!樓)/g, '看'], [/傾/g, '商談'], [/吓/g, '一下'], [/㗎|喇|嘞|囉|㖭/g, ''], [/啦/g, '吧'],
  [/仲/g, '還'], [/(?<![相不一共陪如等])同(?![事意一樣時步區類])/g, '和'],
  [/(?<![旁身海兩雙這那周左右河岸一])邊(?![界境緣])/g, '哪'], [/你(?!們)/g, '您'],
];

const cache = new Map<string, string>();
export function toWrittenChinese(text: string): string {
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  let out = text;
  for (const [from, to] of PHRASES) out = out.split(from).join(to);
  for (const [from, to] of CHARS) out = out.replace(from, to);
  cache.set(text, out);
  return out;
}

export function storedZhVariant(): ZhVariant {
  try { return localStorage.getItem('zhVariant') === 'hant' ? 'hant' : 'yue'; } catch { return 'yue'; }
}
