/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { BudgetProvider } from './src/context/BudgetContext';
import { CategoryProvider } from './src/context/CategoryContext';
import { LoanProvider } from './src/context/LoanContext';
import { BudgetDetailsScreen, BudgetScreen, CategoryPickerScreen, HomeScreen, LoanScreen, RecurringPickerScreen, SectionsScreen } from './src/screens';
import { syncService } from './src/services/SyncService';
import { navigationRef } from './src/utils/navigationRef';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);

  return (
    <LoanProvider>
      <BudgetProvider>
      <CategoryProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '' }} />
          <Stack.Screen name="Sections" component={SectionsScreen} options={{ title: 'Sections' }} />
          <Stack.Screen name="BudgetDetails" component={BudgetDetailsScreen} options={{ title: 'New Budget' }} />
          <Stack.Screen name="CategoryPicker" component={CategoryPickerScreen} options={{ title: 'Category' }} />
          <Stack.Screen name="RecurringPicker" component={RecurringPickerScreen} options={{ title: 'Recurring' }} />
          {/* Keep legacy tabs as a separate screen if desired */}
          <Stack.Screen name="Tabs" options={{ headerShown: false }}>
            {() => (
              <Tab.Navigator>
                <Tab.Screen name="Budget" component={BudgetScreen} />
                <Tab.Screen name="Loans" component={LoanScreen} />
              </Tab.Navigator>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      </CategoryProvider>
    </BudgetProvider>
    </LoanProvider>
  );
}

