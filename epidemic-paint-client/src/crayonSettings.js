/**
 * Created by Linn on 2017-12-30.
 */

import React from 'react';
import {CirclePicker} from 'react-color';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

class CrayonSettings extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(value) {
        console.log(value);
    }

    render() {
        return (
            <div>
                <div style={{padding: '30px'}}>
                    <CirclePicker
                        color={this.props.color}
                        onChangeComplete={this.props.handleColorChange}/>
                </div>
                <div style={{padding: '30px'}}>
                    <Slider
                        min={0}
                        max={30}
                        onChange={this.props.handleWidthChange}/>
                </div>
            </div>

        );
    }
}

export default CrayonSettings;