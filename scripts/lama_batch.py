#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""batch: 对 clean/ 全量跑一遍 LaMa 细笔画收尾，输出到 clean-lama/。"""

import argparse
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import sys
sys.path.insert(0, r"C:\Users\Morty\Documents\deepseek-harness\default-workspace")
from simple_lama_inpainting import SimpleLama  # noqa: E402


def zones(h, w):
    return [
        (int(.24 * w), int(.30 * h), int(.80 * w), int(.66 * h)),
        (0, 0, int(.32 * w), int(.13 * h)),
        (0, int(.82 * h), int(.44 * w), h),
        (int(.58 * w), int(.80 * h), w, h),
    ]


def tight_mask(img, thr=8):
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    sat = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)[..., 1]
    bg = cv2.medianBlur(gray, 31)
    ex = np.clip(gray.astype(np.int16) - bg.astype(np.int16), 0, 255).astype(np.uint8)
    m = ((ex >= thr) & (gray > 150) & (sat < 90)).astype(np.uint8) * 255
    zone = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in zones(h, w):
        zone[y0:y1, x0:x1] = 255
    m = cv2.bitwise_and(m, zone)
    n, lbl, stats, _ = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8), 8)
    keep = np.zeros((h, w), np.uint8)
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < 6:
            continue
        if ww > 0.5 * w or hh > 0.35 * h:
            continue
        if area > 0.02 * w * h:
            continue
        keep[lbl == i] = 255
    return cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--keys", default="", help="只处理这些盘号目录，逗号分隔")
    a = ap.parse_args()
    lama = SimpleLama()
    files = sorted(Path(a.src).glob("*/*.jpg"))
    if a.keys:
        allow = {k.strip() for k in a.keys.split(",") if k.strip()}
        files = [f for f in files if f.parent.name in allow]
    print(f"{len(files)} 张", flush=True)
    t0 = time.time()
    for i, f in enumerate(files, 1):
        rgb = np.asarray(Image.open(f).convert("RGB"))
        h, w = rgb.shape[:2]
        m = tight_mask(rgb)
        if (m > 0).sum() < 200:
            out = rgb
        else:
            gen = np.asarray(lama(Image.fromarray(rgb), Image.fromarray(m)).convert("RGB"))[:h, :w]
            al = cv2.GaussianBlur((m > 0).astype(np.float32), (7, 7), 0)[..., None]
            out = (gen.astype(np.float32) * al + rgb.astype(np.float32) * (1 - al)).astype(np.uint8)
        dst = Path(a.out) / f.parent.name / f.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(out).save(dst, "JPEG", quality=94, optimize=True)
        if i % 20 == 0:
            print(f"  {i}/{len(files)} {time.time()-t0:.0f}s", flush=True)
    print(f"完成 {time.time()-t0:.0f}s -> {a.out}")


if __name__ == "__main__":
    main()
