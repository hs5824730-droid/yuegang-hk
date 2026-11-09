#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hk-own-listings-import.py — 把自家盘源（data/ref/hk-market-listings）导入「网上睇楼」。

图片来源优先级：
  1. clean/raw/<kind>-<pid>/  —— 已去过水印的版本（本次用它）
  2. raw/<kind>-<pid>/        —— 原始图（clean 缺失时回退，标记 watermarked: true）

房间标签：把 selected/ 里带标签的图与候选图做感知哈希比对（同一条盘内），
距离最近且唯一的才贴标签，其余标「單位照片」—— 不再按顺序瞎对。

用法：
  python scripts/hk-own-listings-import.py --ref data\\ref\\hk-market-listings
  python scripts/hk-own-listings-import.py --ref ... --no-clean   # 用原始带水印图
"""

import argparse
import csv
import json
import re
from pathlib import Path

from PIL import Image, ImageFile, ImageOps

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parent.parent
LISTINGS = ROOT / "server" / "owner-listings.json"
IMG_ROOT = ROOT / "public" / "img" / "hk" / "listings"

CITY = {"港島": "Hong Kong Island", "九龍": "Kowloon", "新界": "New Territories", "離島": "Islands"}
ISLAND = {"mid-levels", "central", "sheung wan", "wan chai", "causeway bay", "tin hau", "north point",
          "quarry bay", "taikoo", "sai wan", "kennedy town", "pok fu lam", "aberdeen", "ap lei chau",
          "repulse bay", "happy valley", "shau kei wan", "fortress hill", "sai ying pun", "chai wan"}
KOWLOON = {"kai tak", "ho man tin", "mong kok", "tsim sha tsui", "yau ma tei", "jordan", "sham shui po",
           "cheung sha wan", "kowloon tong", "wong tai sin", "kwun tong", "lam tin", "hung hom",
           "to kwa wan", "mei foo", "lai chi kok", "olympic", "tai kok tsui", "diamond hill",
           "san po kong", "kowloon city", "prince edward", "ngau tau kok", "kowloon bay"}
ISLANDS = {"tung chung", "discovery bay", "cheung chau", "mui wo", "lantau", "peng chau"}
ROOM = {"客厅": ("living", "客廳", "Living room"), "卧室": ("bedroom", "睡房", "Bedroom"),
        "厨房": ("kitchen", "廚房", "Kitchen"), "浴室": ("bathroom", "浴室", "Bathroom")}
RANK = {"living": 1, "bedroom": 2, "kitchen": 3, "bathroom": 4}


def region_of(district: str) -> str:
    d = (district or "").strip().lower()
    if d in ISLAND:
        return "港島"
    if d in KOWLOON:
        return "九龍"
    if d in ISLANDS:
        return "離島"
    return "新界"


def money(raw: str):
    m = re.match(r"^([\d.]+)\s*([MmKk])?$", (raw or "").replace(",", "").strip())
    if not m:
        return None
    return float(m.group(1)) * {"M": 1_000_000, "K": 1_000}.get((m.group(2) or "").upper(), 1)


def ahash(path: Path, size=12):
    im = ImageOps.exif_transpose(Image.open(path)).convert("L").resize((size, size))
    px = list(im.getdata())
    avg = sum(px) / len(px)
    return [1 if v > avg else 0 for v in px]


def ham(a, b):
    return sum(x != y for x, y in zip(a, b))


def save_webp(src: Path, wide: Path, thumb: Path, max_w=1600):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = im.size
    if w > max_w:
        im = im.resize((max_w, round(h * max_w / w)), Image.LANCZOS)
    wide.parent.mkdir(parents=True, exist_ok=True)
    im.save(wide, "WEBP", quality=84, method=6)
    tw = min(600, im.width)
    im.resize((tw, round(im.height * tw / im.width)), Image.LANCZOS).save(thumb, "WEBP", quality=80, method=6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True)
    ap.add_argument("--no-clean", action="store_true", help="用 raw 原始图，不去水印")
    ap.add_argument("--clean-sub", default="clean", help="去水印图所在子目录（clean / clean-lama）")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    ref = Path(a.ref)

    rows = list(csv.DictReader(open(ref / "楼盘资料.csv", encoding="utf-8-sig")))
    pics = list(csv.DictReader(open(ref / "图片清单.csv", encoding="utf-8-sig")))
    labelled = {}
    for p in pics:
        labelled.setdefault(p["楼盘编号"], []).append(p)

    data = json.loads(LISTINGS.read_text(encoding="utf-8"))
    index = {r["id"]: i for i, r in enumerate(data)}

    imported, skipped = [], []
    for r in rows:
        pid = r["楼盘编号"].strip()
        kind = "rent" if r["租售"] == "出租" else "sale"
        key = f"{kind}-{pid}"

        src_dir = None if a.no_clean else (ref / a.clean_sub / "raw" / key)
        if not src_dir or not src_dir.is_dir():
            src_dir = ref / "raw" / key
        if not src_dir.is_dir():
            skipped.append((key, "无图片目录"))
            continue
        cleaned = a.clean_sub in str(src_dir)

        files = sorted(src_dir.glob("*.jpg"))
        if not files:
            skipped.append((key, "目录里没有 jpg"))
            continue

        # 选中图（带标签）与候选图做 ahash 匹配
        sel = [(p["房间类型"], ref / "selected" / p["文件"]) for p in labelled.get(pid, [])]
        sel = [(t, f) for t, f in sel if f.exists()]
        cand = [(f, ahash(f)) for f in files]
        used = set()
        assign = {}
        for room_type, sf in sel:
            h = ahash(sf)
            best, best_d = None, 99
            for f, hh in cand:
                if f in used:
                    continue
                d = ham(h, hh)
                if d < best_d:
                    best, best_d = f, d
            if best is not None and best_d <= 16:
                assign[best] = ROOM.get(room_type, ("room", room_type, room_type))
                used.add(best)

        ordered = sorted(
            files,
            key=lambda f: (0 if f in assign else 1, RANK.get(assign.get(f, ("room",))[0], 9), f.name)
        )[:8]

        out_dir = IMG_ROOT / pid
        rooms = []
        seen_ids = {}
        for f in ordered:
            rid, zh, en = assign.get(f, ("photo", "單位照片", "Unit photo"))
            seq = seen_ids.get(rid, 0) + 1
            seen_ids[rid] = seq
            room_id = rid if seq == 1 else f"{rid}{seq}"
            label_zh = zh if seq == 1 else f"{zh} {seq}"
            label_en = en if seq == 1 else f"{en} {seq}"
            n = len(rooms) + 1
            wide = out_dir / f"{n:02d}.webp"
            thumb = out_dir / f"{n:02d}.thumb.webp"
            if not a.dry_run:
                save_webp(f, wide, thumb)
            rooms.append({
                "id": room_id, "order": n,
                "label": {"zh": label_zh, "en": label_en},
                "photoUrl": f"/img/hk/listings/{pid}/{n:02d}.webp",
                "thumbnailUrl": f"/img/hk/listings/{pid}/{n:02d}.thumb.webp",
                "videoUrl": None,
                "watermarked": not cleaned,
            })
        if not rooms:
            skipped.append((key, "无可用图片"))
            continue

        amount = money(r["价格(港元)"])
        price_zh = f"HK${amount:,.0f} / 月" if kind == "rent" else f"HK${amount:,.0f}"
        price_en = f"HK${amount:,.0f} / month" if kind == "rent" else f"HK${amount:,.0f}"
        region = region_of(r["地区"])
        title = r["楼盘"].strip()
        estate = re.sub(r"\s+\d+\+?\s*Bedrooms?.*$", "", title) or title
        beds = re.match(r"\d+", r["房数"] or "")
        posted = (r["发布时间"] or "")[:10]

        record = {
            "id": f"reference-{pid}",
            "demo": False,
            "kind": kind,
            "address": estate,
            "suburb": r["地区"],
            "city": CITY[region],
            "postcode": "",
            "beds": int(beds.group(0)) if beds else None,
            "baths": None,
            "cars": None,
            "priceDisplay": {"zh": price_zh, "en": price_en},
            "priceBasis": "asking_monthly_rent" if kind == "rent" else "asking_sale",
            "checkedAt": posted or "2026-11-08",
            "listingDate": posted or None,
            "availableDate": None,
            "soldPrice": None,
            "soldDate": None,
            "geo": None,
            "features": [
                {"zh": f"實用面積 {r['实用面积(呎)']} 呎", "en": f"Saleable area {r['实用面积(呎)']} sq ft"},
                {"zh": f"{r['房数']} 房", "en": f"{r['房数']} bedrooms"},
                {"zh": title, "en": title},
            ],
            "publicReuseApproved": True,
            "sourceName": "28Hse",
            "sourceUrl": r["楼盘页面"],
            "mapUrl": "",
            "coverUrl": rooms[0]["photoUrl"],
            "rooms": rooms,
        }
        if kind == "rent":
            record["availabilityStatus"] = "available"
            record["availabilityCheckedAt"] = (posted or "2026-11-08") + "T00:00:00+08:00"
        else:
            record["availabilityStatus"] = None
            record["availabilityCheckedAt"] = None

        lid = record["id"]
        if lid in index:
            data[index[lid]] = record
        else:
            data.append(record)
            index[lid] = len(data) - 1
        imported.append((lid, kind, len(rooms), cleaned))

    if not a.dry_run:
        LISTINGS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"导入 {len(imported)} 条，跳过 {len(skipped)}")
    for lid, kind, n, cleaned in imported:
        print(f"  {lid}  {kind:5s}  {n} 张  {'已去水印' if cleaned else '带水印'}")
    for k, why in skipped:
        print(f"  跳过 {k}: {why}")


if __name__ == "__main__":
    main()
