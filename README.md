# Zero Two Live Friend

A dark, live AI companion website built with Next.js and ready for Vercel.

## Providers

The server supports OpenAI and Gemini. Set one or both API keys as Vercel environment variables.

OpenAI:
- OPENAI_API_KEY
- OPENAI_MODEL

Gemini:
- GEMINI_API_KEY
- GEMINI_MODEL

Optional:
- AI_PROVIDER

The UI can use Auto provider, OpenAI, or Gemini.

## Local setup

1. Copy .env.example to .env.local.
2. Add your API key.
3. Run npm install.
4. Run npm run dev.

Never commit .env.local or an API key.

## Character image

Put a licensed or user-owned image at public/character.png. If no image exists, the site displays an original fallback avatar.

## Vercel

Import this repository into Vercel and add the API keys under Project Settings > Environment Variables. Redeploy after adding or changing keys.

The AI keys are used only in the server route and are never sent to the browser.