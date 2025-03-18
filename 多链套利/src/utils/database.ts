// 数据采集配置模型
export interface DataCollectionConfigModel {
  NO?: number;
  name: string;
  type: 'contract' | 'api' | 'websocket';
  config: {
    // 智能合约配置
    chainId?: string;
    contractAddress?: string;
    methodName?: string;
    abi?: string;
    contractParams?: any[];
    
    // API配置
    baseUrl?: string;
    endpoint?: string;
    apiParams?: Record<string, any>;
    headers?: Record<string, string>;
    
    // WebSocket配置
    url?: string;
    message?: any;
  };
  active: boolean;
  create_time?: number;
}

export class Database {
  private db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  // 通用获取方法
  async get(storeName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 通用设置方法
  async set(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // 不再清空存储区域，而是直接保存数据
      if (Array.isArray(data)) {
        // 如果是数组，先清空存储区域，然后逐个添加
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          // 使用事务完成计数器来确保所有添加操作完成
          let completed = 0;
          const total = data.length;
          
          if (total === 0) {
            // 如果数组为空，直接完成
            resolve();
            return;
          }
          
          // 逐个添加数据
          data.forEach((item) => {
            const addRequest = store.add(item);
            
            addRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            
            addRequest.onerror = (event) => {
              console.error('添加数据失败:', event);
              reject(addRequest.error);
            };
          });
        };
        
        clearRequest.onerror = () => {
          console.error('清空存储区域失败:', clearRequest.error);
          reject(clearRequest.error);
        };
      } else {
        // 如果不是数组，直接添加单个数据
        const addRequest = store.add(data);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      }
    });
  }

  // 获取所有数据采集配置
  async getAllDataCollectionConfigs(): Promise<DataCollectionConfigModel[]> {
    return await this.get('data_collection_configs') || [];
  }

  // 获取单个数据采集配置
  async getDataCollectionConfig(NO: number): Promise<DataCollectionConfigModel | null> {
    const configs = await this.getAllDataCollectionConfigs();
    return configs.find(config => config.NO === NO) || null;
  }

  // 添加数据采集配置
  async addDataCollectionConfig(config: DataCollectionConfigModel): Promise<void> {
    const configs = await this.getAllDataCollectionConfigs();
    const newConfig = {
      ...config,
      NO: Math.max(0, ...configs.map(c => c.NO || 0)) + 1,
      create_time: Date.now()
    };
    await this.set('data_collection_configs', [...configs, newConfig]);
  }

  // 更新数据采集配置
  async updateDataCollectionConfig(config: DataCollectionConfigModel): Promise<void> {
    if (!config.NO) throw new Error('配置NO不能为空');
    const configs = await this.getAllDataCollectionConfigs();
    const index = configs.findIndex(c => c.NO === config.NO);
    if (index === -1) throw new Error('配置不存在');
    configs[index] = config;
    await this.set('data_collection_configs', configs);
  }

  // 删除数据采集配置
  async deleteDataCollectionConfig(NO: number): Promise<void> {
    const configs = await this.getAllDataCollectionConfigs();
    await this.set('data_collection_configs', configs.filter(c => c.NO !== NO));
  }
} 