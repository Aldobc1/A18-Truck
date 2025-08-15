import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminLayout from './superadmin/SuperAdminLayout';
import SuperAdminDashboardHome from './superadmin/SuperAdminDashboardHome';
import SuperAdminUsersManagement from './superadmin/SuperAdminUsersManagement';
import SuperAdminRecordsManagement from './superadmin/SuperAdminRecordsManagement';

const SuperAdminDashboard = () => {
  return (
    <SuperAdminLayout>
      <Routes>
        <Route path="/" element={<SuperAdminDashboardHome />} />
        <Route path="/users" element={<SuperAdminUsersManagement />} />
        <Route path="/records" element={<SuperAdminRecordsManagement />} />
        <Route path="*" element={<Navigate to="/superadmin" replace />} />
      </Routes>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;