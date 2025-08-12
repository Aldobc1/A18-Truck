import React from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiTruck, FiFolder, FiMapPin, FiFileText, FiTrendingUp } = FiIcons;

const Dashboard = () => {
  const { trucks, projects, exitPoints, deliveryPoints, records } = useData();

  const stats = [
    {
      name: 'Camiones',
      value: trucks.length,
      icon: FiTruck,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Proyectos',
      value: projects.length,
      icon: FiFolder,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Puntos',
      value: exitPoints.length + deliveryPoints.length,
      icon: FiMapPin,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Registros',
      value: records.length,
      icon: FiFileText,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  const recentRecords = records.slice(-5).reverse();

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 text-sm lg:text-base">Resumen del sistema de control de camiones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-xl p-4 lg:p-6 border border-gray-200`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 lg:p-3 rounded-lg`}>
                <SafeIcon icon={stat.icon} className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Registros Recientes</h2>
        </div>
        <div className="p-4 lg:p-6">
          {recentRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm lg:text-base">No hay registros aún</p>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              {recentRecords.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
                    <SafeIcon icon={FiTruck} className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{record.truck}</p>
                      <p className="text-xs lg:text-sm text-gray-600 truncate">
                        {record.exitTime ? 'Salida' : 'Entrega'} - {record.exitPoint || record.deliveryPoint}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs lg:text-sm text-gray-500">
                      {new Date(record.exitTime || record.deliveryTime).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(record.exitTime || record.deliveryTime).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;