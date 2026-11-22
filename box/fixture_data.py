import json
from functools import cache
from pathlib import Path

from models import EvaluateRequest, EvaluateResult, ResearchResult, TranscriptTurn


FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures"


@cache
def load_fixture(name: str):
    return json.loads((FIXTURE_DIR / f"{name}.json").read_text(encoding="utf-8"))


def research_fixture() -> ResearchResult:
    return ResearchResult.model_validate(load_fixture("dossier"))


def evaluation_fixture(request: EvaluateRequest) -> EvaluateResult | None:
    result = EvaluateResult.model_validate(load_fixture("panel"))
    demo = [
        TranscriptTurn.model_validate(turn)
        for turn in load_fixture("conversation")["transcript"]
    ]
    if request.transcript != demo or request.rubric != [item.name for item in result.criteria]:
        return None

    turns = {turn.i: turn.text for turn in demo if turn.role == "user"}
    for criterion in result.criteria:
        criterion.quote = turns[criterion.evidenceTurn]
    return result
