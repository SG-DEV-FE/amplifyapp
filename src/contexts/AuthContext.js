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
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth initialization timed out - clearing loading state');
      setLoading(false);
    }, 5000); // 5 second timeout

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(loadingTimeout);
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error during auth init:', error);
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No user');
      
      // Handle sign out events immediately
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      // Handle sign in events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        await checkAdminStatus(session.user.id);
        setLoading(false);
        return;
      }
      
      // Default handling for other events
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      // Clear state immediately for better UX
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        // Even if Supabase signOut fails, we've cleared the local state
      }
      
      // Force clear any stuck sessions
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
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
  const clearSession = () => {
    console.log('Manually clearing session...');
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Force sign out
    supabase.auth.signOut().catch(console.error);
  };

  const value = {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    makeUserAdmin,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};