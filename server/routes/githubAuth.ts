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
  } catch (err: any) {
    console.warn("Could not persist GitHub credentials to disk:", err?.message);
  }

  return res.json({
    success: true,
    configured: true,
    hasClientId: Boolean(runtimeClientId),
    hasClientSecret: Boolean(runtimeClientSecret),
    message: "GitHub OAuth credentials successfully saved.",
  });
}

export function githubClearConfigHandler(_req: Request, res: Response) {
  runtimeClientId = "";
  runtimeClientSecret = "";
  try {
    if (fs.existsSync(OAUTH_FILE)) {
      fs.unlinkSync(OAUTH_FILE);
    }
  } catch (err: any) {
    console.warn("Error deleting oauth creds file:", err?.message);
  }
  return res.json({ success: true, message: "GitHub OAuth credentials cleared." });
}

export async function githubCallbackHandler(req: Request, res: Response) {
  loadPersistedOAuthCreds();
  const { code, error, error_description } = req.query as { code?: string; error?: string; error_description?: string };

  if (error) {
    const errorMsg = escapeHtml(error_description || error);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Authentication Failed</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #f87171; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid rgba(248,113,113,0.3); border-radius: 12px; background: rgba(0,0,0,0.4);">
            <h2 style="margin-top: 0;">GitHub Connection Failed</h2>
            <p>${errorMsg}</p>
            <p style="color: #94a3b8; font-size: 14px;">You can close this window and try again or use a Personal Access Token.</p>
            <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: '${escapeHtml(errorMsg)}' }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Missing code parameter from GitHub OAuth callback.");
  }

  const clientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || runtimeClientId || "").trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || runtimeClientSecret || "").trim();

  if (!clientId || !clientSecret) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub OAuth Configuration Missing</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #fbbf24; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; background: rgba(0,0,0,0.4);">
            <h2 style="margin-top: 0;">Server Credentials Missing</h2>
            <p>GitHub Client ID or Client Secret is not configured on this server.</p>
            <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
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

    const tokenData: any = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access_token returned by GitHub OAuth.");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userRes.ok) {
      throw new Error("Failed to fetch GitHub user profile.");
    }

    const githubUser: any = await userRes.json();

    const authPayload = JSON.stringify({
      token: accessToken,
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Connected</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #34d399; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid rgba(52,211,153,0.3); border-radius: 12px; background: rgba(0,0,0,0.4);">
            <h2 style="margin-top: 0; color: #34d399;">GitHub Connected!</h2>
            <p style="color: #e2e8f0;">Signed in as <strong>${escapeHtml(githubUser.login)}</strong>.</p>
            <p style="color: #94a3b8; font-size: 14px;">Closing window and returning to IntelicatAI...</p>
          </div>
          <script>
            const payload = ${authPayload};
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', auth: payload }, '*');
              setTimeout(() => window.close(), 900);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    const errorMsg = escapeHtml(err?.message || "Internal OAuth exchange error.");
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub OAuth Error</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #f87171; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid rgba(248,113,113,0.3); border-radius: 12px; background: rgba(0,0,0,0.4);">
            <h2 style="margin-top: 0;">GitHub Token Exchange Failed</h2>
            <p>${errorMsg}</p>
            <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: '${errorMsg}' }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
}

export async function githubVerifyTokenHandler(req: Request, res: Response) {
  const token = (req.body?.token || (req.headers.authorization || "").replace("Bearer ", "")).trim();
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
