const buildRawgUrl = (path, params = {}) => {
  const searchParams = new URLSearchParams({ path });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return `/api/rawg?${searchParams.toString()}`;
};

export const rawgRequest = async (path, { params, signal } = {}) => {
  const response = await fetch(buildRawgUrl(path, params), { signal });
  const responseText = await response.text();

  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (data && data.error) ||
      (typeof data === "string" && data) ||
      "RAWG request failed.";
    throw new Error(errorMessage);
  }

  return data;
};

export const rawgSearchGames = (query, { pageSize = 10, signal } = {}) =>
  rawgRequest("games", {
    params: {
      search: query,
      page_size: pageSize,
    },
    signal,
  });

export const rawgGetGameDetails = (gameId, { signal } = {}) =>
  rawgRequest(`games/${gameId}`, { signal });

export const rawgGetPlatforms = ({ pageSize = 50, signal } = {}) =>
  rawgRequest("platforms", {
    params: { page_size: pageSize },
    signal,
  });