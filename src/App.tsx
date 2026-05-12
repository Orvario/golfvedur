import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CoursesPage />} />
        <Route path="/course/:id" element={<CourseDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
