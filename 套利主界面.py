# -*- coding: utf-8 -*-
import sys
import json
import requests
from datetime import datetime
from PySide6.QtWidgets import (QApplication, QMainWindow, QListWidget, QListWidgetItem,
                               QTextEdit)
from PySide6.QtCore import Qt, QSize, QCoreApplication
from PySide6.QtUiTools import QUiLoader
from PySide6.QtGui import QColor, QTextCharFormat, QBrush

# 常量配置
API_URL = "https://api-ffpscan.permaswap.network/tokenList"
PRICE_DECIMAL = 2
FONT_SIZE = 14
WINDOW_TITLE = "AO Price Monitor"
BTN_WIDTH = 120
BTN_HEIGHT = 40
LABEL_WIDTH = 200
LABEL_HEIGHT = 40

# 样式配置
STYLE = """
QMainWindow {
    background-color: #f0f0f0;
}

QPushButton {
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #1976D2;
}

QPushButton:pressed {
    background-color: #0D47A1;
}

QLabel {
    background-color: white;
    border: 2px solid #E0E0E0;
    border-radius: 4px;
    padding: 8px;
    font-size: 16px;
    font-weight: bold;
    color: #333;
}

QTextEdit {
    background-color: white;
    border: 2px solid #E0E0E0;
    border-radius: 4px;
    padding: 8px;
    font-family: "Consolas", "Monaco", monospace;
    font-size: 13px;
    line-height: 1.4;
}

QTextEdit:focus {
    border-color: #2196F3;
}
"""

# 日志颜色配置
LOG_COLORS = {
    'error': '#f44336',  # Material Red
    'success': '#4CAF50',  # Material Green
    'info': '#2196F3'  # Material Blue
}


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        # 设置 Qt WebEngine 属性
        QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)

        # 加载UI文件
        loader = QUiLoader()
        self.ui = loader.load('main.ui')

        # 获取UI设计时的窗口大小
        ui_size = self.ui.size()

        # 设置窗口属性
        self.resize(ui_size)  # 使用UI文件中的尺寸
        self.setCentralWidget(self.ui)
        self.setWindowTitle(WINDOW_TITLE)

        # 应用自定义样式
        self.setStyleSheet(STYLE)

        self.init_ui()
        self.setup_connections()

    def init_ui(self):
        """初始化UI界面"""
        # 获取UI中控件的实际位置和大小
        log_geometry = self.ui.listViewLog.geometry()

        # 设置按钮
        self.ui.btnGetPrice.setFixedSize(BTN_WIDTH, BTN_HEIGHT)
        self.ui.btnGetPrice.setCursor(Qt.PointingHandCursor)

        # 设置价格标签
        self.ui.labelAO.setFixedSize(LABEL_WIDTH, LABEL_HEIGHT)
        self.ui.labelAO.setAlignment(Qt.AlignCenter)

        # 设置日志显示区域，使用UI中的实际位置和大小
        self.log_text = QTextEdit(self)
        self.log_text.setGeometry(log_geometry)
        self.ui.listViewLog.setParent(None)
        self.log_text.setReadOnly(True)

        # 设置字体
        self.setup_fonts()

    def setup_fonts(self):
        """设置字体"""
        if sys.platform == 'darwin':  # macOS
            font_family = "SF Pro Display"
        elif sys.platform == 'win32':  # Windows
            font_family = "Segoe UI"
        else:  # Linux
            font_family = "Ubuntu"

        self.ui.btnGetPrice.setStyleSheet(f"""
            QPushButton {{
                font-family: "{font_family}";
                font-weight: 600;
            }}
        """)

        self.ui.labelAO.setStyleSheet(f"""
            QLabel {{
                font-family: "{font_family}";
                font-weight: 600;
            }}
        """)

    def setup_connections(self):
        """设置信号连接"""
        self.ui.btnGetPrice.clicked.connect(self.get_ao_price)

    def add_log(self, message, level='info'):
        """添加彩色日志记录"""
        try:
            time_str = datetime.now().strftime("%H:%M:%S")
            log_text = f"[{time_str}] {message}\n"

            # 设置文本颜色和格式
            format = QTextCharFormat()
            format.setForeground(QBrush(QColor(LOG_COLORS.get(level, LOG_COLORS['info']))))

            # 添加日志
            cursor = self.log_text.textCursor()
            cursor.movePosition(cursor.MoveOperation.Start)
            cursor.insertText(log_text)

            # 滚动到顶部
            self.log_text.verticalScrollBar().setValue(0)
        except Exception as e:
            print(f"添加日志时出错: {str(e)}")

    def get_ao_price(self):
        """获取AO价格"""
        try:
            self.add_log("开始获取AO价格...", 'info')

            # 发送API请求
            self.add_log("正在请求API数据...", 'info')
            response = requests.get(API_URL)
            response.raise_for_status()

            # 解析JSON数据
            self.add_log("正在解析返回数据...", 'info')
            data = response.json()

            # 调试信息：打印返回的数据结构
            self.add_log(f"API返回数据数量: {len(data)}", 'info')
            self.add_log(f"数据结构示例: {json.dumps(data[0], indent=2, ensure_ascii=False)}", 'info')

            # 查找AO代币数据
            ao_data = None
            for item in data:
                if item.get("symbol") == "AO":
                    ao_data = item
                    break

            # 打印查找结果
            if ao_data:
                self.add_log(f"找到AO数据: {json.dumps(ao_data, indent=2, ensure_ascii=False)}", 'info')
            else:
                self.add_log("未找到AO数据，所有symbol值:", 'error')
                symbols = [item.get("symbol") for item in data]
                self.add_log(f"可用的symbol列表: {symbols}", 'error')

            if ao_data and "price" in ao_data:
                # 获取价格并格式化
                price = float(ao_data["price"])
                formatted_price = f"AO价格: ${price:.2f}"

                # 更新UI显示
                self.ui.labelAO.setText(formatted_price)
                self.add_log(f"成功获取AO价格: ${price:.2f}", 'success')
            else:
                error_msg = f"错误: 未找到AO价格数据"
                self.add_log(error_msg, 'error')
                self.ui.labelAO.setText("AO价格: 暂无数据")

        except requests.exceptions.RequestException as e:
            self.add_log(f"网络请求错误: {str(e)}", 'error')
            self.ui.labelAO.setText("AO价格: 获取失败")
        except json.JSONDecodeError as e:
            self.add_log(f"JSON解析错误: {str(e)}", 'error')
            self.ui.labelAO.setText("AO价格: 数据错误")
        except Exception as e:
            self.add_log(f"未知错误: {str(e)}", 'error')
            self.ui.labelAO.setText("AO价格: 系统错误")


def main():
    # 创建应用前设置属性
    QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)

    app = QApplication(sys.argv)
    app.setStyle('Fusion')

    window = MainWindow()
    # 设置窗口居中显示
    screen = app.primaryScreen().geometry()
    x = (screen.width() - window.width()) // 2
    y = (screen.height() - window.height()) // 2
    window.move(x, y)

    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()