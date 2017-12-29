import React, { Component } from "react";
import Dropzone from "react-dropzone";
import socketIOClient from "socket.io-client";
const SocketIOFileUpload = require("socketio-file-upload");


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
        uploadImg: false
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
      this.resetToLatest = this.resetToLatest.bind(this);
      this.loadDrawing = this.loadDrawing.bind(this);
  }

  componentWillMount() {
      console.log('app will mount');
      const history = window.sessionStorage.getItem('history');
      if (history) {
          this.setState({history: JSON.parse(history)});
      }
  }

  componentDidMount() {
      console.log('app did mount');
      this.counter = 0;
      const { endpoint } = this.state;
      this.socket = socketIOClient(endpoint);
      this.uploader = new SocketIOFileUpload(this.socket);
      this.canvas = this.refs.canvas;

      if (this.state.uploadImg) {
          console.log('there was uploadImg');
          this.loadDrawing(this.state.uploadImg);
          this.setState({uploadImg: false});
      }

      if (this.state.history.length > 0) {
          this.loadDrawing(this.state.history.slice(-1)[0]);
      }


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
          this.setState({history: [...this.state.history, this.canvas.toDataURL()]});
          window.sessionStorage.setItem('history', JSON.stringify([...this.state.history, this.canvas.toDataURL()]));

      });

      this.socket.on('image_drop_accept', (src) => {
          this.loadDrawing(src);
      });

      this.socket.on('undo_latest', () => {
          this.resetToLatest();
      });

      this.socket.on('img_uploaded', (name) => {
          let readablePath = name.substr(29);
          console.log(readablePath);
          console.log('running loaddrawing with state');
          this.loadDrawing(readablePath);
      });

      this.mainLoop();
  }

  componentWillUnmount() {
      console.log('app will unmount');
  }

    handleMouseDown(e) {
        this.socket.emit('update_client_history');
        this.setState({mousePos:{x: (e.clientX - this.canvas.offsetLeft)/window.innerWidth,
            y: (e.clientY - this.canvas.offsetTop)/window.innerWidth}});
        this.setState({mousePosPrev:{x: (e.clientX - this.canvas.offsetLeft - 1)/window.innerWidth,
            y: (e.clientY - this.canvas.offsetTop)/window.innerWidth}});
        this.setState({ paint: true });
    }


    loadDrawing(imgSrc) {
      console.log('loaddrawing running');
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0 , 0,this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
        };
        img.src = imgSrc;
    }



    handleMouseUp() {
        this.socket.emit('update_client_history');
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

    handleUndo() {
        this.socket.emit('undo_latest');
    }

    resetToLatest() {
       /* console.log('reset');
        let context = this.canvas.getContext("2d");
        context.beginPath();
        let img = new Image();
        img.onload = () => {
            context.clearRect(0 , 0,this.canvas.width, this.canvas.height);
            context.drawImage(img, 0, 0);
        };
        console.log(this.state.history);
        img.src = this.state.history.pop();
        console.log(img.src);*/
        this.loadDrawing(this.state.history.pop());
        //this.loadDrawing(this.state.uploadImg);
    }

    mainLoop() {
        if (this.state.paint && this.state.mousePosPrev) {
            this.socket.emit('draw_line', {line: [this.state.mousePos, this.state.mousePosPrev]});
            this.setState({mouseDrag: false});
        }
        this.setState({mousePosPrev: {x: this.state.mousePos.x, y: this.state.mousePos.y}});
        this.timeout = setTimeout(this.mainLoop, 25);
    }

    handleDragEnter() {
      console.log('dragenter');
      this.counter++;
        console.log(this.counter);
        this.setState({showDropzone: true});
    }

    handleDragLeave() {
      console.log('dragleave');
      this.counter--;
      console.log(this.counter);
      if (this.counter === 0) {
          this.setState({showDropzone: false});
      }
    }

    onImageDropAccept(files) {
        console.log('image drop');
        this.counter = 0;
        this.setState({showDropzone: false});
        this.setState({uploadImg: URL.createObjectURL(files[0])});
        //this.uploader.submitFiles(files);
        //this.loadDrawing(URL.createObjectURL(files[0]));
        this.socket.emit('image_drop_accept', URL.createObjectURL(files[0]));
    }



  render() {
    const { showDropzone } = this.state;
    return (
        <div style={{ textAlign: "center" }}
             onDragEnter={this.handleDragEnter}
             onDragLeave={this.handleDragLeave}>
            {showDropzone
            ?  <Dropzone
                    multiple={false}
                    accept="image/*"
                    onDropAccepted={this.onImageDropAccept}>
                    <p>Drop an image here to add it to the drawing</p>
                </Dropzone>
            :   <canvas style={{border: '1px solid black'}}
                        ref="canvas"
                        width={window.innerWidth*0.5} height={window.innerWidth*0.5}
                        onMouseDown={this.handleMouseDown}
                        onMouseMove={this.handleMouseMove}
                        onMouseUp={this.handleMouseUp}
                        onMouseLeave={this.handleMouseLeave}>
                </canvas>}
            <button onClick={this.handleUndo}>undo</button>
        </div>
    );
  }
}

export default App;