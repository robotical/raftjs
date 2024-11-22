// Component which uses the DeviceList component to display the list of devices

import React, { useEffect, useState } from 'react';
// import { DeviceAttributeState, DevicesState, DeviceState } from "../../../src/main";
// import { DeviceManager } from './DeviceManager';
// import DeviceScreen from './DeviceScreen';
import './styles.css';
import ConnManager from "./ConnManager";
import { DeviceAttributeState, DevicesState, DeviceState } from '../../../src/RaftDeviceStates';
import DevicePanel from './DevicePanel';

const connManager = ConnManager.getInstance();

export class DevicesPanelProps {
    constructor(
    ) { }
}

export default function DevicesPanel(props: DevicesPanelProps) {
    const [lastUpdated, setLastUpdated] = useState<number>(0);
    
    useEffect(() => {
        const deviceManager = connManager.getConnector().getSystemType()?.deviceMgrIF;
        if (!deviceManager) {
            return;
        }

        const onNewDevice = (deviceKey: string, newDeviceState: DeviceState) => {
            setLastUpdated(Date.now());
        };
        deviceManager.addNewDeviceCallback(onNewDevice);

        const onNewAttribute = (deviceKey: string, attribute: DeviceAttributeState) => {
            setLastUpdated(Date.now());
        }
        deviceManager.addNewAttributeCallback(onNewAttribute);

        const onNewAttributeData = (deviceKey: string, attribute: DeviceAttributeState) => {
            setLastUpdated(Date.now());
        }
        deviceManager.addAttributeDataCallback(onNewAttributeData);

    }, [lastUpdated]);

    const deviceManager = connManager.getConnector().getSystemType()?.deviceMgrIF;
    let devicesState: DevicesState = {};
    if (deviceManager) 
        devicesState = deviceManager.getDevicesState();
    
    return (
        <div className="devices-container">
        {Object.entries(devicesState).filter(([key, _]) => key !== 'getDeviceKey').map(([deviceKey, data]) => (
            <DevicePanel key={deviceKey} deviceKey={deviceKey} lastUpdated={lastUpdated} />
        ))}
      </div>
    );
}
