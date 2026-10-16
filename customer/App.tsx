import React from 'react';
import {View, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider, Login, Register, Marketplace, PartDetail, Garage, ShopDetail, CustomerRequests, Assistant, Simulator, Profile, AppTabs} from '@inficarx/mobile';
import {NavigationRoot, useCurrentRoute} from './packages/mobile/src/navigation';

const screens = {
  '/(tabs)/marketplace': Marketplace,
  '/(tabs)/ai': Assistant,
  '/(tabs)/simulator': Simulator,
  '/(tabs)/profile': Profile,
  '/(auth)/login': Login,
  '/(auth)/register': Register,
  '/vehicles': Garage,
  '/requests': CustomerRequests,
  '/parts/[id]': PartDetail,
  '/shops/[id]': ShopDetail,
};
function Portal() {
  const route = useCurrentRoute();
  const path = route === '/' ? '/(tabs)/marketplace' : route;
  const Screen = screens[path as keyof typeof screens] || Marketplace;
  return <View style={{flex: 1, backgroundColor: '#101112'}}><Screen />{path.startsWith('/(tabs)') && <AppTabs kind="customer" />}</View>;
}
export default function App() {
  return <SafeAreaProvider><StatusBar barStyle="light-content" backgroundColor="#101112"/><SessionProvider kind="customer"><NavigationRoot><Portal /></NavigationRoot></SessionProvider></SafeAreaProvider>;
}
