import React, { createContext, useContext, useEffect, useState } from "react";
import * as Keychain from "react-native-keychain";
import { api, API_URL, configureApiUrl, configureSession } from "./api";
import type { User, Vehicle, Page } from "@inficarx/api-types";
type Kind = "customer" | "supplier";
type Context = {
  kind: Kind;
  user: User | null;
  ready: boolean;
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const Session = createContext<Context>(null!);
export const useSession = () => useContext(Session);
async function read(key: string) {
  const credentials = await Keychain.getGenericPassword({ service: key });
  return credentials ? credentials.password : null;
}
async function write(key: string, value: string | null) {
  if (value) await Keychain.setGenericPassword(key, value, { service: key });
  else await Keychain.resetGenericPassword({ service: key });
}
export async function saveServerUrl(kind: Kind, value: string) {
  configureApiUrl(value);
  await write(`inficarx-${kind}-server`, API_URL);
}
export function SessionProvider({
  kind,
  children,
}: {
  kind: Kind;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const key = "inficarx-" + kind;
  const clear = () => {
    configureSession(null);
    setUser(null);
    setVehicle(null);
    void write(key, null);
  };
  async function refreshUser() {
    const d = await api<{ user: User }>("/me");
    setUser(d.user);
  }
  async function garage() {
    const d = await api<Page<Vehicle>>("/garage");
    setVehicle(d.data[0] ?? null);
  }
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const server = await read(key + '-server');
        if (server) configureApiUrl(server);
        const t = await read(key);
        configureSession(t, clear);
        if (t) {
          const d = await api<{ user: User }>("/me");
          if (live) {
            setUser(d.user);
            await garage();
          }
        }
      } catch {
        clear();
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  async function signIn(t: string, u: User) {
    configureSession(t, clear);
    await write(key, t);
    setUser(u);
    await garage().catch(() => {});
  }
  async function signOut() {
    try {
      await api("/auth/logout", "POST");
    } finally {
      clear();
    }
  }
  return (
    <Session.Provider
      value={{
        kind,
        user,
        ready,
        vehicle,
        setVehicle,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </Session.Provider>
  );
}
