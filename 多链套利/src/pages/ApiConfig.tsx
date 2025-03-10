import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { 
  apiConfigAccess, 
  ApiConfigModel, 
  exchangeConfigAccess, 
  ExchangeConfigModel,
  tokenConfigAccess,
  TokenConfigModel,
  ChainConfigModel,
  chainConfigAccess
} from '../services/database';
import { initDatabase, initSampleData } from '../services/database';
import { keccak256 } from 'js-sha3'; // 导入keccak256哈希函数

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

const ApiList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const ApiListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
`;

const ApiItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const ApiName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const ExchangeName = styled.div`
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

const CollapsibleSection = styled.div`
  margin-bottom: 20px;
`;

const CollapsibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #2A2A2A;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #333333;
  }
`;

const CollapsibleTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #F0B90B;
`;

const CollapsibleContent = styled.div<{ isOpen: boolean }>`
  padding: ${props => props.isOpen ? '15px' : '0'};
  max-height: ${props => props.isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: ${props => props.isOpen ? '1' : '0'};
  border: ${props => props.isOpen ? '1px solid #444444' : 'none'};
  border-top: none;
  border-radius: 0 0 4px 4px;
`;

const CollapsibleIcon = styled.span`
  font-size: 18px;
  transition: transform 0.3s ease;
  
  &.open {
    transform: rotate(180deg);
  }
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  resize: vertical;
  min-height: 120px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled.select`
  width: 100%;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  background-color: ${props => {
    switch(props.variant) {
      case 'primary': return '#F0B90B';
      case 'secondary': return '#444444';
      case 'danger': return '#AA0000';
      default: return '#F0B90B';
    }
  }};
  
  color: ${props => {
    switch(props.variant) {
      case 'primary': return '#000000';
      case 'secondary': return '#FFFFFF';
      case 'danger': return '#FFFFFF';
      default: return '#000000';
    }
  }};
  
  &:hover {
    background-color: ${props => {
      switch(props.variant) {
        case 'primary': return '#d6a50a';
        case 'secondary': return '#555555';
        case 'danger': return '#cc0000';
        default: return '#d6a50a';
      }
    }};
  }
`;

const ErrorMessage = styled.div`
  color: #FF0000;
  background-color: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: #AAAAAA;
  font-size: 16px;
`;

const ApiItems = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const InfoLabel = styled.div`
  width: 120px;
  color: #AAAAAA;
`;

const InfoValue = styled.div`
  flex: 1;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #333333;
  border-radius: 4px;
  margin-bottom: 10px;
  align-items: center;
`;

const FieldInput = styled.div`
  flex: 1;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #FF0000;
  font-size: 16px;
`;

const AddButton = styled.button`
  background-color: transparent;
  color: #F0B90B;
  border: 1px dashed #F0B90B;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: rgba(240, 185, 11, 0.1);
  }
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

const ResultContainer = styled.div<{ success: boolean }>`
  background-color: ${props => props.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
  border: 1px solid ${props => props.success ? '#00800080' : '#ff000080'};
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  max-height: 300px;
  overflow: auto;
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${props => props.success ? '#FFFFFF' : '#FF6B6B'};
    font-family: monospace;
    font-size: 12px;
  }
`;

const DetailItem = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const DetailLabel = styled.div`
  width: 120px;
  color: #AAAAAA;
`;

const DetailValue = styled.div`
  flex: 1;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
`;

const SearchInput = styled.input`
  background: none;
  border: none;
  outline: none;
  color: #FFFFFF;
  font-size: 14px;
  flex: 1;
`;

const SearchIcon = styled.div`
  color: #AAAAAA;
  font-size: 16px;
`;

const CustomFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #2A2A2A;
  border-radius: 4px;
  padding: 10px;
`;

const CustomFieldItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background-color: #333333;
`;

const CustomFieldName = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
  color: #F0B90B;
`;

const CustomFieldValue = styled.div<{ success: boolean }>`
  font-family: monospace;
  padding: 4px;
  background-color: ${props => props.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
  border-radius: 2px;
  color: ${props => props.success ? '#FFFFFF' : '#FF6B6B'};
`;

const ErrorContainer = styled.div`
  background-color: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
`;

const SuccessContainer = styled.div`
  background-color: rgba(0, 128, 0, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
`;

const ProxyToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const SuggestionContainer = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: #333333;
  border-radius: 4px;
`;

const SuggestionTitle = styled.h5`
  margin-bottom: 10px;
  color: #F0B90B;
`;

const SuggestionList = styled.ul`
  list-style: none;
  padding: 0;
`;

const SuggestionItem = styled.li`
  cursor: pointer;
  color: #F0B90B;
  margin-bottom: 5px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ArrayValueContainer = styled.div`
  margin-top: 5px;
  padding: 5px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #333333;
`;

const ArrayValueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
`;

const ArrayValueList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 5px;
  max-height: 100px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
  
  &:not(.expanded) {
    max-height: 100px;
    overflow-y: hidden;
  }
  
  &.expanded {
    max-height: 300px;
  }
`;

const ArrayValueItem = styled.li`
  margin-bottom: 5px;
`;

const ArrayValueIndex = styled.span`
  font-weight: bold;
  margin-right: 5px;
`;

const ArrayValueContent = styled.span`
  font-family: monospace;
  padding: 4px;
  background-color: #2A2A2A;
  border-radius: 2px;
  color: #FFFFFF;
`;

const ArrayToggle = styled.span`
  cursor: pointer;
  color: #AAAAAA;
  font-size: 12px;
`;

// 添加哈希计算相关的样式组件
const HashCalculatorContainer = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #2A2A2A;
  border-radius: 4px;
  border: 1px solid #444444;
`;

const HashTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #F0B90B;
`;

const HashInputRow = styled.div`
  display: flex;
  margin-bottom: 10px;
  gap: 10px;
`;

const HashInput = styled.input`
  flex: 1;
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

const HashSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const HashButton = styled.button`
  padding: 8px 15px;
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #d6a50a;
  }
  
  &:disabled {
    background-color: #5a5a5a;
    cursor: not-allowed;
  }
`;

const HashResult = styled.div`
  margin-top: 10px;
  word-break: break-all;
  font-family: monospace;
  padding: 10px;
  background-color: #1A1A1A;
  border-radius: 4px;
  border: 1px solid #333333;
`;

const HashVerification = styled.div<{ isValid: boolean }>`
  margin-top: 10px;
  padding: 8px;
  border-radius: 4px;
  background-color: ${props => props.isValid ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
  color: ${props => props.isValid ? '#00FF00' : '#FF0000'};
  font-weight: bold;
  text-align: center;
`;

// 预设API配置
const PRESET_APIS = [
  {
    name: "Binance 价格API",
    baseUrl: "https://api.binance.com/api/v3/ticker/price",
    fieldMappings: [
      { customName: "symbol", displayName: "交易对", jsonPath: "symbol" },
      { customName: "price", displayName: "价格", jsonPath: "price" }
    ]
  },
  {
    name: "Ethereum Gas API",
    baseUrl: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
    fieldMappings: [
      { customName: "fastGas", displayName: "快速Gas价格", jsonPath: "result.FastGasPrice" },
      { customName: "standardGas", displayName: "标准Gas价格", jsonPath: "result.ProposeGasPrice" },
      { customName: "slowGas", displayName: "慢速Gas价格", jsonPath: "result.SafeGasPrice" }
    ]
  }
];

const ApiConfig: React.FC = () => {
  const [apis, setApis] = useState<ApiConfigModel[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeConfigModel[]>([]);
  const [tokens, setTokens] = useState<TokenConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedApi, setSelectedApi] = useState<ApiConfigModel | null>(null);
  const [editedApi, setEditedApi] = useState<ApiConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, data: any} | null>(null);
  const [testVariables, setTestVariables] = useState<{[key: string]: string}>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [useProxyToggle, setUseProxyToggle] = useState(false);
  
  // 折叠状态
  const [isApiKeySectionOpen, setIsApiKeySectionOpen] = useState(false);
  const [isExchangeSectionOpen, setIsExchangeSectionOpen] = useState(false);
  const [isFieldMappingSectionOpen, setIsFieldMappingSectionOpen] = useState(true);
  const [isHashCalculatorOpen, setIsHashCalculatorOpen] = useState(false); // 哈希计算器折叠状态，默认收缩
  
  // 添加哈希计算相关的状态
  const [hashInput, setHashInput] = useState('');
  const [hashResult, setHashResult] = useState('');
  const [hashVerification, setHashVerification] = useState('');
  const [isHashValid, setIsHashValid] = useState(false);
  const [selectedField, setSelectedField] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null); // 清除之前的错误
        
        console.log("ApiConfig: 开始加载数据...");
        
        // 确保数据库已初始化
        const db = await initDatabase();
        console.log("ApiConfig: 数据库初始化完成", db);
        
        // 初始化示例数据（如果需要）
        await initSampleData();
        
        // 获取API数据
        console.log("ApiConfig: 正在获取API数据...");
        const apisData = await apiConfigAccess.getAll();
        console.log("ApiConfig: 获取到API数据", apisData);
        setApis(apisData);
        
        // 获取交易所数据
        console.log("ApiConfig: 正在获取交易所数据...");
        const exchangesData = await exchangeConfigAccess.getAll();
        console.log("ApiConfig: 获取到交易所数据", exchangesData);
        setExchanges(exchangesData);
        
        // 获取Token数据
        console.log("ApiConfig: 正在获取Token数据...");
        const tokensData = await tokenConfigAccess.getAll();
        console.log("ApiConfig: 获取到Token数据", tokensData);
        setTokens(tokensData);
        
        // 获取链配置数据
        console.log("ApiConfig: 正在获取链配置数据...");
        const chainsData = await chainConfigAccess.getAll();
        console.log("ApiConfig: 获取到链配置数据", chainsData);
        setChains(chainsData);
        
        // 如果有API数据且没有选中的API，默认选择第一个
        if (apisData.length > 0 && !selectedApi) {
          setSelectedApi(apisData[0]);
        }
        
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setError('加载数据失败: ' + (err instanceof Error ? err.message : String(err)));
        console.error('加载API配置数据失败:', err);
      }
    };
    
    loadData();
  }, [selectedApi]);
  
  // 监听 editedApi 变化，更新变量
  useEffect(() => {
    if (editedApi) {
      updateDetectedVariables();
    }
  }, [editedApi?.baseUrl, editedApi?.payload, editedApi?.method]);
  
  // 验证API名称唯一性
  const validateApiUniqueness = async (api: ApiConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有API
    const allApis = await apiConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allApis.some(a => 
      a.name.toLowerCase() === api.name.toLowerCase() && 
      (isNew || a.NO !== api.NO)
    );
    
    if (nameExists) {
      return `API名称 "${api.name}" 已存在，请使用其他名称`;
    }
    
    return null;
  };
  
  // 处理预设API选择
  const handlePresetApiSelect = (preset: typeof PRESET_APIS[0]) => {
    if (editedApi) {
      setEditedApi({
        ...editedApi,
        name: preset.name,
        baseUrl: preset.baseUrl,
        fieldMappings: preset.fieldMappings ? [...preset.fieldMappings] : undefined
      });
      
      // 延迟更新变量，确保 editedApi 已经更新
      setTimeout(updateDetectedVariables, 100);
    }
  };
  
  // 选择API
  const handleApiSelect = (api: ApiConfigModel) => {
    setSelectedApi(api);
    setIsEditing(false);
    // 清空测试结果和测试变量
    setTestResult(null);
    setTestVariables({});
    setError(null);
  };
  
  // 添加API
  const handleAddApi = () => {
    // 创建新的API配置
    const newApi: ApiConfigModel = {
      name: '',
      baseUrl: '',
      method: 'GET',
      active: true,
      fieldMappings: []
    };
    
    setSelectedApi(null);
    setEditedApi(newApi);
    setIsEditing(true);
    setTestResult(null);
    setTestVariables({});
    setError(null);
    
    // 重置折叠状态
    setIsApiKeySectionOpen(false);
    setIsExchangeSectionOpen(false);
    setIsFieldMappingSectionOpen(true);
    setIsHashCalculatorOpen(false); // 确保哈希计算器默认收缩
    
    // 清空变量列表
    setDetectedVariables([]);
  };
  
  // 编辑API
  const handleEditApi = () => {
    if (!selectedApi) return;
    
    // 创建一个深拷贝，避免直接修改selectedApi
    setEditedApi(JSON.parse(JSON.stringify(selectedApi)));
    
    // 如果有保存的自定义变量值，加载它们
    if (selectedApi.customVariables) {
      setTestVariables(selectedApi.customVariables);
    } else {
      setTestVariables({});
    }
    
    setIsEditing(true);
    setTestResult(null);
    setError(null);
    
    // 重置折叠状态
    setIsApiKeySectionOpen(false);
    setIsExchangeSectionOpen(false);
    setIsFieldMappingSectionOpen(true);
    setIsHashCalculatorOpen(false); // 确保哈希计算器默认收缩
    
    // 延迟更新变量，确保 editedApi 已经设置
    setTimeout(updateDetectedVariables, 100);
  };
  
  // 保存API
  const handleSaveApi = async () => {
    if (!editedApi) return;
    
    // 验证必填字段
    if (!editedApi.name.trim()) {
      setError('API名称不能为空');
      return;
    }
    
    if (!editedApi.baseUrl.trim()) {
      setError('API基础URL不能为空');
      return;
    }
    
    // 验证字段映射（如果有）
    if (editedApi.fieldMappings && editedApi.fieldMappings.length > 0) {
      for (const mapping of editedApi.fieldMappings) {
        if (!mapping.customName.trim()) {
          setError('自定义字段名不能为空');
          return;
        }
        
        if (!mapping.displayName.trim()) {
          setError('显示名称不能为空');
          return;
        }
        
        if (!mapping.jsonPath.trim()) {
          setError('JSON路径不能为空');
          return;
        }
      }
    }
    
    try {
      // 验证API名称唯一性
      const validationError = await validateApiUniqueness(editedApi, !editedApi.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      // 保存用户输入的自定义变量值
      // 将testVariables保存到editedApi中
      if (Object.keys(testVariables).length > 0) {
        editedApi.customVariables = testVariables;
      }
      
      let savedApiNo: number;
      
      // 如果是新API（没有NO字段），则创建新记录
      if (!editedApi.NO) {
        savedApiNo = await apiConfigAccess.create(editedApi);
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 查找并选择新创建的API
        const newApi = updatedApis.find(a => a.NO === savedApiNo);
        if (newApi) {
          setSelectedApi(newApi);
        }
      } else {
        // 如果是编辑现有API，则更新记录
        await apiConfigAccess.update(editedApi.NO, editedApi);
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 更新选中的API
        const updatedApi = updatedApis.find(a => a.NO === editedApi.NO);
        if (updatedApi) {
          setSelectedApi(updatedApi);
        }
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save API:', err);
      setError('保存API失败，请检查输入数据');
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedApi(null);
    
    // 如果是新建的API且尚未保存，则清除选中状态
    if (selectedApi && !selectedApi.NO) {
      setSelectedApi(apis.length > 0 ? apis[0] : null);
    }
  };
  
  // 删除API
  const handleDeleteApi = async () => {
    if (!selectedApi || !selectedApi.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedApi.name} 吗？`)) {
      try {
        await apiConfigAccess.delete(selectedApi.NO);
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 如果还有API，选择第一个；否则清空选择
        if (updatedApis.length > 0) {
          setSelectedApi(updatedApis[0]);
        } else {
          setSelectedApi(null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to delete API:', err);
        setError('删除API失败');
      }
    }
  };
  
  // 切换API状态
  const handleToggleStatus = async (api: ApiConfigModel) => {
    try {
      const updatedApi = { ...api, active: !api.active };
      
      // 更新数据库
      await apiConfigAccess.update(api.NO!, updatedApi);
      
      // 刷新列表
      const updatedApis = await apiConfigAccess.getAll();
      setApis(updatedApis);
      
      // 如果当前选中的是被修改的API，更新选中状态
      if (selectedApi && selectedApi.NO === api.NO) {
        setSelectedApi(updatedApi);
      }
    } catch (err) {
      console.error('切换API状态失败', err);
      setError('切换API状态失败');
    }
  };
  
  // 提取URL或Payload中的变量
  const extractVariables = (text: string) => {
    if (!text) return [];
    
    // 修改正则表达式，使用()作为变量标识符，包括双引号内的变量
    // 例如："sellToken":"(sellToken)" 中的 (sellToken)
    const regex = /\(([^()]+)\)/g;
    const matches = text.match(regex) || [];
    
    // 提取变量名，不再过滤appData相关的匹配
    // 因为现在我们需要检测到如 "appDataHash": "(appData)" 这样的变量
    return matches.map(match => match.slice(1, -1));
  };
  
  // 替换URL或Payload中的变量
  const replaceVariables = (text: string, variables: Record<string, string>) => {
    if (!text) return text;
    
    // 创建一个新的文本副本
    let result = text;
    
    // 处理普通变量替换，使用()作为变量标识符，包括双引号内的变量
    Object.entries(variables).forEach(([key, value]) => {
      // 创建一个正则表达式，匹配包括在双引号内的变量
      // 例如："sellToken":"(sellToken)" 中的 (sellToken)
      const regex = new RegExp(`\\(${key}\\)`, 'g');
      
      // 如果变量值是地址或数字，直接替换
      // 如果是在双引号内的变量，需要保留双引号
      if (result.includes(`"(${key})"`)) {
        // 在双引号内的变量，例如："(sellToken)"
        const quotedRegex = new RegExp(`"\\(${key}\\)"`, 'g');
        // 如果值看起来像地址（0x开头），不添加额外的引号
        if (value.startsWith('0x')) {
          result = result.replace(quotedRegex, `"${value}"`);
        } else {
          // 尝试解析为数字，如果是数字则不添加引号
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            result = result.replace(quotedRegex, `${numValue}`);
          } else {
            result = result.replace(quotedRegex, `"${value}"`);
          }
        }
      }
      
      // 处理非双引号内的变量
      result = result.replace(regex, value);
    });
    
    return result;
  };
  
  // 实时解析并更新变量列表
  const updateDetectedVariables = () => {
    if (!editedApi) return;
    
    // 提取URL中的变量
    const urlVariables = extractVariables(editedApi.baseUrl);
    
    // 提取Payload中的变量（如果有）
    const payloadVariables = editedApi.method === 'POST' && editedApi.payload 
      ? extractVariables(editedApi.payload) 
      : [];
    
    // 合并所有变量并去重
    const allVariables = Array.from(new Set([...urlVariables, ...payloadVariables]));
    
    // 更新检测到的变量列表
    setDetectedVariables(allVariables);
    
    // 初始化新变量的值
    const updatedVariables = { ...testVariables };
    let hasNewVariables = false;
    
    allVariables.forEach(variable => {
      if (!(variable in updatedVariables)) {
        updatedVariables[variable] = '';
        hasNewVariables = true;
      }
    });
    
    // 如果有新变量，更新测试变量对象
    if (hasNewVariables) {
      setTestVariables(updatedVariables);
    }
    
    // 调试输出，帮助排查问题
    console.log('检测到的变量:', allVariables);
    console.log('URL变量:', urlVariables);
    console.log('Payload变量:', payloadVariables);
  };
  
  // 测试API
  const handleTestApi = async () => {
    if (!editedApi) return;
    
    try {
      setIsTesting(true);
      setError(null);
      setTestResult(null);
      
      // 检查是否所有变量都有值
      const missingVariables = detectedVariables.filter(variable => 
        !testVariables[variable] || testVariables[variable].trim() === ''
      );
      
      if (missingVariables.length > 0) {
        setError(`请为以下变量设置测试值: ${missingVariables.join(', ')}`);
        setIsTesting(false);
        return;
      }
      
      // 替换URL和Payload中的变量
      const targetUrl = replaceVariables(editedApi.baseUrl, testVariables);
      const payload = editedApi.method === 'POST' && editedApi.payload 
        ? replaceVariables(editedApi.payload, testVariables) 
        : undefined;
      
      // 准备请求头和选项
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      };
      
      // 如果有API密钥，添加到请求头
      if (editedApi.apiKey) {
        headers['Authorization'] = `Bearer ${editedApi.apiKey}`;
      }
      
      // 使用本地代理服务器 (可以通过 useProxyToggle 状态切换)
      const useLocalProxy = useProxyToggle;
      
      if (useLocalProxy) {
        // 通过本地后端服务转发请求
        await handleLocalProxyRequest(targetUrl, editedApi.method, headers, payload);
      } else {
        // 直接请求（可能会遇到CORS问题）
        try {
          // 准备请求选项
          const options: RequestInit = {
            method: editedApi.method,
            headers,
            mode: 'cors',
            credentials: 'omit',
          };
          
          // 如果是POST请求且有payload，添加body
          if (editedApi.method === 'POST' && payload) {
            options.body = payload;
          }
          
          console.log('直接发送API测试请求:', { url: targetUrl, options });
          
          // 直接尝试请求目标URL
          const response = await fetch(targetUrl, options);
          
          // 处理响应
          await handleApiResponse(response, targetUrl, editedApi);
        } catch (fetchError) {
          console.error('API请求失败:', fetchError);
          
          // 处理跨域错误
          if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
            handleCorsError(targetUrl, fetchError);
          } else {
            // 处理其他错误
            setTestResult({
              success: false,
              data: {
                error: '请求失败',
                message: fetchError instanceof Error ? fetchError.message : String(fetchError),
                details: '请检查网络连接和API地址是否正确'
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('测试API过程中发生错误', err);
      setTestResult({
        success: false,
        data: {
          error: '测试过程中发生错误',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // 通过本地后端服务转发请求
  const handleLocalProxyRequest = async (
    targetUrl: string, 
    method: string, 
    headers: Record<string, string>, 
    payload?: string
  ) => {
    try {
      // 构建代理请求URL
      // 假设本地服务在localhost:3000上，并有一个/api/proxy端点用于转发请求
      const proxyUrl = 'http://localhost:3000/api/proxy';
      
      console.log('通过本地代理发送请求:', { 
        proxyUrl, 
        targetUrl, 
        method, 
        headers, 
        payload 
      });
      
      // 构建代理请求体
      const proxyRequestBody = {
        url: targetUrl,
        method,
        headers,
        body: payload
      };
      
      // 发送请求到本地代理服务
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyRequestBody)
      });
      
      // 检查代理响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`代理请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // 解析代理响应
      const proxyResponse = await response.json();
      
      // 创建模拟的Response对象
      const mockResponse = new Response(
        JSON.stringify(proxyResponse.data),
        {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: new Headers(proxyResponse.headers)
        }
      );
      
      // 处理响应
      await handleApiResponse(mockResponse, targetUrl, editedApi!, proxyUrl);
    } catch (error) {
      console.error('本地代理请求失败:', error);
      
      setTestResult({
        success: false,
        data: {
          error: '本地代理请求失败',
          message: error instanceof Error ? error.message : String(error),
          solutions: [
            '1. 确保本地后端服务正在运行 (localhost:3000)',
            '2. 确保后端服务实现了 /api/proxy 端点',
            '3. 检查后端代理服务的日志以获取更多信息'
          ],
          details: {
            proxyUrl: 'http://localhost:3000/api/proxy',
            targetUrl,
            recommendation: '您需要在后端服务中实现一个代理端点来转发API请求'
          }
        }
      });
    }
  };
  
  // 处理API响应
  const handleApiResponse = async (response: Response, targetUrl: string, api: ApiConfigModel, proxyUrl?: string) => {
    // 尝试解析响应为JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // 如果不是JSON，则获取文本内容
      const text = await response.text();
      data = { text, contentType };
    }
    
    // 提取自定义字段的值
    const customFields: Record<string, any> = {};
    if (api.fieldMappings && api.fieldMappings.length > 0) {
      try {
        // 确保 data 是对象
        const jsonData = typeof data === 'object' ? data : 
                        (typeof data === 'string' ? JSON.parse(data) : {});
        
        // 查找整个响应中的所有字段名称，用于智能建议
        const allFieldPaths = findAllFieldPaths(jsonData);
        
        // 使用 jsonPath 提取字段值
        api.fieldMappings.forEach(mapping => {
          try {
            // 尝试使用用户提供的 jsonPath 获取值
            const value = getValueByJsonPath(jsonData, mapping.jsonPath);
            
            if (value !== undefined) {
              // 成功找到值
              customFields[mapping.customName] = {
                displayName: mapping.displayName,
                value: value
              };
            } else {
              // 未找到值，尝试智能建议
              const fieldName = mapping.jsonPath.split('.').pop() || '';
              const suggestions = findSuggestions(allFieldPaths, fieldName);
              
              customFields[mapping.customName] = {
                displayName: mapping.displayName,
                value: '未找到',
                suggestions: suggestions.length > 0 ? suggestions : undefined
              };
            }
          } catch (e) {
            customFields[mapping.customName] = {
              displayName: mapping.displayName,
              value: '解析错误',
              error: e instanceof Error ? e.message : String(e)
            };
          }
        });
      } catch (e) {
        console.error('提取自定义字段时出错:', e);
      }
    }
    
    // 提取重要的响应头
    const responseHeaders = {
      'content-type': response.headers.get('content-type') || '',
      'content-length': response.headers.get('content-length') || '',
      'cache-control': response.headers.get('cache-control') || '',
      'access-control-allow-origin': response.headers.get('access-control-allow-origin') || ''
    };
    
    // 设置测试结果
    setTestResult({
      success: response.ok,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        originalUrl: targetUrl,
        proxyUrl: proxyUrl,
        data
      }
    });
  };
  
  // 根据 JSON 路径获取值
  const getValueByJsonPath = (obj: any, path: string): any => {
    // 检查是否包含数组通配符 [*]
    if (path.includes('[*]')) {
      // 处理数组通配符
      return getArrayValues(obj, path);
    }
    
    // 处理普通路径（单个值）
    // 处理数组索引，例如 data[0].address
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const parts = normalizedPath.split('.');
    
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // 处理数组
      if (Array.isArray(current) && !isNaN(Number(part))) {
        const index = Number(part);
        current = current[index];
        continue;
      }
      
      // 处理对象
      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // 特殊处理：如果当前是数组且包含对象，尝试在第一个元素中查找
        if (Array.isArray(current) && current.length > 0 && typeof current[0] === 'object') {
          // 例如，用户写了 data.address，但实际是 data[0].address
          current = current[0][part];
        } else {
          return undefined;
        }
      }
    }
    
    return current;
  };
  
  // 获取数组中所有元素的特定字段值
  const getArrayValues = (obj: any, path: string): any[] => {
    // 将路径拆分为前缀、通配符和后缀
    // 例如：data[*].address 拆分为 data、[*]、address
    const match = path.match(/(.+?)\[\*\](.+)/);
    if (!match) return [];
    
    const [_, prefix, suffix] = match;
    
    // 获取数组
    const array = getValueByJsonPath(obj, prefix);
    if (!Array.isArray(array)) return [];
    
    // 从每个数组元素中提取字段值
    const results = array.map((item, index) => {
      // 构建每个元素的完整路径
      const itemPath = `${prefix}[${index}]${suffix}`;
      return getValueByJsonPath(obj, itemPath);
    }).filter(value => value !== undefined);
    
    return results;
  };
  
  // 查找整个响应中的所有字段路径
  const findAllFieldPaths = (obj: any, prefix = ''): string[] => {
    if (obj === null || obj === undefined) {
      return [];
    }
    
    const paths: string[] = [];
    
    if (Array.isArray(obj)) {
      // 对于数组，我们只处理第一个元素作为示例
      if (obj.length > 0) {
        const arrayPaths = findAllFieldPaths(obj[0], `${prefix}[0]`);
        paths.push(...arrayPaths);
      }
    } else if (typeof obj === 'object') {
      // 对于对象，遍历所有属性
      for (const key in obj) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        paths.push(newPrefix);
        
        const nestedPaths = findAllFieldPaths(obj[key], newPrefix);
        paths.push(...nestedPaths);
      }
    }
    
    return paths;
  };
  
  // 查找字段名称的建议路径
  const findSuggestions = (allPaths: string[], fieldName: string): string[] => {
    // 查找包含字段名的路径
    const suggestions = allPaths.filter(path => {
      const parts = path.split('.');
      const lastPart = parts[parts.length - 1];
      return lastPart === fieldName || lastPart.endsWith(`]${fieldName}`);
    });
    
    // 添加数组通配符建议
    const arrayPatterns = new Set<string>();
    suggestions.forEach(path => {
      // 检查路径中是否包含数组索引，例如 data[0].address
      const match = path.match(/(.+?\[)(\d+)(\].+)/);
      if (match) {
        // 将数字索引替换为通配符 *
        const [_, prefix, __, suffix] = match;
        const wildcardPath = `${prefix}*${suffix}`;
        arrayPatterns.add(wildcardPath);
      }
    });
    
    // 合并普通建议和通配符建议
    const allSuggestions = [...suggestions, ...Array.from(arrayPatterns)];
    
    // 限制建议数量，但确保通配符建议优先显示
    const wildcardSuggestions = allSuggestions.filter(s => s.includes('[*]'));
    const normalSuggestions = allSuggestions.filter(s => !s.includes('[*]'));
    
    return [...wildcardSuggestions, ...normalSuggestions].slice(0, 5);
  };
  
  // 处理跨域错误
  const handleCorsError = (targetUrl: string, error: Error) => {
    setTestResult({
      success: false,
      data: {
        error: '跨域请求失败 (CORS)',
        message: '由于浏览器的安全限制，无法直接访问外部API。',
        solutions: [
          '1. 在API服务器端添加CORS头: Access-Control-Allow-Origin: *',
          '2. 使用后端代理转发请求',
          '3. 在开发环境中配置代理服务器',
          '4. 使用浏览器插件临时禁用CORS限制（仅用于测试）'
        ],
        details: {
          url: targetUrl,
          errorMessage: error.message,
          recommendation: '建议在项目中添加一个代理服务器来转发API请求'
        }
      }
    });
  };
  
  // 添加字段映射
  const handleAddFieldMapping = () => {
    if (editedApi) {
      setEditedApi({
        ...editedApi,
        fieldMappings: [
          ...(editedApi.fieldMappings || []),
          { customName: '', displayName: '', jsonPath: '' }
        ]
      });
    }
  };
  
  // 删除字段映射
  const handleRemoveFieldMapping = (index: number) => {
    if (editedApi) {
      const updatedMappings = [...(editedApi.fieldMappings || [])];
      updatedMappings.splice(index, 1);
      
      setEditedApi({
        ...editedApi,
        fieldMappings: updatedMappings
      });
    }
  };
  
  // 修改字段映射
  const handleFieldMappingChange = (index: number, field: string, value: string) => {
    if (editedApi) {
      const updatedMappings = [...(editedApi.fieldMappings || [])];
      updatedMappings[index] = {
        ...updatedMappings[index],
        [field]: value
      };
      
      setEditedApi({
        ...editedApi,
        fieldMappings: updatedMappings
      });
    }
  };
  
  // 获取交易所名称
  const getExchangeName = (exchangeId?: number): string => {
    if (!exchangeId) return '无';
    
    const exchange = exchanges.find(e => e.NO === exchangeId);
    return exchange ? exchange.name : `交易所ID: ${exchangeId}`;
  };
  
  // 计算Keccak-256哈希
  const calculateHash = () => {
    try {
      let inputToHash = hashInput;
      
      // 如果选择了字段，则使用该字段的值
      if (selectedField && editedApi?.payload) {
        try {
          const payloadObj = JSON.parse(editedApi.payload);
          if (payloadObj[selectedField] !== undefined) {
            inputToHash = typeof payloadObj[selectedField] === 'string' 
              ? payloadObj[selectedField] 
              : JSON.stringify(payloadObj[selectedField]);
          }
        } catch (error) {
          console.error('解析Payload失败:', error);
        }
      }
      
      // 计算哈希
      const hash = '0x' + keccak256(inputToHash);
      setHashResult(hash);
      
      // 验证哈希
      if (expectedHash) {
        const isValid = hash.toLowerCase() === expectedHash.toLowerCase();
        setIsHashValid(isValid);
        setHashVerification(isValid ? '哈希验证通过！' : '哈希验证失败！');
      } else {
        setIsHashValid(false);
        setHashVerification('');
      }
    } catch (error) {
      console.error('计算哈希失败:', error);
      setHashResult('计算哈希失败: ' + (error instanceof Error ? error.message : String(error)));
      setIsHashValid(false);
      setHashVerification('');
    }
  };
  
  // 从Payload中提取字段
  const payloadFields = useMemo(() => {
    if (!editedApi?.payload) return [];
    
    try {
      const payloadObj = JSON.parse(editedApi.payload);
      return Object.keys(payloadObj);
    } catch (error) {
      console.error('解析Payload失败:', error);
      return [];
    }
  }, [editedApi?.payload]);
  
  // 获取Token预设值选项
  const getTokenPresets = useMemo(() => {
    const presets: { label: string; value: string; chainId: string; address: string }[] = [];
    
    // 遍历所有Token
    tokens.forEach(token => {
      if (token.active) {
        // 遍历Token的地址列表
        token.addressList.forEach(addressInfo => {
          // 查找对应的链名称
          const chain = chains.find(c => c.chainId.toString() === addressInfo.chainId);
          if (chain) {
            presets.push({
              label: `${token.name}(${chain.name})`,
              value: addressInfo.address,
              chainId: addressInfo.chainId,
              address: addressInfo.address
            });
          }
        });
      }
    });
    
    return presets;
  }, [tokens, chains]);
  
  // 处理预设值选择
  const handlePresetSelect = (variable: string, value: string) => {
    setTestVariables({
      ...testVariables,
      [variable]: value
    });
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>API配置</PageTitle>
        <ActionButton onClick={handleAddApi}>+ 添加API</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <ApiList>
            <ApiListHeader>API列表</ApiListHeader>
            <SearchContainer>
              <SearchInput
                type="text"
                placeholder="搜索API名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon>🔍</SearchIcon>
            </SearchContainer>
            <ApiItems>
              {apis
                .filter(api => api.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(api => (
                <ApiItem 
                  key={api.NO || api.name} 
                  selected={selectedApi?.NO === api.NO}
                  onClick={() => handleApiSelect(api)}
                >
                  <ApiName selected={selectedApi?.NO === api.NO}>{api.name}</ApiName>
                  {api.exchangeId && (
                    <ExchangeName>{getExchangeName(api.exchangeId)}</ExchangeName>
                  )}
                  <StatusIndicator 
                    active={api.active} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(api);
                    }}
                  >
                    {api.active ? '已启用' : '已禁用'}
                  </StatusIndicator>
                </ApiItem>
              ))}
              
              {apis.length === 0 && (
                <EmptyMessage>暂无API配置</EmptyMessage>
              )}
            </ApiItems>
          </ApiList>
          
          <ConfigPanel>
            {!isEditing && selectedApi && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>API名称:</InfoLabel>
                    <InfoValue>{selectedApi.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>API基础URL:</InfoLabel>
                    <InfoValue>{selectedApi.baseUrl}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>关联交易所:</InfoLabel>
                    <InfoValue>{getExchangeName(selectedApi.exchangeId)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedApi.active}>
                        {selectedApi.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>字段映射</SectionTitle>
                  {selectedApi.fieldMappings && selectedApi.fieldMappings.length > 0 ? (
                    selectedApi.fieldMappings.map((mapping, index) => (
                      <FieldRow key={index}>
                        <InfoLabel>字段名:</InfoLabel>
                        <InfoValue>{mapping.customName}</InfoValue>
                        <InfoLabel>显示名:</InfoLabel>
                        <InfoValue>{mapping.displayName}</InfoValue>
                        <InfoLabel>JSON路径:</InfoLabel>
                        <InfoValue>{mapping.jsonPath}</InfoValue>
                      </FieldRow>
                    ))
                  ) : (
                    <EmptyMessage>暂无字段映射</EmptyMessage>
                  )}
                </FormSection>
                
                <DetailItem>
                  <DetailLabel>API基础URL</DetailLabel>
                  <DetailValue>{selectedApi.baseUrl}</DetailValue>
                </DetailItem>
                
                <DetailItem>
                  <DetailLabel>请求方法</DetailLabel>
                  <DetailValue>{selectedApi.method}</DetailValue>
                </DetailItem>
                
                {selectedApi.method === 'POST' && selectedApi.payload && (
                  <DetailItem>
                    <DetailLabel>请求负载 (Payload)</DetailLabel>
                    <DetailValue>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {selectedApi.payload}
                      </pre>
                    </DetailValue>
                  </DetailItem>
                )}
                
                <DetailItem>
                  <DetailLabel>API密钥</DetailLabel>
                  <DetailValue>{selectedApi.apiKey || '无'}</DetailValue>
                </DetailItem>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditApi}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteApi}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedApi && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>API名称<span className="required">*</span></Label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Input 
                          value={editedApi.name} 
                          onChange={(e) => setEditedApi({...editedApi, name: e.target.value})}
                          placeholder="例如：Binance 价格API"
                          style={{ flex: 1 }}
                        />
                        <Select 
                          value="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedPreset = PRESET_APIS.find(p => p.name === e.target.value);
                              if (selectedPreset) {
                                handlePresetApiSelect(selectedPreset);
                              }
                            }
                          }}
                          style={{ width: '120px' }}
                        >
                          <option value="">选择预设</option>
                          {PRESET_APIS.map(api => (
                            <option key={api.name} value={api.name}>{api.name}</option>
                          ))}
                        </Select>
                      </div>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>API基础URL<span className="required">*</span></Label>
                      <Input 
                        value={editedApi.baseUrl} 
                        onChange={(e) => {
                          setEditedApi({...editedApi, baseUrl: e.target.value});
                          // 立即更新变量，确保能检测到所有变量
                          updateDetectedVariables();
                        }}
                        placeholder="例如：https://api.binance.com/api/v3/ticker/price"
                      />
                      <small>支持变量格式：(变量名)</small>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>请求方法<span className="required">*</span></Label>
                      <Select 
                        value={editedApi.method} 
                        onChange={(e) => setEditedApi({...editedApi, method: e.target.value as 'GET' | 'POST'})}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                  {editedApi.method === 'POST' && (
                    <FormRow>
                      <FormGroup>
                        <Label>请求负载 (Payload)</Label>
                        <Textarea 
                          value={editedApi.payload || ''} 
                          onChange={(e) => {
                            setEditedApi({...editedApi, payload: e.target.value});
                            // 立即更新变量，确保能检测到所有变量
                            updateDetectedVariables();
                          }}
                          placeholder='{"key": "value", "example": "(变量名)"}'
                          rows={8}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                          <small>支持变量格式：(变量名)</small>
                          <Button 
                            variant="secondary" 
                            onClick={() => {
                              updateDetectedVariables();
                              console.log('手动触发变量检测');
                            }}
                            style={{ padding: '3px 8px', fontSize: '12px' }}
                          >
                            检测变量
                          </Button>
                        </div>
                      </FormGroup>
                    </FormRow>
                  )}
                  
                  {/* API密钥/Secret（可折叠） */}
                  <CollapsibleSection>
                    <CollapsibleHeader onClick={() => setIsApiKeySectionOpen(!isApiKeySectionOpen)}>
                      <CollapsibleTitle>API密钥/Secret（可选）</CollapsibleTitle>
                      <CollapsibleIcon className={isApiKeySectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                    </CollapsibleHeader>
                    <CollapsibleContent isOpen={isApiKeySectionOpen}>
                      <FormRow>
                        <FormGroup>
                          <Label>API密钥</Label>
                          <Input 
                            value={editedApi.apiKey || ''} 
                            onChange={(e) => setEditedApi({...editedApi, apiKey: e.target.value})}
                            placeholder="可选，填写API密钥"
                          />
                        </FormGroup>
                      </FormRow>
                      <FormRow>
                        <FormGroup>
                          <Label>API密钥Secret</Label>
                          <Input 
                            type="password"
                            value={editedApi.apiSecret || ''} 
                            onChange={(e) => setEditedApi({...editedApi, apiSecret: e.target.value})}
                            placeholder="可选，填写API密钥对应的Secret"
                          />
                        </FormGroup>
                      </FormRow>
                    </CollapsibleContent>
                  </CollapsibleSection>
                  
                  {/* 关联交易所（可折叠） */}
                  <CollapsibleSection>
                    <CollapsibleHeader onClick={() => setIsExchangeSectionOpen(!isExchangeSectionOpen)}>
                      <CollapsibleTitle>关联交易所（可选）</CollapsibleTitle>
                      <CollapsibleIcon className={isExchangeSectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                    </CollapsibleHeader>
                    <CollapsibleContent isOpen={isExchangeSectionOpen}>
                      <FormRow>
                        <FormGroup>
                          <Label>关联交易所</Label>
                          <Select 
                            value={editedApi.exchangeId?.toString() || ''} 
                            onChange={(e) => setEditedApi({
                              ...editedApi, 
                              exchangeId: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                          >
                            <option value="">无关联交易所</option>
                            {exchanges.map(exchange => (
                              <option key={exchange.NO} value={exchange.NO?.toString()}>{exchange.name}</option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                    </CollapsibleContent>
                  </CollapsibleSection>
                  
                  <FormRow>
                    <FormGroup minWidth="120px">
                      <Label>状态</Label>
                      <Select 
                        value={editedApi.active ? 'true' : 'false'}
                        onChange={(e) => setEditedApi({...editedApi, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                {/* 字段映射（可折叠） */}
                <CollapsibleSection>
                  <CollapsibleHeader onClick={() => setIsFieldMappingSectionOpen(!isFieldMappingSectionOpen)}>
                    <CollapsibleTitle>字段映射（可选）</CollapsibleTitle>
                    <CollapsibleIcon className={isFieldMappingSectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                  </CollapsibleHeader>
                  <CollapsibleContent isOpen={isFieldMappingSectionOpen}>
                    {(editedApi.fieldMappings || []).map((mapping, index) => (
                      <FieldRow key={index}>
                        <FieldInput>
                          <Label>自定义字段名<span className="required">*</span></Label>
                          <Input 
                            value={mapping.customName} 
                            onChange={(e) => handleFieldMappingChange(index, 'customName', e.target.value)}
                            placeholder="例如：price"
                          />
                        </FieldInput>
                        <FieldInput>
                          <Label>显示名称<span className="required">*</span></Label>
                          <Input 
                            value={mapping.displayName} 
                            onChange={(e) => handleFieldMappingChange(index, 'displayName', e.target.value)}
                            placeholder="例如：价格"
                          />
                        </FieldInput>
                        <FieldInput>
                          <Label>JSON路径<span className="required">*</span></Label>
                          <Input 
                            value={mapping.jsonPath} 
                            onChange={(e) => handleFieldMappingChange(index, 'jsonPath', e.target.value)}
                            placeholder="例如：data.price"
                          />
                        </FieldInput>
                        <RemoveButton onClick={() => handleRemoveFieldMapping(index)}>×</RemoveButton>
                      </FieldRow>
                    ))}
                    <Button onClick={handleAddFieldMapping}>+ 添加字段映射</Button>
                  </CollapsibleContent>
                </CollapsibleSection>
                
                {/* 变量输入区域 */}
                {detectedVariables.length > 0 && (
                  <FormSection>
                    <SectionTitle>API变量</SectionTitle>
                    <p>在URL或Payload中检测到以下变量，请提供测试值：</p>
                    {detectedVariables.map(variable => (
                      <FormRow key={variable}>
                        <FormGroup>
                          <Label>{variable}</Label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Input 
                              value={testVariables[variable] || ''} 
                              onChange={(e) => setTestVariables({
                                ...testVariables,
                                [variable]: e.target.value
                              })}
                              placeholder={`请输入${variable}的值`}
                              style={{ flex: 3 }} /* 增加输入框的比例 */
                            />
                            <Select
                              value=""
                              onChange={(e) => handlePresetSelect(variable, e.target.value)}
                              style={{ flex: 1, minWidth: 'auto', maxWidth: '150px' }} /* 使用flex布局并限制最大宽度 */
                            >
                              <option value="">预设值</option> /* 简化选项文本 */
                              <optgroup label="Token">
                                {getTokenPresets.map((preset, index) => (
                                  <option key={index} value={preset.value}>
                                    {preset.label}
                                  </option>
                                ))}
                              </optgroup>
                            </Select>
                          </div>
                        </FormGroup>
                      </FormRow>
                    ))}
                    
                    {/* Keccak-256哈希计算器（可折叠） */}
                    <CollapsibleSection>
                      <CollapsibleHeader onClick={() => setIsHashCalculatorOpen(!isHashCalculatorOpen)}>
                        <CollapsibleTitle>Keccak-256哈希计算器</CollapsibleTitle>
                        <CollapsibleIcon className={isHashCalculatorOpen ? 'open' : ''}>▼</CollapsibleIcon>
                      </CollapsibleHeader>
                      <CollapsibleContent isOpen={isHashCalculatorOpen}>
                        <HashInputRow>
                          <HashSelect 
                            value={selectedField} 
                            onChange={(e) => setSelectedField(e.target.value)}
                          >
                            <option value="">直接输入值</option>
                            {payloadFields.map(field => (
                              <option key={field} value={field}>{field}</option>
                            ))}
                          </HashSelect>
                          <HashInput 
                            value={hashInput} 
                            onChange={(e) => setHashInput(e.target.value)}
                            placeholder={selectedField ? "已选择字段，此输入将被忽略" : "输入要计算哈希的值"}
                            disabled={!!selectedField}
                          />
                          <HashButton onClick={calculateHash}>计算哈希</HashButton>
                        </HashInputRow>
                        <HashInputRow>
                          <HashInput 
                            value={expectedHash} 
                            onChange={(e) => setExpectedHash(e.target.value)}
                            placeholder="输入期望的哈希值进行验证（可选）"
                          />
                        </HashInputRow>
                        {hashResult && (
                          <HashResult>
                            {hashResult}
                          </HashResult>
                        )}
                        {hashVerification && (
                          <HashVerification isValid={isHashValid}>
                            {hashVerification}
                          </HashVerification>
                        )}
                      </CollapsibleContent>
                    </CollapsibleSection>
                  </FormSection>
                )}
                
                <FormSection>
                  <SectionTitle>API测试</SectionTitle>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                      <Button 
                        onClick={handleTestApi} 
                        disabled={isTesting || detectedVariables.some(v => !testVariables[v])}
                      >
                        {isTesting ? '测试中...' : '测试API'}
                      </Button>
                      
                      <ProxyToggle>
                        <input
                          type="checkbox"
                          id="proxyToggle"
                          checked={useProxyToggle}
                          onChange={(e) => setUseProxyToggle(e.target.checked)}
                        />
                        <label htmlFor="proxyToggle">
                          使用本地代理 ({useProxyToggle ? '已启用' : '已禁用'})
                        </label>
                      </ProxyToggle>
                    </div>
                    
                    {/* 测试结果显示 */}
                    {testResult && (
                      <div>
                        <h4>测试结果</h4>
                        
                        {/* 错误解决方案 */}
                        {!testResult.success && testResult.data.solutions && (
                          <div style={{ marginBottom: '15px' }}>
                            <ErrorContainer>
                              <h5>{testResult.data.error}</h5>
                              <p>{testResult.data.message}</p>
                              <ul>
                                {testResult.data.solutions.map((solution: string, index: number) => (
                                  <li key={index}>{solution}</li>
                                ))}
                              </ul>
                              {testResult.data.originalUrl && (
                                <div>
                                  <p><strong>原始URL:</strong> {testResult.data.originalUrl}</p>
                                  {testResult.data.proxyUrl && (
                                    <p><strong>代理URL:</strong> {testResult.data.proxyUrl}</p>
                                  )}
                                </div>
                              )}
                            </ErrorContainer>
                          </div>
                        )}
                        
                        {/* 代理成功信息 */}
                        {testResult.success && testResult.data.proxyUrl && (
                          <div style={{ marginBottom: '15px' }}>
                            <SuccessContainer>
                              <h5>请求成功通过代理转发</h5>
                              <p>请求已通过本地代理服务器成功转发，避免了浏览器的跨域限制。</p>
                              <div>
                                <p><strong>原始URL:</strong> {testResult.data.originalUrl}</p>
                                <p><strong>代理URL:</strong> {testResult.data.proxyUrl}</p>
                              </div>
                            </SuccessContainer>
                          </div>
                        )}
                        
                        {/* 自定义字段结果 */}
                        {testResult.data.customFields && (
                          <div style={{ marginBottom: '15px' }}>
                            <h5>自定义字段提取结果</h5>
                            <CustomFieldsContainer>
                              {Object.entries(testResult.data.customFields).map(([key, field]: [string, any]) => (
                                <CustomFieldItem key={key}>
                                  <CustomFieldName>{field.displayName} ({key})</CustomFieldName>
                                  <CustomFieldValue success={field.value !== '未找到' && field.value !== '解析错误'}>
                                    {Array.isArray(field.value) 
                                      ? (
                                        <ArrayValueContainer>
                                          <ArrayValueHeader>
                                            获取到 {field.value.length} 个值
                                            {field.value.length > 3 && (
                                              <ArrayToggle 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const container = e.currentTarget.parentElement?.nextElementSibling;
                                                  if (container) {
                                                    container.classList.toggle('expanded');
                                                    e.currentTarget.textContent = 
                                                      container.classList.contains('expanded') ? '收起' : '展开全部';
                                                  }
                                                }}
                                              >
                                                展开全部
                                              </ArrayToggle>
                                            )}
                                          </ArrayValueHeader>
                                          <ArrayValueList className={field.value.length <= 3 ? 'expanded' : ''}>
                                            {field.value.map((item: any, idx: number) => (
                                              <ArrayValueItem key={idx}>
                                                <ArrayValueIndex>{idx}:</ArrayValueIndex>
                                                <ArrayValueContent>
                                                  {typeof item === 'object' 
                                                    ? JSON.stringify(item) 
                                                    : String(item)
                                                  }
                                                </ArrayValueContent>
                                              </ArrayValueItem>
                                            ))}
                                          </ArrayValueList>
                                        </ArrayValueContainer>
                                      )
                                      : (typeof field.value === 'object' 
                                        ? JSON.stringify(field.value) 
                                        : String(field.value)
                                      )
                                    }
                                  </CustomFieldValue>
                                  {field.suggestions && field.suggestions.length > 0 && (
                                    <SuggestionContainer>
                                      <SuggestionTitle>建议的JSON路径:</SuggestionTitle>
                                      <SuggestionList>
                                        {field.suggestions.map((suggestion: string, index: number) => (
                                          <SuggestionItem key={index} onClick={() => {
                                            // 找到对应的字段映射并更新
                                            if (editedApi && editedApi.fieldMappings) {
                                              const mappingIndex = editedApi.fieldMappings.findIndex(m => m.customName === key);
                                              if (mappingIndex >= 0) {
                                                handleFieldMappingChange(mappingIndex, 'jsonPath', suggestion);
                                                // 重新测试
                                                setTimeout(handleTestApi, 100);
                                              }
                                            }
                                          }}>
                                            {suggestion}
                                          </SuggestionItem>
                                        ))}
                                      </SuggestionList>
                                    </SuggestionContainer>
                                  )}
                                </CustomFieldItem>
                              ))}
                            </CustomFieldsContainer>
                          </div>
                        )}
                        
                        {/* 完整响应结果 */}
                        <ResultContainer success={testResult.success}>
                          <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
                        </ResultContainer>
                      </div>
                    )}
                  </div>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveApi}>保存</Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>取消</Button>
                </ButtonGroup>
              </>
            )}
          </ConfigPanel>
        </ContentLayout>
      )}
    </PageContainer>
  );
};

export default ApiConfig; 