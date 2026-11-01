"""Local language model integration using Ollama (qwen2.5:3b / qwen2.5-coder:3b)."""

import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

OLLAMA_URL = getattr(
    settings,
    "OLLAMA_URL",
    "http://127.0.0.1:11434",
)

PREFERRED_MODELS = ["qwen2.5:3b", "qwen2.5-coder:3b"]


def get_available_ollama_model() -> str:
    """Detect available model dynamically, preferring qwen2.5:3b or qwen2.5-coder:3b."""
    try:
        r = requests.get(f"{OLLAMA_URL.rstrip('/')}/api/tags", timeout=2)
        if r.status_code == 200:
            installed = [m.get("name", "") for m in r.json().get("models", [])]
            for pref in PREFERRED_MODELS:
                for inst in installed:
                    if pref in inst:
                        return inst
            if installed:
                return installed[0]
    except Exception as e:
        logger.debug(f"Could not reach Ollama tags: {e}")

    return getattr(settings, "OLLAMA_MODEL", "qwen2.5:3b")


def fallback_grounded_response(query: str, retrieved_chunks: list) -> dict:
    """Safe fallback when Ollama is unreachable or busy."""
    if not retrieved_chunks:
        # Check if greeting
        lower = query.lower().strip()
        if any(w in lower for w in ["hi", "hello", "hey", "good morning", "good evening", "help"]):
            return {
                "answer": (
                    "Hello! I'm your Supportroot AI assistant. How can I help you today? "
                    "You can ask me questions about our refund policy, shipping, pricing, or product FAQs."
                ),
                "confidence": 0.9,
                "source": None,
                "needs_human": False,
            }
        return {
            "answer": (
                "I couldn't find enough matching information in your knowledge base to answer that query. "
                "Would you like me to connect you with our support team or create a ticket?"
            ),
            "confidence": 0.2,
            "source": None,
            "needs_human": True,
        }

    top = retrieved_chunks[0]
    title = top.get("title", "Knowledge Base")
    snippet = top.get("content", "").strip()
    if len(snippet) > 350:
        snippet = snippet[:350].rsplit(" ", 1)[0] + "..."

    return {
        "answer": f"According to our **{title}**:\n\n{snippet}",
        "confidence": round(float(top.get("score", 0.7)), 2),
        "source": title,
        "needs_human": False,
    }


def generate_agent_response(query: str, retrieved_chunks: list, history: list = None) -> dict:
    """Generate a grounded answer from retrieved knowledge using Ollama."""
    active_model = get_available_ollama_model()

    evidence = "\n\n".join(
        (
            f"[Source: {item['title']}]\n"
            f"{item['content']}"
        )
        for item in retrieved_chunks
    )

    system_prompt = """You are Supportroot AI, an intelligent, helpful, professional customer support assistant.

Instructions:
1. When Knowledge-Base Evidence is provided, answer accurately using the evidence.
2. If the user is greeting (e.g., 'hi', 'hello', 'who are you', 'how are you'), respond politely, introduce yourself as Supportroot AI, and invite them to ask support questions.
3. If the evidence does not contain the answer, politely state that you could not verify this from the company's knowledge base and offer to create a support ticket.
4. Keep answers clear, direct, and concise.
5. Return ONLY a valid JSON object with EXACTLY these three keys:
   {
     "answer": "string containing your reply",
     "supported": true or false,
     "source": "Title of the cited source or null"
   }
"""

    if evidence:
        user_prompt = f"""CUSTOMER QUESTION:
{query}

KNOWLEDGE-BASE EVIDENCE:
{evidence}

Return JSON only."""
    else:
        user_prompt = f"""CUSTOMER QUESTION:
{query}

(No specific knowledge-base articles matched this query. If greeting, respond warmly. If asking a specific policy question not in knowledge base, indicate you don't have that information.)

Return JSON only."""

    messages = [{"role": "system", "content": system_prompt}]

    for item in (history or [])[-6:]:
        if item.get("role") in ("user", "assistant"):
            messages.append({
                "role": item["role"],
                "content": item["content"][:1200],
            })

    messages.append({"role": "user", "content": user_prompt})

    try:
        response = requests.post(
            f"{OLLAMA_URL.rstrip('/')}/api/chat",
            json={
                "model": active_model,
                "messages": messages,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2,
                },
            },
            timeout=(4, 60),
        )
        response.raise_for_status()

        raw = response.json()["message"]["content"]
        parsed = json.loads(raw)

        answer = parsed.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("Ollama returned empty answer string.")

        supported = parsed.get("supported") is True
        source = parsed.get("source")

        if not retrieved_chunks:
            return {
                "answer": answer.strip(),
                "confidence": 0.85 if supported else 0.4,
                "source": None,
                "needs_human": not supported and ("ticket" in answer.lower() or "support team" in answer.lower()),
            }

        valid_titles = {item["title"] for item in retrieved_chunks}
        if source not in valid_titles:
            source = retrieved_chunks[0]["title"]

        top_score = retrieved_chunks[0]["score"]

        return {
            "answer": answer.strip(),
            "confidence": round(min(0.98, max(0.55, top_score)), 2),
            "source": source,
            "needs_human": False,
        }

    except Exception as e:
        logger.warning(f"Ollama call failed or timed out: {e}. Using grounded fallback.")
        return fallback_grounded_response(query, retrieved_chunks)
