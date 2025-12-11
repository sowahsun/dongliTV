export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 访问根目录
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        // 检查是否有 ASSETS 绑定
        if (!env.ASSETS) {
          return new Response('Please add assets configuration to wrangler.jsonc', {
            headers: { 'content-type': 'text/plain' }
          });
        }
        
        // 获取 api.enc 文件
        const apiEncUrl = new URL('/api.enc', url.origin);
        const response = await env.ASSETS.fetch(new Request(apiEncUrl));
        
        if (response.status === 404) {
          return new Response('File api.enc not found in root directory', {
            status: 404,
            headers: { 'content-type': 'text/plain' }
          });
        }
        
        // 返回文件
        return response;
        
      } catch (error) {
        return new Response(`Error: ${error.message}`, {
          status: 500,
          headers: { 'content-type': 'text/plain' }
        });
      }
    }
    
    // 其他请求（包括直接访问 /api.enc）
    return env.ASSETS.fetch(request);
  }
};
