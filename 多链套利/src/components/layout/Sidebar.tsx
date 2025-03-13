import React, { useState } from 'react';
import styled from 'styled-components';
import { NavLink, useLocation } from 'react-router-dom';

const SidebarContainer = styled.aside`
  width: 220px;
  background-color: #232323;
  height: 100%;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.15);
`;

const SidebarHeader = styled.div`
  padding: 15px;
  padding-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333333;
`;

const SidebarTitle = styled.h2`
  color: #FFFFFF;
  font-size: 15px;
  margin: 0;
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

const SidebarSection = styled.div`
  margin-top: 20px;
`;

const SectionTitle = styled.div`
  color: #AAAAAA;
  font-size: 13px;
  padding: 0 15px;
  margin-bottom: 8px;
`;

const NavList = styled.div`
  margin-top: 8px;
`;

const NavItem = styled(NavLink)`
  padding: 12px 15px;
  margin: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  color: #FFFFFF;
  
  &:hover {
    background-color: #2a2a2a;
  }
  
  &.active {
    background-color: #333333;
    border-left: 3px solid #F0B90B;
    font-weight: bold;
  }
`;

const StrategyList = styled.div`
  margin-top: 8px;
`;

const StrategyItem = styled.div<{ active?: boolean }>`
  padding: 12px 15px;
  margin: 4px 8px;
  border-radius: 4px;
  background-color: ${props => props.active ? '#333333' : 'transparent'};
  border-left: ${props => props.active ? '3px solid #F0B90B' : 'none'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background-color: #2a2a2a;
  }
`;

const StrategyName = styled.span<{ active?: boolean }>`
  color: #FFFFFF;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  font-size: 13px;
`;

const StatusIndicator = styled.div<{ active?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#00AA00' : '#888888'};
`;

const FilterSection = styled.div`
  padding: 15px;
  margin-top: 15px;
`;

const FilterTitle = styled.div`
  color: #AAAAAA;
  font-size: 13px;
  margin-bottom: 8px;
`;

const FilterTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const FilterTag = styled.div<{ active?: boolean }>`
  padding: 4px 10px;
  border-radius: 12px;
  background-color: ${props => props.active ? '#F0B90B' : '#333333'};
  color: ${props => props.active ? '#000000' : '#FFFFFF'};
  font-size: 11px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#d6a50a' : '#3a3a3a'};
  }
`;

// 添加子菜单样式组件
const SubMenu = styled.div`
  margin-left: 15px;
`;

const SubMenuTitle = styled.div<{ isOpen: boolean }>`
  color: #FFFFFF;
  padding: 12px 15px;
  margin: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background-color: #2a2a2a;
  }
`;

const SubMenuIcon = styled.span<{ isOpen: boolean }>`
  transform: ${props => props.isOpen ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease;
`;

// 修改 SubMenuItems 组件样式
const SubMenuItems = styled.div<{ isOpen: boolean }>`
  max-height: ${props => props.isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

// API 子菜单组件
const ApiSubMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // 检查当前路径是否匹配 API 相关路径
  React.useEffect(() => {
    if (location.pathname.includes('/config/exchanges') || 
        location.pathname.includes('/config/apis')) {
      setIsOpen(true);
    }
  }, [location.pathname]);
  
  return (
    <div>
      <SubMenuTitle 
        isOpen={isOpen} 
        onClick={() => setIsOpen(!isOpen)}
      >
        API管理
        <SubMenuIcon isOpen={isOpen}>›</SubMenuIcon>
      </SubMenuTitle>
      {isOpen && (
        <div style={{ paddingLeft: '15px' }}>
          <NavItem to="/config/exchanges">
            交易所配置
          </NavItem>
          <NavItem to="/config/apis">
            API配置
          </NavItem>
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [activeStrategy, setActiveStrategy] = useState('1');
  const [basicConfigOpen, setBasicConfigOpen] = useState(false);
  const [capabilityConfigOpen, setCapabilityConfigOpen] = useState(true);
  
  // 检查当前路径是否匹配相关路径
  const isBasicConfigPath = location.pathname.includes('/config/') &&
                           !location.pathname.includes('/capability/');
  const isCapabilityPath = location.pathname.includes('/capability/');
  
  // 根据当前路径自动展开相应的菜单
  React.useEffect(() => {
    if (isBasicConfigPath && !basicConfigOpen) {
      setBasicConfigOpen(true);
    } else if (isCapabilityPath && !capabilityConfigOpen) {
      setCapabilityConfigOpen(true);
    }
  }, [location.pathname, isBasicConfigPath, basicConfigOpen, isCapabilityPath, capabilityConfigOpen]);
  
  return (
    <SidebarContainer>
      <SidebarHeader>
        <SidebarTitle>多链套利监控</SidebarTitle>
      </SidebarHeader>
      
      <SidebarSection>
        <SectionTitle>监控</SectionTitle>
        <NavList>
          <NavItem to="/" end>
            监控仪表板
          </NavItem>
          <NavItem to="/monitor/prices">
            价格监控
          </NavItem>
          <NavItem to="/monitor/arbitrage">
            套利机会监控
          </NavItem>
        </NavList>
      </SidebarSection>
      
      {/* 基础配置模块 */}
      <SidebarSection>
        <SubMenuTitle 
          isOpen={basicConfigOpen} 
          onClick={() => setBasicConfigOpen(!basicConfigOpen)}
        >
          基础配置
          <SubMenuIcon isOpen={basicConfigOpen}>›</SubMenuIcon>
        </SubMenuTitle>
        {basicConfigOpen && (
          <NavList>
            <NavItem to="/config/chains">
              链配置
            </NavItem>
            <NavItem to="/config/tokens">
              Token配置
            </NavItem>
            <NavItem to="/config/pairs">
              交易对配置
            </NavItem>
            
            {/* API管理子菜单 */}
            <ApiSubMenu />
          </NavList>
        )}
      </SidebarSection>
      
      {/* 能力配置模块 */}
      <SidebarSection>
        <SubMenuTitle 
          isOpen={capabilityConfigOpen} 
          onClick={() => setCapabilityConfigOpen(!capabilityConfigOpen)}
        >
          能力配置
          <SubMenuIcon isOpen={capabilityConfigOpen}>›</SubMenuIcon>
        </SubMenuTitle>
        {capabilityConfigOpen && (
          <NavList>
            <NavItem to="/capability/data-collection">
              数据采集能力
            </NavItem>
            <NavItem to="/capability/data-processing">
              数据加工能力
            </NavItem>
            <NavItem to="/capability/alert">
              告警能力
            </NavItem>
          </NavList>
        )}
      </SidebarSection>
      
      <SidebarSection>
        <SectionTitle>策略</SectionTitle>
        <NavList>
          <NavItem to="/strategies">
            策略列表
          </NavItem>
        </NavList>
      </SidebarSection>
      
      <SidebarHeader style={{ marginTop: '20px' }}>
        <SidebarTitle>策略列表</SidebarTitle>
        <AddButton>新增</AddButton>
      </SidebarHeader>
      
      <StrategyList>
        <StrategyItem active={activeStrategy === '1'} onClick={() => setActiveStrategy('1')}>
          <StrategyName active={activeStrategy === '1'}>ETH价格监控</StrategyName>
          <StatusIndicator active />
        </StrategyItem>
        
        <StrategyItem active={activeStrategy === '2'} onClick={() => setActiveStrategy('2')}>
          <StrategyName active={activeStrategy === '2'}>ETH-BSC套利监控</StrategyName>
          <StatusIndicator active />
        </StrategyItem>
        
        <StrategyItem active={activeStrategy === '3'} onClick={() => setActiveStrategy('3')}>
          <StrategyName active={activeStrategy === '3'}>sUSDe套利监控</StrategyName>
          <StatusIndicator />
        </StrategyItem>
        
        <StrategyItem active={activeStrategy === '4'} onClick={() => setActiveStrategy('4')}>
          <StrategyName active={activeStrategy === '4'}>Arbitrum-Base套利</StrategyName>
          <StatusIndicator active />
        </StrategyItem>
      </StrategyList>
      
      <FilterSection>
        <FilterTitle>策略类型筛选</FilterTitle>
        <FilterTags>
          <FilterTag active>全部</FilterTag>
          <FilterTag>价格</FilterTag>
          <FilterTag>多链</FilterTag>
          <FilterTag>多环节套利</FilterTag>
        </FilterTags>
      </FilterSection>
    </SidebarContainer>
  );
};

export default Sidebar; 