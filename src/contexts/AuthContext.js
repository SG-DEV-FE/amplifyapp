import React, { createContext, useContext, useState, useEffect } from "react";
import netlifyIdentity from "netlify-identity-widget";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Netlify Identity
    netlifyIdentity.init({
      locale: "en",
    });

    // Check for current user
    const currentUser = netlifyIdentity.currentUser();
    console.log("Initial Netlify Identity user:", currentUser);

    if (currentUser) {
      setUser(currentUser);
      // Store token for API calls
      localStorage.setItem("netlifyToken", currentUser.token.access_token);
      localStorage.setItem("userId", currentUser.id);
      // Check admin status from user metadata or app_metadata
      checkAdminStatus(currentUser);
    }

    setLoading(false);

    // Listen for auth events
    netlifyIdentity.on("login", (user) => {
      console.log("Netlify Identity login:", user);
      setUser(user);
      localStorage.setItem("netlifyToken", user.token.access_token);
      localStorage.setItem("userId", user.id);
      checkAdminStatus(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on("logout", () => {
      console.log("Netlify Identity logout");
      setUser(null);
      setIsAdmin(false);
      localStorage.removeItem("netlifyToken");
      localStorage.removeItem("userId");
    });

    netlifyIdentity.on("error", (err) => {
      console.error("Netlify Identity error:", err);
    });

    // Auto-logout on page leave/close/refresh for maximum security
    const handlePageLeave = () => {
      console.log("Page is being left - signing out user");
      localStorage.clear();
      sessionStorage.clear();
      netlifyIdentity.logout();
    };

    // Auto-logout on window/tab close
    const handleBeforeUnload = (e) => {
      handlePageLeave();
    };

    // Auto-logout when page becomes hidden (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Page hidden - starting logout timer");
        setTimeout(() => {
          if (document.hidden) {
            console.log("Page still hidden after 30s - auto logout");
            handlePageLeave();
          }
        }, 30000); // 30 seconds
      }
    };

    // Auto-logout on browser back/forward navigation
    const handlePopState = () => {
      handlePageLeave();
    };

    // Attach event listeners for auto-logout
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handlePageLeave);
    window.addEventListener("pagehide", handlePageLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handlePageLeave);
      window.removeEventListener("pagehide", handlePageLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const checkAdminStatus = (user) => {
    // Check if user has admin role in app_metadata or user_metadata
    const isAdminUser =
      user?.app_metadata?.roles?.includes("admin") ||
      user?.user_metadata?.role === "admin";

    console.log("Admin status check:", {
      user: user?.email,
      app_metadata: user?.app_metadata,
      user_metadata: user?.user_metadata,
      isAdmin: isAdminUser,
    });

    setIsAdmin(!!isAdminUser);
  };

  const signUp = async (email, password) => {
    try {
      // Use Netlify Identity API directly (no modal)
      const user = await new Promise((resolve, reject) => {
        netlifyIdentity.on("signup", (user) => {
          resolve(user);
        });

        netlifyIdentity.on("error", (err) => {
          reject(err);
        });

        // Trigger signup with credentials
        netlifyIdentity.gotrue
          .signup(email, password)
          .then((user) => {
            console.log("Signup successful:", user);
            resolve(user);
          })
          .catch((err) => {
            console.error("Signup error:", err);
            reject(err);
          });
      });

      return { user, error: null };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        user: null,
        error: error.message || error.msg || "Signup failed",
      };
    }
  };

  const signIn = async (email, password) => {
    try {
      // Clear any existing session first for security
      localStorage.clear();
      sessionStorage.clear();

      // Use Netlify Identity API directly (no modal)
      const user = await netlifyIdentity.gotrue.login(email, password, true);

      console.log("Login successful:", user);

      // Manually set the user and store tokens
      setUser(user);
      localStorage.setItem("netlifyToken", user.token.access_token);
      localStorage.setItem("userId", user.id);
      checkAdminStatus(user);

      return { user, error: null };
    } catch (error) {
      console.error("Login error:", error);
      return {
        user: null,
        error: error.message || error.msg || "Login failed",
      };
    }
  };

  const signOut = async () => {
    try {
      console.log("Manual sign out initiated");

      // Clear state immediately for better UX
      setUser(null);
      setIsAdmin(false);
      setLoading(false);

      // Aggressively clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Sign out through Netlify Identity
      netlifyIdentity.logout();

      console.log("Sign out completed");
    } catch (error) {
      console.error("Error signing out:", error);
      // Ensure state is cleared even on error
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const makeUserAdmin = async (userId) => {
    try {
      // This would need to be done through Netlify Identity's admin interface
      // or a Netlify Function with admin privileges
      console.warn(
        "makeUserAdmin should be done through Netlify Identity admin interface"
      );
      return { error: "Use Netlify Identity admin interface to assign roles" };
    } catch (error) {
      return { error: error.message };
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    makeUserAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
