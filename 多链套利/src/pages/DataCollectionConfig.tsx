import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Database, DataCollectionConfigModel } from '../utils/database';
import { apiConfigAccess, ApiConfigModel, chainConfigAccess, ChainConfigModel } from '../services/database';
import { sendRequest, isTamperMonkeyEnvironment } from '../utils/tampermonkey';
import { ethers } from 'ethers'; // 导入ethers.js库

// 样式组件
const PageContainer = styled.div`
  margin-bottom: 30px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: white;
  font-size: 24px;
`;

const ActionButton = styled.button`
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  height: calc(100vh - 200px);
`;

const NodeList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const NodeListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NodeItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const NodeName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const ApiName = styled.div`
  font-size: 12px;
  color: #AAAAAA;
  margin-top: 4px;
`;

const StatusIndicator = styled.div<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  min-width: 60px;
  text-align: center;
  white-space: nowrap;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.active ? '#00AA00' : '#AA0000'};
    margin-right: 6px;
  }
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  height: 100%;
  overflow: auto;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #F0B90B;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #444444;
  padding-bottom: 8px;
`;

const FormRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  gap: 15px;
`;

const FormGroup = styled.div<{ flex?: number; minWidth?: string }>`
  flex: ${props => props.flex || 1};
  min-width: ${props => props.minWidth || 'auto'};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #FFFFFF;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled.select`
  width: 70%;
  padding: 8px 12px;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    border-color: #F0B90B;
    outline: none;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: #F0B90B;
  color: #000000;
  
  &:hover:not(:disabled) {
    background-color: #d6a50a;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: #444444;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #555555;
  }
`;

const DangerButton = styled(Button)`
  background-color: #AA0000;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #CC0000;
  }
`;

const FieldMappingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #444444;
  color: #AAAAAA;
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid #444444;
`;

const TestResultPanel = styled.div`
  margin-top: 20px;
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
`;

const TestResultTitle = styled.h3`
  color: #F0B90B;
  margin-top: 0;
  margin-bottom: 10px;
`;

const TestResultContent = styled.pre`
  color: #FFFFFF;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  background-color: #222222;
  padding: 10px;
  border-radius: 4px;
`;

// 新增 API 响应结果面板
const ApiResponsePanel = styled.div`
  margin-top: 20px;
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
`;

const ApiResponseTitle = styled.h3`
  color: #F0B90B;
  margin-top: 0;
  margin-bottom: 10px;
`;

const ApiResponseContent = styled.pre`
  color: #FFFFFF;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  background-color: #222222;
  padding: 10px;
  border-radius: 4px;
`;

// 添加一个新的样式组件用于日志显示
const LogEntry = styled.div<{ type: 'error' | 'warning' | 'info' }>`
  padding: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid #444444;
  font-family: monospace;
  white-space: pre-wrap;
  color: ${props => props.type === 'error' ? '#FF6666' : 
                    props.type === 'warning' ? '#FFAA00' : 
                    '#FFFFFF'};
  background-color: ${props => props.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 
                              props.type === 'warning' ? 'rgba(255, 170, 0, 0.1)' : 
                              'transparent'};
`;

// 添加消息提示组件
const MessageBox = styled.div<{ type: 'success' | 'error' | 'info' }>`
  margin-top: 15px;
  padding: 10px 15px;
  border-radius: 4px;
  background-color: ${props => 
    props.type === 'success' ? 'rgba(0, 255, 0, 0.1)' : 
    props.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 
    'rgba(0, 0, 255, 0.1)'
  };
  color: ${props => 
    props.type === 'success' ? '#00FF00' : 
    props.type === 'error' ? '#FF6666' : 
    '#66CCFF'
  };
  border-left: 4px solid ${props => 
    props.type === 'success' ? '#00AA00' : 
    props.type === 'error' ? '#AA0000' : 
    '#0088CC'
  };
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  margin-left: 10px;
`;

// 添加可折叠面板组件
const CollapsiblePanel = styled.div`
  margin-bottom: 20px;
  border: 1px solid #444444;
  border-radius: 5px;
  overflow: hidden;
`;

const PanelHeader = styled.div<{ isOpen: boolean }>`
  background-color: ${props => props.isOpen ? '#3A3A3A' : '#333333'};
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background-color: #3A3A3A;
  }
`;

const PanelTitle = styled.h3<{ isOpen: boolean }>`
  margin: 0;
  color: #F0B90B;
  font-size: 16px;
  display: flex;
  align-items: center;
  
  &::before {
    content: '';
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #F0B90B;
    margin-right: 8px;
    transform: rotate(${props => props.isOpen ? '0deg' : '-90deg'});
    transition: transform 0.2s;
  }
`;

const PanelContent = styled.div<{ isOpen: boolean }>`
  padding: ${props => props.isOpen ? '15px' : '0'};
  max-height: ${props => props.isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s, padding 0.3s;
`;

// 添加变量输入组件
const VariableInputTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

// 数据采集节点模型
interface DataCollectionNodeModel {
  id?: number;
  name: string;
  active: boolean;
  apiId: number;
  apiName?: string;
  apiType?: 'HTTP' | 'CHAIN';
  fieldMappings: FieldMapping[];
}

// 字段映射模型
interface FieldMapping {
  id?: number;
  sourceField: string;  // JSON路径
  targetField: string;  // 自定义字段名
  description: string;  // 显示名称
}

// 测试结果模型
interface TestResult {
  success: boolean;
  message: string;
  logs: string[];
  data?: any;
}

// 新增 API 响应数据模型
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  logs?: string[];
  extractedFields?: Record<string, any>;
}

// 修改为使用自定义属性存储
interface CustomConfig {
  apiId: number;
  fieldMappings: FieldMapping[];
}

// 添加一个专门处理COW.fi API的函数
const processCowApiPayload = (payload: string, variables: Record<string, string>, logs: string[] = []): string => {
  try {
    // 解析JSON
    const jsonObj = JSON.parse(payload);
    
    // 处理sellToken变量
    if ('sellToken' in jsonObj && typeof jsonObj.sellToken === 'string' && jsonObj.sellToken.includes('(sellToken)')) {
      // 直接替换为变量值，不添加引号
      const sellTokenValue = variables['sellToken'] || '';
      logs.push(`[${new Date().toISOString()}] 直接替换sellToken: (sellToken) -> ${sellTokenValue}`);
      jsonObj.sellToken = sellTokenValue;
    }
    
    // 处理其他可能的变量
    Object.keys(jsonObj).forEach((key: string) => {
      if (typeof jsonObj[key] === 'string' && jsonObj[key].includes('(')) {
        // 查找所有变量占位符
        const matches = jsonObj[key].match(/\(([^()]+)\)/g);
        if (matches) {
          let value = jsonObj[key];
          matches.forEach((match: string) => {
            const varName = match.substring(1, match.length - 1);
            if (variables[varName]) {
              value = value.replace(match, variables[varName]);
              logs.push(`[${new Date().toISOString()}] 替换${key}中的变量: ${match} -> ${variables[varName]}`);
            }
          });
          jsonObj[key] = value;
        }
      }
    });
    
    // 确保地址字段格式正确
    ['sellToken', 'buyToken', 'from', 'receiver'].forEach((field: string) => {
      if (jsonObj[field] && typeof jsonObj[field] === 'string') {
        let value = jsonObj[field];
        
        // 移除可能的引号
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
          logs.push(`[${new Date().toISOString()}] 移除${field}中的引号: ${value}`);
        }
        
        // 移除可能的空格
        value = value.trim();
        
        // 确保地址格式正确
        if (value.startsWith('0x')) {
          // 检查长度
          if (value.length !== 42) {
            logs.push(`[${new Date().toISOString()}] 警告: ${field}地址格式可能不正确，长度为${value.length}，应为42`);
          }
        }
        
        // 更新字段值
        jsonObj[field] = value;
      }
    });
    
    // 添加必要的字段
    const requiredFields = ['from', 'sellToken', 'buyToken', 'receiver', 'appData'];
    const missingFields = requiredFields.filter(field => !jsonObj[field]);
    
    if (missingFields.length > 0) {
      logs.push(`[${new Date().toISOString()}] 警告: COW.fi API缺少必要字段: ${missingFields.join(', ')}`);
      
      // 添加缺失的字段
      if (!jsonObj.from) {
        jsonObj.from = jsonObj.receiver || '0x0000000000000000000000000000000000000000';
        logs.push(`[${new Date().toISOString()}] 已添加from字段: ${jsonObj.from}`);
      }
      
      if (!jsonObj.receiver) {
        jsonObj.receiver = jsonObj.from || '0x0000000000000000000000000000000000000000';
        logs.push(`[${new Date().toISOString()}] 已添加receiver字段: ${jsonObj.receiver}`);
      }
      
      if (!jsonObj.appData) {
        jsonObj.appData = '0x0000000000000000000000000000000000000000000000000000000000000000';
        logs.push(`[${new Date().toISOString()}] 已添加appData字段: ${jsonObj.appData}`);
      }
    }
    
    // 确保只使用validTo或validFor中的一个，不能同时使用两个
    if (jsonObj.validTo && jsonObj.validFor) {
      logs.push(`[${new Date().toISOString()}] 警告: 同时存在validTo和validFor字段，移除validFor字段`);
      delete jsonObj.validFor;
    }
    
    // 如果两者都不存在，添加validTo
    if (!jsonObj.validTo && !jsonObj.validFor) {
      // 设置为当前时间后1小时（以秒为单位的时间戳）
      jsonObj.validTo = Math.floor(Date.now() / 1000) + 3600;
      logs.push(`[${new Date().toISOString()}] 已添加validTo字段: ${jsonObj.validTo}`);
    }
    
    // 返回格式化的JSON
    return JSON.stringify(jsonObj);
  } catch (error) {
    logs.push(`[${new Date().toISOString()}] 处理COW.fi API payload失败: ${error instanceof Error ? error.message : String(error)}`);
    return payload;
  }
};

const DataCollectionConfig: React.FC = () => {
  // 状态
  const [nodes, setNodes] = useState<DataCollectionNodeModel[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<DataCollectionNodeModel>({
    id: 0, // 修改为数字类型
    name: '',
    active: true,
    apiId: 0, // 修改为数字类型
    fieldMappings: []
  });
  const [apis, setApis] = useState<ApiConfigModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // 添加变量相关状态
  const [inputVariables, setInputVariables] = useState<Record<string, string>>({});
  const [isInputPanelOpen, setIsInputPanelOpen] = useState(true);
  const [isOutputPanelOpen, setIsOutputPanelOpen] = useState(true);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  
  // 添加新的状态变量
  const [logs, setLogs] = useState<string[]>([]);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  
  // 初始化数据库
  useEffect(() => {
    const request = indexedDB.open('MultiChainArbitrage', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建数据采集配置存储
      if (!db.objectStoreNames.contains('data_collection_configs')) {
        db.createObjectStore('data_collection_configs', { keyPath: 'NO', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      const database = new Database((event.target as IDBOpenDBRequest).result);
      setDb(database);
      loadData(database);
    };
    
    request.onerror = (event) => {
      console.error('数据库打开失败:', (event.target as IDBOpenDBRequest).error);
      setMessage({
        text: '数据库初始化失败，请检查浏览器设置或刷新页面重试',
        type: 'error'
      });
    };
  }, []);
  
  // 加载数据
  const loadData = async (database: Database | null = db) => {
    if (!database) return;
    
    setIsLoading(true);
    try {
      // 加载 API 配置
      const apiConfigs = await apiConfigAccess.getAll();
      setApis(apiConfigs);
      
      // 加载数据采集节点
      const dataCollectionNodes = await database.getAllDataCollectionConfigs();
      
      // 转换为内部模型
      const convertedNodes: DataCollectionNodeModel[] = dataCollectionNodes.map(node => {
        // 尝试从 apiParams 中解析自定义配置
        let apiId = 0;
        let fieldMappings: FieldMapping[] = [];
        
        try {
          if (node.config && node.config.apiParams && node.config.apiParams.customConfig) {
            const customConfig = JSON.parse(node.config.apiParams.customConfig) as CustomConfig;
            apiId = customConfig.apiId || 0;
            fieldMappings = customConfig.fieldMappings || [];
          }
        } catch (error) {
          console.error('解析自定义配置失败:', error);
        }
        
        const apiConfig = apiConfigs.find(api => api.NO === apiId);
        
        return {
          id: node.NO,
          name: node.name,
          active: node.active,
          apiId: apiId,
          apiName: apiConfig?.name,
          apiType: apiConfig?.apiType || 'HTTP',
          fieldMappings: fieldMappings
        };
      });
      
      setNodes(convertedNodes);
      
      if (convertedNodes.length > 0 && !selectedNodeId) {
        setSelectedNodeId(convertedNodes[0].id || null);
        setCurrentNode(convertedNodes[0]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setMessage({
        text: `加载数据失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 选择节点
  const handleSelectNode = (node: DataCollectionNodeModel) => {
    setSelectedNodeId(node.id || null);
    setCurrentNode(node);
    setTestResult(null);
    setApiResponse(null);
  };
  
  // 创建新节点
  const handleCreateNode = () => {
    const newNode: DataCollectionNodeModel = {
      name: '新数据采集节点',
      active: true,
      apiId: 0, // 初始化为0，表示未选择API
      apiType: 'HTTP', // 默认为HTTP类型
      fieldMappings: []
    };
    setSelectedNodeId(null);
    setCurrentNode(newNode);
    setTestResult(null);
    setApiResponse(null);
  };
  
  // 更新节点名称
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNode({
      ...currentNode,
      name: e.target.value
    });
  };
  
  // 更新节点状态
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNode({
      ...currentNode,
      active: e.target.checked
    });
  };
  
  // 更新 API ID 并自动加载字段映射和检测变量
  const handleApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const apiId = parseInt(e.target.value);
    const selectedApi = apis.find(api => api.NO === apiId);
    
    setCurrentNode({
      ...currentNode,
      apiId,
      apiName: selectedApi?.name,
      apiType: selectedApi?.apiType || 'HTTP',
      fieldMappings: [] // 清空字段映射，等待从API配置中加载
    });
    
    // 自动加载字段映射
    if (apiId) {
      loadFieldMappingsFromApiConfig(apiId);
    }
    
    // 检测API中的变量
    if (selectedApi) {
      detectVariables(selectedApi);
    } else {
      setDetectedVariables([]);
      setInputVariables({});
    }
    
    // 清空API响应
    setApiResponse(null);
  };
  
  // 检测API中的变量
  const detectVariables = (api: ApiConfigModel) => {
    const variables: string[] = [];
    const newInputVariables: Record<string, string> = {};
    
    // 检查URL中的变量
    if (api.baseUrl) {
      const urlVariables = extractVariables(api.baseUrl);
      variables.push(...urlVariables);
    }
    
    // 检查Payload中的变量
    if (api.method === 'POST' && api.payload) {
      const payloadVariables = extractVariables(api.payload);
      variables.push(...payloadVariables);
    }
    
    // 检查方法参数中的变量
    if (api.apiType === 'CHAIN' && api.methodParams) {
      api.methodParams.forEach(param => {
        if (param.value) {
          const paramVariables = extractVariables(param.value);
          variables.push(...paramVariables);
        }
      });
    }
    
    // 使用filter方法去重
    const uniqueVariables = variables.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    
    // 初始化变量值
    uniqueVariables.forEach(variable => {
      // 如果API中已有自定义变量值，则使用它
      if (api.customVariables && api.customVariables[variable]) {
        newInputVariables[variable] = api.customVariables[variable];
      } else {
        newInputVariables[variable] = '';
      }
    });
    
    setDetectedVariables(uniqueVariables);
    setInputVariables(newInputVariables);
    
    // 如果有变量，自动打开输入面板
    if (uniqueVariables.length > 0) {
      setIsInputPanelOpen(true);
    }
  };
  
  // 从字符串中提取变量
  const extractVariables = (text: string): string[] => {
    const regex = /\(([^()]+)\)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  };
  
  // 处理变量输入变化
  const handleVariableChange = (variable: string, value: string) => {
    setInputVariables({
      ...inputVariables,
      [variable]: value
    });
  };
  
  // 替换文本中的变量，增强对 JSON 的支持，特别处理地址类型
  const replaceVariables = (text: string, variables: Record<string, string>, logs: string[] = []): string => {
    // 检查是否是 JSON 格式
    let isJson = false;
    let jsonObj: any = null;
    
    try {
      jsonObj = JSON.parse(text);
      isJson = true;
    } catch (e) {
      // 不是 JSON 格式，使用普通文本替换
      isJson = false;
    }
    
    if (isJson && typeof jsonObj === 'object') {
      // 如果是 JSON 对象，递归替换所有字符串值中的变量
      const replaceInObject = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => replaceInObject(item));
        }
        
        if (typeof obj === 'object') {
          const result: Record<string, any> = {};
          for (const key in obj) {
            result[key] = replaceInObject(obj[key]);
          }
          return result;
        }
        
        if (typeof obj === 'string') {
          // 检查字符串是否包含变量占位符
          let containsVariable = false;
          let result = obj;
          
          Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `(${key})`;
            if (result.includes(placeholder)) {
              containsVariable = true;
              logs.push(`[${new Date().toISOString()}] 替换变量: ${placeholder} -> ${value}`);
              
              // 检查是否是以太坊地址格式（0x开头的十六进制字符串）
              if (value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)) {
                // 确保地址格式正确（应该是42个字符，包括0x前缀）
                if (value.length !== 42) {
                  logs.push(`[${new Date().toISOString()}] 警告: 地址 ${value} 长度不正确，应为42个字符（包括0x前缀）`);
                }
                
                // 如果整个字符串就是变量占位符，直接返回值，避免引号问题
                if (result === placeholder) {
                  logs.push(`[${new Date().toISOString()}] 直接替换整个字符串: ${result} -> ${value}`);
                  result = value;
                  return;
                }
              }
              
              // 替换变量
              result = result.replace(new RegExp(placeholder, 'g'), value);
            }
          });
          
          return result;
        }
        
        return obj;
      };
      
      // 替换 JSON 对象中的所有变量
      const processedObj = replaceInObject(jsonObj);
      
      // 特殊处理某些字段，确保它们是正确的格式
      if (processedObj.sellToken && typeof processedObj.sellToken === 'string') {
        // 如果sellToken是一个地址，确保它没有额外的引号
        if (processedObj.sellToken.startsWith('"') && processedObj.sellToken.endsWith('"') && processedObj.sellToken.length > 2) {
          processedObj.sellToken = processedObj.sellToken.substring(1, processedObj.sellToken.length - 1);
          logs.push(`[${new Date().toISOString()}] 移除sellToken中的引号: ${processedObj.sellToken}`);
        }
      }
      
      if (processedObj.buyToken && typeof processedObj.buyToken === 'string') {
        // 如果buyToken是一个地址，确保它没有额外的引号
        if (processedObj.buyToken.startsWith('"') && processedObj.buyToken.endsWith('"') && processedObj.buyToken.length > 2) {
          processedObj.buyToken = processedObj.buyToken.substring(1, processedObj.buyToken.length - 1);
          logs.push(`[${new Date().toISOString()}] 移除buyToken中的引号: ${processedObj.buyToken}`);
        }
      }
      
      // 检查from和receiver字段
      ['from', 'receiver'].forEach((field: string) => {
        if (processedObj[field] && typeof processedObj[field] === 'string') {
          // 如果是一个地址，确保它没有额外的引号
          if (processedObj[field].startsWith('"') && processedObj[field].endsWith('"') && processedObj[field].length > 2) {
            processedObj[field] = processedObj[field].substring(1, processedObj[field].length - 1);
            logs.push(`[${new Date().toISOString()}] 移除${field}中的引号: ${processedObj[field]}`);
          }
        }
      });
      
      return JSON.stringify(processedObj);
    } else {
      // 普通文本替换
      let result = text;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `(${key})`;
        result = result.replace(new RegExp(placeholder, 'g'), value);
      });
      return result;
    }
  };
  
  // 从API配置中加载字段映射
  const loadFieldMappingsFromApiConfig = (apiId: number) => {
    // 获取选中的API配置
    const selectedApi = apis.find(api => api.NO === apiId);
    
    if (selectedApi && selectedApi.fieldMappings && selectedApi.fieldMappings.length > 0) {
      // 将API配置中的字段映射转换为数据采集节点的字段映射格式
      const mappings: FieldMapping[] = selectedApi.fieldMappings.map(mapping => ({
        sourceField: mapping.jsonPath,
        targetField: mapping.customName,
        description: mapping.displayName
      }));
      
      setCurrentNode(prev => ({
        ...prev,
        fieldMappings: mappings
      }));
    } else {
      // 如果API配置中没有字段映射，则尝试从已保存的节点中查找
      const savedMappings = nodes.find(node => node.apiId === apiId)?.fieldMappings;
      
      if (savedMappings && savedMappings.length > 0) {
        setCurrentNode(prev => ({
          ...prev,
          fieldMappings: savedMappings
        }));
      }
    }
  };
  
  // 修复变量作用域问题
  const handleFetchApiData = async () => {
    if (!currentNode.apiId) {
      setMessage({
        text: '请选择 API',
        type: 'error'
      });
      return;
    }
    
    // 检查必填变量
    const missingVariables = detectedVariables.filter(variable => !inputVariables[variable]);
    if (missingVariables.length > 0) {
      setMessage({
        text: `请输入以下变量的值: ${missingVariables.join(', ')}`,
        type: 'error'
      });
      return;
    }
    
    try {
      setIsLoadingApi(true);
      setApiResponse(null);
      setApiResponseError(null);
      setLogs([]); // 清空之前的日志
      
      const localLogs: string[] = [];
      
      // 创建一个函数来更新日志，这样可以实时显示日志
      const updateLogs = (newLog: string) => {
        localLogs.push(newLog);
        setLogs([...localLogs]); // 创建新数组以触发重新渲染
      };
      
      updateLogs(`[${new Date().toISOString()}] 开始获取API数据...`);
      
      // 获取选中的 API 配置
      const selectedApi = apis.find(api => api.NO === currentNode.apiId);
      
      if (!selectedApi) {
        throw new Error('未找到选中的 API 配置');
      }
      
      localLogs.push(`[${new Date().toISOString()}] 使用 API: ${selectedApi.name}`);
      
      // 构建请求参数
      let apiUrl = selectedApi.baseUrl || '';
      
      // 替换URL中的变量
      const processedApiUrl = replaceVariables(apiUrl, inputVariables, localLogs);
      
      // 验证 URL 格式
      if (!processedApiUrl || !processedApiUrl.trim()) {
        throw new Error('API URL 为空，请在 API 配置中设置有效的 baseUrl');
      }
      
      try {
        new URL(processedApiUrl);
      } catch (e) {
        throw new Error(`API URL 格式无效: ${processedApiUrl}`);
      }
      
      let method = selectedApi.method || 'GET';
      let headers: Record<string, string> = {};
      let body: string | null = null;
      let responseData: any;
      
      // 设置请求体（如果是POST请求）
      if (method === 'POST') {
        body = selectedApi.payload || '{}';
        localLogs.push(`[${new Date().toISOString()}] 设置POST请求体: ${body}`);
      }
      
      // 添加API密钥（如果有）
      if (selectedApi.apiKey) {
        headers['X-API-Key'] = selectedApi.apiKey;
        localLogs.push(`[${new Date().toISOString()}] 已添加 API 密钥`);
      }
      
      // 添加认证信息（如果有）
      if (selectedApi.apiSecret) {
        headers['Authorization'] = `Bearer ${selectedApi.apiSecret}`;
        localLogs.push(`[${new Date().toISOString()}] 已添加认证信息`);
      }
      
      // 检查是否是COW.fi API
      const isCowApi = selectedApi.baseUrl?.includes('cow.fi') || selectedApi.baseUrl?.includes('api/v1/quote');
      
      if (isCowApi) {
        localLogs.push(`[${new Date().toISOString()}] 检测到COW.fi API，使用专门的处理函数...`);
        
        try {
          // 确保有请求体
          if (!body || body === '{}') {
            logs.push(`[${new Date().toISOString()}] 警告: COW.fi API请求体为空，创建默认请求体`);
            body = JSON.stringify({
              sellToken: inputVariables['sellToken'] || '0x0000000000000000000000000000000000000000',
              buyToken: inputVariables['buyToken'] || '0x0000000000000000000000000000000000000000',
              from: inputVariables['from'] || '0x0000000000000000000000000000000000000000',
              receiver: inputVariables['receiver'] || '0x0000000000000000000000000000000000000000',
              appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
              validTo: Math.floor(Date.now() / 1000) + 3600,
              sellAmountBeforeFee: inputVariables['sellAmountBeforeFee'] || '1000000000000000000'
            });
            logs.push(`[${new Date().toISOString()}] 创建的默认请求体: ${body}`);
          }
          
          // 先解析JSON，确保格式正确
          const jsonObj = JSON.parse(body);
          
          // 记录原始字段值
          if (jsonObj.sellToken) {
            logs.push(`[${new Date().toISOString()}] 原始sellToken: ${jsonObj.sellToken}`);
          }
          
          // 使用专门的处理函数
          body = processCowApiPayload(body, inputVariables, logs);
          logs.push(`[${new Date().toISOString()}] COW.fi专用处理后的Payload: ${body}`);
          
          // 再次解析，检查处理后的字段值
          const processedObj = JSON.parse(body);
          
          // 检查并添加必要字段
          const requiredFields = ['from', 'sellToken', 'buyToken', 'receiver', 'appData'];
          const missingFields = requiredFields.filter(field => !processedObj[field]);
          
          if (missingFields.length > 0) {
            logs.push(`[${new Date().toISOString()}] 警告: COW.fi API缺少必要字段: ${missingFields.join(', ')}`);
            
            // 添加缺失的字段
            if (!processedObj.from) {
              processedObj.from = processedObj.receiver || '0x0000000000000000000000000000000000000000';
              logs.push(`[${new Date().toISOString()}] 已添加from字段: ${processedObj.from}`);
            }
            
            if (!processedObj.receiver) {
              processedObj.receiver = processedObj.from || '0x0000000000000000000000000000000000000000';
              logs.push(`[${new Date().toISOString()}] 已添加receiver字段: ${processedObj.receiver}`);
            }
            
            if (!processedObj.appData) {
              processedObj.appData = '0x0000000000000000000000000000000000000000000000000000000000000000';
              logs.push(`[${new Date().toISOString()}] 已添加appData字段: ${processedObj.appData}`);
            }
          }
          
          // 确保sellToken不包含引号
          if (typeof processedObj.sellToken === 'string' && processedObj.sellToken.includes('"')) {
            logs.push(`[${new Date().toISOString()}] 警告: sellToken仍然包含引号，尝试修复...`);
            processedObj.sellToken = processedObj.sellToken.replace(/"/g, '');
            body = JSON.stringify(processedObj);
            logs.push(`[${new Date().toISOString()}] 修复后的Payload: ${body}`);
          }
          
          logs.push(`[${new Date().toISOString()}] 最终COW.fi请求体: ${body}`);
        } catch (error) {
          logs.push(`[${new Date().toISOString()}] 警告: 处理COW.fi API请求时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // 使用通用变量替换
        body = replaceVariables(body || '{}', inputVariables, logs);
        logs.push(`[${new Date().toISOString()}] 替换变量后的Payload: ${body}`);
      }
      
      // 处理自定义变量（保留原有逻辑，但变量已在上面替换）
      if (selectedApi.customVariables) {
        logs.push(`[${new Date().toISOString()}] API配置中包含自定义变量，但已被用户输入的变量替换`);
      }
      
      headers['Content-Type'] = 'application/json';
      logs.push(`[${new Date().toISOString()}] 已设置 Content-Type: application/json`);
      logs.push(`[${new Date().toISOString()}] 最终请求体: ${body}`);
      
      // 详细记录请求信息
      logs.push(`[${new Date().toISOString()}] 请求URL: ${processedApiUrl}`);
      logs.push(`[${new Date().toISOString()}] 请求方法: ${method}`);
      logs.push(`[${new Date().toISOString()}] 请求头: ${JSON.stringify(headers, null, 2)}`);
      
      // 详细记录请求体
      if (body) {
        logs.push(`[${new Date().toISOString()}] 请求体(原始): ${body}`);
        try {
          // 尝试解析JSON以更好地显示
          const bodyObj = JSON.parse(body);
          logs.push(`[${new Date().toISOString()}] 请求体(解析后): ${JSON.stringify(bodyObj, null, 2)}`);
          
          // 检查是否缺少必要字段
          if (processedApiUrl.includes('cow.fi') || processedApiUrl.includes('api/v1/quote')) {
            logs.push(`[${new Date().toISOString()}] 检测到COW.fi API，检查必要字段...`);
            const requiredFields = ['from', 'sellToken', 'buyToken', 'receiver', 'appData'];
            const missingFields = requiredFields.filter(field => !bodyObj[field]);
            
            if (missingFields.length > 0) {
              logs.push(`[${new Date().toISOString()}] 警告: 缺少必要字段: ${missingFields.join(', ')}`);
              
              // 尝试修复缺失的字段
              if (missingFields.includes('from') && !bodyObj.from) {
                logs.push(`[${new Date().toISOString()}] 尝试添加缺失的from字段...`);
                bodyObj.from = bodyObj.receiver || '0x0000000000000000000000000000000000000000';
                logs.push(`[${new Date().toISOString()}] 已添加from字段: ${bodyObj.from}`);
              }
              
              if (missingFields.includes('receiver') && !bodyObj.receiver) {
                logs.push(`[${new Date().toISOString()}] 尝试添加缺失的receiver字段...`);
                bodyObj.receiver = bodyObj.from || '0x0000000000000000000000000000000000000000';
                logs.push(`[${new Date().toISOString()}] 已添加receiver字段: ${bodyObj.receiver}`);
              }
              
              if (missingFields.includes('appData') && !bodyObj.appData) {
                logs.push(`[${new Date().toISOString()}] 尝试添加缺失的appData字段...`);
                bodyObj.appData = '0x0000000000000000000000000000000000000000000000000000000000000000';
                logs.push(`[${new Date().toISOString()}] 已添加appData字段: ${bodyObj.appData}`);
              }
            }
            
            // 确保只使用validTo或validFor中的一个，不能同时使用两个
            if (bodyObj.validTo && bodyObj.validFor) {
              logs.push(`[${new Date().toISOString()}] 警告: 同时存在validTo和validFor字段，移除validFor字段`);
              delete bodyObj.validFor;
            }
            
            // 如果两者都不存在，添加validTo
            if (!bodyObj.validTo && !bodyObj.validFor) {
              // 设置为当前时间后1小时（以秒为单位的时间戳）
              bodyObj.validTo = Math.floor(Date.now() / 1000) + 3600;
              logs.push(`[${new Date().toISOString()}] 已添加validTo字段: ${bodyObj.validTo}`);
            }
            
            // 更新body
            body = JSON.stringify(bodyObj);
            logs.push(`[${new Date().toISOString()}] 修复后的请求体: ${body}`);
          }
        } catch (e) {
          logs.push(`[${new Date().toISOString()}] 请求体不是有效的JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        logs.push(`[${new Date().toISOString()}] 请求体为空`);
      }
      
      logs.push(`[${new Date().toISOString()}] 发送请求...`);
      
      // 实际发送API请求
      try {
        // 检查是否在 TamperMonkey 环境中
        const isTM = isTamperMonkeyEnvironment();
        if (isTM) {
          logs.push(`[${new Date().toISOString()}] 检测到 TamperMonkey 环境，使用 GM_xmlhttpRequest 发送请求`);
        } else {
          logs.push(`[${new Date().toISOString()}] 未检测到 TamperMonkey 环境，将使用 fetch API 或代理服务`);
        }
        
        // 使用工具函数发送请求
        const startTime = Date.now();
        logs.push(`[${new Date().toISOString()}] 最终发送的请求体: ${body || '空'}`);
        
        // 确保POST请求有请求体
        if (method === 'POST' && (!body || body === '{}')) {
          logs.push(`[${new Date().toISOString()}] 警告: POST请求的请求体为空，将使用空对象`);
          body = '{}';
        }
        
        responseData = await sendRequest(
          processedApiUrl,
          method as 'GET' | 'POST',
          headers,
          body,
          30000 // 30秒超时
        );
        const endTime = Date.now();
        
        logs.push(`[${new Date().toISOString()}] 请求完成，耗时 ${endTime - startTime}ms`);
        
        // 检查响应数据
        if (responseData === null || responseData === undefined) {
          logs.push(`[${new Date().toISOString()}] 警告: 响应数据为空`);
          responseData = {};
        } else if (typeof responseData === 'string' && responseData.trim() === '') {
          logs.push(`[${new Date().toISOString()}] 警告: 响应数据为空字符串`);
          responseData = {};
        }
        
        logs.push(`[${new Date().toISOString()}] 响应数据类型: ${typeof responseData}`);
        logs.push(`[${new Date().toISOString()}] 响应数据: ${JSON.stringify(responseData, null, 2)}`);
      } catch (error) {
        logs.push(`[${new Date().toISOString()}] 请求失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
      
      logs.push(`[${new Date().toISOString()}] 开始提取字段...`);
      
      // 提取字段
      const extractedData: Record<string, any> = {};
      currentNode.fieldMappings.forEach(mapping => {
        logs.push(`[${new Date().toISOString()}] 提取字段: ${mapping.sourceField} -> ${mapping.targetField}`);
        
        try {
          // 从嵌套对象中获取值
          let value = getNestedValue(responseData, mapping.sourceField);
          
          // 如果值为undefined，尝试其他可能的路径
          if (value === undefined) {
            logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，尝试其他可能的路径...`);
            
            // 尝试直接从顶层对象获取
            if (responseData[mapping.targetField] !== undefined) {
              value = responseData[mapping.targetField];
              logs.push(`[${new Date().toISOString()}] 从顶层对象找到字段 ${mapping.targetField}`);
            }
            
            // 尝试从quote对象获取
            else if (responseData.quote && responseData.quote[mapping.targetField] !== undefined) {
              value = responseData.quote[mapping.targetField];
              logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${mapping.targetField}`);
            }
            
            // 尝试从quote对象获取，使用sourceField的最后一部分
            else if (responseData.quote) {
              const lastPart = mapping.sourceField.split('.').pop();
              if (lastPart && responseData.quote[lastPart] !== undefined) {
                value = responseData.quote[lastPart];
                logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${lastPart}`);
              }
            }
          }
          
          extractedData[mapping.targetField] = value;
          
          if (value === undefined) {
            logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，所有尝试都失败了`);
            // 打印响应数据的结构，帮助调试
            logs.push(`[${new Date().toISOString()}] 响应数据结构: ${JSON.stringify(Object.keys(responseData))}`);
            if (responseData.quote) {
              logs.push(`[${new Date().toISOString()}] quote对象结构: ${JSON.stringify(Object.keys(responseData.quote))}`);
            }
          } else {
            logs.push(`[${new Date().toISOString()}] 提取成功: ${mapping.targetField} = ${JSON.stringify(value)}`);
          }
        } catch (error) {
          logs.push(`[${new Date().toISOString()}] 提取失败: ${error instanceof Error ? error.message : String(error)}`);
          extractedData[mapping.targetField] = null;
        }
      });
      
      logs.push(`[${new Date().toISOString()}] 字段提取完成`);
      logs.push(`[${new Date().toISOString()}] API调用完成`);
      
      // 更新API响应状态
      setApiResponse({
        success: true,
        message: '获取数据成功',
        data: responseData,
        logs,
        extractedFields: extractedData
      });
    } catch (error: any) { // 添加类型注解
      console.error('获取API数据失败:', error);
      
      setApiResponse({
        success: false,
        message: `获取数据失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
        logs: [`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`]
      });
      
      setMessage({
        text: `获取数据失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
      
      // 设置错误信息和日志
      if (typeof setApiResponseError === 'function') {
        setApiResponseError(error instanceof Error ? error.message : String(error));
      }
      
      if (logs && Array.isArray(logs)) {
        logs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsLoadingApi(false);
      setLogs(logs); // 设置日志
    }
  };
  
  // 从嵌套对象中获取值
  const getNestedValue = (obj: any, path: string): any => {
    // 如果路径为空或对象为null/undefined，直接返回
    if (!path || obj === null || obj === undefined) {
      return undefined;
    }
    
    // 添加调试日志
    console.log(`尝试从路径 ${path} 获取值，对象类型: ${typeof obj}`);
    
    // 处理数组索引和嵌套对象
    // 支持格式: data.items[0].name 或 data.items.0.name
    const parts = path.split('.');
    let result = obj;
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      
      // 添加调试日志
      console.log(`处理路径部分: ${part}, 当前结果类型: ${typeof result}`);
      
      // 处理数组索引格式 items[0]
      const arrayMatch = part.match(/^(.*)\[(\d+)\]$/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        
        // 先获取数组
        if (arrayName && result[arrayName] === undefined) {
          console.log(`数组 ${arrayName} 不存在`);
          return undefined;
        }
        
        if (arrayName) {
          result = result[arrayName];
          console.log(`获取数组 ${arrayName}, 结果类型: ${typeof result}`);
        }
        
        // 再获取索引元素
        if (!Array.isArray(result) || index >= result.length) {
          console.log(`索引 ${index} 超出数组范围或结果不是数组`);
          return undefined;
        }
        
        result = result[index];
        console.log(`获取索引 ${index} 的元素, 结果类型: ${typeof result}`);
        continue;
      }
      
      // 检查是否为数字（可能是数组索引）
      if (/^\d+$/.test(part) && Array.isArray(result)) {
        const index = parseInt(part, 10);
        if (index >= result.length) {
          console.log(`索引 ${index} 超出数组范围`);
          return undefined;
        }
        result = result[index];
        console.log(`获取索引 ${index} 的元素, 结果类型: ${typeof result}`);
        continue;
      }
      
      // 普通对象属性
      if (result === null || result === undefined) {
        console.log(`结果为 null 或 undefined`);
        return undefined;
      }
      
      if (result[part] === undefined) {
        console.log(`属性 ${part} 在对象中不存在`);
        // 尝试打印对象的所有键，帮助调试
        if (typeof result === 'object') {
          console.log(`对象的可用键: ${Object.keys(result).join(', ')}`);
        }
        return undefined;
      }
      
      result = result[part];
      console.log(`获取属性 ${part}, 结果: ${JSON.stringify(result)}`);
    }
    
    console.log(`最终结果: ${JSON.stringify(result)}`);
    return result;
  };
  
  // 根据API响应自动生成字段映射建议
  const generateFieldMappingSuggestions = (data: any): FieldMapping[] => {
    const suggestions: FieldMapping[] = [];
    const paths: string[] = [];
    
    // 递归查找所有叶子节点路径
    const findPaths = (obj: any, currentPath: string = '') => {
      if (obj === null || obj === undefined) {
        return;
      }
      
      if (typeof obj !== 'object') {
        paths.push(currentPath);
        return;
      }
      
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          findPaths(obj[key], newPath);
        } else {
          paths.push(newPath);
        }
      }
    };
    
    findPaths(data);
    
    // 选择一些有意义的路径作为建议
    const interestingKeywords = ['price', 'value', 'amount', 'volume', 'change', 'percentage', 'rate', 'time', 'date', 'name', 'symbol', 'id'];
    
    paths.forEach(path => {
      // 检查路径是否包含感兴趣的关键词
      const isInteresting = interestingKeywords.some(keyword => 
        path.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isInteresting) {
        // 从路径中提取最后一部分作为目标字段名
        const parts = path.split('.');
        const lastPart = parts[parts.length - 1];
        
        suggestions.push({
          sourceField: path,
          targetField: lastPart,
          description: `${lastPart} 数据`
        });
      }
    });
    
    // 限制建议数量
    return suggestions.slice(0, 5);
  };
  
  // 添加字段映射
  const handleAddFieldMapping = () => {
    const newMapping: FieldMapping = {
      sourceField: '',
      targetField: '',
      description: ''
    };
    
    setCurrentNode({
      ...currentNode,
      fieldMappings: [...currentNode.fieldMappings, newMapping]
    });
  };
  
  // 更新字段映射
  const handleFieldMappingChange = (index: number, field: keyof FieldMapping, value: string) => {
    const updatedMappings = [...currentNode.fieldMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      [field]: value
    };
    
    setCurrentNode({
      ...currentNode,
      fieldMappings: updatedMappings
    });
  };
  
  // 删除字段映射
  const handleDeleteFieldMapping = (index: number) => {
    const updatedMappings = [...currentNode.fieldMappings];
    updatedMappings.splice(index, 1);
    
    setCurrentNode({
      ...currentNode,
      fieldMappings: updatedMappings
    });
  };
  
  // 保存节点
  const handleSave = async () => {
    if (!db) {
      setMessage({
        text: '数据库未初始化',
        type: 'error'
      });
      return;
    }
    
    if (!currentNode.name) {
      setMessage({
        text: '请输入节点名称',
        type: 'error'
      });
      return;
    }
    
    if (!currentNode.apiId) {
      setMessage({
        text: '请选择 API',
        type: 'error'
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // 将自定义配置序列化为字符串，存储在 apiParams 中
      const customConfig: CustomConfig = {
        apiId: currentNode.apiId,
        fieldMappings: currentNode.fieldMappings
      };
      
      // 转换为数据库模型
      const dbModel: DataCollectionConfigModel = {
        NO: currentNode.id,
        name: currentNode.name,
        type: 'api',
        config: {
          // 使用 apiParams 存储自定义配置
          apiParams: { customConfig: JSON.stringify(customConfig) },
          baseUrl: '',
          endpoint: '',
          headers: {}
        },
        active: currentNode.active,
        create_time: Date.now()
      };
      
      if (currentNode.id) {
        // 更新现有节点
        await db.updateDataCollectionConfig(dbModel);
        
        // 更新节点列表中的当前节点，确保 apiName 正确显示
        const updatedNodes = nodes.map(node => 
          node.id === currentNode.id ? {
            ...currentNode,
            apiName: apis.find(api => api.NO === currentNode.apiId)?.name
          } : node
        );
        setNodes(updatedNodes);
        
        setMessage({
          text: '配置已更新',
          type: 'success'
        });
      } else {
        // 创建新节点
        await db.addDataCollectionConfig(dbModel);
        
        // 重新加载数据以获取新的ID
        await loadData();
        
        setMessage({
          text: '配置已创建',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('保存失败:', error);
      setMessage({
        text: `保存失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 删除节点
  const handleDelete = () => {
    if (!currentNode.id) {
      setMessage({
        text: '无法删除未保存的配置',
        type: 'error'
      });
      return;
    }
    setShowDeleteConfirm(true);
  };
  
  // 确认删除
  const handleConfirmDelete = async () => {
    if (!db || !currentNode.id) return;
    
    setIsDeleting(true);
    try {
      // 从数据库删除
      await db.deleteDataCollectionConfig(currentNode.id);
      
      const updatedNodes = nodes.filter(node => node.id !== currentNode.id);
      setNodes(updatedNodes);
      
      if (updatedNodes.length > 0) {
        setSelectedNodeId(updatedNodes[0].id || null);
        setCurrentNode(updatedNodes[0]);
      } else {
        setSelectedNodeId(null);
        setCurrentNode({
          name: '',
          active: true,
          apiId: 0,
          fieldMappings: []
        });
      }
      
      setShowDeleteConfirm(false);
      setMessage({
        text: '配置已删除',
        type: 'success'
      });
    } catch (error) {
      console.error('删除失败:', error);
      setMessage({
        text: `删除失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 关闭消息
  const handleCloseMessage = () => {
    setMessage(null);
  };
  
  // 测试节点
  const handleTest = async () => {
    if (!currentNode.apiId) {
      setMessage({
        text: '请选择 API',
        type: 'error'
      });
      return;
    }
    
    // 移除字段映射验证，允许无字段映射时也能测试
    
    setIsTesting(true);
    setTestResult(null);
    
    // 声明变量
    let apiUrl = '';
    let method = 'GET';
    let headers: Record<string, string> = {};
    let body: string | null = null;
    let responseData: any;
    
    try {
      // 获取选中的 API 配置
      const selectedApi = apis.find(api => api.NO === currentNode.apiId);
      
      if (!selectedApi) {
        throw new Error('未找到选中的 API 配置');
      }
      
      const logs: string[] = [];
      
      logs.push(`[${new Date().toISOString()}] 开始测试数据采集节点: ${currentNode.name}`);
      logs.push(`[${new Date().toISOString()}] 使用 API: ${selectedApi.name}`);
      
      // 构建请求参数
      apiUrl = selectedApi.baseUrl || '';
      
      // 替换URL中的变量
      const processedApiUrl = replaceVariables(apiUrl, inputVariables, logs);
      
      // 验证 URL 格式
      if (!processedApiUrl || !processedApiUrl.trim()) {
        throw new Error('API URL 为空，请在 API 配置中设置有效的 baseUrl');
      }
      
      try {
        new URL(processedApiUrl);
      } catch (e) {
        throw new Error(`API URL 格式无效: ${processedApiUrl}`);
      }
      
      method = selectedApi.method || 'GET';
      headers = {};
      
      // 设置请求体（如果是POST请求）
      if (method === 'POST') {
        body = selectedApi.payload || '{}';
        logs.push(`[${new Date().toISOString()}] 设置POST请求体: ${body}`);
      }
      
      // 添加API密钥（如果有）
      if (selectedApi.apiKey) {
        headers['X-API-Key'] = selectedApi.apiKey;
        logs.push(`[${new Date().toISOString()}] 已添加 API 密钥`);
      }
      
      // 添加认证信息（如果有）
      if (selectedApi.apiSecret) {
        headers['Authorization'] = `Bearer ${selectedApi.apiSecret}`;
        logs.push(`[${new Date().toISOString()}] 已添加认证信息`);
      }
      
      // 处理请求体（如果是POST请求）
      if (method === 'POST' && selectedApi.payload) {
        body = selectedApi.payload;
        headers['Content-Type'] = 'application/json';
        logs.push(`[${new Date().toISOString()}] 已设置 Content-Type: application/json`);
      }
      
      // 处理自定义变量
      if (selectedApi.customVariables) {
        logs.push(`[${new Date().toISOString()}] 处理自定义变量...`);
        Object.entries(selectedApi.customVariables).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          const oldUrl = processedApiUrl;
          apiUrl = apiUrl.replace(placeholder, value);
          
          if (oldUrl !== apiUrl) {
            logs.push(`[${new Date().toISOString()}] 替换变量 ${placeholder} -> ${value}`);
          }
          
          if (body) {
            const oldBody = body;
            body = body.replace(placeholder, value);
            
            if (oldBody !== body) {
              logs.push(`[${new Date().toISOString()}] 在请求体中替换变量 ${placeholder} -> ${value}`);
            }
          }
        });
      }
      
      logs.push(`[${new Date().toISOString()}] 请求URL: ${processedApiUrl}`);
      logs.push(`[${new Date().toISOString()}] 请求方法: ${method}`);
      logs.push(`[${new Date().toISOString()}] 请求头: ${JSON.stringify(headers)}`);
      if (body) {
        logs.push(`[${new Date().toISOString()}] 请求体: ${body}`);
      }
      
      logs.push(`[${new Date().toISOString()}] 发送请求...`);
      logs.push(`[${new Date().toISOString()}] 注意: 如果遇到 CORS 问题，系统将自动尝试使用代理服务`);
      
      // 实际发送API请求
      try {
        // 检查是否在 TamperMonkey 环境中
        const isTM = isTamperMonkeyEnvironment();
        if (isTM) {
          logs.push(`[${new Date().toISOString()}] 检测到 TamperMonkey 环境，使用 GM_xmlhttpRequest 发送请求`);
        } else {
          logs.push(`[${new Date().toISOString()}] 未检测到 TamperMonkey 环境，将使用 fetch API 或代理服务`);
        }
        
        // 使用工具函数发送请求
        const startTime = Date.now();
        logs.push(`[${new Date().toISOString()}] 最终发送的请求体: ${body || '空'}`);
        
        // 确保POST请求有请求体
        if (method === 'POST' && (!body || body === '{}')) {
          logs.push(`[${new Date().toISOString()}] 警告: POST请求的请求体为空，将使用空对象`);
          body = '{}';
        }
        
        responseData = await sendRequest(
          processedApiUrl,
          method as 'GET' | 'POST',
          headers,
          body,
          30000 // 30秒超时
        );
        const endTime = Date.now();
        
        logs.push(`[${new Date().toISOString()}] 请求完成，耗时 ${endTime - startTime}ms`);
        
        // 检查响应数据
        if (responseData === null || responseData === undefined) {
          logs.push(`[${new Date().toISOString()}] 警告: 响应数据为空`);
          responseData = {};
        } else if (typeof responseData === 'string' && responseData.trim() === '') {
          logs.push(`[${new Date().toISOString()}] 警告: 响应数据为空字符串`);
          responseData = {};
        }
        
        logs.push(`[${new Date().toISOString()}] 响应数据类型: ${typeof responseData}`);
        logs.push(`[${new Date().toISOString()}] 响应数据: ${JSON.stringify(responseData, null, 2)}`);
      } catch (error) {
        logs.push(`[${new Date().toISOString()}] 请求失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
      
      logs.push(`[${new Date().toISOString()}] 开始提取字段...`);
      
      // 提取字段
      const extractedData: Record<string, any> = {};
      currentNode.fieldMappings.forEach(mapping => {
        logs.push(`[${new Date().toISOString()}] 提取字段: ${mapping.sourceField} -> ${mapping.targetField}`);
        
        try {
          // 从嵌套对象中获取值
          let value = getNestedValue(responseData, mapping.sourceField);
          
          // 如果值为undefined，尝试其他可能的路径
          if (value === undefined) {
            logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，尝试其他可能的路径...`);
            
            // 尝试直接从顶层对象获取
            if (responseData[mapping.targetField] !== undefined) {
              value = responseData[mapping.targetField];
              logs.push(`[${new Date().toISOString()}] 从顶层对象找到字段 ${mapping.targetField}`);
            }
            
            // 尝试从quote对象获取
            else if (responseData.quote && responseData.quote[mapping.targetField] !== undefined) {
              value = responseData.quote[mapping.targetField];
              logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${mapping.targetField}`);
            }
            
            // 尝试从quote对象获取，使用sourceField的最后一部分
            else if (responseData.quote) {
              const lastPart = mapping.sourceField.split('.').pop();
              if (lastPart && responseData.quote[lastPart] !== undefined) {
                value = responseData.quote[lastPart];
                logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${lastPart}`);
              }
            }
          }
          
          extractedData[mapping.targetField] = value;
          
          if (value === undefined) {
            logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，所有尝试都失败了`);
            // 打印响应数据的结构，帮助调试
            logs.push(`[${new Date().toISOString()}] 响应数据结构: ${JSON.stringify(Object.keys(responseData))}`);
            if (responseData.quote) {
              logs.push(`[${new Date().toISOString()}] quote对象结构: ${JSON.stringify(Object.keys(responseData.quote))}`);
            }
          } else {
            logs.push(`[${new Date().toISOString()}] 提取成功: ${mapping.targetField} = ${JSON.stringify(value)}`);
          }
        } catch (error) {
          logs.push(`[${new Date().toISOString()}] 提取失败: ${error instanceof Error ? error.message : String(error)}`);
          extractedData[mapping.targetField] = null;
        }
      });
      
      logs.push(`[${new Date().toISOString()}] 字段提取完成`);
      logs.push(`[${new Date().toISOString()}] 测试完成`);
      
      setTestResult({
        success: true,
        message: '测试成功',
        logs,
        data: extractedData
      });
    } catch (error) {
      console.error('测试失败:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : String(error),
        logs: [`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`]
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // 取消删除确认
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  // 获取选中的 API 名称
  const selectedApiName = useMemo(() => {
    const api = apis.find(api => api.NO === currentNode.apiId);
    return api ? api.name : '未选择';
  }, [apis, currentNode.apiId]);
  
  // 渲染字段映射表格
  const renderFieldMappingTable = () => {
    // 获取API响应中提取的字段值
    const extractedValues = apiResponse?.extractedFields || {};
    
    // 调试日志，查看提取的字段值
    console.log('提取的字段值:', extractedValues);
    
    return (
      <FieldMappingTable>
        <thead>
          <tr>
            <TableHeader>自定义字段名</TableHeader>
            <TableHeader>显示名称</TableHeader>
            <TableHeader>JSON路径</TableHeader>
            <TableHeader>值</TableHeader>
            <TableHeader>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {currentNode.fieldMappings.map((mapping, index) => {
            // 获取当前字段的值
            const fieldValue = extractedValues[mapping.targetField];
            // 调试日志，查看每个字段的值
            console.log(`字段 ${mapping.targetField} 的值:`, fieldValue);
            
            return (
              <tr key={index}>
                <TableCell>
                  <Input
                    value={mapping.targetField}
                    onChange={(e) => handleFieldMappingChange(index, 'targetField', e.target.value)}
                    placeholder="price"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={mapping.description}
                    onChange={(e) => handleFieldMappingChange(index, 'description', e.target.value)}
                    placeholder="价格"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={mapping.sourceField}
                    onChange={(e) => handleFieldMappingChange(index, 'sourceField', e.target.value)}
                    placeholder="data.result.price"
                  />
                </TableCell>
                <TableCell>
                  {mapping.targetField in extractedValues ? (
                    <div 
                      style={{ 
                        maxWidth: '200px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: fieldValue === null ? '#FF6666' : '#66CCFF',
                        padding: '8px 0'
                      }}
                      title={
                        fieldValue === null 
                          ? '未找到' 
                          : typeof fieldValue === 'object'
                            ? JSON.stringify(fieldValue)
                            : String(fieldValue)
                      }
                    >
                      {fieldValue === null 
                        ? '未找到' 
                        : typeof fieldValue === 'object'
                          ? JSON.stringify(fieldValue)
                          : typeof fieldValue === 'boolean'
                            ? (fieldValue ? '是' : '否')
                            : typeof fieldValue === 'number'
                              ? fieldValue.toLocaleString('zh-CN')
                              : typeof fieldValue === 'string' && fieldValue.startsWith('0x')
                                ? fieldValue // 保持十六进制格式
                                : String(fieldValue)
                      }
                    </div>
                  ) : (
                    <div style={{ color: '#AAAAAA', padding: '8px 0' }}>未获取</div>
                  )}
                </TableCell>
                <TableCell>
                  <SecondaryButton onClick={() => handleDeleteFieldMapping(index)}>
                    删除
                  </SecondaryButton>
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </FieldMappingTable>
    );
  };
  
  // 添加千位符格式化函数
  const formatNumber = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // 如果是对象，使用JSON.stringify
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // 根据字段名称进行特殊处理
    if (fieldName) {
      // 如果字段名包含"hex"，保持原始格式
      if (fieldName.toLowerCase().includes('hex')) {
        return String(value);
      }
      
      // 如果字段名包含"formatted"，保持原始格式
      if (fieldName.toLowerCase().includes('formatted')) {
        return String(value);
      }
      
      // 如果字段名包含"decimal"，添加千位符
      if (fieldName.toLowerCase().includes('decimal') && !isNaN(Number(value))) {
        return Number(value).toLocaleString('zh-CN');
      }
    }
    
    // 如果是数字或可以转换为数字
    if (!isNaN(Number(value))) {
      // 如果是十六进制格式，保持原始格式
      if (typeof value === 'string' && value.toLowerCase().startsWith('0x')) {
        return value;
      }
      
      // 如果是小数（包含小数点），保持原始格式
      if (typeof value === 'string' && value.includes('.')) {
        return value;
      }
      
      // 其他数字添加千位符
      return Number(value).toLocaleString('zh-CN');
    }
    
    // 其他情况直接返回字符串
    return String(value);
  };
  
  // 渲染变量输入表格
  const renderVariableInputs = () => {
    if (detectedVariables.length === 0) {
      return (
        <div style={{ color: '#AAAAAA', padding: '10px 0' }}>
          当前API没有需要输入的变量
        </div>
      );
    }
    
    return (
      <VariableInputTable>
        <thead>
          <tr>
            <TableHeader>变量名</TableHeader>
            <TableHeader>变量值</TableHeader>
          </tr>
        </thead>
        <tbody>
          {detectedVariables.map((variable, index) => (
            <tr key={index}>
              <TableCell>
                <Label>{variable}</Label>
              </TableCell>
              <TableCell>
                <Input
                  value={inputVariables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`请输入${variable}的值`}
                />
              </TableCell>
            </tr>
          ))}
        </tbody>
      </VariableInputTable>
    );
  };
  
  // 修改页面布局，使用可折叠面板
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>数据采集配置</PageTitle>
        <ActionButton onClick={handleCreateNode}>
          新建数据采集节点
        </ActionButton>
      </PageHeader>
      
      {message && (
        <MessageBox type={message.type}>
          <div>{message.text}</div>
          <CloseButton onClick={handleCloseMessage}>×</CloseButton>
        </MessageBox>
      )}
      
      <ContentLayout>
        {/* 左侧节点列表 */}
        <NodeList>
          <NodeListHeader>
            配置列表
            <ActionButton onClick={handleCreateNode}>
              新建
            </ActionButton>
          </NodeListHeader>
          
          {nodes.map(node => (
            <NodeItem 
              key={node.id} 
              selected={selectedNodeId === node.id}
              onClick={() => handleSelectNode(node)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <NodeName selected={selectedNodeId === node.id}>
                  {node.name}
                </NodeName>
                <StatusIndicator active={node.active}>
                  {node.active ? '启用' : '禁用'}
                </StatusIndicator>
              </div>
              <ApiName>
                API: {node.apiName ? `${node.apiName} (${node.apiType})` : '未选择'}
              </ApiName>
            </NodeItem>
          ))}
          
          {nodes.length === 0 && (
            <div style={{ padding: '20px', color: '#AAAAAA', textAlign: 'center' }}>
              暂无配置，点击"新建"按钮创建
            </div>
          )}
        </NodeList>
        
        {/* 右侧配置面板 */}
        <ConfigPanel>
          <FormSection>
            <SectionTitle>基本信息</SectionTitle>
            
            <FormRow>
              <FormGroup>
                <Label>节点名称</Label>
                <Input
                  value={currentNode.name}
                  onChange={handleNameChange}
                  placeholder="输入节点名称"
                />
              </FormGroup>
              <FormGroup>
                <Label>状态</Label>
                <div>
                  <Checkbox
                    type="checkbox"
                    checked={currentNode.active}
                    onChange={handleStatusChange}
                  />
                  启用
                </div>
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <Label>选择 API</Label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Select
                    value={currentNode.apiId || ''}
                    onChange={handleApiChange}
                  >
                    <option value="">-- 请选择 API --</option>
                    {apis.map(api => (
                      <option key={api.NO} value={api.NO}>
                        {api.name} ({api.apiType || 'HTTP'})
                      </option>
                    ))}
                  </Select>
                </div>
              </FormGroup>
            </FormRow>
          </FormSection>
          
          {/* 传入参数面板 */}
          <CollapsiblePanel>
            <PanelHeader 
              isOpen={isInputPanelOpen}
              onClick={() => setIsInputPanelOpen(!isInputPanelOpen)}
            >
              <PanelTitle isOpen={isInputPanelOpen}>传入参数</PanelTitle>
            </PanelHeader>
            <PanelContent isOpen={isInputPanelOpen}>
              {renderVariableInputs()}
              
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <PrimaryButton
                  onClick={handleFetchApiData}
                  disabled={isLoadingApi || !currentNode.apiId}
                >
                  {isLoadingApi ? '获取中...' : '获取数据'}
                </PrimaryButton>
              </div>
            </PanelContent>
          </CollapsiblePanel>
          
          {/* 传出参数面板 */}
          <CollapsiblePanel>
            <PanelHeader 
              isOpen={isOutputPanelOpen}
              onClick={() => setIsOutputPanelOpen(!isOutputPanelOpen)}
            >
              <PanelTitle isOpen={isOutputPanelOpen}>传出参数</PanelTitle>
            </PanelHeader>
            <PanelContent isOpen={isOutputPanelOpen}>
              {renderFieldMappingTable()}
              
              <div style={{ marginTop: '10px' }}>
                <SecondaryButton onClick={handleAddFieldMapping}>
                  添加字段
                </SecondaryButton>
              </div>
            </PanelContent>
          </CollapsiblePanel>
          
          <ButtonGroup>
            <PrimaryButton 
              onClick={handleSave}
              disabled={isSaving || !currentNode.name || !currentNode.apiId}
            >
              {isSaving ? '保存中...' : '保存'}
            </PrimaryButton>
            
            <PrimaryButton 
              onClick={handleTest}
              disabled={isTesting || !currentNode.apiId}
            >
              {isTesting ? '测试中...' : '测试'}
            </PrimaryButton>
            
            <DangerButton 
              onClick={handleDelete}
              disabled={isDeleting || !currentNode.id}
            >
              {isDeleting ? '删除中...' : '删除'}
            </DangerButton>
          </ButtonGroup>
          
          {/* 测试结果和API响应面板保持不变 */}
          {testResult && (
            <TestResultPanel>
              <TestResultTitle>
                测试结果: {testResult.success ? '成功' : '失败'}
              </TestResultTitle>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>消息:</strong> {testResult.message}
              </div>
              
              {testResult.data && Object.keys(testResult.data).length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>提取的数据:</strong>
                  <TestResultContent>
                    {JSON.stringify(testResult.data, null, 2)}
                  </TestResultContent>
                </div>
              )}
              
              <div>
                <strong>测试日志:</strong>
                <TestResultContent>
                  {testResult.logs.join('\n')}
                </TestResultContent>
              </div>
            </TestResultPanel>
          )}
          
          {apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>
                API 响应结果: {apiResponse.success ? '成功' : '失败'}
              </ApiResponseTitle>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>状态:</strong> {apiResponse.success ? '成功' : '失败'}
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>消息:</strong> {apiResponse.message}
                {apiResponse.error && <div style={{ color: '#FF6666' }}>{apiResponse.error}</div>}
              </div>
              
              {apiResponse.data && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>响应数据:</strong>
                  <ApiResponseContent>
                    {JSON.stringify(apiResponse.data, null, 2)}
                  </ApiResponseContent>
                </div>
              )}
              
              {apiResponse.extractedFields && Object.keys(apiResponse.extractedFields).length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>提取的字段:</strong>
                  <ApiResponseContent>
                    {JSON.stringify(apiResponse.extractedFields, null, 2)}
                  </ApiResponseContent>
                  <div style={{ marginTop: '10px', color: '#F0B90B' }}>字段值详情:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #444444', color: '#AAAAAA' }}>字段名</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #444444', color: '#AAAAAA' }}>值</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #444444', color: '#AAAAAA' }}>类型</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(apiResponse.extractedFields).map(([key, value], index) => (
                        <tr key={index}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #444444' }}>{key}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #444444' }}>
                            {value === null 
                              ? '无数据' 
                              : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)
                            }
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #444444' }}>{value === null ? 'null' : typeof value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {apiResponse.logs && (
                <div>
                  <strong>API 交互过程:</strong>
                  <ApiResponseContent>
                    {apiResponse.logs.join('\n')}
                  </ApiResponseContent>
                </div>
              )}
            </ApiResponsePanel>
          )}
          
          {/* 添加单独的日志显示区域，即使没有API响应也能显示 */}
          {logs && logs.length > 0 && !apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>API 交互日志</ApiResponseTitle>
              <ApiResponseContent>
                {logs.join('\n')}
              </ApiResponseContent>
            </ApiResponsePanel>
          )}
          
          {apiResponseError && !apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>错误</ApiResponseTitle>
              <ApiResponseContent>
                <div style={{ color: '#FF6666' }}>{apiResponseError}</div>
              </ApiResponseContent>
            </ApiResponsePanel>
          )}
        </ConfigPanel>
      </ContentLayout>
      
      {/* 删除确认对话框保持不变 */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2A2A2A',
            padding: '20px',
            borderRadius: '5px',
            width: '400px'
          }}>
            <h3 style={{ color: '#F0B90B', marginTop: 0 }}>确认删除</h3>
            <p style={{ color: '#FFFFFF' }}>
              确定要删除数据采集节点 "{currentNode.name}" 吗？此操作不可恢复。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <SecondaryButton onClick={handleCancelDelete}>
                取消
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? '删除中...' : '确认删除'}
              </DangerButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default DataCollectionConfig; 
