import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './router';
import { ThemeProvider } from 'styled-components';
import theme from './styles/theme';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
};

export default App; 