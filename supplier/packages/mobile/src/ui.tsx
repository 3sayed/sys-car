import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  type TextInputProps,
} from "react-native";
import { router, useCurrentRoute, useFocusEffect } from "./navigation";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "./session";
import { api } from "./api";
import { errorMessage } from "@inficarx/shared-utils";
export const C = {
  bg: "#101112",
  panel: "#252729",
  raised: "#343638",
  line: "#454749",
  text: "#f7f5f1",
  muted: "#aaabad",
  accent: "#ff641c",
  blue: "#ff9b6d",
  red: "#ff9a8d",
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: 24,
    paddingBottom: 54,
    gap: 24,
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { fontSize: 38, fontWeight: "700", color: C.text, letterSpacing: -1.7, lineHeight: 43 },
  heading: { fontSize: 21, fontWeight: "700", color: C.text, letterSpacing: -0.5 },
  text: { fontSize: 15, color: C.text, lineHeight: 23 },
  muted: { fontSize: 13, color: C.muted, lineHeight: 21 },
  card: {
    backgroundColor: C.panel,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: C.line,
    gap: 14,
    overflow: "hidden",
  },
  input: {
    backgroundColor: "#191b1d",
    color: C.text,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 52,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  badge: {
    backgroundColor: "#3c302b",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.5,
  },
  line: { height: 1, backgroundColor: C.line },
  grow: { flex: 1 },
  error: { color: C.red, fontSize: 14, lineHeight: 22 },
});
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: secondary ? C.raised : C.accent,
        paddingHorizontal: 18,
        paddingVertical: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: secondary ? C.line : C.accent,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      })}
    >
      {icon && (
        <Ionicons name={icon} size={18} color={secondary ? C.text : C.bg} />
      )}
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: secondary ? C.text : C.bg,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={[s.muted, { color: "#dad8d4", fontWeight: "600" }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#898b8d"
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.badge}>
      <Text style={s.label}>{children}</Text>
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <Card>
      <Ionicons name="albums-outline" size={32} color={C.muted} />
      <Text style={s.heading}>{title}</Text>
      {detail && <Text style={s.muted}>{detail}</Text>}
    </Card>
  );
}
export function Screen({
  title,
  kicker,
  children,
  refresh,
  back = false,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  refresh?: () => void;
  back?: boolean;
}) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={false}
              onRefresh={refresh}
              tintColor={C.accent}
            />
          ) : undefined
        }
        contentContainerStyle={s.content}
      >
        <View style={[s.row, { justifyContent: "space-between", paddingBottom: 8 }]}>
          <Pressable onPress={() => router.push("/")}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: C.text,
                letterSpacing: -1,
              }}
            >
              infiCar<Text style={{ color: C.accent }}>X</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>
                {" "}
                / {useSession().kind}
              </Text>
            </Text>
          </Pressable>
          <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="scan-outline" color={C.accent} size={20} />
          </View>
        </View>
        {back && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            <Text style={{ color: C.blue }}>‹ Back</Text>
          </Pressable>
        )}
          <View style={{ gap: 10, paddingVertical: 8 }}>
          {kicker && <Text style={s.label}>{kicker.toUpperCase()}</Text>}
          <Text style={s.title}>{title}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Protected({ children }: { children: React.ReactNode }) {
  const { ready, user } = useSession();
  useEffect(() => {
    if (ready && !user) router.replace("/(auth)/login");
  }, [ready, user]);
  if (!ready || !user)
    return (
      <View style={[s.page, { justifyContent: "center" }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  return <>{children}</>;
}
export function AppTabs({kind}: {kind: "customer" | "supplier"}) {
  const path = useCurrentRoute();
  const tabs = kind === "customer"
    ? [["marketplace","Marketplace","grid-outline"],["ai","Assistant","sparkles-outline"],["simulator","3D Studio","cube-outline"],["profile","My account","person-outline"]]
    : [["index","Overview","grid-outline"],["inventory","Inventory","layers-outline"],["requests","Requests","chatbubbles-outline"],["profile","My shop","storefront-outline"]];
  return <View style={{flexDirection:"row", backgroundColor:C.panel, borderTopColor:C.line, borderTopWidth:1, paddingBottom:12, paddingTop:10}}>
    {tabs.map(([name,title,icon]) => {
      const target = "/(tabs)/" + name;
      const active = path === target || (kind === "supplier" && name === "index" && path === "/(tabs)");
      return <Pressable key={name} onPress={() => router.replace(target)} style={{flex:1, alignItems:"center", gap:4}}>
        <Ionicons name={icon as any} size={23} color={active ? C.accent : C.muted}/>
        <Text style={{fontSize:11, color:active ? C.accent : C.muted}}>{title}</Text>
      </Pressable>;
    })}
  </View>;
}
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const sequence = useRef(0);
  const [dataPath, setDataPath] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    if (!path) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api<T>(path);
      if (request === sequence.current) {
        setData(result);
        setDataPath(path);
      }
    } catch (e) {
      if (request === sequence.current) setError(errorMessage(e));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  return {
    data: dataPath === path ? data : null,
    loading,
    error,
    reload,
    setData,
  };
}
export function Status({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return <ActivityIndicator color={C.accent} style={{ padding: 15 }} />;
  if (error)
    return (
      <Card>
        <Text style={s.error}>{error}</Text>
        <Button title="Try again" onPress={retry} secondary />
      </Card>
    );
  return null;
}
export function useAction() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(fn: () => Promise<void>, success = "Saved.") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(success);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { busy, error, notice, run };
}
export function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text style={{ color: C.accent, lineHeight: 22 }}>{notice}</Text>
      )}
    </>
  );
}
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: selected ? C.accent : C.line,
        backgroundColor: selected ? "#423027" : C.panel,
      }}
    >
      <Text style={{ color: selected ? C.accent : C.muted, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
