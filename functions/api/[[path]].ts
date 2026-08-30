import serverless from "serverless-http";

// Initialize environment early
if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {} };
}

export const onRequest: any = async (context: any) => {
  const { request, env } = context;

  if (env) {
    Object.assign(process.env, env);
  }
  
  // Set flag BEFORE dynamic import
  process.env.CF_PAGES = '1';

  // 1. Proxied Mode (VPS/CPanel Fallback)
  if (env.CF_API_TARGET) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, env.CF_API_TARGET);
    const newRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });
    return fetch(newRequest);
  }

  // 2. Serverless Mode (Dynamic import to avoid hoisting execution)
  const { app } = await import("../../server");
  const handler = serverless(app);

  return await handler(request, context);
};
