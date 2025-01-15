// src/LatencyTestPanel.tsx
import React, { useEffect, useState } from 'react';
import './styles.css';
import ConnManager from "./ConnManager";
import LatencyTest from './LatencyTest';
import SettingsManager from './SettingsManager';
import { DeviceAttributeState, DeviceState } from '../../../src/RaftDeviceStates';

const connManager = ConnManager.getInstance();
const settingsManager = SettingsManager.getInstance();

const LatencyTestPanel = () => {

  const latencyTest = LatencyTest.getInstance();
  const [stats, setStats] = useState(latencyTest.getLatencyStats());
  const [isWhite, setIsWhite] = useState<boolean>(true);

  const attributeName = settingsManager.getSetting('latencyAttributeName');
  
  useEffect(() => {
    const deviceManager = connManager.getConnector().getSystemType()?.deviceMgrIF;
    if (!deviceManager) {
      return;
    }

    const onNewDevice = (deviceKey: string, newDeviceState: DeviceState) => {
      console.log(`New device: ${deviceKey}`);
    };

    const onNewAttribute = (deviceKey: string, attribute: DeviceAttributeState) => {
      console.log(`New attribute: ${deviceKey}`);
    };

    const onNewAttributeData = (deviceKey: string, attribute: DeviceAttributeState) => {
      // console.log(`New attribute data: ${deviceKey}`);
      if (attribute.name === attributeName) {
        latencyTest.processAttrValues(attribute, Date.now());
        setStats(latencyTest.getLatencyStats());
      }
    };

    deviceManager.addNewDeviceCallback(onNewDevice);
    deviceManager.addNewAttributeCallback(onNewAttribute);
    deviceManager.addAttributeDataCallback(onNewAttributeData);

    // Cleanup callbacks when the component unmounts
    return () => {
      deviceManager.removeNewDeviceCallback(onNewDevice);
      deviceManager.removeNewAttributeCallback(onNewAttribute);
      deviceManager.removeAttributeDataCallback(onNewAttributeData);
    };
  }, [latencyTest, attributeName]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Toggle `isWhite` and record the color change
      setIsWhite((prevIsWhite) => {
        const newColor = !prevIsWhite ? 'white' : 'black';
        latencyTest.recordColorChange(newColor, new Date().getTime());
        return !prevIsWhite;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="info-boxes">
      <div className="info-box">
        <h3>Latency Stats</h3>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="latency-test-panel"
            style={{
              width: '200px',
              height: '150px',
              backgroundColor: isWhite ? '#fff' : '#000',
              border: '1px solid #666',
              borderRadius: '8px',
              marginRight: '20px',
            }}
          />
          <div>
            <div>Mean Latency: {stats.meanLatency ? `${stats.meanLatency.toFixed(1)} ms` : 'N/A'}</div>
            <div>Std Dev: {stats.stdDevLatency ? `${stats.stdDevLatency.toFixed(1)} ms` : 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatencyTestPanel;
