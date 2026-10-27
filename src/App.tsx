import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import Dashboard from './pages/Dashboard';
import Canvas from './pages/Canvas';

function App() {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    document.body.className = `${theme}-mode`;
  }, [theme]);

  useEffect(() => {
    useStore.getState().init();
  }, []);

  return (
    <BrowserRouter>
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/canvas/:id" element={<Canvas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
