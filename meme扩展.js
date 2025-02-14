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

    // 获取父元素的样式
    function getParentStyles(element) {
        const computedStyle = window.getComputedStyle(element);
        return {
            fontSize: computedStyle.fontSize,
            lineHeight: computedStyle.lineHeight,
            color: computedStyle.color,
            fontFamily: computedStyle.fontFamily
        };
    }

    // 创建按钮并应用样式
    function createButton(match, parentElement) {
        const button = document.createElement('button');
        button.textContent = '查';
        
        // 获取父元素样式
        const parentStyles = getParentStyles(parentElement);
        
        // 设置基础样式
        button.style.cssText = `
            margin-left: 4px;
            padding: 1px 4px;
            border-radius: 4px;
            background: #5C6068;
            color: white;
            cursor: pointer;
            border: none;
            font-size: ${parentStyles.fontSize};
            line-height: ${parentStyles.lineHeight};
            font-family: ${parentStyles.fontFamily};
            vertical-align: middle;
            min-width: auto;
            min-height: auto;
        `;

        button.onclick = function(e) {
            e.stopPropagation();
            copyAddress(match);
        };

        return button;
    }

    // 处理页面上的文本节点,查找并添加按钮
    function processTextNodes(node) {
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
        processedAddresses.clear();
        processTextNodes(document.body);
    }

    // 处理整个页面
    function processPage() {
        processTextNodes(document.body);
    }

    // 监听URL变化
    function checkUrlChange() {
        if (lastUrl !== location.href) {
            lastUrl = location.href;
            resetAndProcessPage();
        }
    }

    // 页面加载完成后处理
    window.addEventListener('load', resetAndProcessPage);

    // 监听URL变化
    setInterval(checkUrlChange, 1000);

    // 监听popstate事件（处理浏览器前进/后退）
    window.addEventListener('popstate', resetAndProcessPage);

    // 监听pushState和replaceState
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    
    history.pushState = function() {
        pushState.apply(history, arguments);
        resetAndProcessPage();
    };
    
    history.replaceState = function() {
        replaceState.apply(history, arguments);
        resetAndProcessPage();
    };

    // 使用防抖来限制处理频率
    function debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    // 监听DOM变化
    const observer = new MutationObserver(debounce(() => {
        resetAndProcessPage();
    }, 500));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
