import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './context/AppContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="893773152488-fsdd1q9cotb5atkss56hniin75g3jrcv.apps.googleusercontent.com">
      <AppProvider>
         <App />
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)

  
 

