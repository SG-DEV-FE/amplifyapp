import { getStore } from "@netlify/blobs";

const handler = async (req, context) => {
  const imagesStore = getStore("images");
  const userId =
    context.clientContext?.user?.sub || req.headers.get("x-user-id");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // POST - Upload image
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_");

      const fileName = `${userId}/${timestamp}-${sanitizedName}`;

      // Convert file to arrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store in Netlify Blobs
      await imagesStore.set(fileName, buffer, {
        metadata: {
          contentType: file.type,
          userId: userId,
          originalName: file.name,
        },
      });

      return new Response(
        JSON.stringify({
          fileName: fileName,
          url: `/.netlify/images/${fileName}`,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // GET - Retrieve image
    if (req.method === "GET") {
      const url = new URL(req.url);
      const fileName = url.searchParams.get("file");

      if (!fileName) {
        return new Response(JSON.stringify({ error: "No file specified" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const imageData = await imagesStore.get(fileName, {
        type: "arrayBuffer",
      });
      const metadata = await imagesStore.getMetadata(fileName);

      if (!imageData) {
        return new Response(JSON.stringify({ error: "Image not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(imageData, {
        status: 200,
        headers: {
          "Content-Type": metadata?.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    // DELETE - Remove image
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const fileName = url.searchParams.get("file");

      if (!fileName) {
        return new Response(JSON.stringify({ error: "No file specified" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await imagesStore.delete(fileName);

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
    console.error("Error in images function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;

export const config = {
  path: "/api/images",
};
