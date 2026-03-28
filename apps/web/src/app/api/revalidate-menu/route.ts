import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Revalidazione on-demand del menu
// Chiama questo endpoint dall'admin quando salvi modifiche al menu
export async function POST(request: Request) {
  try {
    // Verifica secret per sicurezza (opzionale ma consigliato)
    const secret = request.headers.get("x-revalidate-secret");
    const expectedSecret = process.env.REVALIDATE_SECRET;

    // Se REVALIDATE_SECRET è configurato, verificalo
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    // Invalida la cache del menu
    revalidatePath("/api/menu");

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
