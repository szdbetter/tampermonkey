import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 54px;
  background-color: #232323;
  border-bottom: 1px solid #444444;
  padding: 0 25px;
`;

const Logo = styled(Link)`
  font-size: 20px;
  font-weight: bold;
  color: #F0B90B;
  text-decoration: none;
`;

const MainNav = styled.div`
  display: flex;
  margin-left: 40px;
`;

const NavItem = styled(Link)<{ active?: boolean }>`
  color: ${props => props.active ? '#FFFFFF' : '#AAAAAA'};
  text-decoration: none;
  margin: 0 12px;
  font-size: 14px;
  
  &:hover {
    color: #FFFFFF;
  }
`;

const UserArea = styled.div`
  display: flex;
  align-items: center;
`;

const UserAvatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: #333333;
  border: 2px solid #F0B90B;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 14px;
`;

const Header: React.FC = () => {
  return (
    <HeaderContainer>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Logo to="/">多链价格监控系统</Logo>
        <MainNav>
          <NavItem to="/" active>首页</NavItem>
          <NavItem to="/config">配置</NavItem>
          <NavItem to="/history">历史数据</NavItem>
          <NavItem to="/alerts">告警记录</NavItem>
          <NavItem to="/settings">系统设置</NavItem>
        </MainNav>
      </div>
      
      <UserArea>
        <UserAvatar>用户</UserAvatar>
      </UserArea>
    </HeaderContainer>
  );
};

export default Header; 