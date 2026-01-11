import { Response } from 'express';

interface NotificationClient {
    id: string;
    res: Response;
}

class NotificationService {
    private clients: NotificationClient[] = [];

    /**
     * Add a new SSE client
     */
    addClient(userId: string, res: Response) {
        const newClient = { id: userId, res };
        this.clients.push(newClient);

        // Keep-alive heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
            res.write(': keep-alive\n\n');
        }, 30000);

        // Remove client on connection close
        res.on('close', () => {
            clearInterval(heartbeat);
            this.removeClient(userId);
            console.log(`📡 SSE Client disconnected: ${userId}`);
        });

        console.log(`📡 SSE Client connected: ${userId} (Total: ${this.clients.length})`);
    }

    /**
     * Remove an SSE client
     */
    private removeClient(userId: string) {
        this.clients = this.clients.filter(client => client.id !== userId);
    }

    /**
     * Send a notification to a specific user
     */
    sendToUser(userId: string, data: any) {
        const userClients = this.clients.filter(client => client.id === userId);
        userClients.forEach(client => {
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }

    /**
     * Broadcast a notification to all connected users
     */
    broadcast(data: any) {
        this.clients.forEach(client => {
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }

    /**
     * Send to multiple specific users (e.g., all admins or specific roles)
     */
    sendToUsers(userIds: string[], data: any) {
        this.clients
            .filter(client => userIds.includes(client.id))
            .forEach(client => {
                client.res.write(`data: ${JSON.stringify(data)}\n\n`);
            });
    }
}

export const notificationService = new NotificationService();
