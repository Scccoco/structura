import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConfigProvider
            locale={ruRU}
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#3b82f6',
                    borderRadius: 8,
                    colorBgContainer: '#111827',
                    colorBgElevated: '#1f2937',
                },
            }}
        >
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ConfigProvider>
    </React.StrictMode>
);
