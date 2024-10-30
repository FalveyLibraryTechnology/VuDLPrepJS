import styles from "./ObjectStatus.module.css";
import React from "react";
import { useGlobalContext } from "../../context/GlobalContext";
import { useEditorContext } from "../../context/EditorContext";
import ObjectLoader from "./ObjectLoader";

export interface ObjectStatusProps {
    pid: string;
}

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

    const stateTxt = details.state ?? "Unknown";
    const clickAction = () => {
        setStateModalActivePid(pid);
        openModal("state");
    };
    const stateMsg = loaded ? (
        <button onClick={clickAction} className={styles[stateTxt.toLowerCase()]}>
            <span className={styles.indicator}>&#9673;</span>&nbsp;
            <span className={styles.indicator__label}>{stateTxt}</span>
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
