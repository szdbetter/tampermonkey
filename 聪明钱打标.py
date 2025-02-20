import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
import os
from datetime import datetime

# 配置变量统一管理（根据实际列名调整为小写）
CONFIG = {
    "INPUT_FILE": "聪明钱数据_2025_2_20_12_18_20.xlsx",
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
        "BUY_TIME": "买入时间",  # 用于检查买入时间
        "SELL_TIME": "卖出时间",  # 用于检查卖出时间
        "HOLDING_TIME": "持有时长(分钟)",
        "BUY_AMOUNT": "买入金额",
        "SELL_AMOUNT": "卖出金额",
        "BUY_COUNT": "买入次数",
        "SELL_COUNT": "卖出次数",
        "REALIZED_PROFIT": "实现利润",
        "UNREALIZED_PROFIT": "未实现利润",
        "PROFIT_RANK": "利润排名"
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

        # 转换买入时间和卖出时间为 datetime，处理 N/A 和 1970/1/1
        buy_time_col = self.config["COLUMNS"]["BUY_TIME"].lower()
        sell_time_col = self.config["COLUMNS"]["SELL_TIME"].lower()
        self.df[buy_time_col] = pd.to_datetime(self.df[buy_time_col], errors="coerce")
        self.df[sell_time_col] = pd.to_datetime(self.df[sell_time_col], errors="coerce")
        print(f"买入时间列数据类型: {self.df[buy_time_col].dtype}")
        print(f"买入时间前5个样本: {self.df[buy_time_col].head().tolist()}")
        print(f"卖出时间列数据类型: {self.df[sell_time_col].dtype}")
        print(f"卖出时间前5个样本: {self.df[sell_time_col].head().tolist()}")

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

            # 总利润（统计所有行的利润总和）
            realized_profit = addr_df[self.config["COLUMNS"]["REALIZED_PROFIT"].lower()].dropna()
            unrealized_profit = addr_df[self.config["COLUMNS"]["UNREALIZED_PROFIT"].lower()].dropna()
            total_profit = (realized_profit + unrealized_profit).sum()
            total_profit = total_profit if not pd.isna(total_profit) else 0
            print(
                f"地址 {addr} 总利润计算: 实现利润总和 = {realized_profit.sum()}, 未实现利润总和 = {unrealized_profit.sum()}, 总利润 = {total_profit}")

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

            # 前10排名次数
            top_10_count = len(addr_df[addr_df[self.config["COLUMNS"]["PROFIT_RANK"].lower()] <= 10])

            # 交易次数和盈利次数
            trade_count = (addr_df[self.config["COLUMNS"]["BUY_COUNT"].lower()] +
                           addr_df[self.config["COLUMNS"]["SELL_COUNT"].lower()]).sum()
            trade_count = int(trade_count) if not pd.isna(trade_count) else 0
            profit_count = len(addr_df[addr_df[self.config["COLUMNS"]["REALIZED_PROFIT"].lower()] +
                                       addr_df[self.config["COLUMNS"]["UNREALIZED_PROFIT"].lower()] >= self.config[
                                           "PROFIT_THRESHOLD"]])

            # 平均买入时间（仅统计 < 600 秒的 pump到买入(秒) 平均值）
            pump_to_buy_col = self.config["COLUMNS"]["PUMP_TO_BUY"].lower()
            pump_to_buy = addr_df[pump_to_buy_col].dropna()  # 仅使用非 NaN 值
            fast_buys = pump_to_buy[pump_to_buy <= self.config["PUMP_BUY_THRESHOLD"]]  # 只取 < 600 秒的数据
            print(f"地址 {addr} pump到买入(秒) 有效值 (< 600 秒): {fast_buys.tolist()}")
            avg_buy_time = int(fast_buys.mean() / 60) if not fast_buys.empty else 0  # 单位：分钟

            # 只有当平均买入时间 <= 10 分钟时才显示
            buy_part = ""
            if avg_buy_time > 0 and avg_buy_time <= 10:  # 仅当 <= 10 分钟时显示
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

            # 地址出现次数
            occurrence_count = len(addr_df)
            print(f"地址 {addr} 出现次数: {occurrence_count}")

            # 临时存储统计数据
            temp_stats[addr] = {
                "total_profit": total_profit,
                "max_multiple": max_multiple,
                "top_10_count": top_10_count,
                "trade_count": trade_count,
                "profit_count": profit_count,
                "avg_buy_time": avg_buy_time if avg_buy_time <= 10 else 0,  # 仅存储 <= 10 分钟的平均时间
                "avg_holding": avg_holding,
                "occurrence_count": occurrence_count  # 存储出现次数
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
                "trade_count": 0,
                "profit_count": 0,
                "avg_buy_time": 0,
                "avg_holding": np.nan,
                "occurrence_count": 0
            }

        stats = self.address_stats[addr]

        # 赚钱能力（统计所有行的利润总和）
        profit = stats["total_profit"]
        if profit >= 1000000:
            profit_str = f"赚{int(profit / 1000000)}M"
        elif profit >= 10000:
            profit_str = f"赚{int(profit / 10000)}万"
        else:
            profit_str = f"赚{int(profit / 1000)}K"

        # 倍数（仅显示 >= 10x 的倍数）
        multiple_str = f"{stats['max_multiple']}x" if stats["max_multiple"] >= 10 else ""
        top_10_str = f"前10({stats['top_10_count']})" if stats["top_10_count"] > 0 else ""
        earning_part = f"{profit_str}{multiple_str}{top_10_str}"

        # 交易次数和盈利次数（改为“交”）
        trade_part = f"交{stats['trade_count']}/{stats['profit_count']}"

        # 买入时间（只显示 < 600 秒且平均 <= 10 分钟的平均值，单位分钟）
        buy_time = stats["avg_buy_time"]
        buy_part = f"买{buy_time}m" if buy_time > 0 else ""

        # 持有时长（如果无有效卖出时间，不显示）
        holding = stats["avg_holding"]
        holding_part = ""
        if not pd.isna(holding):
            if holding < self.config["HOLDING_SHORT_THRESHOLD"]:
                holding_part = f"持{int(holding)}m"
            elif holding < self.config["HOLDING_DAY_THRESHOLD"]:
                holding_part = f"持{int(holding / 60)}h"
            else:
                holding_part = f"持{int(holding / 1440)}d"

        # 组合标签，优先保留关键信息并控制长度，去除“:”
        tag_parts = [earning_part, trade_part]
        if buy_part:  # 只有当平均买入时间 <= 10 分钟时才添加
            tag_parts.append(buy_part)
        if holding_part:  # 只有在有有效持有时长时才添加
            tag_parts.append(holding_part)
        tag = ",".join(part for part in tag_parts if part)
        if len(tag) > self.config["TAG_MAX_LENGTH"]:
            tag = f"{earning_part},{trade_part}"[:self.config["TAG_MAX_LENGTH"]]

        # 统计结果（增加地址出现次数）
        occurrence_count = stats["occurrence_count"]
        stats_str = (f"利润:{profit:.0f},倍数:{stats['max_multiple']}x,前10:{stats['top_10_count']},"
                     f"交:{stats['trade_count']}/{stats['profit_count']},买:{buy_time}m,持:{holding:.0f}m,"
                     f"出现次数:{occurrence_count}")

        return tag, stats_str

    def process(self) -> None:
        """主处理流程"""
        self.load_data(self.config["INPUT_FILE"])
        self.calculate_stats()

        tags = []
        stats_list = []
        for addr in self.df[self.config["COLUMNS"]["ADDRESS"].lower()].unique():  # 使用 unique() 避免重复
            tag, stats = self.generate_tag(addr)
            tags.append(tag)
            stats_list.append(stats)

        # 创建一个新的 DataFrame 映射地址到标签和统计结果
        address_mapping = pd.DataFrame({
            self.config["COLUMNS"]["ADDRESS"].lower(): self.df[self.config["COLUMNS"]["ADDRESS"].lower()].unique(),
            "用户标签": tags,
            "统计结果": stats_list
        })

        # 合并到原始 DataFrame，确保每行显示相同地址的最终统计结果
        self.df = self.df.merge(address_mapping, on=self.config["COLUMNS"]["ADDRESS"].lower(), how="left")

        self.df.to_excel(self.config["OUTPUT_FILE"], index=False)
        print(f"处理完成，结果已保存至 {self.config['OUTPUT_FILE']}")


def main():
    """主函数"""
    tagger = SmartMoneyTagger(CONFIG)
    tagger.process()


if __name__ == "__main__":
    main()