"""Make small thumbnail copies of the selected internal room frames; never copy to public/."""
from pathlib import Path
import json
import sys
from PIL import Image

root = Path(__file__).resolve().parent.parent / "data/viewing-source"
files = [Path(sys.argv[1]).resolve()] if len(sys.argv) > 1 else root.glob("reference-*/manifest.json")
for file in files:
    if not file.is_relative_to(root):
        raise RuntimeError("Thumbnail source must stay in private viewing data")
    directory = file.parent
    if not file.exists():
        continue
    manifest = json.loads(file.read_text(encoding="utf-8"))
    if manifest.get("publicReuseApproved") is not False:
        raise RuntimeError("Review the internal-use gate before processing")
    for room in manifest["rooms"]:
        image = Image.open(directory / room["file"]).convert("RGB")
        image.thumbnail((420, 420), Image.Resampling.LANCZOS)
        image.save(directory / room["thumbnailFile"], "JPEG", quality=78, optimize=True)
        print(manifest["id"], room["thumbnailFile"], image.size)
