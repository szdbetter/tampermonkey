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
`;

const PairListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PairListTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 16px;
`;

const SearchInput = styled.input`
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: white;
  padding: 8px 12px;
  width: 100%;
  margin-top: 10px;
  
  &::placeholder {
    color: #888888;
  }
`;

const PairItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#333333' : 'transparent'};
  border-left: ${props => props.selected ? '3px solid #F0B90B' : 'none'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background-color: #333333;
  }
`;

const PairName = styled.div`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusIndicator = styled.span<{ active: boolean }>`
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
`;

const PricePanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  height: 100%;
  overflow: auto;
`;

const PriceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #3A3A3A;
`;

const PriceTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 20px;
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

const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const PriceCard = styled.div`
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
  display: flex;
  flex-direction: column;
`;

const ChainName = styled.div`
  color: #F0B90B;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
`;

const PriceInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const PriceLabel = styled.div`
  color: #AAAAAA;
  font-size: 14px;
`;

const PriceValue = styled.div<{ positive?: boolean; negative?: boolean }>`
  color: ${props => props.positive ? '#00AA00' : props.negative ? '#AA0000' : 'white'};
  font-size: 16px;
  font-weight: bold;
`;

const LastUpdated = styled.div`
  color: #888888;
  font-size: 12px;
  margin-top: 10px;
  text-align: right;
`;

const NoDataMessage = styled.div`
  color: #AAAAAA;
  font-size: 16px;
  text-align: center;
  margin-top: 50px;
`;

interface PriceData {
  chain: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastUpdated: string;
}

const PriceMonitor: React.FC = () => {
  const [pairs, setPairs] = useState<TradingPairConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedPair, setSelectedPair] = useState<TradingPairConfigModel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 加载交易对和链配置
  useEffect(() => {
    const loadData = async () => {
      try {
        const pairsData = await tradingPairConfigAccess.getAll();
        const chainsData = await chainConfigAccess.getAll();
        
        setPairs(pairsData.filter(pair => pair.active));
        setChains(chainsData.filter(chain => chain.active));
        
        if (pairsData.length > 0) {
          setSelectedPair(pairsData[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // 当选择交易对变化时，获取价格数据
  useEffect(() => {
    if (selectedPair) {
      fetchPriceData(selectedPair);
    }
  }, [selectedPair]);
  
  // 模拟获取价格数据
  const fetchPriceData = async (pair: TradingPairConfigModel) => {
    setLoading(true);
    
    // 模拟API请求延迟
    setTimeout(() => {
      const mockData: PriceData[] = pair.pairList
        .filter(p => p.active)
        .map(p => {
          const chain = chains.find(c => c.name === p.chain);
          const price = Math.random() * 2000 + 1000; // 模拟价格
          const change24h = (Math.random() * 10) - 5; // 模拟24小时变化
          const volume24h = Math.random() * 1000000 + 100000; // 模拟24小时交易量
          
          return {
            chain: p.chain,
            price,
            change24h,
            volume24h,
            lastUpdated: new Date().toLocaleString('zh-CN')
          };
        });
      
      setPriceData(mockData);
      setLoading(false);
    }, 1000);
  };
  
  // 刷新价格数据
  const handleRefresh = () => {
    if (selectedPair) {
      fetchPriceData(selectedPair);
    }
  };
  
  // 过滤交易对
  const filteredPairs = pairs.filter(pair => 
    pair.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>价格监控</PageTitle>
      </PageHeader>
      
      <ContentLayout>
        <PairList>
          <PairListHeader>
            <PairListTitle>交易对列表</PairListTitle>
          </PairListHeader>
          
          <div style={{ padding: '10px 15px' }}>
            <SearchInput 
              placeholder="搜索交易对..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ overflow: 'auto', height: 'calc(100% - 110px)' }}>
            {filteredPairs.map(pair => (
              <PairItem 
                key={pair.NO} 
                selected={selectedPair?.NO === pair.NO}
                onClick={() => setSelectedPair(pair)}
              >
                <PairName>
                  <StatusIndicator active={pair.active}>●</StatusIndicator>
                  {pair.name}
                </PairName>
              </PairItem>
            ))}
            
            {filteredPairs.length === 0 && (
              <NoDataMessage>没有找到匹配的交易对</NoDataMessage>
            )}
          </div>
        </PairList>
        
        <PricePanel>
          {selectedPair ? (
            <>
              <PriceHeader>
                <PriceTitle>{selectedPair.name} 价格信息</PriceTitle>
                <RefreshButton onClick={handleRefresh}>
                  刷新数据
                </RefreshButton>
              </PriceHeader>
              
              {loading ? (
                <NoDataMessage>加载中...</NoDataMessage>
              ) : (
                <PriceGrid>
                  {priceData.map((data, index) => (
                    <PriceCard key={index}>
                      <ChainName>{data.chain}</ChainName>
                      
                      <PriceInfo>
                        <PriceLabel>当前价格</PriceLabel>
                        <PriceValue>{data.price.toFixed(2)} USDT</PriceValue>
                      </PriceInfo>
                      
                      <PriceInfo>
                        <PriceLabel>24小时变化</PriceLabel>
                        <PriceValue 
                          positive={data.change24h > 0} 
                          negative={data.change24h < 0}
                        >
                          {data.change24h > 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                        </PriceValue>
                      </PriceInfo>
                      
                      <PriceInfo>
                        <PriceLabel>24小时交易量</PriceLabel>
                        <PriceValue>{(data.volume24h / 1000).toFixed(2)}K USDT</PriceValue>
                      </PriceInfo>
                      
                      <LastUpdated>最后更新: {data.lastUpdated}</LastUpdated>
                    </PriceCard>
                  ))}
                  
                  {priceData.length === 0 && (
                    <NoDataMessage>没有可用的价格数据</NoDataMessage>
                  )}
                </PriceGrid>
              )}
            </>
          ) : (
            <NoDataMessage>请选择一个交易对查看价格信息</NoDataMessage>
          )}
        </PricePanel>
      </ContentLayout>
    </PageContainer>
  );
};

export default PriceMonitor; 