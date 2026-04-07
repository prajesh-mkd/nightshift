import { auth0 } from "./lib/auth0";
import { fetchGmailData, fetchCalendarData, fetchGitHubData, tokenSource } from "./lib/services";
import Dashboard from "./components/Dashboard";
import LoginPage from "./components/LoginPage";

export default async function Home() {
  const session = await auth0.getSession();

  // If not authenticated, show login page
  if (!session) {
    return <LoginPage />;
  }

  const user = session.user;
  
  // Detect which provider the user logged in with
  const isGoogleUser = user.sub?.startsWith("google-oauth2|") || false;
  const isGitHubUser = user.sub?.startsWith("github|") || false;

  // Fetch real data from connected services via Token Vault
  // We still fetch some real data just to prove Token Vault works
  const [gmailData, calendarData, gitHubData] = await Promise.all([
    isGoogleUser ? fetchGmailData().catch(() => null) : null,
    isGoogleUser ? fetchCalendarData().catch(() => null) : null,
    isGitHubUser ? fetchGitHubData().catch(() => null) : null,
  ]);

  return (
    <Dashboard
      user={{
        name: user.name as string | undefined,
        email: user.email as string | undefined,
        picture: user.picture as string | undefined,
        sub: user.sub as string | undefined,
      }}
      connections={{
        google: isGoogleUser,
        github: isGitHubUser,
      }}
      liveData={{
        gmail: gmailData,
        calendar: calendarData,
        github: gitHubData,
      }}
      tokenSource={tokenSource}
    />
  );
}
