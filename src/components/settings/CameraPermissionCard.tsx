"use client";

import { Camera } from "lucide-react";
import { Card } from "@/components/ui";

/**
 * iOS bewaart cameratoestemming niet voor een aan het beginscherm toegevoegde
 * web-app (bevestigd WebKit-gedrag, geen instelling die wij kunnen omzetten) —
 * dus geven we hier uitleg in plaats van een knop die iets belooft dat niet kan.
 */
export function CameraPermissionCard() {
  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Camera size={16} className="text-muted-foreground" />
        Camera voor streepjescodes
      </h2>
      <p className="text-xs text-muted-foreground">
        Op iPhone vraagt Safari bij een aan het beginscherm toegevoegde app helaas telkens opnieuw om
        cameratoegang bij het scannen — dat is een beperking van iOS zelf, geen instelling die deze app kan
        overslaan. Kies gewoon &ldquo;Toestaan&rdquo;; dat is veilig en nodig om te kunnen scannen.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Wil je dit helemaal niet meer zien, gebruik de app dan als gewone Safari-tab in plaats van vanaf het
        beginscherm — in een gewone tab onthoudt Safari cameratoestemming per site wél.
      </p>
    </Card>
  );
}
