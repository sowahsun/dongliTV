export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 如果是根目录请求，返回 api.enc 文件
    if (url.pathname === '/' || url.pathname === '/index.html') {
      // 获取 api.enc 文件
      const fileRequest = new Request(`${url.origin}/api.enc`);
      const response = await env.ASSETS.fetch(fileRequest);
      
      // 如果是 404，说明文件不存在
      if (response.status === 404) {
        return new Response('api.enc not found', { status: 404 });
      }
      
      // 返回文件，设置为下载
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Content-Disposition', 'attachment; filename="api.enc"');
      
      return new Response(response.body, {
        status: 200,
        headers: headers
      });
    }
    
    // 其他请求正常处理
    return env.ASSETS.fetch(request);
  }
};
