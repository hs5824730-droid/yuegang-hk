#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对残影最重的若干张再跑一遍更强的掩膜（bbox 内整片 + 低阈值），其余不动。"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, r"C:\Users\Morty\Documents\deepseek-harness\default-workspace")
from simple_lama_inpainting import SimpleLama  # noqa: E402


def zones(h, w):
    return [
        (int(.24 * w), int(.30 * h), int(.80 * w), int(.66 * h)),
        (0, 0, int(.32 * w), int(.13 * h)),
        (0, int(.82 * h), int(.44 * w), h),
        (int(.58 * w), int(.80 * h), w, h),
    ]


def ghost_score(img):
    """区域内「比周围亮」的强度，用来排序哪张残影最重。"""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.int16)
    bg = cv2.medianBlur(gray.astype(np.uint8), 31).astype(np.int16)
    ex = np.clip(gray - bg, 0, 255)
    score = 0.0
    for x0, y0, x1, y1 in zones(h, w):
        z = ex[y0:y1, x0:x1]
        score += float((z > 12).mean()) * (z.shape[0] * z.shape[1]) / (h * w)
    return score


def strong_mask(img):
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    sat = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)[..., 1]
    bg = cv2.medianBlur(gray, 41)
    ex = np.clip(gray.astype(np.int16) - bg.astype(np.int16), 0, 255).astype(np.uint8)

    seed = ((ex > 5) & (gray > 155) & (sat < 100)).astype(np.uint8) * 255
    zone = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in zones(h, w):
        zone[y0:y1, x0:x1] = 255
    seed = cv2.bitwise_and(seed, zone)
    seed = cv2.morphologyEx(seed, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 7)))

    n, lbl, stats, _ = cv2.connectedComponentsWithStats((seed > 0).astype(np.uint8), 8)
    out = np.zeros((h, w), np.uint8)
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < 250 or ww < 0.05 * w:
            continue
        if ww > 0.55 * w or hh > 0.30 * h:
            continue
        pad = 5
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(w, x + ww + pad), min(h, y + hh + pad)
        sub = img[y0:y1, x0:x1]
        g = cv2.cvtColor(sub, cv2.COLOR_RGB2GRAY)
        s = cv2.cvtColor(sub, cv2.COLOR_RGB2HSV)[..., 1]
        b = cv2.medianBlur(g, 31)
        e = np.clip(g.astype(np.int16) - b.astype(np.int16), 0, 255).astype(np.uint8)
        inner = (((e > 4) & (g > 150)) | ((g > 182) & (s < 65))).astype(np.uint8) * 255
        inner = cv2.dilate(inner, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=1)
        out[y0:y1, x0:x1] = np.maximum(out[y0:y1, x0:x1], inner)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="clean-lama/raw 目录")
    ap.add_argument("--top", type=int, default=40)
    a = ap.parse_args()

    root = Path(a.dir)
    files = sorted(root.glob("*/*.jpg"))
    scored = []
    for f in files:
        img = np.asarray(Image.open(f).convert("RGB"))
        scored.append((ghost_score(img), f))
    scored.sort(reverse=True, key=lambda t: t[0])
    picks = scored[: a.top]
    print("残影最重的前 5:", [(round(s, 4), f.parent.name + "/" + f.name) for s, f in picks[:5]])

    lama = SimpleLama()
    for i, (score, f) in enumerate(picks, 1):
        rgb = np.asarray(Image.open(f).convert("RGB"))
        h, w = rgb.shape[:2]
        m = strong_mask(rgb)
        if (m > 0).sum() < 200:
            continue
        gen = np.asarray(lama(Image.fromarray(rgb), Image.fromarray(m)).convert("RGB"))[:h, :w]
        al = cv2.GaussianBlur((m > 0).astype(np.float32), (9, 9), 0)[..., None]
        out = (gen.astype(np.float32) * al + rgb.astype(np.float32) * (1 - al)).astype(np.uint8)
        Image.fromarray(out).save(f, "JPEG", quality=94, optimize=True)
        if i % 10 == 0:
            print(f"  {i}/{len(picks)}", flush=True)
    print("完成", len(picks), "张")


if __name__ == "__main__":
    main()
