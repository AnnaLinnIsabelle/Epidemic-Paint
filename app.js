/**
 * Created by Linn on 2017-12-23.
 */
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
//const axios = require("axios");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index); //app.use(express.static(__dirname + '/public'));

const server = http.createServer(app);

const io = socketIo(server);

let drawings = [];
//let line_history = []; //keep track of all lines drawn

const getApiAndEmit = socket => {
    socket.emit("FromAPI", "hejhej");
};

io.on("connection", socket => {
    console.log("New client connected");

    // istället för detta, ladda en img på det som redan finns i ritsessionen?
/*        for (let line of line_history) {
            socket.emit('draw_line', {line: line_history[line]});
        }*/


    socket.on('draw_line', function(data) {
        //line_history.push(data.line);
        io.emit('draw_line', { line: data.line });
    });

    socket.on('update_client_history', () => {
        io.emit('update_client_history');
    });

    socket.on('undo_latest', () => {
        io.emit('undo_latest');
    });

    socket.on('save_drawing', (data) => {
        let index = drawings.findIndex(drawing => drawing.drawingName === data.drawingName);
        if (index > -1) {
            drawings[index].imgURI = data.imgURI;
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