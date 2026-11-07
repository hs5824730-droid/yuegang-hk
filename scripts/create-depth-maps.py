"""Precompute relative depth on this computer, never on a visitor's phone.

Install dependencies outside the project (Windows PowerShell):
  uv pip install --target "$env:LOCALAPPDATA/EucoveDepth/python" onnxruntime==1.21.0 Pillow numpy
  python scripts/create-depth-maps.py
EUCOVE_DEPTH_TOOLS can select another external cache/dependency directory.
Model: https://huggingface.co/onnx-community/depth-anything-v2-small
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get("EUCOVE_DEPTH_TOOLS", Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "EucoveDepth"))
sys.path.insert(0, str(CACHE / "python"))
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

MODEL = "onnx-community/depth-anything-v2-small"
REVISION = "4472b7362082ad9968fee890ca0f1e5aca36b93d"
MODEL_SHA256 = "fcf51f1b230362b28690bb9d1809bf0431f29cad20534e3f589bd7285547f20d"
weights = CACHE / "models/depth-anything-v2-small-q8.onnx"
if not weights.exists() or weights.stat().st_size != 27258801:
    weights.parent.mkdir(parents=True, exist_ok=True)
    partial = weights.with_suffix(".part")
    print("Downloading model to external cache:", weights, flush=True)
    urllib.request.urlretrieve(f"https://huggingface.co/{MODEL}/resolve/{REVISION}/onnx/model_quantized.onnx?download=true", partial)
    if partial.stat().st_size != 27258801:
        raise RuntimeError("Model download has an unexpected length")
    partial.replace(weights)
if hashlib.sha256(weights.read_bytes()).hexdigest() != MODEL_SHA256:
    raise RuntimeError("Model checksum does not match the pinned official weights")

options = ort.SessionOptions()
options.intra_op_num_threads = min(4, os.cpu_count() or 1)
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(weights), options, providers=["CPUExecutionProvider"])
output = ROOT / "public/depth"
output.mkdir(parents=True, exist_ok=True)
photos = []
mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
for name in ["interior", "hero-house", "white-house", "queenslander"]:
    source = ROOT / f"public/img/{name}.jpg"
    print("Estimating:", name, flush=True)
    image = Image.open(source).convert("RGB")
    # Official DPT processor: resize as little as possible, preserve aspect ratio,
    # dimensions divisible by 14, bicubic resampling and ImageNet normalization.
    sx, sy = 518 / image.width, 518 / image.height
    scale = sx if abs(1 - sx) < abs(1 - sy) else sy
    size = tuple(max(14, round(d * scale / 14) * 14) for d in image.size)
    pixels = np.asarray(image.resize(size, Image.Resampling.BICUBIC), dtype=np.float32) / 255
    tensor = np.ascontiguousarray(((pixels - mean) / std).transpose(2, 0, 1)[None])
    predicted = session.run(None, {session.get_inputs()[0].name: tensor})[0].squeeze()
    # Depth Anything produces relative inverse depth: white = near, black = far.
    values = (predicted - predicted.min()) / max(float(np.ptp(predicted)), 1e-6)
    depth = Image.fromarray(np.uint8(np.clip(values * 255, 0, 255)))
    display = image.copy()
    display.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
    display.save(output / f"{name}.webp", quality=88, method=6)
    depth_size = image.copy()
    depth_size.thumbnail((1024, 1024))
    depth.resize(depth_size.size, Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(0.5)).save(output / f"{name}.depth.png", optimize=True)
    thumbnail = image.copy()
    thumbnail.thumbnail((480, 480), Image.Resampling.LANCZOS)
    thumbnail.save(output / f"{name}.thumb.webp", quality=82, method=6)
    photos.append({"id": name, "source": f"/img/{name}.jpg", "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                   "image": f"/depth/{name}.webp", "depth": f"/depth/{name}.depth.png", "thumbnail": f"/depth/{name}.thumb.webp",
                   "width": display.width, "height": display.height})

manifest = {"model": MODEL, "revision": REVISION, "dtype": "q8", "depthConvention": "relative-inverse-depth-white-near",
            "purpose": "Illustrative photo sample. Images depict different properties; not a real listing or measured 3D scan.", "photos": photos}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("Saved four photo/depth pairs. Model weights remain outside the repository.", flush=True)
