import logging
import re
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SupportrootAI/1.0"
)


def scrape_website_content(url: str, max_chars: int = 25000) -> dict:
    """
    Scrape and extract clean text from a web page using BeautifulSoup.
    Returns a dict with 'title', 'content', 'size_label', and 'success'.
    """
    if not url:
        return {"success": False, "error": "No URL provided"}

    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = f"https://{clean_url}"

    try:
        response = requests.get(
            clean_url,
            headers={"User-Agent": USER_AGENT},
            timeout=(5, 15),
            allow_redirects=True,
        )
        response.raise_for_status()
    except Exception as e:
        logger.warning(f"Failed to fetch {clean_url}: {e}")
        return {
            "success": False,
            "error": f"Failed to fetch website: {str(e)}",
            "title": clean_url,
            "content": f"Could not fetch website content from {clean_url}. Error: {e}",
            "size_label": "0 KB",
        }

    try:
        soup = BeautifulSoup(response.text, "html.parser")

        # Remove irrelevant / non-content tags
        for tag in soup(["script", "style", "noscript", "svg", "iframe", "footer", "nav", "header"]):
            tag.decompose()

        # Extract title
        page_title = ""
        if soup.title and soup.title.string:
            page_title = soup.title.string.strip()
        elif soup.find("h1"):
            page_title = soup.find("h1").get_text(strip=True)
        if not page_title:
            page_title = clean_url.replace("https://", "").replace("http://", "").split("/")[0]

        # Extract meta description if available
        meta_desc = ""
        desc_tag = soup.find("meta", attrs={"name": re.compile(r"description", re.I)})
        if desc_tag and desc_tag.get("content"):
            meta_desc = desc_tag.get("content").strip()

        # Extract body text chunks
        chunks = []
        if meta_desc:
            chunks.append(f"Overview: {meta_desc}")

        # Gather paragraphs, headings, list items
        main_content = soup.find("main") or soup.find("article") or soup.find("body") or soup
        for element in main_content.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
            text = element.get_text(separator=" ", strip=True)
            if len(text) > 20:
                chunks.append(text)

        extracted_text = "\n\n".join(chunks)

        # Fallback to get_text if structured extraction returned very little
        if len(extracted_text) < 100:
            extracted_text = soup.get_text(separator=" ", strip=True)
            extracted_text = re.sub(r"\s+", " ", extracted_text)

        # Truncate if excessively long
        if len(extracted_text) > max_chars:
            extracted_text = extracted_text[:max_chars] + "\n\n[Content truncated]"

        size_kb = max(1, len(extracted_text) // 1024)

        return {
            "success": True,
            "title": page_title[:250],
            "content": extracted_text,
            "size_label": f"{size_kb} KB",
        }
    except Exception as e:
        logger.exception(f"Error parsing HTML from {clean_url}: {e}")
        return {
            "success": False,
            "error": f"Failed to parse website: {str(e)}",
            "title": clean_url,
            "content": f"Failed to parse content from {clean_url}.",
            "size_label": "0 KB",
        }
