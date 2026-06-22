import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const ollamaUrl = request.headers.get("x-ollama-url") || "http://localhost:11434";
  const endpoint = request.headers.get("x-ollama-endpoint") || "api/tags";

  try {
    const targetUrl = `${ollamaUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Ollama error: ${response.statusText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Connection failed: ${error.message || error}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const ollamaUrl = request.headers.get("x-ollama-url") || "http://localhost:11434";
  const endpoint = request.headers.get("x-ollama-endpoint") || "api/chat";

  try {
    const targetUrl = `${ollamaUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
    const body = await request.text();

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Ollama error: ${errorText || response.statusText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle streaming response
    if (response.body) {
      const stream = response.body;
      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Connection failed: ${error.message || error}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
