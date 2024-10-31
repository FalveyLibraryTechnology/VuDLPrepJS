/* eslint react/prop-types: 0 */
import React from "react";
import { GlobalContextProvider } from "../context/GlobalContext";
import { PaginatorContextProvider } from "../context/PaginatorContext";
import { FetchContextProvider } from "../context/FetchContext";

import LogoutButton from "../components/LogoutButton";

import "../styles/vendor/modern-normalize.css";
import "../styles/vendor/colors-tailwindcss.css";

import "../styles/reset.css";
import "../styles/variables.css";
import "../styles/global.css";
import "../styles/job-paginator.css";
import "../styles/object-editor.css";

function MyApp({ Component, pageProps }: { Component: React.ReactNode }): React.ReactElement {
    return (
        <GlobalContextProvider>
            <PaginatorContextProvider>
                <FetchContextProvider>
                    <LogoutButton />
                    <Component {...pageProps} />
                </FetchContextProvider>
            </PaginatorContextProvider>
        </GlobalContextProvider>
    );
}
export default MyApp;
