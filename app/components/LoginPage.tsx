"use client";

import styles from "../page.module.css";

export default function LoginPage() {
  return (
    <div className={styles["login-page"]}>
      <div className={styles["login-page__bg"]}>
        <div className={styles["login-page__orb1"]} />
        <div className={styles["login-page__orb2"]} />
        <div className={styles["login-page__orb3"]} />
      </div>
      <div className={styles["login-card"]}>
        <div className={styles["login-card__logo"]}>🛡️</div>
        <h1 className={styles["login-card__title"]}>NightShift</h1>
        <p className={styles["login-card__subtitle"]}>Zero-Trust AI Firewall</p>
        <p className={styles["login-card__description"]}>
          An interactive simulator demonstrating secure AI agent delegation. NightShift uses Auth0 Token Vault to strictly enforce least-privilege access, block rogue actions, and securely escalate privileges.
        </p>
        <a href="/auth/login" className={styles["login-card__button"]}>
          <span className={styles["login-card__button-icon"]}>🔐</span>
          Sign in with Auth0
        </a>
        <div className={styles["login-card__features"]}>
          <div className={styles["login-card__feature"]}>
            <span>🔒</span>
            <span>Token Vault</span>
          </div>
          <div className={styles["login-card__feature"]}>
            <span>📱</span>
            <span>CIBA</span>
          </div>
          <div className={styles["login-card__feature"]}>
            <span>🛡️</span>
            <span>Step-Up Auth</span>
          </div>
        </div>
        <p className={styles["login-card__footer"]}>
          Secured by <strong>Auth0 for AI Agents</strong>
        </p>
      </div>
    </div>
  );
}
