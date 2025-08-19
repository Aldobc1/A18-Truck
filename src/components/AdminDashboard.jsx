import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import TruckManagement from './admin/TruckManagement';
import ProjectManagement from './admin/ProjectManagement';
import PointManagement from './admin/PointManagement';
import RecordsView from './admin/RecordsView';
import Dashboard from './admin/Dashboard';
import WorkspaceManagement from './admin/WorkspaceManagement';
import PricingPlans from './PricingPlans';
import ProfileManagement from './admin/ProfileManagement';
import BillingManagement from './admin/BillingManagement';
import WebhookTester from './admin/WebhookTester';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trucks" element={<TruckManagement />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/points" element={<PointManagement />} />
        <Route path="/records" element={<RecordsView />} />
        <Route path="/workspaces" element={<WorkspaceManagement />} />
        <Route path="/pricing" element={<PricingPlans />} />
        <Route path="/profile" element={<ProfileManagement />} />
        <Route path="/billing" element={<BillingManagement />} />
        <Route path="/webhooks" element={<WebhookTester />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;