import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 5000;

export const PACKET_FREQ = 1000 / 30;


let users = [];

class User {
    constructor (socket) {
        this.socket = socket;
    }
}
 
io.on('connection', socket => {
    const user = new User(socket);
    users.push(user);

    socket.on('disconnect', () => {
        users = users.filter(element => element !== user);
    });
})

app.use(express.static("public"));

httpServer.listen(PORT);