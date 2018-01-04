/**
 * Created by Linn on 2017-12-23.
 */
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index); //app.use(express.static(__dirname + '/public'));

const server = http.createServer(app);

const io = socketIo(server);

let drawings = [];

io.on("connection", socket => {
    console.log("New client connected", socket.id);
    socket.emit('saved_drawings', drawings);

    socket.on('subscribe', (room) => {
        console.log('joining room', room);
        socket.join(room);
        let socketsInRoom = io.nsps['/'].adapter.rooms[room];
        if (socketsInRoom.length > 1) {
            let otherSocket = Object.keys(socketsInRoom.sockets)[0];
            io.in(otherSocket).emit('new_client_joined');
        }
    });

    socket.on('unsubscribe', (room) => {
        console.log('leaving room', room);
        socket.leave(room);
    });

    socket.on('draw_line', function(data) {
        io.in(data.room).emit('draw_line', { line: data.line, color: data.crayonColor, width: data.crayonWidth });
    });

    socket.on('update_client_history', (data) => {
        io.in(data.room).emit('update_client_history');
    });

    socket.on('undo_latest', (data) => {
        io.in(data.room).emit('undo_latest');
    });

    socket.on('image_drop_accept', (data) => {
        io.in(data.room).emit('image_drop_accept', data.imgURL);
    });

    socket.on('save_drawing_request', (data) => {
        let index = drawings.findIndex(drawing => drawing.name === data.name);
        let message = '';
        if (index > -1) {
            message = 'Overwrite previous drawing with name "' + data.name + '"?';
        } else {
            message = 'Save drawing as "' + data.name + '"?';
        }
        io.in(data.room).emit('save_drawing_request', {message: message});
    });

    socket.on('save_drawing', (data) => {
        let index = drawings.findIndex(drawing => drawing.name === data.name);
        if (index > -1) {
            drawings[index].url = data.url;
        } else {
            drawings.push({name: data.name, url: data.url});
        }
        io.emit('saved_drawings', drawings);
    });

    socket.on('unsaved_changes', (data) => {
        io.in(data.room).emit('unsaved_changes', data.url);
    });

    socket.on("disconnect", () => console.log("client disconnected"));
});

server.listen(port, () => console.log(`Listening on port ${port}`));
