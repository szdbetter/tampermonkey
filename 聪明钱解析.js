// ==UserScript==
// @name         聪明钱解析 (增强版)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Collect smart money addresses with enhanced debugging and interaction
// @author       szdbetter
// @match        https://gmgn.ai/defi/quotation/v1/tokens/top_traders/*
// @grant        GM_xmlhttpRequest
// @connect      frontend-api-v3.pump.fun
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.5/xlsx.full.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 调试日志工具
    const DebugLogger = {
        logElement: null,

        init() {
            this.logElement = document.createElement('div');
            this.logElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 450px;
                max-height: 450px;
                overflow-y: auto;
                background: rgba(0,0,0,0.8);
                color: #0f0;
                padding: 15px;
                font-size: 18px;
                z-index: 10000;
                border-radius: 10px;
                line-height: 1.5;
            `;
            document.body.appendChild(this.logElement);
        },

        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = `[${timestamp}] ${message}`;

            const messageElement = document.createElement('div');
            messageElement.textContent = logMessage;

            switch(type) {
                case 'error':
                    messageElement.style.color = 'red';
                    break;
                case 'warning':
                    messageElement.style.color = 'yellow';
                    break;
                default:
                    messageElement.style.color = '#0f0';
            }

            this.logElement.prepend(messageElement);
            console.log(logMessage);
        },

        // 新增表格输出方法
        logTable(data, title = '数据详情') {
            console.table(data);
            const tableElement = document.createElement('div');
            tableElement.style.color = '#0ff';
            tableElement.innerHTML = `<strong>${title}:</strong>`;
            this.logElement.prepend(tableElement);
        }
    };

    class SmartMoneyDatabase {
        constructor() {
            this.dbName = 'SmartMoneyDB';
            this.storeName = 'traders';
            this.db = null;
        }

        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 3);

                request.onerror = () => {
                    DebugLogger.log(`数据库初始化错误: ${request.error}`, 'error');
                    reject(request.error);
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    DebugLogger.log('数据库初始化成功');
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, {
                            keyPath: ['ca', 'address']
                        });
                        store.createIndex('ca', 'ca', { unique: false });
                        store.createIndex('address', 'address', { unique: false });
                        store.createIndex('create_time', 'create_time', { unique: false });
                        store.createIndex('ca_address', ['ca', 'address'], { unique: true });

                        // 新增索引
                        store.createIndex('twitter_username', 'twitter_username', { unique: false });
                        store.createIndex('user_name', 'user_name', { unique: false });
                        store.createIndex('realized_profit', 'realized_profit', { unique: false });
                        store.createIndex('profit_tag', 'profit_tag', { unique: false });
                    }
                };
            });
        }

        async upsertTrader(trader) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const index = store.index('ca_address');
                const query = IDBKeyRange.only([trader.ca, trader.address]);

                const request = index.get(query);

                request.onsuccess = (event) => {
                    const existingTrader = event.target.result;

                    if (existingTrader) {
                        const updatedTrader = {
                            ...existingTrader,
                            buy_volume: trader.buy_volume,
                            sell_volume: trader.sell_volume,
                            realized_profit: trader.realized_profit,
                            twitter_username: trader.twitter_username,
                            user_name: trader.user_name,
                            profit_tag: trader.profit_tag,
                            create_time: trader.create_time
                        };
                        store.put(updatedTrader);
                        DebugLogger.log(`更新交易者: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, 'info');
                    } else {
                        store.put(trader);
                        DebugLogger.log(`新增交易者: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, 'info');
                    }
                    resolve();
                };

                request.onerror = () => {
                    DebugLogger.log(`存储交易者失败: ${trader.address}`, 'error');
                    reject(request.error);
                };
            });
        }
    }

    class DataCollector {
        constructor(database) {
            this.db = database;
            this.currentCA = '';
            this.tokenName = '';
            this.progressBar = null;
            this.dataViewerModal = null;
        }

        createProgressBar() {
            this.progressBar = document.createElement('div');
            this.progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 4px;
                background-color: #4CAF50;
                z-index: 10000;
                transition: width 0.5s ease;
            `;
            document.body.appendChild(this.progressBar);
        }

        updateProgressBar(percentage) {
            if (this.progressBar) {
                this.progressBar.style.width = `${percentage}%`;
            }
        }

        extractCAFromUrl() {
            const pathParts = window.location.pathname.split('/');
            return pathParts[pathParts.length - 1];
        }

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

        async fetchTokenName(ca) {
            try {
                return new Promise((resolve, reject) => {
                    DebugLogger.log(`正在获取代币名称: ${ca}`);
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `https://frontend-api-v3.pump.fun/coins/search?offset=0&limit=50&sort=market_cap&includeNsfw=false&order=DESC&searchTerm=${ca}&type=exact`,
                        onload: (response) => {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data && data.length > 0) {
                                    const tokenInfo = data[0];
                                    DebugLogger.log(`获取代币信息成功: ${JSON.stringify(tokenInfo)}`, 'info');
                                    DebugLogger.logTable([{
                                        'CA': tokenInfo.ca,
                                        'Symbol': tokenInfo.symbol,
                                        'Name': tokenInfo.name
                                    }], '代币详细信息');
                                    resolve(tokenInfo.symbol || 'Unknown Token');
                                } else {
                                    DebugLogger.log('未找到代币名称', 'warning');
                                    resolve('Unknown Token');
                                }
                            } catch (error) {
                                DebugLogger.log(`解析代币名称失败: ${error}`, 'error');
                                resolve('Unknown Token');
                            }
                        },
                        onerror: (error) => {
                            DebugLogger.log(`获取代币名称失败: ${error}`, 'error');
                            reject(error);
                        }
                    });
                });
            } catch (error) {
                DebugLogger.log(`获取代币名称请求失败: ${error}`, 'error');
                return 'Unknown Token';
            }
        }

        async parsePageData() {
            try {
                this.createProgressBar();
                DebugLogger.log('开始解析页面数据');
                this.updateProgressBar(10);

                this.currentCA = this.extractCAFromUrl();
                if (!this.currentCA) {
                    DebugLogger.log('未找到合约地址', 'error');
                    return;
                }

                this.updateProgressBar(30);
                this.tokenName = await this.fetchTokenName(this.currentCA);

                // 更新JSON提取策略
                const extractJSON = (content) => {
                    try {
                        const jsonData = JSON.parse(content);
                        // 检查是否符合预期的数据结构
                        if (jsonData.code === 0 && Array.isArray(jsonData.data)) {
                            return jsonData.data;
                        }
                    } catch (parseError) {
                        DebugLogger.log(`JSON解析失败: ${parseError}`, 'error');
                    }
                    return null;
                };

                // 尝试从不同来源提取JSON
                let data = null;
                const sources = [
                    // 尝试从<pre>标签中提取
                    () => {
                        const preElement = document.querySelector('pre[hidden]');
                        return preElement ? extractJSON(preElement.textContent) : null;
                    },
                    // 尝试从script标签中提取
                    () => {
                        const scripts = document.getElementsByTagName('script');
                        for (let script of scripts) {
                            const jsonData = extractJSON(script.textContent);
                            if (jsonData) return jsonData;
                        }
                        return null;
                    },
                    // 尝试从body的innerHTML中提取
                    () => extractJSON(document.body.innerHTML)
                ];

                for (let source of sources) {
                    data = source();
                    if (data) break;
                }

                if (!data) {
                    DebugLogger.log('未找到有效的JSON数据', 'error');
                    return;
                }

                // 按照realized_profit降序排序
                data.sort((a, b) => (b.realized_profit || 0) - (a.realized_profit || 0));

                // 只保留前20名
                const topTraders = data.slice(0, 20);

                DebugLogger.log(`解析到 ${data.length} 条交易数据，保留前 ${topTraders.length} 名`, 'info');

                // 打印前5条数据的详细信息
                const previewData = topTraders.slice(0, 5).map((item, index) => ({
                    '排名': index + 1,
                    'Address': item.address,
                    '买入量': Math.round(item.buy_volume_cur || 0),
                    '卖出量': Math.round(item.sell_volume_cur || 0),
                    '实现利润': Math.round(item.realized_profit || 0),
                    '用户名': item.name || 'Unknown',
                    'Twitter用户名': item.twitter_username || 'N/A'
                }));
                DebugLogger.logTable(previewData, '交易数据预览（前5条）');

                this.updateProgressBar(70);

                const processedTraders = [];
                for (const [index, item] of topTraders.entries()) {
                    const trader = {
                        name: this.tokenName,
                        ca: this.currentCA,
                        address: item.address,
                        buy_volume: Math.round(item.buy_volume_cur) || 0,
                        sell_volume: Math.round(item.sell_volume_cur) || 0,
                        realized_profit: Math.round(item.realized_profit) || 0,
                        twitter_username: item.twitter_username || '',
                        user_name: item.name || '',
                        profit_tag: index + 1, // 增加利润排名
                        create_time: this.getBeijingTime()
                    };

                    await this.db.upsertTrader(trader);
                    processedTraders.push(trader);
                    this.updateProgressBar(70 + (index + 1) / topTraders.length * 30);
                }

                // 打印处理的交易者数据
                DebugLogger.logTable(processedTraders, '处理的交易者数据');

                DebugLogger.log('数据更新成功', 'info');
                this.updateProgressBar(100);
                setTimeout(() => {
                    if (this.progressBar) {
                        this.progressBar.remove();
                    }
                }, 2000);

            } catch (error) {
                DebugLogger.log(`处理数据失败: ${error}`, 'error');
                if (this.progressBar) {
                    this.progressBar.remove();
                }
            }
        }

        /**
         * 创建数据导出和查看的UI界面
         */
        createDataViewerUI() {
            // 创建模态框容器
            this.dataViewerModal = document.createElement('div');
            this.dataViewerModal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 1200px;
                max-height: 80%;
                background: white;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                padding: 20px;
                z-index: 10001;
                overflow: hidden;
                display: none;
                flex-direction: column;
            `;

            // 标题
            const title = document.createElement('h2');
            title.textContent = '聪明钱数据库';
            title.style.cssText = 'margin-bottom: 15px; text-align: center; color: #4CAF50;';
            this.dataViewerModal.appendChild(title);

            // 表格容器
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'overflow-x: auto; max-height: 600px; overflow-y: scroll;';
            this.dataViewerModal.appendChild(tableContainer);

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 15px;';

            // 导出Excel按钮
            const exportButton = document.createElement('button');
            exportButton.textContent = '导出Excel';
            exportButton.style.cssText = 'background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
            exportButton.onclick = () => this.exportToExcel();

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.textContent = '关闭';
            closeButton.style.cssText = 'background-color: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
            closeButton.onclick = () => this.toggleDataViewer();

            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(closeButton);
            this.dataViewerModal.appendChild(buttonContainer);

            document.body.appendChild(this.dataViewerModal);
        }

        /**
         * 切换数据查看器的显示/隐藏
         */
        toggleDataViewer() {
            if (!this.dataViewerModal) {
                this.createDataViewerUI();
            }

            if (this.dataViewerModal.style.display === 'none' || this.dataViewerModal.style.display === '') {
                this.loadAndDisplayData();
                this.dataViewerModal.style.display = 'flex';
            } else {
                this.dataViewerModal.style.display = 'none';
            }
        }

        /**
         * 格式化数字为千位符显示
         * @param {number} num 要格式化的数字
         * @param {number} decimals 小数位数，默认为2
         * @returns {string} 格式化后的字符串
         */
        formatNumberWithCommas(num, decimals = 0) {
            if (num === null || num === undefined) return 'N/A';
            return num.toLocaleString('zh-CN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }

        /**
         * 加载并显示数据库中的数据
         */
        loadAndDisplayData() {
            const tableContainer = this.dataViewerModal.children[1];
            tableContainer.innerHTML = ''; // 清空之前的内容

            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';

            // 打开数据库并读取数据
            const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
            const store = transaction.objectStore(this.db.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const traders = event.target.result;

                // 按照创建时间倒序、合约和profit_tag顺序排序
                const sortedTraders = traders.sort((a, b) => {
                    // 先按创建时间倒序
                    const timeComparison = new Date(b.create_time) - new Date(a.create_time);
                    if (timeComparison !== 0) return timeComparison;

                    // 再按合约顺序
                    const caComparison = a.ca.localeCompare(b.ca);
                    if (caComparison !== 0) return caComparison;

                    // 最后按profit_tag顺序
                    return (a.profit_tag || 0) - (b.profit_tag || 0);
                });

                // 统计代币数量和记录数量
                const uniqueTokens = new Set(sortedTraders.map(trader => trader.name));
                const tokenCount = uniqueTokens.size;
                const recordCount = sortedTraders.length;

                // 更新标题
                const title = this.dataViewerModal.children[0];
                title.textContent = `聪明钱数据库 (共${tokenCount}个代币，${recordCount}条记录)`;

                // 创建表头
                const thead = document.createElement('thead');
                thead.style.cssText = 'background-color: #f2f2f2;';
                const headerRow = document.createElement('tr');
                const headers = ['名称', '合约', '聪明钱', '买入金额', '卖出金额', '到手利润', 'Twitter', '用户名', '排名', '创建时间'];

                headers.forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    th.style.cssText = 'border: 1px solid #ddd; padding: 8px; text-align: left;';
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                // 创建表体
                const tbody = document.createElement('tbody');

                sortedTraders.forEach(trader => {
                    const row = document.createElement('tr');
                    row.style.cssText = 'border-bottom: 1px solid #ddd;';

                    const rowData = [
                        trader.name,
                        trader.ca,
                        trader.address,
                        this.formatNumberWithCommas(trader.buy_volume),
                        this.formatNumberWithCommas(trader.sell_volume),
                        this.formatNumberWithCommas(trader.realized_profit),
                        trader.twitter_username || 'N/A',
                        trader.user_name || 'Unknown',
                        trader.profit_tag || 'N/A',
                        trader.create_time
                    ];

                    rowData.forEach(cellData => {
                        const td = document.createElement('td');
                        td.textContent = cellData;
                        td.style.cssText = 'border: 1px solid #ddd; padding: 8px;';
                        row.appendChild(td);
                    });

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                tableContainer.appendChild(table);
            };
        }

        /**
         * 导出数据到Excel
         */
        exportToExcel() {
            const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
            const store = transaction.objectStore(this.db.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const traders = event.target.result;
                const worksheet = XLSX.utils.json_to_sheet(traders.map(trader => ({
                    '名称': trader.name,
                    '合约': trader.ca,
                    '钱包': trader.address,
                    '买入金额': this.formatNumberWithCommas(trader.buy_volume),
                    '卖出金额': this.formatNumberWithCommas(trader.sell_volume),
                    '到手利润': this.formatNumberWithCommas(trader.realized_profit),
                    'Twitter': trader.twitter_username || 'N/A',
                    '用户名': trader.user_name || 'Unknown',
                    '利润排名': trader.profit_tag || 'N/A',
                    '创建时间': trader.create_time
                })));

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, '聪明钱数据库');
                XLSX.writeFile(workbook, `traders_data_${new Date().toISOString().split('T')[0]}.xlsx`);
            };
        }

        /**
         * 在UI中增加数据查看按钮
         */
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
                display: flex;
                flex-direction: column;
            `;

            const collectButton = document.createElement('button');
            collectButton.textContent = '采集数据';
            collectButton.style.marginBottom = '5px';
            collectButton.onclick = () => this.parsePageData();

            const debugButton = document.createElement('button');
            debugButton.textContent = '显示/隐藏日志';
            debugButton.style.marginBottom = '5px';
            debugButton.onclick = () => {
                DebugLogger.logElement.style.display =
                    DebugLogger.logElement.style.display === 'none' ? 'block' : 'none';
            };

            // 新增数据查看按钮
            const viewDataButton = document.createElement('button');
            viewDataButton.textContent = '查看数据库';
            viewDataButton.onclick = () => this.toggleDataViewer();

            container.appendChild(collectButton);
            container.appendChild(debugButton);
            container.appendChild(viewDataButton);
            document.body.appendChild(container);
        }
    }

    async function main() {
        try {
            DebugLogger.init();

            const db = new SmartMoneyDatabase();
            await db.init();

            const collector = new DataCollector(db);
            collector.createUI();

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

            collector.parsePageData();

        } catch (error) {
            DebugLogger.log(`初始化失败: ${error}`, 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();