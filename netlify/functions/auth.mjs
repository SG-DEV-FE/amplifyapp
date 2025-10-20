// This function validates Netlify Identity JWT tokens
const handler = async (req, context) => {
  try {
    // Check if user is authenticated via Netlify Identity
    const user = context.clientContext?.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: "Not authenticated",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return user information
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: user.sub,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          roles: user.app_metadata?.roles || [],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in auth function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export default handler;

export const config = {
  path: "/api/auth",
};
