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
    console.log("New client connected");
    socket.emit('saved_drawings', drawings);

    socket.on('draw_line', function(data) {
        io.emit('draw_line', { line: data.line });
    });

    socket.on('update_client_history', () => {
        io.emit('update_client_history');
    });

    socket.on('undo_latest', () => {
        io.emit('undo_latest');
    });

    socket.on('image_drop_accept', (url) => {
        io.emit('image_drop_accept', url);
    });

    socket.on('save_drawing', (data) => {
        let index = drawings.findIndex(drawing => drawing.name === data.name);
        if (index > -1) {
            drawings[index].url = data.url;
        } else {
            drawings.push(data);
        }
    });
/*    console.log("New client connected"), setInterval(
        () => getApiAndEmit(socket),
        10000
    );*/
    socket.on("disconnect", () => console.log("client disconnected"));
});

server.listen(port, () => console.log(`Listening on port ${port}`));