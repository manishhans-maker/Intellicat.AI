import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

const OAUTH_FILE = path.join(process.cwd(), ".github_oauth.json");

let runtimeClientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || "").trim();
let runtimeClientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || "").trim();

function loadPersistedOAuthCreds() {
  if (!runtimeClientId || !runtimeClientSecret) {
    try {
      if (fs.existsSync(OAUTH_FILE)) {
        const raw = fs.readFileSync(OAUTH_FILE, "utf-8");
        const data = JSON.parse(raw);
        if (data.clientId && !runtimeClientId) runtimeClientId = String(data.clientId).trim();
        if (data.clientSecret && !runtimeClientSecret) runtimeClientSecret = String(data.clientSecret).trim();
      }
    } catch (e) {
      // ignore
    }
  }
}
loadPersistedOAuthCreds();

/**
 * Get dynamic base App URL from runtime environment or request
 */
export function getAppUrl(req?: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== "" && !process.env.APP_URL.includes("MY_APP_URL")) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (req) {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:3000";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Returns GitHub OAuth Authorization URL for popup flow
 */
export function githubAuthUrlHandler(req: Request, res: Response) {
  loadPersistedOAuthCreds();
  const clientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || runtimeClientId || "").trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || runtimeClientSecret || "").trim();
  const appUrl = getAppUrl(req);
  const callbackUrl = `${appUrl}/auth/github/callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      url: null,
      callbackUrl,
      appUrl,
      hasSecret: Boolean(clientSecret),
      message: "GitHub OAuth App credentials are not configured on this server. You can connect instantly using your GitHub Personal Access Token (PAT) below, or configure your GitHub Client ID & Secret.",
    });
  }

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "repo,read:user,user:email",
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  res.json({
    configured: true,
    url: authUrl,
    callbackUrl,
    appUrl,
    hasSecret: Boolean(clientSecret),
  });
}

/**
 * Dynamic configuration endpoint to save GitHub OAuth App Client ID & Secret
 */
export function githubConfigureHandler(req: Request, res: Response) {
  const { clientId, clientSecret } = req.body || {};
  if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
    return res.status(400).json({ success: false, error: "GitHub Client ID is required." });
  }

  runtimeClientId = clientId.trim();
  if (clientSecret && typeof clientSecret === "string" && clientSecret.trim()) {
    runtimeClientSecret = clientSecret.trim();
  }

  try {
    fs.writeFileSync(
      OAUTH_FILE,
      JSON.stringify(
        {
          clientId: runtimeClientId,
          clientSecret: runtimeClientSecret,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (err) {
    console.warn("Could not persist .github_oauth.json:", err);
  }

  const appUrl = getAppUrl(req);
  const callbackUrl = `${appUrl}/auth/github/callback`;

  return res.json({
    success: true,
    configured: Boolean(runtimeClientId && runtimeClientSecret),
    clientId: runtimeClientId,
    hasSecret: Boolean(runtimeClientSecret),
    callbackUrl,
    message: "GitHub OAuth credentials successfully saved!",
  });
}

/**
 * Reset dynamic OAuth credentials
 */
export function githubClearConfigHandler(req: Request, res: Response) {
  runtimeClientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || "").trim();
  runtimeClientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || "").trim();
  try {
    if (fs.existsSync(OAUTH_FILE)) {
      fs.unlinkSync(OAUTH_FILE);
    }
  } catch {}
  return res.json({ success: true, message: "OAuth credentials reset to defaults." });
}

/**
 * Handles OAuth callback from GitHub, exchanges code for access token,
 * fetches user metadata, and returns a self-closing HTML popup script.
 */
export async function githubCallbackHandler(req: Request, res: Response) {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const errorDescription = req.query.error_description as string;

  if (error || !code) {
    const errorMsg = errorDescription || error || "GitHub authentication was canceled or failed.";
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authentication Error</title>
          <style>
            body { background: #0c0d14; color: #f87171; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .box { max-width: 440px; background: rgba(239,35,60,0.1); border: 1px solid rgba(239,35,60,0.3); border-radius: 16px; padding: 24px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h3>⚠️ Authentication Failed</h3>
            <p>${escapeHtml(errorMsg)}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }

  loadPersistedOAuthCreds();
  const clientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || runtimeClientId || "").trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || runtimeClientSecret || "").trim();

  if (!clientId || !clientSecret) {
    const noCredsMsg = "GitHub OAuth credentials (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) are missing from the server environment.";
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Configuration</title></head>
        <body style="background:#0c0d14;color:#fca5a5;font-family:sans-serif;padding:30px;">
          <h3>⚠️ Server OAuth Credentials Missing</h3>
          <p>${noCredsMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: ${JSON.stringify(noCredsMsg)} }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange authorization code for token.");
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user details
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userRes.ok) {
      throw new Error(`Failed to fetch GitHub profile (${userRes.status}).`);
    }

    const githubUser: any = await userRes.json();
    const payload = {
      token: accessToken,
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
      email: githubUser.email,
    };

    // 3. Post message to parent iframe window and close popup
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Connected</title>
          <style>
            body {
              background: #07090f;
              color: #f1f5f9;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              max-width: 400px;
              padding: 32px 24px;
              background: #111422;
              border: 1px solid rgba(255,255,255,0.15);
              border-radius: 20px;
              box-shadow: 0 25px 50px rgba(0,0,0,0.6);
            }
            .avatar {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              border: 2px solid #ef233c;
              margin-bottom: 12px;
            }
            h2 { margin: 0 0 8px 0; font-size: 18px; color: #fff; }
            p { margin: 0; font-size: 13px; color: #94a3b8; }
            .badge {
              display: inline-block;
              margin-top: 14px;
              padding: 4px 12px;
              background: rgba(34,197,94,0.15);
              color: #4ade80;
              border: 1px solid rgba(34,197,94,0.3);
              border-radius: 999px;
              font-size: 11px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${payload.avatarUrl ? `<img class="avatar" src="${escapeHtml(payload.avatarUrl)}" alt="Avatar" />` : ''}
            <h2>Connected as @${escapeHtml(payload.username)}</h2>
            <p>Authentication successful. Synchronizing credentials...</p>
            <div class="badge">✓ Access Token Verified</div>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GITHUB_AUTH_SUCCESS',
                  auth: ${JSON.stringify(payload)}
                }, '*');
                setTimeout(function() {
                  window.close();
                }, 600);
              } else {
                setTimeout(function() {
                  window.location.href = '/';
                }, 1000);
              }
            } catch (e) {
              console.error(e);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    const safeError = err?.message || "Failed to complete GitHub OAuth.";
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Error</title></head>
        <body style="background:#0c0d14;color:#f87171;font-family:sans-serif;padding:30px;text-align:center;">
          <h3>⚠️ GitHub Authorization Error</h3>
          <p>${escapeHtml(safeError)}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: ${JSON.stringify(safeError)} }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
}

/**
 * Verify any GitHub Token (PAT or OAuth token) directly
 */
export async function githubVerifyTokenHandler(req: Request, res: Response) {
  const token = (req.body?.token || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, "") : "")).trim();

  if (!token) {
    return res.status(400).json({ valid: false, error: "Token is required." });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (userRes.status === 401) {
      return res.status(401).json({ valid: false, error: "Invalid or expired token." });
    }

    if (!userRes.ok) {
      return res.status(userRes.status).json({ valid: false, error: `GitHub API error (${userRes.status}).` });
    }

    const githubUser: any = await userRes.json();
    return res.json({
      valid: true,
      auth: {
        token,
        username: githubUser.login,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err?.message || "Failed to reach GitHub API." });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function githubAuthApiHandler(req: any, res: any) {
  const url = req.url || "";
  const action = req.query?.action || "";
  if (url.includes("/url") || action === "url") {
    return githubAuthUrlHandler(req, res);
  }
  if (url.includes("/verify") || action === "verify") {
    return githubVerifyTokenHandler(req, res);
  }
  if (url.includes("/configure") || action === "configure") {
    if (req.method === "DELETE") {
      return githubClearConfigHandler(req, res);
    }
    return githubConfigureHandler(req, res);
  }
  if (url.includes("/callback") || action === "callback") {
    return githubCallbackHandler(req, res);
  }
  return githubAuthUrlHandler(req, res);
}

