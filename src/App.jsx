import React from 'react';
import useAppStore from './store/useAppStore';
import Dashboard from './components/dashboard/Dashboard';
import BookViewer from './components/reader/BookViewer';

function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);

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