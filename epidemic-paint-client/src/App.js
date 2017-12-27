import React, { Component } from "react";
import Canvas from "./canvas";
import Dropzone from "react-dropzone";
import './App.css';

class App extends Component {
  constructor() {
    super();
    this.state = {
        endpoint: "http://127.0.0.1:4001",
        showDropzone: false,
        crayonColor: 'black',
        crayonWidth: 3,
        currentDrawing: {imgURI: window.sessionStorage.getItem('history'), drawingName: 'my-drawing'},
        history: false
    };
      this.handleDragEnter = this.handleDragEnter.bind(this);
      this.handleDragLeave = this.handleDragLeave.bind(this);
      this.onImageDrop = this.onImageDrop.bind(this);
  }

  componentDidMount() {
     if (window.sessionStorage.getItem('history')) {
         console.log('there is history in storage');
         this.setState({currentDrawing: {imgURI: window.sessionStorage.getItem('history'), drawingName: 'my-drawing'}});
     }
  }

    handleDragEnter() {
        this.setState({showDropzone: true});
    }

    handleDragLeave() {
        this.setState({showDropzone: false});
    }

    onImageDrop() {
        console.log('image drop');
        this.setState({showDropzone: false});
    }

  render() {
    const { showDropzone } = this.state;
    return (
        <div style={{ textAlign: "center" }}
             onDragEnter={this.handleDragEnter}
             onDragLeave={this.handleDragLeave}>
            {showDropzone
            ? <Dropzone
                    multiple={false}
                    accept="image/*"
                    onDrop={this.onImageDrop}>
                  <p>Drop an image here to add it to the drawing</p>
                </Dropzone>
            : <Canvas
                    crayonColor={this.state.crayonColor}
                    crayonWdith={this.state.crayonWidth}
                    endpoint={this.state.endpoint}
                    imgURI={this.state.currentDrawing.imgURI}/>}

{/*            <div className={this.state.showDropzone ? '' : 'hidden'}>
            <Dropzone
                multiple={false}
                accept="image/*"
                onDrop={this.onImageDrop}>
                <p>Drop an image here to add it to the drawing</p>
            </Dropzone>
            </div>
            <div className={this.state.showDropzone ? 'hidden' : ''}>
            <Canvas
                crayonColor={this.state.crayonColor}
                crayonWdith={this.state.crayonWidth}
                endpoint={this.state.endpoint}/>
            </div>*/}
        </div>
    );
  }
}

export default App;