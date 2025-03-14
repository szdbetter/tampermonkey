import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Database, DataCollectionConfigModel } from '../utils/database';
import { apiConfigAccess, ApiConfigModel } from '../services/database';
import { sendRequest, isTamperMonkeyEnvironment } from '../utils/tampermonkey';

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

// 数据采集节点模型
interface DataCollectionNodeModel {
  id?: number;
  name: string;
  active: boolean;
  apiId: number;
  apiName?: string;
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

const DataCollectionConfig: React.FC = () => {
  // 状态
  const [nodes, setNodes] = useState<DataCollectionNodeModel[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<DataCollectionNodeModel>({
    name: '',
    active: true,
    apiId: 0,
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
  
  // 更新 API ID 并自动加载字段映射
  const handleApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const apiId = parseInt(e.target.value);
    setCurrentNode({
      ...currentNode,
      apiId,
      apiName: apis.find(api => api.NO === apiId)?.name,
      fieldMappings: [] // 清空字段映射，等待从API配置中加载
    });
    
    // 自动加载字段映射
    if (apiId) {
      loadFieldMappingsFromApiConfig(apiId);
    }
    
    // 清空API响应
    setApiResponse(null);
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
  
  // 获取 API 数据
  const handleFetchApiData = async () => {
    if (!currentNode.apiId) {
      setMessage({
        text: '请选择 API',
        type: 'error'
      });
      return;
    }
    
    setIsLoadingApi(true);
    setApiResponse(null);
    
    try {
      // 获取选中的 API 配置
      const selectedApi = apis.find(api => api.NO === currentNode.apiId);
      
      if (!selectedApi) {
        throw new Error('未找到选中的 API 配置');
      }
      
      // 记录API交互过程
      const logs: string[] = [];
      logs.push(`[${new Date().toISOString()}] 开始调用 API: ${selectedApi.name}`);
      
      // 构建请求参数
      let apiUrl = selectedApi.baseUrl || '';
      
      // 验证 URL 格式
      if (!apiUrl || !apiUrl.trim()) {
        throw new Error('API URL 为空，请在 API 配置中设置有效的 baseUrl');
      }
      
      try {
        new URL(apiUrl);
      } catch (e) {
        throw new Error(`API URL 格式无效: ${apiUrl}`);
      }
      
      let method = selectedApi.method || 'GET';
      let headers: Record<string, string> = {};
      let body: string | null = null;
      
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
          const oldUrl = apiUrl;
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
      
      logs.push(`[${new Date().toISOString()}] 请求URL: ${apiUrl}`);
      logs.push(`[${new Date().toISOString()}] 请求方法: ${method}`);
      logs.push(`[${new Date().toISOString()}] 请求头: ${JSON.stringify(headers)}`);
      if (body) {
        logs.push(`[${new Date().toISOString()}] 请求体: ${body}`);
      }
      
      logs.push(`[${new Date().toISOString()}] 发送请求...`);
      logs.push(`[${new Date().toISOString()}] 注意: 如果遇到 CORS 问题，系统将自动尝试使用代理服务`);
      
      // 实际发送API请求
      let responseData: any;
      
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
        responseData = await sendRequest(
          apiUrl,
          method as 'GET' | 'POST',
          headers,
          body,
          30000 // 30秒超时
        );
        const endTime = Date.now();
        
        logs.push(`[${new Date().toISOString()}] 请求成功，耗时 ${endTime - startTime}ms`);
        
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        logs.push(`[${new Date().toISOString()}] 请求失败: ${errorMessage}`);
        
        // 添加更多调试信息
        logs.push(`[${new Date().toISOString()}] 调试信息:`);
        logs.push(`[${new Date().toISOString()}] - 浏览器: ${navigator.userAgent}`);
        logs.push(`[${new Date().toISOString()}] - TamperMonkey 环境: ${isTamperMonkeyEnvironment() ? '是' : '否'}`);
        
        // 尝试 ping 目标服务器
        logs.push(`[${new Date().toISOString()}] 尝试检查目标服务器是否可达...`);
        try {
          const urlObj = new URL(apiUrl);
          logs.push(`[${new Date().toISOString()}] 目标主机: ${urlObj.hostname}`);
          logs.push(`[${new Date().toISOString()}] 协议: ${urlObj.protocol}`);
          logs.push(`[${new Date().toISOString()}] 端口: ${urlObj.port || '默认'}`);
          logs.push(`[${new Date().toISOString()}] 路径: ${urlObj.pathname}`);
          
          // 提供解决方案建议
          logs.push(`[${new Date().toISOString()}] 可能的解决方案:`);
          logs.push(`[${new Date().toISOString()}] 1. 确认 URL 是否正确: ${apiUrl}`);
          logs.push(`[${new Date().toISOString()}] 2. 检查网络连接是否正常`);
          logs.push(`[${new Date().toISOString()}] 3. 系统已自动尝试使用代理服务，如果仍然失败，可能是目标服务器不允许任何形式的跨域请求`);
          logs.push(`[${new Date().toISOString()}] 4. 尝试在浏览器中直接访问该 URL 确认是否可以正常访问`);
        } catch (e) {
          logs.push(`[${new Date().toISOString()}] 无法解析 URL: ${e instanceof Error ? e.message : String(e)}`);
        }
        
        throw new Error(`请求失败: ${errorMessage}`);
      }
      
      // 提取映射字段的值（如果有）
      let extractedFields: Record<string, any> = {};
      if (currentNode.fieldMappings.length > 0) {
        logs.push(`[${new Date().toISOString()}] 开始提取映射字段...`);
        
        currentNode.fieldMappings.forEach(mapping => {
          try {
            // 从嵌套对象中获取值
            const value = getNestedValue(responseData, mapping.sourceField);
            extractedFields[mapping.targetField] = value;
            
            if (value === undefined) {
              logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在`);
            } else {
              logs.push(`[${new Date().toISOString()}] 提取字段 ${mapping.sourceField} -> ${mapping.targetField}: ${JSON.stringify(value)}`);
            }
          } catch (error) {
            logs.push(`[${new Date().toISOString()}] 提取字段 ${mapping.sourceField} 失败: ${error instanceof Error ? error.message : String(error)}`);
            extractedFields[mapping.targetField] = null;
          }
        });
        
        logs.push(`[${new Date().toISOString()}] 字段提取完成`);
      } else {
        logs.push(`[${new Date().toISOString()}] 未配置字段映射，跳过字段提取`);
        // 不再自动生成字段映射建议
      }
      
      logs.push(`[${new Date().toISOString()}] API调用完成`);
      
      // 设置API响应
      setApiResponse({
        success: true,
        message: '获取数据成功',
        data: responseData,
        logs: logs,
        extractedFields: Object.keys(extractedFields).length > 0 ? extractedFields : undefined
      });
      
      // 更新字段映射中的值
      setCurrentNode(prev => ({
        ...prev,
        // 不自动生成字段映射
      }));
    } catch (error) {
      console.error('获取 API 数据失败:', error);
      
      // 创建详细的错误日志
      const errorLogs: string[] = [];
      errorLogs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      
      // 添加更多调试信息
      if (currentNode.apiId) {
        const selectedApi = apis.find(api => api.NO === currentNode.apiId);
        if (selectedApi) {
          errorLogs.push(`[${new Date().toISOString()}] API 名称: ${selectedApi.name}`);
          errorLogs.push(`[${new Date().toISOString()}] API URL: ${selectedApi.baseUrl || '未设置'}`);
          errorLogs.push(`[${new Date().toISOString()}] API 方法: ${selectedApi.method || 'GET'}`);
        }
      }
      
      errorLogs.push(`[${new Date().toISOString()}] 浏览器: ${navigator.userAgent}`);
      errorLogs.push(`[${new Date().toISOString()}] TamperMonkey 环境: ${isTamperMonkeyEnvironment() ? '是' : '否'}`);
      
      // 提供解决方案建议
      errorLogs.push(`[${new Date().toISOString()}] 可能的解决方案:`);
      errorLogs.push(`[${new Date().toISOString()}] 1. 确认 API URL 是否正确`);
      errorLogs.push(`[${new Date().toISOString()}] 2. 检查网络连接是否正常`);
      errorLogs.push(`[${new Date().toISOString()}] 3. 系统已自动尝试使用代理服务，如果仍然失败，可能是目标服务器不允许任何形式的跨域请求`);
      errorLogs.push(`[${new Date().toISOString()}] 4. 尝试在浏览器中直接访问该 API URL 确认是否可以正常访问`);
      
      // 如果错误信息中包含 "Failed to fetch"，添加更具体的建议
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Failed to fetch')) {
        errorLogs.push(`[${new Date().toISOString()}] 对于 "Failed to fetch" 错误，可能的原因包括:`);
        errorLogs.push(`[${new Date().toISOString()}] - 网络连接问题`);
        errorLogs.push(`[${new Date().toISOString()}] - 目标服务器不可达`);
        errorLogs.push(`[${new Date().toISOString()}] - 请求的 URL 格式不正确`);
        errorLogs.push(`[${new Date().toISOString()}] - 浏览器安全策略阻止了请求`);
        errorLogs.push(`[${new Date().toISOString()}] - 系统已尝试使用多种代理服务，但均失败，这可能表明目标服务器有严格的访问控制`);
      }
      
      setApiResponse({
        success: false,
        message: '获取数据失败',
        error: error instanceof Error ? error.message : String(error),
        logs: errorLogs
      });
    } finally {
      setIsLoadingApi(false);
    }
  };
  
  // 从嵌套对象中获取值
  const getNestedValue = (obj: any, path: string): any => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[key];
    }
    
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
      let apiUrl = selectedApi.baseUrl || '';
      
      // 验证 URL 格式
      if (!apiUrl || !apiUrl.trim()) {
        throw new Error('API URL 为空，请在 API 配置中设置有效的 baseUrl');
      }
      
      try {
        new URL(apiUrl);
      } catch (e) {
        throw new Error(`API URL 格式无效: ${apiUrl}`);
      }
      
      let method = selectedApi.method || 'GET';
      let headers: Record<string, string> = {};
      let body: string | null = null;
      
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
          const oldUrl = apiUrl;
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
      
      logs.push(`[${new Date().toISOString()}] 请求URL: ${apiUrl}`);
      logs.push(`[${new Date().toISOString()}] 请求方法: ${method}`);
      logs.push(`[${new Date().toISOString()}] 请求头: ${JSON.stringify(headers)}`);
      if (body) {
        logs.push(`[${new Date().toISOString()}] 请求体: ${body}`);
      }
      
      logs.push(`[${new Date().toISOString()}] 发送请求...`);
      logs.push(`[${new Date().toISOString()}] 注意: 如果遇到 CORS 问题，系统将自动尝试使用代理服务`);
      
      // 实际发送API请求
      let responseData: any;
      
      try {
        // 检查是否在 TamperMonkey 环境中
        const isTM = isTamperMonkeyEnvironment();
        if (isTM) {
          logs.push(`[${new Date().toISOString()}] 检测到 TamperMonkey 环境，使用 GM_xmlhttpRequest 发送请求`);
        } else {
          logs.push(`[${new Date().toISOString()}] 未检测到 TamperMonkey 环境，将使用 fetch API`);
        }
        
        // 使用工具函数发送请求
        const startTime = Date.now();
        responseData = await sendRequest(
          apiUrl,
          method as 'GET' | 'POST',
          headers,
          body,
          30000 // 30秒超时
        );
        const endTime = Date.now();
        
        logs.push(`[${new Date().toISOString()}] 请求成功，耗时 ${endTime - startTime}ms`);
        
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
          const value = getNestedValue(responseData, mapping.sourceField);
          extractedData[mapping.targetField] = value;
          
          if (value === undefined) {
            logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在`);
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
    
    return (
      <FieldMappingTable>
        <thead>
          <tr>
            <TableHeader>源字段</TableHeader>
            <TableHeader>目标字段</TableHeader>
            <TableHeader>描述</TableHeader>
            <TableHeader>值</TableHeader>
            <TableHeader>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {currentNode.fieldMappings.map((mapping, index) => (
            <tr key={index}>
              <TableCell>
                <Input
                  value={mapping.sourceField}
                  onChange={(e) => handleFieldMappingChange(index, 'sourceField', e.target.value)}
                  placeholder="data.result.price"
                />
              </TableCell>
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
                {mapping.targetField in extractedValues ? (
                  <div style={{ 
                    maxWidth: '200px', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: extractedValues[mapping.targetField] === null ? '#FF6666' : '#66CCFF',
                    padding: '8px 0'
                  }}>
                    {extractedValues[mapping.targetField] === null 
                      ? '未找到' 
                      : JSON.stringify(extractedValues[mapping.targetField])}
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
          ))}
        </tbody>
      </FieldMappingTable>
    );
  };
  
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
                API: {node.apiName || '未选择'}
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
                        {api.name}
                      </option>
                    ))}
                  </Select>
                  
                  <PrimaryButton
                    onClick={handleFetchApiData}
                    disabled={isLoadingApi || !currentNode.apiId}
                  >
                    {isLoadingApi ? '获取中...' : '获取数据'}
                  </PrimaryButton>
                </div>
              </FormGroup>
            </FormRow>
          </FormSection>
          
          <FormSection>
            <SectionTitle>传出字段映射</SectionTitle>
            
            {renderFieldMappingTable()}
          </FormSection>
          
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
          
          {/* 将 API 响应结果移到页面最下方 */}
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
        </ConfigPanel>
      </ContentLayout>
      
      {/* 删除确认对话框 */}
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