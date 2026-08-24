"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { QuaggaJSResultObject } from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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
            },
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top)]">
        <span className="text-sm font-medium text-white">Scan een streepjescode</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="rounded-full bg-white/10 p-3 text-white active:bg-white/20"
        >
          <X size={20} />
        </button>
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
        <p className="p-4 text-center text-xs text-white/70">Richt de camera op de streepjescode van het product.</p>
      )}
    </div>
  );
}
