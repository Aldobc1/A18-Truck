import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {motion,AnimatePresence} from 'framer-motion';
import {useAuth} from '../../context/AuthContext';
import {useWorkspace} from '../../context/WorkspaceContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {FiTruck,FiSettings,FiMapPin,FiFileText,FiLogOut,FiHome,FiFolder,FiMenu,FiX,FiBriefcase,FiUser,FiChevronDown,FiGrid,FiMonitor,FiShield,FiActivity}=FiIcons;

const AdminLayout=({children})=> {
  const {user,logout}=useAuth();
  const {workspaces,currentWorkspace,switchWorkspace}=useWorkspace();
  const location=useLocation();
  const navigate=useNavigate();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [workspaceDropdownOpen,setWorkspaceDropdownOpen]=useState(false);
  const [dashboardDropdownOpen,setDashboardDropdownOpen]=useState(false);

  // Determinar si el usuario tiene permisos de superadmin o admin 
  const isSuperAdmin=user && user.role==='superadmin';
  const isAdmin=user && (user.role==='admin' || user.role==='superadmin');
  const isSupervisor=user && user.role==='supervisor';

  // Navegación basada en roles 
  const navigation=[ 
    {name: 'Dashboard',href: '/admin',icon: FiHome,roles: ['admin','superadmin','supervisor']},
    {name: 'Camiones',href: '/admin/trucks',icon: FiTruck,roles: ['admin','superadmin','supervisor']},
    {name: 'Proyectos',href: '/admin/projects',icon: FiFolder,roles: ['admin','superadmin','supervisor']},
    {name: 'Puntos',href: '/admin/points',icon: FiMapPin,roles: ['admin','superadmin']},
    {name: 'Registros',href: '/admin/records',icon: FiFileText,roles: ['admin','superadmin','supervisor']},
    {name: 'Usuarios',href: '/admin/workspaces',icon: FiUser,roles: ['admin','superadmin']},
  ];

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

  const handleWorkspaceChange=(workspaceId)=> {
    switchWorkspace(workspaceId);
    setWorkspaceDropdownOpen(false);
  };

  const handleDashboardChange=(href)=> {
    // Navegar al dashboard seleccionado y cerrar el dropdown 
    navigate(href);
    setDashboardDropdownOpen(false);
    closeSidebar();
  };

  return ( 
    <div className="min-h-screen bg-gray-50"> 
      {/* Mobile Header */} 
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white shadow-sm border-b border-gray-200 px-4 py-3"> 
        <div className="flex items-center justify-between"> 
          <div className="flex items-center space-x-3"> 
            <SafeIcon icon={FiTruck} className="w-6 h-6 text-blue-600" /> 
            <div> 
              <h1 className="text-base font-bold text-gray-900">Admin Panel</h1> 
              <p className="text-xs text-gray-600 truncate max-w-32">{user?.email}</p> 
            </div> 
          </div> 
          <button onClick={()=> setSidebarOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" > 
            <SafeIcon icon={FiMenu} className="w-5 h-5" /> 
          </button> 
        </div> 
      </div> 

      <div className="flex"> 
        {/* Desktop Sidebar */} 
        <div className="hidden lg:block w-64 bg-white shadow-lg h-screen fixed"> 
          <div className="p-5 border-b border-gray-200"> 
            <div className="flex items-center space-x-3"> 
              <SafeIcon icon={FiTruck} className="w-7 h-7 text-blue-600" /> 
              <div> 
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1> 
                <p className="text-sm text-gray-600 truncate">{user?.email}</p> 
              </div> 
            </div> 
          </div> 

          {/* Dashboard Selector */} 
          <div className="p-4 border-b border-gray-200"> 
            <div className="relative"> 
              <button onClick={()=> setDashboardDropdownOpen(!dashboardDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors" > 
                <div className="flex items-center space-x-2"> 
                  <SafeIcon icon={FiMonitor} className="w-4 h-4 text-purple-600" /> 
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]"> 
                    Cambiar Dashboard 
                  </span> 
                </div> 
                <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${dashboardDropdownOpen ? 'transform rotate-180' : ''}`} /> 
              </button> 

              {/* Dashboard Dropdown */} 
              {dashboardDropdownOpen && ( 
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1"> 
                  {availableDashboards.map((dashboard)=> ( 
                    <button key={dashboard.name} onClick={()=> handleDashboardChange(dashboard.href)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${location.pathname.startsWith(dashboard.href) ? 'bg-purple-50 text-purple-600' : 'text-gray-700'}`} > 
                      <SafeIcon icon={dashboard.icon} className={`w-4 h-4 ${location.pathname.startsWith(dashboard.href) ? 'text-purple-600' : 'text-gray-400'}`} /> 
                      <span className="truncate">{dashboard.name}</span> 
                    </button> 
                  ))} 
                </div> 
              )} 
            </div> 
          </div> 

          {/* Workspace Selector */} 
          <div className="p-4 border-b border-gray-200"> 
            <div className="relative"> 
              <button onClick={()=> setWorkspaceDropdownOpen(!workspaceDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" > 
                <div className="flex items-center space-x-2"> 
                  <SafeIcon icon={FiBriefcase} className="w-4 h-4 text-blue-600" /> 
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]"> 
                    {currentWorkspace ? currentWorkspace.name : 'Seleccionar Workspace'} 
                  </span> 
                </div> 
                <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${workspaceDropdownOpen ? 'transform rotate-180' : ''}`} /> 
              </button> 

              {/* Dropdown */} 
              {workspaceDropdownOpen && ( 
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-48 overflow-auto"> 
                  {workspaces.length > 0 ? ( 
                    workspaces.map((workspace)=> ( 
                      <button key={workspace.id} onClick={()=> handleWorkspaceChange(workspace.id)} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${currentWorkspace && currentWorkspace.id===workspace.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`} > 
                        <SafeIcon icon={FiBriefcase} className={`w-4 h-4 ${currentWorkspace && currentWorkspace.id===workspace.id ? 'text-blue-600' : 'text-gray-400'}`} /> 
                        <span className="truncate">{workspace.name}</span> 
                      </button> 
                    )) 
                  ) : ( 
                    <div className="px-3 py-2 text-sm text-gray-500">No hay workspaces disponibles</div> 
                  )} 
                  <div className="border-t border-gray-100 mt-1 pt-1"> 
                    <Link to="/admin/workspaces" className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center space-x-2" onClick={()=> setWorkspaceDropdownOpen(false)} > 
                      <SafeIcon icon={FiSettings} className="w-4 h-4" /> 
                      <span>Gestionar workspaces</span> 
                    </Link> 
                  </div> 
                </div> 
              )} 
            </div> 
          </div> 

          <nav className="mt-5"> 
            {navigation 
              .filter(item=> item.roles.includes(user?.role || '')) 
              .map((item)=> {
                const isActive=location.pathname===item.href;
                return ( 
                  <Link key={item.name} to={item.href} className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} > 
                    <SafeIcon icon={item.icon} className="w-5 h-5 mr-3" /> 
                    {item.name} 
                  </Link> 
                );
              })} 
          </nav> 

          <div className="absolute bottom-0 w-64 p-5 border-t border-gray-200"> 
            <div className="flex items-center space-x-3 mb-4"> 
              <div className="bg-gray-100 p-2 rounded-full"> 
                <SafeIcon icon={FiUser} className="w-5 h-5 text-gray-600" /> 
              </div> 
              <div className="flex-1 min-w-0"> 
                <p className="text-sm font-medium text-gray-900 truncate"> 
                  {user?.name || user?.email?.split('@')[0]} 
                </p> 
                <p className="text-xs text-gray-500 truncate"> 
                  {user?.role==='superadmin' ? 'Super Administrador' : user?.role==='admin' ? 'Administrador' : user?.role==='supervisor' ? 'Supervisor' : 'Usuario'} 
                </p> 
              </div> 
            </div> 
            <button onClick={logout} className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors w-full" > 
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
              <motion.div initial={{x: -280}} animate={{x: 0}} exit={{x: -280}} transition={{type: 'tween',duration: 0.3}} className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 flex flex-col" > 
                {/* Header */} 
                <div className="p-4 border-b border-gray-200"> 
                  <div className="flex items-center justify-between"> 
                    <div className="flex items-center space-x-3"> 
                      <SafeIcon icon={FiTruck} className="w-6 h-6 text-blue-600" /> 
                      <div> 
                        <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1> 
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p> 
                      </div> 
                    </div> 
                    <button onClick={closeSidebar} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" > 
                      <SafeIcon icon={FiX} className="w-5 h-5" /> 
                    </button> 
                  </div> 
                </div> 

                {/* Mobile Dashboard Selector */} 
                <div className="p-4 border-b border-gray-200"> 
                  <div className="relative"> 
                    <button onClick={()=> setDashboardDropdownOpen(!dashboardDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors" > 
                      <div className="flex items-center space-x-2"> 
                        <SafeIcon icon={FiMonitor} className="w-4 h-4 text-purple-600" /> 
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]"> 
                          Cambiar Dashboard 
                        </span> 
                      </div> 
                      <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${dashboardDropdownOpen ? 'transform rotate-180' : ''}`} /> 
                    </button> 

                    {/* Dashboard Dropdown */} 
                    {dashboardDropdownOpen && ( 
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1"> 
                        {availableDashboards.map((dashboard)=> ( 
                          <button key={dashboard.name} onClick={()=> {handleDashboardChange(dashboard.href);closeSidebar();}} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${location.pathname.startsWith(dashboard.href) ? 'bg-purple-50 text-purple-600' : 'text-gray-700'}`} > 
                            <SafeIcon icon={dashboard.icon} className={`w-4 h-4 ${location.pathname.startsWith(dashboard.href) ? 'text-purple-600' : 'text-gray-400'}`} /> 
                            <span className="truncate">{dashboard.name}</span> 
                          </button> 
                        ))} 
                      </div> 
                    )} 
                  </div> 
                </div> 

                {/* Mobile Workspace Selector */} 
                <div className="p-4 border-b border-gray-200"> 
                  <div className="relative"> 
                    <button onClick={()=> setWorkspaceDropdownOpen(!workspaceDropdownOpen)} className="w-full flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" > 
                      <div className="flex items-center space-x-2"> 
                        <SafeIcon icon={FiBriefcase} className="w-4 h-4 text-blue-600" /> 
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]"> 
                          {currentWorkspace ? currentWorkspace.name : 'Seleccionar Workspace'} 
                        </span> 
                      </div> 
                      <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${workspaceDropdownOpen ? 'transform rotate-180' : ''}`} /> 
                    </button> 

                    {/* Mobile Dropdown */} 
                    {workspaceDropdownOpen && ( 
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-48 overflow-auto"> 
                        {workspaces.length > 0 ? ( 
                          workspaces.map((workspace)=> ( 
                            <button key={workspace.id} onClick={()=> {handleWorkspaceChange(workspace.id);closeSidebar();}} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${currentWorkspace && currentWorkspace.id===workspace.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`} > 
                              <SafeIcon icon={FiBriefcase} className={`w-4 h-4 ${currentWorkspace && currentWorkspace.id===workspace.id ? 'text-blue-600' : 'text-gray-400'}`} /> 
                              <span className="truncate">{workspace.name}</span> 
                            </button> 
                          )) 
                        ) : ( 
                          <div className="px-3 py-2 text-sm text-gray-500">No hay workspaces disponibles</div> 
                        )} 
                        <div className="border-t border-gray-100 mt-1 pt-1"> 
                          <Link to="/admin/workspaces" className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center space-x-2" onClick={()=> {setWorkspaceDropdownOpen(false);closeSidebar();}} > 
                            <SafeIcon icon={FiSettings} className="w-4 h-4" /> 
                            <span>Gestionar workspaces</span> 
                          </Link> 
                        </div> 
                      </div> 
                    )} 
                  </div> 
                </div> 

                {/* User Profile */} 
                <div className="p-4 border-b border-gray-200"> 
                  <div className="flex items-center space-x-3"> 
                    <div className="bg-gray-100 p-2 rounded-full"> 
                      <SafeIcon icon={FiUser} className="w-5 h-5 text-gray-600" /> 
                    </div> 
                    <div> 
                      <p className="text-sm font-medium text-gray-900"> 
                        {user?.name || user?.email?.split('@')[0]} 
                      </p> 
                      <p className="text-xs text-gray-500"> 
                        {user?.role==='superadmin' ? 'Super Administrador' : user?.role==='admin' ? 'Administrador' : user?.role==='supervisor' ? 'Supervisor' : 'Usuario'} 
                      </p> 
                    </div> 
                  </div> 
                </div> 

                {/* Navigation */} 
                <nav className="flex-1 overflow-y-auto pt-2"> 
                  {navigation 
                    .filter(item=> item.roles.includes(user?.role || '')) 
                    .map((item)=> {
                      const isActive=location.pathname===item.href;
                      return ( 
                        <Link key={item.name} to={item.href} onClick={closeSidebar} className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} > 
                          <SafeIcon icon={item.icon} className="w-5 h-5 mr-3" /> 
                          {item.name} 
                        </Link> 
                      );
                    })} 
                </nav> 

                {/* Logout Button */} 
                <div className="p-4 border-t border-gray-200 mt-auto"> 
                  <button onClick={logout} className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors w-full py-2" > 
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
          <main className="p-4 pt-16 lg:pt-4 lg:p-6 max-w-6xl mx-auto">{children}</main> 
        </div> 
      </div> 
    </div> 
  );
};

export default AdminLayout;