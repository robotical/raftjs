import React, { useEffect, useState } from 'react';
import './styles.css';
import ConnManager from './ConnManager';
import { RaftConnEvent, RaftUpdateEvent, RaftPublishEvent } from "../../../src/main";
import StatusScreen from './StatusScreen';

const connManager = ConnManager.getInstance();

export default function Main() {
  const [connectionStatus, setConnectionStatus] = useState<RaftConnEvent>(RaftConnEvent.CONN_DISCONNECTED);

  useEffect(() => {
    // Define the listener for raft events
    const listener = (eventType: string, 
      eventEnum: RaftConnEvent | RaftUpdateEvent | RaftPublishEvent,
      eventName: string,
      data?: object | string | null) => {
      console.log(`Connection event: ${eventName}`);
      if (eventType === "conn") {
        if ((eventEnum === RaftConnEvent.CONN_CONNECTED) || (eventEnum === RaftConnEvent.CONN_DISCONNECTED)) {
          setConnectionStatus(eventEnum);
        }
      }
    };

    // Set the listener function
    connManager.setConnectionEventListener(listener);

    // Clean up the listener when the component unmounts
    return () => {
      connManager.setConnectionEventListener(() => {});
    };
  }, []);

  return (
    <div className="content-outer">
      <div className="header">
        <h1>RaftJS Dashboard</h1>
      </div>
      <div className="content-body">
        {/* Div optionally shown if connected */}
        {connectionStatus === RaftConnEvent.CONN_CONNECTED ?
          <>
          <div className="info-boxes">
            <div className="info-box">
              <div className="conn-indication">
                Connected
              </div>
              <div className="action-button">
                <button onClick={() => connManager.disconnect()}>Disconnect</button>
              </div>
            </div>
          </div>
          <StatusScreen />
          </>
          :
          <>
          <div className="info-boxes">
            <div className="info-box">
              <h3>WebSocket</h3>
              <input className="ip-addr-input" id="ip-addr" type="text" placeholder="IP Address" />
              <button className="action-button" onClick={() => {
                // Get IP address
                const ipAddrElem = document.getElementById("ip-addr") as HTMLInputElement;
                if (ipAddrElem) {
                  const ipAddr = ipAddrElem.value;
                  connManager.connect("WebSocket", ipAddr);
                } else {
                  console.error("No IP address entered");
                }
              }
              }>
                Connect
              </button>
            </div>
            <div className="info-box">
              <h3>WebBLE</h3>
              <button className="action-button" onClick={() => {
                connManager.connect("WebBLE", "");
              }
              }>
                Connect
              </button>
            </div>
            <div className="info-box">
              <h3>WebSerial</h3>
              <button className="action-button" onClick={() => {
                connManager.connect("WebSerial", "");
              }
              }>
                Connect
              </button>
            </div>
          </div>
          </>
        }
      </div>
    </div>
  );
}
