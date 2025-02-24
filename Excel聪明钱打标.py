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

# 增加报错阀值设置
ERROR_THRESHOLDS = {
    "MAX_PROFIT_AMOUNT_THRESHOLD": 100_000_000,  # 最大利润金额（超过显示红色错误）
    "MIN_PROFIT_AMOUNT_THRESHOLD": 10_000,  # 最小利润金额（低于显示红色错误）
    "MAX_MULTIPLIER_THRESHOLD": 10000,  # 最大利润倍数（超过显示红色错误）
    "MAX_TRADE_COUNT_THRESHOLD": 200,  # 最大交易次数（超过显示红色错误）
    "MIN_SOL_BALANCE": 1,  # 最小SOL余额阈值（低于显示红色错误）
    "EXCLUDE_SUSPICIOUS": True  # 是否检查可疑地址（如果为True且地址可疑，显示红色错误）
}

# 用户可配置的排序规则
SORT_FIELDS = [
    "occurrence_count",  # 盈利次数（倒序）
    "max_multiple",  # 盈利倍数（倒序）
    "top_10_count",  # 利润排名前10次数（倒序）
    "buy_count_within_10m",  # 前10分钟买入次数（倒序）
    "total_profit"  # 盈利金额（倒序）
]
SORT_ASCENDING = [False, False, False, False, False]  # 对应字段的排序顺序（False=倒序，True=顺序）

# 中文字段映射（用于排序依据显示）
CHINESE_FIELD_MAPPING = {
    "occurrence_count": "盈利次数",
    "total_profit": "盈利金额",
    "max_multiple": "盈利倍数",
    "top_10_count": "利润排名前 10 次数",
    "buy_count_within_10m": "前 10 分钟买入次数"
}

# 配置变量统一管理（根据实际列名调整为小写）
CONFIG = {
    "INPUT_FILE": "聪明钱数据_2025_2_24_20_12_28.xlsx",
    "OUTPUT_FILE": f"smartmoney_tagged_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
    "PROFIT_THRESHOLD": 3000,
    "PUMP_BUY_THRESHOLD": 600,  # 前10分钟阈值（秒）
    "HOLDING_SHORT_THRESHOLD": 60,
    "HOLDING_DAY_THRESHOLD": 1440,
    "TAG_MAX_LENGTH": 30,
    "COLUMNS": {
        "CONTRACT": "合约",
        "ADDRESS": "聪明钱",
        "SOL_BALANCE": "sol余额",
        "PUMP_TO_BUY": "pump到买入(秒)",
        "BUY_TIME": "买入时间",
        "SELL_TIME": "卖出时间",
        "LAST_ACTIVE_TIME": "最后活跃时间",
        "HOLDING_TIME": "持有时长(分钟)",
        "BUY_AMOUNT": "买入金额",
        "SELL_AMOUNT": "卖出金额",
        "BUY_COUNT": "买入次数",
        "SELL_COUNT": "卖出次数",
        "REALIZED_PROFIT": "实现利润",
        "UNREALIZED_PROFIT": "未实现利润",
        "PROFIT_RANK": "利润排名",
        "IS_SUSPICIOUS": "是否可疑"
    }
}


class SmartMoneyTagger:
    """智能钱包数据打标类"""

    def __init__(self, config: Dict):
        self.config = config
        self.df = None
        self.address_stats = {}

    def load_data(self, file_path: str) -> None:
        """加载 Excel 数据并处理异常，增加详细调试信息"""
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
        
        # 根据配置过滤数据
        if ERROR_THRESHOLDS["MIN_SOL_BALANCE"] > 0:
            self.df = self.df[self.df[sol_balance_col].fillna(0) >= ERROR_THRESHOLDS["MIN_SOL_BALANCE"]]
            
        # 处理可疑地址
        if ERROR_THRESHOLDS["EXCLUDE_SUSPICIOUS"]:
            suspicious_col = self.config["COLUMNS"]["IS_SUSPICIOUS"].lower()
            self.df = self.df[self.df[suspicious_col].fillna(True) == False]

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

            # 总利润（统计所有行的利润总和）
            realized_profit = addr_df[self.config["COLUMNS"]["REALIZED_PROFIT"].lower()].dropna()
            unrealized_profit = addr_df[self.config["COLUMNS"]["UNREALIZED_PROFIT"].lower()].dropna()
            total_profit = (realized_profit + unrealized_profit).sum()
            total_profit = total_profit if not pd.isna(total_profit) else 0
            print(
                f"地址 {addr} 总利润计算: 实现利润总和 = {realized_profit.sum()}, 未实现利润总和 = {unrealized_profit.sum()}, 总利润 = {total_profit}")

            # 特殊处理：如果总盈利金额超过 1 亿，不打标
            is_profit_invalid = total_profit > ERROR_THRESHOLDS["MAX_PROFIT_AMOUNT_THRESHOLD"]  # 1 亿

            # 最大倍数（统计相同地址的最大盈利倍数）
            buy_amount = addr_df[self.config["COLUMNS"]["BUY_AMOUNT"].lower()].dropna()
            sell_amount = addr_df[self.config["COLUMNS"]["SELL_AMOUNT"].lower()].dropna()
            max_multiple = 0
            if not buy_amount.empty and not sell_amount.empty:
                # 过滤掉 buy_amount 为 0 或 NaN 的行
                valid_multiples = sell_amount / buy_amount.replace(0, np.nan).dropna()
                if not valid_multiples.empty and not pd.isna(valid_multiples.max()):
                    max_multiple = int(valid_multiples.max()) if valid_multiples.max() > 0 and not np.isinf(
                        valid_multiples.max()) else 0

            # 前10排名次数（统计利润排名 < 10 的次数）
            profit_rank = addr_df[self.config["COLUMNS"]["PROFIT_RANK"].lower()].dropna()
            top_10_count = len(profit_rank[profit_rank < 10]) if not profit_rank.empty else 0

            # 交易次数（以最新最后活跃时间的交易次数为准）
            last_active_col = self.config["COLUMNS"]["LAST_ACTIVE_TIME"].lower()
            buy_count_col = self.config["COLUMNS"]["BUY_COUNT"].lower()
            sell_count_col = self.config["COLUMNS"]["SELL_COUNT"].lower()

            # 过滤掉无效的最后活跃时间（NaN 或 1970-01-01）
            valid_addr_df = addr_df[
                (addr_df[last_active_col].notna()) &
                (addr_df[last_active_col] != pd.Timestamp("1970-01-01"))
                ]

            if not valid_addr_df.empty:
                # 按最后活跃时间排序，取最新记录的交易次数
                latest_record = valid_addr_df.sort_values(by=last_active_col, ascending=False).iloc[0]
                latest_trade_count = (latest_record[buy_count_col] + latest_record[sell_count_col]) if not pd.isna(
                    latest_record[buy_count_col]) and not pd.isna(latest_record[sell_count_col]) else 0
            else:
                latest_trade_count = 0  # 如果无有效最后活跃时间，默认交易次数为 0
            print(f"地址 {addr} 最新交易次数: {latest_trade_count}")

            # 格式化交易次数显示
            if latest_trade_count < 100:
                formatted_trade_count = f"{int(latest_trade_count)}"
            elif 100 <= latest_trade_count < 1000:
                formatted_trade_count = f"{int(latest_trade_count / 100)}百"
            elif 1000 <= latest_trade_count < 10000:
                formatted_trade_count = f"{int(latest_trade_count / 1000)}千"
            else:
                formatted_trade_count = f"{int(latest_trade_count / 10000)}万"

            # 盈利次数（以地址为单位统计所有行的总和）
            profit_count = len(addr_df[addr_df[self.config["COLUMNS"]["REALIZED_PROFIT"].lower()] +
                                       addr_df[self.config["COLUMNS"]["UNREALIZED_PROFIT"].lower()] >= self.config[
                                           "PROFIT_THRESHOLD"]])

            # 平均买入时间（仅统计 < 600 秒的 pump到买入(秒) 平均值）
            pump_to_buy_col = self.config["COLUMNS"]["PUMP_TO_BUY"].lower()
            pump_to_buy = addr_df[pump_to_buy_col].dropna()  # 仅使用非 NaN 值
            fast_buys = pump_to_buy[pump_to_buy <= self.config["PUMP_BUY_THRESHOLD"]]  # 只取 < 600 秒的数据
            print(f"地址 {addr} pump到买入(秒) 有效值 (< 600 秒): {fast_buys.tolist()}")
            avg_buy_time = int(fast_buys.mean() / 60) if not fast_buys.empty else 0  # 单位：分钟

            # 前 10 分钟内的买入次数（统计 pump到买入(秒) < 600 秒 的买入次数总和）
            buy_count_within_10m = addr_df[
                addr_df[pump_to_buy_col].notna() &
                (addr_df[pump_to_buy_col] <= self.config["PUMP_BUY_THRESHOLD"])
                ][self.config["COLUMNS"]["BUY_COUNT"].lower()].sum()
            buy_count_within_10m = int(buy_count_within_10m) if not pd.isna(buy_count_within_10m) else 0
            print(f"地址 {addr} 前 10 分钟内买入次数: {buy_count_within_10m}")

            # 只有当平均买入时间 <= 10 分钟时才显示，且不超过最大持有时长阈值
            buy_part = ""
            if (avg_buy_time > 0 and avg_buy_time <= 10 and
                    avg_buy_time <= TAGGING_THRESHOLDS["MAX_HOLDING_TIME_THRESHOLD"] / 60):  # 转换为分钟
                buy_part = f"买{avg_buy_time}m"

            # 平均买入时间和持有时长（统计相同地址的平均值，跳过 pump到买入(秒) 或 卖出时间 为 NaN 的行）
            buy_time_col = self.config["COLUMNS"]["BUY_TIME"].lower()
            sell_time_col = self.config["COLUMNS"]["SELL_TIME"].lower()
            holding_time_col = self.config["COLUMNS"]["HOLDING_TIME"].lower()

            # 过滤出有效的买入时间和卖出时间行
            valid_buy_rows = addr_df[addr_df[pump_to_buy_col].notna()]  # 跳过 pump到买入(秒) 为 NaN 的行
            valid_rows = addr_df[
                (addr_df[buy_time_col].notna()) &  # 排除 N/A
                (addr_df[buy_time_col] != pd.Timestamp("1970-01-01")) &  # 排除 1970/1/1
                ((current_date - addr_df[buy_time_col]).dt.days <= 365) &  # 排除超过1年的买入时间
                (addr_df[sell_time_col].notna())  # 排除卖出时间为 NaN 的行
                ]

            # 平均持有时长（仅使用有效卖出时间的行）
            holding_times = valid_rows[holding_time_col].dropna()
            avg_holding = holding_times.mean() if not holding_times.empty else np.nan  # 使用 NaN 表示无有效持有时长

            # 地址出现次数（用于排序）
            occurrence_count = len(addr_df)
            print(f"地址 {addr} 出现次数: {occurrence_count}")

            # 临时存储统计数据
            temp_stats[addr] = {
                "total_profit": total_profit,
                "max_multiple": max_multiple,
                "top_10_count": top_10_count,
                "latest_trade_count": latest_trade_count,  # 存储最新交易次数
                "profit_count": profit_count,  # 盈利次数仍按地址总和统计
                "avg_buy_time": avg_buy_time if (avg_buy_time <= 10 and
                                                 avg_buy_time <= TAGGING_THRESHOLDS[
                                                     "MAX_HOLDING_TIME_THRESHOLD"] / 60) else 0,
                "avg_holding": avg_holding,
                "occurrence_count": occurrence_count,  # 存储出现次数
                "buy_count_within_10m": buy_count_within_10m,  # 存储前 10 分钟内的买入次数
                "is_profit_invalid": is_profit_invalid  # 标记总盈利是否超过 1 亿
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
                else:
                    stats_str = (f"利润:{format_number(stats['total_profit'])},{error_message}")
        else:
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
                if latest_trade_count < 100:
                    formatted_trade_count = f"{int(latest_trade_count)}"
                elif 100 <= latest_trade_count < 1000:
                    formatted_trade_count = f"{int(latest_trade_count / 100)}百"
                elif 1000 <= latest_trade_count < 10000:
                    formatted_trade_count = f"{int(latest_trade_count / 1000)}千"
                else:
                    formatted_trade_count = f"{int(latest_trade_count / 10000)}万"

                profit_count = stats["profit_count"]
                trade_part = f"交{formatted_trade_count}胜{profit_count}" if profit_count > 0 else f"交{formatted_trade_count}"
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
            tag_parts = [part for part in [earning_part, trade_part, buy_part, holding_part] if part]
            tag = "".join(tag_parts)  # 取消逗号，使用直接拼接

            # 添加SOL余额信息
            if pd.notna(latest_balance) and latest_balance > 0:
                balance_str = f"余{int(latest_balance)}"
                tag = f"{tag}{balance_str}" if tag else balance_str

            if len(tag) > self.config["TAG_MAX_LENGTH"]:
                tag = f"{earning_part}{trade_part}"[:self.config["TAG_MAX_LENGTH"]]

            # 统计结果（增加地址出现次数和SOL余额）
            occurrence_count = stats["occurrence_count"]
            stats_str = (f"利润:{format_number(profit)},倍数:{format_number(stats['max_multiple'])}x,"
                        f"前10:{format_number(stats['top_10_count'])},"
                        f"交:{format_number(latest_trade_count)}/{format_number(stats['profit_count'])},"
                        f"买:{format_number(buy_time)}m,持:{format_number(holding)}m,"
                        f"出现次数:{format_number(occurrence_count)},"
                        f"SOL余额:{format_number(latest_balance)}")

        return tag, stats_str

    def process(self) -> None:
        """主处理流程"""
        self.load_data(self.config["INPUT_FILE"])
        self.calculate_stats()

        # 获取所有地址的统计结果
        stats_df = []
        for addr in self.address_stats.keys():
            tag, stats = self.generate_tag(addr)
            stats_data = self.address_stats[addr]
            stats_df.append({
                self.config["COLUMNS"]["ADDRESS"]: addr,
                "用户标签": tag,
                "统计结果": stats,
                "occurrence_count": stats_data["occurrence_count"],  # 盈利次数（地址出现次数）
                "total_profit": stats_data["total_profit"],  # 盈利金额
                "max_multiple": stats_data["max_multiple"],  # 盈利倍数
                "top_10_count": stats_data["top_10_count"],  # 利润排名在前10的次数
                "buy_count_within_10m": stats_data["buy_count_within_10m"]  # 前10分钟内的买入次数
            })

        # 转换为 DataFrame
        result_df = pd.DataFrame(stats_df)

        # 按排序规则排序（用户自定义排序字段和顺序）
        result_df = result_df.sort_values(by=SORT_FIELDS, ascending=SORT_ASCENDING)

        # 只保留需要的列：地址、用户标签、统计结果
        result_df = result_df[[self.config["COLUMNS"]["ADDRESS"], "用户标签", "统计结果"]]

        # 重命名列为中文
        result_df.columns = ["地址", "用户标签", "统计结果"]

        # 生成排序依据描述（使用中文字段名）
        sort_description = ", ".join([
            f"{CHINESE_FIELD_MAPPING[field]}（{'倒序' if not asc else '顺序'}）"
            for field, asc in zip(SORT_FIELDS, SORT_ASCENDING)
        ])

        # 添加排序依据字段
        result_df["排序依据"] = sort_description

        # 保存到 Excel 文件
        result_df.to_excel(self.config["OUTPUT_FILE"], index=False)

        # 尝试使用 openpyxl 设置红色的感叹号和错误标签
        try:
            from openpyxl import load_workbook
            from openpyxl.styles import Font, Color

            # 加载工作簿
            wb = load_workbook(self.config["OUTPUT_FILE"])
            ws = wb.active

            # 找到 "用户标签" 和 "统计结果" 列
            tag_col = result_df.columns.get_loc("用户标签") + 1  # Excel 列索引从 1 开始
            stats_col = result_df.columns.get_loc("统计结果") + 1  # Excel 列索引从 1 开始

            # 遍历每一行，检查用户标签和统计结果是否包含错误信息
            for row in ws.rows:
                tag_cell = row[tag_col - 1]  # 用户标签列的单元格
                stats_cell = row[stats_col - 1]  # 统计结果列的单元格

                # 检查用户标签是否为错误信息
                if tag_cell.value and "错误：" in str(tag_cell.value):
                    tag_cell.font = Font(color="FF0000")  # 设置红色字体

                # 检查统计结果是否包含 "盈利金额错误!"
                if stats_cell.value and "盈利金额错误!" in str(stats_cell.value):
                    stats_cell.font = Font(color="FF0000")  # 设置红色字体

            # 保存修改后的文件
            wb.save(self.config["OUTPUT_FILE"])
            print(f"已为错误标签和统计结果添加红色感叹号！")

        except ImportError:
            print("警告：无法安装 openpyxl，无法设置红色感叹号。确保已安装 openpyxl 库。")
        except Exception as e:
            print(f"警告：设置红色感叹号或错误标签时出错: {str(e)}")

        print(f"处理完成，结果已保存至 {self.config['OUTPUT_FILE']}")


def main():
    """主函数"""
    tagger = SmartMoneyTagger(CONFIG)
    tagger.process()


if __name__ == "__main__":
    main()