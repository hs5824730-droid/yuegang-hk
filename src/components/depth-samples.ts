import type { Bi } from '../api';

export interface DepthPhoto {
  id: string;
  title: Bi;
  alt: Bi;
  image: string;
  depth: string;
  thumbnail: string;
  width: number;
  height: number;
}
const photo = (id: string, title: Bi, alt: Bi, width: number, height: number): DepthPhoto => ({
  id, title, alt, image: `/depth/${id}.webp`, depth: `/depth/${id}.depth.png`, thumbnail: `/depth/${id}.thumb.webp`, width, height,
});
export const depthSample = {
  id: 'light-house',
  title: { zh: '光影住宅', en: 'Light & space' },
  photos: [
    photo('interior', { zh: '開放式客餐廳', en: 'Open-plan living' }, { zh: '木飾面同石材壁爐嘅客餐廳，近處為沙發同茶几，後方係廚房同露台。', en: 'A living room with timber walls and a stone fireplace, a sofa and coffee tables in front of the kitchen and terrace.' }, 1280, 870),
    photo('hero-house', { zh: '黃昏庭院', en: 'Garden at dusk' }, { zh: '前景樹木同草坪，後方係亮着暖光嘅現代住宅。', en: 'A tree and lawn in front of a modern house with warm evening lights.' }, 1280, 854),
    photo('white-house', { zh: '建築同小徑', en: 'House & pathway' }, { zh: '石板小徑通向白色幾何住宅，背景為藍天。', en: 'A stone pathway leading to a white geometric house beneath a blue sky.' }, 1280, 1280),
    photo('queenslander', { zh: '陽台同戶外', en: 'Veranda & outdoors' }, { zh: '白色木屋陽台同戶外泳池。', en: 'A white timber house with a veranda and an outdoor swimming pool.' }, 1280, 854),
  ],
};
