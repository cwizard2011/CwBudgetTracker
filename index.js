/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import App from './App';
import { name as appName } from './app.json';

if (process.env.NODE_ENV === 'production') {
  // Silence console logs in production
  // Keep console.error intact for critical crash logs
  // eslint-disable-next-line no-console
  console.log = () => {};
  // eslint-disable-next-line no-console
  console.info = () => {};
  // eslint-disable-next-line no-console
  console.debug = () => {};
}

AppRegistry.registerComponent(appName, () => App);
