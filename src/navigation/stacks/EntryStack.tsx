import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EntryHubScreen } from '../../screens/entry/EntryHubScreen';
import type { EntryStackParamList } from '../../types';

const Stack = createNativeStackNavigator<EntryStackParamList>();

export const EntryStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntryHub" component={EntryHubScreen} />
    </Stack.Navigator>
  );
};
