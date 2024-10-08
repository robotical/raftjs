import React, { useState } from 'react';
import ConnManager from './ConnManager';

const connManager = ConnManager.getInstance();

export default function CommandPanel() {
    const [command, setCommand] = useState('');
    const [ledCommandsOpen, setLedCommandsOpen] = useState(false);
    const [audioCommandsOpen, setaudioCommandsOpen] = useState(false);

    // Handler to send command when button is clicked
    const handleSendCommand = (cmd: string) => {
        if (cmd) {
            connManager.getConnector().sendRICRESTMsg(cmd, {}).then(response => {
                console.log(`Command sent: ${cmd}, Response:`, response);
            }).catch(error => {
                console.error(`Error sending command: ${cmd}`, error);
            });
        } else {
            console.error("Command is empty.");
        }
    };

    return (
        <div className="info-boxes">
        <div className="info-box">
            <div className="info-columns">
                {/* Command Input and Button in Left Column */}
                <div className="info-column command-input-column">
                    <h3>Command Panel</h3>
                    <input
                        type="text"
                        className="command-input"
                        value={command}
                        placeholder="Enter Command"
                        onChange={(e) => setCommand(e.target.value)}
                    />
                    <button className="send-command-button" onClick={() => handleSendCommand(command)}>
                        Send Command
                    </button>
                </div>

                {/* Example Commands in Right Column */}
                <div className="info-column example-commands-column">
                    <h4>Example Commands</h4>

                    {/* LED Commands Section */}
                    <div className="collapsible-section">
                        <button className="collapsible-header" onClick={() => setLedCommandsOpen(!ledCommandsOpen)}>
                            LEDs (ind,ring,button) {ledCommandsOpen ? "▲" : "▼"}
                        </button>
                        {ledCommandsOpen && (
                            <div className="collapsible-content">
                                <div className="example-command">
                                    Button red (/led/button/0/#ff0000)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/led/button/set/0/#ff0000")}>
                                        Send
                                    </button>
                                </div>
                                <div className="example-command">
                                    Ring pattern RainbowSnake (/led/ring/pattern/RainbowSnake)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/led/ring/pattern/RainbowSnake")}>
                                        Send
                                    </button>
                                </div>
                                <div className="example-command">
                                    Ring pattern clear (/led/ring/pattern)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/led/ring/pattern")}>
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Motor Commands Section */}
                    <div className="collapsible-section">
                        <button className="collapsible-header" onClick={() => setaudioCommandsOpen(!audioCommandsOpen)}>
                            Audio {audioCommandsOpen ? "▲" : "▼"}
                        </button>
                        {audioCommandsOpen && (
                            <div className="collapsible-content">
                                <div className="example-command">
                                    Play Halloween (/audio/rtttl/...)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/audio/rtttl/Entertainer:d=4,o=5,b=140:8d,8d#,8e,c6,8e,c6,8e,2c.6,8c6,8d6,8d#6,8e6,8c6,8d6,e6,8b,d6,2c6,p,8d,8d#,8e,c6,8e,c6,8e,2c.6,8p,8a,8g,8f#,8a,8c6,e6,8d6,8c6,8a,2d6")}>
                                        Send
                                    </button>
                                </div>
                                <div className="example-command">
                                    Stop (/audio/stop)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/audio/stop")}>
                                        Send
                                    </button>
                                </div>
                                <div className="example-command">
                                    Volume (/audio/vol/50)
                                    <button className="example-send-button" onClick={() => handleSendCommand("/audio/vol/50")}>
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}
