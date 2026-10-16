import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "./navigation";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { api, SERVER_URL } from "./api";
import { saveServerUrl, useSession } from "./session";
import { Screen, Card, Field, Button, Feedback, useAction, s, C } from "./ui";
import type { User } from "@inficarx/api-types";
export function Login() {
  return <AuthForm />;
}
export function Register() {
  return <AuthForm register />;
}
function AuthForm({ register = false }: { register?: boolean }) {
  const { kind, signIn } = useSession(),
    a = useAction();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [confirm, setConfirm] = useState("");
  const [server, setServer] = useState(SERVER_URL);
  const [showServer, setShowServer] = useState(false);
  const submit = () =>
    a.run(async () => {
      await saveServerUrl(kind, server);
      const d = await api<{ token: string; user: User }>(
        "/auth/" + (register ? "register" : "login"),
        "POST",
        { email, password, name, password_confirmation: confirm },
      );
      await signIn(d.token, d.user);
      router.replace(kind === "customer" ? "/(tabs)/marketplace" : "/(tabs)");
    }, "");
  return (
    <Screen
      title={register ? "Your next drive starts here." : "Welcome back to the road."}
      kicker={
        kind === "customer"
          ? "Your car, understood"
          : "Your business, connected"
      }
    >
      <View style={{ maxWidth: 520, width: "100%", alignSelf: "center", gap: 22 }}>
        <View style={{ minHeight: 210, borderRadius: 30, backgroundColor: "#252729", borderWidth: 1, borderColor: C.line, overflow: "hidden", padding: 24, justifyContent: "space-between" }}>
          <View style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#603722", right: -55, top: -88, opacity: 0.55 }} />
          <View style={{ position: "absolute", width: 195, height: 195, borderRadius: 100, borderWidth: 1, borderColor: "#ad6240", right: 40, top: -45, opacity: 0.55 }} />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.label}>{kind === "customer" ? "THE DRIVER'S SPACE" : "THE SUPPLIER STUDIO"}</Text>
            <Ionicons name="arrow-forward-outline" size={20} color={C.text} />
          </View>
          <Ionicons name={kind === "customer" ? "car-sport-outline" : "storefront-outline"} size={88} color={C.text} style={{ alignSelf: "center" }} />
          <Text style={[s.muted, { color: C.text }]}>A smarter way to keep everything moving.</Text>
        </View>
        <Card>
          <Text style={s.heading}>
            {register ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={[s.muted, { marginBottom: 8 }]}>
            {kind === "customer"
              ? "Find the right parts for your vehicle."
              : "Manage your inventory and connect with customers."}
          </Text>
          {register && (
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={register ? "new-password" : "current-password"}
          />
          {register && (
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
          )}
          <Button title="Server settings" secondary onPress={() => setShowServer(!showServer)} />
          {showServer && <Field label="Server URL" value={server} onChangeText={setServer} autoCapitalize="none" keyboardType="url" placeholder="http://192.168.1.10:8001" />}
          <Feedback {...a} />
          <Button
            title={
              a.busy ? "Please wait…" : register ? "Create account" : "Sign in"
            }
            onPress={submit}
            disabled={a.busy}
          />
          <Button
            title={
              register
                ? "Already have an account? Sign in"
                : "Create an account"
            }
            secondary
            onPress={() =>
              router.push(register ? "/(auth)/login" : "/(auth)/register")
            }
          />
        </Card>
        <Text style={s.muted}>
          Local demo: {kind}@inficarx.test · DemoPass123!
          {register ? "\nUse at least 10 characters for your password." : ""}
        </Text>
      </View>
    </Screen>
  );
}
