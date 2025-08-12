import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

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
  const [loading, setLoading] = useState({
    trucks: false,
    projects: false,
    exitPoints: false,
    deliveryPoints: false,
    records: false,
  });
  const [error, setError] = useState({
    trucks: null,
    projects: null,
    exitPoints: null,
    deliveryPoints: null,
    records: null,
  });

  // Load data from local storage for offline functionality
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

  // Fetch data from Supabase when authenticated
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        setLoading((prev) => ({ ...prev, projects: true }));
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects_a18')
          .select('*')
          .order('created_at', { ascending: false });

        if (projectsError) {
          throw new Error(projectsError.message);
        } else {
          const formattedProjects = projectsData.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            location: project.location
          }));
          setProjects(formattedProjects);
          localStorage.setItem('truckApp_projects', JSON.stringify(formattedProjects));
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError((prev) => ({ ...prev, projects: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, projects: false }));
      }

      try {
        // Fetch exit points
        setLoading((prev) => ({ ...prev, exitPoints: true }));
        const { data: exitPointsData, error: exitPointsError } = await supabase
          .from('exit_points_a18')
          .select('*')
          .order('created_at', { ascending: false });

        if (exitPointsError) {
          throw new Error(exitPointsError.message);
        } else {
          const formattedExitPoints = exitPointsData.map(point => ({
            id: point.id,
            name: point.name,
            address: point.address
          }));
          setExitPoints(formattedExitPoints);
          localStorage.setItem('truckApp_exitPoints', JSON.stringify(formattedExitPoints));
        }
      } catch (err) {
        console.error('Error fetching exit points:', err);
        setError((prev) => ({ ...prev, exitPoints: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, exitPoints: false }));
      }

      try {
        // Fetch delivery points
        setLoading((prev) => ({ ...prev, deliveryPoints: true }));
        const { data: deliveryPointsData, error: deliveryPointsError } = await supabase
          .from('delivery_points_a18')
          .select('*')
          .order('created_at', { ascending: false });

        if (deliveryPointsError) {
          throw new Error(deliveryPointsError.message);
        } else {
          const formattedDeliveryPoints = deliveryPointsData.map(point => ({
            id: point.id,
            name: point.name,
            address: point.address
          }));
          setDeliveryPoints(formattedDeliveryPoints);
          localStorage.setItem('truckApp_deliveryPoints', JSON.stringify(formattedDeliveryPoints));
        }
      } catch (err) {
        console.error('Error fetching delivery points:', err);
        setError((prev) => ({ ...prev, deliveryPoints: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, deliveryPoints: false }));
      }

      try {
        // Fetch trucks
        setLoading((prev) => ({ ...prev, trucks: true }));
        const { data: trucksData, error: trucksError } = await supabase
          .from('trucks_a18')
          .select('*')
          .order('created_at', { ascending: false });

        if (trucksError) {
          throw new Error(trucksError.message);
        } else {
          const formattedTrucks = trucksData.map(truck => ({
            id: truck.id,
            plates: truck.plates,
            capacity: truck.capacity,
            driverName: truck.driver_name,
            projectId: truck.project_id,
            projectName: truck.project_name,
            estimatedTravelTime: truck.estimated_travel_time,
            nfcTag: truck.nfc_tag
          }));
          setTrucks(formattedTrucks);
          localStorage.setItem('truckApp_trucks', JSON.stringify(formattedTrucks));
        }
      } catch (err) {
        console.error('Error fetching trucks:', err);
        setError((prev) => ({ ...prev, trucks: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, trucks: false }));
      }

      try {
        // Fetch records
        setLoading((prev) => ({ ...prev, records: true }));
        const { data: recordsData, error: recordsError } = await supabase
          .from('records_a18')
          .select('*')
          .order('created_at', { ascending: false });

        if (recordsError) {
          throw new Error(recordsError.message);
        } else {
          const formattedRecords = recordsData.map(record => ({
            id: record.id,
            truck: record.truck,
            capacity: record.capacity,
            materialM3: record.material_m3,
            nfcTag: record.nfc_tag,
            exitTime: record.exit_time,
            exitPoint: record.exit_point,
            deliveryTime: record.delivery_time,
            deliveryPoint: record.delivery_point
          }));
          setRecords(formattedRecords);
          localStorage.setItem('truckApp_records', JSON.stringify(formattedRecords));
        }
      } catch (err) {
        console.error('Error fetching records:', err);
        setError((prev) => ({ ...prev, records: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, records: false }));
      }
    };

    fetchData();

    // Set up realtime subscriptions for changes
    const trucksSubscription = supabase
      .channel('trucks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks_a18' }, fetchData)
      .subscribe();

    const recordsSubscription = supabase
      .channel('records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records_a18' }, fetchData)
      .subscribe();

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(trucksSubscription);
      supabase.removeChannel(recordsSubscription);
    };
  }, []);

  // Add truck to Supabase
  const addTruck = async (truck) => {
    try {
      const { project_id, project_name, ...rest } = truck;
      
      // Insert to Supabase
      const { data, error } = await supabase
        .from('trucks_a18')
        .insert([
          {
            plates: truck.plates,
            capacity: parseFloat(truck.capacity),
            driver_name: truck.driverName,
            project_id: truck.projectId,
            project_name: truck.projectName,
            estimated_travel_time: parseInt(truck.estimatedTravelTime),
            nfc_tag: truck.nfcTag
          }
        ])
        .select();

      if (error) {
        console.error('Error adding truck to Supabase:', error);
        throw error;
      }

      // Also update local state and storage for offline use
      const newTruck = { ...truck, id: data[0].id };
      const updatedTrucks = [...trucks, newTruck];
      setTrucks(updatedTrucks);
      localStorage.setItem('truckApp_trucks', JSON.stringify(updatedTrucks));
      
      return data[0];
    } catch (err) {
      console.error('Error in addTruck:', err);
      
      // Fallback to local storage only
      const newTruck = { ...truck, id: Date.now().toString() };
      const updatedTrucks = [...trucks, newTruck];
      setTrucks(updatedTrucks);
      localStorage.setItem('truckApp_trucks', JSON.stringify(updatedTrucks));
      
      throw err;
    }
  };

  // Add project to Supabase
  const addProject = async (project) => {
    try {
      // Insert to Supabase
      const { data, error } = await supabase
        .from('projects_a18')
        .insert([
          {
            name: project.name,
            description: project.description,
            location: project.location
          }
        ])
        .select();

      if (error) {
        console.error('Error adding project to Supabase:', error);
        throw error;
      }

      // Also update local state and storage for offline use
      const newProject = { ...project, id: data[0].id };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      localStorage.setItem('truckApp_projects', JSON.stringify(updatedProjects));
      
      return data[0];
    } catch (err) {
      console.error('Error in addProject:', err);
      
      // Fallback to local storage only
      const newProject = { ...project, id: Date.now().toString() };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      localStorage.setItem('truckApp_projects', JSON.stringify(updatedProjects));
      
      throw err;
    }
  };

  // Add exit point to Supabase
  const addExitPoint = async (point) => {
    try {
      // Insert to Supabase
      const { data, error } = await supabase
        .from('exit_points_a18')
        .insert([
          {
            name: point.name,
            address: point.address
          }
        ])
        .select();

      if (error) {
        console.error('Error adding exit point to Supabase:', error);
        throw error;
      }

      // Also update local state and storage for offline use
      const newPoint = { ...point, id: data[0].id };
      const updatedPoints = [...exitPoints, newPoint];
      setExitPoints(updatedPoints);
      localStorage.setItem('truckApp_exitPoints', JSON.stringify(updatedPoints));
      
      return data[0];
    } catch (err) {
      console.error('Error in addExitPoint:', err);
      
      // Fallback to local storage only
      const newPoint = { ...point, id: Date.now().toString() };
      const updatedPoints = [...exitPoints, newPoint];
      setExitPoints(updatedPoints);
      localStorage.setItem('truckApp_exitPoints', JSON.stringify(updatedPoints));
      
      throw err;
    }
  };

  // Add delivery point to Supabase
  const addDeliveryPoint = async (point) => {
    try {
      // Insert to Supabase
      const { data, error } = await supabase
        .from('delivery_points_a18')
        .insert([
          {
            name: point.name,
            address: point.address
          }
        ])
        .select();

      if (error) {
        console.error('Error adding delivery point to Supabase:', error);
        throw error;
      }

      // Also update local state and storage for offline use
      const newPoint = { ...point, id: data[0].id };
      const updatedPoints = [...deliveryPoints, newPoint];
      setDeliveryPoints(updatedPoints);
      localStorage.setItem('truckApp_deliveryPoints', JSON.stringify(updatedPoints));
      
      return data[0];
    } catch (err) {
      console.error('Error in addDeliveryPoint:', err);
      
      // Fallback to local storage only
      const newPoint = { ...point, id: Date.now().toString() };
      const updatedPoints = [...deliveryPoints, newPoint];
      setDeliveryPoints(updatedPoints);
      localStorage.setItem('truckApp_deliveryPoints', JSON.stringify(updatedPoints));
      
      throw err;
    }
  };

  // Add or update record to Supabase
  const addRecord = async (record) => {
    try {
      // Find the truck by nfcTag to get its ID
      const truck = trucks.find(t => t.nfcTag === record.nfcTag);
      const truckId = truck?.id;

      // Check if a record with this nfcTag exists and doesn't have deliveryTime
      const existingRecord = records.find(r => 
        r.nfcTag === record.nfcTag && !r.deliveryTime
      );

      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('records_a18')
          .update({
            delivery_time: record.deliveryTime,
            delivery_point: record.deliveryPoint,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select();

        if (error) {
          console.error('Error updating record in Supabase:', error);
          throw error;
        }

        // Update local state and storage
        const updatedRecords = records.map(r => 
          r.id === existingRecord.id 
            ? { ...r, ...record } 
            : r
        );
        setRecords(updatedRecords);
        localStorage.setItem('truckApp_records', JSON.stringify(updatedRecords));
        
        return data[0];
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('records_a18')
          .insert([
            {
              truck_id: truckId,
              truck: record.truck,
              capacity: parseFloat(record.capacity),
              material_m3: parseFloat(record.materialM3),
              nfc_tag: record.nfcTag,
              exit_time: record.exitTime,
              exit_point: record.exitPoint,
              delivery_time: record.deliveryTime,
              delivery_point: record.deliveryPoint
            }
          ])
          .select();

        if (error) {
          console.error('Error adding record to Supabase:', error);
          throw error;
        }

        // Update local state and storage
        const newRecord = { 
          ...record, 
          id: data[0].id 
        };
        const updatedRecords = [...records, newRecord];
        setRecords(updatedRecords);
        localStorage.setItem('truckApp_records', JSON.stringify(updatedRecords));
        
        return data[0];
      }
    } catch (err) {
      console.error('Error in addRecord:', err);
      
      // Fallback to local storage only
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
      
      throw err;
    }
  };

  const value = {
    trucks,
    projects,
    exitPoints,
    deliveryPoints,
    records,
    loading,
    error,
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