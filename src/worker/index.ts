import { handleAuth } from './auth';
import { handlePosts } from './posts';
import { handleRepo } from './github';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
  ASSETS?: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Auth routes
      if (path.startsWith('/auth')) {
        return handleAuth(request, env, ctx, corsHeaders);
      }

      // API routes
      if (path.startsWith('/api/posts')) {
        return handlePosts(request, env, ctx, corsHeaders);
      }

      if (path.startsWith('/api/repo')) {
        return handleRepo(request, env, ctx, corsHeaders);
      }

      // Serve static files using Workers Sites
      try {
        const asset = await getAssetFromKV(
          {
            request,
            waitUntil: ctx.waitUntil.bind(ctx),
          },
          {
            cacheControl: {
              browserTTL: 60 * 60 * 24 * 365, // 1 year
              edgeTTL: 60 * 60 * 24 * 365, // 1 year
              bypassCache: false,
            },
          }
        );
        return asset;
      } catch (e: any) {
        console.error('Asset fetch error:', e);
        // If asset not found, serve index.html for SPA routing
        if (e.message && (e.message.includes('Could not find') || e.message.includes('not found'))) {
          try {
            const indexRequest = new Request(`${url.origin}/index.html`, request);
            return await getAssetFromKV(
              {
                request: indexRequest,
                waitUntil: ctx.waitUntil.bind(ctx),
              }
            );
          } catch (indexError: any) {
            console.error('Index fetch error:', indexError);
            throw new Error('Could not serve index.html');
          }
        }
        throw e;
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
