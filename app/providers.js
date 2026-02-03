import { ClerkProvider } from "@clerk/nextjs";

export default function Providers({ children }) {
  return (
    <ClerkProvider>
        {children}
    </ClerkProvider>
  );
}
