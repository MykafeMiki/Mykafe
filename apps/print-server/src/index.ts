/**
 * MyKafe Print Server
 *
 * Listens for new orders via Supabase Realtime and prints to thermal printers.
 * Splits each order into 3 receipts: SUSHI / PANINI / CAFFETTERIA.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Configuration
// The service role key is required: RLS on Order blocks anon reads and realtime events
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

// Category patterns for each printer section
const SUSHI_CATEGORIES = (process.env.SUSHI_CATEGORIES || "Sushi,Sashimi,Roll,Nigiri")
  .split(",")
  .map((s) => s.trim().toLowerCase());

const PANINI_CATEGORIES = (process.env.PANINI_CATEGORIES || "Panini,Panino,Sandwich,Toast")
  .split(",")
  .map((s) => s.trim().toLowerCase());

const CAFFETTERIA_CATEGORIES = (
  process.env.CAFFETTERIA_CATEGORIES || "Caffetteria,Bevande,Caffe,Drink,Bibite,Dolci,Dessert"
)
  .split(",")
  .map((s) => s.trim().toLowerCase());

// Printer configuration - 3 printers
const PRINTER_SUSHI = {
  ip: process.env.PRINTER_SUSHI_IP || "192.168.1.100",
  port: parseInt(process.env.PRINTER_SUSHI_PORT || "9100"),
};

const PRINTER_PANINI = {
  ip: process.env.PRINTER_PANINI_IP || "192.168.1.101",
  port: parseInt(process.env.PRINTER_PANINI_PORT || "9100"),
};

const PRINTER_CAFFETTERIA = {
  ip: process.env.PRINTER_CAFFETTERIA_IP || "192.168.1.102",
  port: parseInt(process.env.PRINTER_CAFFETTERIA_PORT || "9100"),
};

// Types
interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  consumeMode: string;
  menuItem: {
    id: string;
    name: string;
    price: number;
    category?: {
      name: string;
    } | null;
  };
  modifiers?: Array<{
    modifier: {
      name: string;
      price: number;
    };
  }>;
}

interface Order {
  id: string;
  status: string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  totalAmount: number;
  createdAt: string;
  table?: {
    number: number;
    isCounter: boolean;
  } | null;
  items: OrderItem[];
}

// ESC/POS Commands
const ESC = "\x1B";
const GS = "\x1D";
const COMMANDS = {
  INIT: ESC + "@",
  ALIGN_CENTER: ESC + "a" + "\x01",
  ALIGN_LEFT: ESC + "a" + "\x00",
  BOLD_ON: ESC + "E" + "\x01",
  BOLD_OFF: ESC + "E" + "\x00",
  DOUBLE_HEIGHT: GS + "!" + "\x10",
  DOUBLE_WIDTH: GS + "!" + "\x20",
  DOUBLE_SIZE: GS + "!" + "\x30",
  NORMAL_SIZE: GS + "!" + "\x00",
  CUT: GS + "V" + "\x00",
  PARTIAL_CUT: GS + "V" + "\x01",
  FEED_LINES: (n: number) => ESC + "d" + String.fromCharCode(n),
};

// Format date/time
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Receipt section type
type ReceiptSection = "SUSHI" | "PANINI" | "CAFFETTERIA";

// Get section header label
function getSectionLabel(section: ReceiptSection): string {
  switch (section) {
    case "SUSHI":
      return "** SUSHI **";
    case "PANINI":
      return "** PANINI **";
    case "CAFFETTERIA":
      return "** CAFFETTERIA **";
  }
}

// Generate receipt content
function generateReceipt(order: Order, items: OrderItem[], section: ReceiptSection): string {
  const lines: string[] = [];

  // Header
  lines.push(COMMANDS.INIT);
  lines.push(COMMANDS.ALIGN_CENTER);
  lines.push(COMMANDS.DOUBLE_SIZE);
  lines.push(COMMANDS.BOLD_ON);
  lines.push(getSectionLabel(section));
  lines.push(COMMANDS.NORMAL_SIZE);
  lines.push(COMMANDS.BOLD_OFF);
  lines.push("");

  // Order info
  lines.push(COMMANDS.DOUBLE_HEIGHT);
  if (order.table?.isCounter || order.orderType === "TAKEAWAY") {
    lines.push(`ASPORTO: ${order.customerName || "N/A"}`);
    lines.push(COMMANDS.NORMAL_SIZE);
    // Telefono: serve per richiamare il cliente se l'ordine tarda o manca qualcosa
    if (order.customerPhone) {
      lines.push(COMMANDS.BOLD_ON);
      lines.push(`Tel. ${order.customerPhone}`);
      lines.push(COMMANDS.BOLD_OFF);
    }
  } else {
    lines.push(`TAVOLO ${order.table?.number || "?"}`);
    lines.push(COMMANDS.NORMAL_SIZE);
  }
  lines.push("");

  // Time
  lines.push(formatDateTime(order.createdAt));
  lines.push("");
  lines.push("--------------------------------");
  lines.push("");

  // Items
  lines.push(COMMANDS.ALIGN_LEFT);
  for (const item of items) {
    lines.push(COMMANDS.BOLD_ON);
    lines.push(COMMANDS.DOUBLE_HEIGHT);
    lines.push(`${item.quantity}x ${item.menuItem.name}`);
    lines.push(COMMANDS.NORMAL_SIZE);
    lines.push(COMMANDS.BOLD_OFF);

    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(`   + ${mod.modifier.name}`);
      }
    }

    // Notes
    if (item.notes) {
      lines.push(`   >> ${item.notes}`);
    }

    // Consume mode
    if (item.consumeMode === "TAKEAWAY") {
      lines.push("   [DA ASPORTO]");
    }

    lines.push("");
  }

  // Order notes
  if (order.notes) {
    lines.push("--------------------------------");
    lines.push(COMMANDS.BOLD_ON);
    lines.push("NOTE:");
    lines.push(COMMANDS.BOLD_OFF);
    lines.push(order.notes);
    lines.push("");
  }

  // Footer
  lines.push("--------------------------------");
  lines.push(COMMANDS.ALIGN_CENTER);
  lines.push(`#${order.id.slice(-6).toUpperCase()}`);
  lines.push("");
  lines.push(COMMANDS.FEED_LINES(3));
  lines.push(COMMANDS.PARTIAL_CUT);

  return lines.join("\n");
}

// Print to network printer
async function printToNetwork(ip: string, port: number, content: string): Promise<void> {
  const net = await import("net");

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    socket.setTimeout(5000);

    socket.connect(port, ip, () => {
      console.log(`  Connected to printer at ${ip}:${port}`);
      socket.write(content, "binary", () => {
        socket.end();
        resolve();
      });
    });

    socket.on("error", (err) => {
      console.error(`  Printer error (${ip}:${port}):`, err.message);
      reject(err);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timeout"));
    });
  });
}

// Separate items by category into 3 sections
function separateItems(items: OrderItem[]): {
  sushi: OrderItem[];
  panini: OrderItem[];
  caffetteria: OrderItem[];
} {
  const sushi: OrderItem[] = [];
  const panini: OrderItem[] = [];
  const caffetteria: OrderItem[] = [];

  for (const item of items) {
    const categoryName = item.menuItem.category?.name?.toLowerCase() || "";

    if (SUSHI_CATEGORIES.some((cat) => categoryName.includes(cat))) {
      sushi.push(item);
    } else if (PANINI_CATEGORIES.some((cat) => categoryName.includes(cat))) {
      panini.push(item);
    } else {
      // Everything else goes to caffetteria (beverages, coffee, desserts, etc.)
      caffetteria.push(item);
    }
  }

  return { sushi, panini, caffetteria };
}

// Process and print order - generates 3 separate receipts
async function processOrder(order: Order): Promise<void> {
  console.log(`\nProcessing order #${order.id.slice(-6).toUpperCase()}`);
  console.log(`  Type: ${order.orderType}, Items: ${order.items.length}`);

  const { sushi, panini, caffetteria } = separateItems(order.items);

  console.log(
    `  Split: Sushi=${sushi.length}, Panini=${panini.length}, Caffetteria=${caffetteria.length}`
  );

  // Print sushi items
  if (sushi.length > 0) {
    console.log(`  Printing ${sushi.length} SUSHI items...`);
    const receipt = generateReceipt(order, sushi, "SUSHI");

    try {
      await printToNetwork(PRINTER_SUSHI.ip, PRINTER_SUSHI.port, receipt);
      console.log("  SUSHI printer: OK");
    } catch (err) {
      console.error("  SUSHI printer: FAILED");
    }
  }

  // Print panini items
  if (panini.length > 0) {
    console.log(`  Printing ${panini.length} PANINI items...`);
    const receipt = generateReceipt(order, panini, "PANINI");

    try {
      await printToNetwork(PRINTER_PANINI.ip, PRINTER_PANINI.port, receipt);
      console.log("  PANINI printer: OK");
    } catch (err) {
      console.error("  PANINI printer: FAILED");
    }
  }

  // Print caffetteria items (beverages, coffee, desserts, etc.)
  if (caffetteria.length > 0) {
    console.log(`  Printing ${caffetteria.length} CAFFETTERIA items...`);
    const receipt = generateReceipt(order, caffetteria, "CAFFETTERIA");

    try {
      await printToNetwork(PRINTER_CAFFETTERIA.ip, PRINTER_CAFFETTERIA.port, receipt);
      console.log("  CAFFETTERIA printer: OK");
    } catch (err) {
      console.error("  CAFFETTERIA printer: FAILED");
    }
  }
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ORDER_SELECT = `
  *,
  table:Table(number, isCounter),
  items:OrderItem(
    *,
    menuItem:MenuItem(id, name, price, category:Category(name)),
    modifiers:OrderItemModifier(
      *,
      modifier:Modifier(name, price)
    )
  )
`;

// Orders already printed (or present before startup) - avoids double printing
const printedOrderIds = new Set<string>();

// The Order row is inserted before its OrderItems, so retry until items appear
async function fetchFullOrder(orderId: string): Promise<Order | null> {
  const MAX_ATTEMPTS = 6;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("Order")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error(`  Fetch error (attempt ${attempt}):`, error.message);
    } else if (data && Array.isArray(data.items) && data.items.length > 0) {
      return data as unknown as Order;
    }

    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  return null;
}

async function handleNewOrder(orderId: string): Promise<void> {
  if (printedOrderIds.has(orderId)) return;
  printedOrderIds.add(orderId);

  console.log("");
  console.log("========== NEW ORDER ==========");

  const order = await fetchFullOrder(orderId);
  if (!order) {
    console.error(`  Could not load order ${orderId} with items - NOT printed`);
    printedOrderIds.delete(orderId); // allow the polling fallback to retry it
    return;
  }

  await processOrder(order);
  console.log("===============================");
}

// Mark orders that already exist at startup as printed (avoids reprinting after restart)
async function seedExistingOrders(): Promise<void> {
  const { data, error } = await supabase
    .from("Order")
    .select("id")
    .in("status", ["PENDING", "PREPARING"]);

  if (error) {
    console.error("Could not load existing orders:", error.message);
    return;
  }

  for (const row of data || []) {
    printedOrderIds.add(row.id);
  }
  console.log(`Skipping ${data?.length || 0} pre-existing active orders`);
}

// Polling fallback in case a realtime event is missed
async function pollNewOrders(): Promise<void> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("Order")
    .select("id")
    .eq("status", "PENDING")
    .gte("createdAt", since);

  if (error || !data) return;

  for (const row of data) {
    if (!printedOrderIds.has(row.id)) {
      console.log(`(polling) Found unprinted order ${row.id}`);
      await handleNewOrder(row.id);
    }
  }
}

// Main
async function main(): Promise<void> {
  console.log("========================================");
  console.log("       MyKafe Print Server v3.0");
  console.log("  (Supabase Realtime + 3-Receipt Split)");
  console.log("========================================");
  console.log("");
  console.log("Configuration:");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log("");
  console.log("Printers:");
  console.log(`  SUSHI:       ${PRINTER_SUSHI.ip}:${PRINTER_SUSHI.port}`);
  console.log(`  PANINI:      ${PRINTER_PANINI.ip}:${PRINTER_PANINI.port}`);
  console.log(`  CAFFETTERIA: ${PRINTER_CAFFETTERIA.ip}:${PRINTER_CAFFETTERIA.port}`);
  console.log("");
  console.log("Category Mapping:");
  console.log(`  Sushi:       ${SUSHI_CATEGORIES.join(", ")}`);
  console.log(`  Panini:      ${PANINI_CATEGORIES.join(", ")}`);
  console.log(`  Caffetteria: ${CAFFETTERIA_CATEGORIES.join(", ")} (+ everything else)`);
  console.log("");

  await seedExistingOrders();

  console.log("Connecting to Supabase Realtime...");
  supabase
    .channel("print-server-orders")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Order" },
      (payload) => {
        const orderId = (payload.new as { id?: string })?.id;
        if (orderId) {
          void handleNewOrder(orderId);
        }
      }
    )
    .subscribe((status) => {
      console.log(`Realtime status: ${status}`);
      if (status === "SUBSCRIBED") {
        console.log("");
        console.log("Waiting for orders...");
        console.log("");
      }
    });

  // Polling fallback every 30s
  setInterval(() => {
    void pollNewOrders();
  }, 30000);
}

void main();
