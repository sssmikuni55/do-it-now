import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import AuthWrapper from './components/AuthWrapper';
import Home from './pages/Home';
import AddTask from './pages/AddTask';
import TaskDetail from './pages/TaskDetail';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Guide from './pages/Guide';

import EditTask from './pages/EditTask';

function App() {
  return (
    <AuthWrapper>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddTask />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/task/:id/edit" element={<EditTask />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </AuthWrapper>
  );
}

export default App;
