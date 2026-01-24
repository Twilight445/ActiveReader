import React, { useEffect } from 'react';
import useAppStore from './store/useAppStore';
import useSettingsStore from './store/useSettingsStore';
import Dashboard from './components/dashboard/Dashboard';
import BookViewer from './components/reader/BookViewer';

function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);
  const syncId = useSettingsStore((state) => state.syncId);
  const initializeSync = useAppStore((state) => state.initializeSync);

  // Cloud Sync Initialization
  useEffect(() => {
    if (syncId) {
      console.log("Initializing Cloud Sync for:", syncId);
      const unsubscribe = initializeSync(syncId);
      return () => unsubscribe && unsubscribe();
    }
  }, [syncId, initializeSync]);

  return (
    <div className="App">
      {currentScreen === 'DASHBOARD' ? (
        <Dashboard />
      ) : (
        <BookViewer />
      )}
    </div>
  );
}

export default App;