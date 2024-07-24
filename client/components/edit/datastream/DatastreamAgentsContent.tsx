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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import PidPicker from "../PidPicker";

const DatastreamAgentsContent = (): React.ReactElement => {
    const {
        state: { agentsCatalog, currentAgents, objectDetailsStorage },
        action: { loadObjectDetailsIntoStorage, setCurrentAgents },
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
    const [clonePid, setClonePid] = useState("");
    const EDIT_TAB = 0;
    const CLONE_TAB = 1;
    const [tab, setTab] = useState<number>(EDIT_TAB);
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };
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

    const callGetAgents = async (overridePid: string | null = null, force = false) => {
        const currentAgents = await getAgents(overridePid, force);
        if (!currentAgents.length) {
            currentAgents.push({ role, type, name, notes: [] });
            setHasChanges(true);
        }
        setCurrentAgents(currentAgents);
        setIsLoading(false);
    };
    useEffect(() => {
        callGetAgents();
    }, []);
    const doClone = async () => {
        const details = objectDetailsStorage[clonePid] ?? {};
        if ((details?.datastreams ?? []).includes("AGENTS")) {
            setIsLoading(true);
            await callGetAgents(clonePid, true);
        } else {
            alert(`${clonePid} does not contain an AGENTS datastream.`);
        }
        setTab(EDIT_TAB);
        setClonePid("");
    };
    return (
        <>
            <DialogContent sx={{ width: "100%", minHeight: "50vh" }} ref={contentRef}>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "1em" }}>
                            <Tabs value={tab} onChange={handleTabChange}>
                                <Tab label="Editor" />
                                <Tab label="Clone" />
                            </Tabs>
                        </Box>
                        <div style={{ display: tab == EDIT_TAB ? "block" : "none" }}>
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
                        </div>
                        <div style={{ display: tab == CLONE_TAB ? "block" : "none" }}>
                            <div>
                                <PidPicker selected={clonePid} setSelected={loadClonePid} />
                            </div>
                            {clonePidLoaded ? <button onClick={doClone}>Clone</button> : null}
                        </div>
                    </>
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
