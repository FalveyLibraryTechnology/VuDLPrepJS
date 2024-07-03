import React, { createContext, useContext, useReducer, Dispatch, ReactNode } from "react";

interface SnackbarState {
    open: boolean,
    message: string,
    severity: string
}

interface GlobalState {
    // Modal control
    modalOpenStates: Record<string, boolean>;
    // Snackbar
    snackbarState: SnackbarState;
}

/**
 * Pass a shared entity to react components,
 * specifically a way to make api requests.
 */
const initalGlobalState: GlobalState = {
    // Modal control
    modalOpenStates: {},
    // Snackbar
    snackbarState: {
        open: false,
        message: "",
        severity: "info",
    },
};

type Action =
    | { type: 'OPEN_MODAL'; payload: string }
    | { type: 'CLOSE_MODAL'; payload: string }
    | { type: 'SET_SNACKBAR_STATE'; payload: SnackbarState };

/**
 * Update the shared states of react components.
 */
const globalReducer = (state: GlobalState, action: Action): GlobalState => {
    switch (action.type) {
        case 'OPEN_MODAL':
            return {
                ...state,
                modalOpenStates: {
                    ...state.modalOpenStates,
                    [action.payload]: true,
                },
            };
        case 'CLOSE_MODAL':
            return {
                ...state,
                modalOpenStates: {
                    ...state.modalOpenStates,
                    [action.payload]: false,
                },
            };
        case 'SET_SNACKBAR_STATE':
            return {
                ...state,
                snackbarState: action.payload,
            };
        default:
            return state;
    }
};

/**
 * Context to provide global state and dispatch function.
 */
interface GlobalContextProps {
    state: GlobalState;
    dispatch: Dispatch<Action>;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

/**
 * GlobalContextProvider to wrap around the application.
 */
export const GlobalContextProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(globalReducer, initalGlobalState);
    return (
        <GlobalContext.Provider value={{ state, dispatch }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);

    if (!context) {
        throw new Error("useGlobalContext must be used within a GlobalContextProvider");
    }

    const { state, dispatch } = context;

    // Modal control

    const isModalOpen = (modal: string) => state.modalOpenStates[modal] ?? false;
    const openModal = (modal: string) => {
        dispatch({
            type: "OPEN_MODAL",
            payload: modal
        });
    };
    const closeModal = (modal: string) => {
        dispatch({
            type: "CLOSE_MODAL",
            payload: modal
        });
    };
    const toggleModal = (modal: string) => {
        if (isModalOpen(modal)) {
            closeModal(modal);
        } else {
            openModal(modal);
        }
    };

    // Snackbar

    const setSnackbarState = (snackbarState: SnackbarState) => {
        dispatch({
            type: "SET_SNACKBAR_STATE",
            payload: snackbarState
        });
    };

    return {
        state: {
            // only return limited state
            // to create "private" attributes
            snackbarState: state.snackbarState,
        },
        action: {
            // Modal control
            isModalOpen,
            openModal,
            closeModal,
            toggleModal,
            // Snackbar
            setSnackbarState,
        },
    };
}

export default {
    GlobalContextProvider,
    useGlobalContext
}
