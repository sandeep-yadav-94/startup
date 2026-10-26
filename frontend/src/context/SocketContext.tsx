import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {io,  Socket} from 'socket.io-client';
import { realtimeService } from '../main';
import { useAppData } from './AppContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({socket: null});

export const SocketProvider = ({children}: {children: ReactNode}) => {

  const {isAuth, loading} = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (loading || !isAuth) {
      return;
    }

    const socket = io(realtimeService, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      setSocket(socket);
      console.log(`Connected to socket server with id: ${socket.id}`);
    });
    socket.on('disconnect', (reason) => {
      setSocket(null);
      console.log(`Disconnected from socket server. Reason: ${reason}`);
    });
    socket.on('connect_error', (error) => {
      console.error(`Connection error: ${error.message}`);
    });
    return () => {
      socket.disconnect();
    }
  }, [isAuth, loading]);
  

  return (
    <SocketContext.Provider value={{socket: isAuth && !loading ? socket : null}}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);