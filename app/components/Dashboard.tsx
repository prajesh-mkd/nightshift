"use client";

import { useState } from "react";
import styles from "../page.module.css";
import {
  mockActions,
  getServiceIcon,
  type AgentAction,
} from "../lib/mock-data";
import type { EmailSummary, CalendarSummary, GitHubSummary } from "../lib/services";

interface DashboardProps {
  user: {
    name?: string;
    email?: string;
    picture?: string;
    sub?: string;
  };
  connections: {
    google: boolean;
    github: boolean;
  };
  liveData: {
    gmail: EmailSummary | null;
    calendar: CalendarSummary | null;
    github: GitHubSummary | null;
  };
}

export default function Dashboard({ user, connections, liveData }: DashboardProps) {
  const [modalAction, setModalAction] = useState<AgentAction | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set());

  // Build actions from real data + mock pending/auth actions
  const pendingActions = mockActions.filter(
    (a) => a.type === "pending_approval" && !approvedIds.has(a.id) && !deniedIds.has(a.id)
  );
  const authActions = mockActions.filter(
    (a) => a.type === "needs_auth" && !approvedIds.has(a.id) && !deniedIds.has(a.id)
  );

  // Compute real stats
  const emailsTriaged = liveData.gmail?.totalMessages || 0;
  const unreadEmails = liveData.gmail?.unreadCount || 0;
  const meetingsToday = liveData.calendar?.todayEvents?.length || 0;
  const prsOpen = liveData.github?.totalPRs || 0;
  const issuesOpen = liveData.github?.totalIssues || 0;

  function handleApprove(action: AgentAction) {
    setModalAction(action);
  }

  function handleConfirmApproval() {
    if (modalAction) {
      setApprovedIds((prev) => new Set(prev).add(modalAction.id));
      setModalAction(null);
    }
  }

  function handleDeny(actionId: string) {
    setDeniedIds((prev) => new Set(prev).add(actionId));
  }

  const firstName = user.name?.split(" ")[0] || "there";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build a dynamic summary
  const summaryParts: string[] = [];
  if (liveData.gmail) summaryParts.push(`${unreadEmails} unread emails (${emailsTriaged} total in inbox)`);
  if (liveData.calendar) summaryParts.push(`${meetingsToday} meeting${meetingsToday !== 1 ? "s" : ""} today`);
  if (liveData.github) summaryParts.push(`${prsOpen} open PR${prsOpen !== 1 ? "s" : ""} and ${issuesOpen} issue${issuesOpen !== 1 ? "s" : ""}`);
  const summary = summaryParts.length > 0
    ? `Here's what's happening: ${summaryParts.join(", ")}. All data fetched securely via Auth0 Token Vault.`
    : "Connect your services above to see real-time data from your accounts.";

  return (
    <>
      {/* Header */}
      <header className={styles.header}>
        <div className={`container ${styles.header__inner}`}>
          <div className={styles.header__brand}>
            <div className={styles.header__logo}>🌙</div>
            <div>
              <div className={styles.header__title}>NightShift</div>
              <div className={styles.header__subtitle}>
                AI That Works While You Sleep
              </div>
            </div>
          </div>
          <div className={styles.header__user}>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className={styles.header__avatar}
              />
            )}
            <span className={styles.header__name}>{user.name || user.email}</span>
            <a href="/auth/logout" className={styles.header__logout}>
              Sign Out
            </a>
          </div>
        </div>
      </header>

      <main className="container">
        {/* Morning Brief */}
        <section className={`${styles.brief} animate-fade-in`}>
          <h1 className={styles.brief__greeting}>Good morning, {firstName} ☀️</h1>
          <p className={styles.brief__date}>{currentDate}</p>
          <p className={styles.brief__summary}>{summary}</p>
        </section>

        {/* Connection Status */}
        <div className={`${styles["connection-status"]} animate-fade-in`}>
          <div className={styles["connection-status__title"]}>🔗 Connected Services via Token Vault</div>
          <div className={styles["connection-status__grid"]}>
            <div className={`${styles["connection-chip"]} ${connections.google ? styles["connection-chip--active"] : ""}`}>
              <span>📧</span>
              <span>Google</span>
              {connections.google ? (
                <span className={styles["connection-chip__badge"]}>✓ Connected</span>
              ) : (
                <a href="/auth/connect?connection=google-oauth2" className={styles["connection-chip__link"]}>Connect</a>
              )}
            </div>
            <div className={`${styles["connection-chip"]} ${connections.github ? styles["connection-chip--active"] : ""}`}>
              <span>🐙</span>
              <span>GitHub</span>
              {connections.github ? (
                <span className={styles["connection-chip__badge"]}>✓ Connected</span>
              ) : (
                <a href="/auth/login?connection=github" className={styles["connection-chip__link"]}>Connect</a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className={`${styles.stats} stagger`}>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{emailsTriaged}</div>
            <div className={styles["stat-card__label"]}>Emails in Inbox</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{unreadEmails}</div>
            <div className={styles["stat-card__label"]}>Unread Emails</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{meetingsToday}</div>
            <div className={styles["stat-card__label"]}>Meetings Today</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{prsOpen}</div>
            <div className={styles["stat-card__label"]}>Open PRs</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{issuesOpen}</div>
            <div className={styles["stat-card__label"]}>Open Issues</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-card__value"]}>{pendingActions.length + authActions.length}</div>
            <div className={styles["stat-card__label"]}>Pending Actions</div>
          </div>
        </section>

        {/* Agent Run Banner */}
        <div className={`${styles["run-banner"]} animate-fade-in`}>
          <div className={styles["run-banner__left"]}>
            <span className={styles["run-banner__icon"]}>⚡</span>
            <span className={styles["run-banner__text"]}>
              <strong>Live data from Token Vault.</strong> Connected to{" "}
              {connections.google && <><strong>Gmail</strong>, <strong>Google Calendar</strong></>}
              {connections.google && connections.github && " and "}
              {connections.github && <strong>GitHub</strong>}
              {" "}via Auth0 Token Vault. All tokens
              exchanged securely — no credentials exposed to the agent.
            </span>
          </div>
          <span className={styles["run-banner__time"]}>
            🔒 Token Vault
          </span>
        </div>

        {/* Today's Calendar */}
        {liveData.calendar && liveData.calendar.todayEvents.length > 0 && (
          <section className={`${styles["day-ahead"]} animate-fade-in`}>
            <h3 className={styles["day-ahead__title"]}>📋 Today&apos;s Calendar ({liveData.calendar.todayEvents.length} events)</h3>
            <ul className={styles["day-ahead__list"]}>
              {liveData.calendar.todayEvents.map((event) => (
                <li key={event.id} className={styles["day-ahead__item"]}>
                  {event.start} — {event.title}
                  {event.attendeeCount > 0 && ` (${event.attendeeCount} attendees)`}
                  {event.location && ` 📍 ${event.location}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recent Emails */}
        {liveData.gmail && liveData.gmail.recentEmails.length > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              ✉️ Recent Emails
              <span className={styles["section-title__count"]}>
                {liveData.gmail.unreadCount} unread
              </span>
            </h2>
            <div className={`${styles["action-list"]} stagger`}>
              {liveData.gmail.recentEmails.slice(0, 8).map((email) => (
                <div
                  key={email.id}
                  className={`${styles["action-card"]} ${
                    email.isUnread ? styles["action-card--pending"] : styles["action-card--completed"]
                  }`}
                >
                  <div className={styles["action-card__header"]}>
                    <div className={styles["action-card__header-left"]}>
                      <div className={styles["action-card__icon"]}>✉️</div>
                      <div className={styles["action-card__title"]}>{email.subject}</div>
                    </div>
                    <div className={styles["action-card__meta"]}>
                      {email.isUnread && (
                        <span className="badge badge--warning">Unread</span>
                      )}
                      <span className={styles["action-card__time"]}>{email.date}</span>
                    </div>
                  </div>
                  <p className={styles["action-card__description"]}>
                    From: {email.from} — {email.snippet}
                  </p>
                  <div className={styles["action-card__footer"]}>
                    <span className={styles["action-card__scope"]}>scope: gmail.readonly</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GitHub PRs */}
        {liveData.github && liveData.github.recentPRs.length > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              💻 Open Pull Requests
              <span className={styles["section-title__count"]}>
                {liveData.github.totalPRs}
              </span>
            </h2>
            <div className={`${styles["action-list"]} stagger`}>
              {liveData.github.recentPRs.map((pr) => (
                <div key={`${pr.repo}-${pr.id}`} className={`${styles["action-card"]} ${styles["action-card--completed"]}`}>
                  <div className={styles["action-card__header"]}>
                    <div className={styles["action-card__header-left"]}>
                      <div className={styles["action-card__icon"]}>💻</div>
                      <div className={styles["action-card__title"]}>#{pr.id} — {pr.title}</div>
                    </div>
                    <div className={styles["action-card__meta"]}>
                      <span className="badge badge--success">Open</span>
                      <span className={styles["action-card__time"]}>{pr.createdAt}</span>
                    </div>
                  </div>
                  <p className={styles["action-card__description"]}>
                    {pr.repo} · +{pr.additions} -{pr.deletions} · {pr.comments} comments
                  </p>
                  <div className={styles["action-card__footer"]}>
                    <span className={styles["action-card__scope"]}>scope: repo:read</span>
                    <a href={pr.url} target="_blank" rel="noopener" className="btn btn--ghost btn--sm">View on GitHub →</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GitHub Issues */}
        {liveData.github && liveData.github.recentIssues.length > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              🐛 Open Issues
              <span className={styles["section-title__count"]}>
                {liveData.github.totalIssues}
              </span>
            </h2>
            <div className={`${styles["action-list"]} stagger`}>
              {liveData.github.recentIssues.map((issue) => (
                <div key={`${issue.repo}-${issue.id}`} className={`${styles["action-card"]} ${styles["action-card--auth"]}`}>
                  <div className={styles["action-card__header"]}>
                    <div className={styles["action-card__header-left"]}>
                      <div className={styles["action-card__icon"]}>🐛</div>
                      <div className={styles["action-card__title"]}>#{issue.id} — {issue.title}</div>
                    </div>
                    <div className={styles["action-card__meta"]}>
                      {issue.labels.map((label) => (
                        <span key={label} className="badge badge--auth">{label}</span>
                      ))}
                      <span className={styles["action-card__time"]}>{issue.createdAt}</span>
                    </div>
                  </div>
                  <p className={styles["action-card__description"]}>{issue.repo}</p>
                  <div className={styles["action-card__footer"]}>
                    <span className={styles["action-card__scope"]}>scope: repo:read</span>
                    <a href={issue.url} target="_blank" rel="noopener" className="btn btn--ghost btn--sm">View on GitHub →</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending Approval (Step-Up Auth) */}
        {pendingActions.length > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              ⏳ Pending Your Approval
              <span className={styles["section-title__count"]}>
                {pendingActions.length}
              </span>
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "var(--space-lg)",
                marginTop: "calc(var(--space-lg) * -1 + var(--space-sm))",
              }}
            >
              These actions require Step-Up Authentication (MFA) before the
              agent can execute them.
            </p>
            <div className={`${styles["action-list"]} stagger`}>
              {pendingActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  variant="pending"
                  expanded={expandedId === action.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === action.id ? null : action.id)
                  }
                  onApprove={() => handleApprove(action)}
                  onDeny={() => handleDeny(action.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Needs Authorization (CIBA) */}
        {authActions.length > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              🔐 New Permission Requests
              <span className={styles["section-title__count"]}>
                {authActions.length}
              </span>
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "var(--space-lg)",
                marginTop: "calc(var(--space-lg) * -1 + var(--space-sm))",
              }}
            >
              The agent discovered it needs permissions it doesn&apos;t have. These
              were queued via{" "}
              <strong style={{ color: "var(--status-auth)" }}>
                Auth0 CIBA (Async Authorization)
              </strong>{" "}
              while you were offline.
            </p>
            <div className={`${styles["action-list"]} stagger`}>
              {authActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  variant="auth"
                  expanded={expandedId === action.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === action.id ? null : action.id)
                  }
                  onApprove={() => handleApprove(action)}
                  onDeny={() => handleDeny(action.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Approved Actions */}
        {approvedIds.size > 0 && (
          <section className={styles["actions-section"]}>
            <h2 className={styles["section-title"]}>
              ✅ Just Approved
              <span className={styles["section-title__count"]}>
                {approvedIds.size}
              </span>
            </h2>
            <div className={`${styles["action-list"]} stagger`}>
              {mockActions
                .filter((a) => approvedIds.has(a.id))
                .map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    variant="completed"
                    expanded={false}
                    onToggleExpand={() => {}}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footer__text}>
            Secured by{" "}
            <a
              href="https://auth0.com/features/token-vault"
              target="_blank"
              rel="noopener"
              className={styles.footer__link}
            >
              Auth0 Token Vault
            </a>{" "}
            • CIBA Async Authorization • Step-Up Authentication
          </p>
          <div className={styles["auth0-badge"]}>
            <span>🛡️</span>
            <span className={styles["auth0-badge__text"]}>
              Auth0 for AI Agents — Zero credentials exposed to the LLM
            </span>
          </div>
        </footer>
      </main>

      {/* Step-Up Auth / CIBA Modal */}
      {modalAction && (
        <div
          className={styles["modal-overlay"]}
          onClick={() => setModalAction(null)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${styles.modal__icon} ${
                modalAction.type === "needs_auth"
                  ? styles["modal__icon--auth"]
                  : styles["modal__icon--warning"]
              }`}
            >
              {modalAction.type === "needs_auth" ? "🔐" : "⚠️"}
            </div>
            <h3 className={styles.modal__title}>
              {modalAction.type === "needs_auth"
                ? "Grant New Permission"
                : "Approve Action"}
            </h3>
            <p className={styles.modal__description}>
              {modalAction.type === "needs_auth"
                ? `The agent is requesting a new permission scope it doesn't currently have. This was queued via Auth0 CIBA while you were offline.`
                : `This action requires elevated permissions. Auth0 Step-Up Authentication is required to proceed.`}
            </p>

            <div className={styles["modal__scope-box"]}>
              <div className={styles["modal__scope-label"]}>
                Requested Scope
              </div>
              <div className={styles["modal__scope-value"]}>
                {modalAction.scope}
              </div>
            </div>

            <div className={styles["modal__scope-box"]}>
              <div className={styles["modal__scope-label"]}>
                What This Allows
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {modalAction.details || modalAction.description}
              </div>
            </div>

            {/* Simulated MFA */}
            <div className={styles["modal__mfa-prompt"]}>
              <div className={styles["modal__mfa-title"]}>
                🔒 Auth0 Multi-Factor Authentication
              </div>
              <div className={styles["modal__mfa-code"]}>
                {["4", "7", "2", "9", "1", "5"].map((d, i) => (
                  <div key={i} className={styles["modal__mfa-digit"]}>
                    {d}
                  </div>
                ))}
              </div>
              <div className={styles["modal__mfa-subtitle"]}>
                Verification code auto-filled from authenticator
              </div>
            </div>

            <div className={styles.modal__buttons}>
              <button
                className="btn btn--danger"
                onClick={() => {
                  handleDeny(modalAction.id);
                  setModalAction(null);
                }}
              >
                Deny
              </button>
              <button
                className="btn btn--success"
                onClick={handleConfirmApproval}
              >
                ✓ Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===== Action Card Component ===== */

function ActionCard({
  action,
  variant,
  expanded,
  onToggleExpand,
  onApprove,
  onDeny,
}: {
  action: AgentAction;
  variant: "completed" | "pending" | "auth";
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}) {
  return (
    <div
      className={`${styles["action-card"]} ${
        variant === "completed"
          ? styles["action-card--completed"]
          : variant === "pending"
          ? styles["action-card--pending"]
          : styles["action-card--auth"]
      }`}
    >
      <div className={styles["action-card__header"]}>
        <div className={styles["action-card__header-left"]}>
          <div className={styles["action-card__icon"]}>
            {getServiceIcon(action.service)}
          </div>
          <div className={styles["action-card__title"]}>{action.title}</div>
        </div>
        <div className={styles["action-card__meta"]}>
          {action.riskLevel === "high" && (
            <span className="badge badge--danger">High Risk</span>
          )}
          {action.riskLevel === "medium" && (
            <span className="badge badge--warning">Medium Risk</span>
          )}
          {variant === "completed" && (
            <span className="badge badge--success">Done</span>
          )}
          {variant === "pending" && (
            <span className="badge badge--warning">Needs Approval</span>
          )}
          {variant === "auth" && (
            <span className="badge badge--auth">CIBA Request</span>
          )}
          <span className={styles["action-card__time"]}>
            {action.timestamp}
          </span>
        </div>
      </div>

      <p className={styles["action-card__description"]}>
        {action.description}
      </p>

      <div className={styles["action-card__footer"]}>
        <span className={styles["action-card__scope"]}>
          scope: {action.scope}
        </span>
        <div className={styles["action-card__actions"]}>
          {action.details && (
            <button className="btn btn--ghost btn--sm" onClick={onToggleExpand}>
              {expanded ? "Hide Details" : "Details"}
            </button>
          )}
          {(variant === "pending" || variant === "auth") && onApprove && (
            <>
              <button
                className="btn btn--danger btn--sm"
                onClick={() => onDeny?.()}
              >
                Deny
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={onApprove}
              >
                {variant === "auth" ? "Grant Permission" : "Approve"}
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && action.details && (
        <div className={styles["action-card__details"]}>
          <div className={styles["action-card__details-label"]}>
            Additional Details
          </div>
          {action.details}
        </div>
      )}
    </div>
  );
}
