import React, { useEffect } from 'react';
import useAppStore from './store/useAppStore';
import useSettingsStore from './store/useSettingsStore';
import Dashboard from './components/dashboard/Dashboard';
import BookViewer from './components/reader/BookViewer';
import EpubViewer from './components/reader/EpubViewer';

function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);
  const activeBook = useAppStore((state) => state.activeBook);
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

  // Determine which reader to show based on book format
  const renderReader = () => {
    if (activeBook?.format === 'EPUB') {
      return <EpubViewer />;
    }
    return <BookViewer />;
  };

  return (
    <div className="App">
      {currentScreen === 'DASHBOARD' ? (
        <Dashboard />
      ) : (
        renderReader()
      )}
    </div>
  );
}

export default App;
