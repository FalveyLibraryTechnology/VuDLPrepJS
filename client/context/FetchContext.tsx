import React, { createContext, useContext, useReducer } from "react";
import { authApiUrl, ingestApiUrl, loginUrl } from "../util/routes";
import PropTypes from "prop-types";

/**
 * Pass a shared entity to react components,
 * specifically a way to make api requests.
 */
const fetchContextParams = {
    token: typeof window !== 'undefined' ? sessionStorage.getItem("token") : null,
};
const FetchContext = createContext({});

/**
 * Update the shared states of react components.
 */
const fetchReducer = (state, { type, payload }) => {
    switch (type) {
        case "CLEAR_TOKEN":
            sessionStorage.removeItem("token");
            return {
                ...state,
                token: null,
            };
        case "UPDATE_TOKEN":
            sessionStorage.setItem("token", payload);
            return {
                ...state,
                token: payload,
            };
        default:
            console.error(`fetch action type: ${type} does not exist`);
            return state;
    }
};

export const FetchContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(fetchReducer, fetchContextParams);
    const value = { state, dispatch };
    return <FetchContext.Provider value={value}>{children}</FetchContext.Provider>;
};

export const useFetchContext = () => {
    const {
        state: { token },
        dispatch,
    } = useContext(FetchContext);

    /**
     * Get default fetch parameters. If params or headers exist,
     * overload the associated keys.
     */
    const fetchParams = (params = {}, headers = {}) => ({
        credentials: "include",
        method: "GET",
        mode: "cors",
        ...params,
        headers,
    });

    /**
     * Query a fresh token to authorize user to make api requests.
     */
    const refreshToken = async () => {
        try {
            const response = await fetch(`${authApiUrl}/token/mint`, fetchParams());
            if (response.ok) {
                const token = await response.json();
                dispatch({
                    type: "UPDATE_TOKEN",
                    payload: token,
                });
                return token;
            }
        } catch (error) {
            console.error(error);
        }
        window.location.href = `${loginUrl}?referer=${encodeURIComponent(window.location.href)}`;
        return false;
    };

    /**
     * Clear the login token.
     */
    const clearToken = () => {
        dispatch({
            type: "CLEAR_TOKEN",
            payload: null,
        });
    }

    /**
     * Return a customizable response when making a request.
     * If first response return a 401 unauthorized status,
     * attempt to refresh token and call the request again.
     * @param {string} url - The http url of the request
     * @param {Object} params - The request parameters
     * @param {Object} headers - The request parameter headers
     */
    const makeRequest = async (url: string, params = {}, headers = {}) => {
        const response = await fetch(
            url,
            fetchParams(params, {
                ...headers,
                Authorization: `Token ${token}`,
            })
        );
        if (response?.status == 401) {
            const token = await refreshToken();
            return token
                ? await fetch(
                      url,
                      fetchParams(params, {
                          ...headers,
                          Authorization: `Token ${token}`,
                      })
                  )
                : false;
        }
        return response;
    };

    /**
     * Return a json response when making a request
     * @param {string} url - The http url of the request
     * @param {Object} params - The request parameters
     * @param {Object} headers - The request parameter headers
     */
    const fetchJSON = async (url = ingestApiUrl, params = {}, headers = {}) => {
        const response = await makeRequest(url, params, headers);
        if (response?.ok) {
            return await response.json();
        }
        throw new Error(response?.statusText ?? "Could not make request");
    };

    /**
     * Return a text response when making a request
     * @param {string} url - The http url of the request
     * @param {Object} params - The request parameters
     * @param {Object} headers - The request parameter headers
     */
    const fetchText = async (url = ingestApiUrl, params = {}, headers = {}) => {
        const response = await makeRequest(url, params, headers);
        const body = response ? await response.text() : "";
        if (response?.ok) {
            return body;
        }
        throw new Error(response.statusText + ((body ?? "").length > 0 ? ": " + body : ""));
    };

    /**
     * Return a blob response when making a request
     * @param {string} url - The http url of the request
     * @param {Object} params - The request parameters
     * @param {Object} headers - The request parameter headers
     */
    const fetchBlob = async (url, params = {}, headers = {}) => {
        const response = await makeRequest(url, params, headers);
        if (response.ok) {
            const blob = await response.blob();
            return {
                headers: response.headers,
                blob
            };
        }
        throw new Error(response.statusText);
    };

    return {
        state: {
            token,
        },
        action: {
            clearToken,
            fetchBlob,
            fetchJSON,
            fetchText,
            makeRequest,
        },
    };
};

FetchContextProvider.propTypes = {
    children: PropTypes.node,
};

export default { FetchContextProvider, useFetchContext };
