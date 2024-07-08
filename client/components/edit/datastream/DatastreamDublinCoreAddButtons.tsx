import React, { useState } from "react";
import { useEditorContext } from "../../../context/EditorContext";
import { useDublinCoreMetadataContext } from "../../../context/DublinCoreMetadataContext";
import PidPicker from "../PidPicker";

const DatastreamDublinCoreAddButtons = (): React.ReactElement => {
    const {
        state: { currentPid, dublinCoreFieldCatalog, objectDetailsStorage, parentDetailsStorage },
        action: { loadObjectDetailsIntoStorage },
    } = useEditorContext();
    const {
        action: { addValueAbove, mergeValues },
    } = useDublinCoreMetadataContext();
    const [clonePid, setClonePid] = useState("");
    const clonePidLoaded = clonePid.length > 0 && Object.prototype.hasOwnProperty.call(objectDetailsStorage, clonePid);
    const loadClonePid = async (newClonePid: string) => {
        if (newClonePid.length == 0) {
            setClonePid("");
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(objectDetailsStorage, newClonePid)) {
            let error = false;
            const errorCallback = () => {
                error = true;
            };
            await loadObjectDetailsIntoStorage(newClonePid, errorCallback);
            if (error) {
                alert(`Cannot load PID: ${newClonePid}`);
                return;
            }
        }
        setClonePid(newClonePid);
    };
    const buttons = [];
    for (const key in dublinCoreFieldCatalog) {
        const current = dublinCoreFieldCatalog[key];
        // Don't add fields we're not allowed to edit:
        if (current.type !== "locked") {
            buttons.push(
                <button key={"dcadd_" + key.replace(":", "_")} onClick={() => addValueAbove(key, 0, "")}>
                    {current.label}
                </button>,
            );
        }
    }
    const doClone = async () => {
        const details = objectDetailsStorage[clonePid] ?? {};
        const metadata = details.metadata ?? {};
        for (const field in metadata) {
            // Filter out locked fields.
            if (dublinCoreFieldCatalog[field].type === "locked") {
                delete metadata[field];
            }
        }
        mergeValues(metadata);
        setClonePid("");
    };
    const getImmediateParents = () => {
        const dataForPid = parentDetailsStorage?.[currentPid] ?? {};
        return dataForPid?.shallow?.parents ?? dataForPid?.full?.parents ?? [];
    };
    getImmediateParents();
    return (
        <>
            <h3>Add Blank Field:</h3>
            {buttons}
            <h3>Clone Metadata:</h3>
            <PidPicker selected={clonePid} setSelected={loadClonePid} parents={getImmediateParents()} />
            {clonePidLoaded ? <button onClick={doClone}>Clone</button> : null}
        </>
    );
};

export default DatastreamDublinCoreAddButtons;
