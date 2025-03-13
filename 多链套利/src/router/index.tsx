import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Home from '../pages/Home';
import StrategyList from '../pages/StrategyList';
import StrategyEditor from '../pages/StrategyEditor';
import TokenConfig from '../pages/TokenConfig';
import PairConfig from '../pages/PairConfig';
import ChainConfig from '../pages/ChainConfig';
import PriceMonitor from '../pages/PriceMonitor';
import ArbitrageMonitor from '../pages/ArbitrageMonitor';
import ExchangeConfig from '../pages/ExchangeConfig';
import ApiConfig from '../pages/ApiConfig';
import DataCollectionConfig from '../pages/DataCollectionConfig';
import DataProcessingConfig from '../pages/DataProcessingConfig';
import AlertCapabilityConfig from '../pages/AlertCapabilityConfig';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="strategies" element={<StrategyList />} />
        <Route path="strategies/editor" element={<StrategyEditor />} />
        <Route path="strategies/editor/:id" element={<StrategyEditor />} />
        
        {/* 基础配置路由 */}
        <Route path="config/chains" element={<ChainConfig />} />
        <Route path="config/tokens" element={<TokenConfig />} />
        <Route path="config/pairs" element={<PairConfig />} />
        <Route path="config/exchanges" element={<ExchangeConfig />} />
        <Route path="config/apis" element={<ApiConfig />} />
        
        {/* 能力配置路由 */}
        <Route path="capability/data-collection" element={<DataCollectionConfig />} />
        <Route path="capability/data-processing" element={<DataProcessingConfig />} />
        <Route path="capability/alert" element={<AlertCapabilityConfig />} />
        
        {/* 监控路由 */}
        <Route path="monitor/prices" element={<PriceMonitor />} />
        <Route path="monitor/arbitrage" element={<ArbitrageMonitor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 