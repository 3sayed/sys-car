import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { useSession } from "./session";
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
  const submit = () =>
    a.run(async () => {
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
      title={register ? "Start your journey." : "Every part. One place."}
      kicker={
        kind === "customer"
          ? "Your car, understood"
          : "Your business, connected"
      }
    >
      <View
        style={{ maxWidth: 480, width: "100%", alignSelf: "center", gap: 24 }}
      >
        <View style={{ padding: 24, alignItems: "center" }}>
          <Ionicons
            name={
              kind === "customer" ? "car-sport-outline" : "storefront-outline"
            }
            size={96}
            color={C.accent}
          />
        </View>
        <Card>
          <Text style={s.heading}>
            {register ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={s.muted}>
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
