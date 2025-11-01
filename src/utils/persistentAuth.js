// JWT and persistent authentication utilities

// Generate a simple JWT-like token for persistent login
export const createPersistentToken = (user, expiryDays = 90) => {
  const now = Date.now();
  const expiry = now + (expiryDays * 24 * 60 * 60 * 1000); // 90 days in milliseconds
  
  const tokenData = {
    userId: user.id,
    email: user.email,
    netlifyToken: user.token.access_token,
    created: now,
    expires: expiry,
    rememberMe: true
  };
  
  // Base64 encode the token data
  return btoa(JSON.stringify(tokenData));
};

// Validate and decode persistent token
export const validatePersistentToken = (token) => {
  try {
    const tokenData = JSON.parse(atob(token));
    const now = Date.now();
    
    // Check if token has expired
    if (now > tokenData.expires) {
      return { valid: false, reason: 'expired' };
    }
    
    // Check if token has required fields
    if (!tokenData.userId || !tokenData.email || !tokenData.netlifyToken) {
      return { valid: false, reason: 'invalid' };
    }
    
    return { 
      valid: true, 
      data: tokenData,
      daysRemaining: Math.ceil((tokenData.expires - now) / (24 * 60 * 60 * 1000))
    };
  } catch (error) {
    return { valid: false, reason: 'malformed' };
  }
};

// Check if we should use persistent login or regular session
export const shouldUsePersistentLogin = () => {
  const persistentToken = localStorage.getItem('persistentToken');
  
  if (!persistentToken) {
    return { shouldUse: false, reason: 'no-token' };
  }
  
  const validation = validatePersistentToken(persistentToken);
  
  if (!validation.valid) {
    // Clean up invalid token
    localStorage.removeItem('persistentToken');
    return { shouldUse: false, reason: validation.reason };
  }
  
  return { 
    shouldUse: true, 
    tokenData: validation.data,
    daysRemaining: validation.daysRemaining
  };
};

// Clear persistent login
export const clearPersistentLogin = () => {
  localStorage.removeItem('persistentToken');
};

// Storage keys
export const STORAGE_KEYS = {
  PERSISTENT_TOKEN: 'persistentToken',
  NETLIFY_TOKEN: 'netlifyToken',
  USER_ID: 'userId',
  REMEMBER_ME_ENABLED: 'rememberMeEnabled'
};