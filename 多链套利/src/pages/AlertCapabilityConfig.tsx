import React from 'react';
import styled from 'styled-components';
import { Typography } from 'antd';

const { Title } = Typography;

const PageContainer = styled.div`
  padding: 24px;
`;

const AlertCapabilityConfig: React.FC = () => {
  return (
    <PageContainer>
      <Title level={2}>告警能力配置</Title>
      {/* TODO: 根据产品需求文档实现具体功能 */}
    </PageContainer>
  );
};

export default AlertCapabilityConfig; 