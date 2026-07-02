from pathlib import Path

from PIL import Image, ImageDraw


folder = Path(r"E:\Prashanth\finance-tracker v2\tmp\report-final-render")
pages = sorted(folder.glob("page-*.png"), key=lambda path: int(path.stem.split("-")[-1]))
for start in range(0, len(pages), 10):
    batch = pages[start:start + 10]
    sheet = Image.new("RGB", (1638, 886), "#d9dde5")
    draw = ImageDraw.Draw(sheet)
    for offset, path in enumerate(batch):
        image = Image.open(path).convert("RGB")
        image.thumbnail((306, 396))
        x = 18 + (offset % 5) * 324
        y = 18 + (offset // 5) * 438
        draw.text((x, y), f"Page {start + offset + 1}", fill="#111827")
        sheet.paste(image, (x, y + 26))
    sheet.save(folder / f"contact-{start + 1:02d}-{start + len(batch):02d}.png")
