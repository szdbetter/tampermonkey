// ==UserScript==
// @name         Chain.fm 监控工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  监控 Chain.fm 的交易数据并通过 Telegram 推送告警
// @author       Your name
// @match        https://chain.fm/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      pump.news
// @connect      www.pump.news
// @connect      frontend-api-v3.pump.fun
// @connect      api.dexscreener.com
// @connect      api.telegram.org
// @connect      memego.ai
// @connect      pump.fun
// @connect      gmgn.ai
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // API配置对象
    const API_CONFIG = {
        PUMP_NEWS: 'https://www.pump.news/api/trpc/analyze.getBatchTokenDataByTokenAddress,watchlist.batchTokenWatchState?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22tokenAddresses%22%3A%5B%22',
        MEMEGO: 'https://api.memego.ai/api/token-holders',
        DEXSCREENER: 'https://api.dexscreener.com/latest/dex/tokens',
        PUMP_FUN_DEV: 'https://frontend-api-v3.pump.fun/coins/user-created-coins'
    };

    // 格式化数字为K/M
    function formatNumber(value, keepDecimals = true) {
        if (typeof value !== 'number') return value;

        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(keepDecimals ? 2 : 0)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(keepDecimals ? 2 : 0)}K`;
        }

        return keepDecimals ? value.toFixed(2) : Math.floor(value).toString();
    }

    // 转换时间戳为北京时间
    function formatBeijingTime(timestamp) {
        if (!timestamp) {
            console.log('❌ 时间戳为空');
            return '未知';
        }
        try {
            // 检查时间戳是否需要乘以1000（如果是秒级时间戳）
            const ts = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
            const date = new Date(ts);

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                console.log('❌ 无效的时间戳:', timestamp);
                return '无效时间';
            }

            // 转换为北京时间
            const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
            return `${beijingDate.getUTCFullYear()}/${String(beijingDate.getUTCMonth() + 1).padStart(2, '0')}/${String(beijingDate.getUTCDate()).padStart(2, '0')} ${String(beijingDate.getUTCHours()).padStart(2, '0')}:${String(beijingDate.getUTCMinutes()).padStart(2, '0')}`;
        } catch (error) {
            console.error('❌ 时间格式化错误:', error);
            return '时间格式错误';
        }
    }

    // 格式化时间函数
    function formatTime(date) {
        return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // 获取Pump.news数据
    async function fetchPumpNewsData(tokenAddress) {
        console.log(`\n🔍 正在获取 Pump.news 数据，合约地址: ${tokenAddress}`);
        return new Promise((resolve, reject) => {
            const input = {
                "0": {
                    "json": {
                        "tokenAddresses": [tokenAddress]
                    }
                }
            };

            GM_xmlhttpRequest({

                method: 'GET',
                url: `${API_CONFIG.PUMP_NEWS}${tokenAddress}%22%5D%7D%7D%2C%221%22%3A%7B%22json%22%3A%7B%22tokenAddresses%22%3A%5B%22${tokenAddress}%22%5D%7D%7D%7D`,

                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);

                        console.log('Pump.news 原始响应数据:', data);

                        const tokenData = data[0]?.result?.data?.json?.data?.data?.[0];
                        if (!tokenData) {
                            console.log('❌ Pump.news数据获取失败: 数据结构不完整');
                            resolve(null);
                            return;
                        }

                        const result = {
                            narrative: tokenData.analysis?.['lang-zh-CN']?.summary || '',
                            createdTime: tokenData.pumpfun?.deploy_timestamp,
                            deployer: tokenData.pumpfun?.deployer,

                            totalTweets: tokenData.tweet_amount,
                            officialTweets: tokenData.stats?.official_tweets,
                            reach: tokenData.stats?.followers,
                            views: tokenData.stats?.views,
                            likes: tokenData.stats?.likes,
                            //officialTwitter: tokenData.social_links?.find(link => link.name === 'twitter')?.username,
                            officialTwitter: tokenData.pumpfun?.twitter,

                            website: tokenData.pumpfun?.website,
                        };

                        console.log('✅ Pump.news 解析后的数据:', result);
                        resolve(result);
                    } catch (error) {
                        console.error('❌ 解析Pump.news数据失败:', error);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.error('❌ 获取Pump.news数据出错:', error);
                    resolve(null);
                }
            });
        });
    }

    // 获取DexScreener数据
    async function fetchDexScreenerData(tokenAddress) {
        console.log(`\n🔍 正在获取 DexScreener 数据，合约地址: ${tokenAddress}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${API_CONFIG.DEXSCREENER}/${tokenAddress}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('DexScreener 原始响应数据:', data);

                        if (!data || !data.pairs || data.pairs.length === 0) {
                            console.log('❌ DexScreener数据获取失败: 无效数据');
                            resolve(null);
                            return;
                        }

                        const pair = data.pairs[0];
                        const result = {
                            volume5m: pair.volume?.m5 || 0,
                            volume1h: pair.volume?.h1 || 0,
                            volume6h: pair.volume?.h6 || 0,
                            volume24h: pair.volume?.h24 || 0
                        };

                        console.log('✅ DexScreener 解析后的数据:', result);
                        resolve(result);
                    } catch (error) {
                        console.error('❌ 解析DexScreener数据失败:', error);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.error('❌ 获取DexScreener数据出错:', error);
                    resolve(null);
                }
            });
        });
    }

    // 获取Memego数据
    async function fetchMemegoData(tokenAddress) {
        console.log(`\n🔍 正在获取 Memego 数据，合约地址: ${tokenAddress}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${API_CONFIG.MEMEGO}?addresses=${tokenAddress}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('Memego 原始响应数据:', data);

                        if (!data || !data.results || !data.results[0] || !data.results[0].holders) {
                            console.log('❌ Memego数据获取失败: 数据结构不完整');
                            resolve(null);
                            return;
                        }

                        const result = {
                            holderCount: data.results[0].holders.total
                        };

                        console.log('✅ Memego 解析后的数据:', result);
                        resolve(result);
                    } catch (error) {
                        console.error('❌ 解析Memego数据失败:', error);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.error('❌ 获取Memego数据出错:', error);
                    resolve(null);
                }
            });
        });
    }

    // 获取开发者历史数据
    async function fetchDevHistory(devAddress) {
        if (!devAddress) {
            console.log('❌ 开发者地址为空');
            return null;
        }

        const url = `${API_CONFIG.PUMP_FUN_DEV}/${devAddress}?offset=0&limit=10&includeNsfw=false`;
        console.log(`\n🔍 正在获取开发者历史数据(fetchDevHistory函数中)，地址: ${devAddress}`);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log(`\n🔍 正在获取开发者历史数据，地址: ${devAddress}, 完整URL：${url}`);
                        console.log('开发者历史原始响应数据:', data);

                        // 修改判断逻辑：检查是否是数组且有数据
                        if (!Array.isArray(data) || data.length === 0) {
                            console.log('❌ 开发者历史数据获取失败: 数据为空或格式不正确');
                            resolve(null);
                            return;
                        }

                        // 处理数据：统计发币历史
                        const result = {
                            totalTokens: data.length, // 总发币数量
                            successTokens: data.filter(token => token.complete).length, // 成功的代币数量
                            successRate: 0, // 成功率
                            highestMarketCap: Math.max(...data.map(token => token.usd_market_cap || 0)) // 最高市值
                        };

                        // 计算成功率
                        result.successRate = ((result.successTokens / result.totalTokens) * 100).toFixed(2) + '%';

                        console.log('✅ 开发者历史解析后的数据:', result);
                        resolve(result);
                    } catch (error) {
                        console.error('❌ 解析开发者历史数据失败:', error);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.error('❌ 获取开发者历史数据出错:', error);
                    resolve(null);
                }
            });
        });
    }

    // 等待页面完全加载和初始化
    function waitForPageLoad() {
        const now = new Date().toLocaleTimeString();
        console.log(`%c[${now}] 系统: ⌛ 等待页面加载...`, 'color: #2196F3');

        // 检查是否出现 Cloudflare 错误
        const checkCloudflareError = () => {
            const errorText = document.body.innerText;
            const isCloudflareError = errorText.includes('Error code 520') ||
                                    errorText.includes('Web server is returning an unknown error') ||
                                    errorText.includes('cloudflare.com');

            if (isCloudflareError) {
                console.log(`%c[${now}] 系统: ⚠️ 检测到 Cloudflare 错误，准备刷新页面...`, 'color: #ff6b6b');
                setTimeout(() => {
                    window.location.href = 'https://chain.fm/home?events=%257B%2522event%2522%253A%2522token%253Abuy%2522%252C%2522filter_expressions%2522%253A%255B%2522data.order.volume_native%2520%253E%25201%2520and%2520aggs.buy.addrs_15m%2520%253E%25203%2522%255D%257D&events=%257B%2522event%2522%253A%2522token%253Asell%2522%252C%2522filter_expressions%2522%253A%255B%2522data.order.volume_native%2520%253E%25203%2522%255D%257D';
                }, 5000); // 5秒后刷新
                return true;
            }
            return false;
        };

        // 如果检测到错误，直接返回
        if (checkCloudflareError()) {
            return;
        }

        // 检查页面是否已完全加载
        if (document.readyState !== 'complete') {
            console.log(`%c[${now}] 系统: 📡 页面加载状态 = ${document.readyState}`, 'color: #ff9800');
            setTimeout(waitForPageLoad, 1000);
            return;
        }

        // 检查关键元素是否存在
        const tradeElements = document.querySelectorAll('[class*="css-"][class*="trade-item"], [class*="css-"][class*="trade-list-item"], .css-6n7j50');
        const buttons = document.querySelectorAll('button.chakra-button');

        // 只要有交易列表或按钮就继续
        if (!tradeElements.length && !buttons.length) {
            console.log(`%c[${now}] 系统: ⏳ 等待主要内容加载...`, 'color: #ff9800');
            console.log(`  - 交易列表: ${tradeElements.length ? '✅' : '❌'}`);
            console.log(`  - 按钮: ${buttons.length ? '✅' : '❌'}`);
            setTimeout(waitForPageLoad, 1000);
            return;
        }

        // 页面已完全加载，开始初始化
        console.log(`%c[${now}] 系统: ✅ 页面已完全加载，开始初始化监控...`, 'color: #4CAF50');
        initializeMonitor();
    }

    // 初始化监控系统
    function initializeMonitor() {
        // 按钮监听配置
        const BUTTON_CONFIG = {
            CHECK_INTERVAL: 5000,    // 检查按钮状态的间隔（毫秒）
            START_TEXT: '开始收听',   // 开始收听的按钮文字
            LIVE_TEXT: '实时'        // 实时状态的按钮文字
        };

        // 检查并点击开始收听按钮
        function checkAndClickStartButton() {
            const now = new Date().toLocaleTimeString();

            // 使用更精确的选择器
            const targetButton = document.querySelector('button.chakra-button.css-6wnql4');

            if (!targetButton) {
                console.log(`%c[${now}] 按钮监听: ❌ 未找到收听按钮`, 'color: #ff6b6b');
                return;
            }

            const buttonText = targetButton.textContent.trim();
            const buttonIcon = targetButton.querySelector('svg[viewBox="0 0 384 512"]') ? '✅' : '❌';

            console.log(`%c[${now}] 按钮监听: 🎯 找到目标按钮:`, 'color: #4CAF50');
            console.log(`  - 文字: [${buttonText}]`);
            console.log(`  - 图标: [${buttonIcon}]`);
            console.log(`  - 类名: [${targetButton.className}]`);

            if (buttonText === '开始收听' || buttonText.includes('开始收听')) {
                console.log(`%c[${now}] 按钮监听: 🔄 准备点击 [开始收听] 按钮...`, 'color: #ff9800; font-weight: bold');
                try {
                    // 使用事件触发方式点击按钮
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    targetButton.dispatchEvent(clickEvent);
                    console.log(`%c[${now}] 按钮监听: ✅ 点击成功`, 'color: #4CAF50');
                } catch (error) {
                    console.log(`%c[${now}] 按钮监听: ❌ 点击失败: ${error.message}`, 'color: #ff6b6b');
                    // 尝试备用点击方法
                    try {
                        targetButton.click();
                        console.log(`%c[${now}] 按钮监听: ✅ 备用点击成功`, 'color: #4CAF50');
                    } catch (backupError) {
                        console.log(`%c[${now}] 按钮监听: ❌ 备用点击也失败: ${backupError.message}`, 'color: #ff6b6b');
                    }
                }
            } else if (buttonText === '实时' || buttonText.includes('实时')) {
                console.log(`%c[${now}] 按钮监听: ✅ 按钮已处于 [实时] 状态`, 'color: #4CAF50; font-weight: bold');
            } else {
                console.log(`%c[${now}] 按钮监听: ❓ 未知按钮状态: [${buttonText}]`, 'color: #ff6b6b; font-weight: bold');
            }
        }

        // 启动按钮状态监听
        function startButtonMonitor() {
            const now = new Date().toLocaleTimeString();
            console.log(`%c[${now}] 按钮监听: 🚀 启动监听服务...`, 'color: #2196F3; font-weight: bold');

            // 立即检查一次
            checkAndClickStartButton();

            // 定期检查按钮状态
            const intervalId = setInterval(checkAndClickStartButton, BUTTON_CONFIG.CHECK_INTERVAL);

            // 添加DOM变化监听
            const observer = new MutationObserver((mutations) => {
                const now = new Date().toLocaleTimeString();
                console.log(`%c[${now}] 按钮监听: 👀 检测到DOM变化`, 'color: #9c27b0');
                checkAndClickStartButton();
            });

            // 配置观察选项
            const config = {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            };

            // 开始观察整个文档
            observer.observe(document.body, config);
            console.log(`%c[${now}] 按钮监听: 👀 DOM变化监听已启动`, 'color: #2196F3');

            // 保存到全局变量，方便调试
            window.chainFM = {
                observer,
                intervalId,
                checkButton: checkAndClickStartButton
            };
        }

        // 等待按钮出现后启动监听
        function waitForButton() {
            const now = new Date().toLocaleTimeString();
            const targetButton = document.querySelector('button.chakra-button.css-6wnql4');

            if (targetButton) {
                console.log(`%c[${now}] 按钮监听: ✨ 找到收听按钮，准备启动监听...`, 'color: #4CAF50; font-weight: bold');
                startButtonMonitor();
            } else {
                console.log(`%c[${now}] 按钮监听: ⏳ 未找到收听按钮，继续等待...`, 'color: #ff9800');
                setTimeout(waitForButton, 1000);
            }
        }

        // 启动按钮监听
        console.log(`%c[${new Date().toLocaleTimeString()}] 系统: 🚀 开始启动按钮监听...`, 'color: #2196F3');
        waitForButton();

        // 重要聪明钱列表
        const IMPORTANT_SMART_MONEY = [
            '0xSun',
            '王小二',
            '凉粉小刀',
            '猴哥',
            '冷静',
            'Pow',
            'Frank',
            'Sweep',
            'chenpepe',
            'marcell',
            '女王',
            '0xAA',
            'Ansem',
            'YuYue',
            'CryptoD',
            '易经',
        ];

        // 检查是否是重要聪明钱
        function isImportantSmartMoney(name) {
            return IMPORTANT_SMART_MONEY.some(important => name.includes(important));
        }

        // Telegram 机器人配置
        const TELEGRAM_CONFIG = {
            botToken: '7763135679:', // 新机器人的API令牌
            defaultChatId: '5001695999',                                 // 默认接收消息的聊天ID
            commands: {
                start: '/start',           // 订阅命令
                stop: '/stop',            // 取消订阅命令
                status: '/status'         // 查看状态命令
            }
        };

        // 告警条件配置
        const ALERT_CONDITIONS = {
            MIN_TOTAL_TRADES: 0,    // 最小交易次数
            MIN_TOTAL_TRADERS: 4,   // 最小交易人数
            MIN_NET_FLOW: 20,       // 最小净流入（SOL）
            PUSH_INTERVAL: 60 * 1000 // 同一Token的推送间隔（毫秒）
        };

        // 数据处理配置
        const PROCESS_CONFIG = {
            CLEANUP_INTERVAL: 5 * 60 * 1000,  // 清理过期记录的间隔（5分钟）
            UPDATE_INTERVAL: 15000,            // 数据更新最小间隔（5秒）
            MAX_DISPLAY_TRADES: 3,            // 显示最新交易的数量
            REFRESH_DELAY: 180000             // 数据延迟超过此时间后自动刷新（3分钟）
        };

        // 存储配置
        const STORAGE_CONFIG = {
            HISTORY_KEY: 'chainFM_pushHistory',  // localStorage存储键名
            PUSH_COUNT_KEY: 'chainFM_pushCount', // 推送计数存储键名
            SUBSCRIBERS_KEY: 'chainFM_subscribers', // 订阅者存储键名
            PROCESSED_MESSAGES_KEY: 'chainFM_processedMessages' // 已处理消息记录键名
        };

        // 添加重试配置
        const RETRY_CONFIG = {
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000 // 1秒
        };

        // 清空控制台并初始化全局变量
        console.clear();
        let latestTrades = [];  // 存储最新的交易数据

        // 存储上次推送时的最新数据时间和推送时间戳
        let lastPushInfo = (() => {
            try {
                const saved = GM_getValue('chainFM_lastPushInfo');
                return saved ? JSON.parse(saved) : { dataTime: '', timestamp: 0 };
            } catch (error) {
                return { dataTime: '', timestamp: 0 };
            }
        })();

        // 清理已存在的监听器
        if (window.chainFM && window.chainFM.observer) {
            console.log('检测到已存在的监听器，正在清理...');
            window.chainFM.observer.disconnect();
        }

        // 从localStorage加载推送历史
        function loadPushHistory() {
            try {
                cleanupOldRecords();
                const savedHistory = GM_getValue(STORAGE_CONFIG.HISTORY_KEY);
                if (savedHistory) {
                    return new Map(JSON.parse(savedHistory));
                }
            } catch (error) {
                console.error('加载推送历史失败:', error);
            }
            return new Map();
        }

        // 保存推送历史到localStorage
        function savePushHistory(history) {
            try {
                GM_setValue(STORAGE_CONFIG.HISTORY_KEY, JSON.stringify([...history]));
            } catch (error) {
                console.error('保存推送历史失败:', error);
            }
        }

        // 清理过期的推送记录
        function cleanupOldRecords() {
            try {
                const now = Date.now();
                const savedHistory = GM_getValue(STORAGE_CONFIG.HISTORY_KEY);
                if (savedHistory) {
                    const history = new Map(JSON.parse(savedHistory));
                    let cleanupCount = 0;
                    for (const [key, time] of history.entries()) {
                        if (parseInt(time) <= now - PROCESS_CONFIG.CLEANUP_INTERVAL) {
                            history.delete(key);
                            cleanupCount++;
                        }
                    }
                    if (cleanupCount > 0) {
                        GM_setValue(STORAGE_CONFIG.HISTORY_KEY, JSON.stringify([...history]));
                        console.log(`清理了 ${cleanupCount} 条过期的推送记录`);
                    }
                }
            } catch (error) {
                console.error('清理过期记录失败:', error);
            }
        }

        // 从localStorage加载推送计数
        function loadPushCount() {
            try {
                const savedCount = GM_getValue(STORAGE_CONFIG.PUSH_COUNT_KEY);
                if (savedCount) {
                    return new Map(JSON.parse(savedCount));
                }
            } catch (error) {
                console.error('加载推送计数失败:', error);
            }
            return new Map();
        }

        // 保存推送计数到localStorage
        function savePushCount(countMap) {
            try {
                GM_setValue(STORAGE_CONFIG.PUSH_COUNT_KEY, JSON.stringify([...countMap]));
            } catch (error) {
                console.error('保存推送计数失败:', error);
            }
        }

        // 更新Token的推送次数
        function updatePushCount(token, tokenId) {
            const countMap = loadPushCount();
            const key = `${token}_${tokenId}`;
            const currentCount = countMap.get(key) || 0;
            countMap.set(key, currentCount + 1);
            savePushCount(countMap);
            return currentCount + 1;
        }

        // 初始化推送历史
        const pushHistory = loadPushHistory();

        // 检查是否可以推送
        function canPushToken(token, tokenId) {
            const key = `${token}_${tokenId}`;
            const lastPushTime = pushHistory.get(key);
            const now = Date.now();

            console.log(`\n检查Token是否可以推送: ${token} (${tokenId})`);
            console.log(`上次推送时间: ${lastPushTime ? new Date(parseInt(lastPushTime)).toLocaleString() : '从未推送'}`);
            console.log(`当前时间: ${new Date(now).toLocaleString()}`);

            // 如果从未推送，或者已经超过冷却时间
            if (!lastPushTime || (now - parseInt(lastPushTime)) >= ALERT_CONDITIONS.PUSH_INTERVAL) {
                // 更新推送时间
                pushHistory.set(key, now.toString());
                savePushHistory(pushHistory); // 保存到localStorage
                console.log('✅ 可以推送');
                return true;
            }

            // 计算还需要等待的时间
            const waitTime = Math.ceil((parseInt(lastPushTime) + ALERT_CONDITIONS.PUSH_INTERVAL - now) / 1000);
            console.log(`%c❌ 不能推送，需要等待 ${waitTime} 秒`, 'color: #FF0000; font-size: 20px; font-weight: bold; text-shadow: 1px 1px 1px rgba(0,0,0,0.2)');
            return false;
        }

        // 修改发送Telegram消息的函数
        async function sendTelegramMessage(message, alerts) {
            if (!message || !alerts || alerts.length === 0) {
                console.log('没有需要推送的告警');
                return;
            }

            // 获取所有订阅者
            const subscribers = loadSubscribers();
            console.log(`准备向 ${subscribers.size} 个订阅者发送消息`);

            // 向所有订阅者发送消息
            const sendPromises = [...subscribers].map(chatId =>
                sendTelegramMessageToUser(chatId, message)
            );

            try {
                await Promise.all(sendPromises);
                console.log('消息已发送给所有订阅者');
            } catch (error) {
                console.error('发送消息时出错:', error);
            }
        }

        // 发送消息给单个用户
        async function sendTelegramMessageToUser(chatId, text, retryCount = 0) {
            const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
            const MAX_RETRIES = 3;

            try {
                console.log(`准备发送消息到 ${chatId}`);
                console.log('消息长度:', text.length);
                console.log('消息前20个字符:', text.slice(0, 20) + '...');

                // 在发送消息前应用长度限制
                const limitedMessage = limitMessageLength(text);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: limitedMessage,
                        parse_mode: 'HTML'
                    })
                });

                const data = await response.json();

                            if (!data.ok) {
                    console.error(`发送消息到 ${chatId} 失败:`, data.description);

                    // 检查错误类型，决定是否重试
                    const retryableErrors = [
                        'Bad Request: message is too long',
                        'Too Many Requests',
                        'Internal Server Error'
                    ];

                    if (retryCount < MAX_RETRIES && retryableErrors.some(err => data.description.includes(err))) {
                        console.log(`发送消息失败,1秒后重试(${retryCount + 1}/${MAX_RETRIES})...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return sendTelegramMessageToUser(chatId, text, retryCount + 1);
                    }

                    throw new Error(data.description || '未知错误');
                }

                console.log(`✅ 消息已发送到 ${chatId}`);
                return { success: true, messageId: data.result.message_id };

                        } catch (error) {
                console.error(`发送消息到 ${chatId} 失败:`, error);

                if (retryCount < MAX_RETRIES) {
                    console.log(`发送消息失败,1秒后重试(${retryCount + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return sendTelegramMessageToUser(chatId, text, retryCount + 1);
                }

                return { success: false, error: error.message };
            }
        }

        // 限制消息长度的函数
        function limitMessageLength(message, maxLength = 4000) {
            if (message.length <= maxLength) return message;

            // 截断消息，保留开头和结尾的关键信息
            const startPart = message.slice(0, maxLength * 0.7);
            const endPart = message.slice(-maxLength * 0.3);

            return `${startPart}...\n\n⚠️ 消息被截断，完整信息请查看详细日志。\n\n${endPart}`;
        }

        // 格式化告警消息
        async function formatAlertMessage(alerts, trades) {
            console.log('\n📝 开始格式化告警消息');
            console.log('收到的告警数据:', alerts);
            console.log('收到的交易数据:', trades);

            if (!alerts || alerts.length === 0) {
                console.log('❌ 没有告警数据，返回null');
                return null;
            }

            let message = '';

            // 使用 Promise.all 等待所有API数据获取完成
            const processedAlerts = await Promise.all(alerts.map(async alert => {
                console.log(`\n处理Token告警: ${alert.token} (${alert.tokenId})`);
                const canPush = canPushToken(alert.token, alert.tokenId);
                if (!canPush) {
                    console.log('❌ 该Token不能推送，跳过');
                    return null;
                }

                console.log('开始获取所有API数据...');

                // 先获取 Pump.news 数据
                const pumpNewsData = await fetchPumpNewsData(alert.tokenContract);
                console.log('Pump.news数据:', pumpNewsData);

                // 如果获取到了 pumpNewsData，再并行获取其他数据
                const [memegoData, dexScreenerData, devHistory] = await Promise.all([
                    fetchMemegoData(alert.tokenContract),
                    fetchDexScreenerData(alert.tokenContract),
                    // 只在有 deployer 地址时获取开发者历史
                    pumpNewsData?.deployer ? fetchDevHistory(pumpNewsData.deployer) : Promise.resolve(null)
                ]);


                console.log('\n获取的API数据汇总:');
                console.log('Pump.news数据:', pumpNewsData);
                console.log('Memego数据:', memegoData);
                console.log('DexScreener数据:', dexScreenerData);
                console.log('开发者历史数据:', devHistory);

                return {
                    alert,
                    pumpNewsData,
                    memegoData,
                    dexScreenerData,
                    devHistory
                };
            }));

            const canPushAlerts = processedAlerts.filter(item => item !== null);

            if (canPushAlerts.length === 0) {
                console.log('没有可推送的Token，返回null');
                return null;
            }

            for (const {alert, pumpNewsData, memegoData, dexScreenerData, devHistory} of canPushAlerts) {
                const pushCount = updatePushCount(alert.token, alert.tokenId);

                // 基本信息
                message += `🔔 ${alert.token} (${alert.marketCap}，Holder:${memegoData.holderCount.toLocaleString()}) | ${pushCount}次推送\n`;

                message += `📋 <b><code>${alert.tokenContract}</code></b>\n`;

                // 创建时间和叙事
                if (pumpNewsData?.createdTime) {
                    message += `📅 创建时间：${formatBeijingTime(pumpNewsData.createdTime)}\n\n`;
                }
                if (pumpNewsData?.narrative) {
                    message += `📖 叙事：${pumpNewsData.narrative}\n\n`;
                }


                // 开发者信息
                if (devHistory) {
                    message += `💀 DEV信息：\n`;
                    message += `发币${devHistory.totalTokens}次，成功${devHistory.successTokens}次，成功率${devHistory.successRate}，最高市值：${formatNumber(devHistory.highestMarketCap)}\n\n`;
                }
                // 交易量数据
                if (dexScreenerData) {
                    message += `📊 VOL(5m/1h/6h/24h)：${formatNumber(dexScreenerData.volume5m)}/${formatNumber(dexScreenerData.volume1h)}/${formatNumber(dexScreenerData.volume6h)}/${formatNumber(dexScreenerData.volume24h)}\n\n`;
                }

                // 社交媒体信息
                if (pumpNewsData) {
                    message += `💬 社交媒体：\n`;
                    message += `• 总推文（官方推文）：${pumpNewsData.totalTweets}（${pumpNewsData.officialTweets || 0}）\n`;
                    message += `• 触达人数：${formatNumber(pumpNewsData.reach)}，浏览数：${formatNumber(pumpNewsData.views)}，点赞数：${formatNumber(pumpNewsData.likes,false)}\n\n`;
                }


                // 聪明钱信息
                const smartMoneyBuyers = trades
                    .filter(t => t.type === 'buy' && t.token === alert.token && t.tokenId === alert.tokenId)
                    .reduce((acc, t) => {
                        if (!acc[t.traderId]) {
                            acc[t.traderId] = {
                                name: t.smartMoney,
                                amount: t.solAmount,
                                isImportant: isImportantSmartMoney(t.smartMoney)
                            };
                        } else {
                            acc[t.traderId].amount += t.solAmount;
                        }
                        return acc;
                    }, {});

                const allBuyers = Object.values(smartMoneyBuyers)
                    .sort((a, b) => b.amount - a.amount);

                const msgImportantBuyers = allBuyers.filter(buyer => buyer.isImportant);
                const msgNormalBuyers = allBuyers.filter(buyer => !buyer.isImportant);

                if (msgImportantBuyers.length > 0) {
                    message += `🌟 <b>重要聪明钱：</b>\n${msgImportantBuyers
                        .map(buyer => `   ${buyer.name}(${buyer.amount.toFixed(0)} SOL)`)
                        .join('\n')}\n\n`;
                }

                if (msgNormalBuyers.length > 0) {
                    message += `🧠 聪明钱：${msgNormalBuyers
                        .map(buyer => `${buyer.name}(${buyer.amount.toFixed(0)} SOL)`)
                        .join('、')}\n\n`;
                }
/*
                // 交易数据
                message += `📈 买入：${alert.buyCount}次 / ${alert.buyAmount.toFixed(0)} SOL\n`;
                message += `📉 卖出：${alert.sellCount}次 / ${alert.sellAmount.toFixed(0)} SOL\n`;
                message += `💹 净流入：${alert.netFlow.toFixed(2)} SOL\n`;
                message += `👥 买入/卖出人数：${alert.buyTraders}/${alert.sellTraders}\n\n`;
                // 时间信息
                const now = new Date();
                message += `🕐 告警发送时间：${formatTime(now)}\n`;
                if (trades && trades.length > 0) {
                    message += `📊 最新数据时间：${trades[0].timestamp}\n`;
                    message += `📝 页面记录数量：${trades.length}\n\n`;
                    }

                // 快速交易链接
                    message += `🚀 快速交易：\n`;
                    message += `🤖 <a href="https://t.me/GMGN_sol_bot?start=${alert.tokenContract}">GMGN BOT</a>\n\n`;
*/
                // 查看更多信息链接
                message += `📊 更多信息：\n`;
                message += `🔗 <a href="https://gmgn.ai/sol/token/${alert.tokenContract}">GMGN</a>| `;
                message += `🔗 <a href="https://www.pump.news/en/${alert.tokenContract}-solana">Pump.news</a>| `;
                message += `🔗 <a href="https://twitter.com/search?q=${alert.tokenContract}">搜推特</a>|\n`;

                // 官方推特链接
                if (pumpNewsData?.officialTwitter) {
                    message += `X <a href="${pumpNewsData.officialTwitter}">官推</a> |`;
                }

                // 官网链接
                if (pumpNewsData?.website) {
                    message += `🏠 <a href="${pumpNewsData.website}">官网</a>\n`;
                }

                message += '\n';
            }

            return message;
        }

        // 加载订阅者列表
        function loadSubscribers() {
            try {
                const savedSubscribers = GM_getValue(STORAGE_CONFIG.SUBSCRIBERS_KEY);
                if (savedSubscribers) {
                    return new Set(JSON.parse(savedSubscribers));
                }
            } catch (error) {
                console.error('加载订阅者列表失败:', error);
            }
            // 默认包含默认的chatId
            return new Set([TELEGRAM_CONFIG.defaultChatId]);
        }

        // 保存订阅者列表
        function saveSubscribers(subscribers) {
            try {
                GM_setValue(STORAGE_CONFIG.SUBSCRIBERS_KEY, JSON.stringify([...subscribers]));
            } catch (error) {
                console.error('保存订阅者列表失败:', error);
            }
        }

        // 检查最新记录时间与系统时间的差异
        function checkTimeAndRefresh(trades) {
            if (!trades || trades.length === 0) return;

            // 获取最新记录的时间
            const latestTrade = trades[0];
            if (!latestTrade.timestamp) return;

            // 解析时间戳（格式：MM-DD HH:mm）
            const [datePart, timePart] = latestTrade.timestamp.split(' ');
            const [month, day] = datePart.split('-');
            const [hour, minute] = timePart.split(':');

            // 创建最新记录的日期对象
            const now = new Date();
            const latestTime = new Date(now.getFullYear(), month - 1, day, hour, minute);

            // 计算时间差（毫秒）
            const timeDiff = now - latestTime;

            // 检查是否在查询界面
            const urlParams = new URLSearchParams(window.location.search);
            const isQueryPage = urlParams.has('token');

            if (isQueryPage) {
                console.log('%c当前处于查询界面，开始计时...', 'color: #ff9800');
                if (timeDiff > 15 * 60 * 1000) { // 超过15分钟
                    console.log('%c查询界面超过15分钟，准备移除token参数...', 'color: #ff6b6b');
                    urlParams.delete('token');
                    const newUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
                    window.history.replaceState({}, document.title, newUrl);
                    console.log('%c已移除token参数，返回主界面', 'color: #4CAF50');
                }
                return;
            }

            // 如果时间差大于配置的刷新延迟时间
            if (timeDiff > PROCESS_CONFIG.REFRESH_DELAY) {
                console.log(`%c检测到数据延迟：最新记录时间 ${latestTrade.timestamp}，当前时间 ${now.toLocaleTimeString()}，差异 ${Math.floor(timeDiff/1000)} 秒`, 'color: #ff6b6b');
                console.log('%c准备刷新页面...', 'color: #ff6b6b');

                // 保存当前的配置到localStorage
                GM_setValue('chainFM_autoRestart', 'true');

                // 刷新页面
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }

        // 主要解析函数
        function parseTradeData(text, useHTML = true) {
            let trades = [];
            if (useHTML) {
                // 获取所有交易记录容器
                const tradeElements = document.querySelectorAll('[class*="css-"][class*="trade-item"], [class*="css-"][class*="trade-list-item"], .css-6n7j50');
                console.log('找到的交易元素数量:', tradeElements.length);

                // 遍历每个交易元素
                tradeElements.forEach((el, index) => {
                    console.log(`\n=== 解析第 ${index + 1} 个交易元素 ===`);
                    console.log('元素HTML:', el.outerHTML);
                    console.log('元素文本:', el.innerText);

                    try {
                        const html = el.innerHTML;
                        const text = el.innerText;
                        const trade = {};

                        // 判断交易类型
                        trade.type = html.includes('🟢') ? 'buy' : 'sell';
                        console.log('交易类型:', trade.type);

                        // 提取交易者信息
                        const traderMatch = html.match(/[🟢🔴][^<]*<a[^>]*>([^<]+)<\/a><em[^>]*>\(([^)]+)\)<\/em>/);
                        if (traderMatch) {
                            trade.trader = traderMatch[1].trim();
                            trade.traderId = traderMatch[2];
                            trade.smartMoney = trade.trader; // 添加聪明钱信息
                            console.log('交易者:', trade.trader, '(', trade.traderId, ')', '聪明钱:', trade.smartMoney);
                        } else {
                            console.log('未找到交易者信息');
                        }

                        // 提取代币信息
                        const tokenLinks = Array.from(el.querySelectorAll('a[href*="/token/"]'));
                        console.log('找到的token链接数量:', tokenLinks.length);
                        tokenLinks.forEach((link, i) => {
                            console.log(`token链接 ${i + 1}:`, link.outerHTML);
                        });

                        // 找到代币链接
                        const tokenElement = tokenLinks.find(link => {
                            const linkText = link.textContent.trim();
                            const href = link.getAttribute('href');
                            return !linkText.includes('SOL') && href.includes('/token/');
                        });

                        if (tokenElement) {
                            const href = tokenElement.getAttribute('href');
                            trade.tokenContract = href.split('/token/')[1];
                            trade.token = tokenElement.textContent.trim();
                            console.log('代币信息:', trade.token, '(', trade.tokenContract, ')');

                            // 从纯文本内容中提取TokenId
                            const tokenIdRegex = new RegExp(`${trade.token}\\s*\\(([^)]+)\\)`);
                            const tokenIdMatch = text.match(tokenIdRegex);
                            if (tokenIdMatch) {
                                trade.tokenId = tokenIdMatch[1];
                                console.log('TokenId:', trade.tokenId);
                            } else {
                                console.log('未找到TokenId');
                            }

                            // 提取数量
                            const amountMatch = html.match(/<em[^>]*>(?:bought|sold)<\/em>\s*([\d,]+)/);
                            if (amountMatch) {
                                trade.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                                console.log('交易数量:', trade.amount);
                            } else {
                                console.log('未找到交易数量');
                            }
                        } else {
                            console.log('未找到代币元素');
                        }

                        // 提取SOL数量
                        const solMatch = html.match(/<em[^>]*>(?:with|for)<\/em>\s*([\d,.]+)<a[^>]*>SOL<\/a>/);
                        if (solMatch) {
                            trade.solAmount = parseFloat(solMatch[1]);
                            console.log('SOL数量:', trade.solAmount);
                        } else {
                            console.log('未找到SOL数量');
                        }

                        // 提取代币单价和市值
                        const priceAndMarketCapMatch = html.match(/\(?\$(\d+\.?\d*(?:₄\d*)?)[^M]*M:\$([\d,.]+(?:[kM])?)\)?/i);
                        if (priceAndMarketCapMatch) {
                            let price = priceAndMarketCapMatch[1];
                            if (price.includes('₄')) {
                                price = price.replace('₄', '0');
                            }
                            trade.tokenPrice = parseFloat(price);
                            trade.marketCap = priceAndMarketCapMatch[2];
                            console.log('代币价格:', trade.tokenPrice, '市值:', trade.marketCap);
                        } else {
                            console.log('未找到价格和市值信息');
                        }

                        // 提取时间
                        const timeMatch = html.match(/(\d{2}-\d{2}\s+\d{2}:\d{2})/);
                        if (timeMatch) {
                            trade.timestamp = timeMatch[1];
                            console.log('时间戳:', trade.timestamp);
                        } else {
                            console.log('未找到时间戳');
                        }

                        // 检查交易数据完整性
                        const isComplete = trade.trader && trade.token && trade.solAmount && trade.timestamp && trade.tokenContract && trade.tokenId;
                        if (isComplete) {
                            trades.push(trade);
                            console.log('✅ 交易数据完整，已添加到列表');
                        } else {
                            console.log('❌ 交易数据不完整，跳过');
                            console.log('缺失字段:', {
                                trader: !trade.trader,
                                token: !trade.token,
                                solAmount: !trade.solAmount,
                                timestamp: !trade.timestamp,
                                tokenContract: !trade.tokenContract,
                                tokenId: !trade.tokenId
                            });
                        }
                    } catch (error) {
                        console.error('解析交易元素时出错:', error);
                    }
                });
            }

            console.log(`\n成功解析 ${trades.length} 条交易记录`);
            return trades;
        }

        // 统计交易数据并生成告警
        function analyzeTradesForAlert(trades) {
            // 按Token和TokenId分组统计
            const tokenStats = {};

            trades.forEach(trade => {
                const key = `${trade.token}_${trade.tokenId}`;
                if (!tokenStats[key]) {
                    tokenStats[key] = {
                        token: trade.token,
                        tokenId: trade.tokenId,
                        tokenContract: trade.tokenContract,
                        marketCap: trade.marketCap,
                        buyCount: 0,
                        buyAmount: 0,
                        sellCount: 0,
                        sellAmount: 0,
                        traders: new Set(),
                        tradersBuy: new Set(),
                        tradersSell: new Set()
                    };
                }

                tokenStats[key].traders.add(trade.traderId);

                if (trade.type === 'buy') {
                    tokenStats[key].buyCount++;
                    tokenStats[key].buyAmount += trade.solAmount;
                    tokenStats[key].tradersBuy.add(trade.traderId);
                } else {
                    tokenStats[key].sellCount++;
                    tokenStats[key].sellAmount += trade.solAmount;
                    tokenStats[key].tradersSell.add(trade.traderId);
                }
            });

            // 分析所有Token的状态
            const allTokenStats = Object.entries(tokenStats).map(([key, stat]) => {
                const totalTrades = stat.buyCount + stat.sellCount;
                const totalTraders = stat.traders.size;
                const netFlow = stat.buyAmount - stat.sellAmount;

                // 检查每个条件
                const conditions = {
                    trades: totalTrades >= ALERT_CONDITIONS.MIN_TOTAL_TRADES,
                    traders: totalTraders >= ALERT_CONDITIONS.MIN_TOTAL_TRADERS,
                    netFlow: netFlow > ALERT_CONDITIONS.MIN_NET_FLOW
                };

                // 计算有多少条件满足
                const satisfiedConditions = Object.values(conditions).filter(v => v).length;

                return {
                    ...stat,
                    totalTrades,
                    totalTraders,
                    netFlow: parseFloat(netFlow.toFixed(4)),
                    conditions,
                    satisfiedConditions,
                    buyAmount: parseFloat(stat.buyAmount.toFixed(4)),
                    sellAmount: parseFloat(stat.sellAmount.toFixed(4)),
                    buyTraders: stat.tradersBuy.size,
                    sellTraders: stat.tradersSell.size
                };
            });

            // 按满足条件数量和净流入量排序
            allTokenStats.sort((a, b) => {
                if (b.satisfiedConditions !== a.satisfiedConditions) {
                    return b.satisfiedConditions - a.satisfiedConditions;
                }
                return b.netFlow - a.netFlow;
            });

            // 返回所有Token统计和告警Token
            return {
                alerts: allTokenStats.filter(stat => stat.satisfiedConditions === 3),
                allStats: allTokenStats
            };
        }

        // 创建一个MutationObserver实例来监听页面变化
        function startTradeMonitor(callback) {
            let lastClearTime = Date.now();
            const CLEAR_INTERVAL = 60 * 1000; // 30秒清理一次控制台

            try {
                // 创建一个过滤后的console.error函数
                const filteredConsoleError = (...args) => {
                    const errorText = args.join(' ');
                    if (!errorText.includes('Translation key not found') &&
                        !errorText.includes('ERR_NETWORK_CHANGED') &&
                        !errorText.includes('Stream reading error')) {
                            console.error(...args);
                    }
                };

                // 确保只有一个监听器在运行
                if (window.chainFM && window.chainFM.observer) {
                    console.log('检测到已存在的监听器，正在清理...');
                    window.chainFM.observer.disconnect();
                }

                let lastProcessedTime = Date.now();

                const observer = new MutationObserver((mutations) => {
                    const now = Date.now();

                    // 每30秒清理一次控制台
                    if (now - lastClearTime >= CLEAR_INTERVAL) {
                        console.clear();
                        lastClearTime = now;
                    }

                        // 检查是否有新的交易数据
                        const pageText = document.body.innerText;

                        // 过滤掉心跳消息和其他无关消息
                        if (pageText.includes('Received heartbeat') ||
                            pageText.includes('Translation key not found') ||
                        pageText.includes('Stream reading error')) {
                            return;
                        }

                        // 确保至少间隔指定时间才处理一次数据
                        if (now - lastProcessedTime < PROCESS_CONFIG.UPDATE_INTERVAL) {
                            return;
                        }

                        const currentTrades = parseTradeData(pageText, true);

                        // 更新最新的交易数据
                        if (currentTrades && currentTrades.length > 0) {
                            latestTrades = currentTrades;
                            if (typeof callback === 'function') {
                                callback(currentTrades);
                                lastProcessedTime = now;

                                // 检查时间差异
                                checkTimeAndRefresh(currentTrades);
                            }
                    }
                });

                // 配置观察选项
                const config = {
                    childList: true,
                    subtree: true,
                    characterData: true
                };

                // 开始观察页面变化
                observer.observe(document.body, config);

                // 每分钟检查一次时间差异
                setInterval(() => {
                    if (latestTrades && latestTrades.length > 0) {
                        checkTimeAndRefresh(latestTrades);
                    }
                }, 60000);

                return observer;
            } catch (error) {
                console.error('启动监控时出错:', error);
                return null;
            }
        }

        // 检查油猴插件状态
        function checkTampermonkeyStatus() {
            const now = new Date().toLocaleTimeString();
            if (typeof GM_info !== 'undefined') {
                console.log(`%c${now} - 油猴插件状态：正常运行中 ✅`, 'font-size: 15px; color: #4CAF50; font-weight: bold');
            } else {
                console.log(`%c${now} - 油猴插件状态：未正常运行 ❌`, 'font-size: 15px; color: #ff6b6b; font-weight: bold');
            }
        }

        // 加载已处理的消息ID
        function loadProcessedMessages() {
            try {
                const saved = GM_getValue(STORAGE_CONFIG.PROCESSED_MESSAGES_KEY);
                return saved ? new Set(JSON.parse(saved)) : new Set();
            } catch (error) {
                console.error('加载已处理消息记录失败:', error);
                return new Set();
            }
        }

        // 保存已处理的消息ID
        function saveProcessedMessages(messages) {
            try {
                GM_setValue(STORAGE_CONFIG.PROCESSED_MESSAGES_KEY, JSON.stringify([...messages]));
            } catch (error) {
                console.error('保存已处理消息记录失败:', error);
            }
        }

        // 处理 Telegram 命令
        async function handleTelegramCommands() {
            const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getUpdates`;
            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.ok && data.result) {
                    const processedMessages = loadProcessedMessages();
                    let hasNewMessages = false;

                    for (const update of data.result) {
                        if (update.message && update.message.text) {
                            // 检查消息是否已处理
                            if (processedMessages.has(update.update_id.toString())) {
                                continue;
                            }

                            const chatId = update.message.chat.id.toString();
                            const command = update.message.text.toLowerCase();

                            switch (command) {
                                case TELEGRAM_CONFIG.commands.start:
                                    await handleSubscribe(chatId);
                                    break;
                                case TELEGRAM_CONFIG.commands.stop:
                                    await handleUnsubscribe(chatId);
                                    break;
                                case TELEGRAM_CONFIG.commands.status:
                                    await handleStatus(chatId);
                                    break;
                            }

                            // 记录已处理的消息
                            processedMessages.add(update.update_id.toString());
                            hasNewMessages = true;
                        }
                    }

                    // 如果有新消息被处理，保存记录
                    if (hasNewMessages) {
                        saveProcessedMessages(processedMessages);
                    }
                }
            } catch (error) {
                console.error('处理Telegram命令时出错:', error);
            }
        }

        // 处理订阅命令
        async function handleSubscribe(chatId) {
            const subscribers = loadSubscribers();
            if (!subscribers.has(chatId)) {
                subscribers.add(chatId);
                saveSubscribers(subscribers);
                await sendTelegramMessageToUser(chatId, '✅ 订阅成功！您将收到Chain.fm的监控告警消息。\n\n可用命令：\n/start - 订阅告警\n/stop - 取消订阅\n/status - 查看状态');
            } else {
                await sendTelegramMessageToUser(chatId, '您已经订阅过了！\n\n可用命令：\n/start - 订阅告警\n/stop - 取消订阅\n/status - 查看状态');
            }
        }

        // 处理取消订阅命令
        async function handleUnsubscribe(chatId) {
            const subscribers = loadSubscribers();
            if (subscribers.has(chatId)) {
                subscribers.delete(chatId);
                saveSubscribers(subscribers);
                await sendTelegramMessageToUser(chatId, '❌ 已取消订阅。');
            } else {
                await sendTelegramMessageToUser(chatId, '您还没有订阅！\n\n发送 /start 开始订阅。');
            }
        }

        // 处理状态查询命令
        async function handleStatus(chatId) {
            const subscribers = loadSubscribers();
            const isSubscribed = subscribers.has(chatId);
            const message = isSubscribed ?
                '✅ 当前状态：已订阅\n\n可用命令：\n/start - 订阅告警\n/stop - 取消订阅\n/status - 查看状态' :
                '❌ 当前状态：未订阅\n\n发送 /start 开始订阅。';
            await sendTelegramMessageToUser(chatId, message);
        }

        // 定期检查 Telegram 命令
        setInterval(handleTelegramCommands, 20000); // 每10秒检查一次

        // 启动监控
        let observer = startTradeMonitor(async (trades) => {
            console.clear();
            const now = new Date().toLocaleTimeString();

            // 显示油猴插件状态
            checkTampermonkeyStatus();

            // 显示最新交易信息
            console.log(`%c${now} - 监控状态：正常运行中`, 'font-size: 15px; color: #4CAF50; font-weight: bold;');
            console.log(`%c最新检测到 ${trades.length} 笔交易`, 'font-size: 15px; color: #2196F3;');

            // 显示最新的3笔交易
            console.log('\n%c最新3笔交易：', 'font-size: 14px; color: #666; font-weight: bold;');
            trades.slice(0, 3).forEach((trade, index) => {
                console.log(`${index + 1}. ${trade.timestamp} | ${trade.type === 'buy' ? '🟢买入' : '🔴卖出'} ${trade.token}(${trade.tokenId}) | ${trade.solAmount.toFixed(0)} SOL`);
            });

            // 分析告警
            const { alerts, allStats } = analyzeTradesForAlert(trades);

            // 显示所有Token的统计
            console.log('\n%cToken统计：', 'font-size: 14px; color: #666; font-weight: bold;');
            const statsForTable = allStats.map(stat => {
                // 获取该Token的聪明钱
                const smartMoneyBuyers = trades
                    .filter(t => t.type === 'buy' && t.token === stat.token && t.tokenId === stat.tokenId)
                    .reduce((acc, t) => {
                        if (!acc[t.traderId]) {
                            acc[t.traderId] = {
                                name: t.smartMoney,
                                amount: t.solAmount
                            };
                        } else {
                            acc[t.traderId].amount += t.solAmount;
                        }
                        return acc;
                    }, {});

                // 转换为数组并按金额排序
                const allBuyers = Object.values(smartMoneyBuyers)
                    .sort((a, b) => b.amount - a.amount);

                // 分离重要聪明钱和普通聪明钱
                const msgImportantBuyers = allBuyers.filter(buyer => isImportantSmartMoney(buyer.name));
                const msgNormalBuyers = allBuyers.filter(buyer => !isImportantSmartMoney(buyer.name));

                // 格式化显示
                const importantBuyersText = msgImportantBuyers.length > 0 ?
                    `🌟重要：${msgImportantBuyers.map(buyer => `${buyer.name}(${buyer.amount.toFixed(0)} SOL)`).join('、')}\n` : '';
                const normalBuyersText = msgNormalBuyers.length > 0 ?
                    `${msgNormalBuyers.map(buyer => `${buyer.name}(${buyer.amount.toFixed(0)} SOL)`).join('、')}` : '';

                const smartMoneyText = [importantBuyersText, normalBuyersText].filter(Boolean).join('');

                return {
                    'Token': `${stat.token}(${stat.tokenId})`,
                    '交易次数': `${stat.totalTrades}/${ALERT_CONDITIONS.MIN_TOTAL_TRADES}`,
                    '交易人数': `${stat.totalTraders}/${ALERT_CONDITIONS.MIN_TOTAL_TRADERS}`,
                    '买入次数': stat.buyCount,
                    '卖出次数': stat.sellCount,
                    '买入SOL': stat.buyAmount.toFixed(0),
                    '卖出SOL': stat.sellAmount.toFixed(0),
                    '净流入SOL': `${stat.netFlow.toFixed(0)}/${ALERT_CONDITIONS.MIN_NET_FLOW}`,
                    '买入人数': stat.buyTraders,
                    '聪明钱': smartMoneyText || '-',
                    '卖出人数': stat.sellTraders,
                    '市值': stat.marketCap
                };
            });
            console.table(statsForTable);

            if (alerts.length > 0) {
                console.log(`\n%c${now} - ⚠️ 发现符合告警条件的Token：`, 'font-size: 16px; color: #4CAF50; font-weight: bold;');
                console.log(`%c符合条件：交易次数≥${ALERT_CONDITIONS.MIN_TOTAL_TRADES} 且 交易人数≥${ALERT_CONDITIONS.MIN_TOTAL_TRADERS} 且 净流入>${ALERT_CONDITIONS.MIN_NET_FLOW}`, 'font-size: 15px; color: #4CAF50; font-weight: bold;');
                console.table(alerts);

                // 发送 Telegram 通知
                console.log('%c准备发送Telegram通知...', 'font-size: 15px; color: #2196F3;');

                // 使用formatAlertMessage生成消息内容
                const message = await formatAlertMessage(alerts, trades);

                if (message) {
                    // 在发送消息前应用长度限制
                    const limitedMessage = limitMessageLength(message);

                    sendTelegramMessage(limitedMessage, alerts)
                        .then(() => console.log('%cTelegram消息发送成功', 'font-size: 15px; color: #4CAF50;'))
                        .catch(error => console.error('%cTelegram发送失败:', 'font-size: 15px; color: #f44336;', error));
                } else {
                    console.log('%c消息内容为空，跳过发送', 'font-size: 15px; color: #ff9800;');
                }
            } else {
                console.log(`\n%c${now} - 暂无符合告警条件的Token`, 'font-size: 14px; color: #666;');
            }
        });

        // 检查是否需要自动重启脚本
        if (GM_getValue('chainFM_autoRestart') === 'true') {
            GM_setValue('chainFM_autoRestart', 'false');
            console.log('%c页面已刷新，重新启动监控...', 'color: #4CAF50');
        }

        // 显示油猴插件状态
        checkTampermonkeyStatus();

        // 导出函数到全局作用域，方便调试
        window.chainFM = {
            parseTradeData,
            analyzeTradesForAlert,
            observer
        };

        console.log(`
        Chain.fm 数据监控工具已启动！

        告警条件：
        - 交易次数 ≥ ${ALERT_CONDITIONS.MIN_TOTAL_TRADES}
        - 交易人数 ≥ ${ALERT_CONDITIONS.MIN_TOTAL_TRADERS}
        - 净流入 > ${ALERT_CONDITIONS.MIN_NET_FLOW} SOL
        - 同一Token的推送间隔：${ALERT_CONDITIONS.PUSH_INTERVAL / 1000} 秒
        `);

        // 添加全局错误处理
        window.onerror = function(msg, url, line, col, error) {
            const now = new Date().toLocaleTimeString();
            console.log(`%c[${now}] 系统: ❌ 捕获到错误: ${msg}`, 'color: #ff6b6b');

            // 检查是否是网络相关错误
            if (msg.includes('network') || msg.includes('failed') || msg.includes('error')) {
                console.log(`%c[${now}] 系统: 🔄 检测到网络错误，准备刷新页面...`, 'color: #ff9800');
                setTimeout(() => {
                    window.location.href = 'https://chain.fm/home?events=%257B%2522event%2522%253A%2522token%253Abuy%2522%252C%2522filter_expressions%2522%253A%255B%2522data.order.volume_native%2520%253E%25201%2520and%2520aggs.buy.addrs_15m%2520%253E%25203%2522%255D%257D&events=%257B%2522event%2522%253A%2522token%253Asell%2522%252C%2522filter_expressions%2522%253A%255B%2522data.order.volume_native%2520%253E%25203%2522%255D%257D';
                }, 5000);
            }

            return false;
        };

        // 添加网络错误监听
        window.addEventListener('error', function(e) {
            const now = new Date().toLocaleTimeString();
            if (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT') {
                console.log(`%c[${now}] 系统: ⚠️ 资源加载失败: ${e.target.src}`, 'color: #ff9800');
            }
        }, true);
    }

    // 启动系统
    console.log(`%c[${new Date().toLocaleTimeString()}] 系统: 🎯 脚本已加载，等待页面就绪...`, 'color: #2196F3');
    waitForPageLoad();

})();
