import type { Handler } from "@netlify/functions";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const API_KEY = process.env.LUNCHBOX_API_KEY;

export const handler: Handler = async (event) => {
  try {
    if (!APPS_SCRIPT_URL || !API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "Missing env vars: APPS_SCRIPT_URL or LUNCHBOX_API_KEY" }),
      };
    }

    const method = event.httpMethod || "GET";

    let action = event.queryStringParameters?.action;
    let bodyObj: any = {};
    if (event.body) {
      try {
        bodyObj = JSON.parse(event.body);
      } catch {
        bodyObj = {};
      }
      if (!action && bodyObj.action) action = bodyObj.action;
    }

    if (!action) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing action" }) };
    }

    const payload = { apiKey: API_KEY, action, ...(method === "GET" ? (event.queryStringParameters || {}) : bodyObj) };

    let resp: Response;
    if (method === "GET") {
      const qs = new URLSearchParams(payload as any).toString();
      resp = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: "GET" });
    } else {
      resp = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const text = await resp.text();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: text };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
