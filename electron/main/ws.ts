import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

interface Task {
    task: string;
    data: any;
    id?: string;
}

let wss: WebSocketServer | null = null;
let events: EventEmitter | null = null;
const clients = new Set<WebSocket>();

export function initWs(eventEmitter: EventEmitter) {
    events = eventEmitter;
    wss = new WebSocketServer({ port: 6789 });

    wss.on('connection', (ws: WebSocket) => {
        clients.add(ws);
        console.log('Client connected. Total clients:', clients.size);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.task === 'response' && events) {
                    fs.writeFileSync(path.join(os.homedir(), '.pet', 'latest.html'), message.data)
                    events.emit(message.id, message.data);
                }
            } catch (error) {
                console.error('Failed to parse WS message:', error);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            console.log('Client disconnected. Total clients:', clients.size);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clients.delete(ws);
        });
    });

    console.log('WebSocket server started on port 6789');
}

export function createTask(taskData: Task): string | null {
    if (clients.size === 0) {
        return null;
    }

    const taskId = uuidv4();
    taskData.id = taskId

    // Get the first client from the set
    const [firstClient] = clients;

    if (firstClient && firstClient.readyState === WebSocket.OPEN) {
        console.log('Sending task data:', JSON.stringify(taskData))
        firstClient.send(JSON.stringify(taskData));
        return taskId;
    }

    return null;
}
