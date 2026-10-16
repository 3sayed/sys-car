import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { WebView } from 'react-native-webview';
const C = { bg: '#101112', card: '#252729', raised: '#343638', line: '#454749', text: '#f7f5f1', muted: '#aaabad', orange: '#ff641c', red: '#ff9a8d' };
const metroHost = NativeModules.SourceCode?.scriptURL?.match(/^https?:\/\/([^:/]+)/)?.[1];
const host = metroHost && !['localhost', '127.0.0.1', '0.0.0.0'].includes(metroHost) ? metroHost : 'localhost';
let API = ('http://localhost:8000/api/v1').replace(/\/\/(localhost|127\.0\.0\.1)(?=:)/, `//${host}`);
function configureApi(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Enter a valid server URL.');
  API = `${url.protocol}//${url.host}/api/v1`;
}
type PickedFile = {uri: string; name: string | null; type: string | null};
const tokenService = 'inficarx-admin-token';
const serverService = 'inficarx-admin-server';
async function readToken() { const saved = await Keychain.getGenericPassword({service: tokenService}); return saved ? saved.password : null; }
async function writeToken(value: string) { await Keychain.setGenericPassword(tokenService, value, {service: tokenService}); }
async function clearToken() { await Keychain.resetGenericPassword({service: tokenService}); }
type Row = { id: number; name?: string; status?: string; title?: string; part_number?: string; manufacturer_id?: number; category_id?: number; source_reference?: string; procedure_id?: number; error_message?: string; processed_rows?: number; total_rows?: number; make?: string; model?: string; engine_code?: string; market?: string };
type Data = { stats: Record<string, number>; parts: Row[]; shops: Row[]; variants: Row[]; repair_procedures: Row[]; simulation_jobs: Row[]; catalog_imports: Row[]; catalog_import_errors: Row[]; simulation_models: Row[]; catalog_sources: Row[]; part_manufacturers: Row[]; part_categories: Row[] };
type Tab = 'overview' | 'catalog' | 'suppliers' | 'reviews' | 'tools';
type Payload = Record<string, unknown> | FormData;

async function request<T>(path: string, token: string | null, method = 'GET', body?: Payload): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, { method, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Cannot reach the admin API at ${API}. Check that the phone and computer share a network.`);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.errors ? Object.values(result.errors).flat().join('\n') : result.message || 'Request failed.');
  return result as T;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[s.card, style]}>{children}</View>; }
function Label({ children }: { children: React.ReactNode }) { return <Text style={s.label}>{children}</Text>; }
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.buttonSecondary, (pressed || disabled) && { opacity: disabled ? .45 : .75 }]}><Text style={[s.buttonText, secondary && { color: C.text }]}>{title}</Text><Ionicons name="arrow-forward" color={C.text} size={17} /></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry, multiline, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; multiline?: boolean; keyboardType?: 'default' | 'numeric' | 'email-address' }) {
  return <View style={{ gap: 7 }}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input, multiline && { minHeight: 92, textAlignVertical: 'top' }]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#77797b" secureTextEntry={secureTextEntry} multiline={multiline} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} /></View>;
}
function Select({ label, rows, value, onChange, title }: { label: string; rows: Row[]; value: number | null; onChange: (value: number) => void; title?: (row: Row) => string }) {
  return <View style={{ gap: 8 }}><Text style={s.fieldLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{rows.map(row => <Pressable key={row.id} onPress={() => onChange(row.id)} style={[s.chip, value === row.id && s.chipActive]}><Text style={{ color: value === row.id ? C.orange : C.text, fontSize: 13, fontWeight: '600' }}>{title ? title(row) : row.name || row.title || `#${row.id}`}</Text></Pressable>)}</ScrollView></View>;
}
function Empty({ text }: { text: string }) { return <Text style={s.muted}>{text}</Text>; }
async function pickFile(type: string | string[]) {
  try { const result = await pick({type: Array.isArray(type) ? type : [type], allowMultiSelection: false}); return result[0] || null; } catch (e) { if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return null; throw e; }
}
function formFile(field: string, file: PickedFile, values: Record<string, string | number>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.append(key, String(value));
  form.append(field, { uri: file.uri, name: file.name || 'upload', type: file.type || 'application/octet-stream' } as any);
  return form;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null), [ready, setReady] = useState(false), [name, setName] = useState(''), [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Data | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [server, setServer] = useState(API.replace(/\/api\/v1$/, ''));
  const [showServer, setShowServer] = useState(false);
  const refresh = useCallback(async (auth: string) => {
    setLoading(true); setError('');
    try { setData(await request<Data>('/admin/dashboard', auth)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { let active = true; (async () => { try { const endpoint = await Keychain.getGenericPassword({service: serverService}); if (endpoint) { configureApi(endpoint.password); if (active) setServer(API.replace(/\/api\/v1$/, '')); } const saved = await readToken(); if (saved && active) { try { const user = await request<{ user: { name: string } }>('/me', saved); setName(user.user.name); setToken(saved); await refresh(saved); } catch { await clearToken(); } } } catch (e) { if (active) setError((e as Error).message); } finally { if (active) setReady(true); } })(); return () => { active = false; }; }, [refresh]);
  async function signIn() {
    setBusy(true); setError('');
    try { configureApi(server); await Keychain.setGenericPassword(serverService, API, {service: serverService}); const result = await request<{ token: string; user: { name: string } }>('/admin/login', null, 'POST', { email, password }); await writeToken(result.token); setName(result.user.name); setToken(result.token); setPassword(''); await refresh(result.token); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function signOut() { try { if (token) await request('/auth/logout', token, 'POST'); } catch {} await clearToken(); setToken(null); setData(null); setTab('overview'); }
  async function action(path: string, body: Payload, success: string) {
    if (!token) return false;
    setBusy(true); setError('');
    try { await request('/admin/' + path, token, 'POST', body); await refresh(token); Alert.alert('Saved', success); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  }
  return <SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor={C.bg} /><SafeAreaView style={s.page}><ScrollView keyboardShouldPersistTaps="handled" refreshControl={token ? <RefreshControl refreshing={loading} onRefresh={() => void refresh(token)} tintColor={C.orange} /> : undefined} contentContainerStyle={s.content}>
    <View style={s.top}><Text style={s.brand}>infiCar<Text style={{ color: C.orange }}>X</Text><Text style={{ color: C.muted, fontSize: 12, fontWeight: '500' }}> / ADMIN</Text></Text><View style={s.topIcon}><Ionicons name="scan-outline" color={C.orange} size={20} /></View></View>
    {!ready ? <ActivityIndicator color={C.orange} /> : !token ? <><View style={s.hero}><View style={s.orb} /><View style={s.ring} /><Label>ADMINISTRATION / CONTROL CENTER</Label><Ionicons name="speedometer-outline" size={78} color={C.text} style={{ alignSelf: 'center', marginVertical: 22 }} /><Text style={s.heroTitle}>The whole marketplace. In your hands.</Text></View><Card><Text style={s.heading}>Administrator sign in</Text><Text style={s.muted}>Secure access to your catalog, suppliers and review workflow.</Text><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry /><Button title="Server settings" secondary onPress={() => setShowServer(!showServer)} />{showServer && <Field label="Server URL" value={server} onChangeText={setServer} placeholder="http://192.168.1.10:8000" />}{!!error && <Text style={s.error}>{error}</Text>}<Button title={busy ? 'Signing in…' : 'Sign in'} onPress={() => void signIn()} disabled={busy || !email || !password} /></Card></> : <>
      <View style={s.hero}><View style={s.orb} /><View style={s.ring} /><Label>MARKETPLACE / LIVE WORKSPACE</Label><Text style={s.heroTitle}>Everything in motion.<Text style={{ color: '#d1cfcc' }}> Everything in view.</Text></Text><Text style={{ color: C.text, marginTop: 12 }}>Welcome back, {name}.</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{([['overview','Overview','grid-outline'],['catalog','Catalog','layers-outline'],['suppliers','Suppliers','storefront-outline'],['reviews','Reviews','checkmark-circle-outline'],['tools','Tools','construct-outline']] as const).map(([key, title, icon]) => <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}><Ionicons name={icon} color={tab === key ? C.orange : C.muted} size={17} /><Text style={{ color: tab === key ? C.text : C.muted, fontWeight: '700', fontSize: 12 }}>{title}</Text></Pressable>)}</ScrollView>
      {!!error && <Card style={{ borderColor: C.red }}><Text style={s.error}>{error}</Text><Button title="Try again" secondary onPress={() => void refresh(token)} /></Card>}
      {!data && loading ? <ActivityIndicator color={C.orange} /> : data && <>
        {tab === 'overview' && <Overview data={data} setTab={setTab} />}
        {tab === 'catalog' && <><Catalog data={data} action={action} busy={busy} /><UploadPartImage data={data} action={action} busy={busy} /></>}
        {tab === 'suppliers' && <Suppliers data={data} action={action} busy={busy} />}
        {tab === 'reviews' && <Reviews data={data} action={action} busy={busy} token={token} />}
        {tab === 'tools' && <><Tools data={data} action={action} busy={busy} /><UploadAssets data={data} action={action} busy={busy} /></>}
      </>}
      <Button title="Sign out" secondary onPress={() => void signOut()} />
    </>}
  </ScrollView></SafeAreaView></SafeAreaProvider>;
}

function Overview({ data, setTab }: { data: Data; setTab: (tab: Tab) => void }) {
  return <><Label>PERFORMANCE / AT A GLANCE</Label><View style={s.stats}>{Object.entries(data.stats).map(([key, value]) => <Card key={key} style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.muted}>{key.replaceAll('_', ' ')}</Text></Card>)}</View><Card><Label>REQUIRES ATTENTION</Label><Text style={s.heading}>{data.repair_procedures.filter(p => p.status === 'pending_review').length} procedures awaiting review</Text><Text style={s.muted}>Review sources, fitment and generated simulations before publishing.</Text><Button title="Open reviews" onPress={() => setTab('reviews')} /></Card><Card><Label>RECENT ACTIVITY</Label>{data.simulation_jobs.slice(0, 5).map(job => <View key={job.id} style={s.listRow}><Text style={s.text}>Simulation #{job.id}</Text><Text style={s.muted}>{job.status}</Text></View>)}{!data.simulation_jobs.length && <Empty text="No simulation jobs yet." />}</Card></>;
}

function Catalog({ data, action, busy }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean }) {
  const [number, setNumber] = useState(''), [name, setName] = useState(''), [description, setDescription] = useState('');
  const [manufacturer, setManufacturer] = useState<number | null>(null), [category, setCategory] = useState<number | null>(null), [vehicle, setVehicle] = useState<number | null>(null);
  return <><Label>CATALOG / MANAGEMENT</Label><Text style={s.heading}>Parts in focus</Text><Card><Text style={s.heading}>Add or update a part</Text><Text style={s.muted}>Part numbers are normalized and linked to an exact vehicle fitment.</Text><Select label="Manufacturer" rows={data.part_manufacturers} value={manufacturer} onChange={setManufacturer} /><Select label="Category" rows={data.part_categories} value={category} onChange={setCategory} /><Select label="Vehicle fitment" rows={data.variants} value={vehicle} onChange={setVehicle} title={v => `${v.make} ${v.model} · ${v.engine_code}`} /><Field label="Part number" value={number} onChangeText={setNumber} /><Field label="Name" value={name} onChangeText={setName} /><Field label="Description" value={description} onChangeText={setDescription} multiline /><Button title="Save catalog part" disabled={busy || !manufacturer || !category || !vehicle || !number || !name} onPress={() => void action('parts', { manufacturer_id: manufacturer, category_id: category, vehicle_variant_id: vehicle, part_number: number, name, description }, 'Catalog part saved.').then(ok => { if (ok) { setNumber(''); setName(''); setDescription(''); } })} /></Card><Label>RECENT PARTS / {data.stats.parts || 0}</Label>{data.parts.map(p => <Card key={p.id}><View style={s.listRow}><View style={{ flex: 1 }}><Text style={s.heading}>{p.name}</Text><Text style={s.muted}>{p.part_number}</Text></View><Text style={s.id}>#{p.id}</Text></View></Card>)}{!data.parts.length && <Empty text="No parts in the catalog yet." />}</>;
}

function Suppliers({ data, action, busy }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean }) {
  return <><Label>SUPPLIER NETWORK / ACCESS</Label><Text style={s.heading}>Shops and status</Text><Text style={s.muted}>Suspended shops are hidden from the marketplace and cannot update listings.</Text>{data.shops.map(shop => <Card key={shop.id}><View style={s.listRow}><View style={{ flex: 1 }}><Text style={s.heading}>{shop.name}</Text><Text style={s.muted}>Shop #{shop.id}</Text></View><Text style={[s.status, shop.status === 'active' && { color: C.orange }]}>{shop.status}</Text></View><Button title={shop.status === 'active' ? 'Suspend shop' : 'Activate shop'} secondary={shop.status === 'active'} disabled={busy} onPress={() => Alert.alert(shop.status === 'active' ? 'Suspend shop?' : 'Activate shop?', `Update ${shop.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => void action(`shops/${shop.id}`, { status: shop.status === 'active' ? 'suspended' : 'active' }, 'Supplier status updated.') }])} /></Card>)}{!data.shops.length && <Empty text="No supplier shops yet." />}</>;
}

function Reviews({ data, action, busy, token }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean; token: string }) {
  const [procedure, setProcedure] = useState<number | null>(null), [model, setModel] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null), [previewProcedure, setPreviewProcedure] = useState<number | null>(null), [previewed, setPreviewed] = useState<number[]>([]), [previewError, setPreviewError] = useState('');
  const review = (p: Row, status: 'approved' | 'rejected') => Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'} procedure?`, 'Confirm that you reviewed the source, vehicle fitment, component mapping and instructions.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => void action(`reviews/${p.id}`, { status, review_confirmation: true }, 'Review recorded.') }]);
  async function preview(job: Row, procedureId: number) {
    try {
      setPreviewError('');
      const result = await request<{ url: string }>(`/admin/simulations/${job.id}/preview`, token);
      setPreviewProcedure(procedureId);
      setPreviewUrl(result.url);
    } catch (e) { setPreviewError((e as Error).message); }
  }
  return <>
    <Label>SIMULATIONS / REVIEW WORKFLOW</Label><Text style={s.heading}>Review queue</Text>
    <Card><Text style={s.heading}>Generate a candidate</Text><Text style={s.muted}>Choose a draft procedure and a source model. The result requires review before publication.</Text><Select label="Procedure" rows={data.repair_procedures} value={procedure} onChange={setProcedure} /><Select label="Source model" rows={data.simulation_models} value={model} onChange={setModel} /><Button title="Generate candidate" disabled={busy || !procedure || !model} onPress={() => void action('simulations', { procedure_id: procedure, source_model_id: model }, 'Simulation queued.')} /></Card>
    {!!previewError && <Text style={s.error}>{previewError}</Text>}
    {data.repair_procedures.map(p => {
      const job = data.simulation_jobs.find(j => j.procedure_id === p.id && j.status === 'completed');
      return <Card key={p.id}><View style={s.listRow}><Text style={[s.heading, { flex: 1 }]}>{p.title}</Text><Text style={s.status}>{p.status}</Text></View><Text style={s.muted}>Source: {p.source_reference || 'No source reference'}</Text>{p.status === 'pending_review' && <View style={{ gap: 8 }}>{job && <Button title="Preview generated model" secondary onPress={() => void preview(job, p.id)} />}<Button title="Approve publication" disabled={busy || !previewed.includes(p.id)} onPress={() => review(p, 'approved')} /><Button title="Reject" secondary disabled={busy} onPress={() => review(p, 'rejected')} />{!previewed.includes(p.id) && <Text style={s.muted}>Open the 3D preview before approving.</Text>}</View>}</Card>;
    })}
    {!data.repair_procedures.length && <Empty text="No procedures to review yet." />}
    <Label>PROCESSING JOBS</Label>{data.simulation_jobs.map(job => <Card key={job.id}><View style={s.listRow}><Text style={s.text}>Job #{job.id}</Text><Text style={s.status}>{job.status}</Text></View>{!!job.error_message && <Text style={s.error}>{job.error_message}</Text>}</Card>)}
    <Modal visible={!!previewUrl} animationType="slide" onRequestClose={() => setPreviewUrl(null)}><SafeAreaView style={s.page}><View style={{ padding: 16 }}><Button title="Close preview" secondary onPress={() => setPreviewUrl(null)} /></View>{previewUrl && <WebView originWhitelist={['*']} source={{ uri: previewUrl }} onLoadEnd={() => { if (previewProcedure) setPreviewed(current => [...new Set([...current, previewProcedure])]); }} onError={() => setPreviewError('Could not load the 3D preview.')} style={{ flex: 1, backgroundColor: C.bg }} />}</SafeAreaView></Modal>
  </>;
}

function Tools({ data, action, busy }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean }) {
  const [sourceName, setSourceName] = useState(''), [sourceType, setSourceType] = useState('manual'), [license, setLicense] = useState('');
  const [taxonomy, setTaxonomy] = useState(''), [taxonomyType, setTaxonomyType] = useState('category');
  const [make, setMake] = useState(''), [model, setModel] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [engine, setEngine] = useState(''), [trim, setTrim] = useState(''), [market, setMarket] = useState('');
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [reference, setReference] = useState(''), [steps, setSteps] = useState(''), [vehicle, setVehicle] = useState<number | null>(null), [part, setPart] = useState<number | null>(null);
  return <><Label>ADMIN / TOOLS</Label><Text style={s.heading}>Build the marketplace</Text><Card><Text style={s.heading}>Register a source</Text><Field label="Source name" value={sourceName} onChangeText={setSourceName} /><View style={s.chipRow}>{['manual','csv','licensed_model'].map(type => <Pressable key={type} style={[s.chip, sourceType === type && s.chipActive]} onPress={() => setSourceType(type)}><Text style={s.text}>{type}</Text></Pressable>)}</View><Field label="License or permission reference" value={license} onChangeText={setLicense} /><Button title="Record source" disabled={busy || !sourceName || !license} onPress={() => void action('sources', { name: sourceName, source_type: sourceType, license_reference: license }, 'Source recorded.').then(ok => { if (ok) { setSourceName(''); setLicense(''); } })} /></Card><Card><Text style={s.heading}>Add taxonomy</Text><View style={s.chipRow}>{['category','manufacturer'].map(type => <Pressable key={type} style={[s.chip, taxonomyType === type && s.chipActive]} onPress={() => setTaxonomyType(type)}><Text style={s.text}>{type}</Text></Pressable>)}</View><Field label="Name" value={taxonomy} onChangeText={setTaxonomy} /><Button title="Save taxonomy" disabled={busy || !taxonomy} onPress={() => void action('taxonomy', { type: taxonomyType, name: taxonomy }, 'Taxonomy saved.').then(ok => { if (ok) setTaxonomy(''); })} /></Card><Card><Text style={s.heading}>Add vehicle variant</Text><View style={s.twoColumns}><View style={s.column}><Field label="Make" value={make} onChangeText={setMake} /></View><View style={s.column}><Field label="Model" value={model} onChangeText={setModel} /></View></View><View style={s.twoColumns}><View style={s.column}><Field label="Year from" value={from} onChangeText={setFrom} keyboardType="numeric" /></View><View style={s.column}><Field label="Year to" value={to} onChangeText={setTo} keyboardType="numeric" /></View></View><Field label="Engine code" value={engine} onChangeText={setEngine} /><Field label="Trim" value={trim} onChangeText={setTrim} /><Field label="Market" value={market} onChangeText={setMarket} /><Button title="Save vehicle" disabled={busy || !make || !model || !from || !to || !engine || !trim || !market} onPress={() => void action('vehicles', { make, model, year_from: Number(from), year_to: Number(to), engine_code: engine, trim, market }, 'Vehicle variant saved.')} /></Card><Card><Text style={s.heading}>Create draft procedure</Text><Field label="Title" value={title} onChangeText={setTitle} /><Field label="Description" value={description} onChangeText={setDescription} multiline /><Field label="Authoritative source reference" value={reference} onChangeText={setReference} /><Select label="Vehicle" rows={data.variants} value={vehicle} onChange={setVehicle} title={v => `${v.make} ${v.model} · ${v.engine_code}`} /><Select label="Part" rows={data.parts} value={part} onChange={setPart} /><Field label="Steps, one per line" value={steps} onChangeText={setSteps} multiline /><Button title="Create draft" disabled={busy || !title || !description || !reference || !vehicle || !part || !steps} onPress={() => void action('procedures', { title, description, source_reference: reference, vehicle_variant_id: vehicle, part_id: part, steps }, 'Draft procedure created.')} /></Card><Card><Text style={s.heading}>Catalog imports</Text>{data.catalog_imports.map(row => <View key={row.id} style={s.listRow}><Text style={s.text}>Import #{row.id}</Text><Text style={s.muted}>{row.status} · {row.processed_rows}/{row.total_rows}</Text></View>)}{!data.catalog_imports.length && <Empty text="No imports yet." />}{data.catalog_import_errors.slice(0, 8).map(row => <Text key={row.id} style={s.error}>{row.error_message}</Text>)}</Card></>;
}

function UploadPartImage({ data, action, busy }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean }) {
  const [part, setPart] = useState<number | null>(null);
  const [source, setSource] = useState<number | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  return <Card><Label>CATALOG / MEDIA</Label><Text style={s.heading}>Add a part image</Text><Select label="Part" rows={data.parts} value={part} onChange={setPart} /><Select label="Licensed source" rows={data.catalog_sources} value={source} onChange={setSource} /><Button title={file ? `Selected: ${file.name}` : 'Choose image'} secondary onPress={() => void pickFile(['image/jpeg','image/png','image/webp']).then(setFile)} /><Button title="Upload image" disabled={busy || !part || !source || !file} onPress={() => { if (file && part && source) void action('part-images', formFile('image', file, { part_id: part, source_id: source }), 'Part image uploaded.').then(ok => { if (ok) setFile(null); }); }} /></Card>;
}

function UploadAssets({ data, action, busy }: { data: Data; action: (path: string, body: Payload, success: string) => Promise<boolean>; busy: boolean }) {
  const [importSource, setImportSource] = useState<number | null>(null);
  const [csv, setCsv] = useState<PickedFile | null>(null);
  const [modelSource, setModelSource] = useState<number | null>(null);
  const [glb, setGlb] = useState<PickedFile | null>(null);
  const [name, setName] = useState(''), [meshes, setMeshes] = useState('rotor,caliper,pad_inner,pad_outer');
  return <><Card><Label>IMPORT / CATALOG</Label><Text style={s.heading}>Import CSV</Text><Text style={s.muted}>Expected columns: manufacturer, category, part_number, name, description, vehicle_variant_id.</Text><Select label="Source" rows={data.catalog_sources} value={importSource} onChange={setImportSource} /><Button title={csv ? `Selected: ${csv.name}` : 'Choose CSV file'} secondary onPress={() => void pickFile('*/*').then(setCsv)} /><Button title="Queue import" disabled={busy || !importSource || !csv} onPress={() => { if (csv && importSource) void action('imports', formFile('file', csv, { source_id: importSource }), 'Catalog import queued.').then(ok => { if (ok) setCsv(null); }); }} /></Card><Card><Label>SIMULATIONS / SOURCE ASSET</Label><Text style={s.heading}>Upload structured GLB</Text><Field label="Model name" value={name} onChangeText={setName} /><Select label="Licensed source" rows={data.catalog_sources} value={modelSource} onChange={setModelSource} /><Field label="Exact mesh names, comma separated" value={meshes} onChangeText={setMeshes} /><Button title={glb ? `Selected: ${glb.name}` : 'Choose GLB file'} secondary onPress={() => void pickFile('*/*').then(setGlb)} /><Button title="Upload model" disabled={busy || !name || !modelSource || !meshes || !glb} onPress={() => { if (glb && modelSource) void action('models', formFile('model', glb, { name, source_id: modelSource, mesh_names: meshes }), 'Model uploaded.').then(ok => { if (ok) { setGlb(null); setName(''); } }); }} /></Card></>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg }, content: { padding: 22, paddingBottom: 52, gap: 22, maxWidth: 760, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -1 }, topIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 205, borderRadius: 28, borderWidth: 1, borderColor: '#55504c', backgroundColor: '#292a2b', padding: 24, justifyContent: 'space-between', overflow: 'hidden' }, orb: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#603821', right: -50, top: -82, opacity: .75 }, ring: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: '#ac6747', right: -10, top: -48, opacity: .7 }, heroTitle: { color: C.text, fontSize: 32, fontWeight: '700', letterSpacing: -1.3, lineHeight: 38 },
  label: { color: C.orange, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, heading: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -.4 }, text: { color: C.text, fontSize: 14 }, muted: { color: C.muted, fontSize: 13, lineHeight: 20 }, error: { color: C.red, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 24, padding: 20, gap: 13, overflow: 'hidden' },
  button: { backgroundColor: C.orange, borderRadius: 14, minHeight: 49, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, buttonSecondary: { backgroundColor: C.raised, borderWidth: 1, borderColor: C.line }, buttonText: { color: C.text, fontSize: 14, fontWeight: '800' },
  input: { color: C.text, backgroundColor: '#191b1d', borderColor: C.line, borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 }, fieldLabel: { color: '#dad8d4', fontSize: 13, fontWeight: '600' },
  tabs: { gap: 8, paddingVertical: 2 }, tab: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, paddingHorizontal: 14, minHeight: 42, borderRadius: 99 }, tabActive: { backgroundColor: '#423027', borderColor: C.orange },
  chip: { borderRadius: 99, borderWidth: 1, borderColor: C.line, backgroundColor: C.raised, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { borderColor: C.orange, backgroundColor: '#423027' }, chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stat: { width: '48%', minHeight: 112, justifyContent: 'space-between' }, statValue: { fontSize: 34, color: C.orange, fontWeight: '800' },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, status: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }, id: { color: C.orange, fontSize: 12, fontWeight: '800' }, twoColumns: { flexDirection: 'row', gap: 10 }, column: { flex: 1 }
});




