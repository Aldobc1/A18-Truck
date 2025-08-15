import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import supabase from '../../lib/supabase';
import { format } from 'date-fns';

const { 
  FiFileText, FiFilter, FiSearch, FiCalendar, FiDownload,
  FiTruck, FiMapPin, FiClock, FiAlertTriangle, FiUser,
  FiFolder, FiRefreshCw, FiTrash2, FiEye, FiCheck, FiX
} = FiIcons;

const SuperAdminRecordsManagement = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [workspaces, setWorkspaces] = useState([]);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Cargar registros y workspaces al montar el componente
  useEffect(() => {
    fetchRecords();
    fetchWorkspaces();
  }, []);

  // Función para obtener registros
  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Obtener todos los registros con información de camiones y proyectos
      const { data, error } = await supabase
        .from('records_a18')
        .select(`
          *,
          trucks_a18 (
            plates,
            driver_name,
            project_name,
            estimated_travel_time,
            project_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar registros para cálculos adicionales
      const processedRecords = data.map(record => {
        let actualTravelTime = 0;
        let hasAnomaly = false;
        let isCompleted = false;
        let status = 'pending';
        
        // Si tiene tiempo de salida y entrega, calcular tiempo de viaje
        if (record.exit_time && record.delivery_time) {
          isCompleted = true;
          status = 'completed';
          
          const exitTime = new Date(record.exit_time);
          const deliveryTime = new Date(record.delivery_time);
          actualTravelTime = Math.round((deliveryTime - exitTime) / (1000 * 60)); // minutos
          
          // Comprobar si hay anomalía (tiempo excede lo estimado)
          if (record.trucks_a18 && 
              record.trucks_a18.estimated_travel_time && 
              actualTravelTime > record.trucks_a18.estimated_travel_time) {
            hasAnomaly = true;
            status = 'anomaly';
          }
        }
        
        // Extraer workspace_id del proyecto
        let workspaceId = null;
        if (record.trucks_a18 && record.trucks_a18.project_id) {
          // Aquí normalmente haríamos una consulta adicional, pero por ahora
          // asumimos que tendremos esta información de alguna manera
          workspaceId = record.workspace_id || null;
        }
        
        return {
          ...record,
          actualTravelTime,
          hasAnomaly,
          isCompleted,
          status,
          workspaceId
        };
      });

      setRecords(processedRecords);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Error al cargar los registros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener workspaces
  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces_a18')
        .select('*');

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  // Función para filtrar registros
  const getFilteredRecords = () => {
    return records.filter(record => {
      // Filtro de texto (busca en placa, conductor, proyecto, puntos)
      const textMatch = 
        (!filterText) ||
        (record.trucks_a18?.plates && record.trucks_a18.plates.toLowerCase().includes(filterText.toLowerCase())) ||
        (record.trucks_a18?.driver_name && record.trucks_a18.driver_name.toLowerCase().includes(filterText.toLowerCase())) ||
        (record.trucks_a18?.project_name && record.trucks_a18.project_name.toLowerCase().includes(filterText.toLowerCase())) ||
        (record.exit_point && record.exit_point.toLowerCase().includes(filterText.toLowerCase())) ||
        (record.delivery_point && record.delivery_point.toLowerCase().includes(filterText.toLowerCase()));
      
      // Filtro de fecha desde
      const fromDateMatch = !filterDateFrom || 
        (record.created_at && new Date(record.created_at) >= new Date(filterDateFrom));
      
      // Filtro de fecha hasta
      const toDateMatch = !filterDateTo || 
        (record.created_at && new Date(record.created_at) <= new Date(filterDateTo + 'T23:59:59'));
      
      // Filtro de workspace
      const workspaceMatch = filterWorkspace === 'all' || 
        record.workspaceId === filterWorkspace;
      
      // Filtro de estado
      const statusMatch = filterStatus === 'all' || 
        record.status === filterStatus;
      
      return textMatch && fromDateMatch && toDateMatch && workspaceMatch && statusMatch;
    });
  };

  // Función para exportar registros a CSV
  const exportToCSV = () => {
    try {
      const filteredRecords = getFilteredRecords();
      
      // Preparar encabezados del CSV
      const headers = [
        'ID', 'Camión', 'Conductor', 'Proyecto', 
        'Hora Salida', 'Punto Salida', 
        'Hora Entrega', 'Punto Entrega',
        'Material M3', 'Tiempo Real (min)', 'Tiempo Est. (min)',
        'Estado', 'Anomalía', 'Fecha Registro'
      ];
      
      // Preparar filas de datos
      const rows = filteredRecords.map(record => [
        record.id,
        record.trucks_a18?.plates || 'N/A',
        record.trucks_a18?.driver_name || 'N/A',
        record.trucks_a18?.project_name || 'N/A',
        record.exit_time ? new Date(record.exit_time).toLocaleString() : 'N/A',
        record.exit_point || 'N/A',
        record.delivery_time ? new Date(record.delivery_time).toLocaleString() : 'N/A',
        record.delivery_point || 'N/A',
        record.material_m3 || 'N/A',
        record.actualTravelTime || 'N/A',
        record.trucks_a18?.estimated_travel_time || 'N/A',
        record.isCompleted ? 'Completado' : 'Pendiente',
        record.hasAnomaly ? 'Sí' : 'No',
        record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'
      ]);
      
      // Combinar encabezados y filas
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Crear y descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'registros_camiones.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error al exportar registros:', err);
      setError('Error al exportar registros: ' + err.message);
    }
  };

  // Función para ver detalles de un registro
  const viewRecordDetails = (record) => {
    setSelectedRecord(record);
    setShowRecordDetails(true);
  };

  // Función para confirmar eliminación
  const confirmDelete = (recordId) => {
    setDeleteConfirmation(recordId);
  };

  // Función para eliminar registro
  const deleteRecord = async (recordId) => {
    try {
      const { error } = await supabase
        .from('records_a18')
        .delete()
        .eq('id', recordId);
        
      if (error) throw error;
      
      // Actualizar lista de registros
      setRecords(records.filter(record => record.id !== recordId));
      setSuccess('Registro eliminado exitosamente');
      setDeleteConfirmation(null);
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      setError('Error al eliminar registro: ' + err.message);
      
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Filtrar registros
  const filteredRecords = getFilteredRecords();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros del Sistema</h1>
          <p className="text-gray-600">Monitoreo y administración de todas las operaciones</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchRecords}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiDownload} className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiFilter} className="w-5 h-5 mr-2 text-red-600" />
            Filtros
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por camión, conductor, proyecto..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
          
          <div className="relative">
            <SafeIcon icon={FiCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              placeholder="Desde"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
          
          <div className="relative">
            <SafeIcon icon={FiCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              placeholder="Hasta"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterWorkspace}
              onChange={(e) => setFilterWorkspace(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            >
              <option value="all">Todos los workspaces</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completados</option>
              <option value="anomaly">Con anomalías</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2 text-red-600" />
              Registros
            </h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
              {filteredRecords.length}
            </span>
          </div>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <SafeIcon icon={FiFileText} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Camión
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salida
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrega
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <SafeIcon icon={FiTruck} className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{record.trucks_a18?.plates || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{record.trucks_a18?.driver_name || 'Sin conductor'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <SafeIcon icon={FiFolder} className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">{record.trucks_a18?.project_name || 'Sin proyecto'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {record.exit_time ? (
                          <div>
                            <div className="text-sm text-gray-900 flex items-center">
                              <SafeIcon icon={FiMapPin} className="w-3 h-3 text-orange-500 mr-1" />
                              <span>{record.exit_point}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(record.exit_time), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No registrada</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {record.delivery_time ? (
                          <div>
                            <div className="text-sm text-gray-900 flex items-center">
                              <SafeIcon icon={FiMapPin} className="w-3 h-3 text-green-500 mr-1" />
                              <span>{record.delivery_point}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(record.delivery_time), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No registrada</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {record.isCompleted ? (
                            record.hasAnomaly ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Anomalía
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Completado
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              Pendiente
                            </span>
                          )}
                          {record.isCompleted && (
                            <div className="ml-2 text-xs text-gray-500 flex items-center">
                              <SafeIcon icon={FiClock} className="w-3 h-3 mr-1" />
                              {record.actualTravelTime} min
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => viewRecordDetails(record)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Ver detalles"
                          >
                            <SafeIcon icon={FiEye} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(record.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Eliminar registro"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles de Registro */}
      {showRecordDetails && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2 text-red-600" />
                Detalles del Registro
              </h2>
              <button
                onClick={() => setShowRecordDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Información del camión */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <SafeIcon icon={FiTruck} className="w-5 h-5 mr-2 text-blue-600" />
                  Información del Camión
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Placas</p>
                    <p className="text-base font-medium">{selectedRecord.trucks_a18?.plates || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Conductor</p>
                    <p className="text-base font-medium">{selectedRecord.trucks_a18?.driver_name || 'Sin conductor'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Proyecto</p>
                    <p className="text-base font-medium">{selectedRecord.trucks_a18?.project_name || 'Sin proyecto'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Material</p>
                    <p className="text-base font-medium">{selectedRecord.material_m3 || 'N/A'} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tiempo Estimado</p>
                    <p className="text-base font-medium">{selectedRecord.trucks_a18?.estimated_travel_time || 'N/A'} min</p>
                  </div>
                </div>
              </div>
              
              {/* Información de la operación */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <SafeIcon icon={FiMapPin} className="w-5 h-5 mr-2 text-green-600" />
                  Detalles de la Operación
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Estado</p>
                    <div className="mt-1">
                      {selectedRecord.isCompleted ? (
                        selectedRecord.hasAnomaly ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Con anomalías
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completado
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Punto de Salida</p>
                    {selectedRecord.exit_time ? (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <div className="flex items-center text-orange-800 font-medium">
                          <SafeIcon icon={FiMapPin} className="w-4 h-4 mr-2 text-orange-600" />
                          {selectedRecord.exit_point}
                        </div>
                        <div className="text-sm text-orange-600 mt-1">
                          {format(new Date(selectedRecord.exit_time), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-gray-500">
                        No registrado
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Punto de Entrega</p>
                    {selectedRecord.delivery_time ? (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <div className="flex items-center text-green-800 font-medium">
                          <SafeIcon icon={FiMapPin} className="w-4 h-4 mr-2 text-green-600" />
                          {selectedRecord.delivery_point}
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                          {format(new Date(selectedRecord.delivery_time), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-gray-500">
                        No registrado
                      </div>
                    )}
                  </div>
                  
                  {selectedRecord.isCompleted && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-2">Tiempo de Viaje</p>
                      <div className={`p-3 rounded-lg border ${
                        selectedRecord.hasAnomaly 
                          ? 'bg-yellow-50 border-yellow-100' 
                          : 'bg-blue-50 border-blue-100'
                      }`}>
                        <div className="flex items-center font-medium">
                          <SafeIcon 
                            icon={FiClock} 
                            className={`w-4 h-4 mr-2 ${
                              selectedRecord.hasAnomaly ? 'text-yellow-600' : 'text-blue-600'
                            }`} 
                          />
                          <span className={selectedRecord.hasAnomaly ? 'text-yellow-800' : 'text-blue-800'}>
                            {selectedRecord.actualTravelTime} minutos
                          </span>
                        </div>
                        
                        {selectedRecord.trucks_a18?.estimated_travel_time && (
                          <div className={`text-sm mt-1 ${
                            selectedRecord.hasAnomaly ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            Tiempo estimado: {selectedRecord.trucks_a18.estimated_travel_time} minutos
                            {selectedRecord.hasAnomaly && (
                              <div className="flex items-center mt-1 text-yellow-700">
                                <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 mr-1" />
                                <span>
                                  {selectedRecord.actualTravelTime - selectedRecord.trucks_a18.estimated_travel_time} minutos de retraso
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Información del sistema */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2 text-gray-600" />
                  Información del Sistema
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">ID del Registro</p>
                    <p className="text-base font-mono">{selectedRecord.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Etiqueta NFC</p>
                    <p className="text-base font-mono">{selectedRecord.nfc_tag || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Creado</p>
                    <p className="text-base">
                      {selectedRecord.created_at 
                        ? format(new Date(selectedRecord.created_at), 'dd/MM/yyyy HH:mm:ss')
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Actualizado</p>
                    <p className="text-base">
                      {selectedRecord.updated_at 
                        ? format(new Date(selectedRecord.updated_at), 'dd/MM/yyyy HH:mm:ss')
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowRecordDetails(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 mr-2 text-red-600" />
                Confirmar Eliminación
              </h2>
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-6">
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteRecord(deleteConfirmation)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRecordsManagement;