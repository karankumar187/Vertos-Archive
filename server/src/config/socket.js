const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    // Determine allowed origins dynamically like the main cors config
    const allowedOrigins = [
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    ];
    if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
    }

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                const allowed = allowedOrigins.some(p =>
                    typeof p === 'string' ? p === origin : p.test(origin)
                );
                if (allowed) return callback(null, true);
                callback(new Error(`CORS: origin ${origin} not allowed`));
            },
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // Listen for clients joining specific query/discussion rooms
        socket.on('join_query', (queryId) => {
            socket.join(`query_${queryId}`);
            console.log(`[Socket] ${socket.id} joined room query_${queryId}`);
        });

        socket.on('leave_query', (queryId) => {
            socket.leave(`query_${queryId}`);
            console.log(`[Socket] ${socket.id} left room query_${queryId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIO };
