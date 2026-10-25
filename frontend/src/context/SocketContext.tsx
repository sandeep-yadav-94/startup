import {createContext, useContext, useEffect, useRef, type ReactNode} from 'react';
import {io,  Socket} from 'socket.io-client';
import { realtimeService } from '../main';
import { useAppData } from './AppContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({socket: null});

export const SocketProvider = ({children}: {children: ReactNode}) => {

  const {isAuth} = useAppData();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuth ) {
      socketRef.current?.disconnect()
      socketRef.current = null;
      return;
    }
    if(socketRef.current) return;
    const socket = io(realtimeService, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      console.log(`Connected to socket server with id: ${socket.id}`);
    });
    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from socket server. Reason: ${reason}`);
    });
    socket.on('connect_error', (error) => {
      console.error(`Connection error: ${error.message}`);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    }
  }, [isAuth]);
  

  return (
    <SocketContext.Provider value={{socket: socketRef.current}}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);