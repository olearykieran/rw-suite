#!/usr/bin/env python3
import sys
import pdfplumber
import os

def main():
    if len(sys.argv) < 2:
        print("Error: No PDF file provided", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    print(f"Processing PDF: {pdf_path}", file=sys.stderr)
    print(f"File exists: {os.path.exists(pdf_path)}", file=sys.stderr)

    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
            print(text.strip())
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()