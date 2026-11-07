"""Precompute relative depth for the Hong Kong 3D scenes on this computer, never on a visitor's phone.

Uses the same pinned Depth Anything V2 small weights and external dependency cache as
scripts/create-depth-maps.py:
  uv pip install --target "$env:LOCALAPPDATA/EucoveDepth/python" onnxruntime==1.21.0 Pillow numpy
  python scripts/create-hk-depth-maps.py
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile

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
if not weights.exists() or hashlib.sha256(weights.read_bytes()).hexdigest() != MODEL_SHA256:
    raise RuntimeError("Run scripts/create-depth-maps.py once to download the pinned model weights")

session = ort.InferenceSession(str(weights), providers=["CPUExecutionProvider"])
source_dir = ROOT / "public/img/hk"
output = ROOT / "public/depth/hk"
output.mkdir(parents=True, exist_ok=True)
mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
SCENES = ["harbour-night", "hk-island", "kowloon", "new-territories", "islands"]
photos = []
for name in SCENES:
    source = source_dir / f"{name}.webp"
    print("Estimating:", name, flush=True)
    image = Image.open(source).convert("RGB")
    # Short side 644 keeps tower edges sharper than 518 for wide skylines; sides divisible by 14.
    scale = 644 / min(image.size)
    size = tuple(max(14, round(d * scale / 14) * 14) for d in image.size)
    pixels = np.asarray(image.resize(size, Image.Resampling.BICUBIC), dtype=np.float32) / 255
    tensor = np.ascontiguousarray(((pixels - mean) / std).transpose(2, 0, 1)[None])
    predicted = session.run(None, {session.get_inputs()[0].name: tensor})[0].squeeze()
    # Relative inverse depth: white = near, black = far. Clip outliers so one near railing does not flatten the city.
    low, high = np.percentile(predicted, [1, 99.5])
    values = np.clip((predicted - low) / max(float(high - low), 1e-6), 0, 1)
    depth = Image.fromarray(np.uint8(values * 255))
    display = image.copy()
    display.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    display.save(output / f"{name}.webp", quality=84, method=6)
    depth_size = image.copy()
    depth_size.thumbnail((640, 640))
    depth.resize(depth_size.size, Image.Resampling.BICUBIC).save(output / f"{name}.depth.png", optimize=True)
    photos.append({"id": name, "source": f"/img/hk/{name}.webp", "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                   "image": f"/depth/hk/{name}.webp", "depth": f"/depth/hk/{name}.depth.png",
                   "width": display.width, "height": display.height})

manifest = {"model": MODEL, "revision": REVISION, "dtype": "q8", "depthConvention": "relative-inverse-depth-white-near",
            "purpose": "Illustrative 3D relief generated from licensed Hong Kong photographs (see /credits). Not a measured scan.", "photos": photos}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Saved {len(photos)} photo/depth pairs.", flush=True)
