"use client";
import { useEffect, useState } from "react";
export function useSessionAuth() {
    const [state, setState] = useState({
        isLoaded: false,
        isSignedIn: false,
        user: null,
    });
    useEffect(() => {
        let mounted = true;
        fetch('/api/auth/session', { cache: 'no-store' })
            .then(async (res) => {
            if (!mounted)
                return;
            const data = await res.json();
            setState({
                isLoaded: true,
                isSignedIn: !!(data === null || data === void 0 ? void 0 : data.authenticated),
                user: (data === null || data === void 0 ? void 0 : data.authenticated) ? data.user : null,
            });
        })
            .catch(() => {
            if (!mounted)
                return;
            setState({
                isLoaded: true,
                isSignedIn: false,
                user: null,
            });
        });
        return () => {
            mounted = false;
        };
    }, []);
    return state;
}
