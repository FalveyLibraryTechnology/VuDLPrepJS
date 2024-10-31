import React from "react";
import styles from "./ObjectStatus.module.css";

import { useGlobalContext } from "../../context/GlobalContext";
import { useEditorContext } from "../../context/EditorContext";
import ObjectLoader from "./ObjectLoader";

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ModeStandbyIcon from '@mui/icons-material/ModeStandby';

export interface ObjectStatusProps {
    pid: string;
}

function getStatusIcon(statusText: string) {
	switch (statusText) {
		case "Active":
			return <CheckCircleIcon></CheckCircleIcon>;
		case "Inactive":
			return <ModeStandbyIcon></ModeStandbyIcon>;

	}
	return <HelpOutlineIcon></HelpOutlineIcon>;
}
const statusIcons = {
	"Inactive": ModeStandbyIcon,
};

export const ObjectStatus = ({ pid }: ObjectStatusProps): React.ReactElement => {
    const {
        action: { openModal },
    } = useGlobalContext();
    const {
        state: { objectDetailsStorage },
        action: { setStateModalActivePid },
    } = useEditorContext();
    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, pid);
    const details = loaded ? objectDetailsStorage[pid] : {};

    const stateText = details.state ?? "Unknown";
    const clickAction = () => {
        setStateModalActivePid(pid);
        openModal("state");
    };
    const stateMsg = loaded ? (
        <button onClick={clickAction} className={styles[stateText.toLowerCase()]}>
            <span className={styles.indicator}>{getStatusIcon(stateText)}</span>&nbsp;
            {stateText}
        </button>
    ) : (
        ""
    );
    return (
        <>
            <ObjectLoader pid={pid} />
            {stateMsg}
        </>
    );
};

export default ObjectStatus;
