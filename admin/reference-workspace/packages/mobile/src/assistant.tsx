import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import type { Page, Part } from "@inficarx/api-types";
import { api } from "./api";
import { useSession } from "./session";
import {
  Screen,
  Card,
  Field,
  Button,
  Badge,
  Feedback,
  useAction,
  useResource,
  s,
  C,
} from "./ui";
type Message = { role: string; content: string };
export function Assistant() {
  const { vehicle } = useSession(),
    a = useAction();
  const [message, setMessage] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [cid, setCid] = useState<number | null>(null),
    [parts, setParts] = useState<Part[]>([]),
    [provider, setProvider] = useState("");
  const conversations =
    useResource<Page<{ id: number; title: string }>>("/ai/conversations");
  return (
    <Screen title="A little clarity for your car." kicker="infiCarX assistant">
      <Card>
        <Badge>
          {vehicle ? vehicle.nickname || vehicle.model : "NO VEHICLE SELECTED"}
        </Badge>
        <Text style={s.text}>
          Describe what you hear, see, or need. Explore matching parts from your
          vehicle’s catalog.
        </Text>
        <Text style={s.muted}>
          Symptoms aren’t a diagnosis. A qualified inspection is needed to
          confirm faults.
        </Text>
        {!vehicle && (
          <Button
            title="Choose a vehicle"
            onPress={() => router.push("/vehicles")}
          />
        )}
      </Card>
      {messages.length === 0 && (
        <View style={{ gap: 10 }}>
          {[
            "My Camry squeaks when I brake. What could it be?",
            "Find an oil filter for my vehicle.",
            "Show me alternator options.",
          ].map((text) => (
            <Button
              key={text}
              title={text}
              secondary
              onPress={() => setMessage(text)}
            />
          ))}
        </View>
      )}
      {messages.map((m, i) => (
        <Card
          key={i}
          style={{
            backgroundColor: m.role === "user" ? "#203126" : C.panel,
            marginLeft: m.role === "user" ? 24 : 0,
            marginRight: m.role === "assistant" ? 24 : 0,
          }}
        >
          <Text style={s.label}>{m.role === "user" ? "YOU" : "ASSISTANT"}</Text>
          <Text selectable style={s.text}>
            {m.content}
          </Text>
        </Card>
      ))}
      {provider && (
        <Text style={s.muted}>
          {provider === "openai"
            ? "AI response grounded in catalog context."
            : "Catalog search mode · AI provider not configured."}
        </Text>
      )}
      {parts.length > 0 && (
        <Card>
          <Text style={s.heading}>Related catalog parts</Text>
          {parts.map((p) => (
            <Button
              key={p.id}
              title={p.name + " →"}
              secondary
              onPress={() => router.push("/parts/" + p.id)}
            />
          ))}
          <Button
            title="Explore the 3D assembly"
            secondary
            onPress={() => router.push("/(tabs)/simulator")}
          />
        </Card>
      )}
      <Card>
        <Field
          label="Your question"
          placeholder="Describe a symptom or search for a part…"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <Feedback {...a} />
        <Button
          title={a.busy ? "Thinking…" : "Ask assistant"}
          disabled={a.busy || !vehicle || message.trim().length < 2}
          onPress={() =>
            a.run(async () => {
              const d = await api<{
                conversation_id: number;
                content: string;
                provider: string;
                parts: Part[];
              }>("/ai/chat", "POST", {
                message,
                vehicle_variant_id: vehicle!.id,
                conversation_id: cid,
              });
              setMessages([
                ...messages,
                { role: "user", content: message },
                { role: "assistant", content: d.content },
              ]);
              setCid(d.conversation_id);
              setParts(d.parts);
              setProvider(d.provider);
              setMessage("");
              await conversations.reload();
            }, "")
          }
        />
      </Card>
      <View style={s.row}>
        <Button
          title="New conversation"
          secondary
          onPress={() => {
            setCid(null);
            setMessages([]);
            setParts([]);
            setProvider("");
          }}
        />
      </View>
      {!!conversations.data?.data.length && (
        <Card>
          <Text style={s.heading}>Recent conversations</Text>
          {conversations.data.data.map((c) => (
            <Button
              key={c.id}
              title={c.title}
              secondary
              onPress={() =>
                a.run(async () => {
                  const d = await api<Page<Message>>(
                    "/ai/conversations/" + c.id,
                  );
                  setMessages(d.data);
                  setCid(c.id);
                  setParts([]);
                  setProvider("");
                }, "")
              }
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
