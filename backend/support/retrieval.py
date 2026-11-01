
"""Local semantic retrieval for workspace knowledge articles."""

import re
import numpy as np
from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_embedding_model = None


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = SentenceTransformer(MODEL_NAME)

    return _embedding_model


def split_into_chunks(text, chunk_size=180, overlap=35):
    """Split text into overlapping word-based chunks."""
    words = text.split()

    if not words:
        return []

    chunks = []
    step = max(1, chunk_size - overlap)

    for start in range(0, len(words), step):
        chunk = " ".join(words[start:start + chunk_size])

        if chunk:
            chunks.append(chunk)

        if start + chunk_size >= len(words):
            break

    return chunks


def retrieve_knowledge(query, articles, top_k=3, threshold=0.30):
    """
    Return the most relevant article chunks.

    Articles must already be filtered to the user's workspace.
    Similarity is a retrieval score, not a probability of correctness.
    """
    documents = []

    for article in articles:
        title = article.title or ""
        content = article.content or ""

        for chunk in split_into_chunks(content):
            documents.append({
                "title": title,
                "content": chunk,
                "article_id": article.pk,
            })

    if not documents or not query.strip():
        return []

    model = get_embedding_model()

    query_vector = model.encode(
        [query],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )[0]

    document_vectors = model.encode(
        [
            f"{doc['title']}. {doc['content']}"
            for doc in documents
        ],
        normalize_embeddings=True,
        convert_to_numpy=True,
        batch_size=32,
        show_progress_bar=False,
    )

    scores = np.dot(document_vectors, query_vector)
    best_indices = np.argsort(scores)[::-1][:top_k]

    results = []

    for index in best_indices:
        score = float(scores[index])

        if score < threshold:
            continue

        result = documents[int(index)].copy()
        result["score"] = round(score, 4)
        results.append(result)

    return results
