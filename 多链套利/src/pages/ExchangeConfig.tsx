import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { exchangeConfigAccess, ExchangeConfigModel, chainConfigAccess, ChainConfigModel } from '../services/database';
import { initDatabase, initSampleData } from '../services/database';

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

const ExchangeList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const ExchangeListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
`;

const ExchangeItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const ExchangeName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
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

const Checkbox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  
  input {
    margin: 0;
  }
  
  label {
    margin: 0;
    cursor: pointer;
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

const ExchangeItems = styled.div`
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

const ChainList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
`;

const ChainTag = styled.div`
  background-color: #333333;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

// 预设交易所
const PRESET_EXCHANGES = [
  {
    name: "Binance",
    baseUrl: "https://api.binance.com",
    logo: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png",
    supportedChains: [1, 56] // ETH, BSC
  },
  {
    name: "OKX",
    baseUrl: "https://www.okx.com/api",
    logo: "https://cryptologos.cc/logos/okb-okb-logo.png",
    supportedChains: [1, 56, 66] // ETH, BSC, OKC
  },
  {
    name: "Bybit",
    baseUrl: "https://api.bybit.com",
    logo: "https://cryptologos.cc/logos/bybit-logo.png",
    supportedChains: [1, 56, 42161] // ETH, BSC, Arbitrum
  },
  {
    name: "Gate.io",
    baseUrl: "https://api.gateio.ws",
    logo: "https://cryptologos.cc/logos/gate-logo.png",
    supportedChains: [1, 56]
  },
  {
    name: "KuCoin",
    baseUrl: "https://api.kucoin.com",
    logo: "https://cryptologos.cc/logos/kucoin-token-kcs-logo.png",
    supportedChains: [1, 56, 321]
  }
];

const ExchangeConfig: React.FC = () => {
  const [exchanges, setExchanges] = useState<ExchangeConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExchange, setEditedExchange] = useState<ExchangeConfigModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null); // 清除之前的错误
        
        console.log("ExchangeConfig: 开始加载数据...");
        
        // 确保数据库已初始化
        const db = await initDatabase();
        console.log("ExchangeConfig: 数据库初始化完成", db);
        
        // 初始化示例数据（如果需要）
        await initSampleData();
        
        // 获取交易所数据
        console.log("ExchangeConfig: 正在获取交易所数据...");
        const exchangesData = await exchangeConfigAccess.getAll();
        console.log("ExchangeConfig: 获取到交易所数据", exchangesData);
        setExchanges(exchangesData);
        
        // 获取链配置数据
        console.log("ExchangeConfig: 正在获取链配置数据...");
        const chainsData = await chainConfigAccess.getAll();
        console.log("ExchangeConfig: 获取到链配置数据", chainsData);
        setChains(chainsData);
        
        // 如果有交易所数据且没有选中的交易所，默认选择第一个
        if (exchangesData.length > 0 && !selectedExchange) {
          setSelectedExchange(exchangesData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('ExchangeConfig: 加载数据失败', err);
        if (err instanceof Error) {
          setError(`加载配置数据失败: ${err.message}`);
        } else {
          setError('加载配置数据失败，请检查数据库连接');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []); 
  
  // 验证交易所名称唯一性
  const validateExchangeUniqueness = async (exchange: ExchangeConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有交易所
    const allExchanges = await exchangeConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allExchanges.some(e => 
      e.name.toLowerCase() === exchange.name.toLowerCase() && 
      (isNew || e.NO !== exchange.NO)
    );
    
    if (nameExists) {
      return `交易所名称 "${exchange.name}" 已存在，请使用其他名称`;
    }
    
    return null;
  };
  
  // 处理预设交易所选择
  const handlePresetExchangeSelect = (preset: typeof PRESET_EXCHANGES[0]) => {
    if (editedExchange) {
      setEditedExchange({
        ...editedExchange,
        name: preset.name,
        baseUrl: preset.baseUrl,
        logo: preset.logo,
        supportedChains: preset.supportedChains
      });
    }
  };
  
  // 选择交易所
  const handleExchangeSelect = (exchange: ExchangeConfigModel) => {
    setSelectedExchange(exchange);
    setIsEditing(false);
  };
  
  // 添加交易所
  const handleAddExchange = () => {
    const newExchange: ExchangeConfigModel = {
      name: '',
      baseUrl: '',
      active: true,
      supportedChains: []
    };
    
    setSelectedExchange(newExchange);
    setEditedExchange(newExchange);
    setIsEditing(true);
  };
  
  // 编辑交易所
  const handleEditExchange = () => {
    if (selectedExchange) {
      setEditedExchange({ ...selectedExchange });
      setIsEditing(true);
    }
  };
  
  // 保存交易所
  const handleSaveExchange = async () => {
    if (!editedExchange) return;
    
    // 验证必填字段
    if (!editedExchange.name.trim()) {
      setError('交易所名称不能为空');
      return;
    }
    
    if (!editedExchange.baseUrl.trim()) {
      setError('API基础URL不能为空');
      return;
    }
    
    try {
      // 验证交易所名称唯一性
      const validationError = await validateExchangeUniqueness(editedExchange, !editedExchange.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      let savedExchangeNo: number;
      
      // 如果是新交易所（没有NO字段），则创建新记录
      if (!editedExchange.NO) {
        savedExchangeNo = await exchangeConfigAccess.create(editedExchange);
        
        // 获取最新的交易所列表
        const updatedExchanges = await exchangeConfigAccess.getAll();
        setExchanges(updatedExchanges);
        
        // 查找并选择新创建的交易所
        const newExchange = updatedExchanges.find(e => e.NO === savedExchangeNo);
        if (newExchange) {
          setSelectedExchange(newExchange);
        }
      } else {
        // 如果是编辑现有交易所，则更新记录
        await exchangeConfigAccess.update(editedExchange.NO, editedExchange);
        
        // 获取最新的交易所列表
        const updatedExchanges = await exchangeConfigAccess.getAll();
        setExchanges(updatedExchanges);
        
        // 更新选中的交易所
        const updatedExchange = updatedExchanges.find(e => e.NO === editedExchange.NO);
        if (updatedExchange) {
          setSelectedExchange(updatedExchange);
        }
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save exchange:', err);
      setError('保存交易所失败，请检查输入数据');
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedExchange(null);
    
    // 如果是新建的交易所且尚未保存，则清除选中状态
    if (selectedExchange && !selectedExchange.NO) {
      setSelectedExchange(exchanges.length > 0 ? exchanges[0] : null);
    }
  };
  
  // 删除交易所
  const handleDeleteExchange = async () => {
    if (!selectedExchange || !selectedExchange.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedExchange.name} 吗？`)) {
      try {
        await exchangeConfigAccess.delete(selectedExchange.NO);
        
        // 获取最新的交易所列表
        const updatedExchanges = await exchangeConfigAccess.getAll();
        setExchanges(updatedExchanges);
        
        // 如果还有交易所，选择第一个；否则清空选择
        if (updatedExchanges.length > 0) {
          setSelectedExchange(updatedExchanges[0]);
        } else {
          setSelectedExchange(null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to delete exchange:', err);
        setError('删除交易所失败');
      }
    }
  };
  
  // 切换交易所状态
  const handleToggleStatus = async (exchange: ExchangeConfigModel) => {
    if (!exchange.NO) return;
    
    try {
      // 更新交易所状态
      const updatedExchange = { ...exchange, active: !exchange.active };
      await exchangeConfigAccess.update(exchange.NO, updatedExchange);
      
      // 获取最新的交易所列表
      const updatedExchanges = await exchangeConfigAccess.getAll();
      setExchanges(updatedExchanges);
      
      // 如果当前选中的交易所是被更新的交易所，也更新选中状态
      if (selectedExchange && selectedExchange.NO === exchange.NO) {
        // 查找更新后的交易所
        const refreshedExchange = updatedExchanges.find(e => e.NO === exchange.NO);
        if (refreshedExchange) {
          setSelectedExchange(refreshedExchange);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to toggle exchange status:', err);
      setError('更新交易所状态失败');
    }
  };
  
  // 处理链选择
  const handleChainSelect = (chainId: number, checked: boolean) => {
    if (!editedExchange) return;
    
    let updatedChains: number[];
    
    if (checked) {
      // 添加到支持的链列表
      updatedChains = [...editedExchange.supportedChains, chainId];
    } else {
      // 从支持的链列表中移除
      updatedChains = editedExchange.supportedChains.filter(id => id !== chainId);
    }
    
    setEditedExchange({
      ...editedExchange,
      supportedChains: updatedChains
    });
  };
  
  // 获取链名称
  const getChainName = (chainId: number): string => {
    const chain = chains.find(c => c.chainId === chainId);
    return chain ? chain.name : `Chain ID: ${chainId}`;
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>交易所配置</PageTitle>
        <ActionButton onClick={handleAddExchange}>+ 添加交易所</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <ExchangeList>
            <ExchangeListHeader>交易所列表</ExchangeListHeader>
            <ExchangeItems>
              {exchanges.map(exchange => (
                <ExchangeItem 
                  key={exchange.NO || exchange.name} 
                  selected={selectedExchange?.NO === exchange.NO}
                  onClick={() => handleExchangeSelect(exchange)}
                >
                  <ExchangeName selected={selectedExchange?.NO === exchange.NO}>{exchange.name}</ExchangeName>
                  <StatusIndicator 
                    active={exchange.active} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(exchange);
                    }}
                  >
                    {exchange.active ? '已启用' : '已禁用'}
                  </StatusIndicator>
                </ExchangeItem>
              ))}
              
              {exchanges.length === 0 && (
                <EmptyMessage>暂无交易所配置</EmptyMessage>
              )}
            </ExchangeItems>
          </ExchangeList>
          
          <ConfigPanel>
            {!isEditing && selectedExchange && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>交易所名称:</InfoLabel>
                    <InfoValue>{selectedExchange.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>API基础URL:</InfoLabel>
                    <InfoValue>{selectedExchange.baseUrl}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedExchange.active}>
                        {selectedExchange.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>支持的链</SectionTitle>
                  <ChainList>
                    {selectedExchange.supportedChains && selectedExchange.supportedChains.length > 0 ? (
                      selectedExchange.supportedChains.map(chainId => (
                        <ChainTag key={chainId}>{getChainName(chainId)}</ChainTag>
                      ))
                    ) : (
                      <EmptyMessage>暂无支持的链</EmptyMessage>
                    )}
                  </ChainList>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditExchange}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteExchange}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedExchange && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>交易所名称<span className="required">*</span></Label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Input 
                          value={editedExchange.name} 
                          onChange={(e) => setEditedExchange({...editedExchange, name: e.target.value})}
                          placeholder="例如：Binance"
                          style={{ flex: 1 }}
                        />
                        <Select 
                          value="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedPreset = PRESET_EXCHANGES.find(p => p.name === e.target.value);
                              if (selectedPreset) {
                                handlePresetExchangeSelect(selectedPreset);
                              }
                            }
                          }}
                          style={{ width: '120px' }}
                        >
                          <option value="">选择预设</option>
                          {PRESET_EXCHANGES.map(exchange => (
                            <option key={exchange.name} value={exchange.name}>{exchange.name}</option>
                          ))}
                        </Select>
                      </div>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>API基础URL<span className="required">*</span></Label>
                      <Input 
                        value={editedExchange.baseUrl} 
                        onChange={(e) => setEditedExchange({...editedExchange, baseUrl: e.target.value})}
                        placeholder="例如：https://api.binance.com"
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>Logo URL</Label>
                      <Input 
                        value={editedExchange.logo || ''} 
                        onChange={(e) => setEditedExchange({...editedExchange, logo: e.target.value})}
                        placeholder="例如：https://example.com/logo.png"
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup minWidth="120px">
                      <Label>状态</Label>
                      <Select 
                        value={editedExchange.active ? 'true' : 'false'}
                        onChange={(e) => setEditedExchange({...editedExchange, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>支持的链</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {chains.map(chain => (
                      <Checkbox key={chain.chainId}>
                        <input 
                          type="checkbox" 
                          id={`chain-${chain.chainId}`}
                          checked={editedExchange.supportedChains.includes(chain.chainId)}
                          onChange={(e) => handleChainSelect(chain.chainId, e.target.checked)}
                        />
                        <label htmlFor={`chain-${chain.chainId}`}>{chain.name}</label>
                      </Checkbox>
                    ))}
                  </div>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveExchange}>保存</Button>
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

export default ExchangeConfig; 