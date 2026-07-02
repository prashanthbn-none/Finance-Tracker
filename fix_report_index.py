from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent
REPORTS = [
    ROOT / "RupeeFlow_Project_Report_Prashanth_BN.docx",
    ROOT / "RupeeFlow_Project_Report_Lochan_M.docx",
    ROOT / "RupeeFlow_Project_Report_Koushik_R.docx",
    ROOT / "RupeeFlow_Project_Report_Group.docx",
]


for path in REPORTS:
    document = Document(path)
    index = document.tables[0]
    for row in index.rows:
        title = row.cells[1].text.strip()
        if title == "SCREENSHOTS":
            row.cells[2].text = "48"
        elif title.startswith("11.1 Testing Approach"):
            row.cells[1].text = row.cells[1].text.replace("11.1", "12.1", 1)
        elif title.startswith("11.2 Sample Test Cases"):
            row.cells[1].text = row.cells[1].text.replace("11.2", "12.2", 1)
        elif title.startswith("11.3 Validation"):
            row.cells[1].text = row.cells[1].text.replace("11.3", "12.3", 1)
    document.save(path)
    print(path.name)
