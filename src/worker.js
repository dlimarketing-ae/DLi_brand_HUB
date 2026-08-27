// DLI Brand Hub — Worker (static site + tiny JSON API)
//
// Routes:
//   GET  /api/state   -> public, returns the saved site JSON (or "null")
//   POST /api/state   -> admin only, replaces the saved site JSON
//   POST /api/verify  -> checks a passcode against the ADMIN_TOKEN secret
//   everything else   -> served from ./public (index.html, etc.) via the
//                        ASSETS binding declared in wrangler.toml

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state") {
      if (request.method === "GET") return handleStateGet(env);
      if (request.method === "POST") return handleStatePost(request, env);
    }

    if (url.pathname === "/api/verify" && request.method === "POST") {
      return handleVerify(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleStateGet(env) {
  try {
    const row = await env.DB
      .prepare("SELECT value FROM kv WHERE key = ?")
      .bind("state")
      .first();
    const body = row ? row.value : "null";
    return new Response(body, {
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  } catch (err) {
    return new Response("null", {
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  }
}

async function handleStatePost(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  let bodyText;
  try {
    bodyText = await request.text();
    const parsed = JSON.parse(bodyText);
    if (!parsed || !Array.isArray(parsed.companies)) {
      throw new Error("missing companies array");
    }
  } catch (err) {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    await env.DB
      .prepare(
        "INSERT INTO kv (key, value) VALUES ('state', ?1) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
      .bind(bodyText)
      .run();
  } catch (err) {
    return new Response("Database error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function handleVerify(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response("Bad request", { status: 400 });
  }

  if (!env.ADMIN_TOKEN || !body || body.passcode !== env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response("OK", { status: 200 });
}
