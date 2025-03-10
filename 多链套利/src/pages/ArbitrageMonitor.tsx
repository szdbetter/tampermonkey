import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { tradingPairConfigAccess, TradingPairConfigModel, chainConfigAccess, ChainConfigModel } from '../services/database';

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

const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
`;

const FilterSelect = styled.select`
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: white;
  padding: 8px 12px;
  min-width: 150px;
  
  option {
    background-color: #333333;
  }
`;

const FilterLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #AAAAAA;
  font-size: 14px;
`;

const ArbitrageTable = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 0.5fr 1fr 1fr 1fr 1fr 1fr 0.5fr;
  padding: 15px;
  background-color: #333333;
  border-bottom: 1px solid #444444;
  
  @media (max-width: 1200px) {
    grid-template-columns: 0.5fr 1fr 1fr 1fr 1fr 0.5fr;
  }
`;

const TableHeaderCell = styled.div`
  color: #F0B90B;
  font-weight: bold;
  font-size: 14px;
`;

const TableRow = styled.div<{ highlight?: boolean }>`
  display: grid;
  grid-template-columns: 0.5fr 1fr 1fr 1fr 1fr 1fr 0.5fr;
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  background-color: ${props => props.highlight ? 'rgba(240, 185, 11, 0.1)' : 'transparent'};
  
  &:hover {
    background-color: #333333;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 0.5fr 1fr 1fr 1fr 1fr 0.5fr;
  }
`;

const TableCell = styled.div`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
`;

const ProfitCell = styled(TableCell)<{ positive: boolean }>`
  color: ${props => props.positive ? '#00AA00' : '#AA0000'};
  font-weight: bold;
`;

const ActionCell = styled(TableCell)`
  justify-content: center;
`;

const ActionLink = styled.button`
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const NoDataMessage = styled.div`
  color: #AAAAAA;
  font-size: 16px;
  text-align: center;
  padding: 50px 0;
`;

const RefreshButton = styled.button`
  background-color: #333333;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:hover {
    background-color: #444444;
  }
`;

const StatusBadge = styled.span<{ status: 'high' | 'medium' | 'low' }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${props => 
    props.status === 'high' ? '#00AA00' : 
    props.status === 'medium' ? '#F0B90B' : '#AA0000'};
  color: ${props => props.status === 'medium' ? '#000000' : '#FFFFFF'};
`;

interface ArbitrageOpportunity {
  id: number;
  pair: string;
  sourceChain: string;
  sourcePrice: number;
  targetChain: string;
  targetPrice: number;
  profitPercentage: number;
  status: 'high' | 'medium' | 'low';
  timestamp: string;
}

const ArbitrageMonitor: React.FC = () => {
  const [pairs, setPairs] = useState<TradingPairConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // 加载交易对和链配置
  useEffect(() => {
    const loadData = async () => {
      try {
        const pairsData = await tradingPairConfigAccess.getAll();
        const chainsData = await chainConfigAccess.getAll();
        
        setPairs(pairsData.filter(pair => pair.active));
        setChains(chainsData.filter(chain => chain.active));
        
        setLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // 模拟获取套利机会数据
  useEffect(() => {
    if (pairs.length > 0 && chains.length > 0) {
      fetchArbitrageOpportunities();
    }
  }, [pairs, chains]);
  
  const fetchArbitrageOpportunities = () => {
    setLoading(true);
    
    // 模拟API请求延迟
    setTimeout(() => {
      const mockOpportunities: ArbitrageOpportunity[] = [];
      
      // 为每个交易对生成随机套利机会
      pairs.forEach(pair => {
        // 获取该交易对支持的链
        const pairChains = pair.pairList
          .filter(p => p.active)
          .map(p => p.chain);
        
        // 如果至少有两条链，才能形成套利
        if (pairChains.length >= 2) {
          // 为每对链组合生成套利机会
          for (let i = 0; i < pairChains.length; i++) {
            for (let j = i + 1; j < pairChains.length; j++) {
              const sourceChain = pairChains[i];
              const targetChain = pairChains[j];
              
              // 随机生成价格和利润
              const sourcePrice = Math.random() * 2000 + 1000;
              const targetPrice = sourcePrice * (1 + (Math.random() * 0.1 - 0.05));
              const profitPercentage = ((targetPrice - sourcePrice) / sourcePrice) * 100;
              
              // 根据利润确定状态
              let status: 'high' | 'medium' | 'low';
              if (Math.abs(profitPercentage) > 3) {
                status = 'high';
              } else if (Math.abs(profitPercentage) > 1) {
                status = 'medium';
              } else {
                status = 'low';
              }
              
              // 只添加有利可图的机会
              if (profitPercentage > 0.5) {
                mockOpportunities.push({
                  id: mockOpportunities.length + 1,
                  pair: pair.name,
                  sourceChain,
                  sourcePrice,
                  targetChain,
                  targetPrice,
                  profitPercentage,
                  status,
                  timestamp: new Date().toLocaleString('zh-CN')
                });
              }
            }
          }
        }
      });
      
      setOpportunities(mockOpportunities);
      setLoading(false);
    }, 1000);
  };
  
  // 刷新套利机会数据
  const handleRefresh = () => {
    fetchArbitrageOpportunities();
  };
  
  // 过滤套利机会
  const filteredOpportunities = opportunities.filter(opp => {
    const pairMatch = selectedPair === 'all' || opp.pair === selectedPair;
    const statusMatch = selectedStatus === 'all' || opp.status === selectedStatus;
    return pairMatch && statusMatch;
  });
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>套利机会监控</PageTitle>
        <RefreshButton onClick={handleRefresh}>
          刷新数据
        </RefreshButton>
      </PageHeader>
      
      <FilterContainer>
        <FilterLabel>
          交易对
          <FilterSelect 
            value={selectedPair} 
            onChange={(e) => setSelectedPair(e.target.value)}
          >
            <option value="all">全部交易对</option>
            {pairs.map(pair => (
              <option key={pair.NO} value={pair.name}>{pair.name}</option>
            ))}
          </FilterSelect>
        </FilterLabel>
        
        <FilterLabel>
          机会等级
          <FilterSelect 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="high">高收益</option>
            <option value="medium">中等收益</option>
            <option value="low">低收益</option>
          </FilterSelect>
        </FilterLabel>
      </FilterContainer>
      
      <ArbitrageTable>
        <TableHeader>
          <TableHeaderCell>ID</TableHeaderCell>
          <TableHeaderCell>交易对</TableHeaderCell>
          <TableHeaderCell>源链 / 价格</TableHeaderCell>
          <TableHeaderCell>目标链 / 价格</TableHeaderCell>
          <TableHeaderCell>收益率</TableHeaderCell>
          <TableHeaderCell>状态</TableHeaderCell>
          <TableHeaderCell>操作</TableHeaderCell>
        </TableHeader>
        
        {loading ? (
          <NoDataMessage>加载中...</NoDataMessage>
        ) : filteredOpportunities.length > 0 ? (
          filteredOpportunities.map(opp => (
            <TableRow key={opp.id} highlight={opp.status === 'high'}>
              <TableCell>{opp.id}</TableCell>
              <TableCell>{opp.pair}</TableCell>
              <TableCell>
                {opp.sourceChain}<br />
                <span style={{ color: '#AAAAAA' }}>{opp.sourcePrice.toFixed(2)} USDT</span>
              </TableCell>
              <TableCell>
                {opp.targetChain}<br />
                <span style={{ color: '#AAAAAA' }}>{opp.targetPrice.toFixed(2)} USDT</span>
              </TableCell>
              <ProfitCell positive={opp.profitPercentage > 0}>
                {opp.profitPercentage > 0 ? '+' : ''}{opp.profitPercentage.toFixed(2)}%
              </ProfitCell>
              <TableCell>
                <StatusBadge status={opp.status}>
                  {opp.status === 'high' ? '高' : opp.status === 'medium' ? '中' : '低'}
                </StatusBadge>
              </TableCell>
              <ActionCell>
                <ActionLink>执行</ActionLink>
              </ActionCell>
            </TableRow>
          ))
        ) : (
          <NoDataMessage>没有找到符合条件的套利机会</NoDataMessage>
        )}
      </ArbitrageTable>
    </PageContainer>
  );
};

export default ArbitrageMonitor; 