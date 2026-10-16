import React, {createContext, useContext, useEffect, useState} from 'react';
import {BackHandler} from 'react-native';

type Route = {path: string; params: Record<string, string>};
type Target = string | {pathname: string; params?: Record<string, string | number>};
let stack: Route[] = [{path: '/', params: {}}];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
function route(target: Target): Route {
  return typeof target === 'string'
    ? {path: target, params: {}}
    : {path: target.pathname, params: Object.fromEntries(Object.entries(target.params || {}).map(([key, value]) => [key, String(value)]))};
}
export const router = {
  push(target: Target) { stack = [...stack, route(target)]; notify(); },
  replace(target: Target) { stack = [...stack.slice(0, -1), route(target)]; notify(); },
  back() { if (stack.length > 1) { stack = stack.slice(0, -1); notify(); } },
  canGoBack() { return stack.length > 1; },
};
const CurrentRoute = createContext<Route>(stack[0]);
export function NavigationRoot({children}: {children: React.ReactNode}) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh(value => value + 1);
    listeners.add(listener);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!router.canGoBack()) return false;
      router.back();
      return true;
    });
    return () => { listeners.delete(listener); back.remove(); };
  }, []);
  const current = stack[stack.length - 1];
  const match = current.path.match(/^\/(parts|shops)\/([^/]+)$/);
  const value = match ? {path: `/${match[1]}/[id]`, params: {id: match[2]}} : current;
  return <CurrentRoute.Provider value={value}>{children}</CurrentRoute.Provider>;
}
export function useCurrentRoute() { return useContext(CurrentRoute).path; }
export function useLocalSearchParams<T extends Record<string, string>>() { return useContext(CurrentRoute).params as T; }
export function useFocusEffect(callback: () => void | (() => void)) { useEffect(callback, [callback]); }
