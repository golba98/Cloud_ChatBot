/**
 * POST /api/chat
 * Cloudflare Pages Function serverless API route for secure AI completion.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Basic security headers for JSON response
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
  });

  try {
    // 2. Parse and validate JSON payload
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body.' }),
        { status: 400, headers }
      );
    }

    const { message } = body;

    // Validate presence and type of message
    if (message === undefined || message === null) {
      return new Response(
        JSON.stringify({ error: 'Missing "message" field in request body.' }),
        { status: 400, headers }
      );
    }

    if (typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'The "message" field must be a string.' }),
        { status: 400, headers }
      );
    }

    const trimmedMessage = message.trim();

    // Reject empty messages
    if (trimmedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty.' }),
        { status: 400, headers }
      );
    }

    // Safety/Cost Protection: Reject messages exceeding limit
    if (trimmedMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message exceeds the maximum limit of 2000 characters.' }),
        { status: 400, headers }
      );
    }

    // 3. System prompt setup
    const systemPrompt = "You are a helpful, concise AI assistant for a modern website chat app.";

    // 4. Resolve Model Provider & API Configs
    const provider = (env.MODEL_PROVIDER || 'cloudflare').toLowerCase();

    if (provider === 'cloudflare') {
      // Cloudflare Workers AI Implementation
      if (!env.AI) {
        return new Response(
          JSON.stringify({
            error: 'Cloudflare Workers AI binding (env.AI) is not configured in your environment.'
          }),
          { status: 500, headers }
        );
      }

      // Default model for Cloudflare
      const model = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

      try {
        const aiResponse = await env.AI.run(model, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmedMessage },
          ],
        });

        // Workers AI responds with { response: "..." }
        const reply = aiResponse.response || (aiResponse.result && aiResponse.result.response);

        if (!reply) {
          throw new Error('Received empty response from Workers AI.');
        }

        return new Response(
          JSON.stringify({ reply }),
          { status: 200, headers }
        );

      } catch (aiError) {
        console.error('Workers AI execution error:', aiError);
        return new Response(
          JSON.stringify({ error: `Workers AI error: ${aiError.message || 'Unknown error'}` }),
          { status: 500, headers }
        );
      }

    } else if (provider === 'openai') {
      // OpenAI API Implementation
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({
            error: 'OpenAI API key (env.OPENAI_API_KEY) is not set in environment variables.'
          }),
          { status: 500, headers }
        );
      }

      // Default model for OpenAI
      const model = env.OPENAI_MODEL || 'gpt-5.4-mini';

      try {
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: trimmedMessage },
            ],
          }),
        });

        const data = await openAiResponse.json();

        if (!openAiResponse.ok) {
          const apiError = data.error?.message || `HTTP ${openAiResponse.status}`;
          throw new Error(`OpenAI API error: ${apiError}`);
        }

        const reply = data.choices?.[0]?.message?.content;
        if (!reply) {
          throw new Error('Invalid or empty response format from OpenAI API.');
        }

        return new Response(
          JSON.stringify({ reply }),
          { status: 200, headers }
        );

      } catch (openAiError) {
        console.error('OpenAI execution error:', openAiError);
        return new Response(
          JSON.stringify({ error: openAiError.message }),
          { status: 500, headers }
        );
      }

    } else {
      // Unsupported provider error
      return new Response(
        JSON.stringify({ error: `Unsupported MODEL_PROVIDER "${provider}". Use "cloudflare" or "openai".` }),
        { status: 400, headers }
      );
    }

  } catch (err) {
    console.error('Unhandled server error in chat function:', err);
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${err.message || 'An unexpected error occurred.'}` }),
      { status: 500, headers }
    );
  }
}
