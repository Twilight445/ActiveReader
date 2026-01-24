import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ padding: '4rem', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#f3f4f6', minHeight: '100vh', color: '#1f2937' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#dc2626' }}>Configuration Error</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>The Firebase API Key is missing.</p>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '500px', margin: '0 auto' }}>
        <p><strong>If you are seeing this on Vercel:</strong></p>
        <ul style={{ textAlign: 'left', marginTop: '1rem', marginLeft: '1.5rem', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '0.5rem' }}>Go to your Project Settings.</li>
          <li style={{ marginBottom: '0.5rem' }}>Click on <strong>Environment Variables</strong>.</li>
          <li style={{ marginBottom: '0.5rem' }}>Add <code>VITE_FIREBASE_API_KEY</code> with your key.</li>
          <li>Redeploy the project.</li>
        </ul>
      </div>
    </div>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );
}