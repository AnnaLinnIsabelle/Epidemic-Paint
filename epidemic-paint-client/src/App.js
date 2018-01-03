import React, {Component} from "react";
import Dropzone from "react-dropzone";
import socketIOClient from "socket.io-client";
import DrawingsList from "./drawingsList";
import ContentEditable from "react-contenteditable";
import CrayonSettings from './crayonSettings';
import {Grid, Row, Col, Button} from 'react-bootstrap';
import MessageModal from './messageModal';

class App extends Component {
    constructor() {
        super();
        this.state = {
            endpoint: "http://127.0.0.1:4001",
            dropzone: {show: false, width: false, height: false},
            crayonColor: 'black',
            crayonWidth: 3,
            paint: false,
            mousePos: false,
            mousePosPrev: false,
            history: [],
            savedDrawings: [],
            socketRoom: false, // socket room for current drawing open
            socketRoomInitial: false, // socket room for this client
            html: 'new_drawing', // displayed name of the current drawing
            messageModal: {show: false, message: ''}

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
        this.handleOK = this.handleOK.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleNew = this.handleNew.bind(this);
    }

    componentWillMount() {
        const history = window.sessionStorage.getItem('history');
        const currDrawing = window.sessionStorage.getItem('currDrawing');
        if (history) {
            this.setState({history: JSON.parse(history)});
        }
        if (currDrawing) {
            this.setState({html: currDrawing});
            this.setState({socketRoom: currDrawing});
        }
    }

    componentDidMount() {
        this.counter = 0;
        const {endpoint} = this.state;
        this.socket = socketIOClient(endpoint);
        this.canvas = this.refs.canvas;

        // Load and draw drawing stored in sessionStorage
        if (this.state.history.length > 0) {
            this.loadDrawing(this.state.history.slice(-1)[0]);
        }

        this.socket.on('initial_room', (room) => {
            this.setState({socketRoomInitial: room});
            console.log('connecting to room ' + room);
            this.socket.emit('subscribe', room);
            if (this.state.socketRoom) {
                console.log('connection to room ' + this.state.socketRoom);
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
            if (this.state.socketRoom) {
                window.sessionStorage.setItem('currDrawing', this.state.socketRoom);
            }
        });

        this.socket.on('image_drop_accept', (src) => {
            this.loadDrawing(src);
        });

        this.socket.on('undo_latest', () => {
            console.log(this.state.history);
            this.state.history.pop();
            this.loadDrawing(this.state.history.slice(-1)[0]);
        });

        this.socket.on('save_drawing_request', (data) => {
            this.setState({messageModal: {show: true, message: data.message}});
        });

        this.mainLoop();
    }

    /** ----------------------------------- Handle mouse events ----------------------------------- */
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
                x: this.getMousePos(e).x - 1,
                y: this.getMousePos(e).y
            }
        });
        this.setState({paint: true});
    }

    handleMouseUp() {
        this.socket.emit('update_client_history', {
            room: this.state.socketRoom
                ? this.state.socketRoom : this.state.socketRoomInitial
        });
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

    // enable real-time update of painting
    mainLoop() {
        if (this.state.paint && this.state.mousePosPrev) {
            this.socket.emit('draw_line', {
                room: this.state.socketRoom ? this.state.socketRoom : this.state.socketRoomInitial,
                line: [this.state.mousePos, this.state.mousePosPrev],
                crayonColor: this.state.crayonColor,
                crayonWidth: this.state.crayonWidth
            });
            this.setState({mouseDrag: false});
        }
        this.setState({mousePosPrev: {x: this.state.mousePos.x, y: this.state.mousePos.y}});
        this.timeout = setTimeout(this.mainLoop, 25);
    }

    /** ----------------------------------------------------------------------------------------- */

    /** ----------------------------------- Handle image drop ----------------------------------- */

    handleDragEnter() {
        console.log(this.canvas);
        this.counter++;
        this.setState({dropzone: {show: true,
            width: this.canvas.width.toString(),
            height: this.canvas.height.toString()}});
    }

    handleDragLeave() {
        this.counter--;
        if (this.counter === 0) {
            this.setState({dropzone: {show: false, width: false, height: false}});
        }
    }

    onImageDropAccept(files) {
        this.setState({dropzone: {show: false, width: false, height: false}});
        this.counter = 0;
        this.socket.emit('image_drop_accept',
            {
                room: this.state.socketRoom ? this.state.socketRoom : this.state.socketRoomInitial,
                imgURL: URL.createObjectURL(files[0])
            });
    }

    /** ----------------------------------------------------------------------------------------- */

    /** -------------------------------- Handle save/load drawing ------------------------------- */

    handleSave() {
        this.socket.emit('save_drawing_request', {room: this.state.socketRoomInitial, name: this.state.html});
    }

    // handles OK to save a new drawing or overwrite an existing drawing
    handleOK() {
        console.log(this.state.html);
        this.socket.emit('unsubscribe', this.state.socketRoom);
        this.socket.emit('subscribe', this.state.html);
        this.setState({socketRoom: this.state.html});
        this.socket.emit('save_drawing',
            {room: this.state.html, name: this.state.html, url: this.state.history.slice(-1)[0]});
        this.socket.emit('update_client_history', {room: this.state.html});
        this.setState({messageModal: {show: false, message: ''}});
    }

    // handles cancel of save drawing
    handleCancel() {
        this.setState({messageModal: {show: false, message: ''}});
    }

    // handles selection of existing saved drawing
    clickedDrawing(drawing) {
        this.socket.emit('unsubscribe', this.state.socketRoom);
        this.socket.emit('subscribe', drawing.name);
        this.setState({socketRoom: drawing.name});
        this.setState({html: drawing.name});
        this.loadDrawing(drawing.url);
    }

    handleNew() {
        window.sessionStorage.clear();
        window.location.reload();
    }

    /** ----------------------------------------------------------------------------------------- */

    // Redraw image on canvas
    loadDrawing(imgSrc) {
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
            this.socket.emit('update_client_history', {
                room: this.state.socketRoom
                    ? this.state.socketRoom : this.state.socketRoomInitial
            });
        };
        img.src = imgSrc;
    }

    // Undo latest drawn line
    handleUndo() {
        this.socket.emit('undo_latest', {
            room: this.state.socketRoom
                ? this.state.socketRoom : this.state.socketRoomInitial
        });
    }

    // Set name on drawing
    handleNameChange(event) {
        this.setState({html: event.target.value});
    }

    // Set crayon color
    handleColorChange(color) {
        this.setState({crayonColor: color.hex});
    }

    // Set crayon size
    handleWidthChange(value) {
        this.setState({crayonWidth: value});
    }


    render() {
        //const canvWidth = this.canvas.width ? this.canvas.width : '400px';
        const dropzoneStyle = {
            width: '100%',
            heigth: 'auto',
            border: '1px solid red'
        };
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
                    <Col xs={12}>
                        <MessageModal
                            show={this.state.messageModal.show}
                            message={this.state.messageModal.message}
                            onOK={this.handleOK}
                            onCancel={this.handleCancel}/>
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
                            <Button style={{marginLeft: '5px', marginRight: '5px'}}
                                    onClick={this.handleSave}>Save</Button>
                            <Button style={{marginLeft: '5px', marginRight: '5px'}}
                                    onClick={this.handleNew}>New</Button>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <div style={{
                            display: this.state.dropzone.show ? 'block' : 'none',
                            paddingTop: '5%',
                            paddingBottom: '5%'
                        }}>
                            <Dropzone
                                style={{
                                    width: '100%',
                                    paddingBottom: '45%',
                                    paddingTop: '45%',
                                    border: '3px dotted #abafb5',
                                    textAlign: 'center'}}
                                activeStyle={{
                                    width: '100%',
                                    paddingBottom: '45%',
                                    paddingTop: '45%',
                                    border: '3px dotted #abafb5',
                                    boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)',
                                    backgroundColor: '#edeff2',
                                    textAlign: 'center'
                            }}
                                multiple={false}
                                accept="image/*"
                                onDropAccepted={this.onImageDropAccept}>
                                <p>Drop an image here to add it to the drawing</p>
                            </Dropzone>

                        </div>
                        <div style={{
                            display: this.state.dropzone.show ? 'none' : 'block',
                            paddingTop: '5%',
                            paddingBottom: '5%'
                        }}>
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
                    <Col sm={6}>
                        <div style={{width: '90%', margin: 'auto', paddingTop: '20px', paddingLeft: '10%'}}>
                            <CrayonSettings color={this.state.crayonColor}
                                            handleColorChange={this.handleColorChange}
                                            handleWidthChange={this.handleWidthChange}/>
                            <Button onClick={this.handleUndo}>undo</Button>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <div style={{width: '100%', paddingTop: '20px', float: 'right'}}>
                            <DrawingsList drawings={this.state.savedDrawings}
                                          clickedDrawing={this.clickedDrawing}/>
                        </div>
                    </Col>
                </Row>
            </Grid>
        );
    }
}

export default App;