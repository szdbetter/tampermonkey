import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Database, DataCollectionConfigModel } from '../utils/database';

// 定义数据加工配置模型（因为无法更新database.ts，所以在这里定义）
interface DataProcessingConfigModel {
  NO?: number;
  name: string;
  sourceNodeId: number; // 关联的数据采集节点ID
  inputParams: Array<{
    name: string;
    type: string;
    value?: any;
    selected?: boolean; // 是否选择作为计算输入
  }>;
  formulas: Array<{
    name: string;
    formula: string;
    description?: string;
    result?: any; // 临时存储公式计算结果
  }>;
  outputParams: Array<{
    name: string;
    type: string;
    value?: string; // 引用公式结果或输入参数
  }>;
  active: boolean;
  create_time?: number;
}

// 初始空节点
const emptyNode: DataProcessingConfigModel = {
  name: '',
  sourceNodeId: 0,
  inputParams: [],
  formulas: [],
  outputParams: [],
  active: true,
};

// 样式组件
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

const NodeList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const NodeListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NodeItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const NodeName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const NodeInfo = styled.div`
  font-size: 12px;
  color: #AAAAAA;
  margin-top: 4px;
`;

const StatusIndicator = styled.div<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  min-width: 60px;
  text-align: center;
  white-space: nowrap;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.active ? '#00AA00' : '#AA0000'};
    margin-right: 6px;
  }
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  height: 100%;
  overflow: auto;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #F0B90B;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #444444;
  padding-bottom: 8px;
`;

const FormRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  gap: 15px;
`;

const FormGroup = styled.div<{ flex?: number; minWidth?: string }>`
  flex: ${props => props.flex || 1};
  min-width: ${props => props.minWidth || 'auto'};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #FFFFFF;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    border-color: #F0B90B;
    outline: none;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  color: #FFFFFF;
  font-size: 14px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: #F0B90B;
  color: #000000;
  
  &:hover:not(:disabled) {
    background-color: #d6a50a;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: #444444;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #555555;
  }
`;

const DangerButton = styled(Button)`
  background-color: #AA0000;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #CC0000;
  }
`;

const ParameterTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #444444;
  color: #AAAAAA;
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid #444444;
`;

const AddButton = styled.button`
  background-color: #444444;
  color: #FFFFFF;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  
  &:hover {
    background-color: #555555;
  }
`;

const RemoveButton = styled.button`
  background-color: transparent;
  color: #AA0000;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TestResultPanel = styled.div`
  margin-top: 20px;
  background-color: #222222;
  border-radius: 4px;
  padding: 15px;
`;

const TestResultTitle = styled.div`
  font-weight: bold;
  margin-bottom: 10px;
  color: white;
`;

const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #333333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ResultKey = styled.span`
  color: #AAAAAA;
`;

const ResultValue = styled.span`
  color: #F0B90B;
  font-family: monospace;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #777777;
  text-align: center;
  padding: 20px;
`;

const EmptyStateTitle = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
`;

const EmptyStateDescription = styled.div`
  font-size: 14px;
  margin-bottom: 20px;
  max-width: 400px;
`;

const ErrorMessage = styled.div`
  color: #FF4444;
  font-size: 13px;
  margin-top: 5px;
`;

const SuccessMessage = styled.div`
  color: #00FF00;
  font-size: 13px;
  margin-top: 5px;
`;

const Card = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  margin-top: 20px;
`;

const Text = styled.p`
  color: white;
`;

const DataProcessingConfig: React.FC = () => {
  // 状态定义
  const [processingNodes, setProcessingNodes] = useState<DataProcessingConfigModel[]>([]);
  const [dataCollectionNodes, setDataCollectionNodes] = useState<DataCollectionConfigModel[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<DataProcessingConfigModel>({...emptyNode});
  const [isEditing, setIsEditing] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [variables, setVariables] = useState<Record<string, any>>({});

  // 加载所有节点数据
  const loadNodes = useCallback(async () => {
    try {
      // 从 localStorage 加载数据加工配置
      const storedNodes = localStorage.getItem('data_processing_configs');
      if (storedNodes) {
        setProcessingNodes(JSON.parse(storedNodes));
      }
      
      // 从 localStorage 加载数据采集节点数据
      const collectionNodesData = localStorage.getItem('data_collection_configs');
      if (collectionNodesData) {
        setDataCollectionNodes(JSON.parse(collectionNodesData));
      } else {
        // 如果本地没有数据，可以添加一些示例数据
        const sampleNodes = [
          { NO: 1, name: '以太坊价格', type: 'api', active: true },
          { NO: 2, name: 'USDT余额', type: 'contract', active: true },
          { NO: 3, name: '质押收益率', type: 'contract', active: true }
        ] as DataCollectionConfigModel[];
        
        setDataCollectionNodes(sampleNodes);
        localStorage.setItem('data_collection_configs', JSON.stringify(sampleNodes));
      }
    } catch (error) {
      console.error('加载节点数据失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // 添加新节点
  const handleAddNode = () => {
    setSelectedNodeId(null);
    setCurrentNode({...emptyNode});
    setIsEditing(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTestResults({});
  };

  // 选择节点
  const handleSelectNode = (node: DataProcessingConfigModel) => {
    setSelectedNodeId(node.NO || null);
    setCurrentNode({...node});
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
    setTestResults({});
  };

  // 编辑节点
  const handleEditNode = () => {
    setIsEditing(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    if (selectedNodeId) {
      const node = processingNodes.find(n => n.NO === selectedNodeId);
      if (node) {
        setCurrentNode({...node});
      }
    } else {
      setCurrentNode({...emptyNode});
    }
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 保存节点
  const handleSaveNode = async () => {
    // 验证必填字段
    if (!currentNode.name.trim()) {
      setErrorMessage('请输入节点名称');
      return;
    }
    
    if (!currentNode.sourceNodeId) {
      setErrorMessage('请选择关联的数据采集节点');
      return;
    }
    
    if (currentNode.formulas.length === 0) {
      setErrorMessage('请至少添加一个公式');
      return;
    }
    
    if (currentNode.outputParams.length === 0) {
      setErrorMessage('请至少添加一个传出参数');
      return;
    }
    
    try {
      // 为了开发测试，我们保存到 localStorage，因为database.ts中没有添加相关方法
      let updatedNodes;
      
      if (currentNode.NO) {
        // 更新已有节点
        updatedNodes = processingNodes.map(node => 
          node.NO === currentNode.NO ? {...currentNode} : node
        );
        setSuccessMessage('节点更新成功');
      } else {
        // 添加新节点
        const newNode = {
          ...currentNode,
          NO: Math.max(0, ...processingNodes.map(n => n.NO || 0)) + 1,
          create_time: Date.now()
        };
        updatedNodes = [...processingNodes, newNode];
        setSelectedNodeId(newNode.NO);
        setCurrentNode(newNode);
        setSuccessMessage('节点添加成功');
      }
      
      setProcessingNodes(updatedNodes);
      localStorage.setItem('data_processing_configs', JSON.stringify(updatedNodes));
      setIsEditing(false);
    } catch (error) {
      console.error('保存节点失败:', error);
      setErrorMessage('保存节点失败，请重试');
    }
  };

  // 删除节点
  const handleDeleteNode = async () => {
    if (!selectedNodeId) return;
    
    if (!window.confirm('确定要删除此节点吗？此操作不可恢复。')) return;
    
    try {
      // 为了开发测试，我们从 localStorage 删除数据
      const updatedNodes = processingNodes.filter(node => node.NO !== selectedNodeId);
      setProcessingNodes(updatedNodes);
      localStorage.setItem('data_processing_configs', JSON.stringify(updatedNodes));
      
      setSelectedNodeId(null);
      setCurrentNode({...emptyNode});
      setIsEditing(false);
      setSuccessMessage('节点删除成功');
    } catch (error) {
      console.error('删除节点失败:', error);
      setErrorMessage('删除节点失败，请重试');
    }
  };

  // 处理名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNode(prev => ({...prev, name: e.target.value}));
  };

  // 处理数据采集节点选择变更
  const handleSourceNodeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeId = parseInt(e.target.value);
    
    // 查找选中的数据采集节点
    const sourceNode = dataCollectionNodes.find(node => node.NO === nodeId);
    if (!sourceNode) return;
    
    // 清空之前的输入参数和公式
    setCurrentNode(prev => ({
      ...prev, 
      sourceNodeId: nodeId,
      inputParams: [],
      formulas: [],
      outputParams: []
    }));
    
    // 模拟从数据采集节点获取传出参数（这部分在实际应用中需要适配实际的数据结构）
    // 这里假设采集节点的传出参数可以从某处获取
    const sampleParams = [
      { name: '代币价格', type: 'number', value: 1500.25 },
      { name: '代币余额', type: 'number', value: 10.5 },
      { name: '收益率', type: 'number', value: 0.05 },
      { name: '锁定时间(天)', type: 'number', value: 7 }
    ];
    
    setCurrentNode(prev => ({
      ...prev,
      inputParams: sampleParams.map(p => ({ ...p, selected: false }))
    }));
  };

  // 处理输入参数选择状态变更
  const handleInputParamSelectionChange = (index: number, checked: boolean) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.inputParams];
      updatedParams[index] = { ...updatedParams[index], selected: checked };
      return { ...prev, inputParams: updatedParams };
    });
  };

  // 添加公式
  const handleAddFormula = () => {
    setCurrentNode(prev => ({
      ...prev,
      formulas: [...prev.formulas, { name: '', formula: '', description: '' }]
    }));
  };

  // 删除公式
  const handleRemoveFormula = (index: number) => {
    setCurrentNode(prev => {
      const updatedFormulas = [...prev.formulas];
      updatedFormulas.splice(index, 1);
      return { ...prev, formulas: updatedFormulas };
    });
  };

  // 处理公式名称变更
  const handleFormulaNameChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedFormulas = [...prev.formulas];
      updatedFormulas[index] = { ...updatedFormulas[index], name: value };
      return { ...prev, formulas: updatedFormulas };
    });
  };

  // 处理公式内容变更
  const handleFormulaChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedFormulas = [...prev.formulas];
      updatedFormulas[index] = { ...updatedFormulas[index], formula: value };
      return { ...prev, formulas: updatedFormulas };
    });
  };

  // 处理公式描述变更
  const handleFormulaDescriptionChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedFormulas = [...prev.formulas];
      updatedFormulas[index] = { ...updatedFormulas[index], description: value };
      return { ...prev, formulas: updatedFormulas };
    });
  };

  // 添加传出参数
  const handleAddOutputParam = () => {
    setCurrentNode(prev => ({
      ...prev,
      outputParams: [...prev.outputParams, { name: '', type: 'number', value: '' }]
    }));
  };

  // 删除传出参数
  const handleRemoveOutputParam = (index: number) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.outputParams];
      updatedParams.splice(index, 1);
      return { ...prev, outputParams: updatedParams };
    });
  };

  // 处理传出参数名称变更
  const handleOutputParamNameChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.outputParams];
      updatedParams[index] = { ...updatedParams[index], name: value };
      return { ...prev, outputParams: updatedParams };
    });
  };

  // 处理传出参数类型变更
  const handleOutputParamTypeChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.outputParams];
      updatedParams[index] = { ...updatedParams[index], type: value };
      return { ...prev, outputParams: updatedParams };
    });
  };

  // 处理传出参数值变更
  const handleOutputParamValueChange = (index: number, value: string) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.outputParams];
      updatedParams[index] = { ...updatedParams[index], value };
      return { ...prev, outputParams: updatedParams };
    });
  };

  // 测试计算
  const handleTestCalculation = () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // 构建变量对象
      const variables: Record<string, any> = {};
      
      // 添加所有选中的输入参数
      currentNode.inputParams.forEach(param => {
        if (param.selected) {
          variables[param.name] = param.value;
        }
      });
      
      // 计算所有公式
      const results: Record<string, any> = {};
      
      for (const formula of currentNode.formulas) {
        if (!formula.name || !formula.formula) continue;
        
        try {
          // 构建计算函数
          // eslint-disable-next-line no-new-func
          const calculate = new Function(...Object.keys(variables), ...Object.keys(results), 
            `return ${formula.formula}`);
          
          // 执行计算
          const result = calculate(...Object.values(variables), ...Object.values(results));
          results[formula.name] = result;
        } catch (error) {
          console.error(`计算公式 "${formula.name}" 失败:`, error);
          results[formula.name] = `错误: ${(error as Error).message}`;
        }
      }
      
      // 显示计算结果
      setTestResults(results);
      
      // 计算并显示输出参数
      const outputResults: Record<string, any> = {};
      currentNode.outputParams.forEach(param => {
        if (param.value) {
          if (results[param.value]) {
            outputResults[param.name] = results[param.value];
          } else if (variables[param.value]) {
            outputResults[param.name] = variables[param.value];
          } else {
            outputResults[param.name] = `未找到引用: ${param.value}`;
          }
        } else {
          outputResults[param.name] = '未设置值';
        }
      });
      
      // 更新测试结果，包含公式结果和输出参数
      setTestResults({
        ...results,
        '--- 输出参数 ---': '----------------------',
        ...outputResults
      });
      
      setSuccessMessage('计算成功');
    } catch (error) {
      console.error('计算过程出错:', error);
      setErrorMessage(`计算失败: ${(error as Error).message}`);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>数据加工能力</PageTitle>
        <ActionButton onClick={handleAddNode}>
          添加新节点
        </ActionButton>
      </PageHeader>

      <ContentLayout>
        <NodeList>
          <NodeListHeader>
            加工能力节点列表
          </NodeListHeader>
          {processingNodes.length > 0 ? (
            processingNodes.map(node => (
              <NodeItem
                key={node.NO}
                selected={selectedNodeId === node.NO}
                onClick={() => handleSelectNode(node)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <NodeName selected={selectedNodeId === node.NO}>{node.name}</NodeName>
                  <StatusIndicator active={node.active} />
                </div>
                <NodeInfo>
                  关联节点: {dataCollectionNodes.find(n => n.NO === node.sourceNodeId)?.name || '未知'}
                </NodeInfo>
              </NodeItem>
            ))
          ) : (
            <EmptyState>
              <EmptyStateTitle>暂无数据加工节点</EmptyStateTitle>
              <EmptyStateDescription>
                点击右上角的"添加新节点"按钮创建一个数据加工节点
              </EmptyStateDescription>
            </EmptyState>
          )}
        </NodeList>

        <ConfigPanel>
          {selectedNodeId || isEditing ? (
            <>
              <FormSection>
                <SectionTitle>基本信息</SectionTitle>
                <FormRow>
                  <FormGroup>
                    <Label>节点名称</Label>
                    <Input
                      type="text"
                      value={currentNode.name}
                      onChange={handleNameChange}
                      disabled={!isEditing}
                      placeholder="输入节点名称"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>状态</Label>
                    <Select
                      value={currentNode.active ? "1" : "0"}
                      onChange={(e) => setCurrentNode(prev => ({...prev, active: e.target.value === "1"}))}
                      disabled={!isEditing}
                    >
                      <option value="1">启用</option>
                      <option value="0">禁用</option>
                    </Select>
                  </FormGroup>
                </FormRow>
                <FormRow>
                  <FormGroup>
                    <Label>关联数据采集节点</Label>
                    <Select
                      value={currentNode.sourceNodeId.toString()}
                      onChange={handleSourceNodeChange}
                      disabled={!isEditing}
                    >
                      <option value="0">-- 选择数据采集节点 --</option>
                      {dataCollectionNodes.map(node => (
                        <option key={node.NO} value={node.NO?.toString()}>
                          {node.name}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                </FormRow>
              </FormSection>

              {currentNode.inputParams.length > 0 && (
                <FormSection>
                  <SectionTitle>传入参数</SectionTitle>
                  <ParameterTable>
                    <thead>
                      <tr>
                        <TableHeader style={{ width: '40px' }}>选择</TableHeader>
                        <TableHeader>参数名</TableHeader>
                        <TableHeader>类型</TableHeader>
                        <TableHeader>默认值</TableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {currentNode.inputParams.map((param, index) => (
                        <tr key={index}>
                          <TableCell>
                            <Checkbox
                              type="checkbox"
                              checked={param.selected || false}
                              onChange={(e) => handleInputParamSelectionChange(index, e.target.checked)}
                              disabled={!isEditing}
                            />
                          </TableCell>
                          <TableCell>{param.name}</TableCell>
                          <TableCell>{param.type}</TableCell>
                          <TableCell>{param.value}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </ParameterTable>
                </FormSection>
              )}

              <FormSection>
                <SectionTitle>公式定义</SectionTitle>
                {currentNode.formulas.map((formula, index) => (
                  <div key={index} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #444', borderRadius: '5px' }}>
                    <FormRow>
                      <FormGroup>
                        <Label>公式名称</Label>
                        <Input
                          type="text"
                          value={formula.name}
                          onChange={(e) => handleFormulaNameChange(index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="输入公式名称，如: APY"
                        />
                      </FormGroup>
                    </FormRow>
                    <FormRow>
                      <FormGroup>
                        <Label>公式内容</Label>
                        <Textarea
                          value={formula.formula}
                          onChange={(e) => handleFormulaChange(index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="输入公式，如: (收益 / 本金) * 365 / 锁定时间"
                        />
                      </FormGroup>
                    </FormRow>
                    <FormRow>
                      <FormGroup>
                        <Label>描述（可选）</Label>
                        <Input
                          type="text"
                          value={formula.description || ''}
                          onChange={(e) => handleFormulaDescriptionChange(index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="简要描述此公式的用途"
                        />
                      </FormGroup>
                    </FormRow>
                    {isEditing && (
                      <RemoveButton onClick={() => handleRemoveFormula(index)}>
                        删除此公式
                      </RemoveButton>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <AddButton onClick={handleAddFormula}>
                    添加公式
                  </AddButton>
                )}
              </FormSection>

              <FormSection>
                <SectionTitle>传出参数</SectionTitle>
                {currentNode.outputParams.map((param, index) => (
                  <div key={index} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #444', borderRadius: '5px' }}>
                    <FormRow>
                      <FormGroup>
                        <Label>参数名称</Label>
                        <Input
                          type="text"
                          value={param.name}
                          onChange={(e) => handleOutputParamNameChange(index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="输入参数名称"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>参数类型</Label>
                        <Select
                          value={param.type}
                          onChange={(e) => handleOutputParamTypeChange(index, e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="number">数字</option>
                          <option value="string">字符串</option>
                          <option value="boolean">布尔值</option>
                        </Select>
                      </FormGroup>
                    </FormRow>
                    <FormRow>
                      <FormGroup>
                        <Label>引用值</Label>
                        <Select
                          value={param.value || ''}
                          onChange={(e) => handleOutputParamValueChange(index, e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="">-- 选择引用 --</option>
                          <optgroup label="公式结果">
                            {currentNode.formulas.map((formula, i) => (
                              <option key={`formula-${i}`} value={formula.name}>
                                {formula.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="输入参数">
                            {currentNode.inputParams.filter(p => p.selected).map((param, i) => (
                              <option key={`input-${i}`} value={param.name}>
                                {param.name}
                              </option>
                            ))}
                          </optgroup>
                        </Select>
                      </FormGroup>
                    </FormRow>
                    {isEditing && (
                      <RemoveButton onClick={() => handleRemoveOutputParam(index)}>
                        删除此参数
                      </RemoveButton>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <AddButton onClick={handleAddOutputParam}>
                    添加传出参数
                  </AddButton>
                )}
              </FormSection>

              {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
              {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}

              <ButtonGroup>
                {isEditing ? (
                  <>
                    <PrimaryButton onClick={handleSaveNode}>保存</PrimaryButton>
                    <SecondaryButton onClick={handleCancelEdit}>取消</SecondaryButton>
                    {selectedNodeId && <SecondaryButton onClick={handleTestCalculation}>测试计算</SecondaryButton>}
                  </>
                ) : (
                  <>
                    <PrimaryButton onClick={handleEditNode}>编辑</PrimaryButton>
                    {selectedNodeId && (
                      <>
                        <SecondaryButton onClick={handleTestCalculation}>测试计算</SecondaryButton>
                        <DangerButton onClick={handleDeleteNode}>删除</DangerButton>
                      </>
                    )}
                  </>
                )}
              </ButtonGroup>

              {Object.keys(testResults).length > 0 && (
                <TestResultPanel>
                  <TestResultTitle>计算结果</TestResultTitle>
                  {Object.entries(testResults).map(([key, value], index) => (
                    <ResultItem key={index}>
                      <ResultKey>{key}:</ResultKey>
                      <ResultValue>
                        {typeof value === 'number' 
                          ? value.toFixed(6).replace(/\.?0+$/, '') 
                          : String(value)}
                      </ResultValue>
                    </ResultItem>
                  ))}
                </TestResultPanel>
              )}
            </>
          ) : (
            <EmptyState>
              <EmptyStateTitle>请选择或创建节点</EmptyStateTitle>
              <EmptyStateDescription>
                从左侧选择一个现有节点，或点击"添加新节点"按钮创建一个新的数据加工节点
              </EmptyStateDescription>
            </EmptyState>
          )}
        </ConfigPanel>
      </ContentLayout>
    </PageContainer>
  );
};

export default DataProcessingConfig; 