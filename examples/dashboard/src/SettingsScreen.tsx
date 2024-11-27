// src/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import SettingsManager from './SettingsManager';
import ConnManager from './ConnManager';

const connManager = ConnManager.getInstance();

const SettingsScreen = ({ onBack }: { onBack: () => void }) => {
  const settingsManager = SettingsManager.getInstance();

  const [latencyTest, setLatencyTest] = useState<boolean>(
    settingsManager.getSetting('latencyTest')
  );
  const [showCharts, setShowCharts] = useState<boolean>(
    settingsManager.getSetting('showCharts')
  );
  const [maxChartDataPoints, setMaxChartDataPoints] = useState<number>(
    settingsManager.getSetting('maxChartDataPoints')
  );
  const [maxDatapointsToStore, setMaxDatapointsToStore] = useState<number>(
    settingsManager.getSetting('maxDatapointsToStore')
  );

  const handleSaveAndReturn = () => {
    // Save settings to SettingsManager
    settingsManager.setSetting('latencyTest', latencyTest);
    settingsManager.setSetting('showCharts', showCharts);
    settingsManager.setSetting('maxChartDataPoints', maxChartDataPoints);
    settingsManager.setSetting('maxDatapointsToStore', maxDatapointsToStore);

    // Log and update maxDatapointsToStore in DeviceManager
    console.log(
      `Set maxDatapointsToStore to ${maxDatapointsToStore} ` +
      `${connManager.getConnector().getSystemType()} ` +
      `${connManager.getConnector().getSystemType()?.deviceMgrIF}` +
      `${connManager.getConnector().getSystemType()?.deviceMgrIF?.setMaxDataPointsToStore}`
    );

    connManager.getConnector().getSystemType()?.deviceMgrIF?.setMaxDataPointsToStore(maxDatapointsToStore);

    // Call the onBack function
    onBack();
  };

  return (
    <div className="content-outer">
      <div className="header">
        <h1>RaftJS Dashboard Settings</h1>
      </div>
      <div className="content-body">
        <div className="info-boxes">
          <div className="info-box">

            <div className="settings-item">
              <label>
                <input
                  type="checkbox"
                  checked={latencyTest}
                  onChange={(e) => setLatencyTest(e.target.checked)}
                />
                Latency Test
              </label>
            </div>

            <div className="settings-item">
              <label>
                <input
                  type="checkbox"
                  checked={showCharts}
                  onChange={(e) => setShowCharts(e.target.checked)}
                />
                Show Charts
              </label>
            </div>

            <div className="settings-item">
              <label>
                Max Chart Points
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxChartDataPoints}
                  onChange={(e) => setMaxChartDataPoints(Math.min(parseInt(e.target.value, 10) || 1, 500))}
                  style={{ width: '50px', marginLeft: '10px' }}
                />
              </label>
            </div>

            <div className="settings-item">
              <label>
                Max Stored Points
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={maxDatapointsToStore}
                  onChange={(e) => setMaxDatapointsToStore(Math.min(parseInt(e.target.value, 10) || 1, 100000))}
                  style={{ width: '50px', marginLeft: '10px' }}
                />
              </label>
            </div>

            <button className="action-button" onClick={handleSaveAndReturn}>
              Save and Return
            </button>

            <button
              className="action-button"
              style={{ marginTop: '10px' }}
              onClick={() => {
                settingsManager.resetSettings();
                window.location.reload();
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
