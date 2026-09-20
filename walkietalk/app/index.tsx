import { Redirect } from 'expo-router';

/** Entry point — routing is handled by the auth guard in _layout. */
export default function Index() {
  return <Redirect href="/(app)" />;
}
