import logging
import os
from functools import lru_cache
from pathlib import Path
from secrets import compare_digest
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException

from fixture_data import evaluation_fixture, research_fixture
from models import EvaluateRequest, EvaluateResult, ResearchRequest, ResearchResult
from panel import evaluate_panel, has_model_key
from research import build_dossier, save_dossier


BOX_DIR = Path(__file__).resolve().parent
load_dotenv(BOX_DIR / ".env")
logger = logging.getLogger(__name__)
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


async def require_secret(x_box_secret: Annotated[str | None, Header()] = None) -> None:
    secret = os.getenv("BOX_SECRET")
    if not secret:
        raise HTTPException(503, "Box secret is not configured")
    if not x_box_secret or not compare_digest(x_box_secret.encode(), secret.encode()):
        raise HTTPException(401, "Invalid box secret")


@app.get("/health")
def health():
    return {
        "ok": True,
        "sources": {
            "fiber": bool(os.getenv("FIBER_API_KEY")),
            "ploid": False,
            "github": True,
            "edsl": has_model_key(),
        },
    }


@app.post("/research", dependencies=[Depends(require_secret)])
async def research(request: ResearchRequest) -> ResearchResult:
    if os.getenv("BOX_MODE", "fixture") != "live":
        return research_fixture()

    dossier = await build_dossier(request)
    directory = Path(os.getenv("BOX_DATA_DIR", BOX_DIR / "dossiers"))
    try:
        save_dossier(directory, request, dossier)
    except OSError:
        logger.error("Could not store research dossier")
        raise HTTPException(503, "Could not store research dossier") from None
    return dossier


@app.post("/evaluate", dependencies=[Depends(require_secret)])
def evaluate(request: EvaluateRequest) -> EvaluateResult:
    if os.getenv("BOX_MODE", "fixture") == "live" and has_model_key():
        try:
            return cached_panel(request.model_dump_json())
        except Exception as error:
            logger.warning("Panel unavailable (%s)", type(error).__name__)

    sample = evaluation_fixture(request)
    if sample is not None:
        return sample
    raise HTTPException(503, "Live evaluation unavailable for this transcript")


@lru_cache(maxsize=64)
def cached_panel(payload: str) -> EvaluateResult:
    return evaluate_panel(EvaluateRequest.model_validate_json(payload))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
