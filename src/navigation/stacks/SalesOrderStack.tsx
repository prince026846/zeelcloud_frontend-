import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SalesOrderHubScreen } from '../../screens/salesOrder/SalesOrderHubScreen';
import { SalesOrderListScreen } from '../../screens/salesOrder/SalesOrderListScreen';
import { CreateSalesOrderScreen } from '../../screens/salesOrder/CreateSalesOrderScreen';
import { useAuthStore } from '../../store/authStore';
import type { SalesOrderStackParamList } from '../../types';

const Stack = createNativeStackNavigator<SalesOrderStackParamList>();

export const SalesOrderStack: React.FC = () => {
  const hasAccess = useAuthStore((s) => s.user?.isSalesOrderCreationAllowed === true);

  if (!hasAccess) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SalesOrderHub" component={SalesOrderHubScreen} />
      <Stack.Screen name="SalesOrderList" component={SalesOrderListScreen} />
      <Stack.Screen name="CreateSalesOrder" component={CreateSalesOrderScreen} />
    </Stack.Navigator>
  );
};
