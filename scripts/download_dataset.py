"""Download the user-selected public Kaggle dataset; no credentials embedded."""
from pathlib import Path
import hashlib
import io
import json
import urllib.request
import zipfile

root = Path(__file__).resolve().parents[1] / "backend/data"
root.mkdir(exist_ok=True)
url = "https://www.kaggle.com/api/v1/datasets/download/nguyentiennhan/vietnam-housing-dataset-2024"
with urllib.request.urlopen(url, timeout=120) as response:
    archive = response.read(30 * 1024 * 1024)
with zipfile.ZipFile(io.BytesIO(archive)) as z:
    name = next(n for n in z.namelist() if Path(n).name == "vietnam_housing_dataset.csv")
    if z.getinfo(name).file_size > 50 * 1024 * 1024:
        raise ValueError("Dataset larger than expected; inspect before importing.")
    data = z.read(name)
(root / "vietnam_housing_dataset.csv").write_bytes(data)
(root / "provenance.json").write_text(json.dumps({
    "source": "https://www.kaggle.com/datasets/nguyentiennhan/vietnam-housing-dataset-2024",
    "notebook": "https://www.kaggle.com/code/tranngocthienngan/house-price-prediction-dataset-vietnam-2024",
    "file": "vietnam_housing_dataset.csv", "sha256": hashlib.sha256(data).hexdigest()
}, indent=2), encoding="utf-8")
print("Downloaded CSV to", root)
