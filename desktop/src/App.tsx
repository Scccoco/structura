import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';

// Pages
import HomePage from './pages/Home';
import ProjectsPage from './pages/Projects';
import ProjectPage from './pages/Project';
import ViewerPage from './pages/Viewer';

// АИД Module
import AIDRegistryPage from './pages/aid/Registry';
import AIDElementsPage from './pages/aid/Elements';

const App: React.FC = () => {
    return (
        <Layout style={{ minHeight: '100vh', background: '#0a0f1c' }}>
            <Routes>
                {/* Home */}
                <Route path="/" element={<HomePage />} />

                {/* Projects */}
                <Route path="/projects" element={<ProjectsPage />} />

                {/* Project with modules */}
                <Route path="/project/:projectId" element={<ProjectPage />} />

                {/* АИД Module routes */}
                <Route path="/project/:projectId/aid" element={<AIDRegistryPage />} />
                <Route path="/project/:projectId/aid/elements" element={<AIDElementsPage />} />

                {/* Viewer */}
                <Route path="/project/:projectId/viewer" element={<ViewerPage />} />

                {/* Legacy routes redirect */}
                <Route path="/aid/*" element={<Navigate to="/projects" />} />
                <Route path="/viewer/:projectId" element={<Navigate to="/projects" />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Layout>
    );
};

export default App;
