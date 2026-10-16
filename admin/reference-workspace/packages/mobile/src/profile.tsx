import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import type { Page, Notification, Part } from "@inficarx/api-types";
import { useSession } from "./session";
import { api } from "./api";
import {
  Screen,
  Card,
  Field,
  Button,
  Badge,
  Feedback,
  Status,
  useResource,
  useAction,
  s,
} from "./ui";
export function Profile() {
  const { user, kind, signOut, refreshUser } = useSession(),
    a = useAction();
  const [name, setName] = useState(user?.name ?? ""),
    [phone, setPhone] = useState(user?.phone ?? "");
  const notes = useResource<Page<Notification>>("/notifications"),
    favorites = useResource<Page<Part>>(
      kind === "customer" ? "/favorites" : null,
    );
  return (
    <Screen title="Make it yours." kicker="Your account" refresh={notes.reload}>
      <Card>
        <Badge>{kind.toUpperCase()}</Badge>
        <Text style={s.heading}>{user?.name}</Text>
        <Text style={s.muted}>{user?.email}</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          title="Save profile"
          disabled={a.busy}
          onPress={() =>
            a.run(async () => {
              await api("/me", "PATCH", { name, phone });
              await refreshUser();
            })
          }
        />
        <Feedback {...a} />
      </Card>
      <View style={s.row}>
        {kind === "customer" ? (
          <>
            <Button
              title="My garage"
              secondary
              onPress={() => router.push("/vehicles")}
            />
            <Button
              title="My requests"
              secondary
              onPress={() => router.push("/requests")}
            />
          </>
        ) : (
          <Button
            title="Manage shops & branches"
            secondary
            onPress={() => router.push("/branches")}
          />
        )}
      </View>
      {kind === "customer" && (
        <Card>
          <Text style={s.heading}>Saved parts</Text>
          {!favorites.data?.data.length && (
            <Text style={s.muted}>
              Save parts from the catalog to find them here.
            </Text>
          )}
          {favorites.data?.data.map((p) => (
            <View key={p.id} style={{ gap: 10 }}>
              <Button
                title={p.name}
                secondary
                onPress={() => router.push("/parts/" + p.id)}
              />
              <Button
                title="Remove favorite"
                secondary
                disabled={a.busy}
                onPress={() =>
                  a.run(async () => {
                    await api("/favorites/" + p.id, "DELETE");
                    await favorites.reload();
                  }, "Favorite removed.")
                }
              />
            </View>
          ))}
        </Card>
      )}
      <Text style={s.heading}>Notifications</Text>
      <Status {...notes} retry={notes.reload} />
      {notes.data?.data.length === 0 && (
        <Text style={s.muted}>You’re all caught up.</Text>
      )}
      {notes.data?.data.map((n) => (
        <Card key={n.id}>
          <Text style={s.label}>
            {n.type.replaceAll("_", " ").toUpperCase()}
          </Text>
          <Text style={s.text}>{n.payload.message}</Text>
          {!n.read_at && (
            <Button
              title="Mark as read"
              secondary
              disabled={a.busy}
              onPress={() =>
                a.run(async () => {
                  await api("/notifications/" + n.id, "PATCH");
                  await notes.reload();
                }, "")
              }
            />
          )}
        </Card>
      ))}
      <Button
        title="Sign out"
        secondary
        onPress={() =>
          a.run(async () => {
            await signOut();
            router.replace("/(auth)/login");
          }, "")
        }
      />
    </Screen>
  );
}
