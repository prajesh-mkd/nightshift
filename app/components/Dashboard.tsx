"use client";

import { useState, useRef, useEffect } from "react";
import styles from "../page.module.css";
import type { AgentAction } from "../lib/mock-data";
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
  tokenSource: "token_vault" | "management_api" | "none";
}

type TerminalLog = {
  type: 'cmd' | 'sys' | 'vault' | 'authz' | 'err' | 'warn';
  text: string;
};

export default function Dashboard({ user, connections, liveData, tokenSource }: DashboardProps) {
  const [logs, setLogs] = useState<TerminalLog[]>([
    { type: 'sys', text: 'NightShift OS v2.0 Sandbox initialized.' },
    { type: 'sys', text: 'Waiting for agent instructions...' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AgentAction[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: TerminalLog['type'], text: string) => {
    setLogs(prev => [...prev, { type, text }]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runSafeGoogleTask = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    addLog('cmd', '> user_exec: --task "read_latest_email"');
    await sleep(600);
    addLog('sys', '[SYS] Initializing routine wrapper...');
    await sleep(400);
    addLog('vault', '[VAULT] Exchanging Auth0 session for upstream google-oauth2 token.');
    await sleep(800);
    
    if (connections.google) {
      addLog('authz', '[AUTHZ] Token retrieved successfully from Token Vault.');
      await sleep(500);
      addLog('sys', '[SYS] Validating scope requirements: [gmail.readonly]');
      await sleep(400);
      addLog('authz', '[AUTHZ] Granted. Executing API call to https://gmail.googleapis.com...');
      await sleep(800);
      
      const subject = liveData.gmail?.recentEmails[0]?.subject || "Welcome to Auth0!";
      addLog('sys', `[SUCCESS] Retrieved latest email subject: "${subject}"`);
    } else {
      addLog('err', '[ERROR] No google-oauth2 identity found in Token Vault. Please connect Google.');
    }
    
    addLog('sys', 'Task execution completed.');
    setIsExecuting(false);
  };

  const runRogueGoogleTask = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    addLog('cmd', '> user_exec: --task "delete_all_promotions"');
    await sleep(600);
    addLog('sys', '[SYS] Analyzing task requirements...');
    await sleep(400);
    addLog('vault', '[VAULT] Fetching active google-oauth2 token...');
    await sleep(800);

    if (connections.google) {
      addLog('sys', '[SYS] Identity established. Initiating batch API sequence.');
      await sleep(600);
      addLog('sys', '[SYS] Pre-flight scope check: action requires [gmail.modify]');
      await sleep(800);
      addLog('err', '⛔ [AUTHZ DENIED] Token Vault identity holds scopes: [openid, profile, email, gmail.readonly, offline_access]');
      await sleep(600);
      addLog('warn', '[SYS] Automatic mitigation: Halting destructive action.');
      await sleep(500);
      addLog('sys', '[SYS] Queuing payload for user Step-Up Authentication...');
      
      setPendingRequests(prev => [...prev, {
        id: `rogue-${Date.now()}`,
        type: 'pending_approval',
        service: 'gmail',
        title: 'Elevate privileges to batch delete emails',
        description: 'The agent attempted to execute a batch delete routine but lacks required scopes.',
        timestamp: new Date().toLocaleTimeString(),
        riskLevel: 'high',
        scope: 'gmail.modify',
        details: 'Blocked Action: POST /gmail/v1/users/me/messages/batchDelete'
      }]);
    } else {
      addLog('err', '[ERROR] Not connected to Google.');
    }

    addLog('sys', 'Task execution terminated prematurely.');
    setIsExecuting(false);
  };

  const runSafeGitHubTask = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    addLog('cmd', '> user_exec: --task "audit_open_prs"');
    await sleep(600);
    addLog('vault', '[VAULT] Checking Auth0 repository for github tokens...');
    await sleep(800);

    if (connections.github) {
      addLog('authz', '[AUTHZ] Valid Token Vault entry found for github.');
      await sleep(500);
      addLog('sys', '[SYS] Scope check: [repo:read] - APPROVED.');
      await sleep(600);
      addLog('sys', `[SUCCESS] Discovered ${liveData.github?.totalPRs || 0} open pull requests requiring review.`);
    } else {
      addLog('err', '[ERROR] GitHub connection not established.');
    }

    addLog('sys', 'Task execution completed.');
    setIsExecuting(false);
  };

  const runRogueGitHubTask = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    addLog('cmd', '> user_exec: --task "delete_production_branch"');
    await sleep(600);
    addLog('sys', '[SYS] Initializing destructive git operations...');
    await sleep(500);
    addLog('vault', '[VAULT] Fetching active GitHub token from Auth0...');
    await sleep(600);

    if (connections.github) {
      addLog('sys', '[SYS] Attempting to execute: git push origin --delete main');
      await sleep(700);
      addLog('err', '⛔ [AUTHZ DENIED] Action requires elevated repository scopes.');
      await sleep(500);
      addLog('err', '[FATAL] Missing required scope: [repo]');
      await sleep(500);
      addLog('warn', '[SYS] Engaging fail-safe. Initiating CIBA request over secure channel.');

      setPendingRequests(prev => [...prev, {
        id: `rogue-gh-${Date.now()}`,
        type: 'needs_auth',
        service: 'github',
        title: 'New Permission: Full Repository Access (Destructive)',
        description: 'Agent requires the root "repo" scope to delete branches. This is a highly dangerous action.',
        timestamp: new Date().toLocaleTimeString(),
        riskLevel: 'high',
        scope: 'repo',
        details: 'Blocked by Auth0 Token Vault strict scope enforcement.'
      }]);
    } else {
      addLog('err', '[ERROR] Cross-platform bridge failed: Missing GitHub connection.');
    }

    addLog('sys', 'Task execution terminated prematurely.');
    setIsExecuting(false);
  };

  const removePending = (id: string, action: 'approve' | 'deny') => {
    addLog('sys', `> user_auth: --interaction "${action}" --target "${id}"`);
    setPendingRequests(prev => prev.filter(req => req.id !== id));
    setTimeout(() => {
      if (action === 'approve') {
        addLog('authz', `[AUTHZ] Step-Up Authentication successful. Privilege escalated.`);
      } else {
        addLog('warn', `[SYS] Authorization denied by user. Task permanently aborted.`);
      }
    }, 500);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.header__inner}`}>
          <div className={styles.header__brand}>
            <div className={styles.header__logo}>🛡️</div>
            <div>
              <div className={styles.header__title}>Zero-Trust AI Sandbox</div>
              <div className={styles.header__subtitle}>
                Powered by Auth0 Token Vault
              </div>
            </div>
          </div>
          <div className={styles.header__user}>
             {user.picture && (
              <img src={user.picture} alt="User" className={styles.header__avatar} />
            )}
            <span className={styles.header__name}>{user.name || user.email}</span>
            <a href="/auth/logout" className={styles.header__logout}>Sign Out</a>
          </div>
        </div>
      </header>

      <main className="container">
        
        {/* Connection Status */}
        <div className={`${styles["connection-status"]} animate-fade-in`} style={{ marginTop: 'var(--space-2xl)'}}>
          <div className={styles["connection-status__title"]}>🔗 Active Identities in Token Vault</div>
          <div className={styles["connection-status__grid"]}>
            <div className={`${styles["connection-chip"]} ${connections.google ? styles["connection-chip--active"] : ""}`}>
              <span>📧</span>
              <span>Google</span>
              {connections.google ? (
                <span className={styles["connection-chip__badge"]}>✓ Connected</span>
              ) : (
                <a href="/auth/login?connection=google-oauth2" className={styles["connection-chip__link"]}>Connect</a>
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
          <p style={{ marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Agents currently only possess <strong>read-only</strong> scopes for connected accounts.
          </p>
        </div>

        {/* Task Simulator */}
        <section className={`${styles.simulator} animate-fade-in`}>
          <h2 className={styles["simulator-title"]}>Agent Task Simulator</h2>
          <p className={styles["simulator-desc"]}>
            Execute tasks below to watch how Auth0 Token Vault dynamically enforces permission boundaries and prevents unauthorized access.
          </p>
          
          <div className={styles["command-grid"]}>
            {!connections.google && !connections.github && (
              <p style={{ color: "var(--text-muted)", gridColumn: "1 / -1", padding: "var(--space-lg) 0" }}>
                Please connect an identity in the section above to simulate tasks.
              </p>
            )}
            
            {connections.google && (
              <>
                <button className={`${styles["command-btn"]} ${styles["command-btn--safe"]}`} onClick={runSafeGoogleTask} disabled={isExecuting}>
                  <span className={styles["command-title"]}>▶ Read Latest Email</span>
                  <span className={styles["command-scope"]}>Required: gmail.readonly</span>
                </button>
                <button className={`${styles["command-btn"]} ${styles["command-btn--rogue"]}`} onClick={runRogueGoogleTask} disabled={isExecuting}>
                  <span className={styles["command-title"]}>▶ Archive Promotions</span>
                  <span className={styles["command-scope"]}>Required: gmail.modify</span>
                </button>
              </>
            )}

            {connections.github && (
              <>
                <button className={`${styles["command-btn"]} ${styles["command-btn--safe"]}`} onClick={runSafeGitHubTask} disabled={isExecuting}>
                  <span className={styles["command-title"]}>▶ Audit Open PRs</span>
                  <span className={styles["command-scope"]}>Required: repo:read</span>
                </button>
                <button className={`${styles["command-btn"]} ${styles["command-btn--rogue"]}`} onClick={runRogueGitHubTask} disabled={isExecuting}>
                  <span className={styles["command-title"]}>▶ Delete Prod Branch</span>
                  <span className={styles["command-scope"]}>Required: repo</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Live Terminal */}
        <section className={`${styles.terminal} animate-fade-in`}>
          <div className={styles["terminal-header"]}>
            <div className={styles["terminal-buttons"]}>
              <div className={`${styles["terminal-btn"]} ${styles.close}`}></div>
              <div className={`${styles["terminal-btn"]} ${styles.min}`}></div>
              <div className={`${styles["terminal-btn"]} ${styles.max}`}></div>
            </div>
            <div className={styles["terminal-title"]}>authz-agent-audit-log.sh</div>
          </div>
          <div className={styles["terminal-body"]}>
            {logs.map((log, i) => (
              <div key={i} className={`${styles["terminal-line"]} ${styles[`term-${log.type}`]}`}>
                {log.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </section>

        {/* Pending Authentication Requests */}
        {pendingRequests.length > 0 && (
          <section className={styles["actions-section"]} style={{ marginTop: 'var(--space-2xl)' }}>
            <h2 className={styles["section-title"]}>
              🔐 Pending Step-Up Auth
              <span className={styles["section-title__count"]}>
                {pendingRequests.length}
              </span>
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "var(--space-lg)" }}>
              The agent was blocked by Token Vault. You must explicitly grant these elevated privileges via Step-Up Authentication.
            </p>
            <div className={`${styles["action-list"]} stagger`}>
              {pendingRequests.map((action) => (
                <div key={action.id} className={`${styles["action-card"]} ${styles["action-card--pending"]}`}>
                  <div className={styles["action-card__header"]}>
                    <div className={styles["action-card__header-left"]}>
                      <div className={styles["action-card__icon"]}>⚠️</div>
                      <div className={styles["action-card__title"]}>{action.title}</div>
                    </div>
                    <div className={styles["action-card__meta"]}>
                      <span className="badge badge--warning">{action.riskLevel.toUpperCase()} RISK</span>
                    </div>
                  </div>
                  <p className={styles["action-card__description"]}>{action.description}</p>
                  <div className={styles["action-card__footer"]} style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles["action-card__scope"]}>Target Scope: {action.scope}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn--outline btn--sm" onClick={() => removePending(action.id, 'deny')}>Deny</button>
                      <button className="btn btn--primary btn--sm" onClick={() => removePending(action.id, 'approve')}>Grant Authorization</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer} style={{ marginTop: 'var(--space-2xl)' }}>
        <p>Secured by <strong>Auth0 Token Vault</strong> • CIBA Async Authorization • Step-Up Authentication</p>
      </footer>
    </>
  );
}
