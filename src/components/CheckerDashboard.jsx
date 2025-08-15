import React,{useState} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {useNavigate} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import NFCReader from './common/NFCReader';

const {FiLogOut,FiTruck,FiMapPin,FiClock,FiCheck,FiList,FiPlus,FiChevronDown,FiUser,FiFolder,FiAlertTriangle,FiMenu,FiX,FiSettings,FiMonitor,FiShield}=FiIcons;

const CheckerDashboard=()=> {
  const {user,logout}=useAuth();
  const {trucks,exitPoints,deliveryPoints,addRecord,records}=useData();
  const navigate=useNavigate();
  const [showNFCReader,setShowNFCReader]=useState(false);
  const [step,setStep]=useState('scan');
  const [currentTag,setCurrentTag]=useState('');
  const [selectedType,setSelectedType]=useState('');
  const [selectedPoint,setSelectedPoint]=useState('');
  const [currentTruck,setCurrentTruck]=useState(null);
  const [showManualSelect,setShowManualSelect]=useState(false);
  const [activeView,setActiveView]=useState('register');
  const [showMobileMenu,setShowMobileMenu]=useState(false);
  const [showDashboardDropdown,setShowDashboardDropdown]=useState(false);

  const handleNFCRead=(tagId)=> {
    const truck=trucks.find(t=> t.nfcTag===tagId);
    if (truck) {
      setCurrentTag(tagId);
      setCurrentTruck(truck);
      setShowNFCReader(false);
      setStep('selectType');
    } else {
      alert('Etiqueta NFC no registrada');
      setShowNFCReader(false);
    }
  };

  const handleManualTruckSelect=(truck)=> {
    setCurrentTruck(truck);
    setCurrentTag(truck.nfcTag);
    setShowManualSelect(false);
    setStep('selectType');
  };

  const handleNFCTimeout=()=> {
    setShowNFCReader(false);
    setShowManualSelect(true);
    setStep('selectTruck');
  };

  const handleTypeSelect=(type)=> {
    setSelectedType(type);
    setStep('selectPoint');
  };

  const handlePointSelect=(point)=> {
    setSelectedPoint(point);
    setStep('confirm');
  };

  const handleConfirm=()=> {
    const now=new Date().toISOString();
    const record={
      nfcTag: currentTag,
      truck: currentTruck.plates,
      capacity: currentTruck.capacity,
      materialM3: currentTruck.capacity
    };

    if (selectedType==='exit') {
      record.exitTime=now;
      record.exitPoint=selectedPoint;
    } else {
      record.deliveryTime=now;
      record.deliveryPoint=selectedPoint;
    } 

    addRecord(record);
    setStep('scan');
    setCurrentTag('');
    setSelectedType('');
    setSelectedPoint('');
    setCurrentTruck(null);
    setShowManualSelect(false);
    alert('Registro guardado exitosamente');
  };

  const resetProcess=()=> {
    setStep('scan');
    setCurrentTag('');
    setSelectedType('');
    setSelectedPoint('');
    setCurrentTruck(null);
    setShowNFCReader(false);
    setShowManualSelect(false);
  };

  const handleDashboardChange=(href)=> {
    // Make sure to use the navigate function to properly change routes 
    navigate(href);
    setShowDashboardDropdown(false);
    setShowMobileMenu(false);
  };

  const processedRecords=records.slice(-10).reverse().map(record=> {
    const truck=trucks.find(t=> t.plates===record.truck);
    const isCompleted=record.exitTime && record.deliveryTime;
    let actualTravelTime=0;
    let hasAnomaly=false;

    if (isCompleted) {
      const exitTime=new Date(record.exitTime);
      const deliveryTime=new Date(record.deliveryTime);
      actualTravelTime=Math.round((deliveryTime - exitTime) / (1000 * 60));// minutes 

      if (truck && actualTravelTime > truck.estimatedTravelTime) {
        hasAnomaly=true;
      }
    } 

    return {...record,truck: truck,isCompleted,actualTravelTime,hasAnomaly};
  });

  // Definimos los dashboards disponibles según el rol 
  const dashboards=[ 
    {name: 'SuperAdmin',href: '/superadmin',icon: FiShield,roles: ['superadmin']},
    {name: 'Admin',href: '/admin',icon: FiSettings,roles: ['admin','superadmin','supervisor']},
    {name: 'Checker',href: '/checker',icon: FiTruck,roles: ['checker','admin','superadmin','supervisor']} 
  ];

  // Filtrar los dashboards según el rol del usuario 
  const availableDashboards=dashboards.filter(dashboard=> dashboard.roles.includes(user?.role || '') );

  // Verificamos explícitamente si el usuario tiene permisos de cambio de dashboard 
  const canChangeDashboard=user && ['admin','superadmin','supervisor'].includes(user.role);

  return ( 
    <div className="min-h-screen bg-gray-50"> 
      <header className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm border-b border-gray-200 px-4 py-3"> 
        <div className="flex items-center justify-between"> 
          <div className="flex items-center space-x-2"> 
            <SafeIcon icon={FiTruck} className="w-6 h-6 text-blue-600" /> 
            <div> 
              <h1 className="text-base font-bold text-gray-900">Control de Camiones</h1> 
              <p className="text-xs text-gray-600 truncate">{user.email}</p> 
            </div> 
          </div> 
          <div className="flex items-center"> 
            {/* Selector de Dashboard para usuarios con permisos (Visible en versión móvil y desktop) */} 
            {canChangeDashboard && ( 
              <div className="hidden sm:block mr-2"> 
                <div className="relative"> 
                  <button onClick={()=> setShowDashboardDropdown(!showDashboardDropdown)} className="flex items-center justify-between px-3 py-1.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors" > 
                    <div className="flex items-center space-x-2"> 
                      <SafeIcon icon={FiMonitor} className="w-4 h-4 text-purple-600" /> 
                      <span className="text-sm font-medium text-gray-800"> 
                        Cambiar Dashboard 
                      </span> 
                    </div> 
                    <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ml-2 ${showDashboardDropdown ? 'transform rotate-180' : ''}`} /> 
                  </button> 
                  {showDashboardDropdown && ( 
                    <div className="absolute right-0 z-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1"> 
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
            )} 
            <button onClick={()=> setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" > 
              <SafeIcon icon={showMobileMenu ? FiX : FiMenu} className="w-5 h-5" /> 
            </button> 
          </div> 
        </div> 

        {/* Mobile Menu */} 
        {showMobileMenu && ( 
          <motion.div initial={{height: 0,opacity: 0}} animate={{height: 'auto',opacity: 1}} exit={{height: 0,opacity: 0}} className="mt-3 py-2 border-t border-gray-100" > 
            <div className="flex flex-col space-y-2"> 
              <button onClick={()=> {setActiveView('register');setShowMobileMenu(false);}} className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center ${activeView==='register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} > 
                <SafeIcon icon={FiPlus} className="w-4 h-4 mr-2" /> 
                <span>Registrar</span> 
              </button> 
              <button onClick={()=> {setActiveView('history');setShowMobileMenu(false);}} className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center ${activeView==='history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} > 
                <SafeIcon icon={FiList} className="w-4 h-4 mr-2" /> 
                <span>Historial</span> 
              </button> 

              {/* Selector de Dashboard para móvil (solo visible para usuarios con permisos) */} 
              {canChangeDashboard && ( 
                <div className="relative"> 
                  <button onClick={()=> setShowDashboardDropdown(!showDashboardDropdown)} className="w-full px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-between bg-purple-50 text-gray-800" > 
                    <div className="flex items-center"> 
                      <SafeIcon icon={FiMonitor} className="w-4 h-4 mr-2 text-purple-600" /> 
                      <span>Cambiar Dashboard</span> 
                    </div> 
                    <SafeIcon icon={FiChevronDown} className={`w-4 h-4 text-gray-500 transition-transform ${showDashboardDropdown ? 'transform rotate-180' : ''}`} /> 
                  </button> 
                  {showDashboardDropdown && ( 
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
              )} 

              <button onClick={logout} className="px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-red-600 bg-red-50" > 
                <SafeIcon icon={FiLogOut} className="w-4 h-4 mr-2" /> 
                <span>Cerrar Sesión</span> 
              </button> 
            </div> 
          </motion.div> 
        )} 

        {/* Desktop Navigation */} 
        <div className="hidden sm:flex items-center justify-between mt-2"> 
          <div className="flex bg-gray-100 rounded-lg p-1"> 
            <button onClick={()=> setActiveView('register')} className={`px-4 py-2 rounded-md font-medium transition-colors ${activeView==='register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} > 
              <SafeIcon icon={FiPlus} className="w-4 h-4 mr-2 inline" /> 
              Registrar 
            </button> 
            <button onClick={()=> setActiveView('history')} className={`px-4 py-2 rounded-md font-medium transition-colors ${activeView==='history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} > 
              <SafeIcon icon={FiList} className="w-4 h-4 mr-2 inline" /> 
              Historial 
            </button> 
          </div> 
          <div className="flex items-center space-x-3"> 
            <button onClick={logout} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors" > 
              <SafeIcon icon={FiLogOut} className="w-5 h-5" /> 
              <span>Salir</span> 
            </button> 
          </div> 
        </div> 
      </header> 

      <main className="p-4 pt-24 sm:pt-28 pb-16 max-w-md mx-auto"> 
        {activeView==='register' && ( 
          <> 
            {step==='scan' && ( 
              <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center" > 
                <div className="mb-5"> 
                  <SafeIcon icon={FiTruck} className="w-14 h-14 text-blue-600 mx-auto mb-3" /> 
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Registrar Camión</h2> 
                  <p className="text-gray-600 text-sm">Toca el botón para escanear la etiqueta NFC</p> 
                </div> 
                <div className="space-y-3"> 
                  <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={()=> setShowNFCReader(true)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-base hover:bg-blue-700 transition-colors" > 
                    Escanear NFC 
                  </motion.button> 
                  <motion.button whileHover={{scale: 1.02}} whileTap={{scale: 0.98}} onClick={()=> {setShowManualSelect(true);setStep('selectTruck');}} className="w-full bg-gray-600 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm" > 
                    Seleccionar Manualmente 
                  </motion.button> 
                </div> 
              </motion.div> 
            )} 

            {step==='selectTruck' && ( 
              <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" > 
                <div className="text-center mb-4"> 
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Seleccionar Camión</h2> 
                  <p className="text-gray-600 text-sm">Elige el camión a registrar</p> 
                </div> 
                <div className="space-y-2 max-h-60 overflow-y-auto"> 
                  {trucks.map((truck)=> ( 
                    <button key={truck.id} onClick={()=> handleManualTruckSelect(truck)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" > 
                      <div className="flex items-center justify-between"> 
                        <div className="flex items-center space-x-2"> 
                          <SafeIcon icon={FiTruck} className="w-5 h-5 text-blue-600" /> 
                          <div> 
                            <p className="font-medium text-gray-900 text-sm">{truck.plates}</p> 
                            <div className="flex items-center space-x-1 text-xs text-gray-600"> 
                              <SafeIcon icon={FiUser} className="w-3 h-3" /> 
                              <span className="truncate max-w-[120px]">{truck.driverName}</span> 
                            </div> 
                            <div className="flex items-center space-x-1 text-xs text-gray-600"> 
                              <SafeIcon icon={FiFolder} className="w-3 h-3" /> 
                              <span className="truncate max-w-[120px]">{truck.projectName}</span> 
                            </div> 
                          </div> 
                        </div> 
                        <SafeIcon icon={FiChevronDown} className="w-4 h-4 text-gray-400 rotate-270" /> 
                      </div> 
                    </button> 
                  ))} 
                </div> 
                <button onClick={resetProcess} className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm" > 
                  Cancelar 
                </button> 
              </motion.div> 
            )} 

            {step==='selectType' && ( 
              <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" > 
                <div className="text-center mb-5"> 
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Seleccionar Tipo</h2> 
                  <div className="text-gray-600 space-y-1"> 
                    <p className="font-medium">Camión: {currentTruck?.plates}</p> 
                    <div className="flex items-center justify-center space-x-1 text-xs"> 
                      <SafeIcon icon={FiUser} className="w-3 h-3" /> 
                      <span className="truncate max-w-[200px]">{currentTruck?.driverName}</span> 
                    </div> 
                    <div className="flex items-center justify-center space-x-1 text-xs"> 
                      <SafeIcon icon={FiFolder} className="w-3 h-3" /> 
                      <span className="truncate max-w-[200px]">{currentTruck?.projectName}</span> 
                    </div> 
                  </div> 
                </div> 
                <div className="space-y-3"> 
                  <button onClick={()=> handleTypeSelect('exit')} className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors" > 
                    Salida 
                  </button> 
                  <button onClick={()=> handleTypeSelect('delivery')} className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors" > 
                    Entrega 
                  </button> 
                </div> 
                <button onClick={resetProcess} className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm" > 
                  Cancelar 
                </button> 
              </motion.div> 
            )} 

            {step==='selectPoint' && ( 
              <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" > 
                <div className="text-center mb-4"> 
                  <h2 className="text-lg font-bold text-gray-900 mb-1"> 
                    Seleccionar {selectedType==='exit' ? 'Punto de Salida' : 'Punto de Entrega'} 
                  </h2> 
                  <p className="text-gray-600 text-sm">Camión: {currentTruck?.plates}</p> 
                </div> 
                <div className="space-y-2 max-h-60 overflow-y-auto"> 
                  {(selectedType==='exit' ? exitPoints : deliveryPoints).map((point)=> ( 
                    <button key={point.id} onClick={()=> handlePointSelect(point.name)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" > 
                      <div className="flex items-center space-x-2"> 
                        <SafeIcon icon={FiMapPin} className="w-5 h-5 text-gray-400" /> 
                        <div> 
                          <p className="font-medium text-gray-900 text-sm">{point.name}</p> 
                          <p className="text-xs text-gray-600 truncate max-w-[220px]">{point.address}</p> 
                        </div> 
                      </div> 
                    </button> 
                  ))} 
                </div> 
                <button onClick={resetProcess} className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm" > 
                  Cancelar 
                </button> 
              </motion.div> 
            )} 

            {step==='confirm' && ( 
              <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" > 
                <div className="text-center mb-5"> 
                  <SafeIcon icon={FiCheck} className="w-12 h-12 text-green-600 mx-auto mb-3" /> 
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Confirmar Registro</h2> 
                </div> 
                <div className="space-y-2 mb-5"> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Camión:</span> 
                    <span className="font-medium text-sm">{currentTruck?.plates}</span> 
                  </div> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Chofer:</span> 
                    <span className="font-medium text-sm truncate max-w-[180px]">{currentTruck?.driverName}</span> 
                  </div> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Proyecto:</span> 
                    <span className="font-medium text-sm truncate max-w-[180px]">{currentTruck?.projectName}</span> 
                  </div> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Tipo:</span> 
                    <span className="font-medium text-sm">{selectedType==='exit' ? 'Salida' : 'Entrega'}</span> 
                  </div> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Punto:</span> 
                    <span className="font-medium text-sm truncate max-w-[180px]">{selectedPoint}</span> 
                  </div> 
                  <div className="flex justify-between"> 
                    <span className="text-gray-600 text-sm">Hora:</span> 
                    <span className="font-medium text-sm">{new Date().toLocaleString()}</span> 
                  </div> 
                </div> 
                <div className="space-y-3"> 
                  <button onClick={handleConfirm} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors" > 
                    Confirmar Registro 
                  </button> 
                  <button onClick={resetProcess} className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm" > 
                    Cancelar 
                  </button> 
                </div> 
              </motion.div> 
            )} 
          </> 
        )} 

        {activeView==='history' && ( 
          <motion.div initial={{opacity: 0,y: 20}} animate={{opacity: 1,y: 0}} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" > 
            <div className="text-center mb-4"> 
              <SafeIcon icon={FiList} className="w-10 h-10 text-blue-600 mx-auto mb-2" /> 
              <h2 className="text-lg font-bold text-gray-900 mb-1">Historial de Registros</h2> 
              <p className="text-gray-600 text-sm">Últimos 10 registros realizados</p> 
            </div> 
            {processedRecords.length===0 ? ( 
              <div className="text-center py-6"> 
                <p className="text-gray-500 text-sm">No hay registros disponibles</p> 
              </div> 
            ) : ( 
              <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto"> 
                {processedRecords.map((record,index)=> ( 
                  <motion.div key={record.id} initial={{opacity: 0,x: -10}} animate={{opacity: 1,x: 0}} transition={{delay: index * 0.05}} className="p-3 bg-gray-50 rounded-lg border border-gray-200" > 
                    <div className="flex items-center justify-between mb-2"> 
                      <div className="flex items-center space-x-2"> 
                        <SafeIcon icon={FiTruck} className="w-5 h-5 text-blue-600" /> 
                        <div> 
                          <span className="font-medium text-gray-900 text-sm">{record.truck?.plates || 'N/A'}</span> 
                          <div className="flex items-center space-x-1 text-xs text-gray-600"> 
                            <SafeIcon icon={FiUser} className="w-3 h-3" /> 
                            <span className="truncate max-w-[100px]">{record.truck?.driverName || 'N/A'}</span> 
                          </div> 
                        </div> 
                      </div> 
                      <div className="flex items-center space-x-1"> 
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${record.isCompleted ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`} > 
                          {record.isCompleted ? 'Completado' : 'Pendiente'} 
                        </span> 
                        {record.hasAnomaly && ( 
                          <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-yellow-600" title="Anomalía detectada" /> 
                        )} 
                      </div> 
                    </div> 
                    <div className="text-xs text-gray-600 space-y-1"> 
                      <div className="flex items-center space-x-1"> 
                        <SafeIcon icon={FiFolder} className="w-3 h-3 text-purple-600" /> 
                        <span className="truncate max-w-[250px]">{record.truck?.projectName || 'Sin proyecto'}</span> 
                      </div> 
                      {record.exitTime && ( 
                        <div className="flex items-start space-x-1"> 
                          <SafeIcon icon={FiMapPin} className="w-3 h-3 text-orange-600 mt-0.5" /> 
                          <div> 
                            <span className="font-medium">Salida:</span> {record.exitPoint} 
                            <div className="text-gray-500">{new Date(record.exitTime).toLocaleString()}</div> 
                          </div> 
                        </div> 
                      )} 
                      {record.deliveryTime && ( 
                        <div className="flex items-start space-x-1"> 
                          <SafeIcon icon={FiMapPin} className="w-3 h-3 text-green-600 mt-0.5" /> 
                          <div> 
                            <span className="font-medium">Entrega:</span> {record.deliveryPoint} 
                            <div className="text-gray-500">{new Date(record.deliveryTime).toLocaleString()}</div> 
                          </div> 
                        </div> 
                      )} 
                      {record.isCompleted && ( 
                        <div className="flex items-center space-x-1 mt-1 pt-1 border-t border-gray-100"> 
                          <SafeIcon icon={FiClock} className="w-3 h-3 text-blue-600" /> 
                          <span> 
                            <span className="font-medium">Tiempo:</span> {record.actualTravelTime} min 
                            {record.truck?.estimatedTravelTime && ( 
                              <span className="text-gray-500"> {' '}(Est: {record.truck.estimatedTravelTime} min) </span> 
                            )} 
                          </span> 
                        </div> 
                      )} 
                    </div> 
                  </motion.div> 
                ))} 
              </div> 
            )} 
          </motion.div> 
        )} 
      </main> 

      {/* Botón flotante para escanear en vista de historial */} 
      {activeView==='register' && step==='scan' && ( 
        <div className="fixed bottom-6 right-6 z-10"> 
          <motion.button whileHover={{scale: 1.05}} whileTap={{scale: 0.95}} onClick={()=> setShowNFCReader(true)} className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center" > 
            <SafeIcon icon={FiTruck} className="w-7 h-7 text-white" /> 
          </motion.button> 
        </div> 
      )} 

      {showNFCReader && ( 
        <NFCReader onRead={handleNFCRead} onClose={()=> setShowNFCReader(false)} onTimeout={handleNFCTimeout} /> 
      )} 
    </div> 
  );
};

export default CheckerDashboard;