import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import Header from './Header';
import Sidebar from './Sidebar';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1A1A1A;
  color: #FFFFFF;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const TabBar = styled.div`
  height: 40px;
  background-color: #2A2A2A;
  display: flex;
  align-items: center;
  padding: 0 10px;
`;

const Tab = styled.div<{ active?: boolean }>`
  height: 34px;
  border-radius: 5px;
  background-color: ${props => props.active ? '#F0B90B' : '#333333'};
  color: ${props => props.active ? '#000000' : '#FFFFFF'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  padding: 0 15px;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  font-size: 13px;
  cursor: pointer;
`;

const StatusBar = styled.div`
  height: 34px;
  background-color: #2D2D2D;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
`;

const StatusTitle = styled.div`
  font-weight: bold;
  color: #F0B90B;
  font-size: 14px;
`;

const LastUpdate = styled.div`
  color: #AAAAAA;
  font-size: 12px;
`;

const DashboardContent = styled.div`
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const BottomStatusBar = styled.div`
  height: 35px;
  background-color: #232323;
  border-top: 1px solid #333333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  font-size: 12px;
  color: #AAAAAA;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  margin-right: 20px;
`;

const StatusLight = styled.div<{ status: 'active' | 'warning' | 'error' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background-color: ${props => {
    switch(props.status) {
      case 'active': return '#00FF00';
      case 'warning': return '#FFFF00';
      case 'error': return '#FF0000';
      default: return '#AAAAAA';
    }
  }};
`;

const Version = styled.div`
  font-size: 11px;
  color: #666666;
`;

const MainLayout = () => {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  
  useEffect(() => {
    const now = new Date();
    const formattedTime = now.toLocaleString('zh-CN');
    setLastUpdateTime(formattedTime);
    
    const timer = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleString('zh-CN');
      setLastUpdateTime(formattedTime);
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <LayoutContainer>
      <Header />
      <ContentWrapper>
        <Sidebar />
        <MainContent>
          <TabBar>
            <Tab active>监控仪表板</Tab>
            <Tab>数据分析</Tab>
            <Tab>套利机会</Tab>
            <Tab>告警中心</Tab>
          </TabBar>
          <StatusBar>
            <StatusTitle>监控仪表板</StatusTitle>
            <LastUpdate>最后更新: {lastUpdateTime}</LastUpdate>
          </StatusBar>
          <DashboardContent>
            <Outlet />
          </DashboardContent>
          <BottomStatusBar>
            <div style={{ display: 'flex' }}>
              <StatusItem>
                <StatusLight status="active" />
                <span>系统正常</span>
              </StatusItem>
              <StatusItem>
                <StatusLight status="warning" />
                <span>API延迟: 230ms</span>
              </StatusItem>
            </div>
            <Version>v1.0.0</Version>
          </BottomStatusBar>
        </MainContent>
      </ContentWrapper>
    </LayoutContainer>
  );
};

export default MainLayout; 