/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Hide dev menu overlay warnings
LogBox.ignoreAllLogs(true);

// Disable the dev menu if in dev mode
if (__DEV__) {
  require('react-native').DevSettings.setHotLoadingEnabled(false);
}

AppRegistry.registerComponent(appName, () => App);
