import type { PrismaClient } from "@prisma/client";
import type { CandidateStatus, EvaluateResult, ResearchResult, TranscriptTurn } from "./contracts";
import { FIXTURE_ROLES } from "./fixtures";

/**
 * Demo candidates for the Founding Engineer role so Ask Donna has a field to compare:
 * one strong candidate (Maya) and several weak ones. Seeded by `wasp db seed`.
 * Every record is made up; ids start with `candidate-demo-` so reseeding replaces them.
 */

interface DemoCandidate {
  id: string;
  name: string;
  githubUser: string | null;
  status: CandidateStatus;
  dossier: ResearchResult;
  /** Alternating lines, Donna first. Turn numbers and timestamps are filled in. */
  lines: string[];
  scorecard: EvaluateResult;
}

const sources = { fiber: true, ploid: false, github: true };

const DEMO: DemoCandidate[] = [
  {
    id: "candidate-demo-maya",
    name: "Maya Okafor",
    githubUser: "mayaokafor",
    status: "AWAITING_APPROVAL",
    dossier: {
      summary:
        "Backend engineer, three years at a logistics startup. Maintains pgslice-sync, a Postgres logical replication tool with about 1.2k GitHub stars that two companies run in production.",
      topProject: "pgslice-sync, a Postgres logical replication tool",
      highlights: [
        "Sole author of pgslice-sync, 1.2k stars, weekly commits for two years",
        "Led a zero-downtime migration of a 2 TB orders table at her last job",
        "Writes postmortems publicly on her blog",
      ],
      claimsToVerify: ["Says the migration had zero downtime across 2 TB"],
      tailoredQuestions: [
        "Your migration claims zero downtime on 2 TB. What almost went wrong?",
        "What's a design choice in pgslice-sync you'd undo?",
        "What would you own in your first two weeks here?",
      ],
      sources,
    },
    lines: [
      "Hi Maya, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. I saw pgslice-sync. Got a few minutes?",
      "Yes, happy to.",
      "You moved a 2 TB orders table with zero downtime. What almost went wrong?",
      "The backfill was fine. What nearly bit us was replication lag during the cutover. Lag spiked to 40 seconds because a nightly vacuum kicked in, so I added a lag gate that pauses the switch until lag is under one second, and we cut over at 3am with a rollback script I'd rehearsed twice on a staging copy.",
      "What's a design choice in pgslice-sync you'd undo?",
      "I stored the replication cursor in the target database. When the target was restored from a backup, the cursor went back in time and we replayed rows. I'd keep the cursor next to the source now, and I wrote that up as issue 212 with the fix plan.",
      "If you joined tomorrow, what would you own first?",
      "Your data path. I'd read every migration and job that touches the main tables, write down what scares me, and pick the one that pages someone most often to fix in week two.",
    ],
    scorecard: {
      recommendation: "PASS",
      overall: 9.1,
      personas: [
        { name: "Principal Engineer", score: 9.5, rationale: "Named the real failure mode, the measurement and the guardrail she built. Rehearsed rollback on a staging copy." },
        { name: "YC Founder", score: 9.0, rationale: "Picks the thing that pages people most and fixes it in week two. That is the owner mindset we want." },
        { name: "BS Detector", score: 8.5, rationale: "The zero-downtime claim held under a follow-up, and she volunteered a bug in her own project with an issue number." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 10, evidenceTurn: 3, quote: "I added a lag gate that pauses the switch until lag is under one second, and we cut over at 3am with a rollback script I'd rehearsed twice on a staging copy." },
        { name: "Depth on own project", score: 9, evidenceTurn: 5, quote: "I stored the replication cursor in the target database. When the target was restored from a backup, the cursor went back in time and we replayed rows." },
        { name: "Communication", score: 9, evidenceTurn: 7, quote: "I'd read every migration and job that touches the main tables, write down what scares me, and pick the one that pages someone most often to fix in week two." },
      ],
      redFlags: [],
      standoutQuote: "I'd keep the cursor next to the source now, and I wrote that up as issue 212 with the fix plan.",
      feedback: {
        strengths: ["You explained a hard migration with numbers and the guardrail you built.", "You were candid about a mistake in your own project and how you'd fix it."],
        sharpen: "Lead with the outcome first; the best detail came a little late in each answer.",
      },
    },
  },
  {
    id: "candidate-demo-jordan",
    name: "Jordan Blake",
    githubUser: "jblake-dev",
    status: "REJECTED",
    dossier: {
      summary: "Bootcamp grad, eight months at an agency. Resume says they scaled a platform to millions of users; GitHub has forks and one to-do app.",
      topProject: "a to-do app built from a course",
      highlights: ["Agency contract work on marketing sites", "Resume claims scaling a platform to millions of users"],
      claimsToVerify: ["Scaled a platform to millions of users", "Lists Kubernetes and Kafka"],
      tailoredQuestions: ["What did scaling to millions of users mean, and what broke first?", "Where did you use Kafka?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources,
    },
    lines: [
      "Hi Jordan, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Sure.",
      "Your resume says you scaled a platform to millions of users. What broke first?",
      "We leveraged a microservices architecture with Kubernetes so it was super scalable. Nothing really broke because it was cloud native.",
      "Where did Kafka fit in?",
      "Kafka was more on the roadmap. I watched a lot of talks about it, so I'm basically familiar with event-driven stuff.",
    ],
    scorecard: {
      recommendation: "REJECT",
      overall: 3.1,
      personas: [
        { name: "Principal Engineer", score: 2.5, rationale: "No concrete failure, number or decision. Buzzwords in place of a system." },
        { name: "YC Founder", score: 4.0, rationale: "Confident, but nothing they said shows they've owned a production problem." },
        { name: "BS Detector", score: 2.0, rationale: "The millions-of-users claim fell apart, and Kafka turned out to be a roadmap item and some talks." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 2, evidenceTurn: 3, quote: "Nothing really broke because it was cloud native." },
        { name: "Depth on own project", score: 3, evidenceTurn: 5, quote: "I watched a lot of talks about it, so I'm basically familiar with event-driven stuff." },
        { name: "Communication", score: 4, evidenceTurn: 3, quote: "We leveraged a microservices architecture with Kubernetes so it was super scalable." },
      ],
      redFlags: [
        "Resume says they scaled a platform to millions of users; on the call they couldn't name anything that broke.",
        "Lists Kafka; on the call it was only on the roadmap.",
      ],
      standoutQuote: "Nothing really broke because it was cloud native.",
      feedback: {
        strengths: ["You were comfortable and clear on the call.", "You know the vocabulary of modern backend systems."],
        sharpen: "Pick one real thing you built and tell the story of what broke and how you fixed it.",
      },
    },
  },
  {
    id: "candidate-demo-tyler",
    name: "Tyler Nguyen",
    githubUser: "tnguyen42",
    status: "REJECTED",
    dossier: {
      summary: "Self-taught, no professional experience. GitHub has three tutorial clones (a Twitter clone, a weather app, a Netflix clone) with the course's commit messages.",
      topProject: "a tutorial Twitter clone",
      highlights: ["Three tutorial projects", "No commits outside course repositories"],
      claimsToVerify: ["Says the Twitter clone is original work"],
      tailoredQuestions: ["What's the hardest bug you hit on the Twitter clone?", "What would you change about how it stores tweets?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources,
    },
    lines: [
      "Hi Tyler, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Yeah.",
      "What's the hardest bug you hit on your Twitter clone?",
      "Honestly it mostly worked. When something broke I'd just paste the error into ChatGPT and it fixed it.",
      "How does it store tweets, and what would you change?",
      "I think it's in Firebase? I'd probably just ask AI to rewrite it if it needed to scale.",
    ],
    scorecard: {
      recommendation: "REJECT",
      overall: 2.4,
      personas: [
        { name: "Principal Engineer", score: 2.0, rationale: "Didn't know where their own app stores data. No debugging story." },
        { name: "YC Founder", score: 3.0, rationale: "No sign of ownership. Hands every hard problem to a tool." },
        { name: "BS Detector", score: 2.0, rationale: "Commit messages match the course; the project isn't original work." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 1, evidenceTurn: 3, quote: "When something broke I'd just paste the error into ChatGPT and it fixed it." },
        { name: "Depth on own project", score: 2, evidenceTurn: 5, quote: "I think it's in Firebase?" },
        { name: "Communication", score: 4, evidenceTurn: 5, quote: "I'd probably just ask AI to rewrite it if it needed to scale." },
      ],
      redFlags: [
        "Says the Twitter clone is original work; commit messages match a public course.",
        "Couldn't say where their own app stores data.",
      ],
      standoutQuote: "I'd probably just ask AI to rewrite it if it needed to scale.",
      feedback: {
        strengths: ["You were honest about how you work today.", "You've shipped three projects end to end."],
        sharpen: "Build one project past the tutorial and learn exactly how its data is stored and why.",
      },
    },
  },
  {
    id: "candidate-demo-derek",
    name: "Derek Vance",
    githubUser: null,
    status: "REJECTED",
    dossier: {
      summary: "Former agency founder, sold a small Shopify plugin business. Mostly sales and hiring contractors; little code of his own on GitHub.",
      topProject: "a Shopify upsell plugin, built by contractors",
      highlights: ["Sold a Shopify plugin business", "Managed four contractors"],
      claimsToVerify: ["Says he wrote the plugin's backend"],
      tailoredQuestions: ["Walk me through the plugin's backend. What did you write yourself?", "What's the hardest bug you've fixed?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources: { fiber: true, ploid: false, github: false },
    },
    lines: [
      "Hi Derek, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Absolutely, love what Alex is building.",
      "Walk me through the plugin's backend. What did you write yourself?",
      "I architected it. The contractors did most of the typing, but I owned the vision, the pricing and I closed our first 200 stores myself.",
      "What's the hardest bug you've personally fixed?",
      "I'm more of a big-picture person. I'd want to be the one setting technical direction here, maybe CTO track.",
    ],
    scorecard: {
      recommendation: "REJECT",
      overall: 3.8,
      personas: [
        { name: "Principal Engineer", score: 2.0, rationale: "Couldn't name a line of code or a bug he fixed. This is a founding engineer role." },
        { name: "YC Founder", score: 7.0, rationale: "Sold 200 stores himself and sold a business. Real hustle, wrong seat." },
        { name: "BS Detector", score: 3.0, rationale: "Resume says he wrote the backend; on the call, contractors did." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 3, evidenceTurn: 3, quote: "The contractors did most of the typing, but I owned the vision, the pricing and I closed our first 200 stores myself." },
        { name: "Depth on own project", score: 2, evidenceTurn: 5, quote: "I'm more of a big-picture person." },
        { name: "Communication", score: 7, evidenceTurn: 3, quote: "I architected it." },
      ],
      redFlags: [
        "Resume says he wrote the plugin's backend; on the call, contractors wrote it.",
        "Asked about a CTO track on a founding engineer screen.",
      ],
      standoutQuote: "I closed our first 200 stores myself.",
      feedback: {
        strengths: ["You tell a clear, energetic story about the business.", "You've sold a product to real customers."],
        sharpen: "For engineering roles, bring one technical problem you solved with your own hands.",
      },
    },
  },
  {
    id: "candidate-demo-chloe",
    name: "Chloe Martin",
    githubUser: "chloemartin",
    status: "AWAITING_APPROVAL",
    dossier: {
      summary: "Frontend engineer, two years at a fintech. Solid React work and a design-system contribution; no backend or infrastructure work.",
      topProject: "a React component library for a fintech dashboard",
      highlights: ["Built the company's table and chart components", "Cut dashboard load time by about 30%"],
      claimsToVerify: ["Says she cut load time by 30%"],
      tailoredQuestions: ["How did you measure the 30% load time cut?", "Have you run anything on the backend?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources,
    },
    lines: [
      "Hi Chloe, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Yep, go ahead.",
      "How did you measure the 30% load time cut?",
      "Lighthouse before and after, mostly. We code-split the chart bundle and virtualized the big tables.",
      "Have you run anything on the backend?",
      "Not really. I've read our API code but never deployed a service. I'd want to learn, but it would be new.",
    ],
    scorecard: {
      recommendation: "MAYBE",
      overall: 5.4,
      personas: [
        { name: "Principal Engineer", score: 5.0, rationale: "Real frontend wins with a sensible fix, but no backend, and this role is mostly backend." },
        { name: "YC Founder", score: 6.0, rationale: "Honest and coachable. Would need ramp time we may not have." },
        { name: "BS Detector", score: 5.0, rationale: "The 30% claim is lab numbers only, no field data. Not inflated, just thin." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 6, evidenceTurn: 3, quote: "We code-split the chart bundle and virtualized the big tables." },
        { name: "Depth on own project", score: 5, evidenceTurn: 3, quote: "Lighthouse before and after, mostly." },
        { name: "Communication", score: 6, evidenceTurn: 5, quote: "I've read our API code but never deployed a service." },
      ],
      redFlags: ["No backend experience for a backend-heavy founding role."],
      standoutQuote: "I'd want to learn, but it would be new.",
      feedback: {
        strengths: ["You gave a concrete fix for a real performance problem.", "You were straightforward about what you haven't done yet."],
        sharpen: "Measure wins with real-user data, not only Lighthouse, and ship one small backend service.",
      },
    },
  },
  {
    id: "candidate-demo-ravi",
    name: "Ravi Patel",
    githubUser: "ravip-k8s",
    status: "REJECTED",
    dossier: {
      summary: "Claims two years of platform engineering. Top repo is a Kubernetes operator whose first commit is a full copy of another public project with the author's name removed.",
      topProject: "a Kubernetes autoscaling operator",
      highlights: ["Kubernetes operator repo, 30 stars", "Lists platform engineering at two startups"],
      claimsToVerify: ["Says he wrote the operator from scratch", "First commit matches another public repository"],
      tailoredQuestions: ["How does your operator decide when to scale?", "What's the reconcile loop doing when the API server is slow?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources,
    },
    lines: [
      "Hi Ravi, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Yes.",
      "How does your operator decide when to scale?",
      "It uses machine learning to predict load. I wrote the whole thing from scratch over a weekend.",
      "What's the reconcile loop doing when the API server is slow?",
      "I'm not sure what you mean by reconcile loop. It just runs in the cluster.",
    ],
    scorecard: {
      recommendation: "REJECT",
      overall: 2.2,
      personas: [
        { name: "Principal Engineer", score: 2.0, rationale: "Didn't recognise the reconcile loop, the core of any operator." },
        { name: "YC Founder", score: 3.0, rationale: "Nothing to build trust on." },
        { name: "BS Detector", score: 1.5, rationale: "Says he wrote it from scratch; the code has no ML and the first commit copies another repo." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 2, evidenceTurn: 3, quote: "It uses machine learning to predict load." },
        { name: "Depth on own project", score: 1, evidenceTurn: 5, quote: "I'm not sure what you mean by reconcile loop. It just runs in the cluster." },
        { name: "Communication", score: 4, evidenceTurn: 3, quote: "I wrote the whole thing from scratch over a weekend." },
      ],
      redFlags: [
        "Says he wrote the operator from scratch; the first commit copies another public project.",
        "Says it uses machine learning; the code scales on a fixed CPU threshold.",
        "Didn't know what a reconcile loop is.",
      ],
      standoutQuote: "It just runs in the cluster.",
      feedback: {
        strengths: ["You picked an ambitious area to work in.", "You answered quickly."],
        sharpen: "Only claim work you wrote, and know how its core loop works before you list it.",
      },
    },
  },
  {
    id: "candidate-demo-kevin",
    name: "Kevin Brooks",
    githubUser: "kbrooks",
    status: "REJECTED",
    dossier: {
      summary: "Four years as a backend engineer at two mid-size companies. Competent Go services; left both jobs within a year.",
      topProject: "a Go billing service",
      highlights: ["Built a Go billing service handling monthly invoicing", "Two jobs, each under a year"],
      claimsToVerify: ["Says he rewrote billing alone"],
      tailoredQuestions: ["What went wrong with the billing rewrite?", "How do you work when you disagree with a teammate's design?", "If you joined tomorrow, what would you want to own in your first two weeks?"],
      sources,
    },
    lines: [
      "Hi Kevin, this is Donna, an AI assistant calling for Alex at Acme. This call is recorded. Got a few minutes?",
      "Fine.",
      "What went wrong with the billing rewrite?",
      "Nothing went wrong with my part. The team kept pushing back on my design so I just rewrote it over a weekend and merged it.",
      "How do you work when you disagree with a teammate's design?",
      "Usually they're wrong, so I build mine and let the code speak. Code review mostly slows things down.",
    ],
    scorecard: {
      recommendation: "REJECT",
      overall: 3.6,
      personas: [
        { name: "Principal Engineer", score: 5.0, rationale: "Can clearly write Go services, but merged a billing rewrite past team review." },
        { name: "YC Founder", score: 3.0, rationale: "A founding team of three can't absorb someone who routes around every disagreement." },
        { name: "BS Detector", score: 3.0, rationale: "Claims nothing went wrong, but describes skipping review on billing code." },
      ],
      criteria: [
        { name: "Shipped real systems", score: 5, evidenceTurn: 3, quote: "I just rewrote it over a weekend and merged it." },
        { name: "Depth on own project", score: 4, evidenceTurn: 3, quote: "Nothing went wrong with my part." },
        { name: "Communication", score: 2, evidenceTurn: 5, quote: "Usually they're wrong, so I build mine and let the code speak. Code review mostly slows things down." },
      ],
      redFlags: [
        "Merged a billing rewrite over the team's objections without review.",
        "Says code review mostly slows things down.",
      ],
      standoutQuote: "Usually they're wrong, so I build mine and let the code speak.",
      feedback: {
        strengths: ["You can ship a backend service quickly.", "You have real billing domain experience."],
        sharpen: "Talk about how you brought others along on a design, not only how you shipped it.",
      },
    },
  },
];

function transcriptOf(lines: string[]): TranscriptTurn[] {
  let t = 0;
  return lines.map((text, i) => {
    const turn: TranscriptTurn = { i, role: i % 2 === 0 ? "agent" : "user", t, text };
    t = Math.round((t + 2 + text.split(" ").length * 0.38) * 10) / 10;
    return turn;
  });
}

export async function seedDemoCandidates(prisma: PrismaClient) {
  const roleId = FIXTURE_ROLES[0].id;
  const base = new Date("2026-11-21T15:00:00Z").getTime();

  for (const [n, d] of DEMO.entries()) {
    const transcript = transcriptOf(d.lines);
    const last = transcript[transcript.length - 1];
    const durationSecs = Math.round(last.t + 2 + last.text.split(" ").length * 0.38);
    const consentAt = new Date(base + n * 47 * 60_000);
    const slug = d.id.replace("candidate-demo-", "");
    const data = {
      roleId,
      name: d.name,
      email: `${slug}@example.com`,
      githubUser: d.githubUser,
      linkedinUrl: null,
      consentAt,
      status: d.status,
      dossier: JSON.stringify(d.dossier),
      conversationId: `demo-conv-${slug}`,
      transcript: JSON.stringify(transcript),
      durationSecs,
      analysis: JSON.stringify(null),
      scorecard: JSON.stringify({ ...d.scorecard, source: "fixture" }),
      audioPath: null,
      traceUrl: null,
    };
    await prisma.candidate.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data });

    await prisma.event.deleteMany({ where: { candidateId: d.id } });
    const events: [string, string][] = [
      ["applied", `${d.name} applied for ${FIXTURE_ROLES[0].title}`],
      ["research_done", d.dossier.summary],
      ["call_started", "Demo call"],
      ["call_ended", `${transcript.length} turns, ${durationSecs}s, no audio`],
      ["evaluated", `${d.scorecard.recommendation}, overall ${d.scorecard.overall}`],
    ];
    await prisma.event.createMany({
      data: events.map(([kind, detail], k) => ({ candidateId: d.id, kind, detail, at: new Date(consentAt.getTime() + k * 60_000) })),
    });
  }
}
