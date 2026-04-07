// Real API services — fetches data from Google and GitHub
// using upstream access tokens from Auth0 Management API

import { auth0 } from "./auth0";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;

// ============================================================
// Token Retrieval via Auth0 Management API
// Gets the upstream provider access token stored on the user profile
// ============================================================

let _managementToken: { token: string; expiresAt: number } | null = null;

async function getManagementApiToken(): Promise<string> {
  // Cache the token so we don't request one every page load
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
    console.warn("[Management API] Failed to get token:", data);
    throw new Error("Failed to get Management API token");
  }

  _managementToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

async function getUpstreamToken(connection: string): Promise<string | null> {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) return null;

    const mgmtToken = await getManagementApiToken();
    const userId = encodeURIComponent(session.user.sub as string);

    const res = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}`,
      {
        headers: { Authorization: `Bearer ${mgmtToken}` },
      }
    );

    const user = await res.json();

    // Find the identity matching the requested connection
    const identity = (user.identities || []).find(
      (id: any) => id.connection === connection
    );

    if (!identity?.access_token) {
      return null;
    }

    return identity.access_token;
  } catch (error) {
    console.warn(`[Auth] Error getting upstream token for ${connection}`);
    return null;
  }
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

    // Get recent emails (last 20)
    const messagesRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const messagesData = await messagesRes.json();

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
  } catch (error) {
    console.warn("[Gmail API] Error fetching data.");
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
  } catch (error) {
    console.warn("[Calendar API] Error fetching data.");
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
  } catch (error) {
    console.warn("[GitHub API] Error fetching data.");
    return null;
  }
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
