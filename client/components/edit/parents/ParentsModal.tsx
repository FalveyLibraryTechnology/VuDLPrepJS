import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useEditorContext } from "../../../context/EditorContext";
import ObjectLoader from "../ObjectLoader";
import ParentList from "./ParentList";
import ParentPicker from "./ParentPicker";

const ParentsModal = (): React.ReactElement => {
    const {
        action: { isModalOpen, closeModal },
    } = useGlobalContext();
    const {
        state: { parentsModalActivePid, objectDetailsStorage },
    } = useEditorContext();

    function closeParentModal() {
        closeModal("parents");
    }

    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, parentsModalActivePid);

    const contents = (
        <>
            <h3>Add New Parent:</h3>
            <ParentPicker pid={parentsModalActivePid} />
            <h3>Parents</h3>
            {parentsModalActivePid ? <ParentList pid={parentsModalActivePid} /> : ""}
        </>
    );
    return (
        <Dialog className="parentsModal" open={isModalOpen("parents")} onClose={closeParentModal} fullWidth={true}>
            <DialogTitle>
                <Grid container>
                    <Grid item xs={11}>
                        Parents Editor ({parentsModalActivePid})
                    </Grid>
                    <Grid item xs={1}>
                        <IconButton className="closeButton" onClick={closeParentModal}>
                            <CloseIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            </DialogTitle>
            <DialogContent>
                {parentsModalActivePid ? <ObjectLoader pid={parentsModalActivePid} /> : ""}
                {loaded ? contents : ""}
            </DialogContent>
        </Dialog>
    );
};

export default ParentsModal;
