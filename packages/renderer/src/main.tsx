import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import App from './App.tsx'
import './index.css'


const router = createHashRouter([{ path: "/", Component: App }])

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
