import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
import os
from datetime import datetime

# 用户可配置的门槛和排序变量
TAGGING_THRESHOLDS = {
    "MAX_PROFIT_THRESHOLD": 100_000_000,  # 最大利润（超过不显示盈利金额）
    "MIN_MULTIPLIER_THRESHOLD": 10,  # 最小倍数（低于此值不显示倍数）
    "MAX_MULTIPLIER_THRESHOLD": float('inf'),  # 最大倍数（超过不显示倍数）
    "MIN_TOP_10_COUNT_THRESHOLD": 1,  # 利润前10的最小出现次数（低于不显示前10）
    "MAX_TRADE_COUNT_THRESHOLD": 200,  # 最大交易次数（超过不显示交易次数）
    "MAX_HOLDING_TIME_THRESHOLD": float('inf')  # 最大持有时长（分钟，超过不显示持有时长）
}

# 增加报错阀值设置（详细说明每个阈值的作用）
ERROR_THRESHOLDS = {
    "MAX_PROFIT_AMOUNT_THRESHOLD": 100_000_000,  # 最大利润金额（超过显示红色错误）
    "MIN_PROFIT_AMOUNT_THRESHOLD": 10_000,  # 最小利润金额（低于显示红色错误）
    "MAX_MULTIPLIER_THRESHOLD": 10000,  # 最大利润倍数（超过显示红色错误）
    "MAX_TRADE_COUNT_THRESHOLD": 200,  # 最大交易次数（超过显示红色错误）
    "MIN_SOL_BALANCE": 1,  # 最小SOL余额阈值（低于显示红色错误）
    "EXCLUDE_SUSPICIOUS": True,  # 是否检查可疑地址（如果为True且地址可疑，显示红色错误）
    "MIN_WIN_RATE_THRESHOLD": 20  # 最小胜率阈值（低于此值显示红色错误，单位：百分比）
}

# 用户可配置的排序规则（详细说明每个字段的含义）
SORT_FIELDS = [
    "win_rate",  # 胜率（倒序）- 出现次数/最大交易次数
    "sol_balance",  # SOL余额（倒序）
    "occurrence_count",  # 盈利次数（倒序）- 地址在数据中出现的次数
    "max_multiple",  # 盈利倍数（倒序）- 最大的卖出/买入金额比值
    "top_10_count",  # 利润排名前10次数（倒序）- 在利润排行榜前10名出现的次数
    "buy_count_within_10m",  # 前10分钟买入次数（倒序）- 在pump后10分钟内买入的次数
    "total_profit"  # 盈利金额（倒序）- 实现利润和未实现利润的总和
]
SORT_ASCENDING = [False, False, False, False, False, False, False]  # 对应字段的排序顺序（False=倒序，True=顺序）

# 中文字段映射（用于排序依据显示，添加字段说明）
CHINESE_FIELD_MAPPING = {
    "win_rate": "胜率",  # 出现次数/最大交易次数
    "sol_balance": "SOL余额",  # SOL余额
    "occurrence_count": "盈利次数",  # 地址在数据中出现的总次数
    "total_profit": "盈利金额",  # 实现利润和未实现利润的总和
    "max_multiple": "盈利倍数",  # 最大的卖出/买入金额比值
    "top_10_count": "利润排名前 10 次数",  # 在利润排行榜前10名出现的次数
    "buy_count_within_10m": "前 10 分钟买入次数"  # 在pump后10分钟内买入的次数
}

# 配置变量统一管理（根据实际列名调整为小写，添加详细注释）
CONFIG = {
    "INPUT_FILE": "聪明钱数据_2025_2_25_00_53_33.xlsx",  # 输入文件名
    "OUTPUT_FILE": f"smartmoney_tagged_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",  # 输出文件名（包含时间戳）
    "PROFIT_THRESHOLD": 3000,  # 最小利润阈值
    "PUMP_BUY_THRESHOLD": 600,  # 前10分钟阈值（秒）
    "HOLDING_SHORT_THRESHOLD": 60,  # 短期持有阈值（分钟）
    "HOLDING_DAY_THRESHOLD": 1440,  # 一天持有阈值（分钟）
    "TAG_MAX_LENGTH": 30,  # 标签最大长度
    "COLUMNS": {  # Excel文件列名映射
        "CONTRACT": "合约",  # 合约地址
        "ADDRESS": "聪明钱",  # 钱包地址
        "SOL_BALANCE": "sol余额",  # SOL余额
        "PUMP_TO_BUY": "pump到买入(秒)",  # 从pump到买入的时间间隔
        "BUY_TIME": "买入时间",  # 买入时间
        "SELL_TIME": "卖出时间",  # 卖出时间
        "LAST_ACTIVE_TIME": "最后活跃时间",  # 最后一次交易时间
        "HOLDING_TIME": "持有时长(分钟)",  # 持有时间
        "BUY_AMOUNT": "买入金额",  # 买入金额
        "SELL_AMOUNT": "卖出金额",  # 卖出金额
        "BUY_COUNT": "买入次数",  # 买入次数
        "SELL_COUNT": "卖出次数",  # 卖出次数
        "REALIZED_PROFIT": "实现利润",  # 已实现利润
        "UNREALIZED_PROFIT": "未实现利润",  # 未实现利润
        "PROFIT_RANK": "利润排名",  # 利润排名
        "IS_SUSPICIOUS": "是否可疑"  # 是否为可疑地址
    }
}


class SmartMoneyTagger:
    """智能钱包数据打标类
    
    该类用于处理智能钱包交易数据，生成用户标签和统计结果。
    主要功能包括：
    1. 数据加载和预处理
    2. 统计数据计算
    3. 标签生成
    4. 结果输出
    """

    def __init__(self, config: Dict):
        """初始化智能钱包打标器
        
        Args:
            config: 配置字典，包含文件路径、阈值等配置信息
        """
        self.config = config
        self.df = None  # 存储原始数据
        self.address_stats = {}  # 存储地址统计信息

    def load_data(self, file_path: str) -> None:
        """加载并预处理Excel数据
        
        Args:
            file_path: Excel文件路径
            
        主要处理步骤：
        1. 读取Excel文件
        2. 统一列名为小写
        3. 处理数值列的格式
        4. 处理时间列的格式
        5. 根据配置过滤数据
        """
        # 获取当前工作目录和文件路径信息
        current_dir = os.getcwd()
        print(f"当前工作目录: {current_dir}")
        print(f"目标文件路径: {os.path.abspath(file_path)}")

        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件 {file_path} 不存在，当前目录下文件列表: {os.listdir(current_dir)}")

        # 检查文件大小和格式
        file_size = os.path.getsize(file_path)
        print(f"文件大小: {file_size} 字节")
        if not file_path.lower().endswith('.xlsx'):
            print("警告：文件可能不是 .xlsx 格式，可能导致读取问题")

        # 加载 Excel 文件
        try:
            self.df = pd.read_excel(file_path)
        except Exception as e:
            raise ValueError(f"读取 Excel 文件失败: {str(e)}")

        if self.df.empty:
            raise ValueError("Excel 文件为空")

        # 清理列名（移除空格和换行符，并转换为小写）
        self.df.columns = [col.strip().lower() for col in self.df.columns]

        # 验证所有必需列是否存在（忽略大小写）
        required_cols = {col.lower(): actual_col for actual_col, col in self.config["COLUMNS"].items()}
        missing_cols = []
        for expected_col, actual_col in required_cols.items():
            if expected_col not in self.df.columns:
                missing_cols.append(actual_col)
        if missing_cols:
            raise KeyError(f"Excel 文件缺少以下列: {', '.join(missing_cols)}")

        # 打印实际列名以便调试
        print(f"原始 Excel 文件列名: {list(self.df.columns)}")

        # 打印每个列的详细信息
        print("\n列详细信息：")
        for col in self.df.columns:
            dtype = self.df[col].dtype
            nan_count = self.df[col].isna().sum()
            sample = self.df[col].head(3).tolist()
            print(f"列名: {col}, 数据类型: {dtype}, NaN 数量: {nan_count}, 样本值: {sample}")

        # 打印前10行数据以确认内容
        print("\nExcel 文件前10行数据：")
        print(self.df.head(10))

        # 增强数值转换逻辑，处理千位符和非数值
        numeric_cols = [
            self.config["COLUMNS"]["SOL_BALANCE"],
            self.config["COLUMNS"]["PUMP_TO_BUY"],
            self.config["COLUMNS"]["HOLDING_TIME"],
            self.config["COLUMNS"]["BUY_AMOUNT"],
            self.config["COLUMNS"]["SELL_AMOUNT"],
            self.config["COLUMNS"]["BUY_COUNT"],
            self.config["COLUMNS"]["SELL_COUNT"],
            self.config["COLUMNS"]["REALIZED_PROFIT"],
            self.config["COLUMNS"]["UNREALIZED_PROFIT"],
            self.config["COLUMNS"]["PROFIT_RANK"]
        ]
        for col in numeric_cols:
            # 替换千位符并处理非数值
            self.df[col] = self.df[col].astype(str).str.replace(",", "").replace("N/A", np.nan).str.strip()
            self.df[col] = pd.to_numeric(self.df[col], errors="coerce")
            # 打印可能的问题行（如果有非数值数据）
            if self.df[col].isna().sum() > 0:
                print(
                    f"警告：列 {col} 存在 {self.df[col].isna().sum()} 个 NaN 值，样本: {self.df[self.df[col].isna()][col].head().tolist()}")

        # 转换时间列为 datetime，处理 N/A 和 1970/1/1
        time_cols = [
            self.config["COLUMNS"]["BUY_TIME"].lower(),
            self.config["COLUMNS"]["SELL_TIME"].lower(),
            self.config["COLUMNS"]["LAST_ACTIVE_TIME"].lower()
        ]
        for col in time_cols:
            self.df[col] = pd.to_datetime(self.df[col], errors="coerce")
        print(f"时间列数据类型: {', '.join([str(self.df[col].dtype) for col in time_cols])}")
        print(f"时间列前5个样本: {', '.join([str(self.df[col].head().tolist()) for col in time_cols])}")

        # 验证最后活跃时间列是否有异常值
        last_active_col = self.config["COLUMNS"]["LAST_ACTIVE_TIME"].lower()
        invalid_times = self.df[
            self.df[last_active_col].isna() | (self.df[last_active_col] == pd.Timestamp("1970-01-01"))]
        if not invalid_times.empty:
            print(
                f"警告：最后活跃时间列存在 {len(invalid_times)} 个异常值，样本: {invalid_times[last_active_col].head().tolist()}")

        # 处理SOL余额列
        sol_balance_col = self.config["COLUMNS"]["SOL_BALANCE"].lower()
        self.df[sol_balance_col] = pd.to_numeric(self.df[sol_balance_col].replace(['N/A', ''], np.nan), errors='coerce')
        
        # 不再过滤数据，只是打印统计信息
        if ERROR_THRESHOLDS["MIN_SOL_BALANCE"] > 0:
            low_balance_count = len(self.df[self.df[sol_balance_col].fillna(0) < ERROR_THRESHOLDS["MIN_SOL_BALANCE"]])
            if low_balance_count > 0:
                print(f"提示：发现 {low_balance_count} 行数据的SOL余额低于阈值 {ERROR_THRESHOLDS['MIN_SOL_BALANCE']}")
            
        # 不再过滤可疑地址，只是打印统计信息
        if ERROR_THRESHOLDS["EXCLUDE_SUSPICIOUS"]:
            suspicious_col = self.config["COLUMNS"]["IS_SUSPICIOUS"].lower()
            suspicious_count = len(self.df[self.df[suspicious_col].fillna(True) == True])
            if suspicious_count > 0:
                print(f"提示：发现 {suspicious_count} 行可疑地址数据")

    def calculate_stats(self) -> None:
        """计算每个地址的统计数据，按地址级别汇总统计"""
        addresses = self.df[self.config["COLUMNS"]["ADDRESS"].lower()].unique()
        current_date = pd.Timestamp("2025-02-20")  # 当前日期

        # 临时存储每个地址的统计数据
        temp_stats = {}

        for addr in addresses:
            addr_df = self.df[self.df[self.config["COLUMNS"]["ADDRESS"].lower()] == addr]

            # 打印地址的行数和相关数据以调试
            print(f"地址 {addr} 总行数: {len(addr_df)}")
            print(f"地址 {addr} pump到买入(秒) 数据: {addr_df[self.config['COLUMNS']['PUMP_TO_BUY'].lower()].tolist()}")
            print(f"地址 {addr} 实现利润数据: {addr_df[self.config['COLUMNS']['REALIZED_PROFIT'].lower()].tolist()}")
            print(
                f"地址 {addr} 未实现利润数据: {addr_df[self.config['COLUMNS']['UNREALIZED_PROFIT'].lower()].tolist()}")
            print(f"地址 {addr} 利润排名数据: {addr_df[self.config['COLUMNS']['PROFIT_RANK'].lower()].tolist()}")
            print(f"地址 {addr} 买入次数数据: {addr_df[self.config['COLUMNS']['BUY_COUNT'].lower()].tolist()}")
            print(f"地址 {addr} 卖出次数数据: {addr_df[self.config['COLUMNS']['SELL_COUNT'].lower()].tolist()}")
            print(
                f"地址 {addr} 最后活跃时间数据: {addr_df[self.config['COLUMNS']['LAST_ACTIVE_TIME'].lower()].tolist()}")

            # 总利润（统计所有行的利润总和，包括NaN值）
            realized_profit = addr_df[self.config["COLUMNS"]["REALIZED_PROFIT"].lower()].fillna(0)  # 使用fillna(0)处理NaN
            unrealized_profit = addr_df[self.config["COLUMNS"]["UNREALIZED_PROFIT"].lower()].fillna(0)  # 使用fillna(0)处理NaN
            total_profit = (realized_profit + unrealized_profit).sum()
            total_profit = total_profit if not pd.isna(total_profit) else 0
            print(
                f"地址 {addr} 总利润计算: 实现利润总和 = {realized_profit.sum()}, 未实现利润总和 = {unrealized_profit.sum()}, 总利润 = {total_profit}")

            # 特殊处理：如果总盈利金额超过 1 亿，不打标
            is_profit_invalid = total_profit > ERROR_THRESHOLDS["MAX_PROFIT_AMOUNT_THRESHOLD"]  # 1 亿
            if is_profit_invalid:
                print(f"地址 {addr} 总利润超过阈值，将不会打标")

            # 最大倍数（统计相同地址的最大盈利倍数，包括NaN值）
            buy_amount = addr_df[self.config["COLUMNS"]["BUY_AMOUNT"].lower()].fillna(0)  # 使用fillna(0)处理NaN
            sell_amount = addr_df[self.config["COLUMNS"]["SELL_AMOUNT"].lower()].fillna(0)  # 使用fillna(0)处理NaN
            max_multiple = 0
            if not buy_amount.empty and not sell_amount.empty:
                # 计算倍数时处理除数为0的情况
                valid_multiples = sell_amount / buy_amount.replace(0, np.nan)
                if not valid_multiples.empty:
                    print(f"地址 {addr} 倍数列表: {valid_multiples.tolist()}")
                max_multiple = int(valid_multiples.max()) if not pd.isna(valid_multiples.max()) and valid_multiples.max() > 0 and not np.isinf(valid_multiples.max()) else 0
                print(f"地址 {addr} 最大倍数: {max_multiple}")

            # 前10排名次数（统计利润排名 < 10 的次数，包括NaN值）
            profit_rank = addr_df[self.config["COLUMNS"]["PROFIT_RANK"].lower()].fillna(float('inf'))  # 使用fillna(inf)处理NaN
            top_10_count = len(profit_rank[profit_rank < 10]) if not profit_rank.empty else 0
            print(f"地址 {addr} 前10排名次数: {top_10_count}")

            # 计算每行的交易次数（买入次数 + 卖出次数）并取最大值
            buy_count_col = self.config["COLUMNS"]["BUY_COUNT"].lower()
            sell_count_col = self.config["COLUMNS"]["SELL_COUNT"].lower()
            trade_counts = addr_df[buy_count_col].fillna(0) + addr_df[sell_count_col].fillna(0)
            latest_trade_count = int(trade_counts.max()) if not trade_counts.empty else 0
            print(f"地址 {addr} 最新交易次数: {latest_trade_count}")

            # 计算胜率（出现次数 / 最大交易次数）
            occurrence_count = len(addr_df)  # 出现次数就是盈利次数（每出现一次就是一次盈利）
            win_rate = (occurrence_count / latest_trade_count * 100) if latest_trade_count > 0 else 0
            win_rate = round(win_rate)  # 四舍五入到整数
            print(f"地址 {addr} 胜率: {win_rate}%（出现次数: {occurrence_count}, 交易次数: {latest_trade_count}）")

            # 前 10 分钟内的买入次数（统计 pump到买入(秒) < 600 秒的买入次数总和，包括NaN值）
            pump_to_buy_col = self.config["COLUMNS"]["PUMP_TO_BUY"].lower()
            buy_count_within_10m = addr_df[
                addr_df[pump_to_buy_col].fillna(float('inf')) <= self.config["PUMP_BUY_THRESHOLD"]
                ][buy_count_col].fillna(0).sum()
            buy_count_within_10m = int(buy_count_within_10m) if not pd.isna(buy_count_within_10m) else 0
            print(f"地址 {addr} 前 10 分钟内买入次数: {buy_count_within_10m}")

            # 平均买入时间（统计所有pump到买入(秒)值，包括NaN值）
            pump_to_buy = addr_df[pump_to_buy_col].fillna(float('inf'))  # 使用fillna(inf)处理NaN
            fast_buys = pump_to_buy[pump_to_buy <= self.config["PUMP_BUY_THRESHOLD"]]
            print(f"地址 {addr} pump到买入(秒) 有效值 (< 600 秒): {fast_buys.tolist()}")
            avg_buy_time = int(fast_buys.mean() / 60) if not fast_buys.empty and not pd.isna(fast_buys.mean()) else 0  # 单位：分钟
            print(f"地址 {addr} 平均买入时间: {avg_buy_time}分钟")

            # 平均持有时长（统计所有持有时长，包括NaN值）
            holding_time_col = self.config["COLUMNS"]["HOLDING_TIME"].lower()
            holding_times = addr_df[holding_time_col].fillna(0)  # 使用fillna(0)处理NaN
            avg_holding = holding_times.mean() if not holding_times.empty else 0
            print(f"地址 {addr} 平均持有时长: {avg_holding}分钟")

            # 地址出现次数（用于排序和胜率计算）
            occurrence_count = len(addr_df)
            print(f"地址 {addr} 出现次数: {occurrence_count}")  # 恢复调试信息

            # 存储统计数据（添加详细注释）
            temp_stats[addr] = {
                "total_profit": total_profit,  # 总利润（实现利润 + 未实现利润）
                "max_multiple": max_multiple,  # 最大盈利倍数
                "top_10_count": top_10_count,  # 利润排名前10的次数
                "latest_trade_count": latest_trade_count,  # 最新交易次数（买入次数+卖出次数的最大值）
                "win_rate": win_rate,  # 胜率（出现次数/最大交易次数）
                "profit_count": occurrence_count,  # 盈利次数（等于出现次数）
                "avg_buy_time": avg_buy_time,  # 平均买入时间（分钟）
                "avg_holding": avg_holding,  # 平均持有时长
                "occurrence_count": occurrence_count,  # 地址出现次数
                "buy_count_within_10m": buy_count_within_10m,  # 前10分钟内的买入次数
                "is_profit_invalid": is_profit_invalid  # 是否超过最大利润阈值
            }

        # 将临时统计数据赋值给 address_stats
        self.address_stats = temp_stats

    def generate_tag(self, addr: str) -> Tuple[str, str]:
        """生成单个地址的标签和统计结果，按地址级别统一显示"""
        # 如果地址不在 stats 中，使用默认值
        if addr not in self.address_stats:
            self.address_stats[addr] = {
                "total_profit": 0,
                "max_multiple": 0,
                "top_10_count": 0,
                "latest_trade_count": 0,
                "win_rate": 0,
                "profit_count": 0,
                "avg_buy_time": 0,
                "avg_holding": np.nan,
                "occurrence_count": 0,
                "buy_count_within_10m": 0,
                "is_profit_invalid": False
            }

        stats = self.address_stats[addr]
        
        # 获取地址的SOL余额和可疑状态
        addr_df = self.df[self.df[self.config["COLUMNS"]["ADDRESS"].lower()] == addr]
        sol_balance_col = self.config["COLUMNS"]["SOL_BALANCE"].lower()
        suspicious_col = self.config["COLUMNS"]["IS_SUSPICIOUS"].lower()
        
        latest_balance = addr_df[sol_balance_col].iloc[-1] if not addr_df.empty else 0
        is_suspicious = addr_df[suspicious_col].iloc[-1] if not addr_df.empty else True

        # 添加数字格式化函数
        def format_number(num):
            if pd.isna(num):
                return "N/A"
            return f"{int(num):,}"

        # 检查报错阀值
        error_message = None
        if stats["total_profit"] > ERROR_THRESHOLDS["MAX_PROFIT_AMOUNT_THRESHOLD"]:
            error_message = f"错误：{format_number(stats['total_profit'])}最大利润超过阀值{format_number(ERROR_THRESHOLDS['MAX_PROFIT_AMOUNT_THRESHOLD'])}"
        elif stats["total_profit"] < ERROR_THRESHOLDS["MIN_PROFIT_AMOUNT_THRESHOLD"]:
            error_message = f"错误：{format_number(stats['total_profit'])}最小利润低于阀值{format_number(ERROR_THRESHOLDS['MIN_PROFIT_AMOUNT_THRESHOLD'])}"
        elif stats["max_multiple"] > ERROR_THRESHOLDS["MAX_MULTIPLIER_THRESHOLD"]:
            error_message = f"错误：{format_number(stats['max_multiple'])}最大倍数超过阀值{format_number(ERROR_THRESHOLDS['MAX_MULTIPLIER_THRESHOLD'])}"
        elif stats["latest_trade_count"] > ERROR_THRESHOLDS["MAX_TRADE_COUNT_THRESHOLD"]:
            error_message = f"错误：{format_number(stats['latest_trade_count'])}最大交易次数超过阀值{format_number(ERROR_THRESHOLDS['MAX_TRADE_COUNT_THRESHOLD'])}"
        elif pd.notna(latest_balance) and latest_balance < ERROR_THRESHOLDS["MIN_SOL_BALANCE"]:
            error_message = f"错误：SOL余额{format_number(latest_balance)}低于阀值{format_number(ERROR_THRESHOLDS['MIN_SOL_BALANCE'])}"
        elif ERROR_THRESHOLDS["EXCLUDE_SUSPICIOUS"] and is_suspicious:
            error_message = "错误：可疑地址"
        elif stats["win_rate"] < ERROR_THRESHOLDS["MIN_WIN_RATE_THRESHOLD"]:
            error_message = f"错误：胜率{stats['win_rate']}%低于阀值{ERROR_THRESHOLDS['MIN_WIN_RATE_THRESHOLD']}%"

        # 如果总盈利超过阈值，或达到报错阀值，不打标
        if stats["is_profit_invalid"] or error_message:
            if not error_message:
                tag = ""  # 空标签（总盈利超过阈值）
                stats_str = (f"利润:{format_number(stats['total_profit'])},盈利金额错误!")
            else:
                tag = error_message  # 显示红色错误信息
                if "最小利润低于阀值" in error_message:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},最小利润错误(低于{format_number(ERROR_THRESHOLDS['MIN_PROFIT_AMOUNT_THRESHOLD'])})")
                elif "SOL余额" in error_message:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},SOL余额错误(低于{format_number(ERROR_THRESHOLDS['MIN_SOL_BALANCE'])})")
                elif "可疑地址" in error_message:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},地址可疑")
                elif "胜率" in error_message:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},胜率错误(低于{ERROR_THRESHOLDS['MIN_WIN_RATE_THRESHOLD']}%)")
                else:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},{error_message}")
        else:
            # 胜率
            win_rate_part = f"胜{stats['win_rate']}%"

            # SOL余额
            balance_part = ""
            if pd.notna(latest_balance) and latest_balance > 0:
                balance_part = f"余{int(latest_balance)}"

            # 赚钱能力（统计所有行的利润总和）
            profit = stats["total_profit"]
            profit_part = ""
            if profit <= TAGGING_THRESHOLDS["MAX_PROFIT_THRESHOLD"]:
                if profit >= 1000000:
                    profit_str = f"赚{int(profit / 1000000)}M"
                elif profit >= 10000:
                    profit_str = f"赚{int(profit / 10000)}万"
                else:
                    profit_str = f"赚{int(profit / 1000)}K"
                profit_part = profit_str
            else:
                profit_part = ""  # 超过最大利润阈值，不显示盈利金额

            # 倍数（仅当 >= 最小倍数且 <= 最大倍数时显示）
            multiple_str = ""
            if (stats["max_multiple"] >= TAGGING_THRESHOLDS["MIN_MULTIPLIER_THRESHOLD"] and
                    stats["max_multiple"] <= TAGGING_THRESHOLDS["MAX_MULTIPLIER_THRESHOLD"]):
                multiple_str = f"{stats['max_multiple']}x" if stats["max_multiple"] >= 10 else ""

            # 前10排名（仅当 >= 最小出现次数时显示）
            top_10_str = ""
            if stats["top_10_count"] >= TAGGING_THRESHOLDS["MIN_TOP_10_COUNT_THRESHOLD"]:
                top_10_str = f"前10({stats['top_10_count']})" if stats["top_10_count"] > 0 else ""

            earning_part = f"{profit_part}{multiple_str}{top_10_str}"

            # 交易次数（仅当 <= 最大交易次数时显示）
            latest_trade_count = stats["latest_trade_count"]
            trade_part = ""
            if latest_trade_count <= TAGGING_THRESHOLDS["MAX_TRADE_COUNT_THRESHOLD"]:
                # 格式化交易次数显示
                if latest_trade_count < 100:
                    formatted_trade_count = f"{int(latest_trade_count)}"
                elif 100 <= latest_trade_count < 1000:
                    formatted_trade_count = f"{int(latest_trade_count / 100)}百"
                elif 1000 <= latest_trade_count < 10000:
                    formatted_trade_count = f"{int(latest_trade_count / 1000)}千"
                else:
                    formatted_trade_count = f"{int(latest_trade_count / 10000)}万"
                trade_part = f"交{formatted_trade_count}"
            else:
                trade_part = ""  # 超过最大交易次数阈值，不显示交易次数

            # 买入时间（只显示 < 600 秒且平均 <= 10 分钟的平均值，单位分钟）
            buy_time = stats["avg_buy_time"]
            buy_part = ""
            if buy_time > 0:
                buy_part = f"买{buy_time}m"

            # 持有时长（仅当 <= 最大持有时长时显示）
            holding = stats["avg_holding"]
            holding_part = ""
            if not pd.isna(holding) and holding <= TAGGING_THRESHOLDS["MAX_HOLDING_TIME_THRESHOLD"]:
                if holding < self.config["HOLDING_SHORT_THRESHOLD"]:
                    holding_part = f"持{int(holding)}m"
                elif holding < self.config["HOLDING_DAY_THRESHOLD"]:
                    holding_part = f"持{int(holding / 60)}h"
                else:
                    holding_part = f"持{int(holding / 1440)}d"

            # 组合标签，优先保留关键信息并控制长度，去除":"和逗号，使用直接拼接
            # 新的标签顺序：胜率、余额、其他
            tag_parts = [win_rate_part, balance_part] + [part for part in [earning_part, trade_part, buy_part, holding_part] if part]
            tag = "".join(tag_parts)  # 取消逗号，使用直接拼接

            if len(tag) > self.config["TAG_MAX_LENGTH"]:
                tag = f"{win_rate_part}{balance_part}{earning_part}"[:self.config["TAG_MAX_LENGTH"]]

            # 统计结果（增加地址出现次数、SOL余额和胜率）
            occurrence_count = stats["occurrence_count"]
            stats_str = (f"利润:{format_number(profit)},倍数:{format_number(stats['max_multiple'])}x,"
                        f"前10:{format_number(stats['top_10_count'])},"
                        f"交易次数:{format_number(latest_trade_count)},"
                        f"胜率:{format_number(stats['win_rate'])}%,"
                        f"买:{format_number(buy_time)}m,持:{format_number(holding)}m,"
                        f"出现次数:{format_number(occurrence_count)},"
                        f"SOL余额:{format_number(latest_balance)}")

        return tag, stats_str

    def process(self) -> None:
        """主处理流程"""
        self.load_data(self.config["INPUT_FILE"])
        self.calculate_stats()

        # 获取所有地址的统计结果（包括原始数据中的所有地址）
        stats_df = []
        all_addresses = self.df[self.config["COLUMNS"]["ADDRESS"].lower()].unique()
        
        for addr in all_addresses:
            tag, stats = self.generate_tag(addr)
            
            # 获取当前地址的SOL余额
            addr_df = self.df[self.df[self.config["COLUMNS"]["ADDRESS"].lower()] == addr]
            sol_balance_col = self.config["COLUMNS"]["SOL_BALANCE"].lower()
            latest_balance = addr_df[sol_balance_col].iloc[-1] if not addr_df.empty else 0
            
            stats_data = self.address_stats.get(addr, {
                "occurrence_count": 0,
                "total_profit": 0,
                "max_multiple": 0,
                "top_10_count": 0,
                "buy_count_within_10m": 0
            })
            
            stats_df.append({
                self.config["COLUMNS"]["ADDRESS"]: addr,
                "用户标签": tag,
                "统计结果": stats,
                "win_rate": stats_data["win_rate"],  # 胜率
                "sol_balance": latest_balance,  # SOL余额
                "occurrence_count": stats_data["occurrence_count"],  # 盈利次数（地址出现次数）
                "total_profit": stats_data["total_profit"],  # 盈利金额
                "max_multiple": stats_data["max_multiple"],  # 盈利倍数
                "top_10_count": stats_data["top_10_count"],  # 利润排名在前10的次数
                "buy_count_within_10m": stats_data["buy_count_within_10m"],  # 前10分钟内的买入次数
                "最后活跃时间": addr_df[self.config["COLUMNS"]["LAST_ACTIVE_TIME"].lower()].max(),  # 取最新的活跃时间
                "告警阈值": (
                    f"最大利润:{ERROR_THRESHOLDS['MAX_PROFIT_AMOUNT_THRESHOLD']:,}, "
                    f"最小利润:{ERROR_THRESHOLDS['MIN_PROFIT_AMOUNT_THRESHOLD']:,}, "
                    f"最大倍数:{ERROR_THRESHOLDS['MAX_MULTIPLIER_THRESHOLD']:,}, "
                    f"最大交易次数:{ERROR_THRESHOLDS['MAX_TRADE_COUNT_THRESHOLD']:,}, "
                    f"最小SOL余额:{ERROR_THRESHOLDS['MIN_SOL_BALANCE']:,}, "
                    f"检查可疑地址:{ERROR_THRESHOLDS['EXCLUDE_SUSPICIOUS']}, "
                    f"最小胜率:{ERROR_THRESHOLDS['MIN_WIN_RATE_THRESHOLD']}%"
                )
            })

        # 转换为 DataFrame
        result_df = pd.DataFrame(stats_df)

        # 按排序规则排序（用户自定义排序字段和顺序）
        result_df = result_df.sort_values(by=SORT_FIELDS, ascending=SORT_ASCENDING)

        # 只保留需要的列：地址、用户标签、统计结果、最后活跃时间、告警阈值
        result_df = result_df[[self.config["COLUMNS"]["ADDRESS"], "用户标签", "统计结果", "最后活跃时间", "告警阈值"]]

        # 重命名列为中文
        result_df.columns = ["地址", "用户标签", "统计结果", "最后活跃时间", "告警阈值"]

        # 生成排序依据描述（使用中文字段名）
        sort_description = ", ".join([
            f"{CHINESE_FIELD_MAPPING[field]}（{'倒序' if not asc else '顺序'}）"
            for field, asc in zip(SORT_FIELDS, SORT_ASCENDING)
        ])

        # 添加排序依据字段
        result_df["排序依据"] = sort_description

        # 保存到 Excel 文件
        result_df.to_excel(self.config["OUTPUT_FILE"], index=False)

        # 尝试使用 openpyxl 设置格式
        try:
            from openpyxl import load_workbook
            from openpyxl.styles import Font, Color

            # 加载工作簿
            wb = load_workbook(self.config["OUTPUT_FILE"])
            ws = wb.active

            # 设置工作表缩放比例为120%
            ws.sheet_view.zoomScale = 120

            # 设置所有单元格的字体为12号微软雅黑
            for row in ws.rows:
                for cell in row:
                    cell.font = Font(size=12, name='微软雅黑')

            # 找到 "用户标签"、"统计结果" 和 "最后活跃时间" 列
            tag_col = result_df.columns.get_loc("用户标签") + 1  # Excel 列索引从 1 开始
            stats_col = result_df.columns.get_loc("统计结果") + 1  # Excel 列索引从 1 开始
            last_active_col = result_df.columns.get_loc("最后活跃时间") + 1  # Excel 列索引从 1 开始

            # 获取当前时间
            current_time = pd.Timestamp.now()

            # 遍历每一行，检查用户标签、统计结果和最后活跃时间
            for idx, row in enumerate(ws.rows):
                if idx == 0:  # 跳过标题行
                    continue
                    
                tag_cell = row[tag_col - 1]  # 用户标签列的单元格
                stats_cell = row[stats_col - 1]  # 统计结果列的单元格
                last_active_cell = row[last_active_col - 1]  # 最后活跃时间列的单元格

                # 检查用户标签是否为错误信息
                if tag_cell.value and "错误：" in str(tag_cell.value):
                    tag_cell.font = Font(color="FF0000", size=12, name='微软雅黑')  # 设置红色字体，保持12号微软雅黑字体

                # 检查统计结果是否包含 "盈利金额错误!"
                if stats_cell.value and "盈利金额错误!" in str(stats_cell.value):
                    stats_cell.font = Font(color="FF0000", size=12, name='微软雅黑')  # 设置红色字体，保持12号微软雅黑字体

                # 检查最后活跃时间是否在1天之内
                if last_active_cell.value:
                    try:
                        last_active_time = pd.to_datetime(last_active_cell.value)
                        if (current_time - last_active_time).total_seconds() <= 86400:  # 86400秒 = 1天
                            last_active_cell.font = Font(color="00B050", size=12, name='微软雅黑')  # 设置绿色字体
                    except:
                        pass  # 如果日期转换失败，保持默认字体

            # 调整列宽以适应内容
            for column in ws.columns:
                max_length = 0
                column = [cell for cell in column]
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                ws.column_dimensions[column[0].column_letter].width = adjusted_width

            # 保存修改后的文件
            wb.save(self.config["OUTPUT_FILE"])
            print(f"已设置Excel默认显示为120%缩放，12号微软雅黑字体！")

        except ImportError:
            print("警告：无法安装 openpyxl，无法设置Excel格式。确保已安装 openpyxl 库。")
        except Exception as e:
            print(f"警告：设置Excel格式时出错: {str(e)}")

        print(f"处理完成，结果已保存至 {self.config['OUTPUT_FILE']}")

        # 打印原始数据行数和唯一地址数的统计信息
        total_rows = len(self.df)
        unique_addresses = len(all_addresses)
        print(f"\n数据统计:")
        print(f"原始文件总行数: {total_rows:,} 条")
        print(f"唯一地址数量: {unique_addresses:,} 个")
        print(f"每个地址平均行数: {total_rows/unique_addresses:.2f} 条")


def main():
    """主函数"""
    tagger = SmartMoneyTagger(CONFIG)
    tagger.process()


if __name__ == "__main__":
    main()