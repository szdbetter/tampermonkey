// ==UserScript==
// @name         Smart Money Address Collector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Collect smart money addresses from various sources
// @author       Your name
// @match        https://gmgn.ai/defi/*
// @grant        GM_xmlhttpRequest
// @connect      frontend-api-v3.pump.fun
// ==/UserScript==

(function() {
    'use strict';

    class SmartMoneyDatabase {
        constructor() {
            this.dbName = 'SmartMoneyDB';
            this.storeName = 'traders';
            this.db = null;
        }

        // 初始化数据库
        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('数据库初始化成功');
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { 
                            keyPath: ['ca', 'address'] // 复合主键
                        });
                        // 创建索引
                        store.createIndex('ca', 'ca', { unique: false });
                        store.createIndex('address', 'address', { unique: false });
                        store.createIndex('create_time', 'create_time', { unique: false });
                    }
                };
            });
        }

        // 数据存储
        async saveTrader(trader) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(trader);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    }

    class DataCollector {
        constructor(database) {
            this.db = database;
            this.currentCA = '';
            this.tokenName = '';
        }

        // 从URL获取CA
        extractCAFromUrl() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        }

        // 获取北京时间
        getBeijingTime() {
            const options = {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            return new Date().toLocaleString('zh-CN', options);
        }

        // 获取代币名称
        async fetchTokenName(ca) {
            try {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `https://frontend-api-v3.pump.fun/coins/search?offset=0&limit=50&sort=market_cap&includeNsfw=false&order=DESC&searchTerm=${ca}&type=exact`,
                        onload: (response) => {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data && data.length > 0) {
                                    resolve(data[0].name);
                                } else {
                                    resolve('Unknown Token');
                                }
                            } catch (error) {
                                console.error('解析代币名称失败:', error);
                                resolve('Unknown Token');
                            }
                        },
                        onerror: (error) => {
                            console.error('获取代币名称失败:', error);
                            reject(error);
                        }
                    });
                });
            } catch (error) {
                console.error('获取代币名称请求失败:', error);
                return 'Unknown Token';
            }
        }

        // 解析页面数据
        async parsePageData() {
            try {
                // 获取当前CA
                this.currentCA = this.extractCAFromUrl();
                if (!this.currentCA) return;

                // 获取代币名称
                this.tokenName = await this.fetchTokenName(this.currentCA);

                // 解析页面数据
                const pageContent = document.body.innerHTML;
                let data;
                try {
                    // 查找JSON数据
                    const jsonMatch = pageContent.match(/\{[\s\S]*"data":\s*(\[[\s\S]*?\])[\s\S]*\}/);
                    if (jsonMatch && jsonMatch[1]) {
                        data = JSON.parse(jsonMatch[1]);
                    }
                } catch (error) {
                    console.error('解析页面数据失败:', error);
                    return;
                }

                if (!data) return;

                // 处理每条数据
                for (const item of data) {
                    const trader = {
                        name: this.tokenName,
                        ca: this.currentCA,
                        address: item.address,
                        buy_volume: item.buy_volume_cur,
                        sell_volume: item.sell_volume_cur,
                        realized_profit: item.realized_profit,
                        create_time: this.getBeijingTime()
                    };

                    await this.db.saveTrader(trader);
                }

                console.log('数据保存成功');
            } catch (error) {
                console.error('处理数据失败:', error);
            }
        }

        // 创建UI界面
        createUI() {
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 9999;
                background: white;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
            `;

            const collectButton = document.createElement('button');
            collectButton.textContent = '采集数据';
            collectButton.onclick = () => this.parsePageData();

            container.appendChild(collectButton);
            document.body.appendChild(container);
        }
    }

    // 主函数
    async function main() {
        try {
            // 初始化数据库
            const db = new SmartMoneyDatabase();
            await db.init();

            // 初始化数据采集器
            const collector = new DataCollector(db);
            collector.createUI();

            // 监听URL变化
            let lastUrl = location.href;
            const observer = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    collector.parsePageData();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 首次加载时采集数据
            collector.parsePageData();

        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();