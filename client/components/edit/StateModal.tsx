import React, { useEffect, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useGlobalContext } from "../../context/GlobalContext";
import { useEditorContext } from "../../context/EditorContext";
import { getObjectRecursiveChildPidsUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
import ObjectLoader from "./ObjectLoader";

const StateModal = (): React.ReactElement => {
    const {
        action: { closeModal, isModalOpen, setSnackbarState },
    } = useGlobalContext();
    const {
        state: { objectDetailsStorage, stateModalActivePid },
        action: { updateObjectState },
    } = useEditorContext();
    const {
        action: { fetchJSON },
    } = useFetchContext();

    function closeStateModal() {
        closeModal("state");
    }

    const [statusMessage, setStatusMessage] = useState<string>("");
    const [includeChildren, setIncludeChildren] = useState<boolean>(false);
    const [selectedValue, setSelectedValue] = useState<string>("Inactive");
    const [childPidResponse, setChildPidResponse] = useState({ loading: true });
    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, stateModalActivePid);
    const details = loaded ? objectDetailsStorage[stateModalActivePid] : {};
    useEffect(() => {
        async function loadChildren() {
            setChildPidResponse({ loading: true });
            setIncludeChildren(false);
            const url = getObjectRecursiveChildPidsUrl(details.pid, 0, 0);
            const response = await fetchJSON(url);
            setChildPidResponse(response);
        }
        setSelectedValue(details.state ?? "Inactive");
        if (details.pid ?? false) {
            loadChildren();
        }
    }, [details]);

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedValue(event.target.value);
    };

    const handleChildCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIncludeChildren(event.target.checked);
    };

    const showSnackbarMessage = (message: string, severity: string) => {
        setSnackbarState({
            open: true,
            message,
            severity,
        });
    };

    const save = async () => {
        if (selectedValue !== details.state) {
            try {
                const result = await updateObjectState(
                    stateModalActivePid,
                    selectedValue,
                    includeChildren ? childPidResponse.numFound : 0,
                    setStatusMessage,
                );
                showSnackbarMessage(...result);
            } catch (e) {
                showSnackbarMessage(e.message, "error");
            }
            closeStateModal();
            setStatusMessage("");
        } else {
            showSnackbarMessage("No changes were made.", "info");
        }
    };

    let childrenCheckbox = null;
    if (childPidResponse.loading ?? false) {
        childrenCheckbox = <p>Loading...</p>;
    } else if ((childPidResponse.numFound ?? 0) > 0) {
        const checkboxLabel = `Update ${childPidResponse.numFound} children to match`;
        const checkbox = <Checkbox checked={includeChildren} onChange={handleChildCheckboxChange} />;
        childrenCheckbox = (
            <FormControl>
                <FormControlLabel value={checkboxLabel} control={checkbox} label={checkboxLabel} />
            </FormControl>
        );
    }

    const contents =
        statusMessage.length > 0 ? (
            <p>{statusMessage}</p>
        ) : (
            <Grid container>
                <Grid item xs={12}>
                    <FormControl>
                        <FormLabel id="state-modal-group-label">State</FormLabel>
                        <RadioGroup
                            aria-labelledby="state-modal-group-label"
                            value={selectedValue}
                            name="state-modal-group"
                            onChange={handleRadioChange}
                        >
                            <FormControlLabel value="Active" control={<Radio />} label="Active" />
                            <FormControlLabel value="Inactive" control={<Radio />} label="Inactive" />
                            <FormControlLabel value="Deleted" control={<Radio />} label="Deleted" />
                        </RadioGroup>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    {childrenCheckbox}
                </Grid>
                <Grid item xs={12}>
                    <button onClick={save}>Save</button>
                </Grid>
            </Grid>
        );
    return (
        <Dialog className="stateModal" open={isModalOpen("state")} onClose={closeStateModal} fullWidth={true}>
            <DialogTitle>
                <Grid container>
                    <Grid item xs={11}>
                        State Editor ({stateModalActivePid})
                    </Grid>
                    <Grid item xs={1}>
                        <IconButton className="closeButton" onClick={closeStateModal}>
                            <CloseIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            </DialogTitle>
            <DialogContent>
                {stateModalActivePid ? <ObjectLoader pid={stateModalActivePid} /> : ""}
                {contents}
            </DialogContent>
        </Dialog>
    );
};

export default StateModal;
