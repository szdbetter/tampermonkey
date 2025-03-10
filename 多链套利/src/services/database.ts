// 数据库连接
let db: IDBDatabase | null = null;

// 初始化数据库
export async function initDatabase(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise<IDBDatabase>((resolve, reject) => {
    console.log("Initializing database...");
    
    // 先删除旧数据库以重新创建（开发时调试用）
    // const deleteRequest = indexedDB.deleteDatabase("MultiChainArbitrageDB");
    // deleteRequest.onsuccess = () => console.log("Old database deleted successfully");
    // deleteRequest.onerror = () => console.error("Could not delete old database");
    
    const request = indexedDB.open("MultiChainArbitrageDB", 2);
    
    request.onupgradeneeded = (event) => {
      console.log("Database upgrade needed, creating object stores...");
      const database = request.result;
      
      // 创建对象存储
      if (!database.objectStoreNames.contains("ChainConfig")) {
        database.createObjectStore("ChainConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created ChainConfig store");
      }
      
      if (!database.objectStoreNames.contains("TokenConfig")) {
        database.createObjectStore("TokenConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created TokenConfig store");
      }
      
      if (!database.objectStoreNames.contains("TradingPairConfig")) {
        database.createObjectStore("TradingPairConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created TradingPairConfig store");
      }
      
      // 新增的对象存储
      if (!database.objectStoreNames.contains("ExchangeConfig")) {
        database.createObjectStore("ExchangeConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created ExchangeConfig store");
      }
      
      if (!database.objectStoreNames.contains("ApiConfig")) {
        database.createObjectStore("ApiConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created ApiConfig store");
      }
      
      if (!database.objectStoreNames.contains("AlertConfig")) {
        database.createObjectStore("AlertConfig", { keyPath: "NO", autoIncrement: true });
        console.log("Created AlertConfig store");
      }
    };
    
    request.onsuccess = () => {
      console.log("Database initialized successfully");
      db = request.result;
      
      // 确保数据库连接正确建立
      if (db) {
        console.log("Database connection established");
        console.log("Available object stores:", Array.from(db.objectStoreNames));
      } else {
        console.error("Database connection failed");
      }
      
      resolve(db);
    };
    
    request.onerror = () => {
      console.error("Database initialization error:", request.error);
      reject(request.error);
    };
  });
}

// 通用数据访问类
export class DataAccess<T> {
  private storeName: string;
  
  constructor(storeName: string) {
    this.storeName = storeName;
  }
  
  // 获取所有记录
  async getAll(): Promise<T[]> {
    const database = await initDatabase();
    return new Promise<T[]>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  // 获取单条记录
  async getByNo(no: number): Promise<T | null> {
    const database = await initDatabase();
    return new Promise<T | null>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(no);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  // 创建记录
  async create(item: Omit<T, 'NO'>): Promise<number> {
    const database = await initDatabase();
    return new Promise<number>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      // 添加创建时间
      const itemWithTime = {
        ...item,
        create_time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      };
      
      const request = store.add(itemWithTime);
      
      request.onsuccess = () => {
        resolve(request.result as number);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  // 更新记录
  async update(no: number, item: Partial<T>): Promise<void> {
    const database = await initDatabase();
    const existingItem = await this.getByNo(no);
    
    if (!existingItem) {
      throw new Error(`记录不存在: ${no}`);
    }
    
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      const updatedItem = {
        ...existingItem,
        ...item,
        NO: no // 确保NO不变
      };
      
      const request = store.put(updatedItem);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  // 删除记录
  async delete(no: number): Promise<void> {
    const database = await initDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(no);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// 创建数据模型接口
export interface ChainConfigModel {
  NO?: number;
  name: string;
  chainId: number;
  rpcUrls: string[];
  active: boolean;
  create_time?: string;
  testResults?: {
    status: 'success' | 'warning' | 'error';
    message: string;
    url: string;
  }[]; // 这个字段不存储在数据库中，仅用于UI显示
}

export interface TokenConfigModel {
  NO?: number;
  name: string;        // Token名称/符号
  active: boolean;     // 是否激活
  addressList: {       // 各链上的地址信息
    chainId: string;   // 链ID，对应ChainConfig中的chainId字段
    address: string;   // 合约地址
  }[];
  decimals: number;    // Token的小数位数
  logoUrl?: string;    // Token的logo URL
  create_time?: string; // 创建时间（北京时间格式）
}

export interface TradingPairConfigModel {
  NO?: number;
  name: string;
  active: boolean;
  pairList: {
    chain: string;
    token1Id: string;
    token2Id: string;
    token1?: string;
    token2?: string;
    active: boolean;
  }[];
  create_time?: string;
}

// 交易所配置接口
export interface ExchangeConfigModel {
  NO?: number;
  name: string;               // 交易所名称
  baseUrl: string;            // 交易所API基础URL
  logo?: string;              // 交易所logo URL
  supportedChains: number[];  // 支持的链ID列表
  active: boolean;            // 是否激活
  create_time?: string;       // 创建时间
}

// API配置接口
export interface ApiConfigModel {
  NO?: number;
  name: string;               // API名称
  baseUrl: string;            // API基础URL
  method: 'GET' | 'POST';     // 请求方法
  payload?: string;           // POST请求的负载数据
  apiKey?: string;            // API密钥
  apiSecret?: string;         // API密钥对应的secret
  exchangeId?: number;        // 关联的交易所ID，如果适用
  active: boolean;            // 是否激活
  fieldMappings?: {           // 字段映射配置（可选）
    customName: string;       // 自定义字段名
    displayName: string;      // 显示名称
    jsonPath: string;         // JSON路径，用于从API响应中提取数据
  }[];
  customVariables?: {         // 自定义变量值（可选）
    [key: string]: string;    // 变量名: 变量值
  };
  create_time?: string;       // 创建时间
}

// 告警配置接口
export interface AlertConfigModel {
  NO?: number;
  name: string;               // 告警名称
  type: 'email' | 'telegram' | 'webhook'; // 告警类型
  config: {                   // 告警配置
    recipients?: string[];    // 接收者列表，适用于email
    apiKeys?: string[];       // API密钥列表，适用于email，可轮流切换
    apiKey?: string;          // API密钥，适用于telegram
    url?: string;             // Webhook URL，适用于webhook
    [key: string]: any;       // 其他配置字段
  };
  conditions?: {              // 触发条件（改为可选）
    field: string;            // 监控字段
    operator: '>' | '<' | '==' | '!=' | '>=' | '<='; // 操作符
    value: number | string;   // 阈值
    unit?: string;            // 单位，例如"percent"、"usdt"等
  }[];
  active: boolean;            // 是否激活
  create_time?: string;       // 创建时间
}

// 导出各表的数据访问实例
export const chainConfigAccess = new DataAccess<ChainConfigModel>("ChainConfig");
export const tokenConfigAccess = new DataAccess<TokenConfigModel>("TokenConfig");
export const tradingPairConfigAccess = new DataAccess<TradingPairConfigModel>("TradingPairConfig");
export const exchangeConfigAccess = new DataAccess<ExchangeConfigModel>("ExchangeConfig");
export const apiConfigAccess = new DataAccess<ApiConfigModel>("ApiConfig");
export const alertConfigAccess = new DataAccess<AlertConfigModel>("AlertConfig");

// 添加初始化示例数据的函数
export async function initSampleData() {
  console.log("正在检查是否需要初始化示例数据...");
  
  // 检查交易所配置表是否为空
  const exchanges = await exchangeConfigAccess.getAll();
  if (exchanges.length === 0) {
    console.log("交易所配置表为空，创建预设交易所数据");
    
    // 预设交易所数据
    const presetExchanges = [
      {
        name: "Binance",
        baseUrl: "https://api.binance.com",
        logo: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png",
        supportedChains: [1, 56],
        active: true
      },
      {
        name: "OKX",
        baseUrl: "https://www.okx.com/api",
        logo: "https://cryptologos.cc/logos/okb-okb-logo.png",
        supportedChains: [1, 56, 66],
        active: true
      }
    ];
    
    // 创建预设交易所
    for (const exchange of presetExchanges) {
      try {
        await exchangeConfigAccess.create(exchange);
        console.log(`创建预设交易所成功: ${exchange.name}`);
      } catch (error) {
        console.error(`创建预设交易所失败: ${exchange.name}`, error);
      }
    }
  }
  
  // 检查API配置表是否为空
  const apis = await apiConfigAccess.getAll();
  if (apis.length === 0) {
    console.log("API配置表为空，创建预设API数据");
    
    // 预设API数据
    const presetApis = [
      {
        name: "Binance 价格API",
        baseUrl: "https://api.binance.com/api/v3/ticker/price",
        method: "GET" as "GET",
        apiKey: "",
        active: true,
        fieldMappings: [
          { customName: "symbol", displayName: "交易对", jsonPath: "symbol" },
          { customName: "price", displayName: "价格", jsonPath: "price" }
        ]
      },
      {
        name: "Ethereum Gas API",
        baseUrl: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
        method: "GET" as "GET",
        apiKey: "",
        active: true,
        fieldMappings: [
          { customName: "fastGas", displayName: "快速Gas价格", jsonPath: "result.FastGasPrice" },
          { customName: "standardGas", displayName: "标准Gas价格", jsonPath: "result.ProposeGasPrice" },
          { customName: "slowGas", displayName: "慢速Gas价格", jsonPath: "result.SafeGasPrice" }
        ]
      }
    ];
    
    // 创建预设API
    for (const api of presetApis) {
      try {
        await apiConfigAccess.create(api);
        console.log(`创建预设API成功: ${api.name}`);
      } catch (error) {
        console.error(`创建预设API失败: ${api.name}`, error);
      }
    }
  }
  
  console.log("示例数据初始化完成");
} 