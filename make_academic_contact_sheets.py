from pathlib import Path
from PIL import Image, ImageDraw

root = Path(r"E:\Prashanth\finance-tracker v2\qa_report_academic")
pages = sorted(root.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
for group, start in enumerate(range(0, len(pages), 10), 1):
    chosen = pages[start:start + 10]
    thumbs = []
    for path in chosen:
        image = Image.open(path).convert("RGB")
        image.thumbnail((330, 430))
        thumbs.append((path, image.copy()))
    sheet = Image.new("RGB", (5 * 350, 2 * 465), "#d8d8d8")
    draw = ImageDraw.Draw(sheet)
    for i, (path, image) in enumerate(thumbs):
        x = (i % 5) * 350 + 10
        y = (i // 5) * 465 + 25
        sheet.paste(image, (x, y))
        draw.text((x, 5 + (i // 5) * 465), path.stem, fill="black")
    sheet.save(root / f"contact-{group}.png")
print(len(pages))
