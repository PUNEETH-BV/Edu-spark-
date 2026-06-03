import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';
import '@xyflow/react/dist/style.css';


export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
