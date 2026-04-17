import glob
import re

for file in glob.glob("*.html"):
    with open(file, "r") as f:
        content = f.read()

    # Match the entire li block containing Boka tid in the header
    content = re.sub(r'\s*<li><a href="/kontakt\.html"[^>]*>Boka tid</a></li>', '', content)

    with open(file, "w") as f:
        f.write(content)
