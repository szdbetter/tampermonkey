import React, { useState } from 'react';
import styled from 'styled-components';

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
`;

const FilterBar = styled.div`
  display: flex;
  gap: 10px;
  background-color: #2A2A2A;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const FilterButton = styled.button<{ active: boolean }>`
  background-color: ${props => props.active ? '#F0B90B' : '#333333'};
  color: ${props => props.active ? '#000000' : '#FFFFFF'};
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => props.active ? '#d6a50a' : '#444444'};
  }
`;

const SearchInput = styled.input`
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  padding: 8px 16px;
  color: white;
  flex-grow: 1;
  margin-left: 10px;
  
  &::placeholder {
    color: #888888;
  }
`;

const AddButton = styled.button`
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

const StrategyTable = styled.div`
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid #333333;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  background-color: #333333;
  padding: 15px;
  font-weight: bold;
  color: white;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  padding: 15px;
  border-bottom: 1px solid #333333;
  background-color: #2A2A2A;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #353535;
  }
`;

const StatusTag = styled.span<{ status: 'active' | 'paused' | 'triggered' | 'error' }>`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background-color: rgba(0, 255, 0, 0.2);
          color: #00FF00;
        `;
      case 'paused':
        return `
          background-color: rgba(255, 255, 0, 0.2);
          color: #FFFF00;
        `;
      case 'triggered':
        return `
          background-color: rgba(0, 128, 255, 0.2);
          color: #0080FF;
        `;
      case 'error':
        return `
          background-color: rgba(255, 0, 0, 0.2);
          color: #FF0000;
        `;
      default:
        return '';
    }
  }}
`;

const ActionButton = styled.button`
  background-color: #444444;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  margin-right: 5px;
  
  &:hover {
    background-color: #555555;
  }
`;

const ActionButtonPrimary = styled(ActionButton)`
  background-color: #F0B90B;
  color: black;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const TypeTag = styled.span<{ type: 'price' | 'multichain' | 'complex' }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  
  ${props => {
    switch (props.type) {
      case 'price':
        return `
          background-color: rgba(240, 185, 11, 0.2);
          color: #F0B90B;
        `;
      case 'multichain':
        return `
          background-color: rgba(130, 71, 229, 0.2);
          color: #8247E5;
        `;
      case 'complex':
        return `
          background-color: rgba(0, 175, 240, 0.2);
          color: #00AFF0;
        `;
      default:
        return '';
    }
  }}
`;

interface Strategy {
  id: number;
  name: string;
  type: 'price' | 'multichain' | 'complex';
  status: 'active' | 'paused' | 'triggered' | 'error';
  created: string;
  lastRun: string;
}

const StrategyList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'price' | 'multichain' | 'complex'>('all');
  
  const strategies: Strategy[] = [
    { id: 1, name: 'ETH 价格监控', type: 'price', status: 'active', created: '2023-07-10', lastRun: '3分钟前' },
    { id: 2, name: 'BTC 目标价格告警', type: 'price', status: 'triggered', created: '2023-07-08', lastRun: '10分钟前' },
    { id: 3, name: 'USDT-USDC 多链套利', type: 'multichain', status: 'active', created: '2023-07-05', lastRun: '2分钟前' },
    { id: 4, name: 'ETH 跨链价格套利', type: 'multichain', status: 'paused', created: '2023-06-30', lastRun: '1天前' },
    { id: 5, name: 'sUSDe 多环节套利', type: 'complex', status: 'active', created: '2023-06-28', lastRun: '刚刚' },
    { id: 6, name: 'wstETH-ETH 套利', type: 'complex', status: 'error', created: '2023-06-25', lastRun: '5小时前' },
  ];
  
  const filteredStrategies = filter === 'all' 
    ? strategies 
    : strategies.filter(s => s.type === filter);
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>策略管理</PageTitle>
        <AddButton>
          <span>+</span> 新建策略
        </AddButton>
      </PageHeader>
      
      <FilterBar>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          全部策略
        </FilterButton>
        <FilterButton active={filter === 'price'} onClick={() => setFilter('price')}>
          价格监控
        </FilterButton>
        <FilterButton active={filter === 'multichain'} onClick={() => setFilter('multichain')}>
          多链监控
        </FilterButton>
        <FilterButton active={filter === 'complex'} onClick={() => setFilter('complex')}>
          复杂套利
        </FilterButton>
        <SearchInput placeholder="搜索策略名称..." />
      </FilterBar>
      
      <StrategyTable>
        <TableHeader>
          <div>策略名称</div>
          <div>类型</div>
          <div>创建时间</div>
          <div>最近执行</div>
          <div>状态</div>
          <div>操作</div>
        </TableHeader>
        
        {filteredStrategies.map(strategy => (
          <TableRow key={strategy.id}>
            <div>{strategy.name}</div>
            <div>
              <TypeTag type={strategy.type}>
                {strategy.type === 'price' ? '价格监控' : 
                 strategy.type === 'multichain' ? '多链监控' : '复杂套利'}
              </TypeTag>
            </div>
            <div>{strategy.created}</div>
            <div>{strategy.lastRun}</div>
            <div>
              <StatusTag status={strategy.status}>
                {strategy.status === 'active' ? '监控中' : 
                 strategy.status === 'paused' ? '已暂停' : 
                 strategy.status === 'triggered' ? '已触发' : '异常'}
              </StatusTag>
            </div>
            <div>
              <ActionButtonPrimary>编辑</ActionButtonPrimary>
              <ActionButton>删除</ActionButton>
            </div>
          </TableRow>
        ))}
      </StrategyTable>
    </PageContainer>
  );
};

export default StrategyList; 