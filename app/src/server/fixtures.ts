// Inlined copy of /fixtures/*.json: the server bundle cannot read files outside app/.
// The JSON files in /fixtures are the source; regenerate this file if they change.
import type { Approval, EvaluateResult, ResearchResult, Role, TranscriptTurn } from "./contracts";

export const FIXTURE_ROLES: Role[] = [
  {
    "id": "role-demo-founding-eng",
    "title": "Founding Engineer",
    "companyName": "Acme (demo)",
    "founderName": "Alex",
    "rubric": [
      "Shipped real systems",
      "Depth on own project",
      "Communication"
    ],
    "questions": [
      "What's the hardest bug you've shipped a fix for?",
      "Walk me through a technical decision you'd make differently now."
    ],
    "sourceUrl": null,
    "isOfficialPosting": false
  }
];

export const FIXTURE_DOSSIER: ResearchResult = {
  "summary": "Third-year Waterloo CS student. Two internships on backend infrastructure; maintains an open-source rate limiter with about 400 GitHub stars.",
  "topProject": "a Redis-backed rate limiter library",
  "highlights": [
    "Backend intern on a payments team, worked on idempotency keys",
    "Open-source rate limiter, about 400 stars, used in two other projects",
    "Hackathon winner with a voice-controlled spreadsheet"
  ],
  "claimsToVerify": [
    "Says the rate limiter handles 50k requests per second",
    "Lists Kubernetes experience but no repo uses it"
  ],
  "tailoredQuestions": [
    "Your rate limiter claims 50k requests per second. How did you measure that, and what broke first?",
    "On the payments team, what went wrong with idempotency keys and how did you find out?",
    "If you joined tomorrow, what would you want to own in your first two weeks?"
  ],
  "sources": {
    "fiber": true,
    "ploid": false,
    "github": true
  }
};

export const FIXTURE_CONVERSATION: {
  conversationId: string;
  durationSecs: number;
  audioPath: string;
  transcript: TranscriptTurn[];
} = {
  "conversationId": "fixture-conv-001",
  "durationSecs": 96,
  "audioPath": "fixtures/conversation.mp3",
  "transcript": [
    {
      "i": 0,
      "role": "agent",
      "t": 0,
      "text": "Hi Sam, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. I saw your Redis rate limiter. Got a few minutes for a quick screen?"
    },
    {
      "i": 1,
      "role": "user",
      "t": 9.4,
      "text": "Yeah, for sure."
    },
    {
      "i": 2,
      "role": "agent",
      "t": 11.2,
      "text": "Your README says it handles 50k requests a second. How did you measure that, and what broke first?"
    },
    {
      "i": 3,
      "role": "user",
      "t": 17.8,
      "text": "I load tested with k6 against a single Redis node. The first thing that broke was the Lua script, because I was doing a sorted set trim on every call, so p99 jumped. I moved to a fixed window with a token bucket fallback and it went from about 12k to 50k."
    },
    {
      "i": 4,
      "role": "agent",
      "t": 38.5,
      "text": "Nice. On the payments team, what went wrong with idempotency keys?"
    },
    {
      "i": 5,
      "role": "user",
      "t": 43.1,
      "text": "Honestly I mostly read the code. I think there was some issue with retries but I wasn't really on that part."
    },
    {
      "i": 6,
      "role": "agent",
      "t": 52,
      "text": "Fair enough. What's one thing you'd want to own in your first two weeks?"
    },
    {
      "i": 7,
      "role": "user",
      "t": 57.6,
      "text": "The API gateway. I'd want to put real rate limiting and tracing in front of it, because that's where I've actually built stuff, and I'd write down what I find in the first week before changing anything."
    },
    {
      "i": 8,
      "role": "agent",
      "t": 78.9,
      "text": "Thanks Sam, I'll pass my notes to Alex."
    }
  ]
};

export const FIXTURE_PANEL: EvaluateResult = {
  "recommendation": "PASS",
  "overall": 7.6,
  "personas": [
    {
      "name": "Principal Engineer",
      "score": 8.5,
      "rationale": "Clear, specific account of a real performance bottleneck and the fix, with numbers."
    },
    {
      "name": "YC Founder",
      "score": 8,
      "rationale": "Knows what they'd own on day one and would write things down before changing them."
    },
    {
      "name": "BS Detector",
      "score": 6,
      "rationale": "The 50k claim held up under a follow-up. Was candid about not working on idempotency, which cuts a resume line."
    }
  ],
  "criteria": [
    {
      "name": "Shipped real systems",
      "score": 8,
      "evidenceTurn": 3,
      "quote": "The first thing that broke was the Lua script, because I was doing a sorted set trim on every call, so p99 jumped."
    },
    {
      "name": "Depth on own project",
      "score": 9,
      "evidenceTurn": 3,
      "quote": "I moved to a fixed window with a token bucket fallback and it went from about 12k to 50k."
    },
    {
      "name": "Communication",
      "score": 6,
      "evidenceTurn": 5,
      "quote": "Honestly I mostly read the code. I think there was some issue with retries but I wasn't really on that part."
    }
  ],
  "redFlags": [
    "Resume lists idempotency work on the payments team; on the call they said they mostly read the code."
  ],
  "standoutQuote": "I'd write down what I find in the first week before changing anything.",
  "feedback": {
    "strengths": [
      "You explained a real bottleneck and your fix with concrete numbers.",
      "You had a clear, grounded plan for your first two weeks."
    ],
    "sharpen": "Only list resume work you can talk about in depth; the idempotency line invited a question you couldn't answer."
  }
};

export const FIXTURE_APPROVAL: Approval = {
  "id": "approval-fixture-001",
  "candidateId": "candidate-fixture-001",
  "slotIso": "2026-11-24T15:00:00-05:00",
  "status": "PENDING",
  "alterRef": null,
  "emailDraft": {
    "to": "sam@example.com",
    "subject": "Interview with Alex at Acme",
    "body": "Hi Sam, thanks for the chat with Donna. Alex would like to meet on Tuesday Nov 24 at 3:00 PM ET. The calendar invite is attached. Reply here if that doesn't work."
  },
  "deniedAttempt": null
};
