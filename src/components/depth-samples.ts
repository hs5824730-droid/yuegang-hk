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
    photo('interior', { zh: '开放式客餐厅', en: 'Open-plan living' }, { zh: '木饰面与石材壁炉的客餐厅，近处为沙发与茶几，后方是厨房与露台。', en: 'A living room with timber walls and a stone fireplace, a sofa and coffee tables in front of the kitchen and terrace.' }, 1280, 870),
    photo('hero-house', { zh: '黄昏庭院', en: 'Garden at dusk' }, { zh: '前景树木与草坪，后方是亮着暖光的现代住宅。', en: 'A tree and lawn in front of a modern house with warm evening lights.' }, 1280, 854),
    photo('white-house', { zh: '建筑与小径', en: 'House & pathway' }, { zh: '石板小径通向白色几何住宅，背景为蓝天。', en: 'A stone pathway leading to a white geometric house beneath a blue sky.' }, 1280, 1280),
    photo('queenslander', { zh: '阳台与户外', en: 'Veranda & outdoors' }, { zh: '白色木屋阳台与户外泳池。', en: 'A white timber house with a veranda and an outdoor swimming pool.' }, 1280, 854),
  ],
};
