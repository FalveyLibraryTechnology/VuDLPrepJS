import React, { createContext, useContext, useReducer, Dispatch, ReactNode } from "react";

interface SnackbarState {
    open: boolean,
    message: string,
    severity: string
}


export enum ThemeOption {
    system = "system",
    light = "light",
    dark = "dark",
};

interface GlobalState {
    // Modal control
    modalOpenStates: Record<string, boolean>;
    // Snackbar
    snackbarState: SnackbarState;
    // User theme
    userTheme: ThemeOption,
}

/**
 * Pass a shared entity to react components,
 * specifically a way to make api requests.
 */
const initialGlobalState: GlobalState = {
    // Modal control
    modalOpenStates: {},
    // Snackbar
    snackbarState: {
        open: false,
        message: "",
        severity: "info",
    },
    // User theme
    userTheme: localLoadUserTheme(),
};

type Action =
    | { type: 'OPEN_MODAL'; payload: string }
    | { type: 'CLOSE_MODAL'; payload: string }
    | { type: 'SET_SNACKBAR_STATE'; payload: SnackbarState }
    | { type: 'SET_USER_THEME'; payload: ThemeOption };

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
    const [state, dispatch] = useReducer(globalReducer, initialGlobalState);
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

    // User theme

    const setUserTheme = (userTheme: ThemeOption) => {
        localSaveUserTheme(userTheme);
        applyUserThemeToBody(userTheme);
        dispatch({
            type: "SET_USER_THEME",
            payload: userTheme,
        });
    };

    return {
        state: {
            // only return limited state
            // to create "private" attributes
            snackbarState: state.snackbarState,
            userTheme: state.userTheme,
        },
        action: {
            // Modal control
            isModalOpen,
            openModal,
            closeModal,
            toggleModal,
            // Snackbar
            setSnackbarState,
            // User theme
            setUserTheme,
        },
    };
}

export default {
    GlobalContextProvider,
    useGlobalContext
}

/* User Theme */

// Get system theme from CSS media queries
function systemTheme(): ThemeOption {
    let defaultTheme = "light" as ThemeOption;

    if (typeof window != "undefined" && typeof window.matchMedia != "undefined") {
        if (window.matchMedia("(prefers-color-scheme)").media == "not all") {
            return defaultTheme;
        }

        const isDark = !window.matchMedia("(prefers-color-scheme: light)").matches;
        return (isDark ? "dark" : "light")  as ThemeOption;
    }

    return defaultTheme;
}

function applyUserThemeToBody(userTheme: ThemeOption) {
    if (typeof window != "undefined") {
        document.body.setAttribute(
            "color-scheme",
            userTheme == "system" ? systemTheme() : userTheme
        );
    }
}

// Save page theme to localStorage
function localSaveUserTheme(mediaTheme: ThemeOption) {
    if (typeof window != "undefined") {
        localStorage.setItem("vudl-theme", mediaTheme);
    }
}

// Get page theme from localStorage
function localLoadUserTheme(): ThemeOption {
    if (typeof window != "undefined") {
        let mediaTheme = (localStorage.getItem("vudl-theme") ?? "system") as ThemeOption;

        applyUserThemeToBody(mediaTheme);

        return mediaTheme;
    }

    return "system" as ThemeOption;
}
