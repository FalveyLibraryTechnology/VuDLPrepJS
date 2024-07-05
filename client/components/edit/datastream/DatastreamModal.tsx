import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useEditorContext } from "../../../context/EditorContext";
import DatastreamUploadModalContent from "./DatastreamUploadModalContent";
import DatastreamDeleteModalContent from "./DatastreamDeleteModalContent";
import DatastreamViewModalContent from "./DatastreamViewModalContent";
import DatastreamMetadataModalContent from "./DatastreamMetadataModalContent";

const contentMapping = {
    Upload: <DatastreamUploadModalContent />,
    View: <DatastreamViewModalContent />,
    Metadata: <DatastreamMetadataModalContent />,
    Delete: <DatastreamDeleteModalContent />,
};

const DatastreamModalContent = ({ datastreamModalState }: { datastreamModalState: string }) => {
    return datastreamModalState ? contentMapping[datastreamModalState] : null;
};

const DatastreamModal = (): React.ReactElement => {
    const {
        state: { datastreamModalState },
    } = useEditorContext();
    const {
        action: { closeModal, isModalOpen },
    } = useGlobalContext();

    return (
        <Dialog
            className="datastreamModal"
            open={isModalOpen("datastream")}
            onClose={() => closeModal("datastream")}
            fullWidth={true}
            maxWidth={"lg"}
        >
            <DialogTitle>
                <Grid container>
                    <Grid item xs={11}>
                        {datastreamModalState}
                    </Grid>
                    <Grid item xs={1} display="flex" justifyContent="flex-end">
                        <IconButton className="closeButton" onClick={() => closeModal("datastream")}>
                            <CloseIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            </DialogTitle>
            <DatastreamModalContent datastreamModalState={datastreamModalState} />
        </Dialog>
    );
};

export default DatastreamModal;
