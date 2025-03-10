import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { tradingPairConfigAccess, TradingPairConfigModel, tokenConfigAccess, TokenConfigModel } from '../services/database';

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

const PairList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const PairListHeader = styled.div`
  padding: 15px;
  font-weight: bold;
  background-color: #333333;
  border-bottom: 1px solid #444444;
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  overflow-y: auto;
  height: 100%;
`;

const FormSection = styled.div`
  margin-bottom: 25px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #F0B90B;
  
  .required {
    color: #FF0000;
    margin-left: 5px;
  }
`;

const FormRow = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
`;

const FormGroup = styled.div<{ flex?: number }>`
  flex: ${props => props.flex || 1};
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-size: 14px;
  color: #AAAAAA;
  
  .required {
    color: #FF0000;
    margin-left: 2px;
  }
`;

const Input = styled.input`
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled.select`
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
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

// 添加一些额外的组件
const ErrorMessage = styled.div`
  color: #FF0000;
  background-color: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const InfoMessage = styled.div`
  color: #FFAA00;
  background-color: rgba(255, 170, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: #AAAAAA;
  font-size: 16px;
`;

const PairItems = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const PairItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const PairName = styled.div`
  font-weight: bold;
`;

const PairStatus = styled.div<{ active: boolean }>`
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  cursor: pointer;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const InfoLabel = styled.div`
  width: 100px;
  color: #AAAAAA;
`;

const InfoValue = styled.div`
  flex: 1;
`;

const ChainConfigList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ChainConfigItem = styled.div<{ active: boolean }>`
  padding: 12px 15px;
  background-color: #2F2F2F;
  border-radius: 4px;
  border-left: 3px solid ${props => props.active ? '#00FF00' : '#FF0000'};
`;

const ChainConfigEdit = styled.div`
  padding: 15px;
  background-color: #2F2F2F;
  border-radius: 4px;
  margin-bottom: 15px;
`;

const ChainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ChainName = styled.div`
  font-weight: bold;
`;

const TokenPair = styled.div`
  display: flex;
  gap: 5px;
  font-size: 14px;
`;

const TokenName = styled.span`
  color: #F0B90B;
`;

const ConfigHeader = styled.div`
  margin-bottom: 10px;
`;

const ConfigTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const TokensRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
`;

const ConfigFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RemoveButton = styled.button`
  background-color: #AA0000;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  
  &:hover {
    background-color: #CC0000;
  }
`;

const AddButton = styled.button`
  background-color: #F0B90B;
  border: none;
  border-radius: 3px;
  color: #000000;
  font-size: 12px;
  padding: 6px 14px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

const StatusIndicator = styled.span<{ active: boolean }>`
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
`;

const PairConfig: React.FC = () => {
  const [pairs, setPairs] = useState<TradingPairConfigModel[]>([]);
  const [availableTokens, setAvailableTokens] = useState<TokenConfigModel[]>([]);
  const [selectedPair, setSelectedPair] = useState<TradingPairConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPair, setEditedPair] = useState<TradingPairConfigModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 加载交易对数据
        const pairData = await tradingPairConfigAccess.getAll();
        setPairs(pairData);
        
        // 加载Token数据（用于选择Token）
        const tokenData = await tokenConfigAccess.getAll();
        setAvailableTokens(tokenData);
        
        // 如果有交易对数据且没有选中的交易对，默认选择第一个
        if (pairData.length > 0 && !selectedPair) {
          setSelectedPair(pairData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('加载数据失败，请检查数据库连接');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedPair]);
  
  const handlePairSelect = (pair: TradingPairConfigModel) => {
    setSelectedPair(pair);
    setIsEditing(false);
  };
  
  const handleAddPair = () => {
    const newPair: TradingPairConfigModel = {
      name: '',
      active: true,
      pairList: []
    };
    
    setSelectedPair(newPair);
    setEditedPair(newPair);
    setIsEditing(true);
  };
  
  const handleEditPair = () => {
    if (selectedPair) {
      setEditedPair({ ...selectedPair });
      setIsEditing(true);
    }
  };
  
  const handleSavePair = async () => {
    if (!editedPair) return;
    
    try {
      let savedPairNo: number;
      
      // 如果是新交易对（没有NO字段），则创建新记录
      if (!editedPair.NO) {
        savedPairNo = await tradingPairConfigAccess.create(editedPair);
        
        // 获取新创建的完整记录
        const newPair = await tradingPairConfigAccess.getByNo(savedPairNo);
        if (newPair) {
          setPairs([...pairs, newPair]);
          setSelectedPair(newPair);
        }
      } else {
        // 更新现有交易对
        await tradingPairConfigAccess.update(editedPair.NO, editedPair);
        savedPairNo = editedPair.NO;
        
        // 更新本地状态
        setPairs(pairs.map(pair => 
          pair.NO === editedPair.NO ? editedPair : pair
        ));
        setSelectedPair(editedPair);
      }
      
      setIsEditing(false);
      setEditedPair(null);
      setError(null);
    } catch (err) {
      console.error('Failed to save pair:', err);
      setError('保存交易对配置失败');
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPair(null);
  };
  
  const handleDeletePair = async () => {
    if (!selectedPair || !selectedPair.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedPair.name} 交易对吗？`)) {
      try {
        await tradingPairConfigAccess.delete(selectedPair.NO);
        
        // 更新本地状态
        const updatedPairs = pairs.filter(pair => pair.NO !== selectedPair.NO);
        setPairs(updatedPairs);
        
        // 如果还有其他交易对，则选择第一个，否则清空选择
        if (updatedPairs.length > 0) {
          setSelectedPair(updatedPairs[0]);
        } else {
          setSelectedPair(null);
        }
        
        setIsEditing(false);
        setEditedPair(null);
        setError(null);
      } catch (err) {
        console.error('Failed to delete pair:', err);
        setError('删除交易对失败');
      }
    }
  };
  
  const handleAddChainConfig = () => {
    if (editedPair) {
      setEditedPair({
        ...editedPair,
        pairList: [...editedPair.pairList, { chain: 'Ethereum', token1Id: '', token2Id: '', token1: '', token2: '', active: true }]
      });
    }
  };
  
  const handleRemoveChainConfig = (index: number) => {
    if (editedPair) {
      const updatedPairList = [...editedPair.pairList];
      updatedPairList.splice(index, 1);
      
      setEditedPair({
        ...editedPair,
        pairList: updatedPairList
      });
    }
  };
  
  const handleChainConfigChange = (index: number, field: string, value: string | boolean) => {
    if (editedPair) {
      const updatedPairList = editedPair.pairList.map((config, i) => 
        i === index ? {...config, [field]: value} : config
      );
      
      setEditedPair({
        ...editedPair,
        pairList: updatedPairList
      });
    }
  };
  
  const handleToggleStatus = async (pair: TradingPairConfigModel) => {
    if (!pair.NO) return;
    
    try {
      const updatedPair = { ...pair, active: !pair.active };
      
      // 更新数据库
      await tradingPairConfigAccess.update(pair.NO, updatedPair);
      
      // 更新本地状态
      setPairs(pairs.map(p => p.NO === pair.NO ? updatedPair : p));
      
      if (selectedPair && selectedPair.NO === pair.NO) {
        setSelectedPair(updatedPair);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to toggle pair status:', err);
      setError('更新交易对状态失败');
    }
  };
  
  const getTokenName = (tokenId: string) => {
    const token = availableTokens.find(t => t.NO?.toString() === tokenId);
    return token ? token.name : '选择Token';
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>交易对配置</PageTitle>
        <ActionButton onClick={handleAddPair}>+ 添加交易对</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <PairList>
            <PairListHeader>交易对列表</PairListHeader>
            <PairItems>
              {pairs.map(pair => (
                <PairItem 
                  key={pair.NO || pair.name} 
                  selected={selectedPair?.NO === pair.NO}
                  onClick={() => handlePairSelect(pair)}
                >
                  <PairName>{pair.name}</PairName>
                  <PairStatus active={pair.active} onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(pair);
                  }}>
                    {pair.active ? '已启用' : '已禁用'}
                  </PairStatus>
                </PairItem>
              ))}
            </PairItems>
          </PairList>
          
          <ConfigPanel>
            {!isEditing && selectedPair && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>交易对名称:</InfoLabel>
                    <InfoValue>{selectedPair.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedPair.active}>
                        {selectedPair.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>多链配置</SectionTitle>
                  <ChainConfigList>
                    {selectedPair.pairList.length > 0 ? (
                      selectedPair.pairList.map((config, index) => (
                        <ChainConfigItem key={index} active={config.active}>
                          <ChainHeader>
                            <ChainName>{config.chain}</ChainName>
                            <StatusIndicator active={config.active}>
                              {config.active ? '已启用' : '已禁用'}
                            </StatusIndicator>
                          </ChainHeader>
                          <TokenPair>
                            <TokenName>{getTokenName(config.token1Id)}</TokenName>
                            <span>/</span>
                            <TokenName>{getTokenName(config.token2Id)}</TokenName>
                          </TokenPair>
                        </ChainConfigItem>
                      ))
                    ) : (
                      <EmptyMessage>暂无链配置信息</EmptyMessage>
                    )}
                  </ChainConfigList>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditPair}>编辑</Button>
                  <Button variant="danger" onClick={handleDeletePair}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedPair && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>交易对名称<span className="required">*</span></Label>
                      <Input 
                        value={editedPair.name} 
                        onChange={(e) => setEditedPair({...editedPair, name: e.target.value})}
                        placeholder="例如：ETH/USDT"
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>状态</Label>
                      <Select 
                        value={editedPair.active ? 'true' : 'false'}
                        onChange={(e) => setEditedPair({...editedPair, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>多链配置</SectionTitle>
                  {editedPair.pairList.map((config, index) => (
                    <ChainConfigEdit key={index}>
                      <ConfigHeader>
                        <ConfigTitle>
                          <FormGroup>
                            <Label>链</Label>
                            <Select 
                              value={config.chain}
                              onChange={(e) => handleChainConfigChange(index, 'chain', e.target.value)}
                            >
                              <option value="Ethereum">Ethereum</option>
                              <option value="BSC">BSC</option>
                              <option value="Solana">Solana</option>
                              <option value="Arbitrum">Arbitrum</option>
                              <option value="Base">Base</option>
                            </Select>
                          </FormGroup>
                        </ConfigTitle>
                        <TokensRow>
                          <FormGroup>
                            <Label>Token1</Label>
                            <Select 
                              value={config.token1Id}
                              onChange={(e) => handleChainConfigChange(index, 'token1Id', e.target.value)}
                            >
                              <option value="">选择Token</option>
                              {availableTokens.filter(t => t.active).map(token => (
                                <option key={token.NO} value={token.NO?.toString()}>
                                  {token.name}
                                </option>
                              ))}
                            </Select>
                          </FormGroup>
                          <FormGroup>
                            <Label>Token2</Label>
                            <Select 
                              value={config.token2Id}
                              onChange={(e) => handleChainConfigChange(index, 'token2Id', e.target.value)}
                            >
                              <option value="">选择Token</option>
                              {availableTokens.filter(t => t.active).map(token => (
                                <option key={token.NO} value={token.NO?.toString()}>
                                  {token.name}
                                </option>
                              ))}
                            </Select>
                          </FormGroup>
                        </TokensRow>
                      </ConfigHeader>
                      <ConfigFooter>
                        <FormGroup style={{ width: 'auto' }}>
                          <Label>状态</Label>
                          <Select 
                            value={config.active ? 'true' : 'false'}
                            onChange={(e) => handleChainConfigChange(index, 'active', e.target.value === 'true')}
                          >
                            <option value="true">启用</option>
                            <option value="false">禁用</option>
                          </Select>
                        </FormGroup>
                        <RemoveButton onClick={() => handleRemoveChainConfig(index)}>删除此配置</RemoveButton>
                      </ConfigFooter>
                    </ChainConfigEdit>
                  ))}
                  <AddButton onClick={handleAddChainConfig}>+ 添加链配置</AddButton>
                  
                  {availableTokens.length === 0 && (
                    <InfoMessage>请先在Token配置中添加Token，然后才能在交易对中选择</InfoMessage>
                  )}
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSavePair}>保存</Button>
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

export default PairConfig;
