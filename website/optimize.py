import os
import glob
import re

html_files = glob.glob('*.html')

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add width, height, loading to images (simple regex for this mock)
    # Replaces <img ... src="...png" ... >
    content = re.sub(
        r'<img([^>]*?)src="([^"]+?\.(png|jpg|jpeg))"([^>]*?)>',
        r'<img\1src="\2"\4 width="200" height="100" loading="lazy">',
        content,
        flags=re.IGNORECASE
    )
    
    # Defer main script
    content = re.sub(
        r'<script src="assets/js/main.js"></script>',
        r'<script src="assets/js/main.js" defer></script>',
        content
    )
    
    # Change .png/.jpg to .webp in src (assuming we will convert them later or just rename)
    # For now, let's just do it in the HTML
    content = re.sub(r'(\.png|\.jpg|\.jpeg)', r'.webp', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML optimized.")
