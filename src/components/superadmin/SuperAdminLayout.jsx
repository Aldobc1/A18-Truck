import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {motion,AnimatePresence} from 'framer-motion';
import {useAuth} from '../../context/AuthContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {FiShield,FiUsers,FiFileText,FiLogOut,FiHome,FiMenu,FiX,FiUser,FiChevronDown,FiMonitor,FiSettings,FiTruck,FiLock,FiDatabase,FiAlertTriangle,FiBarChart2,FiGlobe}=FiIcons;

const SuperAdminLayout=({children})=> {
  const {user,logout}=useAuth();
  const location=useLocation();
  const navigate=useNavigate();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [dashboardDropdownOpen,setDashboardDropdownOpen]=useState(false);

  // Verificar si el usuario tiene permisos de SuperAdmin 
  if (user?.role !=='superadmin') {
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gray-100"> 
        <div className="bg-white p-6 rounded-lg shadow-md"> 
          <div className="flex items-center text-red-600 mb-4"> 
            <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 mr-2" /> 
            <h2 className="text-xl font-bold">Acceso Denegado</h2> 
          </div> 
          <p className="text-gray-600 mb-4">No tienes permisos para acceder al panel de SuperAdmin.</p> 
          <button onClick={()=> navigate('/')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" > 
            Volver al inicio 
          </button> 
        </div> 
      </div> 
    );
  } 

  // Navegación para SuperAdmin 
  const navigation=[ 
    {name: 'Dashboard',href: '/superadmin',icon: FiHome},
    {name: 'Usuarios Globales',href: '/superadmin/users',icon: FiUsers},
    {name: 'Registros Sistema',href: '/superadmin/records',icon: FiFileText},
  ];

  // Definir los dashboards disponibles según el rol 
  const dashboards=[ 
    {name: 'SuperAdmin',href: '/superadmin',icon: FiShield,roles: ['superadmin']},
    {name: 'Admin',href: '/admin',icon: FiSettings,roles: ['admin','superadmin','supervisor']},
    {name: 'Checker',href: '/checker',icon: FiTruck,roles: ['checker','admin','superadmin','supervisor']} 
  ];

  // Filtrar dashboards según el rol del usuario 
  const availableDashboards=dashboards.filter(dashboard=> dashboard.roles.includes(user?.role || '') );

  const closeSidebar=()=> {
    setSidebarOpen(false);
  };

  const handleDashboardChange=(href)=> {
    navigate(href);
    setDashboardDropdownOpen(false);
    closeSidebar();
  };

  return ( 
    <div className="min-h-screen bg-gray-50"> 
      {/* Mobile Header */} 
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-red-700 shadow-sm border-b border-red-800 px-4 py-3"> 
        <div className="flex items-center justify-between"> 
          <div className="flex items-center space-x-3"> 
            <SafeIcon icon={FiShield} className="w-6 h-6 text-white" /> 
            <div> 
              <h1 className="text-base font-bold text-white">SuperAdmin Panel</h1> 
              <p className="text-xs text-red-100 truncate max-w-32">{user?.email}</p> 
            </div> 
          </div> 
          <button onClick={()=> setSidebarOpen(true)} className="p-2 rounded-lg text-white hover:bg-red-600 transition-colors" > 
            <SafeIcon icon={FiMenu} className="w-5 h-5" /> 
          </button> 
        </div> 
      </div> 

      <div className="flex"> 
        {/* Desktop Sidebar */} 
        <div className="hidden lg:block w-64 bg-gradient-to-b from-red-800 to-red-700 shadow-lg h-screen fixed"> 
          <div className="p-5 border-b border-red-600"> 
            <div className="flex items-center space-x-3"> 
              <SafeIcon icon={FiShield} className="w-7 h-7 text-white" /> 
              <div> 
                <h1 className="text-lg font-bold text-white">SuperAdmin Panel</h1> 
                <p className="text-sm text-red-200 truncate">{user?.email}</p> 
              </div> 
            </div> 
          </div> 

          {/* Dashboard Selector */} 
          <div className="p-4 border-b border-red-600"> 
            <div className="relative"> 
              <button onClick={()=> setDashboardDropdownOpen(!dashboardDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-red-900 bg-opacity-50 rounded-lg hover:bg-red-900 transition-colors" > 
                <div className="flex items-center space-x-2"> 
                  <SafeIcon icon={FiMonitor} className="w-4 h-4 text-white" /> 
                  <span className="text-sm font-medium text-white truncate max-w-[160px]"> 
                    Cambiar Dashboard 
                  </span> 
                </div> 
                <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-red-200 transition-transform ${dashboardDropdownOpen ? 'transform rotate-180' : ''}`} /> 
              </button>

              {/* Dashboard Dropdown */} 
              {dashboardDropdownOpen && ( 
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1"> 
                  {availableDashboards.map((dashboard)=> ( 
                    <button key={dashboard.name} onClick={()=> handleDashboardChange(dashboard.href)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${location.pathname.startsWith(dashboard.href) ? 'bg-red-50 text-red-700' : 'text-gray-700'}`} > 
                      <SafeIcon icon={dashboard.icon} className={`w-4 h-4 ${location.pathname.startsWith(dashboard.href) ? 'text-red-700' : 'text-gray-400'}`} /> 
                      <span className="truncate">{dashboard.name}</span> 
                    </button> 
                  ))} 
                </div> 
              )} 
            </div> 
          </div> 

          <nav className="mt-5"> 
            {navigation.map((item)=> {
              const isActive=location.pathname===item.href;
              return ( 
                <Link key={item.name} to={item.href} className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-red-900 text-white border-r-2 border-white' : 'text-red-200 hover:bg-red-800 hover:text-white'}`} > 
                  <SafeIcon icon={item.icon} className="w-5 h-5 mr-3" /> 
                  {item.name} 
                </Link> 
              );
            })} 
          </nav> 

          <div className="absolute bottom-0 w-64 p-5 border-t border-red-600"> 
            <div className="flex items-center space-x-3 mb-4"> 
              <div className="bg-red-900 p-2 rounded-full"> 
                <SafeIcon icon={FiUser} className="w-5 h-5 text-white" /> 
              </div> 
              <div className="flex-1 min-w-0"> 
                <p className="text-sm font-medium text-white truncate"> 
                  {user?.name || user?.email?.split('@')[0]} 
                </p> 
                <p className="text-xs text-red-200 truncate"> 
                  Super Administrador 
                </p> 
              </div> 
            </div> 
            <button onClick={logout} className="flex items-center space-x-2 text-red-200 hover:text-white transition-colors w-full" > 
              <SafeIcon icon={FiLogOut} className="w-5 h-5" /> 
              <span>Cerrar Sesión</span> 
            </button> 
          </div> 
        </div> 

        {/* Mobile Sidebar Overlay */} 
        <AnimatePresence> 
          {sidebarOpen && ( 
            <> 
              {/* Backdrop */} 
              <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeSidebar} /> 

              {/* Sidebar */} 
              <motion.div initial={{x: -280}} animate={{x: 0}} exit={{x: -280}} transition={{type: 'tween',duration: 0.3}} className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-red-800 to-red-700 shadow-xl z-50 flex flex-col" > 
                {/* Header */} 
                <div className="p-4 border-b border-red-600"> 
                  <div className="flex items-center justify-between"> 
                    <div className="flex items-center space-x-3"> 
                      <SafeIcon icon={FiShield} className="w-6 h-6 text-white" /> 
                      <div> 
                        <h1 className="text-lg font-bold text-white">SuperAdmin Panel</h1> 
                        <p className="text-xs text-red-200 truncate">{user?.email}</p> 
                      </div> 
                    </div> 
                    <button onClick={closeSidebar} className="p-2 rounded-lg text-white hover:bg-red-600 transition-colors" > 
                      <SafeIcon icon={FiX} className="w-5 h-5" /> 
                    </button> 
                  </div> 
                </div> 

                {/* Mobile Dashboard Selector */} 
                <div className="p-4 border-b border-red-600"> 
                  <div className="relative"> 
                    <button onClick={()=> setDashboardDropdownOpen(!dashboardDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-red-900 bg-opacity-50 rounded-lg hover:bg-red-900 transition-colors" > 
                      <div className="flex items-center space-x-2"> 
                        <SafeIcon icon={FiMonitor} className="w-4 h-4 text-white" /> 
                        <span className="text-sm font-medium text-white truncate max-w-[160px]"> 
                          Cambiar Dashboard 
                        </span> 
                      </div> 
                      <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-red-200 transition-transform ${dashboardDropdownOpen ? 'transform rotate-180' : ''}`} /> 
                    </button>

                    {/* Dashboard Dropdown */} 
                    {dashboardDropdownOpen && ( 
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1"> 
                        {availableDashboards.map((dashboard)=> ( 
                          <button key={dashboard.name} onClick={()=> {handleDashboardChange(dashboard.href);closeSidebar();}} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${location.pathname.startsWith(dashboard.href) ? 'bg-red-50 text-red-700' : 'text-gray-700'}`} > 
                            <SafeIcon icon={dashboard.icon} className={`w-4 h-4 ${location.pathname.startsWith(dashboard.href) ? 'text-red-700' : 'text-gray-400'}`} /> 
                            <span className="truncate">{dashboard.name}</span> 
                          </button> 
                        ))} 
                      </div> 
                    )} 
                  </div> 
                </div> 

                {/* User Profile */} 
                <div className="p-4 border-b border-red-600"> 
                  <div className="flex items-center space-x-3"> 
                    <div className="bg-red-900 p-2 rounded-full"> 
                      <SafeIcon icon={FiUser} className="w-5 h-5 text-white" /> 
                    </div> 
                    <div> 
                      <p className="text-sm font-medium text-white"> 
                        {user?.name || user?.email?.split('@')[0]} 
                      </p> 
                      <p className="text-xs text-red-200"> 
                        Super Administrador 
                      </p> 
                    </div> 
                  </div> 
                </div> 

                {/* Navigation */} 
                <nav className="flex-1 overflow-y-auto pt-2"> 
                  {navigation.map((item)=> {
                    const isActive=location.pathname===item.href;
                    return ( 
                      <Link key={item.name} to={item.href} onClick={closeSidebar} className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-red-900 text-white border-r-2 border-white' : 'text-red-200 hover:bg-red-800 hover:text-white'}`} > 
                        <SafeIcon icon={item.icon} className="w-5 h-5 mr-3" /> 
                        {item.name} 
                      </Link> 
                    );
                  })} 
                </nav> 

                {/* Logout Button */} 
                <div className="p-4 border-t border-red-600 mt-auto"> 
                  <button onClick={logout} className="flex items-center space-x-2 text-red-200 hover:text-white transition-colors w-full py-2" > 
                    <SafeIcon icon={FiLogOut} className="w-5 h-5" /> 
                    <span>Cerrar Sesión</span> 
                  </button> 
                </div> 
              </motion.div> 
            </> 
          )} 
        </AnimatePresence> 

        {/* Main Content */} 
        <div className="flex-1 min-w-0 lg:ml-64"> 
          <main className="p-4 pt-16 lg:pt-4 lg:p-6 max-w-6xl mx-auto"> 
            {children} 
          </main> 
        </div> 
      </div> 
    </div> 
  );
};

export default SuperAdminLayout;