import styled, { css } from 'styled-components';

interface ButtonProps {
  primary?: boolean;
  variant?: 'default' | 'danger' | 'success' | 'secondary';
}

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  
  ${props => props.primary && css`
    background-color: ${props.theme.colors.primary};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.colors.primaryDark};
    }
  `}
  
  ${props => !props.primary && props.variant === 'default' && css`
    background-color: white;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};
    
    &:hover {
      background-color: ${props.theme.colors.background};
    }
  `}
  
  ${props => props.variant === 'secondary' && css`
    background-color: ${props.theme.colors.secondary};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.colors.secondaryDark};
    }
  `}
  
  ${props => props.variant === 'danger' && css`
    background-color: ${props.theme.colors.danger};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.colors.dangerDark};
    }
  `}
  
  ${props => props.variant === 'success' && css`
    background-color: ${props.theme.colors.success};
    color: white;
    border: none;
    
    &:hover {
      background-color: ${props.theme.colors.successDark};
    }
  `}
`;

Button.defaultProps = {
  variant: 'default'
};

export default Button; 