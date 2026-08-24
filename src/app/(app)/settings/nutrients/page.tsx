import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { NUTRIENT_REFERENCES } from "@/lib/constants";

export default function NutrientsReferencePage() {
  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <Link href="/settings" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft size={16} /> Instellingen
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Micronutriënten-referentie</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Algemene richtwaarden voor volwassen mannen, om op te zoeken — geen medisch advies en niet iets om dagelijks
          te loggen.
        </p>
      </header>

      <Card>
        <div className="divide-y divide-border">
          {NUTRIENT_REFERENCES.map((n) => (
            <div key={n.name} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{n.name}</span>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{n.amount}</span>
              </div>
              {n.note && <p className="mt-1 text-xs text-muted-foreground">{n.note}</p>}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Bronnen: algemene voedingsrichtlijnen voor volwassenen (o.a. Gezondheidsraad/EFSA-achtige richtwaarden).
        Raadpleeg een arts of diëtist voor persoonlijk advies.
      </p>
    </div>
  );
}
