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

    // 全局配置常量
    const CONFIG = {
        // 最低实现利润阈值（美元）
        MIN_REALIZED_PROFIT: 5000,

        // 最大保留交易者数量
        MAX_TRADERS: 20,

        // 调试日志级别
        DEBUG_LEVEL: {
            INFO: 'info',
            WARNING: 'warning',
            ERROR: 'error'
        },

        // 外部API配置
        API: {
            TOKEN_SEARCH_URL: 'https://frontend-api-v3.pump.fun/coins/search',
            SEARCH_PARAMS: {
                offset: 0,
                limit: 50,
                sort: 'market_cap',
                includeNsfw: false,
                order: 'DESC'
            }
        }
    };

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
                    DebugLogger.log(`数据库初始化错误: ${request.error}`, CONFIG.DEBUG_LEVEL.ERROR);
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
                        store.createIndex('update_time', 'update_time', { unique: false });
                        store.createIndex('ca_address', ['ca', 'address'], { unique: true });

                        // 新增索引
                        store.createIndex('twitter_username', 'twitter_username', { unique: false });
                        store.createIndex('user_name', 'user_name', { unique: false });
                        store.createIndex('realized_profit', 'realized_profit', { unique: false });
                        store.createIndex('profit_tag', 'profit_tag', { unique: false });

                        // 新增的索引
                        store.createIndex('dev', 'dev', { unique: false });
                        store.createIndex('last_trade_time', 'last_trade_time', { unique: false });
                        
                        // 新增字段索引
                        store.createIndex('sol_balance', 'sol_balance', { unique: false });
                        store.createIndex('last_active_time', 'last_active_time', { unique: false });
                        store.createIndex('start_holding_at', 'start_holding_at', { unique: false });
                        store.createIndex('end_holding_at', 'end_holding_at', { unique: false });
                        store.createIndex('holding_period', 'holding_period', { unique: false });
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
                            update_time: trader.update_time,

                            // 新增字段
                            dev: trader.dev,
                            last_trade_time: trader.last_trade_time,
                            
                            // 新增的字段
                            sol_balance: trader.sol_balance,
                            last_active_time: trader.last_active_time,
                            start_holding_at: trader.start_holding_at,
                            end_holding_at: trader.end_holding_at,
                            holding_period: trader.holding_period
                        };
                        store.put(updatedTrader);
                        DebugLogger.log(`更新聪明钱: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, CONFIG.DEBUG_LEVEL.INFO);
                    } else {
                        store.put(trader);
                        DebugLogger.log(`新增聪明钱: ${trader.address} (${trader.user_name || 'Unknown'}, 利润排名: ${trader.profit_tag})`, CONFIG.DEBUG_LEVEL.INFO);
                    }
                    resolve();
                };

                request.onerror = () => {
                    DebugLogger.log(`存储聪明钱失败: ${trader.address}`, CONFIG.DEBUG_LEVEL.ERROR);
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
                        url: `${CONFIG.API.TOKEN_SEARCH_URL}?offset=${CONFIG.API.SEARCH_PARAMS.offset}&limit=${CONFIG.API.SEARCH_PARAMS.limit}&sort=${CONFIG.API.SEARCH_PARAMS.sort}&includeNsfw=${CONFIG.API.SEARCH_PARAMS.includeNsfw}&order=${CONFIG.API.SEARCH_PARAMS.order}&searchTerm=${ca}&type=exact`,
                        onload: (response) => {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data && data.length > 0) {
                                    const tokenInfo = data[0];
                                    DebugLogger.log(`获取代币信息成功: ${JSON.stringify(tokenInfo)}`, CONFIG.DEBUG_LEVEL.INFO);
                                    DebugLogger.logTable([{
                                        'CA': tokenInfo.mint,
                                        'Symbol': tokenInfo.symbol,
                                        'Name': tokenInfo.name,
                                        'Dev': tokenInfo.creator,
                                        '最后交易时间': new Date(tokenInfo.last_trade_timestamp).toLocaleString()
                                    }], '代币详细信息');

                                    // 返回一个包含更多信息的对象
                                    resolve({
                                        symbol: tokenInfo.symbol || 'Unknown Token',
                                        dev: tokenInfo.creator,
                                        last_trade_time: tokenInfo.last_trade_timestamp
                                    });
                                } else {
                                    DebugLogger.log('未找到代币名称', CONFIG.DEBUG_LEVEL.WARNING);
                                    resolve({
                                        symbol: 'Unknown Token',
                                        dev: '',
                                        last_trade_time: null
                                    });
                                }
                            } catch (error) {
                                DebugLogger.log(`解析代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                                resolve({
                                    symbol: 'Unknown Token',
                                    dev: '',
                                    last_trade_time: null
                                });
                            }
                        },
                        onerror: (error) => {
                            DebugLogger.log(`获取代币名称失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                            reject(error);
                        }
                    });
                });
            } catch (error) {
                DebugLogger.log(`获取代币名称请求失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                return {
                    symbol: 'Unknown Token',
                    dev: '',
                    last_trade_time: null
                };
            }
        }

        async parsePageData() {
            try {
                this.createProgressBar();
                DebugLogger.log('开始解析页面数据');
                this.updateProgressBar(10);

                this.currentCA = this.extractCAFromUrl();
                if (!this.currentCA) {
                    DebugLogger.log('未找到合约地址', CONFIG.DEBUG_LEVEL.ERROR);
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
                        DebugLogger.log(`JSON解析失败: ${parseError}`, CONFIG.DEBUG_LEVEL.ERROR);
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
                    DebugLogger.log('未找到有效的JSON数据', CONFIG.DEBUG_LEVEL.ERROR);
                    return;
                }

                // 过滤掉低于最低利润阈值的交易者
                const filteredData = data.filter(item =>
                    (item.realized_profit || 0) >= CONFIG.MIN_REALIZED_PROFIT
                );

                // 按照realized_profit降序排序
                filteredData.sort((a, b) => (b.realized_profit || 0) - (a.realized_profit || 0));

                // 只保留前20名（或更少）
                const topTraders = filteredData.slice(0, CONFIG.MAX_TRADERS);

                DebugLogger.log(`解析到 ${data.length} 条交易数据，过滤后 ${filteredData.length} 条，保留前 ${topTraders.length} 名`, CONFIG.DEBUG_LEVEL.INFO);

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
                    // 计算持有时间
                    const startHoldingAt = item.start_holding_at * 1000;
                    const endHoldingAt = item.end_holding_at ? item.end_holding_at * 1000 : Date.now();
                    const holdingPeriod = Math.round((endHoldingAt - startHoldingAt) / 60000); // 转换为分钟

                    const trader = {
                        name: this.tokenName.symbol,
                        ca: this.currentCA,
                        address: item.address,
                        buy_volume: Math.round(item.buy_volume_cur) || 0,
                        sell_volume: Math.round(item.sell_volume_cur) || 0,
                        realized_profit: Math.round(item.realized_profit) || 0,
                        twitter_username: item.twitter_username || '',
                        user_name: item.name || '',
                        profit_tag: index + 1, // 增加利润排名
                        update_time: this.getBeijingTime(),

                        // 新增字段
                        dev: this.tokenName.dev,
                        last_trade_time: this.tokenName.last_trade_time,
                        
                        // 新增的字段
                        sol_balance: Number((item.sol_balance / Math.pow(10, 8)).toFixed(1)), // SOL余额，保留1位小数
                        last_active_time: new Date(item.last_active_timestamp * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                        start_holding_at: new Date(item.start_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                        end_holding_at: item.end_holding_at 
                            ? new Date(item.end_holding_at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) 
                            : null,
                        holding_period: holdingPeriod
                    };

                    await this.db.upsertTrader(trader);
                    processedTraders.push(trader);
                    this.updateProgressBar(70 + (index + 1) / topTraders.length * 30);
                }

                // 打印处理的交易者数据
                DebugLogger.logTable(processedTraders, '处理的交易者数据');

                DebugLogger.log('数据更新成功', CONFIG.DEBUG_LEVEL.INFO);
                this.updateProgressBar(100);
                setTimeout(() => {
                    if (this.progressBar) {
                        this.progressBar.remove();
                    }
                }, 2000);

            } catch (error) {
                DebugLogger.log(`处理数据失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
                if (this.progressBar) {
                    this.progressBar.remove();
                }
            }
        }

        /**
         * 从Excel导入数据
         */
        async importFromExcel(file) {
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    // 显示导入进度
                    const progressBar = document.createElement('div');
                    progressBar.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: white;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.5);
                        z-index: 10002;
                    `;
                    progressBar.textContent = '正在导入数据...';
                    document.body.appendChild(progressBar);
                    
                    let importedCount = 0;
                    for (const row of jsonData) {
                        const trader = {
                            name: row['名称'],
                            ca: row['合约'],
                            address: row['聪明钱'],
                            dev: row['Dev'],
                            last_trade_time: row['Pump内盘发射'] !== 'N/A' ? new Date(row['Pump内盘发射']).getTime() : null,
                            sol_balance: row['SOL余额'] !== 'N/A' ? parseFloat(row['SOL余额']) : null,
                            last_active_time: row['最后活跃时间'],
                            start_holding_at: row['买入时间'],
                            end_holding_at: row['卖出时间'],
                            holding_period: row['持有时长(分钟)'] !== 'N/A' ? parseInt(row['持有时长(分钟)']) : null,
                            buy_volume: parseInt(row['买入金额'].replace(/,/g, '')),
                            sell_volume: parseInt(row['卖出金额'].replace(/,/g, '')),
                            realized_profit: parseInt(row['到手利润'].replace(/,/g, '')),
                            twitter_username: row['Twitter'],
                            user_name: row['用户名'],
                            profit_tag: parseInt(row['利润排名']),
                            update_time: row['更新时间']
                        };
                        
                        await this.db.upsertTrader(trader);
                        importedCount++;
                        progressBar.textContent = `正在导入数据... (${importedCount}/${jsonData.length})`;
                    }
                    
                    document.body.removeChild(progressBar);
                    this.loadAndDisplayData(); // 刷新显示
                    alert(`成功导入 ${importedCount} 条数据`);
                    
                } catch (error) {
                    console.error('导入失败:', error);
                    alert('导入失败: ' + error.message);
                }
            };
            reader.readAsArrayBuffer(file);
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
            buttonContainer.style.cssText = 'display: flex; justify-content: center; gap: 10px; margin-top: 15px;';

            // 导入Excel按钮
            const importButton = document.createElement('button');
            importButton.textContent = '导入Excel';
            importButton.style.cssText = 'background-color: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
            
            // 隐藏的文件输入框
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.xlsx,.xls';
            fileInput.style.display = 'none';
            fileInput.onchange = (e) => this.importFromExcel(e.target.files[0]);
            
            importButton.onclick = () => fileInput.click();
            
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

            buttonContainer.appendChild(importButton);
            buttonContainer.appendChild(fileInput);
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
            table.style.cssText = 'width: 100%; border-collapse: collapse; table-layout: fixed;';

            // 定义列宽配置
            const columnWidths = {
                '名称': '80px',
                '合约': '200px',
                '聪明钱': '300px',
                'Dev': '300px',
                'Pump内盘发射': '150px',
                'SOL余额': '80px',
                '最后活跃时间': '150px',
                '买入时间': '150px',
                '卖出时间': '150px',
                '持有时长(分钟)': '100px',
                '买入金额': '100px',
                '卖出金额': '100px',
                '到手利润': '100px',
                'Twitter': '120px',
                '用户名': '100px',
                '排名': '60px',
                '更新时间': '150px'
            };

            // 创建表头
            const thead = document.createElement('thead');
            thead.style.cssText = 'background-color: #f2f2f2; position: sticky; top: 0; z-index: 1;';
            const headerRow = document.createElement('tr');
            const headers = [
                '名称', '合约', '聪明钱', 'Dev', 'Pump内盘发射', 
                'SOL余额', '最后活跃时间', '买入时间', '卖出时间', '持有时长(分钟)',
                '买入金额', '卖出金额', '到手利润', 
                'Twitter', '用户名', '排名', '更新时间'
            ];

            headers.forEach((headerText, index) => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cssText = `
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                    font-size: 14px;
                    background-color: #f2f2f2;
                    cursor: pointer;
                    width: ${columnWidths[headerText]};
                    position: relative;
                    user-select: none;
                `;
                
                // 添加排序点击事件
                th.onclick = () => this.sortTableByColumn(table, index);
                
                // 添加拖拽调整宽度功能
                const resizer = document.createElement('div');
                resizer.style.cssText = `
                    width: 5px;
                    height: 100%;
                    background: #0000;
                    position: absolute;
                    right: 0;
                    top: 0;
                    cursor: col-resize;
                `;
                resizer.addEventListener('mousedown', (e) => this.initColumnResize(e, th));
                th.appendChild(resizer);
                
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // 创建表体
            const tbody = document.createElement('tbody');

            const transaction = this.db.db.transaction([this.db.storeName], 'readonly');
            const store = transaction.objectStore(this.db.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const traders = event.target.result;

                // 按照更新时间倒序、合约和profit_tag顺序排序
                const sortedTraders = traders.sort((a, b) => {
                    // 先按更新时间倒序
                    const timeComparison = new Date(b.update_time) - new Date(a.update_time);
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

                // 创建表体
                sortedTraders.forEach(trader => {
                    const row = document.createElement('tr');
                    row.style.cssText = 'border-bottom: 1px solid #ddd;';

                    const rowData = [
                        trader.name,
                        trader.ca,
                        trader.address,
                        trader.dev || 'N/A',
                        trader.last_trade_time ? new Date(trader.last_trade_time).toLocaleString() : 'N/A',
                        
                        // 新增字段
                        this.formatNumberWithCommas(trader.sol_balance, 1) || 'N/A',
                        trader.last_active_time || 'N/A',
                        trader.start_holding_at || 'N/A',
                        trader.end_holding_at || 'N/A',
                        trader.holding_period !== undefined ? this.formatNumberWithCommas(trader.holding_period) : 'N/A',
                        
                        this.formatNumberWithCommas(trader.buy_volume),
                        this.formatNumberWithCommas(trader.sell_volume),
                        this.formatNumberWithCommas(trader.realized_profit),
                        trader.twitter_username || 'N/A',
                        trader.user_name || 'Unknown',
                        trader.profit_tag || 'N/A',
                        trader.update_time,
                    ];

                    rowData.forEach(cellData => {
                        const td = document.createElement('td');
                        td.textContent = cellData;
                        td.style.cssText = 'border: 1px solid #ddd; padding: 8px;font-size: 12px;';
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
                    'Dev': trader.dev || 'N/A',
                    'Pump内盘发射': trader.last_trade_time ? new Date(trader.last_trade_time).toLocaleString() : 'N/A',
                    '聪明钱': trader.address,
                    
                    // 新增字段
                    'SOL余额': trader.sol_balance || 'N/A',
                    '最后活跃时间': trader.last_active_time || 'N/A',
                    '买入时间': trader.start_holding_at || 'N/A',
                    '卖出时间': trader.end_holding_at || 'N/A',
                    '持有时长(分钟)': trader.holding_period !== undefined ? trader.holding_period : 'N/A',
                    
                    '买入金额': this.formatNumberWithCommas(trader.buy_volume),
                    '卖出金额': this.formatNumberWithCommas(trader.sell_volume),
                    '到手利润': this.formatNumberWithCommas(trader.realized_profit),
                    'Twitter': trader.twitter_username || 'N/A',
                    '用户名': trader.user_name || 'Unknown',
                    '利润排名': trader.profit_tag || 'N/A',
                    '更新时间': trader.update_time,
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

        /**
         * 初始化列宽调整功能
         */
        initColumnResize(e, th) {
            const startX = e.pageX;
            const startWidth = th.offsetWidth;
            
            const mouseMoveHandler = (e) => {
                const width = startWidth + (e.pageX - startX);
                th.style.width = `${width}px`;
            };
            
            const mouseUpHandler = () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        }

        /**
         * 表格列排序功能
         */
        sortTableByColumn(table, columnIndex) {
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const ths = table.querySelectorAll('th');
            const currentTh = ths[columnIndex];
            
            // 切换排序方向
            const isAscending = currentTh.classList.contains('asc');
            
            // 清除所有表头的排序标记
            ths.forEach(th => {
                th.classList.remove('asc', 'desc');
                th.style.backgroundColor = '#f2f2f2';
            });
            
            // 设置当前列的排序标记
            currentTh.classList.add(isAscending ? 'desc' : 'asc');
            currentTh.style.backgroundColor = '#e0e0e0';
            
            // 排序行
            rows.sort((rowA, rowB) => {
                const cellA = rowA.cells[columnIndex].textContent;
                const cellB = rowB.cells[columnIndex].textContent;
                
                // 检查是否为数字
                const numA = parseFloat(cellA.replace(/,/g, ''));
                const numB = parseFloat(cellB.replace(/,/g, ''));
                
                if (!isNaN(numA) && !isNaN(numB)) {
                    return isAscending ? numB - numA : numA - numB;
                }
                
                // 如果不是数字，按字符串排序
                return isAscending ? 
                    cellB.localeCompare(cellA, 'zh-CN') : 
                    cellA.localeCompare(cellB, 'zh-CN');
            });
            
            // 重新插入排序后的行
            rows.forEach(row => tbody.appendChild(row));
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
            DebugLogger.log(`初始化失败: ${error}`, CONFIG.DEBUG_LEVEL.ERROR);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();