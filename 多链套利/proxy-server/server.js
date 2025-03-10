/**
 * API代理服务器
 * 用于解决跨域问题，转发API请求
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS，允许所有来源的请求
app.use(cors());

// 解析JSON请求体
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 首页
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>API代理服务器</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
          .endpoint { font-weight: bold; color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>API代理服务器</h1>
        <p>这是一个用于解决跨域问题的API代理服务器。</p>
        
        <h2>使用方法</h2>
        <p>发送POST请求到 <span class="endpoint">/api/proxy</span> 端点，请求体格式如下：</p>
        <pre>
{
  "url": "https://example.com/api/data",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token"
  },
  "body": "可选的请求体"
}
        </pre>
        
        <h2>状态</h2>
        <p>服务器正在运行，端口: ${PORT}</p>
      </body>
    </html>
  `);
});

// 代理端点
app.post('/api/proxy', async (req, res) => {
  console.log('收到代理请求:', req.body);
  
  const { url, method, headers, body } = req.body;
  
  // 验证必要参数
  if (!url) {
    return res.status(400).json({ error: '缺少目标URL' });
  }
  
  try {
    console.log(`转发${method || 'GET'}请求到: ${url}`);
    
    // 发送请求到目标API
    const response = await axios({
      url,
      method: method || 'GET',
      headers: headers || {},
      data: body || undefined,
      validateStatus: () => true, // 返回所有状态码的响应
      timeout: 30000 // 30秒超时
    });
    
    console.log(`收到响应: ${response.status} ${response.statusText}`);
    
    // 返回响应
    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    console.error('代理请求失败:', error.message);
    
    res.status(500).json({
      error: '代理请求失败',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`API代理服务器运行在 http://localhost:${PORT}`);
  console.log(`代理端点: http://localhost:${PORT}/api/proxy`);
}); 