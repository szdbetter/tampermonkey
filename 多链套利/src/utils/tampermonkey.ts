/**
 * TamperMonkey 工具函数
 */

// TamperMonkey 类型声明
declare global {
  const GM_xmlhttpRequest: any;
  const GM_info: any;
}

/**
 * 使用 GM_xmlhttpRequest 发送跨域请求
 * @param url 请求 URL
 * @param method 请求方法
 * @param headers 请求头
 * @param data 请求体
 * @param timeout 超时时间（毫秒）
 * @returns Promise<any> 响应数据
 */
export const sendRequest = (
  url: string,
  method: 'GET' | 'POST' = 'GET',
  headers: Record<string, string> = {},
  data: any = null,
  timeout: number = 30000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // 检查 URL 是否有效
      if (!url || !url.trim()) {
        reject(new Error('无效的 URL: URL 不能为空'));
        return;
      }

      // 尝试解析 URL 以验证其格式
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (e) {
        reject(new Error(`无效的 URL 格式: ${url}`));
        return;
      }

      // 检查 GM_xmlhttpRequest 是否可用
      if (typeof GM_xmlhttpRequest === 'undefined') {
        console.warn('GM_xmlhttpRequest 不可用，将使用 fetch API');
        tryFetchAPI(url);
        return;
      }

      // 使用 TamperMonkey 的 GM_xmlhttpRequest 发送请求
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
        responseType: 'json',
        timeout,
        onload: function(response: any) {
          if (response.status >= 200 && response.status < 300) {
            try {
              const data = typeof response.response === 'string' 
                ? JSON.parse(response.response) 
                : response.response;
              resolve(data);
            } catch (e) {
              reject(new Error(`解析响应失败: ${e instanceof Error ? e.message : String(e)}`));
            }
          } else {
            let errorMsg = `请求失败: 状态码 ${response.status}`;
            if (response.statusText) {
              errorMsg += ` - ${response.statusText}`;
            }
            if (response.responseText) {
              try {
                const errorResponse = JSON.parse(response.responseText);
                errorMsg += `\n服务器响应: ${JSON.stringify(errorResponse)}`;
              } catch {
                errorMsg += `\n服务器响应: ${response.responseText.substring(0, 200)}${response.responseText.length > 200 ? '...' : ''}`;
              }
            }
            reject(new Error(errorMsg));
          }
        },
        onerror: function(error: any) {
          let errorMsg = '请求错误';
          if (error.error) {
            errorMsg += `: ${error.error}`;
          }
          if (error.details) {
            errorMsg += `\n详情: ${error.details}`;
          }
          // 如果 GM_xmlhttpRequest 出错，尝试使用代理服务
          console.warn('GM_xmlhttpRequest 出错，尝试使用代理服务', error);
          tryProxyService(url);
        },
        ontimeout: function() {
          // 如果 GM_xmlhttpRequest 超时，尝试使用代理服务
          console.warn('GM_xmlhttpRequest 超时，尝试使用代理服务');
          tryProxyService(url);
        }
      });
    } catch (error) {
      // 如果 GM_xmlhttpRequest 出错，尝试使用代理服务
      console.warn('GM_xmlhttpRequest 出错，尝试使用代理服务', error);
      tryProxyService(url);
    }

    // 使用代理服务绕过 CORS 限制
    function tryProxyService(originalUrl: string) {
      console.log('使用代理服务发送请求:', originalUrl);
      
      // 使用 CORS 代理服务
      // 可选的代理服务列表
      const proxyServices = [
        `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(originalUrl)}`,
        `https://cors-anywhere.herokuapp.com/${originalUrl}`
      ];
      
      // 选择第一个代理服务
      const proxyUrl = proxyServices[0];
      
      console.log('使用代理 URL:', proxyUrl);
      
      // 使用 fetch API 发送代理请求
      const fetchOptions: RequestInit = {
        method,
        mode: 'cors',
        credentials: 'omit' // 对于代理请求，不发送凭据
      };
      
      // 对于代理服务，可能需要调整请求头
      const proxyHeaders: Record<string, string> = { ...headers };
      
      // 某些代理服务可能不需要或不支持某些请求头
      delete proxyHeaders['Origin'];
      delete proxyHeaders['Referer'];
      
      fetchOptions.headers = proxyHeaders;
      
      if (method === 'POST' && data) {
        fetchOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
      
      const controller = new AbortController();
      fetchOptions.signal = controller.signal;
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        controller.abort();
        // 如果代理服务也失败，尝试使用普通的 fetch
        tryFetchAPI(originalUrl);
      }, timeout);
      
      fetch(proxyUrl, fetchOptions)
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            // 如果代理服务返回错误，尝试使用普通的 fetch
            return tryFetchAPI(originalUrl);
          }
          return response.text().then(text => {
            try {
              // 某些代理服务会在响应中包装原始响应
              if (proxyUrl.includes('allorigins.win')) {
                // allorigins 格式: { contents: "原始响应" }
                const wrapped = JSON.parse(text);
                return wrapped.contents ? JSON.parse(wrapped.contents) : {};
              }
              
              return text ? JSON.parse(text) : {};
            } catch (e) {
              console.warn('响应不是有效的 JSON:', text);
              return text;
            }
          });
        })
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          // 如果代理服务也失败，尝试使用普通的 fetch
          tryFetchAPI(originalUrl);
        });
    }

    // 使用 fetch API 作为备用方法
    function tryFetchAPI(urlToFetch: string) {
      console.log('使用 fetch API 发送请求:', urlToFetch);
      
      const fetchOptions: RequestInit = {
        method,
        headers,
        mode: 'cors',
        credentials: 'omit' // 更改为 'omit'，避免发送凭据导致的 CORS 问题
      };
      
      if (data) {
        fetchOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
      }
      
      const controller = new AbortController();
      fetchOptions.signal = controller.signal;
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`请求超时 (${timeout}ms)`));
      }, timeout);
      
      fetch(urlToFetch, fetchOptions)
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            return response.text().then(text => {
              let errorMsg = `请求失败: 状态码 ${response.status}`;
              if (response.statusText) {
                errorMsg += ` - ${response.statusText}`;
              }
              
              try {
                const errorJson = JSON.parse(text);
                errorMsg += `\n服务器响应: ${JSON.stringify(errorJson)}`;
              } catch {
                if (text) {
                  errorMsg += `\n服务器响应: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`;
                }
              }
              
              throw new Error(errorMsg);
            });
          }
          return response.text().then(text => {
            try {
              return text ? JSON.parse(text) : {};
            } catch (e) {
              console.warn('响应不是有效的 JSON:', text);
              return text;
            }
          });
        })
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          
          // 提供更详细的错误信息
          let errorMsg = error.message || 'Unknown fetch error';
          
          // 检查是否是网络错误
          if (errorMsg === 'Failed to fetch') {
            errorMsg = '网络请求失败，可能的原因：\n' +
                      '1. 网络连接问题\n' +
                      '2. CORS 跨域限制 (即使安装了 CORS Unblock 插件)\n' +
                      '3. 目标服务器不可达\n' +
                      '4. 请求的 URL 格式不正确\n' +
                      `请检查 URL: ${urlToFetch}`;
          }
          
          // 检查是否是 CORS 错误
          if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin')) {
            errorMsg += '\n\n解决方案：\n' +
                       '1. 确保 CORS Unblock 插件已启用并正常工作\n' +
                       '2. 尝试使用 TamperMonkey 的 @connect 指令连接到目标域名\n' +
                       '3. 检查目标服务器是否允许跨域请求';
          }
          
          // 检查是否是 SSL/证书错误
          if (errorMsg.includes('SSL') || errorMsg.includes('certificate')) {
            errorMsg += '\n\n可能是目标网站的 SSL 证书有问题，请在浏览器中直接访问该 URL 确认是否可以正常访问';
          }
          
          reject(new Error(errorMsg));
        });
    }
  });
};

/**
 * 检查是否在TamperMonkey环境中运行
 * @returns {boolean} 是否在TamperMonkey环境中
 */
export const isTamperMonkeyEnvironment = (): boolean => {
  // 由于使用了CORS unblock插件，我们可以直接返回true
  // 这样就会使用直接请求而不是代理
  return true;
  
  // 原始检测代码（注释掉）
  // return typeof GM_info !== 'undefined' && typeof GM_xmlhttpRequest !== 'undefined';
}; 