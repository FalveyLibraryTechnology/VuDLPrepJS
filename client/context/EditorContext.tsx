import React, { createContext, useContext, useReducer } from "react";
import { editObjectCatalogUrl, getObjectChildrenUrl, getObjectDetailsUrl, getObjectParentsUrl } from "../util/routes";
import { useFetchContext } from "./FetchContext";
import { extractFirstMetadataValue as utilExtractFirstMetadataValue } from "../util/metadata";
import { TreeNode } from "../util/Breadcrumbs";

export interface ObjectDetails {
    fedoraDatastreams: Array<string>;
    metadata: Record<string, Array<string>>;
    models: Array<string>;
    pid: string;
    sortOn: string;
    state: string;
};

interface ChildrenResultPage {
    numFound?: number;
    start?: number;
    docs?: Record<string, string|string[]>[];
}

export interface FedoraDatastream {
    mimetype?: {
        allowedType: string;
        allowedSubtypes: string;
    };
}

export interface FedoraModel {
    datastreams?: Record<string, FedoraDatastream>;
}

export interface License {
    name: string;
    uri: string;
}

interface EditorState {
    modelsCatalog: Record<string, FedoraModel>;
    licensesCatalog: Record<string, License>;
    agentsCatalog: Record<string, Object>;
    dublinCoreFieldCatalog: Record<string, Record<string, string>>;
    favoritePidsCatalog: Record<string, string>;
    processMetadataDefaults: Record<string, string>;
    toolPresets: Array<Record<string, string>>;
    vufindUrl: string;
    currentAgents: Array<Object>;
    currentPid: string | null;
    activeDatastream: string | null;
    isDatastreamModalOpen: boolean;
    isParentsModalOpen: boolean;
    isStateModalOpen: boolean;
    datastreamModalState: string | null;
    parentsModalActivePid: string | null;
    stateModalActivePid: string | null;
    objectDetailsStorage: Record<string, ObjectDetails>;
    parentDetailsStorage: Record<string, Record<string, TreeNode>>;
    childListStorage: Record<string, ChildrenResultPage>;
    topLevelPids: Array<string>;
}

/**
 * Pass a shared entity to react components,
 * specifically a way to make api requests.
 */
const editorContextParams: EditorState = {
    modelsCatalog: {},
    licensesCatalog: {},
    agentsCatalog: {},
    dublinCoreFieldCatalog: {},
    favoritePidsCatalog: {},
    processMetadataDefaults: {},
    toolPresets: [],
    vufindUrl: "",
    currentAgents: [],
    currentPid: null,
    activeDatastream: null,
    isDatastreamModalOpen: false,
    isParentsModalOpen: false,
    isStateModalOpen: false,
    datastreamModalState: null,
    parentsModalActivePid: null,
    stateModalActivePid: null,
    objectDetailsStorage: {},
    parentDetailsStorage: {},
    childListStorage: {},
    topLevelPids: [],
};

export const DatastreamModalStates = {
    UPLOAD: "Upload",
    VIEW: "View",
    METADATA: "Metadata",
    DOWNLOAD: "Download",
    DELETE: "Delete"
};


const EditorContext = createContext({});

const reducerMapping: Record<string, string> = {
    SET_AGENTS_CATALOG: "agentsCatalog",
    SET_DUBLIN_CORE_FIELD_CATALOG: "dublinCoreFieldCatalog",
    SET_FAVORITE_PIDS_CATALOG: "favoritePidsCatalog",
    SET_PROCESS_METADATA_DEFAULTS: "processMetadataDefaults",
    SET_TOOL_PRESETS: "toolPresets",
    SET_VUFIND_URL: "vufindUrl",
    SET_LICENSES_CATALOG: "licensesCatalog",
    SET_MODELS_CATALOG: "modelsCatalog",
    SET_CURRENT_AGENTS: "currentAgents",
    SET_CURRENT_PID: "currentPid",
    SET_ACTIVE_DATASTREAM: "activeDatastream",
    SET_IS_DATASTREAM_MODAL_OPEN: "isDatastreamModalOpen",
    SET_IS_PARENTS_MODAL_OPEN: "isParentsModalOpen",
    SET_IS_STATE_MODAL_OPEN: "isStateModalOpen",
    SET_DATASTREAM_MODAL_STATE: "datastreamModalState",
    SET_PARENTS_MODAL_ACTIVE_PID: "parentsModalActivePid",
    SET_STATE_MODAL_ACTIVE_PID: "stateModalActivePid",
    SET_TOP_LEVEL_PIDS: "topLevelPids",
};

/**
 * Update the shared states of react components.
 */
const editorReducer = (state: EditorState, { type, payload }: { type: string, payload: unknown}) => {
    if (type === "ADD_TO_OBJECT_DETAILS_STORAGE") {
        const { key, details } = payload as { key: string; details: ObjectDetails };
        const objectDetailsStorage = {
            ...state.objectDetailsStorage,
        };
        objectDetailsStorage[key] = details;
        return {
            ...state,
            objectDetailsStorage
        };
    } else if (type === "REMOVE_FROM_OBJECT_DETAILS_STORAGE") {
        const { key } = payload as { key: string };
        const objectDetailsStorage = {
            ...state.objectDetailsStorage,
        };
        delete objectDetailsStorage[key];
        return {
            ...state,
            objectDetailsStorage
        };
    } else if (type === "ADD_TO_PARENT_DETAILS_STORAGE") {
        const { shallow, key, details } = payload as { shallow: boolean; key: string; details: TreeNode };
        const parentDetailsStorage = {
            ...state.parentDetailsStorage,
        };
        parentDetailsStorage[key] = {
            ...state.parentDetailsStorage[key],
            [shallow ? "shallow" : "full"]: details,
        };
        return {
            ...state,
            parentDetailsStorage
        };
    } else if (type === "REMOVE_FROM_PARENT_DETAILS_STORAGE") {
        const { key } = payload as { key: string };
        const parentDetailsStorage = {
            ...state.parentDetailsStorage,
        };
        delete parentDetailsStorage[key];
        return {
            ...state,
            parentDetailsStorage
        };
    } else if (type === "ADD_TO_CHILD_LIST_STORAGE") {
        const { key, children } = payload as { key: string; children: ChildrenResultPage };
        const childListStorage = {
            ...state.childListStorage,
        };
        childListStorage[key] = children;
        return {
            ...state,
            childListStorage
        };
    } else if (type === "CLEAR_PID_FROM_CHILD_LIST_STORAGE") {
        const { pid } = payload as { pid: string };
        const childListStorage: Record<string, ChildrenResultPage> = {};
        for (const key in state.childListStorage) {
            if (!key.startsWith(pid + "_")) {
                childListStorage[key] = state.childListStorage[key];
            }
        }
        return {
            ...state,
            childListStorage
        };
    } else if(Object.keys(reducerMapping).includes(type)){
        return {
            ...state,
            [reducerMapping[type]]: payload
        };
    } else {
        console.error(`fetch action type: ${type} does not exist`);
        return state;
    }
};

export const EditorContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(editorReducer, editorContextParams);
    const value = { state, dispatch };
    return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
    const {
        action: {
            fetchJSON
        }
    }= useFetchContext();
    const {
        state: {
            currentAgents,
            currentPid,
            activeDatastream,
            datastreamModalState,
            parentsModalActivePid,
            stateModalActivePid,
            agentsCatalog,
            dublinCoreFieldCatalog,
            favoritePidsCatalog,
            processMetadataDefaults,
            toolPresets,
            vufindUrl,
            licensesCatalog,
            modelsCatalog,
            objectDetailsStorage,
            parentDetailsStorage,
            childListStorage,
            topLevelPids,
        },
        dispatch,
    } = useContext(EditorContext);

    const currentDatastreams = objectDetailsStorage?.[currentPid]?.datastreams ?? [];
    const currentModels = objectDetailsStorage?.[currentPid]?.models ?? [];
    const modelsDatastreams = currentModels.reduce((acc: Array<string>, model: string) => {
        const name = model.split(":")?.[1];
        return [
            ...acc,
            ...(name && modelsCatalog.hasOwnProperty(name) ? Object.keys(modelsCatalog[name].datastreams) : [])
        ];
    }, []).map((stream: string) => {
        return {
            disabled: !currentDatastreams.includes(stream),
            stream
        };
    });

    const addToObjectDetailsStorage = (key: string, details: ObjectDetails) => {
        dispatch({
            type: "ADD_TO_OBJECT_DETAILS_STORAGE",
            payload: { key, details },
        });
    };

    const removeFromObjectDetailsStorage = (key: string) => {
        dispatch({
            type: "REMOVE_FROM_OBJECT_DETAILS_STORAGE",
            payload: { key },
        });
    };

    const addToParentDetailsStorage = (key: string, details: TreeNode, shallow = false) => {
        dispatch({
            type: "ADD_TO_PARENT_DETAILS_STORAGE",
            payload: { shallow, key, details },
        });
    };

    const removeFromParentDetailsStorage = (key: string) => {
        dispatch({
            type: "REMOVE_FROM_PARENT_DETAILS_STORAGE",
            payload: { key },
        });
    };

    const setCurrentAgents = (currentAgents) => {
        dispatch({
            type: "SET_CURRENT_AGENTS",
            payload: currentAgents
        });
    };

    const setAgentsCatalog = (agentsCatalog) => {
        dispatch({
            type: "SET_AGENTS_CATALOG",
            payload: agentsCatalog
        });
    };

    const setDublinCoreFieldCatalog = (dcCatalog: Record<string, Record<string, string>>) => {
        dispatch({
            type: "SET_DUBLIN_CORE_FIELD_CATALOG",
            payload: dcCatalog
        });
    };

    const setTopLevelPids = (pids: Array<string>) => {
        dispatch({
            type: "SET_TOP_LEVEL_PIDS",
            payload: pids
        });
    };

    const addToChildListStorage = (key: string, children: ChildrenResultPage) => {
        dispatch({
            type: "ADD_TO_CHILD_LIST_STORAGE",
            payload: { key, children },
        });
    };

    const getChildListStorageKey = (pid: string, page: number, pageSize: number): string => {
        return `${pid}_${page}_${pageSize}`;
    };

    const loadObjectDetailsIntoStorage = async (pid: string, errorCallback: ((pid: string) => void) | null = null) => {
        // Ignore null values:
        if (pid === null) {
            return;
        }
        const url = getObjectDetailsUrl(pid);
        try {
            addToObjectDetailsStorage(pid, await fetchJSON(url));
        } catch (e) {
            if (errorCallback) {
                errorCallback(pid);
            }
            console.error("Problem fetching details from " + url);
        }
    };

    const loadParentDetailsIntoStorage = async (pid: string, shallow = false, errorCallback: ((pid: string) => void) | null = null) => {
        // Ignore null values:
        if (pid === null) {
            return;
        }
        const url = getObjectParentsUrl(pid, shallow);
        try {
            addToParentDetailsStorage(pid, await fetchJSON(url), shallow);
        } catch (e) {
            if (errorCallback) {
                errorCallback(pid);
            }
            console.error("Problem fetching parent details from " + url);
        }
    };

    const clearPidFromChildListStorage = (pid: string) => {
        dispatch({
            type: "CLEAR_PID_FROM_CHILD_LIST_STORAGE",
            payload: { pid },
        });
    }

    const loadChildrenIntoStorage = async (pid: string, page: number, pageSize: number) => {
        const key = getChildListStorageKey(pid, page, pageSize);
        const url = getObjectChildrenUrl(pid, (page - 1) * pageSize, pageSize);
        try {
            addToChildListStorage(key, await fetchJSON(url));
        } catch (e) {
            console.error("Problem fetching tree data from " + url);
        }
    };

    const setFavoritePidsCatalog = (favoritePidsCatalog: Record<string, string>) => {
        dispatch({
            type: "SET_FAVORITE_PIDS_CATALOG",
            payload: favoritePidsCatalog
        });
    }

    const setProcessMetadataDefaults = (defaults: Record<string, string>) => {
        dispatch({
            type: "SET_PROCESS_METADATA_DEFAULTS",
            payload: defaults
        });
    }

    const setToolPresets = (toolPresets: Array<Record<string, string>>) => {
        dispatch({
            type: "SET_TOOL_PRESETS",
            payload: toolPresets
        });
    }

    const setVuFindUrl = (url: string) => {
        dispatch({
            type: "SET_VUFIND_URL",
            payload: url
        });
    };

    const setModelsCatalog = (modelsCatalog: Record<string, FedoraModel>) => {
        dispatch({
            type: "SET_MODELS_CATALOG",
            payload: modelsCatalog
        });
    };

    const setLicensesCatalog = (licensesCatalog: Record<string, License>) => {
        dispatch({
            type: "SET_LICENSES_CATALOG",
            payload: licensesCatalog
        });
    };

    const setCurrentPid = (pid: string) => {
        dispatch({
            type: "SET_CURRENT_PID",
            payload: pid
        });
    };

    const setDatastreamModalState = (datastreamModalState: boolean) => {
        dispatch({
            type: "SET_DATASTREAM_MODAL_STATE",
            payload: datastreamModalState
        });
    };

    const setParentsModalActivePid = (pid: string) => {
        dispatch({
            type: "SET_PARENTS_MODAL_ACTIVE_PID",
            payload: pid
        });
    };

    const setStateModalActivePid = (pid: string) => {
        dispatch({
            type: "SET_STATE_MODAL_ACTIVE_PID",
            payload: pid
        });
    };

    const setActiveDatastream = (datastream: string) => {
        dispatch({
            type: "SET_ACTIVE_DATASTREAM",
            payload: datastream
        })
    };

    const datastreamsCatalog = Object.values(modelsCatalog).reduce((acc: Record<string, FedoraDatastream>, model) => {
        return {
            ...acc,
            ...(model as FedoraModel).datastreams
        };
    }, {});

    const initializeCatalog = async () => {
        try {
            const response = await fetchJSON(editObjectCatalogUrl);
            setModelsCatalog(response.models || {});
            setLicensesCatalog(response.licenses || {});
            setFavoritePidsCatalog(response.favoritePids || {});
            setToolPresets(response.toolPresets || []);
            setProcessMetadataDefaults(response.processMetadataDefaults || {});
            setAgentsCatalog(response.agents || {});
            setDublinCoreFieldCatalog(response.dublinCoreFields || {});
            setTopLevelPids(response.topLevelPids || []);
            setVuFindUrl(response.vufindUrl ?? "");
        } catch(err) {
            console.error(`Problem fetching object catalog from ${editObjectCatalogUrl}`);
        }
    };

    const loadCurrentObjectDetails = async (errorCallback: ((pid: string) => void) | null = null) => {
        return await loadObjectDetailsIntoStorage(currentPid, errorCallback);
    };

    const extractFirstMetadataValue = function (field: string, defaultValue: string): string {
        const currentMetadata = objectDetailsStorage?.[currentPid]?.metadata ?? {};
        return utilExtractFirstMetadataValue(currentMetadata, field, defaultValue);
    }

    return {
        state: {
            currentAgents,
            currentPid,
            currentDatastreams,
            activeDatastream,
            datastreamModalState,
            parentsModalActivePid,
            stateModalActivePid,
            datastreamsCatalog,
            modelsDatastreams,
            agentsCatalog,
            dublinCoreFieldCatalog,
            favoritePidsCatalog,
            processMetadataDefaults,
            toolPresets,
            vufindUrl,
            modelsCatalog,
            licensesCatalog,
            objectDetailsStorage,
            parentDetailsStorage,
            childListStorage,
            topLevelPids,
        },
        action: {
            initializeCatalog,
            setCurrentAgents,
            setCurrentPid,
            loadCurrentObjectDetails,
            setActiveDatastream,
            setDatastreamModalState,
            setParentsModalActivePid,
            setStateModalActivePid,
            extractFirstMetadataValue,
            getChildListStorageKey,
            loadObjectDetailsIntoStorage,
            loadParentDetailsIntoStorage,
            loadChildrenIntoStorage,
            removeFromObjectDetailsStorage,
            removeFromParentDetailsStorage,
            clearPidFromChildListStorage,
        },
    };
}

export default {
    EditorContextProvider,
    DatastreamModalStates,
    useEditorContext
}