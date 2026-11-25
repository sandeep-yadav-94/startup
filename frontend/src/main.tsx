import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext.tsx';
import "leaflet/dist/leaflet.css"
import { SocketProvider } from './context/SocketContext.tsx';

export const utilsService =  "https://utils-service-todn.onrender.com";
export const realtimeService = "https://realtime-service-2qt6.onrender.com";
export const riderService = "https://rider-service-mbgc.onrender.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="893773152488-4jd8ff53aps35rbd4r34o0g0sg9d0na5.apps.googleusercontent.com">
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)

  
 

