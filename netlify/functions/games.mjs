import { getStore } from "@netlify/blobs";

const handler = async (req, context) => {
  // Get the games store
  const gamesStore = getStore("games");

  // Get user ID from context or headers
  const userId =
    context.clientContext?.user?.sub || req.headers.get("x-user-id");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const method = req.method;
  const userKey = `user_${userId}`;

  try {
    // GET - Fetch all games for user
    if (method === "GET") {
      const games = (await gamesStore.get(userKey, { type: "json" })) || [];
      return new Response(JSON.stringify(games), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST - Create new game
    if (method === "POST") {
      const newGame = await req.json();
      const games = (await gamesStore.get(userKey, { type: "json" })) || [];

      // Add ID and timestamp
      const gameWithMeta = {
        ...newGame,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: userId,
      };

      games.push(gameWithMeta);
      await gamesStore.set(userKey, JSON.stringify(games));

      return new Response(JSON.stringify(gameWithMeta), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // PUT - Update existing game
    if (method === "PUT") {
      const url = new URL(req.url);
      const gameId = url.searchParams.get("id");
      const updatedGame = await req.json();

      const games = (await gamesStore.get(userKey, { type: "json" })) || [];
      const index = games.findIndex((g) => g.id === gameId);

      if (index === -1) {
        return new Response(JSON.stringify({ error: "Game not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      games[index] = { ...games[index], ...updatedGame, id: gameId };
      await gamesStore.set(userKey, JSON.stringify(games));

      return new Response(JSON.stringify(games[index]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE - Remove game
    if (method === "DELETE") {
      const url = new URL(req.url);
      const gameId = url.searchParams.get("id");

      const games = (await gamesStore.get(userKey, { type: "json" })) || [];
      const filteredGames = games.filter((g) => g.id !== gameId);

      await gamesStore.set(userKey, JSON.stringify(filteredGames));

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in games function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;

export const config = {
  path: "/api/games",
};
