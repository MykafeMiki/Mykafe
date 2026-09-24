/**
 * Archivia e cancella gli ordini.
 *
 * Usato dal reset manuale (cashier) e dalla pulizia automatica a 24h
 * (cleanup-stale). L'ordine delle operazioni e' voluto: prima si scrive lo
 * snapshot in OrderArchive, e solo se quello riesce si cancella. Se
 * l'archiviazione fallisce non si perde nulla.
 */

// deno-lint-ignore no-explicit-any
type Supabase = any;

export type ArchiveReason = "MANUAL_RESET" | "AUTO_24H";

export interface ArchiveResult {
  archiveId: string | null;
  orderCount: number;
  totalCash: number;
  totalCard: number;
  totalUnpaid: number;
}

function chunk<T>(list: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * Archivia tutti gli ordini (o solo quelli creati prima di `before`) e li
 * cancella. Cancella esattamente gli id archiviati, cosi' un ordine arrivato
 * mentre girava non sparisce senza essere finito nello snapshot.
 */
export async function archiveAndDeleteOrders(
  supabase: Supabase,
  reason: ArchiveReason,
  before?: Date
): Promise<ArchiveResult> {
  let query = supabase
    .from("Order")
    .select(
      `
      *,
      table:Table(number, isCounter),
      items:OrderItem(
        *,
        menuItem:MenuItem(name, price),
        modifiers:OrderItemModifier(
          *,
          modifier:Modifier(name, price)
        )
      )
    `
    )
    .order("createdAt", { ascending: true });

  if (before) query = query.lt("createdAt", before.toISOString());

  const { data: orders, error } = await query;
  if (error) throw error;

  if (!orders || orders.length === 0) {
    return { archiveId: null, orderCount: 0, totalCash: 0, totalCard: 0, totalUnpaid: 0 };
  }

  // Gli ordini annullati non sono incasso: restano nello snapshot ma non nei totali.
  // deno-lint-ignore no-explicit-any
  const sum = (list: any[]) => list.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const counted = orders.filter((o: { status: string }) => o.status !== "CANCELLED");
  const totalCash = sum(counted.filter((o: { isPaid: boolean; paymentMethod: string }) => o.isPaid && o.paymentMethod === "CASH"));
  const totalCard = sum(counted.filter((o: { isPaid: boolean; paymentMethod: string }) => o.isPaid && o.paymentMethod === "CARD"));
  const totalUnpaid = sum(counted.filter((o: { isPaid: boolean }) => !o.isPaid));

  const { data: archive, error: archiveError } = await supabase
    .from("OrderArchive")
    .insert({
      reason,
      orderCount: orders.length,
      totalCash,
      totalCard,
      totalUnpaid,
      periodStart: orders[0].createdAt,
      periodEnd: orders[orders.length - 1].createdAt,
      orders,
    })
    .select("id")
    .single();

  if (archiveError) throw archiveError;

  // Nessun ON DELETE CASCADE sulle FK degli ordini: si cancella dal basso.
  // Gli id vanno nell'URL: a blocchi, per non superarne il limite di lunghezza.
  // deno-lint-ignore no-explicit-any
  const orderIds: string[] = orders.map((o: any) => o.id);
  const itemIds: string[] = orders.flatMap(
    // deno-lint-ignore no-explicit-any
    (o: any) => (o.items || []).map((i: any) => i.id)
  );

  for (const ids of chunk(itemIds)) {
    const { error: modError } = await supabase
      .from("OrderItemModifier")
      .delete()
      .in("orderItemId", ids);
    if (modError) throw modError;

    const { error: delItemsError } = await supabase.from("OrderItem").delete().in("id", ids);
    if (delItemsError) throw delItemsError;
  }

  for (const ids of chunk(orderIds)) {
    const { error: delOrdersError } = await supabase.from("Order").delete().in("id", ids);
    if (delOrdersError) throw delOrdersError;
  }

  return {
    archiveId: archive.id,
    orderCount: orders.length,
    totalCash,
    totalCard,
    totalUnpaid,
  };
}
