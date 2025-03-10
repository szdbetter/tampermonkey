import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { tokenConfigAccess, TokenConfigModel, chainConfigAccess, ChainConfigModel } from '../services/database';

// 预设Token信息
interface PresetToken {
  name: string;
  symbol: string;
  decimals: number;
  addresses: {
    chainName: string;
    chainId: string;
    address: string;
  }[];
}

// ETH链上常用Token的预设信息
const PRESET_TOKENS: PresetToken[] = [
  {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
      }
    ]
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
      }
    ]
  },
  {
    name: "sENA",
    symbol: "sENA",
    decimals: 18,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0x8be3460a480c80728a8c4d7a5d5303c85ba7b3b9"
      }
    ]
  },
  {
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0x6b175474e89094c44da98b954eedeac495271d0f"
      }
    ]
  },
  {
    name: "Staked USDe",
    symbol: "sUSDe",
    decimals: 18,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497"
      }
    ]
  },
  {
    name: "ENA",
    symbol: "ENA",
    decimals: 18,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0x57e114B691Db790C35207b2e685D4A43181e6061"
      }
    ]
  },
  {
    name: "USDe",
    symbol: "USDe",
    decimals: 18,
    addresses: [
      {
        chainName: "Ethereum",
        chainId: "1",
        address: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3"
      }
    ]
  }
];

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

const TokenList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #333333;
  border-radius: 4px;
  padding: 8px;
  margin: 10px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px;
  background-color: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    outline: none;
  }
`;

const SearchIcon = styled.span`
  margin-left: 8px;
  color: #AAAAAA;
`;

const TokenListHeader = styled.div`
  background-color: #333333;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444444;
`;

const TokenListTitle = styled.h3`
  margin: 0;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
`;

const AddTokenButton = styled.button`
  background-color: #F0B90B;
  border: none;
  border-radius: 3px;
  color: #000000;
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const TokenListContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const TokenItem = styled.div<{ selected: boolean }>`
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

const TokenName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const TokenSymbol = styled.span`
  font-weight: bold;
  color: #FFFFFF;
`;

const TokenFullName = styled.span`
  color: #AAAAAA;
  font-size: 12px;
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
  overflow-y: auto;
`;

const FormSection = styled.div`
  margin-bottom: 25px;
`;

const SectionTitle = styled.h3`
  color: #F0B90B;
  font-size: 16px;
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

const TokenItems = styled.div`
  overflow-y: auto;
  flex: 1;
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

const AddressList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AddressItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background-color: #2F2F2F;
  border-radius: 4px;
  position: relative;
`;

const AddressField = styled.div`
  flex: 1;
`;

const AddressValue = styled.div`
  padding: 5px 0;
  font-family: monospace;
  word-break: break-all;
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #AAAAAA;
  font-size: 12px;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
`;

const AddButton = styled.button`
  background-color: #F0B90B;
  border: none;
  border-radius: 3px;
  color: #000000;
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const TokenConfig: React.FC = () => {
  const [tokens, setTokens] = useState<TokenConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedToken, setEditedToken] = useState<TokenConfigModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 确保loadData函数在组件初始化时只加载一次
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const tokensData = await tokenConfigAccess.getAll();
        const chainsData = await chainConfigAccess.getAll();
        
        setTokens(tokensData);
        setChains(chainsData);
        
        // 如果有Token数据且没有选中的Token，默认选择第一个
        if (tokensData.length > 0 && !selectedToken) {
          setSelectedToken(tokensData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('加载配置数据失败，请检查数据库连接');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []); // 依赖数组为空，确保只在组件挂载时执行一次
  
  const handleTokenSelect = (token: TokenConfigModel) => {
    setSelectedToken(token);
    setIsEditing(false);
  };
  
  const handleAddToken = () => {
    const newToken: TokenConfigModel = {
      name: '',
      active: true,
      decimals: 18,
      addressList: []
    };
    
    setSelectedToken(newToken);
    setEditedToken(newToken);
    setIsEditing(true);
  };
  
  const handleEditToken = () => {
    if (selectedToken) {
      setEditedToken({ ...selectedToken });
      setIsEditing(true);
    }
  };
  
  // 验证Token名称和合约地址的唯一性
  const validateTokenUniqueness = async (token: TokenConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有Token
    const allTokens = await tokenConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allTokens.some(t => 
      t.name.toLowerCase() === token.name.toLowerCase() && 
      (isNew || t.NO !== token.NO)
    );
    
    if (nameExists) {
      return `Token名称 "${token.name}" 已存在，请使用其他名称`;
    }
    
    // 检查合约地址唯一性
    for (const addr of token.addressList) {
      const addressExists = allTokens.some(t => 
        t.addressList.some(a => 
          a.chainId === addr.chainId && 
          a.address.toLowerCase() === addr.address.toLowerCase() && 
          (isNew || t.NO !== token.NO)
        )
      );
      
      if (addressExists) {
        return `合约地址 "${addr.address}" 在链ID ${addr.chainId} 上已存在`;
      }
    }
    
    return null;
  };

  // 处理预设Token选择
  const handlePresetTokenSelect = (presetToken: PresetToken) => {
    if (editedToken) {
      // 更新名称和小数位数
      const updatedToken = {
        ...editedToken,
        name: presetToken.symbol, // 使用Token符号作为名称
        decimals: presetToken.decimals
      };
      
      setEditedToken(updatedToken);
      
      // 如果地址列表中有Ethereum链，自动填充合约地址
      const ethAddress = presetToken.addresses.find(addr => addr.chainId === "1");
      if (ethAddress) {
        const updatedAddressList = [...updatedToken.addressList];
        
        // 查找地址列表中的Ethereum链
        for (let i = 0; i < updatedAddressList.length; i++) {
          if (updatedAddressList[i].chainId === "1") {
            // 更新Ethereum链上的合约地址
            updatedAddressList[i] = {
              ...updatedAddressList[i],
              address: ethAddress.address
            };
            
            setEditedToken({
              ...updatedToken,
              addressList: updatedAddressList
            });
            return;
          }
        }
      }
    }
  };

  // 修改handleSaveToken函数
  const handleSaveToken = async () => {
    if (!editedToken) return;
    
    // 验证必填字段
    if (!editedToken.name.trim()) {
      setError('Token名称不能为空');
      return;
    }
    
    if (editedToken.addressList.length === 0) {
      setError('至少需要添加一个地址');
      return;
    }
    
    // 验证地址列表中的必填字段
    for (const addr of editedToken.addressList) {
      if (!addr.chainId) {
        setError('请选择所有地址项的链');
        return;
      }
      
      if (!addr.address.trim()) {
        setError('合约地址不能为空');
        return;
      }
    }
    
    try {
      // 验证Token名称和合约地址的唯一性
      const validationError = await validateTokenUniqueness(editedToken, !editedToken.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      let savedTokenNo: number;
      
      // 如果是新Token（没有NO字段），则创建新记录
      if (!editedToken.NO) {
        savedTokenNo = await tokenConfigAccess.create(editedToken);
        
        // 获取最新的Token列表
        const updatedTokens = await tokenConfigAccess.getAll();
        setTokens(updatedTokens);
        
        // 查找并选择新创建的Token
        const newToken = updatedTokens.find(t => t.NO === savedTokenNo);
        if (newToken) {
          setSelectedToken(newToken);
        }
      } else {
        // 如果是编辑现有Token，则更新记录
        await tokenConfigAccess.update(editedToken.NO, editedToken);
        
        // 获取最新的Token列表
        const updatedTokens = await tokenConfigAccess.getAll();
        setTokens(updatedTokens);
        
        // 更新选中的Token
        const updatedToken = updatedTokens.find(t => t.NO === editedToken.NO);
        if (updatedToken) {
          setSelectedToken(updatedToken);
        }
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save token:', err);
      setError('保存Token失败，请检查输入数据');
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedToken(null);
  };
  
  const handleDeleteToken = async () => {
    if (!selectedToken || !selectedToken.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedToken.name} 吗？`)) {
      try {
        await tokenConfigAccess.delete(selectedToken.NO);
        
        // 获取最新的Token列表
        const updatedTokens = await tokenConfigAccess.getAll();
        setTokens(updatedTokens);
        
        // 如果还有Token，选择第一个；否则清空选择
        if (updatedTokens.length > 0) {
          setSelectedToken(updatedTokens[0]);
        } else {
          setSelectedToken(null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to delete token:', err);
        setError('删除Token失败');
      }
    }
  };
  
  const handleAddAddress = () => {
    if (editedToken) {
      setEditedToken({
        ...editedToken,
        addressList: [...editedToken.addressList, { chainId: '', address: '' }]
      });
    }
  };
  
  const handleRemoveAddress = (index: number) => {
    if (editedToken) {
      const updatedAddressList = [...editedToken.addressList];
      updatedAddressList.splice(index, 1);
      
      setEditedToken({
        ...editedToken,
        addressList: updatedAddressList
      });
    }
  };
  
  // 修改handleAddressChange函数以支持自动填充
  const handleAddressChange = (index: number, field: string, value: string) => {
    if (!editedToken) return;
    
    const newAddressList = [...editedToken.addressList];
    newAddressList[index] = { 
      ...newAddressList[index], 
      [field]: value 
    };
    
    // 如果选择的是Ethereum链，查找是否有对应的预设合约地址可以自动填充
    if (field === 'chainId' && value === "1") {
      // 查找当前Token名称是否与预设Token匹配
      const matchingPreset = PRESET_TOKENS.find(
        p => p.symbol.toLowerCase() === editedToken.name.toLowerCase()
      );
      
      if (matchingPreset) {
        // 查找该预设Token在Ethereum链上的地址
        const ethAddress = matchingPreset.addresses.find(addr => addr.chainId === "1");
        if (ethAddress) {
          // 自动填充地址
          newAddressList[index].address = ethAddress.address;
        }
      }
    }
    
    setEditedToken({ ...editedToken, addressList: newAddressList });
  };
  
  const handleToggleStatus = async (token: TokenConfigModel) => {
    if (!token.NO) return;
    
    try {
      // 更新Token状态
      const updatedToken = { ...token, active: !token.active };
      await tokenConfigAccess.update(token.NO, updatedToken);
      
      // 获取最新的Token列表
      const updatedTokens = await tokenConfigAccess.getAll();
      setTokens(updatedTokens);
      
      // 如果当前选中的Token是被更新的Token，也更新选中状态
      if (selectedToken && selectedToken.NO === token.NO) {
        // 查找更新后的Token
        const refreshedToken = updatedTokens.find(t => t.NO === token.NO);
        if (refreshedToken) {
          setSelectedToken(refreshedToken);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to toggle token status:', err);
      setError('更新Token状态失败');
    }
  };
  
  const getChainName = (chainId: string): string => {
    const chain = chains.find(c => c.chainId.toString() === chainId);
    return chain ? chain.name : `Chain ID: ${chainId}`;
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Token配置</PageTitle>
        <ActionButton onClick={handleAddToken}>+ 添加Token</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <TokenList>
            <TokenListHeader>Token列表</TokenListHeader>
            <SearchContainer>
              <SearchInput 
                placeholder="搜索Token名称..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon>🔍</SearchIcon>
            </SearchContainer>
            <TokenItems>
              {tokens
                .filter(token => token.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(token => (
                  <TokenItem 
                    key={token.NO || token.name} 
                    selected={selectedToken?.NO === token.NO}
                    onClick={() => handleTokenSelect(token)}
                  >
                    <TokenName selected={selectedToken?.NO === token.NO}>{token.name}</TokenName>
                    <TokenStatus active={token.active} onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(token);
                    }}>
                      {token.active ? '已启用' : '已禁用'}
                    </TokenStatus>
                  </TokenItem>
                ))}
            </TokenItems>
          </TokenList>
          
          <ConfigPanel>
            {!isEditing && selectedToken && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>Token名称:</InfoLabel>
                    <InfoValue>{selectedToken.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>小数位数:</InfoLabel>
                    <InfoValue>{selectedToken.decimals}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedToken.active}>
                        {selectedToken.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>地址列表</SectionTitle>
                  <AddressList>
                    {selectedToken.addressList.length > 0 ? (
                      selectedToken.addressList.map((item, index) => (
                        <AddressItem key={index}>
                          <AddressField>
                            <Label>链:</Label>
                            <AddressValue>{getChainName(item.chainId)}</AddressValue>
                          </AddressField>
                          <AddressField>
                            <Label>合约地址:</Label>
                            <AddressValue>{item.address}</AddressValue>
                          </AddressField>
                        </AddressItem>
                      ))
                    ) : (
                      <EmptyMessage>暂无地址信息</EmptyMessage>
                    )}
                  </AddressList>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditToken}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteToken}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedToken && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>Token名称/符号<span className="required">*</span></Label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Input 
                          value={editedToken.name} 
                          onChange={(e) => setEditedToken({...editedToken, name: e.target.value})}
                          placeholder="例如：USDT"
                          style={{ flex: 1 }}
                        />
                        <Select 
                          value="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedPreset = PRESET_TOKENS.find(p => p.symbol === e.target.value);
                              if (selectedPreset) {
                                handlePresetTokenSelect(selectedPreset);
                              }
                            }
                          }}
                          style={{ width: '120px' }}
                        >
                          <option value="">选择预设</option>
                          {PRESET_TOKENS.map(token => (
                            <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                          ))}
                        </Select>
                      </div>
                    </FormGroup>
                    <FormGroup>
                      <Label>小数位数<span className="required">*</span></Label>
                      <Input 
                        type="number" 
                        value={editedToken.decimals} 
                        onChange={(e) => setEditedToken({...editedToken, decimals: parseInt(e.target.value) || 0})}
                        placeholder="例如：18 (ETH)"
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup minWidth="120px">
                      <Label>状态</Label>
                      <Select 
                        value={editedToken.active ? 'true' : 'false'}
                        onChange={(e) => setEditedToken({...editedToken, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>地址列表</SectionTitle>
                  <AddressList>
                    {editedToken.addressList.map((address, index) => (
                      <AddressItem key={index}>
                        <AddressField>
                          <Label>选择链<span className="required">*</span></Label>
                          <Select 
                            value={address.chainId} 
                            onChange={(e) => handleAddressChange(index, 'chainId', e.target.value)}
                          >
                            <option value="">请选择链</option>
                            {chains.map(chain => (
                              <option key={chain.NO} value={chain.chainId.toString()}>
                                {chain.name} (ID: {chain.chainId})
                              </option>
                            ))}
                          </Select>
                        </AddressField>
                        <AddressField>
                          <Label>合约地址<span className="required">*</span></Label>
                          <Input 
                            value={address.address} 
                            onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                            placeholder="例如：0x..."
                          />
                        </AddressField>
                        {editedToken.addressList.length > 0 && (
                          <RemoveButton onClick={() => handleRemoveAddress(index)}>×</RemoveButton>
                        )}
                      </AddressItem>
                    ))}
                    <AddButton onClick={handleAddAddress}>+ 添加地址</AddButton>
                  </AddressList>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveToken}>保存</Button>
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

const TokenStatus = styled.div<{ active: boolean }>`
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  min-width: 60px;
  text-align: center;
  white-space: nowrap;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  cursor: pointer;
`;

export default TokenConfig; 