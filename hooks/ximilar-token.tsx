import React, { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { setXimilarToken } from "@/services/ximilar-api";

export type XimilarTokenState = {
  token: string;
  isLoaded: boolean;
  setToken: (t: string) => Promise<void>;
  clearToken: () => Promise<void>;
};

const DEFAULT_RUNTIME_TOKEN = "4a1a39b8d2b6795a8d4fd172183147a9b5e5b8ef";

export const [XimilarTokenProvider, useXimilarToken] = createContextHook<XimilarTokenState>(() => {
  const [token, setTokenState] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("ximilar_token");
        if (!mounted) return;
        const val = (stored ?? "").trim();
        if (val) {
          setTokenState(val);
          setXimilarToken(val);
        } else if (DEFAULT_RUNTIME_TOKEN) {
          setTokenState(DEFAULT_RUNTIME_TOKEN);
          setXimilarToken(DEFAULT_RUNTIME_TOKEN);
          try { await AsyncStorage.setItem("ximilar_token", DEFAULT_RUNTIME_TOKEN); } catch {}
        }
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setToken = useCallback(async (t: string) => {
    const val = (t ?? "").trim();
    setTokenState(val);
    setXimilarToken(val);
    try {
      if (val) await AsyncStorage.setItem("ximilar_token", val);
      else await AsyncStorage.removeItem("ximilar_token");
    } catch {}
  }, []);

  const clearToken = useCallback(async () => {
    setTokenState("");
    setXimilarToken("");
    try { await AsyncStorage.removeItem("ximilar_token"); } catch {}
  }, []);

  return useMemo(() => ({ token, isLoaded, setToken, clearToken }), [token, isLoaded, setToken, clearToken]);
});