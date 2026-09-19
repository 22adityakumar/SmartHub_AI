import pymupdf
import re
from typing import List, Dict, Any

def clean_text(text: str) -> str:
    # Standardize line endings to \n
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Strip spaces from each line
    lines = [line.strip() for line in text.split('\n')]
    # Remove redundant empty lines (keep at most one contiguous empty line)
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if line == '':
            if not prev_empty:
                cleaned_lines.append('')
                prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
    return '\n'.join(cleaned_lines).strip()

def split_text_into_chunks(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
    chunks = []
    if not text:
        return chunks
        
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        # If we reached the end of the text, break
        if end >= len(text):
            break
        start += (chunk_size - overlap)
    return chunks

def parse_pdf(file_path: str, filename: str) -> List[Dict[str, Any]]:
    chunks = []
    try:
        doc = pymupdf.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            cleaned = clean_text(text)
            
            if not cleaned:
                continue
                
            # Split page text if it exceeds chunk_size
            page_chunks = split_text_into_chunks(cleaned, chunk_size=800, overlap=100)
            
            for chunk_idx, chunk_text in enumerate(page_chunks):
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "filename": filename,
                        "page": page_num + 1,  # 1-indexed for users
                        "chunk_index": chunk_idx
                    }
                })
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        
    return chunks

def parse_txt(file_path: str, filename: str) -> List[Dict[str, Any]]:
    chunks = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        cleaned = clean_text(text)
        txt_chunks = split_text_into_chunks(cleaned, chunk_size=800, overlap=100)
        for idx, chunk_text in enumerate(txt_chunks):
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "filename": filename,
                    "page": 1,  # text file has no pages, mark as 1
                    "chunk_index": idx
                }
            })
    except Exception as e:
        print(f"Error parsing text file {file_path}: {e}")
    return chunks

def parse_document(file_path: str, filename: str) -> List[Dict[str, Any]]:
    if file_path.lower().endswith(".pdf"):
        return parse_pdf(file_path, filename)
    else:
        return parse_txt(file_path, filename)
