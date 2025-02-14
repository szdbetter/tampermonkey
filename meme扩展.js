// ==UserScript==
// @name         GMGN扩展
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在GMGN页面上为Solana合约地址添加快捷操作图标
// @author       Your name
// @match        https://gmgn.ai/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // 存储已处理的地址
    const processedAddresses = new Set();
    let lastUrl = location.href;
    let isProcessing = false;

    // 获取父元素的样式
    function getParentStyles(element) {
        const computedStyle = window.getComputedStyle(element);
        return {
            fontSize: computedStyle.fontSize,
            lineHeight: computedStyle.lineHeight,
            color: computedStyle.color,
            fontFamily: computedStyle.fontFamily,
            display: computedStyle.display
        };
    }

    // 创建按钮并应用样式
    function createButton(match, parentElement) {
        const button = document.createElement('button');
        button.textContent = '查';
        button.className = 'gmgn-search-button';
        
        // 获取父元素样式
        const parentStyles = getParentStyles(parentElement);
        const fontSize = parseInt(parentStyles.fontSize) || 12;
        
        // 设置基础样式
        button.style.cssText = `
            margin: 0 4px;
            padding: 0 4px;
            border-radius: 4px;
            background: #5C6068;
            color: white;
            cursor: pointer;
            border: none;
            font-size: ${Math.min(fontSize, 14)}px;
            line-height: ${Math.min(fontSize + 4, 18)}px;
            font-family: ${parentStyles.fontFamily};
            vertical-align: baseline;
            display: inline-block;
            min-width: auto;
            min-height: auto;
            position: relative;
            top: -1px;
            white-space: nowrap;
            text-decoration: none;
            user-select: none;
        `;

        button.onclick = function(e) {
            e.stopPropagation();
            e.preventDefault();
            copyAddress(match);
        };

        return button;
    }

    // 处理页面上的文本节点,查找并添加按钮
    function processTextNodes(node) {
        if (isProcessing) return;
        
        // 跳过已处理的节点
        if (node.getAttribute && node.getAttribute('data-processed')) {
            return;
        }

        // 处理文本节点
        if (node.nodeType === 3) {
            const text = node.nodeValue;
            // 匹配Solana地址格式
            const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
            
            if (matches.length > 0) {
                const span = document.createElement('span');
                span.style.whiteSpace = 'nowrap';
                let lastIndex = 0;
                
                matches.forEach(match => {
                    // 如果地址已经处理过，跳过
                    if (processedAddresses.has(match)) {
                        return;
                    }
                    
                    const index = text.indexOf(match, lastIndex);
                    // 添加之前的文本
                    if (index > lastIndex) {
                        span.appendChild(document.createTextNode(text.slice(lastIndex, index)));
                    }
                    
                    // 创建地址容器
                    const addressSpan = document.createElement('span');
                    addressSpan.style.whiteSpace = 'nowrap';
                    addressSpan.textContent = match;
                    addressSpan.setAttribute('data-processed', 'true');
                    
                    // 创建查按钮
                    const button = createButton(match, node.parentNode);
                    
                    // 将地址和按钮添加到容器中
                    addressSpan.appendChild(button);
                    span.appendChild(addressSpan);
                    
                    lastIndex = index + match.length;
                    
                    // 标记该地址已处理
                    processedAddresses.add(match);
                });
                
                // 添加剩余文本
                if (lastIndex < text.length) {
                    span.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === 1) { // 元素节点
            // 检查节点是否包含href属性并且href值包含合约地址
            if (node.hasAttribute('href')) {
                const href = node.getAttribute('href');
                const matches = href.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
                if (matches && !processedAddresses.has(matches[0])) {
                    // 为链接添加按钮
                    const button = createButton(matches[0], node);
                    if (!node.nextSibling || node.nextSibling.tagName !== 'BUTTON') {
                        node.parentNode.insertBefore(button, node.nextSibling);
                        // 标记该地址已处理
                        processedAddresses.add(matches[0]);
                    }
                }
            }
            
            // 递归处理子节点
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                Array.from(node.childNodes).forEach(child => processTextNodes(child));
            }
        }
        
        // 标记节点已处理
        if (node.setAttribute) {
            node.setAttribute('data-processed', 'true');
        }
    }

    // 复制地址到剪贴板
    function copyAddress(address) {
        console.log('[GMGN扩展] 开始处理页面...');
        GM_setClipboard(address);
        console.log('[GMGN扩展] 地址复制成功！');
        
        // 获取短地址和完整地址
        const shortAddr = address.slice(0, 4) + '...' + address.slice(-3);
        console.log('[GMGN扩展] 短地址:', shortAddr);
        console.log('[GMGN扩展] 完整地址:', address);
    }

    // 重置并处理页面
    function resetAndProcessPage() {
        if (isProcessing) return;
        isProcessing = true;
        
        try {
            // 移除所有现有的查按钮
            document.querySelectorAll('.gmgn-search-button').forEach(btn => btn.remove());
            // 清除处理标记
            document.querySelectorAll('[data-processed]').forEach(el => el.removeAttribute('data-processed'));
            // 清空已处理地址集合
            processedAddresses.clear();
            // 重新处理页面
            processTextNodes(document.body);
        } finally {
            isProcessing = false;
        }
    }

    // 处理整个页面
    function processPage() {
        if (isProcessing) return;
        processTextNodes(document.body);
    }

    // 监听URL变化
    function checkUrlChange() {
        const currentUrl = location.href;
        if (lastUrl !== currentUrl) {
            console.log('[GMGN扩展] URL变化，重新处理页面');
            lastUrl = currentUrl;
            // 延迟处理以等待页面内容加载
            setTimeout(resetAndProcessPage, 500);
        }
    }

    // 使用防抖来限制处理频率
    function debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    // 处理滚动事件
    const handleScroll = debounce(() => {
        console.log('[GMGN扩展] 页面滚动，检查新内容');
        processPage();
    }, 200);

    // 初始化
    function initialize() {
        // 页面加载完成后处理
        resetAndProcessPage();
        
        // 监听URL变化
        setInterval(checkUrlChange, 500);
        
        // 监听popstate事件（处理浏览器前进/后退）
        window.addEventListener('popstate', () => {
            console.log('[GMGN扩展] 检测到页面导航');
            setTimeout(resetAndProcessPage, 500);
        });
        
        // 监听pushState和replaceState
        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            console.log('[GMGN扩展] 检测到pushState');
            setTimeout(resetAndProcessPage, 500);
        };
        
        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            console.log('[GMGN扩展] 检测到replaceState');
            setTimeout(resetAndProcessPage, 500);
        };
        
        // 监听滚动
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // 监听DOM变化
        const observer = new MutationObserver(debounce(() => {
            console.log('[GMGN扩展] 检测到DOM变化');
            processPage();
        }, 200));

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // 启动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();

