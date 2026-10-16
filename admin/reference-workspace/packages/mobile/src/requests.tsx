import React, { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import type { Page, PartRequest, Shop, Vehicle } from "@inficarx/api-types";
import { money, vehicleLabel } from "@inficarx/shared-utils";
import { api, API_URL, authHeaders } from "./api";
import { useSession } from "./session";
import { VehiclePicker } from "./catalog";
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
function RequestPhotos({ images }: { images: { id: number }[] }) {
  return (
    <View style={s.row}>
      {images.map((i) => (
        <PrivateImage key={i.id} id={i.id} />
      ))}
    </View>
  );
}
function PrivateImage({ id }: { id: number }) {
  const [uri, setUri] = useState<string>();
  React.useEffect(() => {
    let objectUrl: string | undefined;
    let live = true;
    if (Platform.OS === "web") {
      fetch(API_URL + "/request-images/" + id, { headers: authHeaders() })
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => {
          objectUrl = URL.createObjectURL(b);
          if (live) setUri(objectUrl);
        })
        .catch(() => {});
    }
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return (
    <Image
      accessibilityLabel="Request attachment"
      source={
        Platform.OS === "web"
          ? { uri }
          : { uri: API_URL + "/request-images/" + id, headers: authHeaders() }
      }
      style={{
        width: 100,
        height: 100,
        borderRadius: 10,
        backgroundColor: C.raised,
      }}
    />
  );
}
export function CustomerRequests() {
  const { part } = useLocalSearchParams<{ part?: string }>(),
    { vehicle } = useSession();
  const [selected, setSelected] = useState<Vehicle | null>(vehicle),
    [description, setDescription] = useState(""),
    [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [createdId, setCreatedId] = useState<number | null>(null);
  const r = useResource<Page<PartRequest>>("/requests"),
    a = useAction();
  async function attach(id: number) {
    if (!photo) return;
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(photo.uri)).blob();
      form.append("image", blob, photo.fileName || "request.jpg");
    } else {
      form.append("image", {
        uri: photo.uri,
        name: photo.fileName || "request.jpg",
        type: photo.mimeType || "image/jpeg",
      } as any);
    }
    await api("/requests/" + id + "/images", "POST", form);
  }
  return (
    <Protected>
      <Screen
        title="My part requests"
        kicker="Let suppliers come to you"
        back
        refresh={r.reload}
      >
        <Card>
          <Text style={s.heading}>Request a part</Text>
          {part && <Text style={s.muted}>Catalog part #{part}</Text>}
          <VehiclePicker value={selected?.id ?? null} onChange={setSelected} />
          <Field
            label="What do you need?"
            placeholder="Front brake pads for my Camry…"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Field
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
          <Button
            title={
              photo ? "Change attached photo" : "Attach a photo (optional)"
            }
            secondary
            onPress={() =>
              a.run(async () => {
                const picked = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  quality: 0.8,
                });
                if (!picked.canceled) setPhoto(picked.assets[0]);
              }, "")
            }
          />
          {photo && (
            <Image
              source={{ uri: photo.uri }}
              style={{ height: 120, width: 160, borderRadius: 10 }}
            />
          )}
          <Feedback {...a} />
          <Button
            title={
              a.busy
                ? "Submitting…"
                : createdId
                  ? "Retry photo upload"
                  : "Send request"
            }
            disabled={a.busy || !selected || description.trim().length < 10}
            onPress={() =>
              a.run(async () => {
                let id = createdId;
                if (!id) {
                  const d = await api<PartRequest>("/requests", "POST", {
                    vehicle_variant_id: selected!.id,
                    part_id: part ? Number(part) : null,
                    description,
                    quantity: Number(quantity),
                  });
                  id = d.id;
                  setCreatedId(id);
                }
                await attach(id);
                setCreatedId(null);
                setPhoto(null);
                setDescription("");
                await r.reload();
              }, "Request sent to suppliers.")
            }
          />
          {createdId && (
            <Text style={s.muted}>
              Request #{createdId} was created. Retry to attach the photo
              without creating a duplicate.
            </Text>
          )}
        </Card>
        <Status {...r} retry={r.reload} />
        {!r.loading && r.data?.data.length === 0 && (
          <Empty
            title="No requests yet"
            detail="Your requests and supplier quotations will appear here."
          />
        )}
        {r.data?.data.map((req) => (
          <Card key={req.id}>
            <View style={s.row}>
              <Badge>
                #{req.id} · {req.status.toUpperCase()}
              </Badge>
              <Text style={s.muted}>Quantity: {req.quantity}</Text>
            </View>
            <Text style={s.heading}>{req.description}</Text>
            <RequestPhotos images={req.images} />
            {req.offers.length === 0 && (
              <Text style={s.muted}>Waiting for supplier quotations.</Text>
            )}
            {req.offers.map((o) => (
              <View key={o.id} style={[s.card, { backgroundColor: C.bg }]}>
                <Text style={s.text}>{o.shop_name}</Text>
                <Text
                  style={{ fontSize: 24, color: C.accent, fontWeight: "700" }}
                >
                  {money(o.price, o.currency)}
                </Text>
                <Text style={s.muted}>
                  {o.availability.replaceAll("_", " ")} · {o.status}
                </Text>
                {req.status === "open" && o.status === "pending" && (
                  <Button
                    title="Accept quotation"
                    disabled={a.busy}
                    onPress={() =>
                      a.run(async () => {
                        await api(
                          "/requests/" + req.id + "/offers/" + o.id + "/accept",
                          "POST",
                        );
                        await r.reload();
                      }, "Quotation accepted. Arrange payment and collection directly with the shop.")
                    }
                  />
                )}
              </View>
            ))}
            {req.status === "open" && (
              <Button
                title="Cancel request"
                secondary
                disabled={a.busy}
                onPress={() =>
                  a.run(async () => {
                    await api("/requests/" + req.id + "/cancel", "POST");
                    await r.reload();
                  }, "Request cancelled.")
                }
              />
            )}
          </Card>
        ))}
        <Feedback {...a} />
      </Screen>
    </Protected>
  );
}
export function SupplierRequests() {
  const r = useResource<Page<PartRequest>>("/supplier/requests"),
    shops = useResource<Page<Shop>>("/supplier/shops");
  return (
    <Screen
      title="Customer requests"
      kicker="Turn a request into an opportunity"
      refresh={r.reload}
    >
      <Status {...r} retry={r.reload} />
      {!r.loading && r.data?.data.length === 0 && (
        <Empty
          title="You’re all caught up"
          detail="New customer part requests will appear here."
        />
      )}
      {r.data?.data.map((req) => (
        <QuoteCard
          key={req.id}
          request={req}
          shops={shops.data?.data ?? []}
          refresh={r.reload}
        />
      ))}
    </Screen>
  );
}
function QuoteCard({
  request: req,
  shops,
  refresh,
}: {
  request: PartRequest;
  shops: Shop[];
  refresh: () => Promise<void>;
}) {
  const [shop, setShop] = useState<number | null>(null),
    [price, setPrice] = useState(""),
    [currency, setCurrency] = useState("BHD"),
    [availability, setAvailability] = useState("available_now");
  const a = useAction();
  return (
    <Card>
      <Badge>REQUEST #{req.id}</Badge>
      <Text style={s.heading}>{req.description}</Text>
      <Text style={s.muted}>
        {req.vehicle
          ? vehicleLabel(req.vehicle) +
            " · " +
            req.vehicle.engine_code +
            " · " +
            req.vehicle.market
          : "Vehicle variant #" + req.vehicle_variant_id}{" "}
        · Quantity {req.quantity}
      </Text>
      <RequestPhotos images={req.images} />
      {req.offers.map((o) => (
        <Text style={s.muted} key={o.id}>
          Your quote: {money(o.price, o.currency)} · {o.status}
        </Text>
      ))}
      <Text style={s.muted}>Quote from shop</Text>
      <View style={s.row}>
        {shops.map((x) => (
          <Choice
            key={x.id}
            label={x.name}
            selected={(shop ?? shops[0]?.id) === x.id}
            onPress={() => setShop(x.id)}
          />
        ))}
      </View>
      <Field
        label="Quotation price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      <View style={s.row}>
        {["BHD", "SAR", "AED", "USD"].map((c) => (
          <Choice
            key={c}
            label={c}
            selected={currency === c}
            onPress={() => setCurrency(c)}
          />
        ))}
      </View>
      <View style={s.row}>
        <Choice
          label="Available now"
          selected={availability === "available_now"}
          onPress={() => setAvailability("available_now")}
        />
        <Choice
          label="By order"
          selected={availability === "by_order"}
          onPress={() => setAvailability("by_order")}
        />
      </View>
      <Feedback {...a} />
      <Button
        title={a.busy ? "Sending…" : "Send quotation"}
        disabled={a.busy || !price || !shops.length}
        onPress={() =>
          a.run(async () => {
            await api("/supplier/requests/" + req.id + "/offers", "POST", {
              shop_id: shop ?? shops[0].id,
              price,
              currency,
              availability,
            });
            await refresh();
          }, "Quotation sent to the customer.")
        }
      />
    </Card>
  );
}
