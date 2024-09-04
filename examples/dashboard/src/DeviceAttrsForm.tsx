import React from 'react';
import { deviceAttrGetLatestFormatted, DeviceState } from '../../../src/RaftDeviceStates';
import ConnManager from './ConnManager';

const connManager = ConnManager.getInstance();

type DeviceAttributesTableProps = {
    deviceKey: string;
    lastUpdated: number;
};

const DeviceAttrsForm: React.FC<DeviceAttributesTableProps> = ({ deviceKey, lastUpdated }) => {
    const deviceManager = connManager.getConnector().getSystemType()?.deviceMgrIF;
    const deviceState: DeviceState | undefined = deviceManager?.getDeviceState(deviceKey);

    if (!deviceState || Object.keys(deviceState.deviceAttributes).length === 0) {
        return <></>;
    }

    return (
        <div className="device-attrs-form">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Value</th>
                        <th>Units</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(deviceState.deviceAttributes)
                        .filter(([attributeName, attributeDetails]) => attributeDetails.visibleForm !== false)
                        .map(([attributeName, attributeDetails]) => {
                            const valStr = deviceAttrGetLatestFormatted(attributeDetails)
                            return (
                                <tr key={attributeName}>
                                    <td>{attributeName}</td>
                                    <td>{valStr}</td>
                                    <td>{attributeDetails.units}</td>
                                </tr>
                            );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default DeviceAttrsForm;
