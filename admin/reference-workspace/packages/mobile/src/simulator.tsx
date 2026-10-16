import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import type { Page, Simulation } from "@inficarx/api-types";
import { useSession } from "./session";
import { SERVER_URL } from "./api";
import {
  Screen,
  Card,
  Button,
  Badge,
  Empty,
  Status,
  useResource,
  s,
  C,
} from "./ui";
export function Simulator() {
  const { vehicle } = useSession();
  const list = useResource<Page<Simulation>>(
    "/simulations" + (vehicle ? "?vehicle_variant_id=" + vehicle.id : ""),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const id = list.data?.data.some((p) => p.id === selected)
    ? selected
    : list.data?.data[0]?.id;
  const r = useResource<Simulation>(id ? "/simulations/" + id : null);
  const viewer = r.data
    ? SERVER_URL +
      "/viewer/index.html" +
      (r.data.model_url
        ? "?model=" +
          encodeURIComponent(
            r.data.model_url.replace(/^https?:\/\/[^/]+/, SERVER_URL),
          )
        : "")
    : null;
  return (
    <Screen
      title="Understand what’s inside."
      kicker="Interactive 3D studio"
      refresh={list.reload}
    >
      <Status {...list} retry={list.reload} />
      <Status {...r} retry={r.reload} />
      {!list.loading && list.data?.data.length === 0 && (
        <Empty
          title="No approved simulations"
          detail="There are no approved assemblies for this vehicle yet."
        />
      )}
      {r.data && (
        <>
          <View style={s.row}>
            <Badge>
              {r.data.is_concept
                ? "CONCEPT ILLUSTRATION"
                : "REVIEWED PROCEDURE"}
            </Badge>
            <Text style={s.muted}>Rotate · Zoom · Select</Text>
          </View>
          <Text style={s.heading}>{r.data.title}</Text>
          <Text style={s.muted}>{r.data.description}</Text>
          <View
            style={{
              height: 440,
              borderRadius: 18,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            {Platform.OS === "web" ? (
              React.createElement("iframe", {
                src: viewer,
                title: "Interactive brake assembly",
                style: { width: "100%", height: "100%", border: 0 },
              })
            ) : (
              <WebView
                source={{ uri: viewer! }}
                javaScriptEnabled
                originWhitelist={[SERVER_URL]}
                style={{ backgroundColor: C.bg }}
                onShouldStartLoadWithRequest={(req) =>
                  req.url.startsWith(SERVER_URL + "/viewer/")
                }
              />
            )}
          </View>
          <Card>
            <Text style={s.heading}>
              {r.data.is_concept ? "Explore the components" : "Procedure steps"}
            </Text>
            {r.data.steps.map((step) => (
              <View key={step.id} style={{ gap: 4 }}>
                <Text style={s.text}>
                  {step.step_number}. {step.instruction}
                </Text>
                {step.warning && <Text style={s.muted}>{step.warning}</Text>}
              </View>
            ))}
          </Card>
          {r.data.parts.map((p) => (
            <Button
              key={p}
              title="Find replacement parts"
              onPress={() => router.push("/parts/" + p)}
            />
          ))}
        </>
      )}
      {(list.data?.data.length ?? 0) > 1 &&
        list.data?.data.map((x) => (
          <Button
            key={x.id}
            title={x.title}
            secondary
            onPress={() => setSelected(x.id)}
          />
        ))}
    </Screen>
  );
}
