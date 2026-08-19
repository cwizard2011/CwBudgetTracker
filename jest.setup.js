/* eslint-env jest */

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock(
  '@react-native-community/netinfo',
  () => require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('@react-native-firebase/firestore', () => {
  const collection = {
    doc: jest.fn(() => ({set: jest.fn()})),
    get: jest.fn(async () => ({docs: []})),
  };
  const batch = {
    commit: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
  };
  return () => ({batch: () => batch, collection: () => collection});
});

jest.mock('@react-native-firebase/storage', () => () => ({
  ref: jest.fn(() => ({
    getDownloadURL: jest.fn(),
    putFile: jest.fn(),
  })),
}));

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {},
  isErrorWithCode: () => false,
  keepLocalCopy: jest.fn(),
  pick: jest.fn(),
  types: {},
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  DownloadDirectoryPath: '/tmp',
  exists: jest.fn(),
  readDir: jest.fn(async () => []),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    addScopes: jest.fn(),
    configure: jest.fn(),
    getCurrentUser: jest.fn(),
    getTokens: jest.fn(),
    hasPlayServices: jest.fn(),
    hasPreviousSignIn: jest.fn(),
    signIn: jest.fn(),
    signInSilently: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED'},
}));

jest.mock('./src/services/CurrencyService', () => ({
  currencyService: {
    addListener: jest.fn(() => jest.fn()),
    convert: jest.fn(amount => amount),
    getCachedRates: jest.fn(async () => null),
    initAndSchedule: jest.fn(async () => null),
    stop: jest.fn(),
  },
}));

jest.mock('./src/services/SyncService', () => ({
  syncService: {start: jest.fn(), stop: jest.fn()},
}));
