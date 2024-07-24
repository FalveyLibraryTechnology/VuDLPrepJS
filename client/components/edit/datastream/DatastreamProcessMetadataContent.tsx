import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import useDatastreamOperation from "../../../hooks/useDatastreamOperation";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useProcessMetadataContext } from "../../../context/ProcessMetadataContext";
import BlurSavingTextField from "../../shared/BlurSavingTextField";
import Grid from "@mui/material/Grid";
import DatastreamProcessMetadataTask from "./DatastreamProcessMetadataTask";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import { useEditorContext } from "../../../context/EditorContext";
import PidPicker from "../PidPicker";

// Whenever a task is added or removed, we need to revise the keys on the task
// components so that React renders correctly. This counter is incremented on each
// task add/remove, and used as part of the keys on related components.
let taskKeyGeneration = 0;

const DatastreamProcessMetadataContent = (): React.ReactElement => {
    const {
        action: { closeModal },
    } = useGlobalContext();
    const {
        state: processMetadata,
        action: {
            addTask,
            deleteTask,
            setMetadata,
            setProcessCreator,
            setProcessDateTime,
            setProcessLabel,
            setProcessOrganization,
            updateTaskAttributes,
        },
    } = useProcessMetadataContext();
    const {
        state: { objectDetailsStorage },
        action: { loadObjectDetailsIntoStorage },
    } = useEditorContext();
    const [loading, setLoading] = useState<boolean>(true);
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
    const { uploadProcessMetadata, getProcessMetadata } = useDatastreamOperation();
    const loadProcessMetadata = async (overridePid: string | null = null, force = false) => {
        const metadata = await getProcessMetadata(overridePid, force);
        setMetadata(metadata);
        if ((metadata.tasks ?? []).length == 0) {
            addTask(0);
        }
        setLoading(false);
    };
    const doClone = async () => {
        const details = objectDetailsStorage[clonePid] ?? {};
        if ((details?.datastreams ?? []).includes("PROCESS-MD")) {
            setLoading(true);
            await loadProcessMetadata(clonePid, true);
        } else {
            alert(`${clonePid} does not contain a PROCESS-MD datastream.`);
        }
        setTab(EDIT_TAB);
        setClonePid("");
    };
    useEffect(() => {
        loadProcessMetadata();
    }, []);
    const tasks = (processMetadata.tasks ?? []).map((task, i) => {
        const callback = (attributes: Record<string, string>, forceNewGeneration = false) => {
            updateTaskAttributes(i, attributes);
            if (forceNewGeneration) {
                taskKeyGeneration++;
            }
        };
        return (
            <DatastreamProcessMetadataTask
                key={`process_task_${taskKeyGeneration}_${i}`}
                addBelow={() => {
                    taskKeyGeneration++;
                    addTask(i + 1);
                }}
                deleteTask={() => {
                    taskKeyGeneration++;
                    deleteTask(i);
                }}
                setAttributes={callback}
                task={task}
            />
        );
    });
    return loading ? (
        <DialogContent>Loading...</DialogContent>
    ) : (
        <>
            <DialogContent>
                <FormControl style={{ marginBottom: "10px" }}>
                    <FormLabel>Digital Provenance</FormLabel>
                </FormControl>
                <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "1em" }}>
                    <Tabs value={tab} onChange={handleTabChange}>
                        <Tab label="Editor" />
                        <Tab label="Clone" />
                    </Tabs>
                </Box>
                <div style={{ display: tab == EDIT_TAB ? "block" : "none" }}>
                    <Grid container spacing={1} style={{ marginBottom: "10px" }}>
                        <Grid item xs={3}>
                            <FormControl fullWidth={true}>
                                <BlurSavingTextField
                                    options={{ label: "Process Label" }}
                                    value={processMetadata.processLabel ?? ""}
                                    setValue={setProcessLabel}
                                />
                            </FormControl>
                        </Grid>
                        <Grid item xs={3}>
                            <FormControl fullWidth={true}>
                                <BlurSavingTextField
                                    options={{ label: "Process Creator" }}
                                    value={processMetadata.processCreator ?? ""}
                                    setValue={setProcessCreator}
                                />
                            </FormControl>
                        </Grid>
                        <Grid item xs={3}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateTimePicker
                                    renderInput={(props) => <TextField {...props} />}
                                    label="Process Date/Time"
                                    value={processMetadata.processDateTime ?? ""}
                                    onChange={setProcessDateTime}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={3}>
                            <FormControl fullWidth={true}>
                                <BlurSavingTextField
                                    options={{ label: "Process Organization" }}
                                    value={processMetadata.processOrganization ?? ""}
                                    setValue={setProcessOrganization}
                                />
                            </FormControl>
                        </Grid>
                    </Grid>
                    {tasks.length > 0 ? tasks : <button onClick={() => addTask(0)}>Add Task</button>}
                </div>
                <div style={{ display: tab == CLONE_TAB ? "block" : "none" }}>
                    <div>
                        <PidPicker selected={clonePid} setSelected={loadClonePid} />
                    </div>
                    {clonePidLoaded ? <button onClick={doClone}>Clone</button> : null}
                </div>
            </DialogContent>

            <DialogActions>
                <Button
                    className="uploadProcessMetadataButton"
                    onClick={async () => {
                        await uploadProcessMetadata(processMetadata);
                    }}
                >
                    Save
                </Button>
                <Button onClick={() => closeModal("datastream")}>Cancel</Button>
            </DialogActions>
        </>
    );
};

export default DatastreamProcessMetadataContent;
