/**
 * Created by Linn on 2017-12-23.
 */

import React from 'react';
import socketIOClient from "socket.io-client";

class Canvas extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            paint: false,
            mousePos: false,
            mousePosPrev: false,
            history: []
        };
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.mainLoop = this.mainLoop.bind(this);
        this.handleUndo = this.handleUndo.bind(this);
        this.resetToLatest = this.resetToLatest.bind(this);
        this.handleSaveDrawing = this.handleSaveDrawing.bind(this);
        this.loadDrawing = this.loadDrawing.bind(this);
    }

    componentDidMount() {
        const { endpoint } = this.props;
        this.socket = socketIOClient(endpoint);

        this.canvas = this.refs.canvas;
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
            console.log('updateclient history');
            this.setState({history: [...this.state.history, this.canvas.toDataURL()]});
            window.sessionStorage.setItem('history', [...this.state.history, this.canvas.toDataURL()]);
        });
        this.socket.on('undo_latest', () => {
            this.resetToLatest();
        });

            this.loadDrawing();

        this.mainLoop();
    }

    componentWillUnmount() {
        console.log('stop mainloop');
        clearTimeout(this.timeout);
    }

    handleMouseDown(e) {
        this.socket.emit('update_client_history');
        this.setState({mousePos:{x: (e.clientX - this.canvas.offsetLeft)/window.innerWidth,
            y: (e.clientY - this.canvas.offsetTop)/window.innerWidth}});
        this.setState({mousePosPrev:{x: (e.clientX - this.canvas.offsetLeft - 1)/window.innerWidth,
            y: (e.clientY - this.canvas.offsetTop)/window.innerWidth}});
        this.setState({ paint: true });
    }

    handleMouseUp() {
        this.setState({ paint: false });
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
        this.setState({ paint: false });
    }


    mainLoop() {
            if (this.state.paint && this.state.mousePosPrev) {
                this.socket.emit('draw_line', {line: [this.state.mousePos, this.state.mousePosPrev]});
                this.setState({mouseDrag: false});
            }
            this.setState({mousePosPrev: {x: this.state.mousePos.x, y: this.state.mousePos.y}});
            this.timeout = setTimeout(this.mainLoop, 25);
    }

    handleUndo() {
        this.socket.emit('undo_latest');
    }

    resetToLatest() {
        console.log('reset');
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0 , 0,this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
        };
        console.log(this.state.history);
        img.src = this.state.history.pop();
        console.log(img.src);
    }

    loadDrawing() {
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0 , 0,this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
        };
        console.log(this.props.imgURI);
        img.src = this.props.imgURI;
    }

    handleSaveDrawing() {
        this.socket.emit('save_drawing', {imgURI: this.canvas.toDataURL(), drawingName: 'my-drawing'})
    }

    render() {
        return(
            <div>
                    <canvas style={{border: '1px solid black'}}
                            ref="canvas"
                            width={window.innerWidth*0.5} height={window.innerWidth*0.5}
                            onMouseDown={this.handleMouseDown}
                            onMouseMove={this.handleMouseMove}
                            onMouseUp={this.handleMouseUp}
                            onMouseLeave={this.handleMouseLeave}>
                    </canvas>
                <button onClick={this.handleUndo}>undo</button>
                <button onClick={this.handleSaveDrawing}>Save Drawing</button>
            </div>
        )
    }


}

export default Canvas;
