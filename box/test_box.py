import base64
import json
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from fixture_data import load_fixture
from main import app, cached_panel
from models import EvaluateRequest, PanelAnswer
from panel import PERSONAS, aggregate, evaluate_panel


HEADER = {"X-Box-Secret": "local-test"}
ROLE = load_fixture("roles")[0]
RESEARCH = {
    "name": "Demo Applicant",
    "email": "applicant@example.invalid",
    "linkedinUrl": "https://www.linkedin.com/in/demo-applicant?tracking=ignored",
    "githubUser": "https://github.com/demo-applicant/?tab=repositories",
    "role": ROLE,
}
EVALUATION = {
    "dossier": load_fixture("dossier"),
    "rubric": ROLE["rubric"],
    "transcript": load_fixture("conversation")["transcript"],
}
PROVIDER_CLIENT = httpx.AsyncClient


class BoxTest(unittest.TestCase):
    def setUp(self):
        self.directory = self.enterContext(TemporaryDirectory())
        self.enterContext(patch.dict(os.environ, {
            "BOX_MODE": "fixture",
            "BOX_SECRET": HEADER["X-Box-Secret"],
            "BOX_DATA_DIR": self.directory,
            "EXPECTED_PARROT_API_KEY": "",
            "OPENAI_API_KEY": "",
            "FIBER_API_KEY": "",
            "GITHUB_TOKEN": "",
        }))
        self.client = self.enterContext(TestClient(app))
        cached_panel.cache_clear()
        self.addCleanup(cached_panel.cache_clear)

    def post(self, route, body):
        return self.client.post(route, headers=HEADER, json=body)

    def mock_providers(self, handler):
        os.environ.update(BOX_MODE="live", FIBER_API_KEY="mock-only")
        self.enterContext(patch(
            "research.httpx.AsyncClient",
            side_effect=lambda **options: PROVIDER_CLIENT(
                **options, transport=httpx.MockTransport(handler)
            ),
        ))

    def test_health_and_secret(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        for route, payload in [("/research", RESEARCH), ("/evaluate", EVALUATION)]:
            self.assertEqual(self.client.post(route, json=payload).status_code, 401)
            self.assertEqual(
                self.client.post(route, json=payload, headers={"X-Box-Secret": "wrong"}).status_code,
                401,
            )
        with patch.dict(os.environ, {"BOX_SECRET": ""}):
            self.assertEqual(self.post("/research", RESEARCH).status_code, 503)

    def test_fixture_routes_and_receipts(self):
        self.assertEqual(self.post("/research", RESEARCH).json(), EVALUATION["dossier"])
        response = self.post("/evaluate", EVALUATION)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        candidate_turns = {
            turn["i"]: turn["text"] for turn in EVALUATION["transcript"] if turn["role"] == "user"
        }
        self.assertEqual(len(result["personas"]), 3)
        for criterion in result["criteria"]:
            self.assertEqual(criterion["quote"], candidate_turns[criterion["evidenceTurn"]])
        self.assertEqual(list(Path(self.directory).rglob("*.md")), [])

    def test_other_transcript_cannot_inherit_demo_scores(self):
        input_ = {**EVALUATION, "transcript": [{"i": 12, "t": 2, "role": "user", "text": "Other call"}]}
        self.assertEqual(self.post("/evaluate", input_).status_code, 503)

    def test_rejects_duplicate_or_empty_candidate_turns(self):
        turn = {"i": 12, "t": 2, "role": "user", "text": "Some evidence"}
        for transcript in ([turn, turn], [{**turn, "text": "  "}]):
            self.assertEqual(self.post("/evaluate", {**EVALUATION, "transcript": transcript}).status_code, 422)

    def test_combined_research_and_dossier(self):
        calls = []

        def provider(request):
            calls.append(request.url.path)
            if request.url.host == "api.fiber.ai":
                body = json.loads(request.content)
                self.assertEqual(body["identifier"], "https://www.linkedin.com/in/demo-applicant")
                return httpx.Response(200, json={"output": {"found": True, "profile": {
                    "current_job": {"title": "Engineer", "company_name": "Demo"},
                }}})
            return self.github_provider(request)

        self.mock_providers(provider)
        response = self.post("/research", RESEARCH)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["sources"], {"fiber": True, "github": True, "ploid": False})
        self.assertEqual(result["topProject"], "rate-limiter")
        self.assertIn("rate-limiter", result["tailoredQuestions"][0])
        self.assertIn("Engineer at Demo", result["summary"])
        self.assertIn("/repos/demo-applicant/rate-limiter/readme", calls)
        self.assertIn("/repos/demo-applicant/rate-limiter/commits", calls)
        dossier, = list(Path(self.directory).rglob("*.md"))
        text = dossier.read_text(encoding="utf-8")
        self.assertIn("rate-limiter", text)
        self.assertNotIn(RESEARCH["email"], text)

    def test_github_survives_fiber_402_and_rejected_token(self):
        self.mock_providers(lambda request: (
            httpx.Response(402) if request.url.host == "api.fiber.ai"
            else httpx.Response(401) if "Authorization" in request.headers
            else self.github_provider(request)
        ))
        os.environ["GITHUB_TOKEN"] = "mock-bad-token"
        result = self.post("/research", RESEARCH).json()
        self.assertEqual(result["sources"], {"fiber": False, "github": True, "ploid": False})
        self.assertIn("performance", result["tailoredQuestions"][1])

    def test_email_lookup_requires_one_matching_name(self):
        def provider(request):
            self.assertTrue(request.url.path.endswith("/email-to-person/single"))
            self.assertEqual(json.loads(request.content)["email"], RESEARCH["email"])
            return httpx.Response(200, json={"output": {"data": [{
                "name": "Demo Applicant", "current_job": {"title": "Engineer", "company_name": "Demo"},
            }]}})

        self.mock_providers(provider)
        request = {**RESEARCH, "linkedinUrl": None, "githubUser": None}
        self.assertTrue(self.post("/research", request).json()["sources"]["fiber"])
        self.assertFalse(self.post("/research", {**request, "name": "Someone Else"}).json()["sources"]["fiber"])

    def test_all_sources_unavailable(self):
        self.mock_providers(lambda _: httpx.Response(503))
        response = self.post("/research", RESEARCH)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(any(response.json()["sources"].values()))
        self.assertEqual(len(response.json()["tailoredQuestions"]), 3)

    def test_invalid_identifiers_do_not_trigger_provider_requests(self):
        calls = []

        def provider(request):
            calls.append(request.url)
            return httpx.Response(400)

        self.mock_providers(provider)
        result = self.post("/research", {
            **RESEARCH, "email": "no-email", "githubUser": "github.com/demo-applicant/repo",
            "linkedinUrl": "https://linkedin.com.example.invalid/in/demo-applicant",
        }).json()
        self.assertFalse(any(result["sources"].values()))
        self.assertEqual(calls, [])

    def test_unreadable_readme_keeps_github_project(self):
        self.mock_providers(lambda request: httpx.Response(
            200, json={"encoding": "base64", "content": "A"}
        ) if request.url.path.endswith("/readme") else self.github_provider(request))
        result = self.post("/research", {**RESEARCH, "linkedinUrl": None, "email": "no-email"}).json()
        self.assertTrue(result["sources"]["github"])
        self.assertEqual(result["topProject"], "rate-limiter")

    def test_live_panel_route_caches_valid_results(self):
        os.environ.update(BOX_MODE="live", OPENAI_API_KEY="mock-only")
        request = EvaluateRequest.model_validate(EVALUATION)
        result = aggregate(request, self.panel_answers((6, 8, 9)))
        with patch("main.evaluate_panel", return_value=result) as evaluate:
            for _ in range(2):
                self.assertEqual(self.post("/evaluate", EVALUATION).json()["overall"], 8)
            evaluate.assert_called_once()

    def test_panel_median_and_severe_flag(self):
        request = EvaluateRequest.model_validate(EVALUATION)
        result = aggregate(request, self.panel_answers((5, 9, 7)))
        self.assertEqual(result.overall, 7)
        self.assertEqual(result.recommendation, "PASS")
        self.assertEqual(aggregate(request, self.panel_answers((5, 9, 7), severe=True)).recommendation, "MAYBE")
        self.assertEqual(aggregate(request, self.panel_answers((2, 3, 4))).recommendation, "REJECT")

    def test_panel_retries_invalid_evidence(self):
        with patch("panel.survey_answers", side_effect=[
            self.panel_answers((6, 8, 9), evidence=2),
            self.panel_answers((6, 8, 9), evidence=3),
        ]) as run:
            result = evaluate_panel(EvaluateRequest.model_validate(EVALUATION))
        self.assertEqual(run.call_count, 2)
        self.assertEqual(result.criteria[0].evidenceTurn, 3)

    @staticmethod
    def github_provider(request):
        if request.url.path.endswith("/users/demo-applicant/repos"):
            owner = {"login": "demo-applicant"}
            return httpx.Response(200, json=[
                {"name": "popular-fork", "fork": True, "private": False, "owner": owner, "stargazers_count": 999},
                {"name": "rate-limiter", "fork": False, "private": False, "owner": owner, "stargazers_count": 10},
            ])
        if request.url.path.endswith("/readme"):
            return httpx.Response(200, json={
                "encoding": "base64", "content": base64.b64encode(b"Latency benchmark").decode(),
            })
        if request.url.path.endswith("/commits"):
            return httpx.Response(200, json=[{"commit": {"message": "Measure latency"}}])
        raise AssertionError(request.url.path)

    @staticmethod
    def panel_answers(scores, severe=False, evidence=3):
        return {
            persona: PanelAnswer.model_validate({
                "scores": [{"score": score, "evidenceTurn": evidence}] * len(ROLE["rubric"]),
                "rationale": "The candidate explained a design decision.",
                "redFlag": "The benchmarks conflict." if severe else "",
                "severe": severe,
                "standoutTurn": evidence,
                "feedback": {"strengths": ["Specific example", "Clear rationale"], "sharpen": "Explain the tradeoff."},
            })
            for persona, score in zip(PERSONAS, scores, strict=True)
        }
