import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import AuthWrapper from './components/AuthWrapper';
import Home from './pages/Home';
import AddTask from './pages/AddTask';
import TaskDetail from './pages/TaskDetail';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthWrapper>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddTask />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </AuthWrapper>
  );
}

export default App;
