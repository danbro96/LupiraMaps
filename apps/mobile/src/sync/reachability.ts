import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { logDebug } from '@danbro96/lupira-expo-diagnostics/log';
import { REQUEST_TIMEOUT_MS } from '../config';
import { resolveApiUrl } from '../data/api/apiUrl';

const RETRY_MS = 30_000;

/** Whether the BFF answers. React Query's online flag follows it, so reads pause on the persisted cache
 *  instead of failing while it doesn't, and resume when it does. */
export const useReachability = create<{ serverReachable: boolean }>(() => ({ serverReachable: true }));

function setServerReachable(reachable: boolean): void {
  if (useReachability.getState().serverReachable === reachable) return;
  useReachability.setState({ serverReachable: reachable });
  onlineManager.setOnline(reachable);
  logDebug('net', reachable ? 'server reachable' : 'server unreachable');
}

let probing: Promise<void> | null = null;

export function probeServer(): Promise<void> {
  probing ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${await resolveApiUrl()}/livez`, { signal: controller.signal });
      setServerReachable(res.ok);
    } catch {
      setServerReachable(false);
    } finally {
      clearTimeout(timer);
      probing = null;
    }
  })();
  return probing;
}

/** Probes on start, on every return to the foreground and connectivity change, and every 30 s while the
 *  server is away — nothing else would notice it coming back on an unchanged network. */
export function startReachability(): () => void {
  const appState = AppState.addEventListener('change', (s) => {
    if (s === 'active') void probeServer();
  });
  const net = NetInfo.addEventListener((state) => {
    if (state.isConnected === false) setServerReachable(false);
    else void probeServer();
  });
  const retry = setInterval(() => {
    if (!useReachability.getState().serverReachable && AppState.currentState === 'active') void probeServer();
  }, RETRY_MS);
  void probeServer();
  return () => {
    appState.remove();
    net();
    clearInterval(retry);
  };
}
