// ==UserScript==
// @name         USDD 余额监控 + 邮件告警
// @namespace    https://app.usdd.io/
// @version      1.1
// @description  监控 USDD 余额，低于 1.5 亿时发送邮件告警，并在页面数据 5 分钟无变化时自动刷新
// @author       你
// @match        https://app.usdd.io/psm
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.resend.com
// ==/UserScript==

(function() {
    'use strict';

    /** ==================【🛠 运行参数】================== **/
    const CONFIG = {
        // 监控数值
        ALERT_THRESHOLD: 150000000,  // ⚠️ 低于 1.5 亿触发告警
        CHECK_INTERVAL: 30 * 1000,   // ⏳ 监控间隔：30 秒
        REFRESH_INTERVAL: 5 * 60 * 1000, // 🔄 5 分钟无变化则自动刷新

        // 邮件通知
        EMAIL_RECEIVER: "8044372@qq.com", // 📧 接收告警的邮箱
        EMAIL_SENDER: "onboarding@resend.dev", // 📧 修改为 Resend 默认发件人
        API_KEYS: [ // 🔑 Resend API Key（支持自动切换）
            "re_JfpnpbUQ_DgLDbN5x5EAmwFWGbsZ6wqaQ",
            "re_VsrXhwK4_ESLjHdS1JmSCsLcZYStfMbe3"
        ],

        // 监控页面元素
        SELECTOR: "#root > div > div.psm-root > div.content-box > div.left > div.to > div.availbale > h6 > div > div:nth-child(2)"
    };

    /** ==================【📊 运行状态】================== **/
    let lastBalance = null; // 上次余额
    let lastUpdateTime = Date.now(); // 余额上次更新时间
    let apiKeyIndex = 0; // 当前使用的 API Key 索引
    let balanceHistory = []; // 添加余额历史记录数组
    let lastAlertBalance = null; // 添加上次告警时的余额

    /** ==================【🛠 功能模块】================== **/

    /**
     * 📊 获取当前 USDD 余额
     * @returns {number|null} 返回余额数值，若无法获取返回 null
     */
    function getBalance() {
        const balanceElement = document.querySelector(CONFIG.SELECTOR);
        if (!balanceElement) return null;
        return parseFloat(balanceElement.innerText.replace(/,/g, ""));
    }

    /**
     * 📧 发送邮件告警
     * @param {number} balance 当前 USDD 余额
     */
    function sendEmail(balance) {
        const apiKey = CONFIG.API_KEYS[apiKeyIndex];
        
        // 生成最近5次余额记录的HTML
        const historyHTML = balanceHistory
            .slice(-5)
            .map((b, index) => `<tr>
                <td style="padding: 8px; border: 1px solid #ddd;">第${5-index}次</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${b.toLocaleString()} USDD</td>
            </tr>`)
            .join('');

        const emailData = {
            from: CONFIG.EMAIL_SENDER,
            to: CONFIG.EMAIL_RECEIVER,
            subject: "⚠️ USDD 余额告警",
            html: `
                <h2>⚠️ USDD 余额告警！</h2>
                <p style="font-size: 16px;">当前余额：<strong>${balance.toLocaleString()} USDD</strong></p>
                <h3>最近5次余额记录：</h3>
                <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                    <tr>
                        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f8f8;">序号</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f8f8;">余额</th>
                    </tr>
                    ${historyHTML}
                </table>
            `
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: "https://api.resend.com/emails",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify(emailData),
            onload: function(response) {
                if (response.status === 200 || response.status === 201) {
                    console.log(`✅ 邮件发送成功，余额：${balance}`);
                    GM_notification({ title: "✅ USDD 余额告警", text: "邮件发送成功！", timeout: 5000 });
                } else {
                    console.error(`❌ 邮件发送失败：`, {
                        状态码: response.status,
                        响应内容: response.responseText
                    });
                    if (apiKeyIndex < CONFIG.API_KEYS.length - 1) {
                        apiKeyIndex++;
                        console.log("🔄 尝试使用备用 API Key...");
                        sendEmail(balance);
                    }
                }
            },
            onerror: function(error) {
                console.error("❌ 邮件请求失败:", error);
            }
        });
    }

    /**
     * 🔍 监控 USDD 余额
     */
    function monitorBalance() {
        const balance = getBalance();
        const now = new Date().toLocaleTimeString();

        if (balance !== null) {
            console.log(`%c[${now}] 当前 USDD 余额: ${balance.toLocaleString()} USDD`, "color: cyan; font-weight: bold; font-size: 14px;");

            // 更新余额历史记录
            if (balance !== lastBalance) {
                balanceHistory.push(balance);
                // 只保留最近10次记录
                if (balanceHistory.length > 10) {
                    balanceHistory.shift();
                }
                lastUpdateTime = Date.now();
                lastBalance = balance;
            }

            if (balance < CONFIG.ALERT_THRESHOLD) {
                console.log(`%c⚠️ [${now}] 余额低！USDD: ${balance.toLocaleString()}`, "color: red; font-weight: bold; font-size: 16px;");
                // 只有当余额变化时才发送告警
                if (balance !== lastAlertBalance) {
                    sendEmail(balance);
                    lastAlertBalance = balance; // 更新上次告警的余额
                } else {
                    console.log(`ℹ️ [${now}] 余额未变化，跳过告警发送`);
                }
            }
        } else {
            console.warn(`⚠️ [${now}] 无法获取 USDD 余额，可能是页面结构变更`);
        }

        // 5分钟无变化则刷新页面
        if (Date.now() - lastUpdateTime > CONFIG.REFRESH_INTERVAL) {
            console.warn("⚠️ 余额 5 分钟未更新，正在刷新页面...");
            location.reload();
        }
    }

    /** ==================【🚀 运行】================== **/
    console.clear(); // 添加清空控制台
    console.log("%c🚀 USDD 余额监控已启动，每 30 秒检查一次...", "color: green; font-weight: bold; font-size: 16px;");

    setInterval(monitorBalance, CONFIG.CHECK_INTERVAL);
})();
