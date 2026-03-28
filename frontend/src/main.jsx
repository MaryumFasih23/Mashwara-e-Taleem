import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider} from 'react-router-dom'
import { AuthProvider } from "./AuthContext";
import AppRoutes from './routing/Routes.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
    <RouterProvider router={AppRoutes}>    
      <App />
    </RouterProvider>
    </AuthProvider>
  </StrictMode>,
)
