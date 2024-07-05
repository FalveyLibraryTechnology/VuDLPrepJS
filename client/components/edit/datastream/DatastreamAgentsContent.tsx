import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Grid from "@mui/material/Grid";
import { useEditorContext } from "../../../context/EditorContext";
import { useGlobalContext } from "../../../context/GlobalContext";
import useDatastreamOperation from "../../../hooks/useDatastreamOperation";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import DatastreamAgentsAddContentRow from "./DatastreamAgentsAddContentRow";
import DatastreamAgentsModifyContentRow from "./DatastreamAgentsModifyContentRow";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const DatastreamAgentsContent = (): React.ReactElement => {
    const {
        state: { agentsCatalog, currentAgents },
        action: { setCurrentAgents },
    } = useEditorContext();
    const {
        action: { closeModal },
    } = useGlobalContext();
    const { uploadAgents, getAgents } = useDatastreamOperation();
    const {
        defaults: { role, type, name },
    } = agentsCatalog;
    const [addAgent, setAddAgent] = useState({
        role: "",
        type: "",
        name: "",
        notes: [],
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const canSave = currentAgents.every(({ role, type, name }) => {
        return role && type && name;
    });
    const canSaveAddAgent = addAgent.role && addAgent.type && addAgent.name;
    const saveCurrentAgents = async () => {
        setIsLoading(true);
        let agents = currentAgents;
        if (canSaveAddAgent) {
            agents = [...agents, addAgent];
            setAddAgent({
                role: "",
                type: "",
                name: "",
                notes: [],
            });
            setCurrentAgents(agents);
        }
        await uploadAgents(agents);
        setIsLoading(false);
    };
    const contentRef = useRef();

    useLayoutEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [contentRef]);

    useEffect(() => {
        const callGetAgents = async () => {
            const currentAgents = await getAgents();
            if (!currentAgents.length) {
                currentAgents.push({ role, type, name, notes: [] });
                setHasChanges(true);
            }
            setCurrentAgents(currentAgents);
            setIsLoading(false);
        };
        callGetAgents();
    }, []);
    return (
        <>
            <Grid container spacing={1} sx={{ padding: "20px 24px" }}>
                <Grid container item xs={3}>
                    Role
                </Grid>
                <Grid container item xs={3}>
                    Type
                </Grid>
                <Grid container item xs={5}>
                    Name
                </Grid>
                <Grid container item xs={1}>
                    Actions
                </Grid>
            </Grid>

            <DialogContent sx={{ width: "100%", minHeight: "50vh" }} ref={contentRef}>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={1}>
                        {currentAgents.map((agent, index) => {
                            return (
                                <DatastreamAgentsModifyContentRow
                                    key={index}
                                    agent={agent}
                                    index={index}
                                    setHasChanges={setHasChanges}
                                />
                            );
                        })}
                        <DatastreamAgentsAddContentRow
                            agent={addAgent}
                            setAgent={setAddAgent}
                            setHasChanges={setHasChanges}
                        />
                    </Grid>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ padding: "20px 24px" }}>
                <Grid container spacing={1} justifyContent="flex-end">
                    <Grid container item xs={6}>
                        {hasChanges && (
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    color: canSave ? "text.secondary" : "error.main",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                }}
                            >
                                {canSave
                                    ? "You possibly have unsaved changes. Please save them."
                                    : "Role, Type, or Name field from existing rows cannot be empty."}
                            </Typography>
                        )}
                    </Grid>
                    <Grid container item xs={6} justifyContent="flex-end">
                        {hasChanges && (
                            <Button
                                className="agentsSaveChangesButton"
                                disabled={!canSave}
                                onClick={async () => {
                                    await saveCurrentAgents();
                                    setHasChanges(false);
                                }}
                            >
                                Save Changes
                            </Button>
                        )}
                        {hasChanges && (
                            <Button
                                className="agentsSaveCloseButton"
                                disabled={!canSave}
                                onClick={async () => {
                                    await saveCurrentAgents();
                                    closeModal("datastream");
                                }}
                            >
                                Save And Close
                            </Button>
                        )}

                        <Button
                            className="agentsCancelButton"
                            onClick={async () => {
                                setCurrentAgents(await getAgents());
                                closeModal("datastream");
                            }}
                        >
                            Cancel
                        </Button>
                    </Grid>
                </Grid>
            </DialogActions>
        </>
    );
};

export default DatastreamAgentsContent;
