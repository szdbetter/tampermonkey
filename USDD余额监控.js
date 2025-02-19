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
        EMAIL_SENDER: "alert@yourdomain.com", // 📧 发送邮件的邮箱
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
        const apiKey = CONFIG.API_KEYS[apiKeyIndex]; // 选择 API Key
        const emailData = {
            from: CONFIG.EMAIL_SENDER,
            to: CONFIG.EMAIL_RECEIVER,
            subject: "⚠️ USDD 余额告警",
            html: `<h2>⚠️ USDD 余额告警！</h2><p>当前余额：${balance.toLocaleString()} USDD</p>`
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
                    console.error(`❌ 邮件发送失败：${response.statusText}`);
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

            if (balance < CONFIG.ALERT_THRESHOLD) {
                console.log(`%c⚠️ [${now}] 余额低！USDD: ${balance.toLocaleString()}`, "color: red; font-weight: bold; font-size: 16px;");
                sendEmail(balance);
            }

            // 检查余额是否变化
            if (balance !== lastBalance) {
                lastUpdateTime = Date.now();
                lastBalance = balance;
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

    console.log("%c🚀 USDD 余额监控已启动，每 30 秒检查一次...", "color: green; font-weight: bold; font-size: 16px;");

    setInterval(monitorBalance, CONFIG.CHECK_INTERVAL);
})();
