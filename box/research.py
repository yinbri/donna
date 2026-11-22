import asyncio
import base64
import binascii
import hashlib
import json
import logging
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile

import httpx

from models import ResearchRequest, ResearchResult, Sources


logger = logging.getLogger(__name__)
LINKEDIN_PROFILE = re.compile(
    r"https://(?:(?:www|[a-z]{2})\.)?linkedin\.com/in/([a-z0-9_-]+)/?(?:[?#].*)?",
    re.IGNORECASE,
)
GITHUB_USER = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?", re.IGNORECASE)
GITHUB_PROFILE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/([^/]+)/?", re.IGNORECASE
)
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")


def normalized_name(name: str) -> str:
    return " ".join(name.casefold().split())


async def fiber_roles(request: ResearchRequest) -> list[str]:
    key = os.getenv("FIBER_API_KEY")
    profile_url = LINKEDIN_PROFILE.fullmatch((request.linkedinUrl or "").strip())
    if not key or (not profile_url and not EMAIL.fullmatch(request.email)):
        return []

    if profile_url:
        path = "/v1/linkedin-live-fetch/profile/single"
        identifier = {"identifier": f"https://www.linkedin.com/in/{profile_url[1]}"}
    else:
        path = "/v1/email-to-person/single"
        identifier = {"email": request.email}

    async with httpx.AsyncClient(base_url="https://api.fiber.ai", timeout=10) as client:
        response = await client.post(path, json={"apiKey": key, **identifier})
        if response.status_code == 404:
            return []
        response.raise_for_status()
        output = response.json()["output"]

    if profile_url:
        profile = output.get("profile") if output.get("found") is True else None
    else:
        matches = output.get("data", [])
        if len(matches) != 1 or not isinstance(matches[0], dict):
            return []
        profile = matches[0]
        name = profile.get("name")
        if not isinstance(name, str) or normalized_name(name) != normalized_name(request.name):
            return []
    if not isinstance(profile, dict):
        return []

    jobs = [profile.get("current_job")]
    experiences = profile.get("experiences")
    if isinstance(experiences, list):
        jobs.extend(experiences)
    roles = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        title = job.get("title")
        company = job.get("company_name")
        if isinstance(title, str) and title.strip() and isinstance(company, str) and company.strip():
            roles.append(" ".join(f"{title} at {company}".split())[:180])
    return list(dict.fromkeys(roles))[:3]


async def github_json(client: httpx.AsyncClient, path: str, **params):
    try:
        response = await client.get(path, params=params)
        if response.status_code in (401, 403) and "Authorization" in response.request.headers:
            # Public repository data is still available if an optional token is rejected.
            client.headers.pop("Authorization", None)
            response = await client.get(path, params=params)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError):
        return None


async def github_project(handle: str | None) -> tuple[list[str], str]:
    handle = re.split(r"[?#]", (handle or "").strip().removeprefix("@"), maxsplit=1)[0]
    profile_url = GITHUB_PROFILE.fullmatch(handle)
    handle = profile_url[1] if profile_url else handle.rstrip("/")
    if not GITHUB_USER.fullmatch(handle):
        return [], ""

    headers = {"Accept": "application/vnd.github+json", "User-Agent": "donna-box"}
    if token := os.getenv("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(
        base_url="https://api.github.com", headers=headers, timeout=4
    ) as client:
        repos = await github_json(
            client, f"/users/{handle}/repos", type="owner", sort="pushed", per_page=30
        )
        if not isinstance(repos, list):
            return [], ""
        projects = [
            repo for repo in repos
            if not repo["fork"]
            and not repo["private"]
            and repo["owner"]["login"].casefold() == handle.casefold()
        ]
        top = sorted(projects, key=lambda repo: repo["stargazers_count"], reverse=True)[:3]
        if not top:
            return [], ""
        names = [repo["name"] for repo in top]
        path = f"/repos/{handle}/{names[0]}"
        readme, commits = await asyncio.gather(
            github_json(client, f"{path}/readme"),
            github_json(client, f"{path}/commits", per_page=10),
        )

    excerpt = ""
    if isinstance(readme, dict) and readme.get("encoding") == "base64":
        content = readme.get("content")
        if isinstance(content, str):
            try:
                excerpt = base64.b64decode(content).decode("utf-8", errors="replace")[:2000]
            except (binascii.Error, ValueError):
                logger.warning("GitHub returned an unreadable README")
    if isinstance(commits, list):
        excerpt += "\n" + "\n".join(commit["commit"]["message"][:200] for commit in commits)
    return names, excerpt


async def fetch_source(name: str, lookup, seconds: int, fallback):
    try:
        return await asyncio.wait_for(lookup, timeout=seconds)
    except httpx.HTTPStatusError as error:
        logger.warning("%s research unavailable (HTTP %s)", name, error.response.status_code)
        return fallback
    except Exception as error:
        logger.warning("%s research unavailable (%s)", name, type(error).__name__)
        return fallback


async def build_dossier(request: ResearchRequest) -> ResearchResult:
    roles, (repos, evidence) = await asyncio.gather(
        fetch_source("Fiber", fiber_roles(request), 11, []),
        fetch_source("GitHub", github_project(request.githubUser), 9, ([], "")),
    )
    top_project = repos[0] if repos else "a project you worked on"
    if repos:
        first = f"What was one decision you personally made while building {top_project}?"
        claims = [f"What the applicant personally built in {top_project}"]
    else:
        first = "What was one decision you personally made on a project you worked on?"
        claims = []

    if roles:
        second = "What is one result you were responsible for in your most recent role?"
        claims.append(f"Scope of ownership in the role listed as {roles[0]}")
    elif re.search(r"\b(?:benchmark|latency|throughput|performance)\b", evidence, re.IGNORECASE):
        second = "How did you measure whether your change improved performance?"
        claims.append(f"How performance was measured in {top_project}")
    elif repos:
        second = "What did you test to check that your part of the project worked?"
        claims.append(f"How the applicant tested their part of {top_project}")
    else:
        second = "How did you check that your work solved the problem?"

    highlights = [f"LinkedIn lists {role}" for role in roles]
    highlights.extend(f"Public GitHub repository: {repo}" for repo in repos)
    return ResearchResult(
        summary=". ".join(highlights[:2]) + "." if highlights else "No external profile data available.",
        topProject=top_project,
        highlights=highlights,
        claimsToVerify=claims,
        tailoredQuestions=(
            first,
            second,
            f"What would you prioritize in your first two weeks as {request.role.title}?",
        ),
        sources=Sources(fiber=bool(roles), ploid=False, github=bool(repos)),
    )


def save_dossier(directory: Path, request: ResearchRequest, dossier: ResearchResult) -> Path:
    role = f"{request.role.companyName}/{request.role.title}"
    role_slug = re.sub(r"[^a-z0-9]+", "-", role.casefold()).strip("-")[:60] or "role"
    role_identity = json.dumps([request.role.companyName, request.role.title])
    role_key = hashlib.sha256(role_identity.encode()).hexdigest()[:12]
    candidate_key = hashlib.sha256(request.email.casefold().encode()).hexdigest()[:20]
    folder = directory / f"{role_slug}-{role_key}"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{candidate_key}.md"
    sections = [
        "# Applicant dossier",
        f"Role: {request.role.title} at {request.role.companyName}",
        "## Summary",
        dossier.summary,
        "## Sources",
        "\n".join(f"- {source}: {used}" for source, used in dossier.sources.model_dump().items()),
        "## Highlights",
        "\n".join(f"- {item}" for item in dossier.highlights),
        "## Claims to verify",
        "\n".join(f"- {item}" for item in dossier.claimsToVerify),
        "## Interview questions",
        "\n".join(f"{i}. {text}" for i, text in enumerate(dossier.tailoredQuestions, 1)),
    ]
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=folder, delete=False) as file:
        temp = Path(file.name)
    try:
        temp.write_text("\n\n".join(sections) + "\n", encoding="utf-8")
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)
    return path
