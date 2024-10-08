import React, { useState } from 'react';
import ConnManager from './ConnManager';

const connManager = ConnManager.getInstance();

const examplesJson = {
  "sections": [
    {
      "name": "LEDs (ind,ring,button)",
      "examples": [
        { "label": "Button red", "api": "/led/button/set/0/#ff0000" },
        { "label": "Ring pattern RainbowSnake", "api": "/led/ring/pattern/RainbowSnake" },
        { "label": "Ring pattern clear", "api": "/led/ring/pattern" }
      ]
    },
    {
      "name": "Audio",
      "examples": [
        { "label": "Play Halloween", "api": "/audio/rtttl/Entertainer:d=4,o=5,b=140:8d,8d#,8e,c6,8e,c6,8e,2c.6,8c6,8d6,8d#6,8e6,8c6,8d6,e6,8b,d6,2c6,p,8d,8d#,8e,c6,8e,c6,8e,2c.6,8p,8a,8g,8f#,8a,8c6,e6,8d6,8c6,8a,2d6" },
        { "label": "Stop", "api": "/audio/stop" },
        { "label": "Volume 50%", "api": "/audio/vol/50" }
      ]
    }
  ]
};

export default function CommandPanel() {
  const [command, setCommand] = useState('');
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  // Handler to set the command in the input box
  const handleLoadCommand = (api: string) => {
    setCommand(api);
  };

  // Handler for key press events in the input box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendCommand(command);
    }
  };

  // Handler to send command when Enter is pressed or button clicked
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

  // Toggle the open/close state of a section
  const toggleSection = (sectionName: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName]
    }));
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
              onKeyDown={handleKeyDown} // Add onKeyDown event handler
            />
            <button className="send-command-button" onClick={() => handleSendCommand(command)}>
              Send Command
            </button>
          </div>

          {/* Example Commands in Right Column */}
          <div className="info-column example-commands-column">
            <h4>Example Commands</h4>

            {examplesJson.sections.map((section) => (
              <div className="collapsible-section" key={section.name}>
                <button
                  className="collapsible-header"
                  onClick={() => toggleSection(section.name)}
                >
                  {section.name} {openSections[section.name] ? "▲" : "▼"}
                </button>
                {openSections[section.name] && (
                  <div className="collapsible-content">
                    {section.examples.map((example, index) => (
                      <div className="example-command" key={index} title={example.api}>
                        {/* Show tooltip with API on hover using title attribute */}
                        {example.label}
                        <button
                          className="example-load-button"
                          onClick={() => handleLoadCommand(example.api)}
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
