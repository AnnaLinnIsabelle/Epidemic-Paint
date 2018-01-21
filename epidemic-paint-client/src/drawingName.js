/**
 * Created by Linn on 2018-01-04.
 */
import React, {Component} from "react";
import ContentEditable from "react-contenteditable";

class DrawingName extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hover: false
        };
        this.toggleHover = this.toggleHover.bind(this);
    }

    toggleHover() {
        this.setState({hover: !this.state.hover})
    }

    render() {
        let divStyle;
        if (this.state.hover) {
            divStyle = "hover-name-div";
        } else {
            divStyle = "name-div";
        }
        return (
            <div className={divStyle} onMouseEnter={this.toggleHover} onMouseLeave={this.toggleHover}>
                <ContentEditable
                    html={this.props.name}
                    disabled={false}
                    onChange={this.props.handleNameChange}/>
            </div>
        );
    }
}

export default DrawingName;