// Simulated data for the NightShift Morning Dashboard
// This will be replaced with real Auth0 Token Vault + AI agent data

export interface AgentAction {
  id: string;
  type: "completed" | "pending_approval" | "needs_auth";
  service: "gmail" | "calendar" | "github";
  title: string;
  description: string;
  timestamp: string;
  riskLevel: "low" | "medium" | "high";
  scope?: string;
  details?: string;
}

export interface MorningBrief {
  greeting: string;
  date: string;
  summary: string;
  stats: {
    emailsTriaged: number;
    meetingsPrepped: number;
    prsReviewed: number;
    actionsCompleted: number;
    pendingApprovals: number;
    authRequests: number;
  };
  dayAhead: string[];
}

export const mockBrief: MorningBrief = {
  greeting: "Good morning",
  date: new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
  summary:
    "While you slept, I triaged 23 emails, prepped 3 meeting briefs, and reviewed 4 pull requests. There are 2 actions that need your approval and 1 new permission request.",
  stats: {
    emailsTriaged: 23,
    meetingsPrepped: 3,
    prsReviewed: 4,
    actionsCompleted: 12,
    pendingApprovals: 2,
    authRequests: 1,
  },
  dayAhead: [
    "9:00 AM — Sprint Planning with Engineering (prepped ✓)",
    "11:30 AM — 1:1 with Sarah Chen (agenda drafted ✓)",
    "2:00 PM — Design Review — no conflicts detected",
    "4:00 PM — Open block — agent suggests deep work",
  ],
};

export const mockActions: AgentAction[] = [
  // Completed actions
  {
    id: "c1",
    type: "completed",
    service: "gmail",
    title: "Triaged inbox: 23 emails processed",
    description:
      "Categorized 8 as important, 11 as informational, 4 as promotional. Starred 3 urgent messages from your manager.",
    timestamp: "3:12 AM",
    riskLevel: "low",
    scope: "gmail.readonly",
  },
  {
    id: "c2",
    type: "completed",
    service: "calendar",
    title: "Prepared meeting briefs for 3 meetings",
    description:
      "Generated agendas and talking points for Sprint Planning, 1:1 with Sarah, and Design Review by analyzing recent Slack threads and emails.",
    timestamp: "3:25 AM",
    riskLevel: "low",
    scope: "calendar.readonly",
  },
  {
    id: "c3",
    type: "completed",
    service: "github",
    title: "Reviewed 4 open pull requests",
    description:
      'Summarized changes in #482 (auth refactor), #479 (API pagination), #477 (UI polish), #475 (test coverage). Flagged #482 as needing your attention — 2 merge conflicts detected.',
    timestamp: "3:41 AM",
    riskLevel: "low",
    scope: "repo:read",
  },
  {
    id: "c4",
    type: "completed",
    service: "gmail",
    title: "Drafted 2 reply suggestions",
    description:
      "Prepared draft responses for your manager's project update request and the vendor contract inquiry. Saved as drafts — not sent.",
    timestamp: "3:48 AM",
    riskLevel: "low",
    scope: "gmail.readonly",
  },
  {
    id: "c5",
    type: "completed",
    service: "github",
    title: "Generated weekly repo activity summary",
    description:
      "14 commits merged, 6 PRs closed, 2 new issues opened. Test coverage at 87% (+2% from last week).",
    timestamp: "3:55 AM",
    riskLevel: "low",
    scope: "repo:read",
  },

  // Pending approval (Step-Up Auth required)
  {
    id: "p1",
    type: "pending_approval",
    service: "gmail",
    title: "Archive 11 promotional emails",
    description:
      "Identified 11 promotional emails (newsletters, marketing) that match your auto-archive preferences. This requires write access to your Gmail.",
    timestamp: "3:15 AM",
    riskLevel: "medium",
    scope: "gmail.modify",
    details:
      "Emails from: TechCrunch Daily, Product Hunt, GitHub Digest, AWS Notifications (7 more). None flagged as important.",
  },
  {
    id: "p2",
    type: "pending_approval",
    service: "calendar",
    title: "Reschedule conflicting meeting",
    description:
      'Your "Design Review" at 2:00 PM conflicts with a newly added "All Hands" meeting. Agent proposes moving Design Review to 3:30 PM. Requires calendar write permission.',
    timestamp: "3:30 AM",
    riskLevel: "high",
    scope: "calendar.events.write",
    details:
      "All attendees (4 people) have availability at 3:30 PM. Moving this would give you a 30-min break after All Hands.",
  },

  // Needs authorization (CIBA)
  {
    id: "a1",
    type: "needs_auth",
    service: "github",
    title: "New permission: Close stale issues",
    description:
      "Found 7 issues with no activity for 90+ days. To auto-close them with a comment, the agent needs 'repo:write' permission. This was not previously granted.",
    timestamp: "3:50 AM",
    riskLevel: "high",
    scope: "repo:write",
    details:
      "Issues: #312, #298, #285, #274, #261, #253, #247. All are labeled 'stale' by GitHub's bot. Granting this permission allows the agent to close issues and leave comments on your repositories.",
  },
];

export function getServiceIcon(service: string): string {
  switch (service) {
    case "gmail":
      return "✉️";
    case "calendar":
      return "📅";
    case "github":
      return "💻";
    default:
      return "🔧";
  }
}

export function getServiceLabel(service: string): string {
  switch (service) {
    case "gmail":
      return "Gmail";
    case "calendar":
      return "Google Calendar";
    case "github":
      return "GitHub";
    default:
      return service;
  }
}
