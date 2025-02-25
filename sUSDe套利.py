import requests
import json
from web3 import Web3
from datetime import datetime, timedelta
from colorama import init, Fore, Style
import time
import schedule

# 初始化 colorama（确保跨平台颜色支持）
init()


# 配置类，管理常量和代币精度及告警配置
class Config:
    DECIMALS = {
        'USDT': 6,  # USDT 精度为 6 位小数
        'SUSDE': 18,  # sUSDe 精度为 18 位小数
        'USDE': 18  # USDe 精度为 18 位小数
    }
    INITIAL_USDT_AMOUNT = 1000000  # 初始 USDT 数量（100 万）
    APY_THRESHOLD = 0.30  # APY 阈值（30%）


# 合约和地址配置
class ContractConfig:
    USDT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7"  # USDT 合约地址
    DAI_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f"  # USDT 合约地址
    SUSDE_ADDRESS = "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497"  # sUSDe 合约地址
    USDE_ADDRESS = "0x4c9edd5852cd905f086c759e8383e09bff1e68b3"  # USDe 合约地址
    RPC_URL = "https://ethereum.blockpi.network/v1/rpc/9da32353708b923d117269f74ba715598f219b25"  # BlockPi RPC 端点

    # sUSDe 合约 ABI
    SUSDE_ABI = [
        {
            "inputs": [
                {"internalType": "uint256", "name": "shares", "type": "uint256"}
            ],
            "name": "convertToAssets",
            "outputs": [
                {"internalType": "uint256", "name": "", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]


# 交互提示和日志工具
class Logger:
    @staticmethod
    def print_status(message, color=Fore.WHITE):
        """打印带颜色的状态提示，包含当前时间"""
        current_time = datetime.utcnow() + timedelta(hours=8)  # 北京时间
        time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"{color}[状态] [{time_str}] {message}{Style.RESET_ALL}")

    @staticmethod
    def print_error(message, color=Fore.RED):
        """打印错误信息，包含当前时间"""
        current_time = datetime.utcnow() + timedelta(hours=8)  # 北京时间
        time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"{color}[错误] [{time_str}] {message}{Style.RESET_ALL}")

    @staticmethod
    def print_result(message, color=Fore.GREEN):
        """打印成功结果，包含当前时间"""
        current_time = datetime.utcnow() + timedelta(hours=8)  # 北京时间
        time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"{color}[结果] [{time_str}] {message}{Style.RESET_ALL}")


# 邮件告警工具
class EmailNotifier:
    API_KEYS = [
        "re_JfpnpbUQ_DgLDbN5x5EAmwFWGbsZ6wqaQ",
        "re_VsrXhwK4_ESLjHdS1JmSCsLcZYStfMbe3"
    ]
    BASE_URL = "https://api.resend.com/emails"
    HEADERS = {
        "Authorization": "",
        "Content-Type": "application/json"
    }
    TO_EMAIL = "8044372@gmail.com"
    LAST_APY = None  # 存储上次发送邮件的 APY 值（保留 2 位小数）

    @staticmethod
    def send_alert(subject, body):
        """发送邮件告警，尝试多个 API Key 直到成功"""
        for api_key in EmailNotifier.API_KEYS:
            EmailNotifier.HEADERS["Authorization"] = f"Bearer {api_key}"
            payload = {
                "from": "no-reply@yourdomain.com",  # 替换为你的发送域名
                "to": EmailNotifier.TO_EMAIL,
                "subject": subject,
                "html": body
            }

            try:
                response = requests.post(EmailNotifier.BASE_URL, headers=EmailNotifier.HEADERS,
                                         data=json.dumps(payload))
                if response.status_code == 200:
                    Logger.print_result(f"邮件告警发送成功，使用 API Key: {api_key}")
                    return True
                else:
                    Logger.print_error(f"邮件发送失败，状态码: {response.status_code}")
                    Logger.print_error(f"响应: {response.text}")
            except requests.exceptions.RequestException as e:
                Logger.print_error(f"邮件发送失败，错误: {str(e)}")
                continue
        Logger.print_error("所有 API Key 尝试失败，告警发送失败")
        return False


# 报价提供者类，用于获取不同平台的报价（可扩展）
class QuoteProvider:
    def __init__(self):
        """初始化报价提供者"""
        self.providers = {
            'cow_swap': {
                'url': 'https://api.cow.fi/mainnet/api/v1/quote',
                'headers': {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        }
        # 代币名称与地址映射
        self.token_names = {
            ContractConfig.USDT_ADDRESS: "USDT",
            ContractConfig.SUSDE_ADDRESS: "sUSDe",
            ContractConfig.USDE_ADDRESS: "USDe"
        }

    def get_token_name(self, token_address):
        """获取代币名称（仅显示名称，不包含合约地址）"""
        return self.token_names.get(token_address, token_address[:6] + "..." + token_address[-4:])

    def get_app_data_hash(self, provider=None):
        """计算 appData 的 Keccak-256 哈希（当前仅支持 CoW Swap）"""
        app_data = json.dumps({"version": "0.9.0", "metadata": {}})
        return Web3(Web3.HTTPProvider(ContractConfig.RPC_URL)).keccak(text=app_data).hex()

    def fetch_quote(self, provider, sell_token, buy_token, sell_amount, from_address, receiver_address):
        """从指定提供者获取报价"""
        if provider not in self.providers:
            Logger.print_error(f"不支持的报价提供者: {provider}")
            return None

        provider_config = self.providers[provider]
        sell_token_name = self.get_token_name(sell_token)
        buy_token_name = self.get_token_name(buy_token)

        Logger.print_status(f"正在通过 {provider} 为 {sell_token_name} -> {buy_token_name} 获取报价...")
        time.sleep(1)  # 模拟网络延迟

        try:
            payload = {
                "sellToken": sell_token,
                "buyToken": buy_token,
                "receiver": receiver_address,
                "appData": json.dumps({"version": "0.9.0", "metadata": {}}),
                "appDataHash": self.get_app_data_hash(provider),
                "sellTokenBalance": "erc20",
                "buyTokenBalance": "erc20",
                "from": from_address,
                "priceQuality": "verified",
                "signingScheme": "eip712",
                "onchainOrder": False,
                "kind": "sell",
                "sellAmountBeforeFee": sell_amount
            }

            response = requests.post(provider_config['url'], headers=provider_config['headers'],
                                     data=json.dumps(payload))
            Logger.print_status("请求发送完成，正在获取响应...")
            time.sleep(0.5)

            if response.status_code == 200:
                Logger.print_status("成功获取响应")
                Logger.print_status("正在解析返回数据...")
                time.sleep(0.5)
                return response.json()
            else:
                Logger.print_error(f"请求失败，状态码: {response.status_code}")
                if response.status_code == 400:
                    error_data = response.json()
                    Logger.print_error(f"原因: {error_data['errorType']} - {error_data['description']}")
                elif response.status_code == 404:
                    Logger.print_error("原因: 未找到交易路由")
                elif response.status_code == 429:
                    Logger.print_error("原因: 请求过多，请稍后再试")
                elif response.status_code == 500:
                    Logger.print_error("原因: 服务器错误")
                elif response.status_code == 405:
                    Logger.print_error("原因: 请求方法不被允许")
                else:
                    Logger.print_error("原因: 未知错误")
                Logger.print_error(f"完整响应头: {json.dumps(dict(response.headers), indent=2)}")
                Logger.print_error(f"完整响应体: {response.text}")
                return None
        except requests.exceptions.RequestException as e:
            Logger.print_error("请求失败")
            Logger.print_error(f"原因: {str(e)}")
            return None


# 区块链交易工具类
class BlockchainTrader:
    def __init__(self, from_address, receiver_address):
        """初始化区块链交易工具"""
        self.from_address = from_address
        self.receiver_address = receiver_address
        self.w3 = Web3(Web3.HTTPProvider(ContractConfig.RPC_URL))
        self.config = Config()
        self.quote_provider = QuoteProvider()

        # 验证连接
        if not self.w3.is_connected():
            raise ConnectionError("无法连接到以太坊节点，请检查 RPC URL")

        # 初始化 sUSDe 合约
        try:
            self.susde_contract = self.w3.eth.contract(
                address=ContractConfig.SUSDE_ADDRESS,
                abi=ContractConfig.SUSDE_ABI
            )
            Logger.print_status("成功连接到 sUSDe 合约")
        except Exception as e:
            Logger.print_error(f"初始化 sUSDe 合约失败：{str(e)}")
            raise

    def unstake_susde_to_usde(self, susde_amount_wei):
        """通过 sUSDe 合约计算 7 天后可解锁的 USDe 数量"""
        Logger.print_status("正在调用 sUSDe 合约的 convertToAssets 方法...")
        time.sleep(1)

        try:
            # 调用合约方法计算 USDe 数量
            usde_wei = self.susde_contract.functions.convertToAssets(susde_amount_wei).call()
            Logger.print_status("合约调用成功，获取 USDe 数量...")
            time.sleep(0.5)
            return usde_wei
        except Exception as e:
            Logger.print_error("合约调用失败")
            Logger.print_error(f"原因: {str(e)}")
            return None

    def format_amount(self, amount, decimals):
        """格式化金额，保留两位小数并添加千位符"""
        return "{:,.2f}".format(int(amount) / 10 ** decimals)

    def format_price(self, sell_amount, buy_amount, sell_decimals, buy_decimals):
        """计算价格（发送Token数量 / 获得Token数量 和 获得Token数量 / 发送Token数量），保留4位小数"""
        sell_value = float(sell_amount) / 10 ** sell_decimals
        buy_value = float(buy_amount) / 10 ** buy_decimals
        price_forward = buy_value / sell_value  # 获得Token数量 / 发送Token数量
        price_reverse = sell_value / buy_value  # 发送Token数量 / 获得Token数量
        return f"{price_forward:.4f}/{price_reverse:.4f}"

    def print_trade_result(self, trade_no, sell_token_name, sell_amount, buy_token_name, buy_amount, time_str, price):
        """打印格式化的交易结果表格，包含价格字段"""
        table_width = 86  # 每列12字符 + 价格列12字符 + 分隔符宽度
        separator = "+" + "-" * (table_width - 2) + "+"

        headers = ["NO.", "时间", "发送Token", "金额", "获得Token", "金额", "价格"]
        colors = [Fore.WHITE, Fore.CYAN, Fore.GREEN, Fore.GREEN, Fore.YELLOW, Fore.YELLOW, Fore.MAGENTA]
        values = [str(trade_no), time_str, sell_token_name, sell_amount, buy_token_name, buy_amount, price]

        Logger.print_result("输出交易结果如下:")
        print(separator)
        print(f"|{'|'.join(f'{colors[i]}{headers[i]:^12}{Style.RESET_ALL}' for i in range(len(headers)))}|")
        print(separator)
        print(f"|{'|'.join(f'{colors[i]}{values[i]:^12}{Style.RESET_ALL}' for i in range(len(values)))}|")
        print(separator)

    def calculate_apy(self, final_usdt, initial_usdt):
        """计算 APY 收益（百分比，保留两位小数）"""
        profit = final_usdt - initial_usdt
        days = 7  # 冷却期为 7 天
        apy = (profit / days) * 365 / initial_usdt
        apy_formula = f"APY = ((({final_usdt} - {initial_usdt}) / {days}) * 365) / {initial_usdt}"
        Logger.print_status(f"APY 计算公式：{apy_formula}")
        return round(apy, 4)  # 返回保留 4 位小数以便格式化，但最终输出保留 2 位

    def get_token_prices(self, usdt_amount_wei, susde_amount_wei, usde_amount_wei):
        """获取当前 sUSDe 和 USDe 的价格（基于 USDT 换算）"""
        # 简化实现：基于 CoW Swap 报价计算价格
        susde_price = float(susde_amount_wei) / float(usdt_amount_wei) * 10 ** (
                    Config.DECIMALS['USDT'] - Config.DECIMALS['SUSDE']) if float(usdt_amount_wei) > 0 else 0
        usde_price = float(usde_amount_wei) / float(usdt_amount_wei) * 10 ** (
                    Config.DECIMALS['USDT'] - Config.DECIMALS['USDE']) if float(usdt_amount_wei) > 0 else 0
        return susde_price, usde_price

    def execute_trade_flow(self):
        """执行完整的交易流程，先计算 APY"""
        Logger.print_status("开始执行完整交易流程...")
        try:
            # 步骤 1: 用 100 万 USDT 购买 sUSDe
            initial_usdt = Config.INITIAL_USDT_AMOUNT
            sell_amount_usdt_wei = str(int(initial_usdt * 10 ** Config.DECIMALS['USDT']))
            usdt_to_susde_quote = self.quote_provider.fetch_quote(
                'cow_swap', ContractConfig.USDT_ADDRESS, ContractConfig.SUSDE_ADDRESS, sell_amount_usdt_wei,
                self.from_address, self.receiver_address
            )

            if usdt_to_susde_quote:
                beijing_time = (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
                sell_token_name = self.quote_provider.get_token_name(ContractConfig.USDT_ADDRESS)
                buy_token_name = self.quote_provider.get_token_name(ContractConfig.SUSDE_ADDRESS)
                sell_amount = self.format_amount(usdt_to_susde_quote["quote"]["sellAmount"], Config.DECIMALS['USDT'])
                susde_amount_wei = usdt_to_susde_quote["quote"]["buyAmount"]
                buy_amount = self.format_amount(susde_amount_wei, Config.DECIMALS['SUSDE'])
                price = self.format_price(
                    usdt_to_susde_quote["quote"]["sellAmount"], susde_amount_wei,
                    Config.DECIMALS['USDT'], Config.DECIMALS['SUSDE']
                )

                Logger.print_result("第一步交易完成，输出结果:")
                self.print_trade_result(1, sell_token_name, sell_amount, buy_token_name, buy_amount, beijing_time,
                                        price)

                # 步骤 2: 通过 sUSDe 合约计算 7 天后可解锁的 USDe 数量
                Logger.print_status("正在计算 7 天后可解锁的 USDe 数量...")
                usde_wei = self.unstake_susde_to_usde(int(susde_amount_wei))
                if usde_wei is not None:
                    usde_amount = self.format_amount(usde_wei, Config.DECIMALS['USDE'])
                    Logger.print_result(f"7 天后可解锁的 USDe 数量：{usde_amount}")

                    # 步骤 3: 用 USDe 换成 USDT（通过 CoW Swap）
                    usde_to_usdt_quote = self.quote_provider.fetch_quote(
                        'cow_swap', ContractConfig.USDE_ADDRESS, ContractConfig.USDT_ADDRESS, str(usde_wei),
                        self.from_address, self.receiver_address
                    )
                    if usde_to_usdt_quote:
                        beijing_time = (datetime.utcnow() + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
                        sell_token_name = self.quote_provider.get_token_name(ContractConfig.USDE_ADDRESS)
                        buy_token_name = self.quote_provider.get_token_name(ContractConfig.USDT_ADDRESS)
                        sell_amount = self.format_amount(usde_to_usdt_quote["quote"]["sellAmount"],
                                                         Config.DECIMALS['USDE'])
                        final_usdt_amount_wei = usde_to_usdt_quote["quote"]["buyAmount"]
                        buy_amount = self.format_amount(final_usdt_amount_wei, Config.DECIMALS['USDT'])
                        price = self.format_price(
                            usde_to_usdt_quote["quote"]["sellAmount"], final_usdt_amount_wei,
                            Config.DECIMALS['USDE'], Config.DECIMALS['USDT']
                        )

                        Logger.print_result("第二步交易完成（USDe 换 USDT），输出结果:")
                        self.print_trade_result(2, sell_token_name, sell_amount, buy_token_name, buy_amount,
                                                beijing_time, price)

                        # 步骤 4: 计算 APY 收益
                        final_usdt = float(buy_amount.replace(",", ""))
                        apy = self.calculate_apy(final_usdt, Config.INITIAL_USDT_AMOUNT)
                        apy_formatted = f"{apy:.2%}"  # 保留小数点后 2 位

                        Logger.print_status("正在计算 APY 收益...")
                        Logger.print_status(
                            f"APY 计算公式：APY = ((({final_usdt} - {Config.INITIAL_USDT_AMOUNT}) / 7) * 365) / {Config.INITIAL_USDT_AMOUNT}")
                        Logger.print_result(f"APY 收益：{apy_formatted}")

                        # 获取当前价格（基于 CoW Swap 报价）
                        susde_price, usde_price = self.get_token_prices(
                            usdt_to_susde_quote["quote"]["sellAmount"],
                            usdt_to_susde_quote["quote"]["buyAmount"],
                            usde_to_usdt_quote["quote"]["sellAmount"]
                        )

                        # 检查 APY 是否超过阈值并发送邮件告警（避免重复推送相同 APY）
                        if apy > Config.APY_THRESHOLD:
                            current_apy_str = f"{apy:.2f}"  # 转换为字符串，保留 2 位小数
                            if EmailNotifier.LAST_APY is None or float(current_apy_str) != float(
                                    EmailNotifier.LAST_APY):
                                susde_amount = float(buy_amount) / susde_price if susde_price > 0 else 0
                                usdt_after_7_days = float(buy_amount.replace(",", ""))

                                email_body = f"""
                                <h2>套利机会告警</h2>
                                <p>当前 APY 收益：{apy_formatted}</p>
                                <p>当前 sUSDe 价格（相对于 USDT）：{susde_price:.4f} USDT/sUSDe</p>
                                <p>当前 USDe 价格（相对于 USDT）：{usde_price:.4f} USDT/USDe</p>
                                <p>投入 1,000,000.00 USDT 可以换到 sUSDe：{susde_amount:,.2f} sUSDe</p>
                                <p>7 天后可换回 USDT：{usdt_after_7_days:,.2f} USDT</p>
                                <p>时间：{beijing_time} (北京时间)</p>
                                <p>请及时检查并采取行动！</p>
                                """
                                Logger.print_status("APY 超过阈值，正在发送邮件告警...")
                                if EmailNotifier.send_alert("高 APY 套利机会告警", email_body):
                                    EmailNotifier.LAST_APY = current_apy_str  # 更新上次发送的 APY
                                else:
                                    Logger.print_error("邮件告警发送失败，请检查 API Key 或网络连接")
                            else:
                                Logger.print_status("本次 APY 与上次邮件推送的 APY 一致，不发送重复告警")
                        else:
                            Logger.print_status(f"APY {apy_formatted} 未超过 {Config.APY_THRESHOLD:.2%} 阈值，无需告警")
                    else:
                        Logger.print_error("USDe 换 USDT 失败，流程终止")
                else:
                    Logger.print_error("sUSDe 解锁计算失败，流程终止")
            else:
                Logger.print_error("USDT 换 sUSDe 失败，流程终止")
        except Exception as e:
            Logger.print_error(f"流程执行失败，总体错误：{str(e)}")

    def get_token_prices(self, usdt_amount_wei, susde_amount_wei, usde_amount_wei):
        """获取当前 sUSDe 和 USDe 的价格（基于 USDT 换算）"""
        # 简化实现：基于 CoW Swap 报价计算价格
        susde_price = float(susde_amount_wei) / float(usdt_amount_wei) * 10 ** (
                    Config.DECIMALS['USDT'] - Config.DECIMALS['SUSDE']) if float(usdt_amount_wei) > 0 else 0
        usde_price = float(usde_amount_wei) / float(usdt_amount_wei) * 10 ** (
                    Config.DECIMALS['USDT'] - Config.DECIMALS['USDE']) if float(usdt_amount_wei) > 0 else 0
        return susde_price, usde_price


# 定时运行函数
def run_trader():
    trader = BlockchainTrader(
        from_address="0x6810e776880c02933d47db1b9fc05908e5386b96",  # 需替换为实际地址
        receiver_address="0x6810e776880c02933d47db1b9fc05908e5386b96"  # 需替换为实际地址
    )
    trader.execute_trade_flow()


if __name__ == "__main__":
    # 设置每 3 分钟运行一次
    schedule.every(3).minutes.do(run_trader)

    Logger.print_status("系统启动，定时任务每 3 分钟运行一次...")
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)  # 避免 CPU 过载
    except KeyboardInterrupt:
        Logger.print_status("系统关闭，停止定时任务...", Fore.YELLOW)