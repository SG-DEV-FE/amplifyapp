import React, { createContext, useContext, useState, useEffect } from "react";
import netlifyIdentity from "netlify-identity-widget";
import { 
  createPersistentToken, 
  shouldUsePersistentLogin, 
  clearPersistentLogin,
  STORAGE_KEYS 
} from "../utils/persistentAuth";

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

    // Check for persistent login first
    const persistentCheck = shouldUsePersistentLogin();
    
    if (persistentCheck.shouldUse) {
      // Restore from persistent token
      const mockUser = {
        id: persistentCheck.tokenData.userId,
        email: persistentCheck.tokenData.email,
        token: {
          access_token: persistentCheck.tokenData.netlifyToken
        }
      };
      
      setUser(mockUser);
      localStorage.setItem(STORAGE_KEYS.NETLIFY_TOKEN, persistentCheck.tokenData.netlifyToken);
      localStorage.setItem(STORAGE_KEYS.USER_ID, persistentCheck.tokenData.userId);
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
      checkAdminStatus(mockUser);
      
      console.log(`Restored persistent login for ${persistentCheck.tokenData.email}, ${persistentCheck.daysRemaining} days remaining`);
    } else {
      // Check for current user (regular session)
      const currentUser = netlifyIdentity.currentUser();

      if (currentUser) {
        setUser(currentUser);
        // Store token for API calls
        localStorage.setItem(STORAGE_KEYS.NETLIFY_TOKEN, currentUser.token.access_token);
        localStorage.setItem(STORAGE_KEYS.USER_ID, currentUser.id);
        // Check admin status from user metadata or app_metadata
        checkAdminStatus(currentUser);
      }
    }

    setLoading(false);

    // Listen for auth events
    netlifyIdentity.on("login", (user) => {
      setUser(user);
      localStorage.setItem("netlifyToken", user.token.access_token);
      localStorage.setItem("userId", user.id);
      checkAdminStatus(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on("logout", () => {
      setUser(null);
      setIsAdmin(false);
      localStorage.removeItem("netlifyToken");
      localStorage.removeItem("userId");
    });

    netlifyIdentity.on("error", (err) => {
      // Authentication error occurred
    });

    // Conditional auto-logout logic - only if not using persistent login
    const isUsingPersistentLogin = () => {
      return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_ENABLED) === 'true';
    };

    // Auto-logout on page leave/close/refresh (only for non-persistent sessions)
    const handlePageLeave = () => {
      if (!isUsingPersistentLogin()) {
        localStorage.clear();
        sessionStorage.clear();
        netlifyIdentity.logout();
      }
    };

    // Auto-logout on window/tab close (only for non-persistent sessions)
    const handleBeforeUnload = (e) => {
      if (!isUsingPersistentLogin()) {
        handlePageLeave();
      }
    };

    // Auto-logout when page becomes hidden (only for non-persistent sessions)
    const handleVisibilityChange = () => {
      if (!isUsingPersistentLogin() && document.hidden) {
        setTimeout(() => {
          if (document.hidden && !isUsingPersistentLogin()) {
            handlePageLeave();
          }
        }, 30000); // 30 seconds
      }
    };

    // Auto-logout on browser back/forward navigation (only for non-persistent sessions)
    const handlePopState = () => {
      if (!isUsingPersistentLogin()) {
        handlePageLeave();
      }
    };

    // Attach event listeners for conditional auto-logout
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
            resolve(user);
          })
          .catch((err) => {
            reject(err);
          });
      });

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error.message || error.msg || "Signup failed",
      };
    }
  };

  const signIn = async (email, password, rememberMe = false) => {
    try {
      // Clear any existing session first for security (but preserve persistent tokens if remember me was previously enabled)
      if (!rememberMe) {
        localStorage.clear();
        sessionStorage.clear();
      } else {
        // Only clear non-persistent items
        localStorage.removeItem(STORAGE_KEYS.NETLIFY_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_ID);
        sessionStorage.clear();
      }

      // Use Netlify Identity API directly (no modal)
      const user = await netlifyIdentity.gotrue.login(email, password, true);

      // Manually set the user and store tokens
      setUser(user);
      localStorage.setItem(STORAGE_KEYS.NETLIFY_TOKEN, user.token.access_token);
      localStorage.setItem(STORAGE_KEYS.USER_ID, user.id);
      
      // Handle persistent login
      if (rememberMe) {
        const persistentToken = createPersistentToken(user, 90);
        localStorage.setItem(STORAGE_KEYS.PERSISTENT_TOKEN, persistentToken);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
        console.log('Persistent login enabled for 90 days');
      } else {
        // Clear any existing persistent tokens
        clearPersistentLogin();
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
      }
      
      checkAdminStatus(user);

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error.message || error.msg || "Login failed",
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear state immediately for better UX
      setUser(null);
      setIsAdmin(false);
      setLoading(false);

      // Clear persistent login tokens
      clearPersistentLogin();
      
      // Aggressively clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Sign out through Netlify Identity
      netlifyIdentity.logout();
      
      console.log('User signed out, all tokens cleared');
    } catch (error) {
      // Ensure state is cleared even on error
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      
      // Still clear persistent tokens on error
      clearPersistentLogin();
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const makeUserAdmin = async (userId) => {
    try {
      // This would need to be done through Netlify Identity's admin interface
      // or a Netlify Function with admin privileges
      return { error: "Use Netlify Identity admin interface to assign roles" };
    } catch (error) {
      return { error: error.message };
    }
  };

  // Helper function to check persistent login status
  const getPersistentLoginInfo = () => {
    const persistentCheck = shouldUsePersistentLogin();
    return {
      isEnabled: persistentCheck.shouldUse,
      daysRemaining: persistentCheck.daysRemaining || 0,
      email: persistentCheck.tokenData?.email || null
    };
  };

  // Helper function to disable persistent login (but keep current session)
  const disablePersistentLogin = () => {
    clearPersistentLogin();
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
    console.log('Persistent login disabled');
  };

  const value = {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    makeUserAdmin,
    getPersistentLoginInfo,
    disablePersistentLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
