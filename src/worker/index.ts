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

      // For all other paths, let Workers Sites handle static files
      // This includes '/', '/assets/*', and any other static assets
      // Workers Sites will automatically serve files from the ./dist bucket
      return new Response(null, {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
