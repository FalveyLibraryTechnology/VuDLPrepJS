import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Grid from "@mui/material/Grid";
import { useEditorContext } from "../../../context/EditorContext";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useDublinCoreMetadataContext } from "../../../context/DublinCoreMetadataContext";
import useDatastreamOperation from "../../../hooks/useDatastreamOperation";
import DatastreamDublinCoreValues from "./DatastreamDublinCoreValues";
import DatastreamDublinCoreAddButtons from "./DatastreamDublinCoreAddButtons";
import ObjectPreviewButton from "../ObjectPreviewButton";

const DatastreamDublinCoreContent = (): React.ReactElement => {
    const {
        state: { currentPid, objectDetailsStorage },
    } = useEditorContext();
    const {
        action: { closeModal },
    } = useGlobalContext();
    const {
        state: { currentDublinCore },
        action: { setCurrentDublinCore },
    } = useDublinCoreMetadataContext();
    const { uploadDublinCore } = useDatastreamOperation();
    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, currentPid);
    useEffect(() => {
        if (loaded) {
            // Make a deep clone of the metadata; we don't want to modify anything by reference!
            setCurrentDublinCore(JSON.parse(JSON.stringify(objectDetailsStorage[currentPid].metadata ?? {})));
        }
    }, [loaded]);

    return (
        <>
            <DialogContent>
                <Grid container spacing={1}>
                    <Grid item xs={8}>
                        <DatastreamDublinCoreValues />
                    </Grid>
                    <Grid item xs={4}>
                        <DatastreamDublinCoreAddButtons />
                        <h3>Other Tools</h3>
                        <ObjectPreviewButton pid={currentPid} />
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button
                    className="uploadDublinCoreButton"
                    onClick={async () => {
                        await uploadDublinCore(currentDublinCore);
                    }}
                >
                    Save
                </Button>
                <Button onClick={() => closeModal("datastream")}>Cancel</Button>
            </DialogActions>
        </>
    );
};

export default DatastreamDublinCoreContent;
