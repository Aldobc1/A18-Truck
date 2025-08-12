import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiFileText, FiTruck, FiMapPin, FiClock, FiDownload, FiUser, FiFolder, FiAlertTriangle, FiFilter } = FiIcons;

const RecordsView = () => {
  const { records, projects, trucks } = useData();
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const processedRecords = useMemo(() => {
    return records.map(record => {
      const truck = trucks.find(t => t.plates === record.truck);
      const isCompleted = record.exitTime && record.deliveryTime;
      
      let actualTravelTime = 0;
      let hasAnomaly = false;
      
      if (isCompleted) {
        const exitTime = new Date(record.exitTime);
        const deliveryTime = new Date(record.deliveryTime);
        actualTravelTime = Math.round((deliveryTime - exitTime) / (1000 * 60)); // minutes
        
        if (truck && actualTravelTime > truck.estimatedTravelTime) {
          hasAnomaly = true;
        }
      }
      
      return {
        ...record,
        truck: truck,
        isCompleted,
        actualTravelTime,
        hasAnomaly,
        projectName: truck?.projectName || 'Sin proyecto'
      };
    });
  }, [records, trucks]);

  const filteredRecords = useMemo(() => {
    let filtered = processedRecords;

    // Filter by project
    if (projectFilter !== 'all') {
      filtered = filtered.filter(record => record.projectName === projectFilter);
    }

    // Filter by status
    if (statusFilter === 'completed') {
      filtered = filtered.filter(record => record.isCompleted);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(record => !record.isCompleted);
    } else if (statusFilter === 'anomalies') {
      filtered = filtered.filter(record => record.hasAnomaly);
    }

    return filtered;
  }, [processedRecords, projectFilter, statusFilter]);

  const averageTravelTime = useMemo(() => {
    const completedRecords = filteredRecords.filter(r => r.isCompleted && r.actualTravelTime > 0);
    if (completedRecords.length === 0) return 0;
    
    const totalTime = completedRecords.reduce((sum, record) => sum + record.actualTravelTime, 0);
    return Math.round(totalTime / completedRecords.length);
  }, [filteredRecords]);

  const exportToCSV = () => {
    const headers = [
      'Camión', 'Chofer', 'Proyecto', 'Etiqueta', 'Hora de Salida', 'Punto de Salida', 
      'Hora de Entrega', 'Punto de Entrega', 'M³ de Material', 'Tiempo Real (min)', 
      'Tiempo Estimado (min)', 'Estado', 'Anomalía'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.truck?.plates || 'N/A',
        record.truck?.driverName || 'N/A',
        record.projectName,
        record.nfcTag,
        record.exitTime ? new Date(record.exitTime).toLocaleString() : '',
        record.exitPoint || '',
        record.deliveryTime ? new Date(record.deliveryTime).toLocaleString() : '',
        record.deliveryPoint || '',
        record.materialM3 || '',
        record.actualTravelTime || '',
        record.truck?.estimatedTravelTime || '',
        record.isCompleted ? 'Completado' : 'Pendiente',
        record.hasAnomaly ? 'Sí' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registros_camiones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueProjects = [...new Set(processedRecords.map(r => r.projectName))];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Registros de Camiones</h1>
          <p className="text-gray-600 text-sm lg:text-base">Historial de entradas y salidas</p>
        </div>
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm lg:text-base"
          >
            <SafeIcon icon={FiDownload} className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Exportar CSV</span>
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto
            </label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
            >
              <option value="all">Todos los proyectos</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
            >
              <option value="all">Todos</option>
              <option value="completed">Completados</option>
              <option value="pending">Pendientes</option>
              <option value="anomalies">Con Anomalías</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo Promedio
            </label>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
              <SafeIcon icon={FiClock} className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900 text-sm lg:text-base">{averageTravelTime} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <SafeIcon icon={FiFileText} className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm lg:text-base">No hay registros disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camión
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chofer
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrega
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <SafeIcon icon={FiTruck} className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mr-2 lg:mr-3" />
                        <span className="text-xs lg:text-sm font-medium text-gray-900">{record.truck?.plates || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <SafeIcon icon={FiUser} className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 mr-1 lg:mr-2" />
                        <span className="text-xs lg:text-sm text-gray-900 truncate max-w-24 lg:max-w-none">{record.truck?.driverName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <SafeIcon icon={FiFolder} className="w-3 h-3 lg:w-4 lg:h-4 text-purple-600 mr-1 lg:mr-2" />
                        <span className="text-xs lg:text-sm text-gray-900 truncate max-w-20 lg:max-w-none">{record.projectName}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {record.exitTime ? (
                        <div className="text-xs lg:text-sm text-gray-900">
                          <div className="flex items-center">
                            <SafeIcon icon={FiMapPin} className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600 mr-1" />
                            <span className="truncate max-w-20 lg:max-w-none">{record.exitPoint}</span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(record.exitTime).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {record.deliveryTime ? (
                        <div className="text-xs lg:text-sm text-gray-900">
                          <div className="flex items-center">
                            <SafeIcon icon={FiMapPin} className="w-3 h-3 lg:w-4 lg:h-4 text-green-600 mr-1" />
                            <span className="truncate max-w-20 lg:max-w-none">{record.deliveryPoint}</span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(record.deliveryTime).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {record.isCompleted ? (
                        <div className="text-xs lg:text-sm">
                          <div className="flex items-center space-x-1 lg:space-x-2">
                            <SafeIcon icon={FiClock} className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                            <span className="text-gray-900">{record.actualTravelTime} min</span>
                            {record.hasAnomaly && (
                              <SafeIcon icon={FiAlertTriangle} className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-600" title="Excede tiempo estimado" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Est: {record.truck?.estimatedTravelTime || 'N/A'} min
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-1 lg:space-y-0 lg:space-x-2">
                        {record.isCompleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Pendiente
                          </span>
                        )}
                        {record.hasAnomaly && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Anomalía
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsView;