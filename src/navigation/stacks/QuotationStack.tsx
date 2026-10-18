import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuotationHubScreen } from '../../screens/quotation/QuotationHubScreen';
import { QuotationListScreen } from '../../screens/quotation/QuotationListScreen';
import { CreateQuotationScreen } from '../../screens/quotation/CreateQuotationScreen';
import { QuotationDetailScreen } from '../../screens/quotation/QuotationDetailScreen';
import { QuotationItemMasterScreen } from '../../screens/quotation/QuotationItemMasterScreen';
import type { QuotationStackParamList } from '../../types';

const Stack = createNativeStackNavigator<QuotationStackParamList>();

export const QuotationStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="QuotationHub" component={QuotationHubScreen} />
    <Stack.Screen name="QuotationList" component={QuotationListScreen} />
    <Stack.Screen name="CreateQuotation" component={CreateQuotationScreen} />
    <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
    <Stack.Screen name="QuotationItemMaster" component={QuotationItemMasterScreen} />
  </Stack.Navigator>
);
