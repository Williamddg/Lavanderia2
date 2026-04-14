"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.printerService = void 0;
const electron_1 = require("electron");
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
        const printerModule = await this.loadPrinterModule();
        const printers = await this.listPrinters();
        const selected = printerName?.trim()
            ? printers.find((p) => p.name === printerName.trim())
            : printers.find((p) => p.isDefault) ?? printers[0];
        if (!selected) {
            throw new Error('No se encontró ninguna impresora.');
        }
        await new Promise((resolve, reject) => {
            printerModule.printDirect({
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
    async loadPrinterModule() {
        try {
            const module = await Promise.resolve().then(() => __importStar(require('@alexssmusica/node-printer')));
            return module.default;
        }
        catch (error) {
            throw new Error(`La integración nativa de impresión no está disponible en esta instalación. Rebuild requerido para ${process.platform}/${process.arch}. ${error instanceof Error ? error.message : ''}`.trim());
        }
    }
}
exports.printerService = new PrinterService();
