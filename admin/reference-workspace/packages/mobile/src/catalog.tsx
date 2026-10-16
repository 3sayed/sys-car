import React, { useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Page, Part, Shop, Vehicle } from "@inficarx/api-types";
import { money, vehicleLabel } from "@inficarx/shared-utils";
import { api, SERVER_URL } from "./api";
import { useSession } from "./session";
import {
  Screen,
  Card,
  Field,
  Button,
  Badge,
  Choice,
  Empty,
  Feedback,
  Status,
  Protected,
  useResource,
  useAction,
  s,
  C,
} from "./ui";
function assetUrl(url: string) {
  return url.startsWith("/")
    ? SERVER_URL + url
    : url.replace(/^http:\/\/localhost(?::\d+)?/, SERVER_URL);
}
export function VehiclePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: Vehicle) => void;
}) {
  const r = useResource<Page<Vehicle>>("/vehicles");
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.muted}>Vehicle / engine / market</Text>
      <Status {...r} retry={r.reload} />
      {r.data?.data.map((v) => (
        <Choice
          key={v.id}
          label={vehicleLabel(v) + " · " + v.engine_code + " · " + v.market}
          selected={value === v.id}
          onPress={() => onChange(v)}
        />
      ))}
    </View>
  );
}
export function Marketplace() {
  const { vehicle, kind } = useSession();
  const [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState<number | null>(null),
    [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const r = useResource<Page<Part>>(
    "/parts?" +
      new URLSearchParams({
        q: query,
        page: String(page),
        ...(vehicle ? { vehicle_variant_id: String(vehicle.id) } : {}),
        ...(category ? { category_id: String(category) } : {}),
      }),
  );
  const cats = useResource<Page<{ id: number; name: string }>>("/categories");
  return (
    <Screen
      title="The right part. The right fit."
      kicker="The parts marketplace"
      refresh={r.reload}
    >
      {kind === "customer" && (
        <Card style={{ backgroundColor: "#172a2c", borderColor: "#345249" }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1, gap: 8 }}>
              <Badge>YOUR GARAGE</Badge>
              <Text style={s.heading}>
                {vehicle
                  ? vehicle.nickname || vehicleLabel(vehicle)
                  : "Choose your vehicle"}
              </Text>
              <Text style={s.muted}>
                {vehicle
                  ? vehicle.engine_code +
                    " · " +
                    vehicle.market +
                    " · " +
                    vehicle.trim
                  : "Select an exact variant to filter compatible parts."}
              </Text>
            </View>
            <Ionicons name="car-sport-outline" size={74} color={C.accent} />
          </View>
          <Button
            title={vehicle ? "Change vehicle" : "Add a vehicle"}
            secondary
            onPress={() => router.push("/vehicles")}
          />
        </Card>
      )}
      {kind === "customer" && (
        <View style={s.row}>
          <Button
            title="Ask the assistant"
            icon="sparkles-outline"
            secondary
            onPress={() => router.push("/(tabs)/ai")}
          />
          <Button
            title="My requests"
            icon="chatbubbles-outline"
            secondary
            onPress={() => router.push("/requests")}
          />
        </View>
      )}
      <Field
        label="Find a part"
        placeholder="Brake pads, filter, or part number…"
        value={q}
        onChangeText={setQ}
      />
      <View style={s.row}>
        <Choice
          label="All parts"
          selected={!category}
          onPress={() => {
            setCategory(null);
            setPage(1);
          }}
        />
        {cats.data?.data.map((c) => (
          <Choice
            key={c.id}
            label={c.name}
            selected={category === c.id}
            onPress={() => {
              setCategory(c.id);
              setPage(1);
            }}
          />
        ))}
      </View>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.heading}>Explore the catalog</Text>
        <Text style={s.muted}>{r.data?.total ?? 0} parts</Text>
      </View>
      <Status {...r} retry={r.reload} />
      {!r.loading && r.data?.data.length === 0 && (
        <Empty
          title="No matching parts"
          detail="Try a different search, or request a part from suppliers."
        />
      )}
      <View style={s.grid}>
        {r.data?.data.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            onPress={() => router.push("/parts/" + p.id)}
            style={{ flexGrow: 1, flexBasis: 270, maxWidth: 520 }}
          >
            <Card>
              <View
                style={{
                  height: 130,
                  backgroundColor: C.bg,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.images?.[0] ? (
                  <Image
                    source={{ uri: assetUrl(p.images[0].url) }}
                    style={{ height: 130, width: "100%", borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons
                    name={
                      p.category === "Braking"
                        ? "disc-outline"
                        : p.category === "Electrical"
                          ? "flash-outline"
                          : p.category === "Filters"
                            ? "filter-outline"
                            : "cog-outline"
                    }
                    size={76}
                    color={C.muted}
                  />
                )}
              </View>
              <Text style={s.label}>
                {p.category.toUpperCase()} / {p.part_number}
              </Text>
              <Text style={s.heading}>{p.name}</Text>
              <Text style={s.muted}>{p.manufacturer}</Text>
              <View style={s.line} />
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text
                  style={{ fontSize: 20, fontWeight: "800", color: C.accent }}
                >
                  {p.listings[0]
                    ? money(p.listings[0].price, p.listings[0].currency)
                    : "Request price"}
                </Text>
                <Text style={s.muted}>{p.listings.length} suppliers →</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
      {(r.data?.last_page ?? 1) > 1 && (
        <View style={s.row}>
          <Button
            title="Previous"
            secondary
            disabled={page === 1}
            onPress={() => setPage(page - 1)}
          />
          <Text style={s.muted}>Page {page}</Text>
          <Button
            title="Next"
            secondary
            disabled={page === r.data?.last_page}
            onPress={() => setPage(page + 1)}
          />
        </View>
      )}
      <Text style={s.muted}>
        The seeded catalog, fitment and supplier prices are illustrative.
        Confirm fitment with the supplier before purchase.
      </Text>
    </Screen>
  );
}
export function PartDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    r = useResource<Part>("/parts/" + id),
    a = useAction();
  const { vehicle, kind } = useSession();
  const p = r.data;
  return (
    <Protected>
      <Screen
        title={p?.name || "Part details"}
        kicker="Catalog / compare suppliers"
        back
        refresh={r.reload}
      >
        <Status {...r} retry={r.reload} />
        {p && (
          <>
            <Card>
              <Badge>{p.part_number}</Badge>
              <Text style={s.heading}>{p.manufacturer}</Text>
              <Text style={s.text}>{p.description}</Text>
              {kind === "customer" ? (
                <View style={s.row}>
                  {p.images?.map((i) => (
                    <Image
                      key={i.id}
                      source={{ uri: assetUrl(i.url) }}
                      style={{ width: 200, height: 160, borderRadius: 10 }}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              ) : (
                <Button
                  title="Manage inventory"
                  onPress={() => router.push("/(tabs)/inventory")}
                />
              )}
              {p.attributes?.map((x) => (
                <Text key={x.attribute_name} style={s.muted}>
                  {x.attribute_name}: {x.attribute_value}
                </Text>
              ))}
              <Text style={s.muted}>
                {vehicle
                  ? p.compatibility?.some(
                      (c) => c.vehicle_variant_id === vehicle.id,
                    )
                    ? "Catalog fitment recorded for your vehicle."
                    : "No recorded fitment for your selected vehicle."
                  : "Select a vehicle to check recorded fitment."}
              </Text>
              {p.compatibility?.map((c) => (
                <Text key={c.vehicle_variant_id} style={s.muted}>
                  {c.fitment_notes}
                </Text>
              ))}
              <View style={s.row}>
                <Button
                  title="Save part"
                  secondary
                  onPress={() =>
                    a.run(async () => {
                      await api("/favorites/" + p.id, "PUT");
                    }, "Saved to favorites.")
                  }
                />
                <Button
                  title="Request a quotation"
                  onPress={() =>
                    router.push({
                      pathname: "/requests",
                      params: { part: String(p.id) },
                    })
                  }
                />
              </View>
              <Feedback {...a} />
            </Card>
            <Text style={s.heading}>Compare suppliers</Text>
            <Text style={s.muted}>
              Prices grouped by currency, then lowest first. No currency
              conversion is applied.
            </Text>
            {p.listings.length === 0 && (
              <Empty
                title="No listings yet"
                detail="Create a request to ask suppliers for availability."
              />
            )}
            {p.listings.map((l) => (
              <Card key={l.id}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={s.heading}>{l.shop_name}</Text>
                  <Text
                    style={{ color: C.accent, fontSize: 24, fontWeight: "800" }}
                  >
                    {money(l.price, l.currency)}
                  </Text>
                </View>
                <Text style={s.muted}>
                  {l.branch_name} · {l.condition} ·{" "}
                  {l.quantity > 0 ? l.quantity + " in stock" : "Out of stock"}
                </Text>
                <Text style={s.muted}>{l.address}</Text>
                <Button
                  title="View supplier"
                  secondary
                  onPress={() => router.push("/shops/" + l.shop_id)}
                />
              </Card>
            ))}
          </>
        )}
      </Screen>
    </Protected>
  );
}
export function Garage() {
  const { vehicle, setVehicle } = useSession(),
    r = useResource<Page<Vehicle>>("/garage"),
    a = useAction();
  const [selected, setSelected] = useState<Vehicle | null>(null),
    [nickname, setNickname] = useState("");
  return (
    <Protected>
      <Screen
        title="My garage"
        kicker="Exact fitment starts here"
        back
        refresh={r.reload}
      >
        <Status {...r} retry={r.reload} />
        {r.data?.data.map((v) => (
          <Card key={v.garage_id}>
            <Text style={s.heading}>{v.nickname}</Text>
            <Text style={s.muted}>
              {vehicleLabel(v)} · {v.engine_code} · {v.market}
            </Text>
            <View style={s.row}>
              <Button
                title={vehicle?.id === v.id ? "Selected" : "Use this vehicle"}
                secondary
                disabled={vehicle?.id === v.id}
                onPress={() => setVehicle(v)}
              />
              <Button
                title="Remove"
                secondary
                disabled={a.busy}
                onPress={() =>
                  a.run(async () => {
                    await api("/garage/" + v.garage_id, "DELETE");
                    if (vehicle?.id === v.id) setVehicle(null);
                    await r.reload();
                  }, "Vehicle removed.")
                }
              />
            </View>
          </Card>
        ))}
        <Card>
          <Text style={s.heading}>Add a vehicle</Text>
          <VehiclePicker value={selected?.id ?? null} onChange={setSelected} />
          <Field
            label="Nickname"
            placeholder="My Camry 2020"
            value={nickname}
            onChangeText={setNickname}
          />
          <Feedback {...a} />
          <Button
            title="Save vehicle"
            disabled={a.busy || !selected || !nickname.trim()}
            onPress={() =>
              a.run(async () => {
                await api("/garage", "POST", {
                  vehicle_variant_id: selected!.id,
                  nickname,
                });
                setVehicle({ ...selected!, nickname });
                setNickname("");
                await r.reload();
              }, "Vehicle saved.")
            }
          />
        </Card>
      </Screen>
    </Protected>
  );
}
export function ShopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    r = useResource<Shop>("/shops/" + id),
    a = useAction();
  const [rating, setRating] = useState(5),
    [comment, setComment] = useState("");
  return (
    <Protected>
      <Screen title={r.data?.name || "Supplier"} kicker="Supplier profile" back>
        <Status {...r} retry={r.reload} />
        {r.data && (
          <>
            <Card>
              <Text style={s.text}>{r.data.description}</Text>
              {r.data.branches.map((b) => (
                <View key={b.id} style={{ gap: 10 }}>
                  <Text style={s.heading}>{b.name}</Text>
                  <Text style={s.muted}>{b.address}</Text>
                  <View style={s.row}>
                    {b.phone && (
                      <Button
                        title="Call supplier"
                        secondary
                        onPress={() => void Linking.openURL("tel:" + b.phone)}
                      />
                    )}
                    <Button
                      title="Open map"
                      secondary
                      onPress={() =>
                        void Linking.openURL(
                          "https://www.google.com/maps/search/?api=1&query=" +
                            encodeURIComponent(
                              b.latitude && b.longitude
                                ? b.latitude + "," + b.longitude
                                : b.address,
                            ),
                        )
                      }
                    />
                  </View>
                </View>
              ))}
            </Card>
            <Card>
              <Text style={s.heading}>Leave a review</Text>
              <View style={s.row}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Choice
                    key={n}
                    label={n + " ★"}
                    selected={rating === n}
                    onPress={() => setRating(n)}
                  />
                ))}
              </View>
              <Field
                label="Your review"
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <Feedback {...a} />
              <Button
                title="Save review"
                disabled={a.busy}
                onPress={() =>
                  a.run(async () => {
                    await api("/shops/" + id + "/reviews", "POST", {
                      rating,
                      comment,
                    });
                    await r.reload();
                  }, "Review saved.")
                }
              />
            </Card>
            {r.data.reviews?.map((v, i) => (
              <Card key={i}>
                <Text style={{ color: C.accent }}>{"★".repeat(v.rating)}</Text>
                <Text style={s.text}>{v.comment}</Text>
              </Card>
            ))}
          </>
        )}
      </Screen>
    </Protected>
  );
}
