import { redirect } from "next/navigation";

/** "Voeding" is vervangen door de +-knop → /log (zie BottomNav). */
export default function FoodPageRedirect() {
  redirect("/log");
}
