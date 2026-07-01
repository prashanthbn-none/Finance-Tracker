from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


ROOT = Path(r"E:\Prashanth\finance-tracker v2")
BASE = ROOT / "PROJECT_REPORT_RupeeFlow_Academic_Final.docx"
SHOT_ROOT = ROOT / "report_screenshots"

REPORTS = [
    {
        "kind": "individual", "folder": "prashanth", "name": "Prashanth B N", "id": "U18ID23S0050",
        "output": ROOT / "RupeeFlow_Project_Report_Prashanth_BN.docx",
    },
    {
        "kind": "individual", "folder": "lochan", "name": "Lochan M", "id": "U18ID23S0035",
        "output": ROOT / "RupeeFlow_Project_Report_Lochan_M.docx",
    },
    {
        "kind": "individual", "folder": "koushik", "name": "Koushik R", "id": "U18ID23S0051",
        "output": ROOT / "RupeeFlow_Project_Report_Koushik_R.docx",
    },
    {
        "kind": "group", "folder": "prashanth",
        "members": [
            ("Prashanth B N", "U18ID23S0050"),
            ("Lochan M", "U18ID23S0035"),
            ("Koushik R", "U18ID23S0051"),
        ],
        "output": ROOT / "RupeeFlow_Project_Report_Group.docx",
    },
]

SHOTS = [
    ("dashboard.png", "Dashboard"),
    ("transactions.png", "Transaction Management"),
    ("budgets.png", "Budget Management"),
    ("goals.png", "Savings Goals"),
    ("reports.png", "Reports and Analytics"),
    ("profile.png", "Profile and INR Settings"),
]


def set_text(paragraph, text):
    if paragraph.runs:
        first = paragraph.runs[0]
        for run in paragraph.runs[1:]:
            run._element.getparent().remove(run._element)
        first.text = text
    else:
        paragraph.add_run(text)


def replace_all(doc, old, new):
    for paragraph in doc.paragraphs:
        if old in paragraph.text:
            set_text(paragraph, paragraph.text.replace(old, new))
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    if old in paragraph.text:
                        set_text(paragraph, paragraph.text.replace(old, new))


def find_para(doc, text):
    for paragraph in doc.paragraphs:
        if paragraph.text.strip() == text:
            return paragraph
    raise ValueError(text)


def normalize_readability(doc):
    """Use readable academic typography and remove wasteful body page breaks."""
    for style_name, size in (
        ("Normal", 11),
        ("No Spacing", 11),
        ("List Paragraph", 11),
        ("Heading 3", 11.5),
    ):
        style = doc.styles[style_name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        style.font.size = Pt(size)

    normal = doc.styles["Normal"].paragraph_format
    normal.line_spacing = 1.15
    normal.space_after = Pt(4)
    doc.styles["List Paragraph"].paragraph_format.line_spacing = 1.08

    # Front matter deliberately uses page breaks. Body chapters should flow
    # naturally, avoiding half-empty pages caused by forced chapter starts.
    for paragraph in doc.paragraphs[70:]:
        for br in paragraph._element.xpath('.//w:br[@w:type="page"]'):
            br.getparent().remove(br)

    # Tables need compact but readable type; preserve code samples separately.
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    paragraph.paragraph_format.line_spacing = 1.05
                    for run in paragraph.runs:
                        run.font.size = Pt(9.5)


def replace_screenshot_section(doc, folder, identity):
    start = find_para(doc, "12. SCREENSHOTS")
    end = find_para(doc, "13. ADVANTAGES, APPLICATIONS & CONCLUSION")
    node = start._element.getnext()
    while node is not None and node is not end._element:
        nxt = node.getnext()
        node.getparent().remove(node)
        node = nxt

    intro = end.insert_paragraph_before(
        "The following screenshots show the completed RupeeFlow application using representative demonstration data."
    )
    intro.style = doc.styles["Normal"]

    for index, (filename, label) in enumerate(SHOTS, 1):
        caption = end.insert_paragraph_before()
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption.paragraph_format.space_before = Pt(4)
        caption.paragraph_format.space_after = Pt(3)
        run = caption.add_run(f"Figure 12.{index}: {identity} - {label}")
        run.bold = True
        run.font.size = Pt(10)

        image_p = end.insert_paragraph_before()
        image_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        image_p.paragraph_format.space_after = Pt(5)
        image_p.add_run().add_picture(str(SHOT_ROOT / folder / filename), width=Inches(6.15))
        if index in (2, 4):
            image_p.add_run().add_break(WD_BREAK.PAGE)


for spec in REPORTS:
    doc = Document(BASE)
    normalize_readability(doc)
    if spec["kind"] == "individual":
        replace_all(doc, "Prashanth B N", spec["name"])
        replace_all(doc, "PRASHANTH B N", spec["name"].upper())
        replace_all(doc, "U18ID23S0050", spec["id"])
        replace_all(doc, "U18ID23S0050", spec["id"])
        identity = f'{spec["name"]} ({spec["id"]})'
        doc.core_properties.title = f'RupeeFlow Finance Tracker - {spec["name"]} Project Report'
    else:
        members = spec["members"]
        names = "\n".join(name for name, _ in members)
        ids = "\n".join(identifier for _, identifier in members)
        set_text(doc.paragraphs[14], names)
        set_text(doc.paragraphs[15], ids)
        doc.paragraphs[14].alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.paragraphs[15].alignment = WD_ALIGN_PARAGRAPH.CENTER
        # College identity already appears at top of cover. Removing repeated
        # footer lines keeps all three students on page 1 without shrinking type.
        for index in (17, 16):
            element = doc.paragraphs[index]._element
            element.getparent().remove(element)
        find_para(doc, "CERTIFICATE").paragraph_format.page_break_before = False
        declaration_date = next(p for p in doc.paragraphs if p.text.strip().startswith("Date:") and "Prashanth B N" in p.text)
        declaration_place = next(p for p in doc.paragraphs if p.text.strip().startswith("Place: Bangalore") and "U18ID23S0050" in p.text)
        set_text(declaration_date, "Date:")
        set_text(declaration_place, "Place: Bangalore\n\nTeam Members:\nPrashanth B N - U18ID23S0050\nLochan M - U18ID23S0035\nKoushik R - U18ID23S0051")
        declaration_date.alignment = WD_ALIGN_PARAGRAPH.LEFT
        declaration_place.alignment = WD_ALIGN_PARAGRAPH.LEFT

        # Heading 1 already starts Abstract on a new page; remove duplicate
        # manual break immediately before it to avoid an empty page.
        abstract = find_para(doc, "ABSTRACT")
        previous = abstract._element.getprevious()
        if previous is not None:
            for br in previous.xpath('.//w:br[@w:type="page"]'):
                br.getparent().remove(br)

        roster_inline = ", ".join(f"{name} [{identifier}]" for name, identifier in members)
        for paragraph in doc.paragraphs:
            if "Certified that the project work entitled" in paragraph.text:
                set_text(paragraph, f"Certified that the project work entitled “RupeeFlow Finance Tracker” is bonafide work carried out by {roster_inline} in partial fulfilment for the award of the Degree of Bachelor of Computer Applications of Bengaluru City University during the year 2025-26. The project report has been approved as it satisfies the academic requirements prescribed for the project work.")
            elif paragraph.text.startswith("I hereby declare"):
                set_text(paragraph, paragraph.text.replace("I hereby declare", "We hereby declare").replace("my own work", "our own work"))
            elif paragraph.text.startswith("is an authentic record of my own work"):
                set_text(paragraph, paragraph.text.replace("my own work", "our own work"))
            elif paragraph.text.strip().startswith("Date: Prashanth B N"):
                set_text(paragraph, "Date:\n" + "\n".join(name for name, _ in members))
            elif paragraph.text.strip().startswith("Place: Bangalore U18ID23S0050"):
                set_text(paragraph, "Place: Bangalore\n" + "\n".join(identifier for _, identifier in members))
            elif paragraph.text.strip() == "Prashanth B N":
                element = paragraph._element
                element.getparent().remove(element)
        replace_all(doc, "my effort", "our effort")
        replace_all(doc, "I express", "We express")
        replace_all(doc, "my sincere", "our sincere")
        replace_all(doc, "providing me", "providing us")
        replace_all(doc, "I am deeply thankful", "We are deeply thankful")
        replace_all(doc, "I extend", "We extend")
        replace_all(doc, "my heartfelt", "our heartfelt")
        replace_all(doc, "encouraged me", "encouraged us")
        replace_all(doc, "I would like", "We would like")
        replace_all(doc, "my friends", "our friends")
        replace_all(doc, "my respected", "our respected")
        replace_all(doc, "my guide", "our guide")
        replace_all(doc, "my parents", "our parents")
        replace_all(doc, "helped me", "helped us")
        replace_all(doc, "throughout the completion of this project", "throughout completion of this group project")
        identity = "Group Project Demonstration - Logged in as Prashanth B N"
        doc.core_properties.title = "RupeeFlow Finance Tracker - Group Project Report"

    replace_screenshot_section(doc, spec["folder"], identity)
    while doc.paragraphs and not doc.paragraphs[-1].text.strip():
        element = doc.paragraphs[-1]._element
        element.getparent().remove(element)
    try:
        doc.save(spec["output"])
        print(spec["output"])
    except PermissionError:
        fallback = spec["output"].with_name(spec["output"].stem + "_Fixed.docx")
        doc.save(fallback)
        print(fallback)
