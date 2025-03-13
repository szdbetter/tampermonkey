import React, { useState, useEffect } from 'react';
import type { DataCollectionConfigModel } from '../utils/database';
import { Button, message, Descriptions, Tag, Typography, Form, Input, Select, Switch, Table, Modal } from 'antd';
import styled from 'styled-components';
import { Database } from '../utils/database';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 0;
`;

const ResultCard = styled.div`
  margin: 16px 0;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ConfigForm = styled(Form)`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const TableCard = styled.div`
  margin: 24px 0;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

let db: Database | null = null;

const initDatabase = async () => {
  return new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.open('arbitrage', 1);
    
    request.onerror = () => {
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = new Database(request.result);
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('data_collection_configs')) {
        database.createObjectStore('data_collection_configs', { keyPath: 'NO' });
      }
    };
  });
};

const DataCollectionConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [currentConfig, setCurrentConfig] = useState<DataCollectionConfigModel>({
    name: '',
    type: 'contract',
    active: true,
    config: {
      chainId: '',
      contractAddress: '',
      methodName: '',
      abi: '',
      contractParams: []
    }
  });
  const [configList, setConfigList] = useState<DataCollectionConfigModel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  } | null>(null);

  // 加载配置列表
  const loadConfigList = async () => {
    if (!db) {
      message.error('数据库未初始化');
      return;
    }

    setIsLoading(true);
    try {
      const configs = await db.getAllDataCollectionConfigs();
      setConfigList(configs);
    } catch (error: any) {
      console.error('加载配置列表失败:', error);
      message.error(error.message || '加载配置列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initDatabase()
      .then(() => loadConfigList())
      .catch(error => {
        console.error('初始化数据库失败:', error);
        message.error('初始化数据库失败');
      });
  }, []);

  // 处理表单值变化
  const handleValuesChange = (changedValues: any, allValues: any) => {
    const newConfig: DataCollectionConfigModel = {
      ...currentConfig,
      ...allValues,
      config: {
        ...currentConfig.config,
        ...allValues.config
      }
    };
    setCurrentConfig(newConfig);
  };

  // 编辑配置
  const handleEdit = (record: DataCollectionConfigModel) => {
    setCurrentConfig(record);
    form.setFieldsValue({
      ...record,
      config: record.config
    });
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!values.name) {
        message.error('请输入配置名称');
        return;
      }

      if (!db) {
        message.error('数据库未初始化');
        return;
      }

      setIsSaving(true);
      try {
        const configToSave = {
          ...currentConfig,
          ...values
        };

        if (currentConfig.NO) {
          await db.updateDataCollectionConfig(configToSave);
          message.success('配置已更新');
        } else {
          await db.addDataCollectionConfig(configToSave);
          message.success('配置已保存');
        }
        loadConfigList();
      } catch (error: any) {
        console.error('保存配置失败:', error);
        message.error(error.message || '保存配置失败');
      } finally {
        setIsSaving(false);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  // 删除配置
  const handleDelete = async () => {
    if (!currentConfig.NO) {
      return;
    }

    setShowDeleteConfirm(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!currentConfig.NO || !db) {
      return;
    }

    setIsDeleting(true);
    try {
      await db.deleteDataCollectionConfig(currentConfig.NO);
      message.success('配置已删除');
      form.resetFields();
      setCurrentConfig({
        name: '',
        type: 'contract',
        active: true,
        config: {
          chainId: '',
          contractAddress: '',
          methodName: '',
          abi: '',
          contractParams: []
        }
      });
      loadConfigList();
    } catch (error: any) {
      console.error('删除配置失败:', error);
      message.error(error.message || '删除配置失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 测试数据采集配置
  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setIsTesting(true);
      setTestResult(null);
      
      try {
        let response;
        
        switch (values.type) {
          case 'contract':
            response = await fetch('/api/test-contract', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chainId: values.config.chainId,
                contractAddress: values.config.contractAddress,
                methodName: values.config.methodName,
                abi: values.config.abi,
                params: values.config.contractParams
              })
            });
            break;
            
          case 'api':
            response = await fetch('/api/test-api', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                baseUrl: values.config.baseUrl,
                endpoint: values.config.endpoint,
                params: values.config.apiParams,
                headers: values.config.headers
              })
            });
            break;
            
          case 'websocket':
            response = await fetch('/api/test-websocket', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: values.config.url,
                message: values.config.message
              })
            });
            break;
            
          default:
            throw new Error('不支持的数据源类型');
        }
        
        const result = await response.json();
        setTestResult(result);
        
        if (result.success) {
          message.success('测试成功');
        } else {
          message.error(result.error || '测试失败');
        }
      } catch (error: any) {
        console.error('测试过程中发生错误:', error);
        setTestResult({
          success: false,
          message: '测试失败',
          error: error.message
        });
        message.error(error.message || '测试过程中发生错误');
      } finally {
        setIsTesting(false);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  // 新建配置
  const handleNew = () => {
    form.resetFields();
    setCurrentConfig({
      name: '',
      type: 'contract',
      active: true,
      config: {
        chainId: '',
        contractAddress: '',
        methodName: '',
        abi: '',
        contractParams: []
      }
    });
  };

  // 渲染不同类型的配置表单
  const renderConfigFields = () => {
    const type = form.getFieldValue('type');

    switch (type) {
      case 'contract':
        return (
          <>
            <Form.Item
              label="链ID"
              name={['config', 'chainId']}
              rules={[{ required: true, message: '请输入链ID' }]}
            >
              <Input placeholder="请输入链ID，例如：1（以太坊主网）" />
            </Form.Item>
            <Form.Item
              label="合约地址"
              name={['config', 'contractAddress']}
              rules={[{ required: true, message: '请输入合约地址' }]}
            >
              <Input placeholder="请输入合约地址" />
            </Form.Item>
            <Form.Item
              label="方法名"
              name={['config', 'methodName']}
              rules={[{ required: true, message: '请输入方法名' }]}
            >
              <Input placeholder="请输入要调用的方法名" />
            </Form.Item>
            <Form.Item
              label="ABI"
              name={['config', 'abi']}
              rules={[{ required: true, message: '请输入合约ABI' }]}
            >
              <TextArea
                rows={4}
                placeholder="请输入合约ABI（JSON格式）"
              />
            </Form.Item>
            <Form.Item
              label="参数"
              name={['config', 'contractParams']}
            >
              <TextArea
                rows={4}
                placeholder="请输入方法参数（JSON数组格式）"
              />
            </Form.Item>
          </>
        );

      case 'api':
        return (
          <>
            <Form.Item
              label="基础URL"
              name={['config', 'baseUrl']}
              rules={[{ required: true, message: '请输入基础URL' }]}
            >
              <Input placeholder="请输入API的基础URL" />
            </Form.Item>
            <Form.Item
              label="端点"
              name={['config', 'endpoint']}
              rules={[{ required: true, message: '请输入API端点' }]}
            >
              <Input placeholder="请输入API端点" />
            </Form.Item>
            <Form.Item
              label="参数"
              name={['config', 'apiParams']}
            >
              <TextArea
                rows={4}
                placeholder="请输入API参数（JSON对象格式）"
              />
            </Form.Item>
            <Form.Item
              label="请求头"
              name={['config', 'headers']}
            >
              <TextArea
                rows={4}
                placeholder="请输入请求头（JSON对象格式）"
              />
            </Form.Item>
          </>
        );

      case 'websocket':
        return (
          <>
            <Form.Item
              label="WebSocket URL"
              name={['config', 'url']}
              rules={[{ required: true, message: '请输入WebSocket URL' }]}
            >
              <Input placeholder="请输入WebSocket连接URL" />
            </Form.Item>
            <Form.Item
              label="消息"
              name={['config', 'message']}
            >
              <TextArea
                rows={4}
                placeholder="请输入要发送的消息（JSON格式）"
              />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '编号',
      dataIndex: 'NO',
      key: 'NO'
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          contract: '智能合约',
          api: 'API',
          websocket: 'WebSocket'
        };
        return typeMap[type as keyof typeof typeMap] || type;
      }
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataCollectionConfigModel) => (
        <Button type="link" onClick={() => handleEdit(record)}>
          编辑
        </Button>
      )
    }
  ];

  return (
    <div>
      <TableCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4}>配置列表</Title>
          <Button type="primary" onClick={handleNew}>
            新建
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={configList}
          rowKey="NO"
          loading={isLoading}
        />
      </TableCard>

      <ConfigForm
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={currentConfig}
      >
        <Form.Item
          label="配置名称"
          name="name"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="请输入配置名称" />
        </Form.Item>

        <Form.Item
          label="数据源类型"
          name="type"
          rules={[{ required: true, message: '请选择数据源类型' }]}
        >
          <Select>
            <Option value="contract">智能合约</Option>
            <Option value="api">API</Option>
            <Option value="websocket">WebSocket</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="是否启用"
          name="active"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {renderConfigFields()}
      </ConfigForm>
      
      <ButtonGroup>
        <Button
          type="primary"
          onClick={handleSave}
          loading={isSaving}
        >
          保存
        </Button>
        <Button
          onClick={handleTest}
          loading={isTesting}
          disabled={!currentConfig.NO}
        >
          测试
        </Button>
        <Button
          danger
          onClick={handleDelete}
          loading={isDeleting}
          disabled={!currentConfig.NO}
        >
          删除
        </Button>
      </ButtonGroup>
      
      {testResult && (
        <ResultCard>
          <Title level={4}>测试结果</Title>
          <Descriptions bordered>
            <Descriptions.Item label="状态">
              {testResult.success ? (
                <Tag color="success">成功</Tag>
              ) : (
                <Tag color="error">失败</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="消息">
              {testResult.message}
            </Descriptions.Item>
            {testResult.error && (
              <Descriptions.Item label="错误">
                {testResult.error}
              </Descriptions.Item>
            )}
            {testResult.data && (
              <Descriptions.Item label="数据" span={3}>
                <pre>
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        </ResultCard>
      )}

      <Modal
        title="确认删除"
        open={showDeleteConfirm}
        onOk={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmLoading={isDeleting}
      >
        <p>确定要删除配置"{currentConfig.name}"吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
};

export default DataCollectionConfigPage; 