const RAWG_BASE_URL = "https://api.rawg.io/api";

const getRawgApiKey = () =>
  process.env.RAWG_API_KEY || process.env.VITE_RAWG_API_KEY || "";

const normalizePath = (path = "") => path.replace(/^\/+/, "");

const isValidPath = (path) => /^[a-zA-Z0-9/_-]+$/.test(path);

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const handler = async (req) => {
  if (req.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = getRawgApiKey();
  if (!apiKey) {
    return jsonResponse(503, {
      error: "RAWG API key is not configured on the server.",
    });
  }

  const requestUrl = new URL(req.url);
  const path = normalizePath(requestUrl.searchParams.get("path") || "");

  if (!path || !isValidPath(path)) {
    return jsonResponse(400, { error: "Invalid RAWG request path." });
  }

  const upstreamUrl = new URL(`${RAWG_BASE_URL}/${path}`);

  requestUrl.searchParams.forEach((value, key) => {
    if (key !== "path" && value !== "") {
      upstreamUrl.searchParams.set(key, value);
    }
  });
  upstreamUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": response.ok ? "public, max-age=300" : "no-store",
      },
    });
  } catch (error) {
    return jsonResponse(502, {
      error: error.message || "Failed to reach RAWG.",
    });
  }
};

export default handler;

export const config = {
  path: "/api/rawg",
};