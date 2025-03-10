import React from 'react';
import styled from 'styled-components';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  padding?: string;
}

const CardContainer = styled.div<{ padding?: string }>`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20px;
`;

const CardHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
`;

const CardBody = styled.div<{ padding?: string }>`
  padding: ${props => props.padding || '20px'};
`;

const Card: React.FC<CardProps> = ({ title, children, padding }) => {
  return (
    <CardContainer>
      {title && (
        <CardHeader>
          <h2>{title}</h2>
        </CardHeader>
      )}
      <CardBody padding={padding}>
        {children}
      </CardBody>
    </CardContainer>
  );
};

export default Card; 