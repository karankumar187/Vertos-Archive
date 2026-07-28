import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace('/api', '');

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to server with ID:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.warn('[Socket] Connection Error:', err.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
