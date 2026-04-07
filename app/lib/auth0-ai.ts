import { Auth0AI, getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { getRefreshToken } from "./auth0";

// Get the access token for a connection via Auth0 Token Vault
export const getAccessToken = async () => getAccessTokenFromTokenVault();

const auth0AI = new Auth0AI();

// ============================================================
// Google Connection — Gmail + Calendar via Token Vault
// ============================================================

export const withGoogleConnection = auth0AI.withTokenVault({
  connection: "google-oauth2",
  scopes: [
    "openid",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ],
  refreshToken: getRefreshToken,
});

// ============================================================
// GitHub Connection — Repos, PRs, Issues via Token Vault
// ============================================================

export const withGitHubConnection = auth0AI.withTokenVault({
  connection: "github",
  // GitHub scopes are set at the GitHub App level, not here
  scopes: [],
  refreshToken: getRefreshToken,
});
