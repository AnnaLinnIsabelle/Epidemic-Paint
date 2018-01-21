/**
 * Created by Linn on 2017-12-29.
 */
import React, {Component} from "react";
import {ListGroup, ListGroupItem} from 'react-bootstrap';

class DrawingsList extends Component {
    constructor(props) {
        super(props);
        this.handleClickedDrawing = this.handleClickedDrawing.bind(this);
    }

    handleClickedDrawing(e) {
        const drawing = this.props.drawings.find((drawing) => {
            return drawing.name === e.target.textContent
        });
        this.props.clickedDrawing(drawing);
    }

    render() {
        return (
            <div>
                <h4>Saved drawings</h4>
                <div className="drawingslist-div">
                <ListGroup>
                    {this.props.drawings.map((drawing) => {
                        return <ListGroupItem key={drawing.name}
                                              onClick={this.handleClickedDrawing}>{drawing.name}</ListGroupItem>
                    })}
                </ListGroup>
                </div>
            </div>
        );
    }


}

export default DrawingsList;