import React, { useEffect, useState, useRef } from 'react';
import './styles.css';
import SettingsScreen from './SettingsScreen';
import ConnManager from './ConnManager';
import {
  RaftConnEvent,
  RaftUpdateEvent,
  RaftPublishEvent,
  RaftSysTypeManager,
} from '../../../src/main';
import StatusPanel from './StatusPanel';
import DevicesPanel from './DevicesPanel';
import CommandPanel from './CommandPanel';
import LatencyTestPanel from './LatencyTestPanel';
import SystemTypeCog from './SystemTypeCog/SystemTypeCog';
import SystemTypeMarty from './SystemTypeMarty/SystemTypeMarty';
import SystemTypeGeneric from './SystemTypeGeneric/SystemTypeGeneric';
import SettingsManager from './SettingsManager';

const sysTypeManager = RaftSysTypeManager.getInstance();
const connManager = ConnManager.getInstance();
sysTypeManager.addSystemType('Cog', () => new SystemTypeCog());
sysTypeManager.addSystemType('Marty', () => new SystemTypeMarty());
sysTypeManager.addDefaultSystemType(() => new SystemTypeGeneric());

export default function Main() {
  const [connectionStatus, setConnectionStatus] = useState<RaftConnEvent>(
    RaftConnEvent.CONN_DISCONNECTED
  );
  const [connectionTime, setConnectionTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsManager = SettingsManager.getInstance();
  const [latencyTestEnabled, setLatencyTestEnabled] = useState(
    settingsManager.getSetting('latencyTest')
  );

  useEffect(() => {
    const listener = (
      eventType: string,
      eventEnum: RaftConnEvent | RaftUpdateEvent | RaftPublishEvent,
      eventName: string,
      data?: object | string | null
    ) => {
      if (eventType === 'conn') {
        if (
          eventEnum === RaftConnEvent.CONN_CONNECTED ||
          eventEnum === RaftConnEvent.CONN_DISCONNECTED
        ) {
          setConnectionStatus(eventEnum);
          setConnectionTime(new Date());
        }
      }
    };

    connManager.setConnectionEventListener(listener);

    return () => {
      connManager.setConnectionEventListener(() => { });
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyTestEnabled(settingsManager.getSetting('latencyTest'));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connectionStatus === RaftConnEvent.CONN_CONNECTED && connectionTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - connectionTime.getTime();

        const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        const milliseconds = (elapsed % 1000).toString().padStart(3, '0');

        setElapsedTime(`${hours}:${minutes}:${seconds}:${milliseconds}`);
      }, 50);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(null);
    }
  }, [connectionStatus, connectionTime]);

  return (
    <div className="content-outer">
      {showSettings ? (
        <SettingsScreen onBack={() => setShowSettings(false)} />
      ) : (
        <>
          <div className="header">
            <h1>RaftJS Dashboard</h1>
            <div
              className="menu-icon header-menu-icon"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </div>
            {menuOpen && (
              <div className="dropdown-menu" ref={menuRef}>
                <div
                  className="menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSettings(true);
                  }}
                >
                  Settings
                </div>
              </div>
            )}
          </div>
          <div className="content-body">
            {connectionStatus === RaftConnEvent.CONN_CONNECTED ? (
              <>
                <div className="connected-panel">
                  <div className="info-boxes">
                    <div className="info-box">
                      <div className="conn-indication">
                        <h3>Connected</h3>
                      </div>
                      <div>
                        <button
                          className="action-button"
                          onClick={() => connManager.disconnect()}
                        >
                          Disconnect
                        </button>
                      </div>
                      <div>
                        {elapsedTime && <p>{elapsedTime}</p>}
                      </div>
                    </div>
                  </div>
                  <StatusPanel />
                  {latencyTestEnabled && <LatencyTestPanel />}
                  <CommandPanel />
                </div>
                <DevicesPanel />
              </>
            ) : (
              <>
                <div className="info-boxes">
                  <div className="info-box">
                    <h3>WebSocket</h3>
                    <input
                      className="ip-addr-input"
                      id="ip-addr"
                      type="text"
                      placeholder="IP Address"
                    />
                    <button
                      className="action-button"
                      onClick={() => {
                        const ipAddrElem = document.getElementById(
                          'ip-addr'
                        ) as HTMLInputElement;
                        if (ipAddrElem) {
                          const ipAddr = ipAddrElem.value;
                          connManager.connect('WebSocket', ipAddr, []);
                        } else {
                          console.error('No IP address entered');
                        }
                      }}
                    >
                      Connect
                    </button>
                  </div>
                  <div className="info-box">
                    <h3>WebBLE</h3>
                    <button
                      className="action-button"
                      onClick={() => {
                        connManager.connect('WebBLE', '', sysTypeManager.getAllServiceUUIDs());
                      }}
                    >
                      Connect
                    </button>
                  </div>
                  <div className="info-box">
                    <h3>WebSerial</h3>
                    <button
                      className="action-button"
                      onClick={() => {
                        connManager.connect('WebSerial', '', []);
                      }}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
