import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 5000;


import { Game } from "./game.js";

export const PACKET_FREQ = 1000 / 30

let users = [];
const game = new Game();

class User {
    constructor (socket) {
        this.socket = socket;
    }
}
 
io.on('connection', socket => {
    const user = new User(socket);
    users.push(user);
 
    game.addPlayer(socket); 

    socket.on('disconnect', () => {
        users = users.filter(element => element !== user);
        game.removePlayer(socket)
    });
})

app.use(express.static("public"));

httpServer.listen(PORT);