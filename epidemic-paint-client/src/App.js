import React, {Component} from "react";
import Dropzone from "react-dropzone";
import socketIOClient from "socket.io-client";
import DrawingsList from "./drawingsList";
import ContentEditable from "react-contenteditable";
import CrayonSettings from './crayonSettings';
import {Grid, Row, Col, Button} from 'react-bootstrap';
import './App.css';

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
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleWidthChange = this.handleWidthChange.bind(this);
        this.getMousePos = this.getMousePos.bind(this);
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
            this.setState({socketRoom: currDrawing});
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
            if (this.state.socketRoom === false) {
                console.log('connecting to room ' + room);
                this.setState({socketRoom: room});
                this.socket.emit('subscribe', room);
            } else {
                console.log('connectiong to room ' + this.state.socketRoom);
                this.socket.emit('subscribe', this.state.socketRoom);
            }
        });

        this.socket.on('saved_drawings', (drawings) => {
            this.setState({savedDrawings: drawings});
        });

        this.socket.on('draw_line', (data) => {
            let line = data.line;
            let context = this.canvas.getContext("2d");
            context.strokeStyle = data.color;
            context.lineJoin = "round";
            context.lineWidth = data.width;
            context.beginPath();
            context.moveTo(line[0].x, line[0].y);
            context.lineTo(line[1].x, line[1].y);
            context.closePath();
            context.stroke();
        });

        this.socket.on('update_client_history', () => {
            console.log('updateing client history');
            this.setState({history: [...this.state.history, this.canvas.toDataURL()]});
            window.sessionStorage.setItem('history', JSON.stringify([...this.state.history, this.canvas.toDataURL()]));
            window.sessionStorage.setItem('currDrawing', this.state.socketRoom);
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

    getMousePos(e) {
        let rect = this.canvas.getBoundingClientRect();
        let posX = (e.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width;
        let posY = (e.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height;

        return {x: posX, y: posY};
    }


    handleMouseDown(e) {
        this.setState({
            mousePos: {
                x: this.getMousePos(e).x,
                y: this.getMousePos(e).y
            }
        });
        this.setState({
            mousePosPrev: {
                x: this.getMousePos(e).x -1,
                y: this.getMousePos(e).y
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
                    x: this.getMousePos(e).x,
                    y: this.getMousePos(e).y
                }
            });
        }
    }

    handleMouseLeave() {
        this.setState({paint: false});
    }

    mainLoop() {
        if (this.state.paint && this.state.mousePosPrev) {
            this.socket.emit('draw_line', {
                room: this.state.socketRoom,
                line: [this.state.mousePos, this.state.mousePosPrev],
                crayonColor: this.state.crayonColor,
                crayonWidth: this.state.crayonWidth
            });
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
        this.socket.emit('update_client_history', {room: this.state.html});
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

    handleColorChange(color) {
        this.setState({crayonColor: color.hex});
    }

    handleWidthChange(value) {
        this.setState({crayonWidth: value});
    }


    render() {
        return (
            <Grid onDragEnter={this.handleDragEnter}
                  onDragLeave={this.handleDragLeave}>
                    <Row>
                        <Col xs={12}>
                        <h1>Epidemic Paint</h1>
                            <hr></hr>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={6}>
                            <div style={{fontSize: '20px'}}>
                            <ContentEditable
                                             html={this.state.html}
                                             disabled={false}
                                             onChange={this.handleNameChange}/>
                            </div>
                        </Col>
                        <Col xs={6}>
                            <div style={{float: 'right'}}>
                            <Button style={{marginLeft: '5px', marginRight: '5px'}} onClick={this.handleSave}>Save</Button>
                            <Button>New</Button>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={6}>
                        <div style={{display: this.state.showDropzone ? 'block' : 'none', paddingTop: '5%', paddingBottom: '5%'}}>
                            <Dropzone
                                multiple={false}
                                accept="image/*"
                                onDropAccepted={this.onImageDropAccept}>
                                <p>Drop an image here to add it to the drawing</p>
                            </Dropzone>

                        </div>
                        <div style={{display: this.state.showDropzone ? 'none' : 'block', paddingTop: '5%', paddingBottom: '5%'}}>
                            <canvas style={{border: '1px solid black', width: '100%', height: 'auto'}}
                                    ref="canvas"
                                    width={400} height={400}
                                    onMouseDown={this.handleMouseDown}
                                    onMouseMove={this.handleMouseMove}
                                    onMouseUp={this.handleMouseUp}
                                    onMouseLeave={this.handleMouseLeave}>
                            </canvas>
                        </div>
                        </Col>
                        <Col sm={6} md={4}>
                            <div style={{width: '90%', margin: 'auto', paddingTop: '20px'}}>
                        <CrayonSettings color={this.state.crayonColor}
                                        handleColorChange={this.handleColorChange}
                                        handleWidthChange={this.handleWidthChange}/>
                        <Button onClick={this.handleUndo}>undo</Button>
                            </div>
                        </Col>
                        <Col sm={12} md={2}>
                        <DrawingsList drawings={this.state.savedDrawings}
                                      clickedDrawing={this.clickedDrawing}/>
                        </Col>
                    </Row>
            </Grid>
        );
    }
}

export default App;