import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { alertConfigAccess, AlertConfigModel } from '../services/database';

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

const AlertList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const AlertListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
`;

const AlertItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const AlertName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const AlertType = styled.div`
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    border-color: #F0B90B;
    outline: none;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  background-color: ${props => {
    switch(props.variant) {
      case 'primary': return '#F0B90B';
      case 'secondary': return '#444444';
      case 'danger': return '#AA0000';
      default: return '#F0B90B';
    }
  }};
  
  color: ${props => {
    switch(props.variant) {
      case 'primary': return '#000000';
      case 'secondary': return '#FFFFFF';
      case 'danger': return '#FFFFFF';
      default: return '#000000';
    }
  }};
  
  &:hover {
    background-color: ${props => {
      switch(props.variant) {
        case 'primary': return '#d6a50a';
        case 'secondary': return '#555555';
        case 'danger': return '#cc0000';
        default: return '#d6a50a';
      }
    }};
  }
`;

const ErrorMessage = styled.div`
  color: #FF0000;
  background-color: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: #AAAAAA;
  font-size: 16px;
`;

const AlertItems = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const InfoLabel = styled.div`
  width: 120px;
  color: #AAAAAA;
`;

const InfoValue = styled.div`
  flex: 1;
`;

const ConditionRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #333333;
  border-radius: 4px;
  margin-bottom: 10px;
  align-items: flex-end;
`;

const ConditionField = styled.div`
  flex: 1;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #FF0000;
  font-size: 16px;
`;

const AddButton = styled.button`
  background: none;
  border: 1px solid #F0B90B;
  color: #F0B90B;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
  display: inline-block;
  margin-top: 10px;
  
  &:hover {
    background-color: rgba(240, 185, 11, 0.1);
  }
`;

const RecipientTag = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: #333333;
  border-radius: 4px;
  padding: 5px 10px;
  margin-right: 8px;
  margin-bottom: 8px;
  
  span {
    margin-right: 8px;
  }
  
  button {
    background: none;
    border: none;
    color: #FF0000;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    display: flex;
    align-items: center;
  }
`;

const RecipientInput = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  
  input {
    flex: 1;
  }
  
  button {
    background-color: #F0B90B;
    color: #000000;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    
    &:hover {
      background-color: #d6a50a;
    }
  }
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

// 预设告警配置
const PRESET_ALERTS = [
  {
    name: "价格波动告警",
    type: "email" as const,
    config: {
      recipients: ["user@example.com"]
    },
    conditions: [
      { field: "priceChange", operator: ">" as const, value: 5, unit: "percent" }
    ]
  },
  {
    name: "套利机会告警",
    type: "telegram" as const,
    config: {
      apiKey: "your-telegram-bot-key"
    },
    conditions: [
      { field: "priceDiff", operator: ">" as const, value: 2, unit: "percent" }
    ]
  },
  {
    name: "Gas价格告警",
    type: "webhook" as const,
    config: {
      url: "https://example.com/webhook"
    },
    conditions: [
      { field: "gasPrice", operator: "<" as const, value: 20, unit: "gwei" }
    ]
  }
];

const AlertConfig: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertConfigModel[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAlert, setEditedAlert] = useState<AlertConfigModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRecipient, setNewRecipient] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const alertsData = await alertConfigAccess.getAll();
        
        setAlerts(alertsData);
        
        // 如果有告警数据且没有选中的告警，默认选择第一个
        if (alertsData.length > 0 && !selectedAlert) {
          setSelectedAlert(alertsData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('加载配置数据失败，请检查数据库连接');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // 验证告警名称唯一性
  const validateAlertUniqueness = async (alert: AlertConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有告警
    const allAlerts = await alertConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allAlerts.some(a => 
      a.name.toLowerCase() === alert.name.toLowerCase() && 
      (isNew || a.NO !== alert.NO)
    );
    
    if (nameExists) {
      return `告警名称 "${alert.name}" 已存在，请使用其他名称`;
    }
    
    return null;
  };
  
  // 处理预设告警选择
  const handlePresetAlertSelect = (preset: typeof PRESET_ALERTS[0]) => {
    if (editedAlert) {
      // 确保条件列表中的operator属性符合AlertConfigModel的条件类型要求
      const typedConditions = preset.conditions.map(condition => ({
        ...condition,
        operator: condition.operator as ">" | "<" | "==" | "!=" | ">=" | "<=" 
      }));
      
      setEditedAlert({
        ...editedAlert,
        name: preset.name,
        type: preset.type,
        config: { ...preset.config },
        conditions: typedConditions
      });
    }
  };
  
  // 选择告警
  const handleAlertSelect = (alert: AlertConfigModel) => {
    setSelectedAlert(alert);
    setIsEditing(false);
  };
  
  // 添加告警
  const handleAddAlert = () => {
    const newAlert: AlertConfigModel = {
      name: '',
      type: 'email',
      config: { 
        recipients: [],
        apiKeys: []
      },
      conditions: [],
      active: true
    };
    
    setSelectedAlert(newAlert);
    setEditedAlert(newAlert);
    setIsEditing(true);
  };
  
  // 编辑告警
  const handleEditAlert = () => {
    if (selectedAlert) {
      // 确保 conditions 存在
      const editedAlertCopy = { 
        ...selectedAlert, 
        conditions: selectedAlert.conditions || [] 
      };
      setEditedAlert(editedAlertCopy);
      setIsEditing(true);
    }
  };
  
  // 保存告警
  const handleSaveAlert = async () => {
    if (!editedAlert) return;
    
    // 验证必填字段
    if (!editedAlert.name.trim()) {
      setError('告警名称不能为空');
      return;
    }
    
    // 确保conditions是一个数组
    const conditions = editedAlert.conditions || [];
    
    // 验证触发条件（如果有）是否完整
    if (conditions.length > 0) {
      for (const condition of conditions) {
        if (!condition.field) {
          setError('请填写完整的触发条件字段');
          return;
        }
        
        if (condition.value === undefined || condition.value === null || condition.value === '') {
          setError('请填写完整的触发条件值');
          return;
        }
      }
    }
    
    // 验证告警配置
    if (editedAlert.type === 'email') {
      if (!editedAlert.config.recipients || editedAlert.config.recipients.length === 0) {
        setError('请至少添加一个邮件接收人');
        return;
      }
    } else if (editedAlert.type === 'telegram') {
      if (!editedAlert.config.apiKey) {
        setError('请填写Telegram API密钥');
        return;
      }
    } else if (editedAlert.type === 'webhook') {
      if (!editedAlert.config.url) {
        setError('请填写Webhook URL');
        return;
      }
    }
    
    try {
      // 验证告警名称唯一性
      const validationError = await validateAlertUniqueness(editedAlert, !editedAlert.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      let savedAlertNo: number;
      
      // 如果是新告警（没有NO字段），则创建新记录
      if (!editedAlert.NO) {
        savedAlertNo = await alertConfigAccess.create(editedAlert);
        
        // 获取最新的告警列表
        const updatedAlerts = await alertConfigAccess.getAll();
        setAlerts(updatedAlerts);
        
        // 查找并选择新创建的告警
        const newAlert = updatedAlerts.find(a => a.NO === savedAlertNo);
        if (newAlert) {
          setSelectedAlert(newAlert);
        }
      } else {
        // 如果是编辑现有告警，则更新记录
        await alertConfigAccess.update(editedAlert.NO, editedAlert);
        
        // 获取最新的告警列表
        const updatedAlerts = await alertConfigAccess.getAll();
        setAlerts(updatedAlerts);
        
        // 更新选中的告警
        const updatedAlert = updatedAlerts.find(a => a.NO === editedAlert.NO);
        if (updatedAlert) {
          setSelectedAlert(updatedAlert);
        }
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save alert:', err);
      setError('保存告警失败，请检查输入数据');
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAlert(null);
    
    // 如果是新建的告警且尚未保存，则清除选中状态
    if (selectedAlert && !selectedAlert.NO) {
      setSelectedAlert(alerts.length > 0 ? alerts[0] : null);
    }
  };
  
  // 删除告警
  const handleDeleteAlert = async () => {
    if (!selectedAlert || !selectedAlert.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedAlert.name} 吗？`)) {
      try {
        await alertConfigAccess.delete(selectedAlert.NO);
        
        // 获取最新的告警列表
        const updatedAlerts = await alertConfigAccess.getAll();
        setAlerts(updatedAlerts);
        
        // 如果还有告警，选择第一个；否则清空选择
        if (updatedAlerts.length > 0) {
          setSelectedAlert(updatedAlerts[0]);
        } else {
          setSelectedAlert(null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to delete alert:', err);
        setError('删除告警失败');
      }
    }
  };
  
  // 切换告警状态
  const handleToggleStatus = async (alert: AlertConfigModel) => {
    if (!alert.NO) return;
    
    try {
      // 更新告警状态
      const updatedAlert = { ...alert, active: !alert.active };
      await alertConfigAccess.update(alert.NO, updatedAlert);
      
      // 获取最新的告警列表
      const updatedAlerts = await alertConfigAccess.getAll();
      setAlerts(updatedAlerts);
      
      // 如果当前选中的告警是被更新的告警，也更新选中状态
      if (selectedAlert && selectedAlert.NO === alert.NO) {
        // 查找更新后的告警
        const refreshedAlert = updatedAlerts.find(a => a.NO === alert.NO);
        if (refreshedAlert) {
          setSelectedAlert(refreshedAlert);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to toggle alert status:', err);
      setError('更新告警状态失败');
    }
  };
  
  // 添加条件
  const handleAddCondition = () => {
    if (editedAlert) {
      setEditedAlert({
        ...editedAlert,
        conditions: [
          ...(editedAlert.conditions || []),
          { field: '', operator: '>' as const, value: 0 }
        ]
      });
    }
  };
  
  // 删除条件
  const handleRemoveCondition = (index: number) => {
    if (editedAlert) {
      const updatedConditions = [...(editedAlert.conditions || [])];
      updatedConditions.splice(index, 1);
      
      setEditedAlert({
        ...editedAlert,
        conditions: updatedConditions
      });
    }
  };
  
  // 修改条件
  const handleConditionChange = (index: number, field: string, value: any) => {
    if (editedAlert) {
      const conditions = [...(editedAlert.conditions || [])];
      conditions[index] = {
        ...conditions[index],
        [field]: value
      };
      
      setEditedAlert({
        ...editedAlert,
        conditions
      });
    }
  };
  
  // 添加接收者
  const handleAddRecipient = () => {
    if (editedAlert && newRecipient.trim() && editedAlert.type === 'email') {
      const recipients = editedAlert.config.recipients || [];
      
      if (!recipients.includes(newRecipient)) {
        setEditedAlert({
          ...editedAlert,
          config: {
            ...editedAlert.config,
            recipients: [...recipients, newRecipient]
          }
        });
      }
      
      setNewRecipient('');
    }
  };
  
  // 删除接收者
  const handleRemoveRecipient = (recipient: string) => {
    if (editedAlert && editedAlert.type === 'email') {
      const recipients = editedAlert.config.recipients || [];
      
      setEditedAlert({
        ...editedAlert,
        config: {
          ...editedAlert.config,
          recipients: recipients.filter(r => r !== recipient)
        }
      });
    }
  };
  
  // 添加API Key
  const handleAddApiKey = () => {
    if (!editedAlert || !newApiKey.trim()) return;
    
    // 确保不重复添加
    if (editedAlert.config.apiKeys?.includes(newApiKey.trim())) {
      setError('该API Key已存在');
      return;
    }
    
    const apiKeys = [...(editedAlert.config.apiKeys || []), newApiKey.trim()];
    
    setEditedAlert({
      ...editedAlert,
      config: {
        ...editedAlert.config,
        apiKeys
      }
    });
    
    setNewApiKey('');
  };
  
  // 删除API Key
  const handleRemoveApiKey = (apiKey: string) => {
    if (!editedAlert) return;
    
    const apiKeys = (editedAlert.config.apiKeys || []).filter(key => key !== apiKey);
    
    setEditedAlert({
      ...editedAlert,
      config: {
        ...editedAlert.config,
        apiKeys
      }
    });
  };
  
  // 获取告警类型显示名称
  const getAlertTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'email': return '邮件';
      case 'telegram': return 'Telegram';
      case 'webhook': return 'Webhook';
      default: return type;
    }
  };
  
  // 获取操作符显示名称
  const getOperatorDisplayName = (operator: string): string => {
    switch (operator) {
      case '>': return '大于';
      case '<': return '小于';
      case '==': return '等于';
      case '!=': return '不等于';
      case '>=': return '大于等于';
      case '<=': return '小于等于';
      default: return operator;
    }
  };
  
  // 根据告警类型渲染不同的配置表单
  const renderAlertTypeConfig = () => {
    if (!editedAlert) return null;
    
    switch (editedAlert.type) {
      case 'email':
        return (
          <>
            <Label>接收人邮箱<span className="required">*</span></Label>
            <div>
              {(editedAlert.config.recipients || []).map((recipient, index) => (
                <RecipientTag key={index}>
                  <span>{recipient}</span>
                  <button onClick={() => handleRemoveRecipient(recipient)}>×</button>
                </RecipientTag>
              ))}
            </div>
            <RecipientInput>
              <Input 
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="输入邮箱地址"
              />
              <Button onClick={handleAddRecipient}>添加</Button>
            </RecipientInput>
            
            <div style={{ marginTop: '20px' }}>
              <Label>API Keys (可选，用于轮流发送邮件)</Label>
              <div>
                {(editedAlert.config.apiKeys || []).map((apiKey, index) => (
                  <RecipientTag key={index}>
                    <span>{apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 8)}</span>
                    <button onClick={() => handleRemoveApiKey(apiKey)}>×</button>
                  </RecipientTag>
                ))}
              </div>
              <RecipientInput>
                <Input 
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="输入API Key (如Resend.com的密钥)"
                />
                <Button onClick={handleAddApiKey}>添加</Button>
              </RecipientInput>
              <small>提示: 添加多个API Key可以轮流使用，避免单个Key的发送限制</small>
            </div>
          </>
        );
      
      case 'telegram':
        return (
          <>
            <Label>Telegram Bot API Key<span className="required">*</span></Label>
            <Input 
              value={editedAlert.config.apiKey || ''}
              onChange={(e) => setEditedAlert({
                ...editedAlert,
                config: { ...editedAlert.config, apiKey: e.target.value }
              })}
              placeholder="输入Telegram Bot API Key"
            />
          </>
        );
      
      case 'webhook':
        return (
          <>
            <Label>Webhook URL<span className="required">*</span></Label>
            <Input 
              value={editedAlert.config.url || ''}
              onChange={(e) => setEditedAlert({
                ...editedAlert,
                config: { ...editedAlert.config, url: e.target.value }
              })}
              placeholder="输入Webhook URL"
            />
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>告警配置</PageTitle>
        <ActionButton onClick={handleAddAlert}>+ 添加告警</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <AlertList>
            <AlertListHeader>告警列表</AlertListHeader>
            <AlertItems>
              {alerts.map(alert => (
                <AlertItem 
                  key={alert.NO || alert.name} 
                  selected={selectedAlert?.NO === alert.NO}
                  onClick={() => handleAlertSelect(alert)}
                >
                  <AlertName selected={selectedAlert?.NO === alert.NO}>{alert.name}</AlertName>
                  <AlertType>{getAlertTypeDisplayName(alert.type)}</AlertType>
                  <StatusIndicator 
                    active={alert.active} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(alert);
                    }}
                  >
                    {alert.active ? '已启用' : '已禁用'}
                  </StatusIndicator>
                </AlertItem>
              ))}
              
              {alerts.length === 0 && (
                <EmptyMessage>暂无告警配置</EmptyMessage>
              )}
            </AlertItems>
          </AlertList>
          
          <ConfigPanel>
            {!isEditing && selectedAlert && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>告警名称:</InfoLabel>
                    <InfoValue>{selectedAlert.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>告警类型:</InfoLabel>
                    <InfoValue>{getAlertTypeDisplayName(selectedAlert.type)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedAlert.active}>
                        {selectedAlert.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>配置详情</SectionTitle>
                  {selectedAlert.type === 'email' && (
                    <InfoRow>
                      <InfoLabel>接收人:</InfoLabel>
                      <InfoValue>
                        {(selectedAlert.config.recipients || []).join(', ') || '无'}
                      </InfoValue>
                    </InfoRow>
                  )}
                  
                  {selectedAlert.type === 'telegram' && (
                    <InfoRow>
                      <InfoLabel>API Key:</InfoLabel>
                      <InfoValue>
                        {selectedAlert.config.apiKey || '无'}
                      </InfoValue>
                    </InfoRow>
                  )}
                  
                  {selectedAlert.type === 'webhook' && (
                    <InfoRow>
                      <InfoLabel>URL:</InfoLabel>
                      <InfoValue>
                        {selectedAlert.config.url || '无'}
                      </InfoValue>
                    </InfoRow>
                  )}
                </FormSection>
                
                <FormSection>
                  <SectionTitle>触发条件</SectionTitle>
                  {selectedAlert.conditions && selectedAlert.conditions.length > 0 ? (
                    selectedAlert.conditions.map((condition, index) => (
                      <ConditionRow key={index}>
                        <InfoLabel>监控字段:</InfoLabel>
                        <InfoValue>{condition.field}</InfoValue>
                        <InfoLabel>操作符:</InfoLabel>
                        <InfoValue>{getOperatorDisplayName(condition.operator)}</InfoValue>
                        <InfoLabel>阈值:</InfoLabel>
                        <InfoValue>
                          {condition.value}
                          {condition.unit ? ` ${condition.unit}` : ''}
                        </InfoValue>
                      </ConditionRow>
                    ))
                  ) : (
                    <EmptyMessage>暂无触发条件</EmptyMessage>
                  )}
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditAlert}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteAlert}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedAlert && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>告警名称<span className="required">*</span></Label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Input 
                          value={editedAlert.name} 
                          onChange={(e) => setEditedAlert({...editedAlert, name: e.target.value})}
                          placeholder="例如：价格波动告警"
                          style={{ flex: 1 }}
                        />
                        <Select 
                          value="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedPreset = PRESET_ALERTS.find(p => p.name === e.target.value);
                              if (selectedPreset) {
                                handlePresetAlertSelect(selectedPreset);
                              }
                            }
                          }}
                          style={{ width: '120px' }}
                        >
                          <option value="">选择预设</option>
                          {PRESET_ALERTS.map(alert => (
                            <option key={alert.name} value={alert.name}>{alert.name}</option>
                          ))}
                        </Select>
                      </div>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>告警类型<span className="required">*</span></Label>
                      <Select 
                        value={editedAlert.type} 
                        onChange={(e) => {
                          const newType = e.target.value as 'email' | 'telegram' | 'webhook';
                          let newConfig = {};
                          
                          // 根据不同类型设置默认配置
                          switch (newType) {
                            case 'email':
                              newConfig = { recipients: [] };
                              break;
                            case 'telegram':
                              newConfig = { apiKey: '' };
                              break;
                            case 'webhook':
                              newConfig = { url: '' };
                              break;
                          }
                          
                          setEditedAlert({
                            ...editedAlert, 
                            type: newType,
                            config: newConfig
                          });
                        }}
                      >
                        <option value="email">邮件</option>
                        <option value="telegram">Telegram</option>
                        <option value="webhook">Webhook</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup minWidth="120px">
                      <Label>状态</Label>
                      <Select 
                        value={editedAlert.active ? 'true' : 'false'}
                        onChange={(e) => setEditedAlert({...editedAlert, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>配置详情</SectionTitle>
                  {renderAlertTypeConfig()}
                </FormSection>
                
                <FormSection>
                  <SectionTitle>触发条件</SectionTitle>
                  {(editedAlert.conditions || []).map((condition, index) => (
                    <ConditionRow key={index}>
                      <ConditionField>
                        <Label>监控字段<span className="required">*</span></Label>
                        <Input 
                          value={condition.field} 
                          onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                          placeholder="例如：price"
                        />
                      </ConditionField>
                      <ConditionField style={{ flex: 0.5 }}>
                        <Label>操作符<span className="required">*</span></Label>
                        <Select 
                          value={condition.operator} 
                          onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                        >
                          <option value=">">大于 (&gt;)</option>
                          <option value="<">小于 (&lt;)</option>
                          <option value="==">等于 (==)</option>
                          <option value="!=">不等于 (!=)</option>
                          <option value=">=">大于等于 (&gt;=)</option>
                          <option value="<=">小于等于 (&lt;=)</option>
                        </Select>
                      </ConditionField>
                      <ConditionField>
                        <Label>阈值<span className="required">*</span></Label>
                        <Input 
                          type="number"
                          value={condition.value} 
                          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                          placeholder="例如：5.0"
                        />
                      </ConditionField>
                      <ConditionField style={{ flex: 0.5 }}>
                        <Label>单位</Label>
                        <Select 
                          value={condition.unit || ''} 
                          onChange={(e) => handleConditionChange(index, 'unit', e.target.value)}
                        >
                          <option value="">无</option>
                          <option value="percent">百分比 (%)</option>
                          <option value="usdt">USDT</option>
                          <option value="gwei">Gwei</option>
                        </Select>
                      </ConditionField>
                      <RemoveButton 
                        onClick={() => handleRemoveCondition(index)}
                        title="删除条件"
                      >
                        ×
                      </RemoveButton>
                    </ConditionRow>
                  ))}
                  <AddButton onClick={handleAddCondition}>
                    + 添加触发条件
                  </AddButton>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveAlert}>保存</Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>取消</Button>
                </ButtonGroup>
              </>
            )}
          </ConfigPanel>
        </ContentLayout>
      )}
    </PageContainer>
  );
};

export default AlertConfig; 