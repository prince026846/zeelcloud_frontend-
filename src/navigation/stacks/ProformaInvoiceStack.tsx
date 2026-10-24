import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProformaInvoiceHubScreen } from '../../screens/proforma/ProformaInvoiceHubScreen';
import { ProformaInvoiceListScreen } from '../../screens/proforma/ProformaInvoiceListScreen';
import { CreateProformaInvoiceScreen } from '../../screens/proforma/CreateProformaInvoiceScreen';
import { ProformaInvoiceDetailScreen } from '../../screens/proforma/ProformaInvoiceDetailScreen';
import { QuotationItemMasterScreen } from '../../screens/quotation/QuotationItemMasterScreen';
import type { ProformaInvoiceStackParamList } from '../../types';

const Stack = createNativeStackNavigator<ProformaInvoiceStackParamList>();

export const ProformaInvoiceStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProformaInvoiceHub" component={ProformaInvoiceHubScreen} />
    <Stack.Screen name="ProformaInvoiceList" component={ProformaInvoiceListScreen} />
    <Stack.Screen name="CreateProformaInvoice" component={CreateProformaInvoiceScreen} />
    <Stack.Screen name="ProformaInvoiceDetail" component={ProformaInvoiceDetailScreen} />
    <Stack.Screen name="ProformaInvoiceItemMaster" component={QuotationItemMasterScreen} />
  </Stack.Navigator>
);
