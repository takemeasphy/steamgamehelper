import { useState } from "react";
import Splash from "./ui/components/Splash";
import ScanScreen from "./ScanScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <Splash onContinue={() => setShowSplash(false)} />;
  }

  return <ScanScreen />;
}
