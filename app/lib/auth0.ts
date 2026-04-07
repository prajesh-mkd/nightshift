import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Create an Auth0 Client for server-side session management
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email offline_access",
    // Force Google to issue a refresh token for Token Vault
    access_type: "offline",
    prompt: "consent",
  },
  // Enable Connected Accounts endpoint for Token Vault
  enableConnectAccountEndpoint: true,
});

// Get the refresh token from Auth0 session (used by Token Vault)
export const getRefreshToken = async () => {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken;
};

// Get the access token from Auth0 session
export const getAccessToken = async () => {
  const tokenResult = await auth0.getAccessToken();
  if (!tokenResult || !tokenResult.token) {
    throw new Error("No access token found in Auth0 session");
  }
  return tokenResult.token;
};
