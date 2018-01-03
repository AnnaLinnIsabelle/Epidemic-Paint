/**
 * Created by Linn on 2018-01-02.
 */
import React, {Component} from "react";
import {Button, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter} from 'react-bootstrap';
//import './messageModal.css';

class MessageModal extends Component {
    constructor(props) {
        super(props);
    }


    render() {
        return (
                <Modal show={this.props.show}>
                    <ModalHeader>
                        <ModalTitle>Save drawing...</ModalTitle>
                    </ModalHeader>
                    <ModalBody>{this.props.message}</ModalBody>
                    <ModalFooter>
                        <Button onClick={this.props.onOK}>OK</Button>
                        <Button onClick={this.props.onCancel}>Cancel</Button>
                    </ModalFooter>
                </Modal>
        );
    }
}

export default MessageModal;