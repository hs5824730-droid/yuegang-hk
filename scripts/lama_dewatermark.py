#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lama_dewatermark2.py — 用 LaMa（PyTorch big-lama / simple-lama-inpainting）抹掉 28Hse 水印。

流程：区域内检测「纯白厚笔画 + 比周围亮的细线」得到掩膜 → LaMa 生成式补全 → 按掩膜贴回。

用法：
  python lama_dewatermark2.py --src <raw 根目录> --out <输出目录> [--limit N] [--preview N]
"""

import argparse
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def zones(h, w):
    return [
        (int(.24 * w), int(.32 * h), int(.80 * w), int(.64 * h)),
        (0, 0, int(.32 * w), int(.13 * h)),
        (0, int(.82 * h), int(.44 * w), h),
        (int(.58 * w), int(.80 * h), w, h),
    ]


def mask_strong(img):
    """不追求像素级精确：先找水印的「外接矩形」，整块交给 LaMa 重绘。
    用「比局部背景亮」的残差图找文字簇（对半透明、软边都稳），再按区域约束。"""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    bg = cv2.medianBlur(gray, 41)
    ex = np.clip(gray.astype(np.int16) - bg.astype(np.int16), 0, 255).astype(np.uint8)

    thr = max(6, int(np.percentile(ex, 99.0) * 0.30))
    m = (ex > thr).astype(np.uint8) * 255

    zone = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in zones(h, w):
        zone[y0:y1, x0:x1] = 255
    m = cv2.bitwise_and(m, zone)

    # 把字母连成词块
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9)))
    n, lbl, stats, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8), 8)

    keep = np.zeros((h, w), np.uint8)
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < 800:
            continue
        if ww < 0.06 * w:          # 太窄，不像文字
            continue
        # 限制单块尺寸：水印最多也就 25% 宽、18% 高，别把整间厨房都交出去
        if ww > 0.30 * w or hh > 0.22 * h:
            continue
        pad = 6
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(w, x + ww + pad), min(h, y + hh + pad)
        keep[y0:y1, x0:x1] = 255
    return keep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--preview", type=int, default=0)
    a = ap.parse_args()

    from simple_lama_inpainting import SimpleLama
    print("加载 LaMa（首次会下载 big-lama.pt 约 200MB）…", flush=True)
    t0 = time.time()
    lama = SimpleLama()
    print(f"模型就绪 {time.time() - t0:.0f}s", flush=True)

    files = sorted(Path(a.src).glob("*/*.jpg"))
    if a.limit:
        files = files[: a.limit]
    print(f"待处理 {len(files)} 张", flush=True)

    tiles, t1, done = [], time.time(), 0
    for f in files:
        rgb = np.asarray(Image.open(f).convert("RGB"))
        mask = mask_strong(rgb)
        if int(mask.sum()) < 255 * 60:
            fixed, cov = rgb, 0.0
        else:
            res = lama(Image.fromarray(rgb), Image.fromarray(mask))
            gen = np.asarray(res.convert("RGB"))
            if gen.shape[:2] != rgb.shape[:2]:
                gen = cv2.resize(gen, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
            alpha = cv2.GaussianBlur((mask > 0).astype(np.float32), (9, 9), 0)[..., None]
            fixed = (gen.astype(np.float32) * alpha + rgb.astype(np.float32) * (1 - alpha)).astype(np.uint8)
            cov = round(100 * (mask > 0).mean(), 2)

        dst = Path(a.out) / f.parent.name / f.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(fixed).save(dst, "JPEG", quality=94, optimize=True)
        done += 1

        if len(tiles) < a.preview:
            vis = rgb.copy()
            vis[mask > 0] = (255, 0, 0)
            tiles.append([rgb, vis, fixed, f"{f.parent.name}/{f.name} 覆盖={cov}%"])
        if done % 10 == 0:
            print(f"  {done}/{len(files)} {time.time() - t1:.0f}s", flush=True)

    print(f"完成 {done} 张，{time.time() - t1:.0f}s -> {a.out}", flush=True)

    if tiles:
        CH, CW = 300, 470
        sheet = np.full(((CH + 8) * len(tiles), (CW + 6) * 3 + 6, 3), 24, np.uint8)
        for r, row in enumerate(tiles):
            for c in range(3):
                im = cv2.resize(np.asarray(row[c]), (CW, CH))
                sheet[r * (CH + 8) + 4:r * (CH + 8) + 4 + CH, c * (CW + 6) + 4:c * (CW + 6) + 4 + CW] = im[:, :, ::-1]
        cv2.imwrite("lama_preview.jpg", sheet, [cv2.IMWRITE_JPEG_QUALITY, 92])
        print("对照图 -> lama_preview.jpg")
        for row in tiles:
            print("  ", row[3])


if __name__ == "__main__":
    main()
