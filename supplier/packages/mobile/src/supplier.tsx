import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "./navigation";
import type { Page, Listing, Part, Shop } from "@inficarx/api-types";
import { money } from "@inficarx/shared-utils";
import { api } from "./api";
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
export function Dashboard() {
  const inventory = useResource<Page<Listing>>("/supplier/inventory"),
    requests = useResource<Page<unknown>>("/supplier/requests"),
    shops = useResource<Page<Shop>>("/supplier/shops");
  return (
    <Screen
      title="Your business, in motion."
      kicker="SUPPLIER / COMMAND CENTER"
      refresh={inventory.reload}
    >
      <Card style={{ backgroundColor: "#292a2b", minHeight: 202, justifyContent: "space-between" }}>
        <View style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: "#603821", right: -52, top: -85, opacity: 0.65 }} />
        <View style={{ position: "absolute", width: 175, height: 175, borderRadius: 90, borderWidth: 1, borderColor: "#aa6442", right: -18, top: -50, opacity: 0.6 }} />
        <Badge>YOUR BUSINESS / LIVE</Badge>
        <Text style={s.heading}>
          {shops.data?.data[0]?.name ?? "Welcome to infiCarX"}
        </Text>
        <Text style={s.muted}>
          Inventory, requests and shops together in one clear view.
        </Text>
      </Card>
      <View style={s.grid}>
        {[
          [String(inventory.data?.total ?? 0), "Inventory listings"],
          [String(requests.data?.total ?? 0), "Open requests"],
          [String(shops.data?.data.length ?? 0), "Active shops"],
        ].map(([value, label]) => (
          <Card key={label} style={{ flex: 1, minWidth: 140, minHeight: 150, justifyContent: "space-between" }}>
            <Text style={{ fontSize: 40, fontWeight: "800", color: C.accent }}>
              {value}
            </Text>
            <Text style={s.muted}>{label}</Text>
          </Card>
        ))}
      </View>
      <Status {...inventory} retry={inventory.reload} />
      <View style={s.row}>
        <Button
          title="Manage inventory"
          onPress={() => router.push("/(tabs)/inventory")}
        />
        <Button
          title="View customer requests"
          secondary
          onPress={() => router.push("/(tabs)/requests")}
        />
        <Button
          title="Manage shops"
          secondary
          onPress={() => router.push("/branches")}
        />
      </View>
      <Text style={s.label}>INVENTORY / ATTENTION</Text>
      <Text style={s.heading}>Low-stock watch</Text>
      {inventory.data?.data
        .filter((l) => l.quantity <= 5)
        .map((l) => (
          <Card key={l.id}>
            <Text style={s.heading}>{l.part_name}</Text>
            <Text style={s.muted}>
              {l.quantity} remaining · {l.branch_name}
            </Text>
          </Card>
        ))}
      {!inventory.data?.data.some((l) => l.quantity <= 5) && (
        <Empty
          title="Stock is looking healthy"
          detail="Listings with five or fewer units appear here. Inventory is shown for the first 100 listings."
        />
      )}
    </Screen>
  );
}
export function Inventory() {
  const [page, setPage] = useState(1);
  const r = useResource<Page<Listing>>("/supplier/inventory?page=" + page),
    shops = useResource<Page<Shop>>("/supplier/shops");
  const [edit, setEdit] = useState<Listing | null>(null),
    [adding, setAdding] = useState(false);
  return (
    <Screen
      title="Your inventory, in focus."
      kicker="Supplier / stock & pricing"
      refresh={r.reload}
    >
      <Button
        title="Add a catalog part"
        icon="add-outline"
        onPress={() => {
          setEdit(null);
          setAdding(true);
        }}
      />
      {(adding || edit) && (
        <InventoryEditor
          key={edit?.id ?? "new"}
          listing={edit}
          shops={shops.data?.data ?? []}
          close={() => {
            setAdding(false);
            setEdit(null);
          }}
          refresh={r.reload}
        />
      )}
      <Status {...r} retry={r.reload} />
      {!r.loading && !r.data?.data.length && (
        <Empty
          title="Your shelves are empty"
          detail="Create a shop and branch, then add parts from the shared catalog."
        />
      )}
      <View style={s.grid}>
        {r.data?.data.map((l) => (
          <Card key={l.id} style={{ flexGrow: 1, flexBasis: 300 }}>
            <Badge>
              {l.status.toUpperCase()} · {l.condition.toUpperCase()}
            </Badge>
            <Text style={s.heading}>{l.part_name}</Text>
            <Text style={s.muted}>
              {l.part_number} · {l.supplier_sku}
            </Text>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text
                style={{ color: C.accent, fontSize: 24, fontWeight: "800" }}
              >
                {money(l.price, l.currency)}
              </Text>
              <Text style={s.text}>{l.quantity} units</Text>
            </View>
            <Text style={s.muted}>{l.branch_name}</Text>
            <Button
              title="Edit listing"
              secondary
              onPress={() => {
                setAdding(false);
                setEdit(l);
              }}
            />
          </Card>
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
          <Button
            title="Next"
            secondary
            disabled={page === r.data?.last_page}
            onPress={() => setPage(page + 1)}
          />
        </View>
      )}
    </Screen>
  );
}
function InventoryEditor({
  listing: l,
  shops,
  close,
  refresh,
}: {
  listing: Listing | null;
  shops: Shop[];
  close: () => void;
  refresh: () => Promise<void>;
}) {
  const a = useAction(),
    [q, setQ] = useState("");
  const parts = useResource<Page<Part>>(
    !l ? "/parts?q=" + encodeURIComponent(q) : null,
  );
  const branches = shops.flatMap((s) => s.branches);
  const [part, setPart] = useState(l?.part_id ?? 0),
    [branch, setBranch] = useState(l?.branch_id ?? 0),
    [sku, setSku] = useState(l?.supplier_sku ?? ""),
    [price, setPrice] = useState(l?.price ?? ""),
    [qty, setQty] = useState(String(l?.quantity ?? 0)),
    [condition, setCondition] = useState(l?.condition ?? "new"),
    [status, setStatus] = useState(l?.status ?? "active"),
    [currency, setCurrency] = useState(l?.currency ?? "BHD");
  const history = useResource<{
    movements: { id: number; quantity_change: number; created_at: string }[];
    prices: { id: number; old_price: string; new_price: string }[];
  }>(l ? "/supplier/inventory/" + l.id + "/history" : null);
  return (
    <Card>
      <Text style={s.heading}>
        {l ? "Edit " + l.part_name : "Add a listing"}
      </Text>
      {!l && (
        <>
          <Field label="Search shared catalog" value={q} onChangeText={setQ} />
          <View style={s.row}>
            {parts.data?.data.map((p) => (
              <Choice
                key={p.id}
                label={p.name}
                selected={part === p.id}
                onPress={() => setPart(p.id)}
              />
            ))}
          </View>
          <Text style={s.muted}>Branch</Text>
          <View style={s.row}>
            {branches.map((b) => (
              <Choice
                key={b.id}
                label={b.name}
                selected={branch === b.id}
                onPress={() => setBranch(b.id)}
              />
            ))}
          </View>
          {!branches.length && (
            <Button
              title="Create a shop and branch"
              onPress={() => router.push("/branches")}
            />
          )}
        </>
      )}
      <Field label="Supplier SKU" value={sku} onChangeText={setSku} />
      <Field
        label="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      {!l && (
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
      )}
      <Field
        label="Stock quantity"
        value={qty}
        onChangeText={setQty}
        keyboardType="number-pad"
      />
      <View style={s.row}>
        {["new", "used", "refurbished"].map((c) => (
          <Choice
            key={c}
            label={c}
            selected={condition === c}
            onPress={() => setCondition(c)}
          />
        ))}
      </View>
      <View style={s.row}>
        {["active", "inactive"].map((c) => (
          <Choice
            key={c}
            label={c}
            selected={status === c}
            onPress={() => setStatus(c)}
          />
        ))}
      </View>
      <Feedback {...a} />
      <View style={s.row}>
        <Button
          title="Save listing"
          disabled={a.busy || !part || !branch}
          onPress={() =>
            a.run(async () => {
              await api(
                "/supplier/inventory" + (l ? "/" + l.id : ""),
                l ? "PATCH" : "POST",
                {
                  part_id: part,
                  branch_id: branch,
                  supplier_sku: sku,
                  price,
                  quantity: Number(qty),
                  currency,
                  condition,
                  status,
                },
              );
              await refresh();
              close();
            }, "")
          }
        />
        <Button title="Cancel editing" secondary onPress={close} />
      </View>
      {l && (
        <>
          <Text style={s.heading}>Recent stock movements</Text>
          {history.data?.movements.slice(0, 5).map((m) => (
            <Text style={s.muted} key={m.id}>
              {m.quantity_change > 0 ? "+" : ""}
              {m.quantity_change} units · {m.created_at}
            </Text>
          ))}
          <Text style={s.heading}>Price history</Text>
          {history.data?.prices.slice(0, 5).map((p) => (
            <Text key={p.id} style={s.muted}>
              {money(p.old_price, currency)} → {money(p.new_price, currency)}
            </Text>
          ))}
        </>
      )}
    </Card>
  );
}
export function ManageShops() {
  const r = useResource<Page<Shop>>("/supplier/shops"),
    a = useAction();
  const [name, setName] = useState(""),
    [description, setDescription] = useState("");
  return (
    <Protected>
      <Screen
        title="Shops & branches"
        kicker="Your supplier network"
        back
        refresh={r.reload}
      >
        <Status {...r} retry={r.reload} />
        {r.data?.data.map((shop) => (
          <ShopEditor key={shop.id} shop={shop} refresh={r.reload} />
        ))}
        <Card>
          <Text style={s.heading}>Create a shop</Text>
          <Field label="Shop name" value={name} onChangeText={setName} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Feedback {...a} />
          <Button
            title="Create shop"
            disabled={a.busy || !name.trim()}
            onPress={() =>
              a.run(async () => {
                await api("/supplier/shops", "POST", { name, description });
                setName("");
                setDescription("");
                await r.reload();
              }, "Shop created. Add a branch to start listing parts.")
            }
          />
        </Card>
      </Screen>
    </Protected>
  );
}
function ShopEditor({
  shop,
  refresh,
}: {
  shop: Shop;
  refresh: () => Promise<void>;
}) {
  const a = useAction();
  const [name, setName] = useState(shop.name),
    [description, setDescription] = useState(shop.description),
    [branch, setBranch] = useState(""),
    [address, setAddress] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("staff");
  return (
    <Card>
      <Badge>SHOP #{shop.id}</Badge>
      <Field label="Shop name" value={name} onChangeText={setName} />
      <Field
        label="Shop description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Button
        title="Update shop"
        secondary
        disabled={a.busy}
        onPress={() =>
          a.run(async () => {
            await api("/supplier/shops/" + shop.id, "PATCH", {
              name,
              description,
            });
            await refresh();
          })
        }
      />
      <Text style={s.heading}>Branches</Text>
      {shop.branches.map((b) => (
        <Text key={b.id} style={s.muted}>
          {b.name} · {b.address} · {b.phone || "No phone set"}
        </Text>
      ))}
      <Field label="New branch name" value={branch} onChangeText={setBranch} />
      <Field label="Address" value={address} onChangeText={setAddress} />
      <Field
        label="Branch phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Button
        title="Add branch"
        secondary
        disabled={a.busy || !branch || !address}
        onPress={() =>
          a.run(async () => {
            await api("/supplier/shops/" + shop.id + "/branches", "POST", {
              name: branch,
              address,
              phone,
            });
            setBranch("");
            setAddress("");
            setPhone("");
            await refresh();
          }, "Branch created.")
        }
      />
      <Text style={s.heading}>Team access</Text>
      <Text style={s.muted}>
        Owners can grant access to registered users. Staff manage inventory and
        quotes; managers also edit shops and branches.
      </Text>
      {shop.members?.map((m) => (
        <View key={m.id} style={s.row}>
          <Text style={s.muted}>
            User #{m.user_id} · {m.role}
          </Text>
          <Button
            title="Remove member"
            secondary
            disabled={a.busy}
            onPress={() =>
              a.run(async () => {
                await api(
                  "/supplier/shops/" + shop.id + "/members/" + m.id,
                  "DELETE",
                );
                await refresh();
              }, "Member removed.")
            }
          />
        </View>
      ))}
      <Field
        label="Team member email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <View style={s.row}>
        {["staff", "manager"].map((x) => (
          <Choice
            key={x}
            label={x}
            selected={role === x}
            onPress={() => setRole(x)}
          />
        ))}
      </View>
      <Button
        title="Add / update member"
        secondary
        disabled={a.busy || !email}
        onPress={() =>
          a.run(async () => {
            await api("/supplier/shops/" + shop.id + "/members", "POST", {
              email,
              role,
            });
            setEmail("");
            await refresh();
          }, "Team access updated.")
        }
      />
      <Feedback {...a} />
    </Card>
  );
}
