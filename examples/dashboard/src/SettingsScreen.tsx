// src/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import SettingsManager from './SettingsManager';

const SettingsScreen = ({ onBack }: { onBack: () => void }) => {
  const settingsManager = SettingsManager.getInstance();
  const [latencyTest, setLatencyTest] = useState<boolean>(
    settingsManager.getSetting('latencyTest')
  );

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setLatencyTest(isChecked);
    settingsManager.setSetting('latencyTest', isChecked);
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
            onChange={handleCheckboxChange}
          />
          Latency Test
        </label>
      </div>
      <button className="action-button" onClick={onBack}>
        Save and Return
      </button>
    </div>
    </div>
    </div>
    </div>
  );
};

export default SettingsScreen;
