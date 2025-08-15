import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import supabase from '../../lib/supabase';
import ReactECharts from 'echarts-for-react';

const {
  FiShield, FiUsers, FiDatabase, FiLock, FiBarChart2, 
  FiActivity, FiGlobe, FiTruck, FiAlertTriangle, 
  FiCheckCircle, FiRefreshCw, FiSettings
} = FiIcons;

const SuperAdminDashboardHome = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkspaces: 0,
    totalTrucks: 0,
    totalRecords: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    superadmins: 0,
    admins: 0,
    supervisors: 0,
    checkers: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    database: 'checking',
    auth: 'checking',
    storage: 'checking'
  });

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    checkSystemStatus();

    // Update last updated timestamp
    setLastUpdated(new Date());
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get total users count with role breakdown
      const { data: usersData, error: usersError } = await supabase
        .from('users_a18')
        .select('id, role, inactivo');

      if (usersError) throw usersError;

      // Get workspaces count
      const { count: workspacesCount, error: workspacesError } = await supabase
        .from('workspaces_a18')
        .select('id', { count: 'exact', head: true });

      if (workspacesError) throw workspacesError;

      // Get trucks count
      const { count: trucksCount, error: trucksError } = await supabase
        .from('trucks_a18')
        .select('id', { count: 'exact', head: true });

      if (trucksError) throw trucksError;

      // Get records count
      const { count: recordsCount, error: recordsError } = await supabase
        .from('records_a18')
        .select('id', { count: 'exact', head: true });

      if (recordsError) throw recordsError;

      // Process user statistics
      const activeUsers = usersData.filter(user => !user.inactivo).length;
      const inactiveUsers = usersData.filter(user => user.inactivo).length;
      const superadmins = usersData.filter(user => user.role === 'superadmin').length;
      const admins = usersData.filter(user => user.role === 'admin').length;
      const supervisors = usersData.filter(user => user.role === 'supervisor').length;
      const checkers = usersData.filter(user => user.role === 'checker').length;

      setStats({
        totalUsers: usersData.length,
        totalWorkspaces: workspacesCount,
        totalTrucks: trucksCount,
        totalRecords: recordsCount,
        activeUsers,
        inactiveUsers,
        superadmins,
        admins,
        supervisors,
        checkers
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    try {
      // Check database connection
      const { data: dbData, error: dbError } = await supabase
        .from('users_a18')
        .select('count(*)', { head: true });
      
      setSystemStatus(prev => ({
        ...prev,
        database: dbError ? 'error' : 'connected'
      }));

      // Check auth service
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      setSystemStatus(prev => ({
        ...prev,
        auth: authError ? 'error' : 'connected'
      }));

      // Check storage service
      const { data: storageData, error: storageError } = await supabase
        .storage
        .listBuckets();
      
      setSystemStatus(prev => ({
        ...prev,
        storage: storageError ? 'error' : 'connected'
      }));
    } catch (err) {
      console.error('Error checking system status:', err);
    }
  };

  // Chart options for user roles
  const userRolesChartOptions = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      data: ['SuperAdmins', 'Admins', 'Supervisores', 'Checadores']
    },
    color: ['#ef4444', '#8b5cf6', '#10b981', '#3b82f6'],
    series: [
      {
        name: 'Roles de Usuario',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: false,
          position: 'center'
        },
        labelLine: {
          show: false
        },
        data: [
          { value: stats.superadmins, name: 'SuperAdmins' },
          { value: stats.admins, name: 'Admins' },
          { value: stats.supervisors, name: 'Supervisores' },
          { value: stats.checkers, name: 'Checadores' }
        ]
      }
    ]
  };

  // Chart options for user status
  const userStatusChartOptions = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      data: ['Activos', 'Inactivos']
    },
    color: ['#10b981', '#ef4444'],
    series: [
      {
        name: 'Estado de Usuarios',
        type: 'pie',
        radius: '55%',
        center: ['50%', '45%'],
        data: [
          { value: stats.activeUsers, name: 'Activos' },
          { value: stats.inactiveUsers, name: 'Inactivos' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel SuperAdmin</h1>
          <p className="text-gray-600">
            Monitoreo general del sistema
            {lastUpdated && (
              <span className="text-sm ml-2 text-gray-500">
                Actualizado: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            fetchDashboardData();
            checkSystemStatus();
          }}
          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          <SafeIcon 
            icon={FiRefreshCw} 
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SafeIcon icon={FiDatabase} className="w-5 h-5 mr-2 text-red-600" />
          Estado del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            systemStatus.database === 'connected' ? 'bg-green-50 border border-green-200' : 
            systemStatus.database === 'error' ? 'bg-red-50 border border-red-200' : 
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              <SafeIcon 
                icon={FiDatabase} 
                className={`w-5 h-5 ${
                  systemStatus.database === 'connected' ? 'text-green-600' : 
                  systemStatus.database === 'error' ? 'text-red-600' : 
                  'text-yellow-600'
                }`} 
              />
              <div>
                <p className="text-sm font-medium">Base de Datos</p>
                <p className="text-xs text-gray-500">
                  {systemStatus.database === 'connected' ? 'Conectada' : 
                   systemStatus.database === 'error' ? 'Error de conexión' : 
                   'Verificando...'}
                </p>
              </div>
            </div>
            <SafeIcon 
              icon={
                systemStatus.database === 'connected' ? FiCheckCircle : 
                systemStatus.database === 'error' ? FiAlertTriangle : 
                FiRefreshCw
              } 
              className={`w-5 h-5 ${
                systemStatus.database === 'connected' ? 'text-green-600' : 
                systemStatus.database === 'error' ? 'text-red-600' : 
                'text-yellow-600 animate-spin'
              }`} 
            />
          </div>
          
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            systemStatus.auth === 'connected' ? 'bg-green-50 border border-green-200' : 
            systemStatus.auth === 'error' ? 'bg-red-50 border border-red-200' : 
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              <SafeIcon 
                icon={FiLock} 
                className={`w-5 h-5 ${
                  systemStatus.auth === 'connected' ? 'text-green-600' : 
                  systemStatus.auth === 'error' ? 'text-red-600' : 
                  'text-yellow-600'
                }`} 
              />
              <div>
                <p className="text-sm font-medium">Autenticación</p>
                <p className="text-xs text-gray-500">
                  {systemStatus.auth === 'connected' ? 'Operativa' : 
                   systemStatus.auth === 'error' ? 'Error de servicio' : 
                   'Verificando...'}
                </p>
              </div>
            </div>
            <SafeIcon 
              icon={
                systemStatus.auth === 'connected' ? FiCheckCircle : 
                systemStatus.auth === 'error' ? FiAlertTriangle : 
                FiRefreshCw
              } 
              className={`w-5 h-5 ${
                systemStatus.auth === 'connected' ? 'text-green-600' : 
                systemStatus.auth === 'error' ? 'text-red-600' : 
                'text-yellow-600 animate-spin'
              }`} 
            />
          </div>
          
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            systemStatus.storage === 'connected' ? 'bg-green-50 border border-green-200' : 
            systemStatus.storage === 'error' ? 'bg-red-50 border border-red-200' : 
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              <SafeIcon 
                icon={FiGlobe} 
                className={`w-5 h-5 ${
                  systemStatus.storage === 'connected' ? 'text-green-600' : 
                  systemStatus.storage === 'error' ? 'text-red-600' : 
                  'text-yellow-600'
                }`} 
              />
              <div>
                <p className="text-sm font-medium">Almacenamiento</p>
                <p className="text-xs text-gray-500">
                  {systemStatus.storage === 'connected' ? 'Operativo' : 
                   systemStatus.storage === 'error' ? 'Error de servicio' : 
                   'Verificando...'}
                </p>
              </div>
            </div>
            <SafeIcon 
              icon={
                systemStatus.storage === 'connected' ? FiCheckCircle : 
                systemStatus.storage === 'error' ? FiAlertTriangle : 
                FiRefreshCw
              } 
              className={`w-5 h-5 ${
                systemStatus.storage === 'connected' ? 'text-green-600' : 
                systemStatus.storage === 'error' ? 'text-red-600' : 
                'text-yellow-600 animate-spin'
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 border border-red-800 shadow-md text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-100">Usuarios Totales</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-red-200 mt-1">
                {stats.activeUsers} activos, {stats.inactiveUsers} inactivos
              </p>
            </div>
            <div className="bg-red-500 bg-opacity-30 p-3 rounded-lg">
              <SafeIcon icon={FiUsers} className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 border border-purple-800 shadow-md text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-100">Workspaces</p>
              <p className="text-2xl font-bold">{stats.totalWorkspaces}</p>
              <p className="text-xs text-purple-200 mt-1">
                Organizaciones registradas
              </p>
            </div>
            <div className="bg-purple-500 bg-opacity-30 p-3 rounded-lg">
              <SafeIcon icon={FiBarChart2} className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 border border-blue-800 shadow-md text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-100">Camiones</p>
              <p className="text-2xl font-bold">{stats.totalTrucks}</p>
              <p className="text-xs text-blue-200 mt-1">
                Vehículos registrados
              </p>
            </div>
            <div className="bg-blue-500 bg-opacity-30 p-3 rounded-lg">
              <SafeIcon icon={FiTruck} className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 border border-green-800 shadow-md text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-100">Registros</p>
              <p className="text-2xl font-bold">{stats.totalRecords}</p>
              <p className="text-xs text-green-200 mt-1">
                Operaciones registradas
              </p>
            </div>
            <div className="bg-green-500 bg-opacity-30 p-3 rounded-lg">
              <SafeIcon icon={FiActivity} className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Roles Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiUsers} className="w-5 h-5 mr-2 text-red-600" />
              Distribución de Roles
            </h2>
          </div>
          <div className="p-4" style={{ height: '300px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <ReactECharts 
                option={userRolesChartOptions} 
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
        </div>

        {/* User Status Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiActivity} className="w-5 h-5 mr-2 text-red-600" />
              Estado de Usuarios
            </h2>
          </div>
          <div className="p-4" style={{ height: '300px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <ReactECharts 
                option={userStatusChartOptions} 
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Admin Access Section */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-200">
        <div className="p-4 border-b border-red-200">
          <h2 className="text-lg font-semibold text-red-800 flex items-center">
            <SafeIcon icon={FiShield} className="w-5 h-5 mr-2 text-red-600" />
            Accesos Privilegiados
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={FiShield} className="w-5 h-5 text-red-600" />
                <h3 className="font-medium text-red-800">SuperAdmins</h3>
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.superadmins}</p>
              <p className="text-sm text-red-600 mt-1">Acceso total al sistema</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={FiSettings} className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-purple-800">Admins</h3>
              </div>
              <p className="text-3xl font-bold text-purple-700">{stats.admins}</p>
              <p className="text-sm text-purple-600 mt-1">Administración de workspaces</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={FiActivity} className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">Supervisores</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">{stats.supervisors}</p>
              <p className="text-sm text-green-600 mt-1">Monitoreo de operaciones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardHome;