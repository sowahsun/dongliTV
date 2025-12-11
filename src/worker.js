export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      // 根目录返回 api.enc
      if (url.pathname === '/' || url.pathname === '/index.html') {
        // 检查是否有 ASSETS 绑定
        if (!env.ASSETS) {
          return new Response('ASSETS binding not configured', { status: 500 });
        }
        
        const response = await env.ASSETS.fetch(new Request(`${url.origin}/api.enc`));
        
        if (response.status === 404) {
          return new Response('api.enc file not found', { status: 404 });
        }
        
        return response;
      }
      
      // 其他请求
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      
      return new Response('No assets configured', { status: 404 });
      
    } catch (error) {
      return new Response(`Worker Error: ${error.message}`, { status: 500 });
    }
  }
};
