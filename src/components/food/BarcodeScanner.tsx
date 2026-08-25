"use client";

import { Flashlight, FlashlightOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { QuaggaJSResultObject } from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const target = viewportRef.current;
    if (!target) return;

    let cancelled = false;
    let hasDetected = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamically imported module, typed via the package's own d.ts at the call sites below
    let quagga: any = null;

    function handleDetected(data: QuaggaJSResultObject) {
      const code = data.codeResult?.code;
      if (code && !hasDetected) {
        hasDetected = true;
        onDetected(code);
      }
    }

    async function boot() {
      // Camera-afhankelijke library — alleen client-side laden, nooit tijdens SSR.
      const { default: Quagga } = await import("@ericblade/quagga2");
      if (cancelled || !target) return;
      quagga = Quagga;

      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target,
            constraints: {
              facingMode: "environment",
              width: { min: 640, ideal: 1920 },
              height: { min: 480, ideal: 1080 },
              // Best-effort — genegeerd op browsers/toestellen die dit niet ondersteunen
              // (o.a. Safari), maar helpt op focus-op-afstand-camera's bij dichtbij scannen.
              advanced: [{ focusMode: "continuous" }],
            } as unknown as MediaTrackConstraints,
          },
          // "large" patchSize + halfSample uit: nauwkeuriger op een dichtbij gehouden
          // telefooncamera, ten koste van wat CPU — de scansessie is kort genoeg dat dat niet opvalt.
          locator: { patchSize: "large", halfSample: false },
          decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"] },
          locate: true,
        },
        (err: unknown) => {
          if (cancelled) return;
          if (err) {
            setError("Camera kon niet worden gestart. Geef cameratoegang in je browser en probeer opnieuw.");
            return;
          }
          Quagga.start();

          try {
            const capabilities = quagga.CameraAccess.getActiveTrack()?.getCapabilities?.();
            // "torch" staat niet in de standaard MediaTrackCapabilities-types.
            setTorchSupported(Boolean((capabilities as { torch?: boolean } | undefined)?.torch));
          } catch {
            setTorchSupported(false);
          }
        },
      );

      Quagga.onDetected(handleDetected);
    }

    boot();

    return () => {
      cancelled = true;
      if (quagga) {
        quagga.offDetected(handleDetected);
        quagga.stop();
      }
    };
  }, [onDetected]);

  async function toggleTorch() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zie boot() hierboven
    const Quagga = (await import("@ericblade/quagga2")).default as any;
    try {
      if (torchOn) {
        await Quagga.CameraAccess.disableTorch();
      } else {
        await Quagga.CameraAccess.enableTorch();
      }
      setTorchOn((on) => !on);
    } catch {
      // Best-effort — niet elk toestel/browser ondersteunt dit daadwerkelijk ondanks de capability-flag.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
        <span className="text-sm font-medium text-white">Scan een streepjescode</span>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Zet lampje uit" : "Zet lampje aan"}
              className="rounded-full bg-white/10 p-3 text-white active:bg-white/20"
            >
              {torchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-full bg-white/10 p-3 text-white active:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={viewportRef}
          className="absolute inset-0 [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:h-full [&_canvas]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-white/70" />
      </div>

      {error ? (
        <p className="p-4 text-center text-sm text-white">{error}</p>
      ) : (
        <p className="p-4 text-center text-xs text-white/70">
          Houd de streepjescode plat en binnen het kader, ook als hij verfrommeld of schuin is — vul aan met meer
          licht of het lampje hierboven als hij niet gevonden wordt.
        </p>
      )}
    </div>
  );
}
