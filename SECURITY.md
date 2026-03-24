# Security Configuration Guide

## ⚠️ IMPORTANT: API Key Security

### Immediate Action Required

1. **Regenerate Your RAWG API Key**
   - Visit [RAWG API Keys](https://rawg.io/apidocs)
   - Generate a new API key
   - The key `ab751c315cac41738ff2e1a51ae8435e` should be considered compromised if this repo was ever public or shared

2. **Set Environment Variables in Netlify**
   - Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
   - Add: `VITE_RAWG_API_KEY` = `your_new_api_key`
   - This keeps the key secure and out of version control

3. **Update Local .env File**
   - Update `.env` with your new API key
   - Verify `.env` is listed in `.gitignore` (✅ already configured)
   - **NEVER commit .env files to git**

### Security Best Practices

#### Environment Variables

- ✅ `.env` files are ignored by git
- ✅ API keys removed from `netlify.toml`
- ⚠️ VITE\_ prefixed variables are **embedded in client-side code** (this is expected but be aware)

#### What's Protected

```
.env                    # Git ignored ✅
.env.local              # Git ignored ✅
.env.development.local  # Git ignored ✅
.env.production.local   # Git ignored ✅
```

#### Client-Side API Keys

**Important Note:** Since RAWG API calls are made from the browser (client-side), the API key will always be visible in:

- Browser network requests
- Compiled JavaScript bundles
- Browser DevTools

This is expected behavior for client-side API keys. To fully secure sensitive operations:

1. Use RAWG's free tier for read-only operations
2. Implement rate limiting in Netlify Functions if needed
3. For sensitive operations, create backend functions that keep keys server-side

### Files That Should NEVER Be Committed

- `.env`
- `.env.local`
- Any files containing API keys, tokens, or passwords
- AWS credentials (`aws-exports.js`, `awsconfiguration.json`)

### Before Pushing to Git

Always run:

```bash
git status
```

Verify no sensitive files are staged for commit.

## Questions?

If you need to use sensitive API keys that should never be exposed to clients, implement them as Netlify Functions where the keys stay server-side.
