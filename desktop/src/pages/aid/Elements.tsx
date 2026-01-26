// This file is kept for backwards compatibility
// The actual Elements content is now in ElementsContent.tsx and accessed via tabs in Registry.tsx

import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

const AIDElementsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    // Redirect to the main АИД page which now has tabs
    return <Navigate to={`/project/${projectId}/aid`} replace />;
};

export default AIDElementsPage;
