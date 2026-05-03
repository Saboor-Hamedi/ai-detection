import fitz
import re

class PDFManager:
    """
    Industrial PDF Manager: Handles coordinate-aware text extraction.
    Upgraded to Per-Word Precision to eliminate all whitespace leakage.
    """
    def extract_with_coordinates(self, pdf_content):
        doc = fitz.open(stream=pdf_content, filetype="pdf")
        full_text = ""
        pages_data = []

        for page_num, page in enumerate(doc):
            # UPGRADE: Using 'words' extraction for 100% whitespace-free coordinates
            # Each word is a tuple: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
            words_raw = page.get_text("words")
            
            page_elements = []
            page_text = ""
            
            # Temporary storage to rebuild sentences for the editor
            current_line = -1
            
            for w in words_raw:
                x0, y0, x1, y1, word_text, b_no, l_no, w_no = w
                
                clean_text = word_text.strip()
                if not clean_text or not re.search(r'[a-zA-Z0-9]', clean_text):
                    continue

                # Add each word as a tight forensic element
                page_elements.append({
                    "text": clean_text,
                    "bbox": [x0, y0, x1, y1], # Absolute tight word box
                    "ai_probability": 0
                })

                # Reconstruct text for the editor
                if l_no != current_line:
                    page_text += "\n"
                    current_line = l_no
                page_text += clean_text + " "

            full_text += f"\n--- PAGE {page_num + 1} ---\n\n" + page_text
            pages_data.append({
                "page": page_num + 1,
                "elements": page_elements
            })

        return full_text, pages_data

pdf_manager = PDFManager()
