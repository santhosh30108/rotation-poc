import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { Lock, Unlock, RotateCw, Monitor, Tablet, Smartphone, AlertCircle } from "lucide-react";

export default function Home() {
  const [isLocked, setIsLocked] = useState(false);
  const [orientation, setOrientation] = useState("unknown");
  const [rotationAttempt, setRotationAttempt] = useState(false);
  const [error, setError] = useState("");
  const [isAIPopupOpen, setIsAIPopupOpen] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  
  // No manual ref needed, using closure-based flag in useEffect

  useEffect(() => {
    if (typeof window !== "undefined" && screen.orientation) {
      setOrientation(screen.orientation.type);

      const handleOrientationChange = () => {
        setOrientation(screen.orientation.type);
        // Logical orientation change only happens when NOT locked
        // But we keep this for consistency
      };

      screen.orientation.addEventListener("change", handleOrientationChange);
      return () => screen.orientation.removeEventListener("change", handleOrientationChange);
    }
  }, []);

  useEffect(() => {
    if (!isLocked || !isPermissionGranted) return;

    // Track if we are currently showing an alert state
    let isAlerting = false;

    const handleDeviceOrientation = (event) => {
      const { beta, gamma } = event;
      
      let currentPhysical = "";
      // Sensitivity threshold (degrees)
      const THRESHOLD = 50;

      // Detect physical landscape vs portrait
      if (Math.abs(beta) > THRESHOLD && Math.abs(beta) < (180 - THRESHOLD)) {
        currentPhysical = "portrait";
      } else if (Math.abs(gamma) > THRESHOLD) {
        currentPhysical = "landscape";
      }

      if (currentPhysical) {
        const isCurrentlyPortrait = orientation.includes("portrait");
        const physicalIsPortrait = currentPhysical === "portrait";

        // If physical doesn't match logical lock
        if (isCurrentlyPortrait !== physicalIsPortrait) {
          // If we haven't alerted for THIS specific tilt yet
          if (!isAlerting) {
            setRotationAttempt(true);
            setIsAIPopupOpen(true);
            isAlerting = true;
            // The popup/inline alert visual will stay for a bit
            setTimeout(() => setRotationAttempt(false), 3000);
          }
        } else {
          // Device physically returned to the correct (locked) orientation
          // We reset the alerting flag so it can trigger again on next tilt
          isAlerting = false;
        }
      }
    };

    window.addEventListener("deviceorientation", handleDeviceOrientation);
    return () => window.removeEventListener("deviceorientation", handleDeviceOrientation);
  }, [isLocked, isPermissionGranted, orientation]);

  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setIsPermissionGranted(true);
          return true;
        } else {
          setError("Permission for rotation detection was denied.");
          return false;
        }
      } catch (err) {
        console.error("Error requesting orientation permission:", err);
        setError("Could not request orientation permission.");
        return false;
      }
    } else {
      // Non-iOS or older browsers
      setIsPermissionGranted(true);
      return true;
    }
  };

  const toggleLock = async () => {
    setError("");
    
    // Request permission on the first lock attempt (needs user gesture)
    if (!isPermissionGranted) {
      const granted = await requestOrientationPermission();
      if (!granted) return;
    }

    if (!isLocked) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        
        if (screen.orientation && screen.orientation.lock) {
          const currentType = screen.orientation.type;
          await screen.orientation.lock(currentType);
          setIsLocked(true);
          // Set initial physical orientation to match logical
          lastPhysicalOrientation.current = currentType.includes("portrait") ? "portrait" : "landscape";
          console.log(`✅ Screen locked to ${currentType}!`);
        } else {
          throw new Error("Orientation lock not supported on this browser.");
        }
      } catch (err) {
        console.log("❌", err.message);
        setError(err.message || "Failed to lock orientation.");
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } else {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
          setIsLocked(false);
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
          console.log("🔓 Screen unlocked!");
        }
      } catch (err) {
        console.log("❌ Failed to unlock:", err.message);
        setError("Failed to unlock orientation.");
      }
    }
  };

  const getOrientationIcon = () => {
    if (orientation.includes("portrait")) return <Smartphone className="w-8 h-8 text-blue-500" />;
    if (orientation.includes("landscape")) return <Monitor className="w-8 h-8 text-purple-500" />;
    return <Tablet className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col items-center justify-center p-6 relative">
      <Head>
        <title>Rotation Lock POC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <main className="z-10 w-full max-w-md space-y-8 text-center">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
            Orientation Control
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            Lock your view. Rotate freely.
          </p>
        </header>

        {/* Status Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-4 rounded-2xl bg-zinc-800 transition-all duration-500 ${rotationAttempt ? 'scale-110 ring-4 ring-orange-500/50' : 'group-hover:scale-105'}`}>
              {getOrientationIcon()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Orientation</p>
              <p className="text-xl font-semibold capitalize">{orientation.replace("-", " ")}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-800 w-full" />

          <button
            onClick={toggleLock}
            className={`group/btn relative w-full py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden ${
              isLocked 
                ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-5 h-5" />
                <span>Unlock Orientation</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>Lock Orientation</span>
              </>
            )}
            
            {/* Hover reflection effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center bg-red-500/10 py-2 px-4 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Rotation Alert */}
        <div className={`transition-all duration-500 transform ${rotationAttempt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="bg-orange-500/20 border border-orange-500/50 backdrop-blur-md text-orange-400 px-6 py-3 rounded-full inline-flex items-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin-slow" />
            <span className="font-semibold text-sm italic">rotation attempt when locked</span>
          </div>
        </div>

        {/* Info Area */}
        <footer className="pt-8">
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
              <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`} />
              {isLocked ? 'LOCKED' : 'READY'}
            </div>
          </div>
        </footer>
      </main>

      {/* Simplified Action Popup */}
      {isAIPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300" onClick={() => setIsAIPopupOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-xs w-full shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.5)]">
                <RotateCw className="text-white w-6 h-6 animate-spin-slow" />
              </div>
              <h3 className="font-bold text-lg">Alert</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              rotation attempt when locked
            </p>
            <button 
              onClick={() => setIsAIPopupOpen(false)}
              className="w-full py-3 bg-zinc-100 text-black font-bold rounded-xl hover:bg-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
