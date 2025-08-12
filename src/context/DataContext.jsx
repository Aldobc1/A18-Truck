import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [trucks, setTrucks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [exitPoints, setExitPoints] = useState([]);
  const [deliveryPoints, setDeliveryPoints] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const storedTrucks = localStorage.getItem('truckApp_trucks');
    const storedProjects = localStorage.getItem('truckApp_projects');
    const storedExitPoints = localStorage.getItem('truckApp_exitPoints');
    const storedDeliveryPoints = localStorage.getItem('truckApp_deliveryPoints');
    const storedRecords = localStorage.getItem('truckApp_records');

    if (storedTrucks) setTrucks(JSON.parse(storedTrucks));
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    if (storedExitPoints) setExitPoints(JSON.parse(storedExitPoints));
    if (storedDeliveryPoints) setDeliveryPoints(JSON.parse(storedDeliveryPoints));
    if (storedRecords) setRecords(JSON.parse(storedRecords));
  }, []);

  const addTruck = (truck) => {
    const newTruck = { ...truck, id: Date.now().toString() };
    const updatedTrucks = [...trucks, newTruck];
    setTrucks(updatedTrucks);
    localStorage.setItem('truckApp_trucks', JSON.stringify(updatedTrucks));
  };

  const addProject = (project) => {
    const newProject = { ...project, id: Date.now().toString() };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('truckApp_projects', JSON.stringify(updatedProjects));
  };

  const addExitPoint = (point) => {
    const newPoint = { ...point, id: Date.now().toString() };
    const updatedPoints = [...exitPoints, newPoint];
    setExitPoints(updatedPoints);
    localStorage.setItem('truckApp_exitPoints', JSON.stringify(updatedPoints));
  };

  const addDeliveryPoint = (point) => {
    const newPoint = { ...point, id: Date.now().toString() };
    const updatedPoints = [...deliveryPoints, newPoint];
    setDeliveryPoints(updatedPoints);
    localStorage.setItem('truckApp_deliveryPoints', JSON.stringify(updatedPoints));
  };

  const addRecord = (record) => {
    const updatedRecords = [...records];
    const existingIndex = updatedRecords.findIndex(r => 
      r.nfcTag === record.nfcTag && !r.deliveryTime
    );
    
    if (existingIndex !== -1) {
      // Update existing record
      updatedRecords[existingIndex] = { ...updatedRecords[existingIndex], ...record };
    } else {
      // Add new record
      updatedRecords.push({ ...record, id: Date.now().toString() });
    }
    
    setRecords(updatedRecords);
    localStorage.setItem('truckApp_records', JSON.stringify(updatedRecords));
  };

  const value = {
    trucks,
    projects,
    exitPoints,
    deliveryPoints,
    records,
    addTruck,
    addProject,
    addExitPoint,
    addDeliveryPoint,
    addRecord
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};