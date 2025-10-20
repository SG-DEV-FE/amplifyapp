import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../index';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-logout on page leave/close/refresh for maximum security
    const handlePageLeave = () => {
      console.log('Page is being left - signing out user');
      // Immediately clear all auth data
      localStorage.clear();
      sessionStorage.clear();
      supabase.auth.signOut().catch(console.error);
    };

    // Auto-logout on window/tab close
    const handleBeforeUnload = (e) => {
      handlePageLeave();
    };

    // Auto-logout when page becomes hidden (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden - starting logout timer');
        // Give user 30 seconds to come back, then auto-logout
        setTimeout(() => {
          if (document.hidden) {
            console.log('Page still hidden after 30s - auto logout');
            handlePageLeave();
          }
        }, 30000);
      }
    };

    // Auto-logout on browser back/forward navigation
    const handlePopState = () => {
      handlePageLeave();
    };

    // Attach event listeners for auto-logout
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handlePageLeave);
    window.addEventListener('pagehide', handlePageLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth initialization timed out - clearing loading state');
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session - but clear any existing session first for fresh start
    const initAuth = async () => {
      try {
        // Always start fresh - clear any existing sessions
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        
        clearTimeout(loadingTimeout);
        
        // After clearing, user should always be null initially
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      } catch (error) {
        console.error('Error during fresh start:', error);
        clearTimeout(loadingTimeout);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes - only handle successful sign-ins  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      
      // Only process successful sign-ins
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await checkAdminStatus(session.user.id);
        setLoading(false);
        return;
      }
      
      // All other events result in signed out state
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    });

    // Cleanup event listeners and subscription on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handlePageLeave);
      window.removeEventListener('pagehide', handlePageLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Table doesn't exist or no record found - both are OK, just default to non-admin
        if (error.code === '42P01' || error.code === 'PGRST116') {
          setIsAdmin(false);
          return;
        }
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Unexpected error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      // Clear any existing session first for security
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // The auth state change listener will handle setting the user state
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      console.log('Manual sign out initiated');
      
      // Clear state immediately for better UX
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      
      // Aggressively clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      
      console.log('Sign out completed');
      
    } catch (error) {
      console.error('Error signing out:', error);
      // Ensure state is cleared even on error
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const makeUserAdmin = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' });

      if (error) throw error;
      
      // Refresh admin status if it's the current user
      if (user && user.id === userId) {
        setIsAdmin(true);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  };

  // Manual session clear function for debugging
  

  const value = {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    makeUserAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};