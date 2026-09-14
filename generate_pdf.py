import markdown
from fpdf import FPDF, HTMLMixin

class PDF(FPDF, HTMLMixin):
    pass

with open("report.md", "r", encoding="utf-8") as f:
    md_text = f.read()

# Convert markdown to HTML
html_text = markdown.markdown(md_text)

# Create PDF
pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.set_font("Helvetica", size=12)

# Write HTML to PDF
pdf.write_html(html_text)

pdf.output("report.pdf")
print("PDF generated successfully using fpdf2 and markdown.")
