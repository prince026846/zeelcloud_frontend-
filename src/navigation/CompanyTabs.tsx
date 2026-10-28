import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ReportsScreen } from '../screens/company/ReportsScreen';
import { MoreScreen } from '../screens/company/MoreScreen';
import { EntryStack } from './stacks/EntryStack';
import { StockStack } from './stacks/StockStack';
import { useBaseTabScreenOptions, tabIcon } from './tabConfig';
import { useAuthStore } from '../store/authStore';
import type { CompanyTabParamList } from '../types';

const Tab = createBottomTabNavigator<CompanyTabParamList>();

export const CompanyTabs: React.FC = () => {
  const screenOptions = useBaseTabScreenOptions();
  const user = useAuthStore((s) => s.user);

  const isOwner = !user?.isSubuser;
  const allowedForms = user?.allowedForms || [];
  const hasSalesOrderAccess = isOwner || user?.isSalesOrderCreationAllowed === true;
  const hasQuotationAccess =
    isOwner ||
    allowedForms.some((f) => f.id === 14 || f.formName === 'Quotation' || f.formName === 'Quotations');
  const hasProformaAccess =
    isOwner ||
    allowedForms.some(
      (f) =>
        f.id === 15 ||
        f.formName === 'Proforma Invoice' ||
        f.formName === 'Pro Forma Invoice' ||
        f.formName === 'Performa' ||
        f.formName === 'Performa Invoice'
    );

  const canAccessEntry = hasSalesOrderAccess || hasQuotationAccess || hasProformaAccess;

  return (
  <Tab.Navigator screenOptions={screenOptions}>
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ tabBarLabel: 'Dashboard', tabBarIcon: tabIcon('view-dashboard-outline') }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{ tabBarLabel: 'Reports', tabBarIcon: tabIcon('chart-box-outline') }}
    />
    <Tab.Screen
      name="Stocks"
      component={StockStack}
      options={{ tabBarLabel: 'Stocks', tabBarIcon: tabIcon('package-variant') }}
    />
    {canAccessEntry ? (
      <Tab.Screen
        name="Entry"
        component={EntryStack}
        options={{ tabBarLabel: 'Entry', tabBarIcon: tabIcon('pencil-box-multiple-outline') }}
      />
    ) : null}
    <Tab.Screen
      name="More"
      component={MoreScreen}
      options={{ tabBarLabel: 'More', tabBarIcon: tabIcon('dots-horizontal') }}
    />
  </Tab.Navigator>
  );
};
