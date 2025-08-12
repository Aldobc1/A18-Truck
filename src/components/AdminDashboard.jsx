import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminLayout from './admin/AdminLayout';
import TruckManagement from './admin/TruckManagement';
import ProjectManagement from './admin/ProjectManagement';
import PointManagement from './admin/PointManagement';
import RecordsView from './admin/RecordsView';
import Dashboard from './admin/Dashboard';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trucks" element={<TruckManagement />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/points" element={<PointManagement />} />
        <Route path="/records" element={<RecordsView />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;