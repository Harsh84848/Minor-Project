
"""CloudForge AI agent orchestration."""

from .retrieval import retrieve_knowledge
from .ai import generate_agent_response


def run_support_agent(*, query, articles, history=None):
    """Retrieve evidence and generate a grounded support response."""

    chunks = retrieve_knowledge(
        query=query,
        articles=articles,
        top_k=3,
    )

    result = generate_agent_response(
        query=query,
        retrieved_chunks=chunks,
        history=history,
    )

    result["retrieved_sources"] = [
        {
            "title": item["title"],
            "article_id": item["article_id"],
            "score": item["score"],
        }
        for item in chunks
    ]

    return result
