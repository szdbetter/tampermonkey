# API代理服务器

这是一个简单的API代理服务器，用于解决跨域问题，转发API请求。

## 安装

```bash
# 安装依赖
npm install
```

## 使用方法

```bash
# 启动服务器
npm start
```

服务器将在 http://localhost:3000 上运行。

## API端点

### 代理请求

**URL**: `/api/proxy`
**方法**: `POST`
**请求体**:

```json
{
  "url": "https://example.com/api/data",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token"
  },
  "body": "可选的请求体"
}
```

**响应**:

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "content-length": "1234"
  },
  "data": {
    // 目标API的响应数据
  }
}
```

## 在前端应用中使用

在您的前端应用中，可以通过以下方式使用代理服务器：

```javascript
// 发送请求到代理服务器
const response = await fetch('http://localhost:3000/api/proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/api/data',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
});

const data = await response.json();
console.log(data);
```

## 注意事项

- 此代理服务器仅用于开发环境，不建议在生产环境中使用
- 默认端口为3000，可以通过环境变量PORT更改
- 请求超时时间为30秒 