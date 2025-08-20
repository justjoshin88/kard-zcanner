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

export const [XimilarTokenProvider, useXimilarToken] = createContextHook<XimilarTokenState>(() => {
  const [token, setTokenState] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("ximilar_token").then((stored) => {
      if (!mounted) return;
      const val = (stored ?? "").trim();
      setTokenState(val);
      setXimilarToken(val);
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
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