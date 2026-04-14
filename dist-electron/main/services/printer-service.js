"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printerService = void 0;
const electron_1 = require("electron");
const node_printer_1 = __importDefault(require("@alexssmusica/node-printer"));
const ESC = 0x1b;
// ESC p m t1 t2
const CASH_DRAWER_PULSE = Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]);
class PrinterService {
    async listPrinters() {
        const win = electron_1.BrowserWindow.getAllWindows()[0];
        if (!win) {
            throw new Error('No hay ventana activa para consultar impresoras.');
        }
        const printers = await win.webContents.getPrintersAsync();
        return printers.map((p) => ({
            name: p.name,
            isDefault: Boolean(p.isDefault),
            status: Number(p.status ?? 0)
        }));
    }
    async openDrawer(printerName) {
        const printers = await this.listPrinters();
        const selected = printerName?.trim()
            ? printers.find((p) => p.name === printerName.trim())
            : printers.find((p) => p.isDefault) ?? printers[0];
        if (!selected) {
            throw new Error('No se encontró ninguna impresora.');
        }
        await new Promise((resolve, reject) => {
            node_printer_1.default.printDirect({
                printer: selected.name,
                data: CASH_DRAWER_PULSE,
                type: 'RAW',
                success: () => resolve(),
                error: (err) => reject(err instanceof Error ? err : new Error(String(err)))
            });
        });
        return {
            success: true,
            printerName: selected.name,
            message: `Cajón abierto por la impresora: ${selected.name}`
        };
    }
}
exports.printerService = new PrinterService();
