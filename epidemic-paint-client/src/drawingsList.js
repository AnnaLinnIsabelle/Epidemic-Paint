/**
 * Created by Linn on 2017-12-29.
 */
import React, {Component} from "react";

class DrawingsList extends Component {
    constructor(props) {
        super(props);
        this.handleClickedDrawing = this.handleClickedDrawing.bind(this);
    }

    handleClickedDrawing(e) {
        const drawing = this.props.drawings.find((drawing) => {
            return drawing.name === e.target.textContent});
        this.props.clickedDrawing(drawing);
    }

    render() {
        return (
            <div>
             <ul>
                 {this.props.drawings.map((drawing) => {
                     return <li key={drawing.name}
                     onClick={this.handleClickedDrawing}>{drawing.name}</li>
                 })}
             </ul>
            </div>
        );
    }


}

export default DrawingsList;