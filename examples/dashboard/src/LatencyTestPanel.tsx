// src/LatencyTestPanel.tsx
import React, { useEffect, useState } from 'react';
import './styles.css';
import ConnManager from "./ConnManager";
import LatencyTest from './LatencyTest';
import { DeviceAttributeState, DeviceState } from '../../../src/RaftDeviceStates';

const connManager = ConnManager.getInstance();

const LatencyTestPanel = () => {

  const latencyTest = LatencyTest.getInstance();
  const [stats, setStats] = useState(latencyTest.getLatencyStats());
  const [isWhite, setIsWhite] = useState<boolean>(true);

  useEffect(() => {
    const deviceManager = connManager.getConnector().getSystemType()?.deviceMgrIF;
    if (!deviceManager) {
      return;
    }

    // Arrow functions automatically bind `this` to the enclosing context
    const onNewDevice = (deviceKey: string, newDeviceState: DeviceState) => {
      console.log(`New device: ${deviceKey}`);
    };

    const onNewAttribute = (deviceKey: string, attribute: DeviceAttributeState) => {
      console.log(`New attribute: ${deviceKey}`);
    };

    const onNewAttributeData = (deviceKey: string, attribute: DeviceAttributeState) => {
      if (attribute.name === 'amb0') {
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
  }, [latencyTest]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsWhite((prev) => !prev);
    }, 2500);
    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  // Record color change
  latencyTest.recordColorChange(isWhite ? 'white' : 'black', new Date().getTime());

  return (
    <div className="info-boxes">
      <div className="info-box">
        <h3>Latency Stats</h3>
        <div
          className="latency-test-panel"
          style={{
            width: '200px',
            height: '150px',
            backgroundColor: isWhite ? '#fff' : '#000',
            border: '1px solid #666',
            borderRadius: '8px',
          }}
        />
        <div>Mean Latency: {stats.meanLatency ? `${stats.meanLatency.toFixed(1)} ms` : 'N/A'}</div>
        <div>Std Dev: {stats.stdDevLatency ? `${stats.stdDevLatency.toFixed(1)} ms` : 'N/A'}</div>
      </div>
    </div>
  );
};

export default LatencyTestPanel;
