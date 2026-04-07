// Real API services — fetches data via Auth0 Token Vault
// with Management API fallback for upstream provider access tokens

import { auth0 } from "./auth0";
import type { AgentAction } from "./mock-data";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;

// ============================================================
// Token Retrieval — Token Vault with Management API fallback
// ============================================================

// Track which method was used (for the UI)
export let tokenSource: "token_vault" | "management_api" | "none" = "none";

let _managementToken: { token: string; expiresAt: number } | null = null;

async function getManagementApiToken(): Promise<string> {
  if (_managementToken && Date.now() < _managementToken.expiresAt) {
    return _managementToken.token;
  }

  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get Management API token");
  }

  _managementToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

async function getUpstreamToken(connection: string): Promise<string | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;

  // === Attempt 1: Token Vault (getAccessTokenForConnection) ===
  try {
    const result = await auth0.getAccessTokenForConnection({
      connection,
      login_hint: session.user.email as string,
    });
    if (result?.token) {
      tokenSource = "token_vault";
      return result.token;
    }
  } catch {
    // Token Vault failed — fall through to Management API
  }

  // === Attempt 2: Management API fallback ===
  try {
    const mgmtToken = await getManagementApiToken();
    const userId = encodeURIComponent(session.user.sub as string);

    const res = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}`,
      { headers: { Authorization: `Bearer ${mgmtToken}` } }
    );

    const user = await res.json();
    const identity = (user.identities || []).find(
      (id: any) => id.connection === connection
    );

    if (identity?.access_token) {
      tokenSource = "management_api";
      return identity.access_token;
    }
  } catch {
    // Management API also failed
  }

  tokenSource = "none";
  return null;
}

// ============================================================
// Gmail API
// ============================================================

export interface EmailSummary {
  totalMessages: number;
  unreadCount: number;
  importantCount: number;
  recentEmails: {
    id: string;
    from: string;
    subject: string;
    snippet: string;
    date: string;
    isUnread: boolean;
    labels: string[];
  }[];
}

export async function fetchGmailData(): Promise<EmailSummary | null> {
  const token = await getUpstreamToken("google-oauth2");
  if (!token) return null;

  try {
    // Get unread email count
    const unreadRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=is:unread",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const unreadData = await unreadRes.json();
    if (unreadData.error) return null;

    // Get recent emails (last 20)
    const messagesRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const messagesData = await messagesRes.json();
    if (messagesData.error) return null;

    const messages = messagesData.messages || [];
    const totalMessages = messagesData.resultSizeEstimate || 0;
    const unreadCount = unreadData.resultSizeEstimate || 0;

    // Fetch details for up to 8 recent emails
    const recentEmails = [];
    for (const msg of messages.slice(0, 8)) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detail = await detailRes.json();

        const headers = detail.payload?.headers || [];
        const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "(no subject)";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";
        const isUnread = (detail.labelIds || []).includes("UNREAD");

        recentEmails.push({
          id: msg.id,
          from: from.replace(/<.*>/, "").trim(),
          subject,
          snippet: detail.snippet || "",
          date: formatEmailDate(date),
          isUnread,
          labels: detail.labelIds || [],
        });
      } catch {
        // Skip individual email errors
      }
    }

    const importantCount = recentEmails.filter((e) =>
      e.labels.includes("IMPORTANT")
    ).length;

    return {
      totalMessages,
      unreadCount,
      importantCount,
      recentEmails,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Google Calendar API
// ============================================================

export interface CalendarSummary {
  todayEvents: {
    id: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    attendeeCount: number;
    status: string;
  }[];
  upcomingCount: number;
}

export async function fetchCalendarData(): Promise<CalendarSummary | null> {
  const token = await getUpstreamToken("google-oauth2");
  if (!token) return null;

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const eventsData = await eventsRes.json();
    if (eventsData.error) return null;

    const events = (eventsData.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "(No title)",
      start: formatEventTime(event.start?.dateTime || event.start?.date || ""),
      end: formatEventTime(event.end?.dateTime || event.end?.date || ""),
      location: event.location,
      attendeeCount: (event.attendees || []).length,
      status: event.status || "confirmed",
    }));

    return {
      todayEvents: events,
      upcomingCount: events.length,
    };
  } catch {
    return null;
  }
}

// ============================================================
// GitHub API
// ============================================================

export interface GitHubSummary {
  recentPRs: {
    id: number;
    title: string;
    repo: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    additions: number;
    deletions: number;
    comments: number;
  }[];
  recentIssues: {
    id: number;
    title: string;
    repo: string;
    state: string;
    createdAt: string;
    url: string;
    labels: string[];
  }[];
  totalPRs: number;
  totalIssues: number;
}

export async function fetchGitHubData(): Promise<GitHubSummary | null> {
  const token = await getUpstreamToken("github");
  if (!token) return null;

  try {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    };

    const prsRes = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=5",
      { headers }
    );
    const repos = await prsRes.json();

    const recentPRs: GitHubSummary["recentPRs"] = [];
    const recentIssues: GitHubSummary["recentIssues"] = [];

    for (const repo of (repos || []).slice(0, 5)) {
      try {
        const prRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=5`,
          { headers }
        );
        const prs = await prRes.json();

        for (const pr of (prs || []).slice(0, 3)) {
          recentPRs.push({
            id: pr.number,
            title: pr.title,
            repo: repo.full_name,
            state: pr.state,
            createdAt: formatGitHubDate(pr.created_at),
            updatedAt: formatGitHubDate(pr.updated_at),
            url: pr.html_url,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            comments: pr.comments || 0,
          });
        }

        const issueRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/issues?state=open&per_page=5`,
          { headers }
        );
        const issues = await issueRes.json();

        for (const issue of (issues || []).filter((i: any) => !i.pull_request).slice(0, 3)) {
          recentIssues.push({
            id: issue.number,
            title: issue.title,
            repo: repo.full_name,
            state: issue.state,
            createdAt: formatGitHubDate(issue.created_at),
            url: issue.html_url,
            labels: (issue.labels || []).map((l: any) => l.name),
          });
        }
      } catch {
        // Skip individual repo errors
      }
    }

    return {
      recentPRs: recentPRs.slice(0, 10),
      recentIssues: recentIssues.slice(0, 10),
      totalPRs: recentPRs.length,
      totalIssues: recentIssues.length,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Generate Dynamic Agent Actions from Real Data
// These simulate what a real AI agent would propose after
// analyzing the user's inbox / calendar overnight.
// ============================================================

export function generateAgentActions(
  gmail: EmailSummary | null,
  calendar: CalendarSummary | null,
  github: GitHubSummary | null
): AgentAction[] {
  const actions: AgentAction[] = [];

  if (gmail) {
    // Count promotional/newsletter-type emails
    const promoEmails = gmail.recentEmails.filter(
      (e) =>
        e.labels.includes("CATEGORY_PROMOTIONS") ||
        e.subject.toLowerCase().includes("newsletter") ||
        e.subject.toLowerCase().includes("unsubscribe") ||
        e.subject.toLowerCase().includes("digest") ||
        e.subject.toLowerCase().includes("weekly")
    );

    if (promoEmails.length > 0) {
      actions.push({
        id: "dyn-promo",
        type: "pending_approval",
        service: "gmail",
        title: `Archive ${promoEmails.length} promotional email${promoEmails.length > 1 ? "s" : ""}`,
        description: `Found ${promoEmails.length} promotional/newsletter emails that match auto-archive patterns. This requires write access to your Gmail.`,
        timestamp: "Agent analyzed at 3:15 AM",
        riskLevel: "medium",
        scope: "gmail.modify",
        details: `Emails from: ${promoEmails.slice(0, 5).map((e) => e.from).join(", ")}${promoEmails.length > 5 ? ` (+${promoEmails.length - 5} more)` : ""}. None flagged as important.`,
      });
    }

    // Unread email batch action
    if (gmail.unreadCount > 10) {
      const oldUnread = gmail.recentEmails.filter((e) => e.isUnread);
      if (oldUnread.length > 3) {
        actions.push({
          id: "dyn-unread",
          type: "pending_approval",
          service: "gmail",
          title: `Mark ${oldUnread.length} low-priority emails as read`,
          description: `You have ${gmail.unreadCount} unread emails. Agent identified ${oldUnread.length} recent low-priority messages that can be marked as read.`,
          timestamp: "Agent analyzed at 3:22 AM",
          riskLevel: "low",
          scope: "gmail.modify",
          details: `Subjects include: ${oldUnread.slice(0, 3).map((e) => `"${e.subject.slice(0, 40)}"`).join(", ")}`,
        });
      }
    }

    // Draft reply suggestion
    const importantUnread = gmail.recentEmails.filter(
      (e) => e.isUnread && e.labels.includes("IMPORTANT")
    );
    if (importantUnread.length > 0) {
      actions.push({
        id: "dyn-reply",
        type: "pending_approval",
        service: "gmail",
        title: `Draft replies for ${importantUnread.length} important email${importantUnread.length > 1 ? "s" : ""}`,
        description: `${importantUnread.length} important unread email${importantUnread.length > 1 ? "s" : ""} detected. Agent can draft response suggestions. Drafts will be saved, not sent.`,
        timestamp: "Agent analyzed at 3:30 AM",
        riskLevel: "medium",
        scope: "gmail.compose",
        details: `From: ${importantUnread.slice(0, 3).map((e) => e.from).join(", ")}`,
      });
    }
  }

  if (calendar) {
    // Meeting prep action
    if (calendar.todayEvents.length > 0) {
      actions.push({
        id: "dyn-meeting-prep",
        type: "pending_approval",
        service: "calendar",
        title: `Prepare briefs for ${calendar.todayEvents.length} meeting${calendar.todayEvents.length > 1 ? "s" : ""} today`,
        description: `You have ${calendar.todayEvents.length} meeting${calendar.todayEvents.length > 1 ? "s" : ""} scheduled today. Agent can generate agendas and talking points by analyzing recent emails.`,
        timestamp: "Agent analyzed at 3:35 AM",
        riskLevel: "low",
        scope: "calendar.readonly",
        details: `Meetings: ${calendar.todayEvents.map((e) => `"${e.title}" at ${e.start}`).join(", ")}`,
      });
    }

    // Detect overlapping events
    if (calendar.todayEvents.length >= 2) {
      actions.push({
        id: "dyn-conflict",
        type: "pending_approval",
        service: "calendar",
        title: `Review ${calendar.todayEvents.length} overlapping time slots`,
        description: `Multiple meetings detected today. Agent recommends reviewing your schedule for potential conflicts and suggesting breaks.`,
        timestamp: "Agent analyzed at 3:40 AM",
        riskLevel: "high",
        scope: "calendar.events.write",
        details: `Schedule: ${calendar.todayEvents.map((e) => `${e.title} (${e.start}-${e.end})`).join(", ")}`,
      });
    }
  }

  if (github) {
    // PR review suggestions
    if (github.totalPRs > 0) {
      actions.push({
        id: "dyn-pr-review",
        type: "pending_approval",
        service: "github",
        title: `Review ${github.totalPRs} open pull request${github.totalPRs > 1 ? "s" : ""}`,
        description: `Agent found ${github.totalPRs} open PR${github.totalPRs > 1 ? "s" : ""} across your repos. Can generate summaries and flag potential issues.`,
        timestamp: "Agent analyzed at 3:45 AM",
        riskLevel: "low",
        scope: "repo:read",
        details: `PRs: ${github.recentPRs.slice(0, 3).map((pr) => `#${pr.id} "${pr.title}" in ${pr.repo}`).join(", ")}`,
      });
    }
  }

  // Always include a CIBA permission request action
  actions.push({
    id: "dyn-ciba",
    type: "needs_auth",
    service: "github",
    title: "New permission: Auto-label stale issues",
    description:
      "Agent wants to label issues with no activity for 30+ days as 'needs-attention'. This requires 'repo:write' permission which was not previously granted.",
    timestamp: "Agent analyzed at 3:50 AM",
    riskLevel: "high",
    scope: "repo:write",
    details:
      "Granting this permission allows the agent to add labels on your repositories. The agent will never close issues without explicit approval.",
  });

  return actions;
}

// ============================================================
// Helpers
// ============================================================

function formatEmailDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatEventTime(dateStr: string): string {
  try {
    if (!dateStr.includes("T")) return "All day";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatGitHubDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
