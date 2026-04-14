const RAWG_BASE_URL = "https://api.rawg.io/api";

const ENV_KEY_CANDIDATES = ["REACT_APP_RAWG_API_KEY", "RAWG_API_KEY", "VITE_RAWG_API_KEY"];

const pickConfiguredKey = (values = []) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getRawgApiKey = (context) => {
  const netlifyEnvValues = [];

  // Netlify runtime env access can differ between function runtimes.
  if (typeof Netlify !== "undefined" && Netlify?.env?.get) {
    for (const key of ENV_KEY_CANDIDATES) {
      netlifyEnvValues.push(Netlify.env.get(key));
    }
  }

  if (context?.env?.get) {
    for (const key of ENV_KEY_CANDIDATES) {
      netlifyEnvValues.push(context.env.get(key));
    }
  }

  const processEnvValues = ENV_KEY_CANDIDATES.map((key) => process.env[key]);

  return pickConfiguredKey([...netlifyEnvValues, ...processEnvValues]);
};

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

const handler = async (req, context) => {
  if (req.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = getRawgApiKey(context);
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