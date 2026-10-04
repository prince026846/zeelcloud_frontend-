import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountTabs } from './AccountTabs';
import { CompanyTabs } from './CompanyTabs';
import { SalesOsStack } from './stacks/SalesOsStack';
import { PurchaseOsStack } from './stacks/PurchaseOsStack';
import { SalesRegisterStack } from './stacks/SalesRegisterStack';
import { PurchaseRegisterStack } from './stacks/PurchaseRegisterStack';
import { GpRegisterStack } from './stacks/GpRegisterStack';
import { GpOsStack } from './stacks/GpOsStack';
import { StockStack } from './stacks/StockStack';
import { MachineWiseStack } from './stacks/MachineWiseStack';
import { BankCashLedgerScreen } from '../screens/ledger/BankCashLedgerScreen';
import { BankCashLedgerDetailScreen } from '../screens/ledger/BankCashLedgerDetailScreen';
import { PartyLedgerScreen } from '../screens/ledger/PartyLedgerScreen';
import { PartyLedgerDetailScreen } from '../screens/ledger/PartyLedgerDetailScreen';
import { LedgerDetailsScreen } from '../screens/ledger/LedgerDetailsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ContactScreen } from '../screens/ContactScreen';
import type { AppStackParamList } from '../types';

const Stack = createNativeStackNavigator<AppStackParamList>();

// Modules (and About/Contact) live here as siblings of the tab contexts so they
// push *over* the bottom tab bars with a back button.
export const AppNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AccountTabs" component={AccountTabs} />
    <Stack.Screen name="Company" component={CompanyTabs} />
    <Stack.Screen name="SalesOsStack" component={SalesOsStack} />
    <Stack.Screen name="PurchaseOsStack" component={PurchaseOsStack} />
    <Stack.Screen name="SalesRegisterStack" component={SalesRegisterStack} />
    <Stack.Screen name="PurchaseRegisterStack" component={PurchaseRegisterStack} />
    <Stack.Screen name="GpRegisterStack" component={GpRegisterStack} />
    <Stack.Screen name="GpOsStack" component={GpOsStack} />
    <Stack.Screen name="StockStack" component={StockStack} />
    <Stack.Screen name="MachineWiseStack" component={MachineWiseStack} />
    <Stack.Screen name="BankCashLedger" component={BankCashLedgerScreen} />
    <Stack.Screen name="BankCashLedgerDetail" component={BankCashLedgerDetailScreen} />
    <Stack.Screen name="PartyLedger" component={PartyLedgerScreen} />
    <Stack.Screen name="PartyLedgerDetail" component={PartyLedgerDetailScreen} />
    <Stack.Screen name="LedgerDetails" component={LedgerDetailsScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="Contact" component={ContactScreen} />
  </Stack.Navigator>
);
