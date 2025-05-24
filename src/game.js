import { PACKET_FREQ } from "./index.js";

class Player {
    constructor (socket) {
        this.position = {
            x: 0,
            y: 0,
            z: 0
        };
        this.velocity = {
            x: 0,
            z: 0
        }
        this.socket = socket;
        this.id = socket.id;
    }

    updateTransform( data ) {
        const [position, velocity] = data;

        this.position.x = position[0];
        this.position.y = position[1];
        this.position.z = position[2];

        this.velocity.x = velocity[0];
        this.velocity.z = velocity[1];
    }
}


export class Game {
    constructor (id = 0) {
        this.players = new Map();

        this.id = id;

        setInterval(() => {
            this.updatePlayers();
        }, PACKET_FREQ)
    }

    addPlayer(playerSocket) {
        const player = new Player(playerSocket);
        this.players.set(playerSocket.id, player);

        playerSocket.on("transform-update", data => {
            player.updateTransform(data)
        })

        playerSocket.on("shoot", data => { this.playerShooting(data) })

        this.players.forEach((p, id) => {
            if (id !== playerSocket.id) {
                p.socket.emit("add-enemy", { id: playerSocket.id });
            }
        });

        this.players.forEach((p, id) => {
            if (id !== playerSocket.id) {
                playerSocket.emit("add-enemy", { id });
            }
        });
    }

    removePlayer(playerSocket) {
        this.players.delete(playerSocket.id)

        this.players.forEach((player, id) => {
            player.socket.emit("remove-player", playerSocket.id);
        })
    }

    playerShooting(data) {
        this.players.forEach((player, id) => {
            if (id !== data.id) {
                player.socket.emit("shoot", data);
            }
        })
    }

    updatePlayers() {
        const data = {};

        this.players.forEach((player) => {
            data[player.socket.id] = [
                [player.position.x, player.position.y, player.position.z],
                [player.velocity.x, player.velocity.z]
            ];
        });

        this.players.forEach((player) => {
            const filtered = Object.fromEntries(
                Object.entries(data).filter(([key]) => key !== player.id)
            );

            if (Object.keys(filtered).length > 0) {
                player.socket.emit("update", filtered);
            }
        });
    }



    update() {
        
    }
}