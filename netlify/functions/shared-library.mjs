import { getStore } from "@netlify/blobs";

const handler = async (req, context) => {
  // Get the games store
  const gamesStore = getStore("games");
  const sharesStore = getStore("shares");

  const method = req.method;
  const url = new URL(req.url);
  const shareId = url.searchParams.get("shareId");
  const userId = url.searchParams.get("userId");

  try {
    // GET - Fetch shared library by share ID
    if (method === "GET" && shareId) {
      const shareData = await sharesStore.get(shareId, { type: "json" });
      
      if (!shareData) {
        return new Response(JSON.stringify({ error: "Share not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userKey = `user_${shareData.userId}`;
      const games = (await gamesStore.get(userKey, { type: "json" })) || [];
      
      // Filter games based on share type
      let filteredGames = games;
      if (shareData.shareType === "wishlist") {
        filteredGames = games.filter(game => game.isWishlisted);
      }
      
      // Filter out sensitive data and map public fields
      const publicGames = filteredGames
        .map(game => ({
          id: game.id,
          name: game.name,
          description: game.description,
          genre: game.genre,
          release_date: game.release_date,
          players: game.players,
          publisher: game.publisher,
          image: game.image,
          selectedPlatform: game.selectedPlatform,
          isWishlisted: game.isWishlisted || false
        }));

      return new Response(JSON.stringify({
        games: publicGames,
        ownerName: shareData.ownerName || "Anonymous User",
        shareType: shareData.shareType || "full",
        sharedAt: shareData.createdAt
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    }

    // POST - Create a new share link
    if (method === "POST") {
      const authUserId = context.clientContext?.user?.sub || req.headers.get("x-user-id");
      
      if (!authUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { ownerName, shareType = "full" } = await req.json();
      
      // Generate a unique share ID
      const shareId = crypto.randomUUID();
      
      const shareData = {
        shareId,
        userId: authUserId,
        ownerName: ownerName || "Anonymous User",
        shareType: shareType, // "full" or "wishlist"
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await sharesStore.set(shareId, JSON.stringify(shareData));

      return new Response(JSON.stringify({
        shareId,
        shareUrl: `${url.origin}/shared/${shareId}`
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE - Remove a share link
    if (method === "DELETE" && shareId) {
      const authUserId = context.clientContext?.user?.sub || req.headers.get("x-user-id");
      
      if (!authUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const shareData = await sharesStore.get(shareId, { type: "json" });
      
      if (!shareData || shareData.userId !== authUserId) {
        return new Response(JSON.stringify({ error: "Share not found or unauthorized" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await sharesStore.delete(shareId);

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
    console.error("Error in shared-library function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;

export const config = {
  path: "/api/shared-library",
};