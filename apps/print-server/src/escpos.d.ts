declare module "escpos" {
  export class USB {
    constructor(vendorId?: number, productId?: number);
    open(callback: (err: Error | null) => void): void;
    close(): void;
  }

  export class Network {
    constructor(host: string, port?: number);
    open(callback: (err: Error | null) => void): void;
    close(): void;
  }

  export class Printer {
    constructor(device: USB | Network);
    font(type: "A" | "B"): this;
    align(type: "LT" | "CT" | "RT"): this;
    style(type: "NORMAL" | "B" | "I" | "U" | "BU"): this;
    size(width: number, height: number): this;
    text(content: string): this;
    feed(lines: number): this;
    cut(): this;
    close(callback?: () => void): this;
  }

  // Supports both named and default import patterns
  const _default: {
    USB: typeof USB;
    Network: typeof Network;
    Printer: typeof Printer;
  };
  export default _default;
}

declare module "escpos-usb" {
  function plugin(escpos: typeof import("escpos")): void;
  export default plugin;
}

declare module "escpos-network" {
  function plugin(escpos: typeof import("escpos")): void;
  export default plugin;
}
