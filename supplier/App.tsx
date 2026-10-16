import React from 'react';
import {View, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider, Login, Register, Marketplace, PartDetail, ShopDetail, CustomerRequests, SupplierRequests, Profile, Dashboard, Inventory, ManageShops, AppTabs} from '@inficarx/mobile';
import {NavigationRoot, useCurrentRoute} from './packages/mobile/src/navigation';

const screens = {
  '/(tabs)': Dashboard,
  '/(tabs)/index': Dashboard,
  '/(tabs)/inventory': Inventory,
  '/(tabs)/requests': SupplierRequests,
  '/(tabs)/profile': Profile,
  '/(auth)/login': Login,
  '/(auth)/register': Register,
  '/catalog': Marketplace,
  '/branches': ManageShops,
  '/parts/[id]': PartDetail,
  '/shops/[id]': ShopDetail,
  '/requests': CustomerRequests,
};
function Portal() {
  const route = useCurrentRoute();
  const path = route === '/' ? '/(tabs)' : route;
  const Screen = screens[path as keyof typeof screens] || Dashboard;
  return <View style={{flex: 1, backgroundColor: '#101112'}}><Screen />{path.startsWith('/(tabs)') && <AppTabs kind="supplier" />}</View>;
}
export default function App() {
  return <SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor="#101112"/><SessionProvider kind="supplier"><NavigationRoot><Portal /></NavigationRoot></SessionProvider></SafeAreaProvider>;
}
