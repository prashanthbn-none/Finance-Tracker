from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn


SOURCE = Path(r"E:\Prashanth\finance-tracker v2\PROJECT_REPORT_RupeeFlow_Final.docx")
OUTPUT = Path(r"E:\Prashanth\finance-tracker v2\PROJECT_REPORT_RupeeFlow_Academic_Final.docx")


def set_text(paragraph, text):
    if paragraph.runs:
        first = paragraph.runs[0]
        for run in paragraph.runs[1:]:
            run._element.getparent().remove(run._element)
        first.text = text
    else:
        paragraph.add_run(text)


def replace_once(document, old, new):
    for paragraph in document.paragraphs:
        if old in paragraph.text:
            set_text(paragraph, paragraph.text.replace(old, new))
            return True
    raise ValueError(f"Text not found: {old}")


doc = Document(SOURCE)

# Front matter aligned to supplied college report.
set_text(doc.paragraphs[9], "HEAD OF THE DEPARTMENT")
set_text(doc.paragraphs[10], "Mr. Shashidhar S B")
set_text(doc.paragraphs[11], "Under the guidance of\nMr. Madhusudan Reddy C")
for idx in (9, 10, 11):
    doc.paragraphs[idx].alignment = WD_ALIGN_PARAGRAPH.CENTER

set_text(
    doc.paragraphs[27],
    "(Mr. Madhusudan Reddy C)                                  (Mr. Shashidhar S B)\n"
    "Signature of the Guide                                      Head of the Department",
)
doc.paragraphs[27].alignment = WD_ALIGN_PARAGRAPH.CENTER

replace_once(
    doc,
    "I am deeply thankful to my guide, o our respectful HOD, Mr. Shashidhar S.B and, for the consistent supervision",
    "I am deeply thankful to my guide, Mr. Madhusudan Reddy C, and our respected HOD, Mr. Shashidhar S B, for their consistent supervision",
)

# Current functional and module coverage.
replace_once(
    doc,
    "The system shall allow the user to categorize each transaction.",
    "The system shall allow the user to categorize each transaction and create new income or expense categories from transaction, recurring-rule, and budget forms. Custom category names shall reject blank and duplicate values and remain saved per user.",
)
replace_once(
    doc,
    "The system shall allow exporting reports and printing them to PDF.",
    "The system shall allow exporting reports to CSV and Excel and printing a styled report to PDF through a dedicated print document that waits for styles, fonts, and charts before opening the print dialog.",
)
replace_once(
    doc,
    "All amounts are formatted in INR, and duplicate entries are blocked.",
    "All amounts are formatted in INR, duplicate entries are blocked, and users can add reusable custom income categories when the predefined list is insufficient.",
)
replace_once(
    doc,
    "Monthly and all-time totals update immediately, and duplicate entries are blocked.",
    "Monthly and all-time totals update immediately, duplicate entries are blocked, and users can add reusable custom expense categories for practical personal needs.",
)
replace_once(
    doc,
    "Reports can be exported to CSV and Excel, or printed to PDF, making them suitable for record-keeping and sharing.",
    "Reports can be exported to CSV and Excel or printed to PDF. Printing uses an isolated, fully styled document and waits for content to load, preventing blank print previews and making reports suitable for record-keeping and sharing.",
)
replace_once(
    doc,
    "Data-entry dialogs use transparent overlays, responsive widths, wrapping action rows, page-level scrolling, and unclipped controls so every field and submit button remains reachable on smaller screens.",
    "Data-entry dialogs are rendered directly under the document body through a React portal. They use transparent overlays, viewport-aware height, fixed headers, internal scrolling, responsive widths, and wrapping actions so fields and submit buttons remain reachable without clipping on smaller screens.",
)
replace_once(
    doc,
    "Transactions are organized using a predefined set of categories. Income and expenses each have their own category list, which keeps reporting meaningful and consistent.",
    "Transactions begin with separate predefined income and expense category lists. Users may add custom categories from relevant forms; these are stored per user as customCategories metadata and become available in transactions, recurring rules, budgets, filters, and reports. Blank and case-insensitive duplicate names are rejected.",
)
replace_once(
    doc,
    "Core methods: list(), write(), getMeta(), setMeta().",
    "Core methods: list(), write(), getMeta(), setMeta(). Per-user metadata includes dismissed alerts and custom category lists.",
)
replace_once(
    doc,
    "Validation is applied throughout the application. Amounts must be positive, required categories and dates must be supplied, unsupported statement rows are skipped, and duplicate fingerprints are rejected.",
    "Validation is applied throughout the application. Amounts must be positive, required categories and dates must be supplied, custom category names must be non-empty and unique, unsupported statement rows are skipped, and duplicate fingerprints are rejected.",
)
replace_once(
    doc,
    "Application routes for dashboard, transactions, budgets, goals, recurring rules, reports, and profile returned successfully through the development server.",
    "Application routes for dashboard, transactions, budgets, goals, recurring rules, reports, and profile returned successfully through the development server. Custom-category persistence, viewport-safe modal rendering, and nonblank report printing were also checked after final UI fixes.",
)
replace_once(
    doc,
    "Add OCR for scanned bank statements, broader bank-format templates, receipt scanning, and optional consent-based bank integrations.",
    "Add OCR for scanned bank statements and bank-specific parsers for major Indian banks such as SBI, HDFC, ICICI, Axis, Canara, Kotak, PNB, Bank of Baroda, and Union Bank. Add format detection, import confidence review, receipt scanning, and optional consent-based bank integrations. Universal accuracy cannot be guaranteed because statement layouts vary and change.",
)

# Module table: add explicit current module absent from older report.
module_table = doc.tables[1]
row = module_table.add_row()
row.cells[0].text = "Custom Category Management"
row.cells[1].text = "Creates and persists per-user income and expense categories, prevents blank or duplicate names, and shares them across transaction, recurring, and budget forms."
for cell in row.cells:
    for paragraph in cell.paragraphs:
        paragraph.style = doc.styles["Normal"]

# Repeat table header and preserve table width behavior.
for table in doc.tables:
    if table.rows:
        tr_pr = table.rows[0]._tr.get_or_add_trPr()
        header = tr_pr.find(qn("w:tblHeader"))
        if header is None:
            tr_pr.append(doc._element.body._new_tbl()._new_tr().get_or_add_trPr()) if False else None
            from docx.oxml import OxmlElement
            marker = OxmlElement("w:tblHeader")
            marker.set(qn("w:val"), "true")
            tr_pr.append(marker)

doc.core_properties.title = "RupeeFlow Finance Tracker - Academic Project Report"
doc.core_properties.subject = "BCA VI Semester Project Report"

# Remove trailing empty paragraphs that otherwise create a blank final page.
while doc.paragraphs and not doc.paragraphs[-1].text.strip():
    paragraph = doc.paragraphs[-1]._element
    paragraph.getparent().remove(paragraph)

doc.save(OUTPUT)
print(OUTPUT)
