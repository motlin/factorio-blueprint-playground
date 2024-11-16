declare global {
    interface Window {
        dataLayer: unknown[];
        gtag?: (...args: unknown[]) => void;
    }

    // Global gtag function
    function gtag(...args: unknown[]): void;
}

// This file needs to be a module
export {};
