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

const SaveButton = styled.button`
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

const EditorContainer = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
  height: calc(100vh - 200px);
`;

const Sidebar = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
`;

const SidebarHeader = styled.div`
  background-color: #333333;
  padding: 15px;
  color: white;
  font-weight: bold;
  border-bottom: 1px solid #444444;
`;

const ModuleList = styled.div`
  padding: 10px;
`;

const ModuleCategory = styled.div`
  margin-bottom: 15px;
`;

const CategoryTitle = styled.div`
  font-size: 14px;
  color: #888888;
  margin-bottom: 10px;
  padding: 0 5px;
`;

const ModuleItem = styled.div`
  background-color: #333333;
  border-radius: 3px;
  padding: 10px;
  margin-bottom: 8px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #444444;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const WorkflowContainer = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const WorkflowHeader = styled.div`
  background-color: #333333;
  padding: 15px;
  color: white;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #444444;
`;

const WorkflowTabs = styled.div`
  display: flex;
  gap: 10px;
`;

const WorkflowTab = styled.div<{ active: boolean }>`
  padding: 5px 15px;
  cursor: pointer;
  border-radius: 3px;
  background-color: ${props => props.active ? '#F0B90B' : 'transparent'};
  color: ${props => props.active ? '#000000' : '#FFFFFF'};
  
  &:hover {
    background-color: ${props => props.active ? '#F0B90B' : '#444444'};
  }
`;

const WorkflowActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  background-color: #444444;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: #555555;
  }
`;

const WorkflowCanvas = styled.div`
  flex-grow: 1;
  padding: 20px;
  position: relative;
  overflow: auto;
  background-color: #1A1A1A;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
`;

const NodeContainer = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: 200px;
  background-color: #333333;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  z-index: 10;
`;

const NodeHeader = styled.div`
  background-color: #F0B90B;
  color: #000000;
  padding: 10px;
  font-weight: bold;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NodeContent = styled.div`
  padding: 10px;
  color: white;
`;

const ConnectionPoint = styled.div<{ position: 'top' | 'right' | 'bottom' | 'left' }>`
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #F0B90B;
  border-radius: 50%;
  border: 2px solid #333333;
  z-index: 11;
  
  ${props => {
    switch (props.position) {
      case 'top':
        return `
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'right':
        return `
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
        `;
      case 'bottom':
        return `
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'left':
        return `
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
        `;
      default:
        return '';
    }
  }}
`;

const NodeField = styled.div`
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FieldLabel = styled.div`
  font-size: 12px;
  color: #888888;
  margin-bottom: 3px;
`;

const FieldInput = styled.input`
  width: 100%;
  background-color: #444444;
  border: 1px solid #555555;
  border-radius: 3px;
  padding: 5px;
  color: white;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const FieldSelect = styled.select`
  width: 100%;
  background-color: #444444;
  border: 1px solid #555555;
  border-radius: 3px;
  padding: 5px;
  color: white;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  padding: 15px;
  border-top: 1px solid #444444;
  max-height: 250px;
  overflow-y: auto;
`;

const ConfigPanelTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: white;
  margin-bottom: 15px;
`;

const ConfigForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
`;

// 模拟节点接口
interface NodeData {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  fields: {
    name: string;
    label: string;
    type: 'input' | 'select';
    options?: string[];
    value: string;
  }[];
}

// 模拟连接接口
interface ConnectionData {
  id: string;
  from: string;
  to: string;
  fromPosition: 'top' | 'right' | 'bottom' | 'left';
  toPosition: 'top' | 'right' | 'bottom' | 'left';
}

const StrategyEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'code'>('workflow');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // 模拟节点数据
  const [nodes, setNodes] = useState<NodeData[]>([
    {
      id: 'node1',
      type: 'dataSource',
      title: '数据源：以太坊价格',
      x: 100,
      y: 100,
      fields: [
        { name: 'api', label: 'API端点', type: 'input', value: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd' },
        { name: 'interval', label: '刷新间隔', type: 'select', options: ['5秒', '10秒', '30秒', '1分钟', '5分钟'], value: '30秒' }
      ]
    },
    {
      id: 'node2',
      type: 'operation',
      title: '操作：价格分析',
      x: 400,
      y: 100,
      fields: [
        { name: 'operator', label: '比较运算符', type: 'select', options: ['>', '<', '=', '>=', '<='], value: '<' },
        { name: 'threshold', label: '阈值', type: 'input', value: '3000' }
      ]
    },
    {
      id: 'node3',
      type: 'alert',
      title: '告警：Telegram通知',
      x: 700,
      y: 100,
      fields: [
        { name: 'channel', label: '通知渠道', type: 'select', options: ['Telegram', 'Email', 'Web推送', 'Webhook'], value: 'Telegram' },
        { name: 'message', label: '消息模板', type: 'input', value: 'ETH价格告警: ${price} USD' }
      ]
    }
  ]);
  
  // 模拟连接数据
  const [connections, setConnections] = useState<ConnectionData[]>([
    {
      id: 'conn1',
      from: 'node1',
      to: 'node2',
      fromPosition: 'right',
      toPosition: 'left'
    },
    {
      id: 'conn2',
      from: 'node2',
      to: 'node3',
      fromPosition: 'right',
      toPosition: 'left'
    }
  ]);
  
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };
  
  const handleFieldChange = (nodeId: string, fieldName: string, value: string) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? {
            ...node, 
            fields: node.fields.map(field => 
              field.name === fieldName ? { ...field, value } : field
            )
          }
        : node
    ));
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>策略编辑器</PageTitle>
        <SaveButton>保存策略</SaveButton>
      </PageHeader>
      
      <EditorContainer>
        <Sidebar>
          <SidebarHeader>组件库</SidebarHeader>
          <ModuleList>
            <ModuleCategory>
              <CategoryTitle>数据源</CategoryTitle>
              <ModuleItem>价格数据源</ModuleItem>
              <ModuleItem>合约事件监听</ModuleItem>
              <ModuleItem>链上交易监控</ModuleItem>
            </ModuleCategory>
            
            <ModuleCategory>
              <CategoryTitle>链配置</CategoryTitle>
              <ModuleItem>以太坊</ModuleItem>
              <ModuleItem>BSC</ModuleItem>
              <ModuleItem>Arbitrum</ModuleItem>
              <ModuleItem>Base</ModuleItem>
            </ModuleCategory>
            
            <ModuleCategory>
              <CategoryTitle>操作</CategoryTitle>
              <ModuleItem>条件判断</ModuleItem>
              <ModuleItem>计算</ModuleItem>
              <ModuleItem>多链价格比较</ModuleItem>
              <ModuleItem>APY计算</ModuleItem>
            </ModuleCategory>
            
            <ModuleCategory>
              <CategoryTitle>告警</CategoryTitle>
              <ModuleItem>Telegram通知</ModuleItem>
              <ModuleItem>邮件通知</ModuleItem>
              <ModuleItem>Web推送</ModuleItem>
              <ModuleItem>Webhook</ModuleItem>
            </ModuleCategory>
          </ModuleList>
        </Sidebar>
        
        <WorkflowContainer>
          <WorkflowHeader>
            <WorkflowTabs>
              <WorkflowTab 
                active={activeTab === 'workflow'} 
                onClick={() => setActiveTab('workflow')}
              >
                工作流视图
              </WorkflowTab>
              <WorkflowTab 
                active={activeTab === 'code'} 
                onClick={() => setActiveTab('code')}
              >
                代码视图
              </WorkflowTab>
            </WorkflowTabs>
            <WorkflowActions>
              <ActionButton>测试</ActionButton>
              <ActionButton>复制</ActionButton>
              <ActionButton>导出</ActionButton>
            </WorkflowActions>
          </WorkflowHeader>
          
          <WorkflowCanvas>
            {nodes.map(node => (
              <NodeContainer
                key={node.id}
                x={node.x}
                y={node.y}
                onClick={() => handleNodeClick(node.id)}
              >
                <NodeHeader>
                  {node.title}
                </NodeHeader>
                <NodeContent>
                  {node.fields.map(field => (
                    <NodeField key={field.name}>
                      <FieldLabel>{field.label}</FieldLabel>
                      {field.type === 'input' ? (
                        <FieldInput 
                          value={field.value} 
                          onChange={(e) => handleFieldChange(node.id, field.name, e.target.value)}
                        />
                      ) : (
                        <FieldSelect 
                          value={field.value}
                          onChange={(e) => handleFieldChange(node.id, field.name, e.target.value)}
                        >
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </FieldSelect>
                      )}
                    </NodeField>
                  ))}
                </NodeContent>
                <ConnectionPoint position="left" />
                <ConnectionPoint position="right" />
                <ConnectionPoint position="top" />
                <ConnectionPoint position="bottom" />
              </NodeContainer>
            ))}
            {/* 连接线将在实际实现中使用Canvas或SVG绘制 */}
          </WorkflowCanvas>
          
          {selectedNodeId && (
            <ConfigPanel>
              <ConfigPanelTitle>
                {nodes.find(n => n.id === selectedNodeId)?.title} 配置
              </ConfigPanelTitle>
              <ConfigForm>
                {nodes
                  .find(n => n.id === selectedNodeId)
                  ?.fields.map(field => (
                    <NodeField key={field.name}>
                      <FieldLabel>{field.label}</FieldLabel>
                      {field.type === 'input' ? (
                        <FieldInput 
                          value={field.value} 
                          onChange={(e) => handleFieldChange(selectedNodeId, field.name, e.target.value)}
                        />
                      ) : (
                        <FieldSelect 
                          value={field.value}
                          onChange={(e) => handleFieldChange(selectedNodeId, field.name, e.target.value)}
                        >
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </FieldSelect>
                      )}
                    </NodeField>
                  ))
                }
              </ConfigForm>
            </ConfigPanel>
          )}
        </WorkflowContainer>
      </EditorContainer>
    </PageContainer>
  );
};

export default StrategyEditor; 