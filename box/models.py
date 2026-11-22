from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Score = Annotated[float, Field(ge=0, le=10)]
PersonaName = Literal["Principal Engineer", "YC Founder", "BS Detector"]


class Role(BaseModel):
    title: NonEmpty
    companyName: NonEmpty
    rubric: list[NonEmpty]


class ResearchRequest(BaseModel):
    name: NonEmpty
    email: NonEmpty
    githubUser: str | None = None
    linkedinUrl: str | None = None
    role: Role


class Sources(BaseModel):
    fiber: bool
    ploid: bool
    github: bool


class ResearchResult(BaseModel):
    summary: str
    topProject: str
    highlights: list[str]
    claimsToVerify: list[str]
    tailoredQuestions: tuple[str, str, str]
    sources: Sources


class TranscriptTurn(BaseModel):
    i: int = Field(ge=0, strict=True)
    role: Literal["agent", "user"]
    text: str
    t: float = Field(ge=0, allow_inf_nan=False)


class EvaluateRequest(BaseModel):
    dossier: ResearchResult
    rubric: list[NonEmpty] = Field(min_length=1)
    transcript: list[TranscriptTurn]

    @model_validator(mode="after")
    def check_evidence_input(self):
        if len(set(self.rubric)) != len(self.rubric):
            raise ValueError("Rubric criteria must be unique")
        if len({turn.i for turn in self.transcript}) != len(self.transcript):
            raise ValueError("Transcript turn numbers must be unique")
        if not any(turn.role == "user" and turn.text.strip() for turn in self.transcript):
            raise ValueError("Transcript needs at least one non-empty candidate turn")
        return self


class PersonaScore(BaseModel):
    name: PersonaName
    score: Score
    rationale: str


class CriterionScore(BaseModel):
    name: str
    score: Score
    evidenceTurn: int
    quote: str


class Feedback(BaseModel):
    strengths: tuple[str, str]
    sharpen: str


class EvaluateResult(BaseModel):
    recommendation: Literal["PASS", "MAYBE", "REJECT"]
    overall: Score
    personas: list[PersonaScore]
    criteria: list[CriterionScore]
    redFlags: list[str]
    standoutQuote: str
    feedback: Feedback


class EvidenceScore(BaseModel):
    model_config = ConfigDict(strict=True)

    score: Score
    evidenceTurn: int


class PanelAnswer(BaseModel):
    scores: list[EvidenceScore]
    rationale: NonEmpty
    severe: bool
    redFlag: str
    standoutTurn: int
    feedback: Feedback
