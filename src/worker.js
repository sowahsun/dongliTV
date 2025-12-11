export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const accept = request.headers.get("accept") || "";
    const ua = request.headers.get("user-agent") || "";

    // === 只在这里添加缓存逻辑 ===
    const cache = caches.default;
    
    // 对于GET请求且是静态资源，尝试从缓存读取
    if (request.method === "GET" && 
        (url.pathname === "/" || url.pathname === "/home.html" || url.pathname === "/api")) {
      
      const cacheKey = new Request(url.toString(), request);
      let cachedResponse = await cache.match(cacheKey);
      
      if (cachedResponse) {
        // 简单检查缓存是否还有效（这里简化处理，实际可以更精细）
        const cacheDate = cachedResponse.headers.get('date');
        if (cacheDate) {
          const cacheTime = new Date(cacheDate).getTime();
          const now = Date.now();
          const cacheAge = (now - cacheTime) / 1000;
          
          // 设置不同的缓存时间
          let maxAge = 300; // 默认5分钟
          if (url.pathname === "/" || url.pathname === "/home.html") maxAge = 600; // 首页10分钟
          
          if (cacheAge < maxAge) {
            return cachedResponse;
          }
        }
      }
    }

    // === 以下是你的原版逻辑，完全不变 ===
    // 特殊处理 /api 路径：始终返回文件下载
    if (url.pathname === "/api") {
      if (!env.ASSETS) {
        return new Response("ASSETS binding not configured", { status: 500 });
      }
      const response = await env.ASSETS.fetch(request);
      if (response.status === 200) {
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/octet-stream");
        headers.set("Content-Disposition", 'attachment; filename="api"');
        
        // === 只在这里添加缓存头部 ===
        headers.set("Cache-Control", "public, max-age=300");
        const finalResponse = new Response(response.body, { status: 200, headers });
        
        // 存储到缓存
        ctx.waitUntil(cache.put(new Request(url.toString(), request), finalResponse.clone()));
        return finalResponse;
      }
      return new Response("api file not found", { status: 404 });
    }

    // 根目录或 home.html 访问
    if (url.pathname === "/" || url.pathname === "/home.html") {
      // 1. 浏览器访问：返回真正的 home.html 文件
      if (ua.includes("Mozilla") && accept.includes("text/html")) {
        if (!env.ASSETS) {
          return new Response("ASSETS binding not configured", { status: 500 });
        }
        const homeRequest = new Request(`${url.origin}/home.html`);
        const response = await env.ASSETS.fetch(homeRequest);
        
        // === 只在这里添加缓存头部 ===
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "public, max-age=600");
        const finalResponse = new Response(response.body, { headers, status: response.status });
        
        // 存储到缓存
        ctx.waitUntil(cache.put(new Request(url.toString(), request), finalResponse.clone()));
        return finalResponse;
      }

      // 2. 调试工具（curl/wget 等）
      if (/curl|wget|httpie|python-requests/i.test(ua)) {
        const response = new Response("api 文件内容示例字符串", {
          status: 200,
          headers: { 
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300" // 添加缓存
          }
        });
        
        // 存储到缓存
        ctx.waitUntil(cache.put(new Request(url.toString(), request), response.clone()));
        return response;
      }

      // 3. 其他情况默认当成 API 调用 → 返回 api 文件下载
      if (!env.ASSETS) {
        return new Response("ASSETS binding not configured", { status: 500 });
      }
      const apiRequest = new Request(`${url.origin}/api`);
      const response = await env.ASSETS.fetch(apiRequest);

      if (response.status === 200) {
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/octet-stream");
        headers.set("Content-Disposition", 'attachment; filename="api"');
        headers.set("Cache-Control", "public, max-age=300"); // 添加缓存
        
        const finalResponse = new Response(response.body, { status: 200, headers });
        
        // 存储到缓存
        ctx.waitUntil(cache.put(new Request(url.toString(), request), finalResponse.clone()));
        return finalResponse;
      }
      return new Response("api file not found", { status: 404 });
    }

    // 其他路径交给 ASSETS
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      
      // === 可选：为静态资源添加缓存 ===
      if (response.status === 200 && request.method === "GET") {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("image/") || 
            contentType.includes("font/") ||
            contentType.includes("application/javascript") ||
            contentType.includes("text/css")) {
          
          const headers = new Headers(response.headers);
          headers.set("Cache-Control", "public, max-age=86400");
          return new Response(response.body, { headers, status: response.status });
        }
      }
      
      return response;
    }
    return new Response("Not Found", { status: 404 });
  }
};
