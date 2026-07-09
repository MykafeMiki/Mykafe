/**
 * Test di stampa ESC/POS via rete (porta 9100).
 *
 * Uso:  node test-print.mjs <IP> [porta]
 * Es.:  node test-print.mjs 192.168.1.100
 */

import net from "net";

const ip = process.argv[2];
const port = parseInt(process.argv[3] || "9100");

if (!ip) {
  console.error("Uso: node test-print.mjs <IP> [porta]");
  process.exit(1);
}

const ESC = "\x1B";
const GS = "\x1D";

const receipt = [
  ESC + "@", // init
  ESC + "a" + "\x01", // center
  GS + "!" + "\x30", // double size
  ESC + "E" + "\x01", // bold on
  "MyKafe",
  GS + "!" + "\x00", // normal size
  ESC + "E" + "\x00", // bold off
  "",
  "*** TEST DI STAMPA ***",
  "",
  new Date().toLocaleString("it-IT"),
  "",
  "Se leggi questo, la stampante",
  "e' ONLINE e funzionante!",
  "",
  ESC + "d" + "\x03", // feed 3
  GS + "V" + "\x01", // partial cut
].join("\n");

console.log(`Connessione a ${ip}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.connect(port, ip, () => {
  console.log("Connesso! Invio scontrino di test...");
  socket.write(receipt, "binary", () => {
    socket.end();
    console.log("Test inviato. Controlla la stampante!");
  });
});

socket.on("error", (err) => {
  console.error(`ERRORE: ${err.message}`);
  process.exit(1);
});

socket.on("timeout", () => {
  console.error("ERRORE: timeout di connessione");
  socket.destroy();
  process.exit(1);
});
