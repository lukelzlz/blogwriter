import { handleAuth } from './auth';
import { handlePosts } from './posts';
import { handleRepo } from './github';

export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
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

      // Serve static files for production
      if (path === '/' || path.startsWith('/assets')) {
        // In production, these would be served from the static bucket
        // For now, return a simple response
        return new Response('Hexo Blog Manager - Frontend not yet deployed', {
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        });
      }

      // 404
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
