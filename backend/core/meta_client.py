"""Meta Llama API client for ASK with an offline academic fallback.

Set META_API_KEY to call the live Meta Llama chat-completions endpoint.
Without a key the module answers from a small built-in study guide so the
demo works fully offline. Every answer records which provider served it.
"""
import re
import time

from django.conf import settings

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

SUBJECT_HINTS = {
    "Mathematics": ["math", "algebra", "trigon", "probab", "calcul", "equation", "geometry", "matrix", "discriminant"],
    "Physics": ["physic", "newton", "optics", "lens", "current", "force", "motion", "refraction", "quantum"],
    "Chemistry": ["chem", "mole", "atom", "reaction", "acid", "periodic", "bond"],
    "Biology": ["bio", "cell", "photo", "genetic", "organ", "tissue", "evolution"],
    "English": ["essay", "grammar", "paragraph", "letter", "poem", "tenses", "writing"],
}

FALLBACK_GUIDE = [
    ("discriminant", "Mathematics",
     "For ax²+bx+c=0 the discriminant is D=b²−4ac. D>0 → two real roots, D=0 → one repeated root, "
     "D<0 → no real roots. Example: x²−5x+6=0 gives D=25−24=1, roots x=(5±1)/2 → 2 and 3."),
    ("lens", "Physics",
     "Lens formula: 1/f = 1/v − 1/u (Cartesian sign convention). Convex lens: f positive. "
     "Example: object at u=−20cm, f=+10cm → 1/v=1/10−1/20=1/20 → v=+20cm, real inverted image."),
    ("mole", "Chemistry",
     "1 mole = 6.022×10²³ particles. Moles = given mass / molar mass. "
     "Example: 18g of H₂O (M=18) = 1 mole = 6.022×10²³ molecules."),
    ("photosynthesis", "Biology",
     "6CO₂+6H₂O →(light, chlorophyll) C₆H₁₂O₆+6O₂. Light reactions in thylakoids make ATP/NADPH; "
     "Calvin cycle in stroma fixes CO₂ into glucose."),
    ("trigonometry", "Mathematics",
     "Core identities: sin²θ+cos²θ=1, 1+tan²θ=sec²θ, 1+cot²θ=csc²θ. "
     "Tip: convert everything to sin/cos first when you are stuck."),
]


def guess_subject(question):
    q = question.lower()
    for subject, keys in SUBJECT_HINTS.items():
        if any(k in q for k in keys):
            return subject
    return "General"


def _offline_answer(question):
    q = question.lower()
    for key, subject, text in FALLBACK_GUIDE:
        if key in q:
            return text, subject
    subject = guess_subject(question)
    return (f"Here is how to approach this ({subject}): 1) restate what is given and what is asked, "
            f"2) pick the governing formula or rule, 3) substitute step by step, 4) verify units/signs. "
            f"Note: Meta API key is not configured, so this is the built-in study answer. "
            f"Set META_API_KEY for full Meta Llama answers."), subject


def ask_meta(question, context=""):
    """Returns (answer, provider, latency_ms)."""
    started = time.time()
    key = getattr(settings, "META_API_KEY", "")
    if key and requests is not None:
        try:
            resp = requests.post(
                settings.META_API_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": settings.META_MODEL,
                    "messages": [
                        {"role": "system", "content": (
                            "You are Meta Glass Academics tutor for school/college students. "
                            "Give short, correct, step-by-step study help with one worked example.")},
                        {"role": "user", "content": f"{context}\n\n{question}".strip()},
                    ],
                    "max_tokens": 600,
                },
                timeout=25,
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data["choices"][0]["message"]["content"]
                return text.strip(), "meta-llama", int((time.time() - started) * 1000)
        except Exception:
            pass
    text, _ = _offline_answer(question)
    return text, "offline-fallback", int((time.time() - started) * 1000)
