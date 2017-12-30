import React, {Component} from "react";
import Dropzone from "react-dropzone";
import socketIOClient from "socket.io-client";
import DrawingsList from "./drawingsList";
import ContentEditable from "react-contenteditable";

class App extends Component {
    constructor() {
        super();
        this.state = {
            endpoint: "http://127.0.0.1:4001",
            showDropzone: false,
            crayonColor: 'black',
            crayonWidth: 3,
            paint: false,
            mousePos: false,
            mousePosPrev: false,
            history: [],
            savedDrawings: [],
            socketRoom: false,
            html: 'new_drawing'
        };
        this.handleDragEnter = this.handleDragEnter.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.onImageDropAccept = this.onImageDropAccept.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.mainLoop = this.mainLoop.bind(this);
        this.handleUndo = this.handleUndo.bind(this);
        this.loadDrawing = this.loadDrawing.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.clickedDrawing = this.clickedDrawing.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
    }

    componentWillMount() {
        const history = window.sessionStorage.getItem('history');
        const currDrawing = window.sessionStorage.getItem('currDrawing');
        if (history) {
            this.setState({history: JSON.parse(history)});
        }
        if (currDrawing) {
            console.log('there is currDrawing in sessionStorage');
            this.setState({html: currDrawing});
        }
    }

    componentDidMount() {
        this.counter = 0;
        const {endpoint} = this.state;
        this.socket = socketIOClient(endpoint);
        this.canvas = this.refs.canvas;

        if (this.state.history.length > 0) {
            this.loadDrawing(this.state.history.slice(-1)[0]);
        }

        this.socket.on('initial_room', (room) => {
                console.log('connecting to room ' + room);
                this.setState({socketRoom: room});
                this.socket.emit('subscribe', room);
        });

        this.socket.on('saved_drawings', (drawings) => {
            this.setState({savedDrawings: drawings});
        });

        this.socket.on('draw_line', (data) => {
            let line = data.line;
            let context = this.canvas.getContext("2d");
            context.strokeStyle = this.props.crayonColor;
            context.lineJoin = "round";
            context.lineWidth = this.props.crayonWidth;
            context.beginPath();
            context.moveTo(line[0].x * window.innerWidth, line[0].y * window.innerWidth);
            context.lineTo(line[1].x * window.innerWidth, line[1].y * window.innerWidth);
            context.closePath();
            context.stroke();
        });

        this.socket.on('update_client_history', () => {
            console.log('updateing client history');
            this.setState({history: [...this.state.history, this.canvas.toDataURL()]});
            window.sessionStorage.setItem('history', JSON.stringify([...this.state.history, this.canvas.toDataURL()]));
            window.sessionStorage.setItem('currDrawing', this.state.html ? this.state.html : 'new_drawing');
        });

        this.socket.on('image_drop_accept', (src) => {
            this.loadDrawing(src);
        });

        this.socket.on('undo_latest', () => {
            console.log(this.state.history);
            this.state.history.pop();
            this.loadDrawing(this.state.history.slice(-1)[0]);
        });

        this.mainLoop();
    }


    handleMouseDown(e) {
        this.setState({
            mousePos: {
                x: (e.clientX - this.canvas.offsetLeft) / window.innerWidth,
                y: (e.clientY - this.canvas.offsetTop) / window.innerWidth
            }
        });
        this.setState({
            mousePosPrev: {
                x: (e.clientX - this.canvas.offsetLeft - 1) / window.innerWidth,
                y: (e.clientY - this.canvas.offsetTop) / window.innerWidth
            }
        });
        this.setState({paint: true});
    }

    handleMouseUp() {
        this.socket.emit('update_client_history', {room: this.state.socketRoom});
        this.setState({paint: false});
    }

    handleMouseMove(e) {
        if (this.state.paint) {
            this.setState({
                mousePos: {
                    x: (e.clientX - this.canvas.offsetLeft) / window.innerWidth,
                    y: (e.clientY - this.canvas.offsetTop) / window.innerWidth
                }
            });
        }
    }

    handleMouseLeave() {
        this.setState({paint: false});
    }

    mainLoop() {
        if (this.state.paint && this.state.mousePosPrev) {
            this.socket.emit('draw_line', {room: this.state.socketRoom, line: [this.state.mousePos, this.state.mousePosPrev]});
            this.setState({mouseDrag: false});
        }
        this.setState({mousePosPrev: {x: this.state.mousePos.x, y: this.state.mousePos.y}});
        this.timeout = setTimeout(this.mainLoop, 25);
    }

    loadDrawing(imgSrc) {
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
            console.log('update client history in room ' + this.state.socketRoom);
            this.socket.emit('update_client_history', {room: this.state.socketRoom});
        };
        img.src = imgSrc;
    }


    handleUndo() {
        this.socket.emit('undo_latest', {room: this.state.socketRoom});
    }


    handleDragEnter() {
        this.counter++;
        this.setState({showDropzone: true});
    }

    handleDragLeave() {
        this.counter--;
        if (this.counter === 0) {
            this.setState({showDropzone: false});
        }
    }

    onImageDropAccept(files) {
        this.setState({showDropzone: false});
        this.counter = 0;
        this.socket.emit('image_drop_accept',
            {room: this.state.socketRoom, imgURL: URL.createObjectURL(files[0])});
    }

    handleSave() {
        console.log(this.state.html);
        this.socket.emit('unsubscribe', this.state.socketRoom);
        this.socket.emit('subscribe', this.state.html);
        this.setState({socketRoom: this.state.html});
        this.socket.emit('save_drawing',
            {room: this.state.html, name: this.state.html, url: this.state.history.slice(-1)[0]});
    }

    clickedDrawing(drawing) {
        this.socket.emit('unsubscribe', this.state.socketRoom);
        this.socket.emit('subscribe', drawing.name);
        this.setState({socketRoom: drawing.name});
        console.log('clicked drawing');
        console.log(drawing);
        this.setState({html: drawing.name});
        this.loadDrawing(drawing.url);
    }

    handleNameChange(event) {
        this.setState({html: event.target.value});
    }


    render() {
        return (
            <div style={{textAlign: "center"}}
                 onDragEnter={this.handleDragEnter}
                 onDragLeave={this.handleDragLeave}>
                <ContentEditable
                html={this.state.html}
                disabled={false}
                onChange={this.handleNameChange}/>
                <div style={{display: this.state.showDropzone ? 'block' : 'none'}}>
                    <Dropzone
                        multiple={false}
                        accept="image/*"
                        onDropAccepted={this.onImageDropAccept}>
                        <p>Drop an image here to add it to the drawing</p>
                    </Dropzone>
                </div>
                <div style={{display: this.state.showDropzone ? 'none' : 'block'}}>
                    <canvas style={{border: '1px solid black'}}
                            ref="canvas"
                            width={window.innerWidth * 0.5} height={window.innerWidth * 0.5}
                            onMouseDown={this.handleMouseDown}
                            onMouseMove={this.handleMouseMove}
                            onMouseUp={this.handleMouseUp}
                            onMouseLeave={this.handleMouseLeave}>
                    </canvas>
                </div>
                <button onClick={this.handleUndo}>undo</button>
                <button onClick={this.handleSave}>save</button>
                <DrawingsList drawings={this.state.savedDrawings}
                clickedDrawing={this.clickedDrawing}/>
            </div>
        );
    }
}

export default App;