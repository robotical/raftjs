import React, { useState } from 'react';
import ConnManager from './ConnManager';

const connManager = ConnManager.getInstance();

export default function CommandPanel() {
    const [command, setCommand] = useState('');

    // Handler to send command when button is clicked
    const handleSendCommand = () => {
        if (command) {
            // Send command using sendRICRestMsg
            connManager.getConnector().sendRICRESTMsg(command, {}).then(response => {
                console.log(`Command sent: ${command}, Response:`, response);
            }).catch(error => {
                console.error(`Error sending command: ${command}`, error);
            });
        } else {
            console.error("Command is empty.");
        }
    };

    return (
        <div className="info-boxes">
            <div className="info-box">
                <h3>Command Panel</h3>
                <input
                    type="text"
                    className="command-input"
                    value={command}
                    placeholder="Enter Command"
                    onChange={(e) => setCommand(e.target.value)}
                />
                <button className="send-command-button" onClick={handleSendCommand}>
                    Send Command
                </button>
            </div>
        </div>
    );
}
