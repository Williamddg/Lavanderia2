"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpc = void 0;
const electron_1 = require("electron");
const database_manager_js_1 = require("../services/database-manager.js");
const service_js_1 = require("../../backend/modules/clients/service.js");
const service_js_2 = require("../../backend/modules/orders/service.js");
const service_js_3 = require("../../backend/modules/settings/service.js");
const service_js_4 = require("../../backend/modules/auth/service.js");
const service_js_5 = require("../../backend/modules/payments/service.js");
const service_js_6 = require("../../backend/modules/invoices/service.js");
const service_js_7 = require("../../backend/modules/cash/service.js");
const service_js_8 = require("../../backend/modules/deliveries/service.js");
const services_manager_js_1 = require("../services/services-manager.js");
const service_js_9 = require("../../backend/modules/expenses/service.js");
const service_js_10 = require("../../backend/modules/warranties/service.js");
const service_js_11 = require("../../backend/modules/reports/service.js");
const printer_service_js_1 = require("../services/printer-service.js");
const backup_service_js_1 = require("../services/backup-service.js");
const license_service_js_1 = require("../services/license-service.js");
const wrap = (handler) => async (_event, ...args) => {
    try {
        const data = await handler(...args);
        return { success: true, data };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error inesperado.'
        };
    }
};
const registerIpc = () => {
    electron_1.ipcMain.handle('license:status', wrap(async () => {
        const version = electron_1.app.getVersion();
        return license_service_js_1.licenseService.status(version);
    }));
    electron_1.ipcMain.handle('license:activate', wrap(async (licenseKey) => {
        const version = electron_1.app.getVersion();
        return license_service_js_1.licenseService.activate(licenseKey, version);
    }));
    electron_1.ipcMain.handle('backup:connect-drive', wrap(async () => backup_service_js_1.backupService.connectDrive()));
    electron_1.ipcMain.handle('backup:upload-drive', wrap(async () => backup_service_js_1.backupService.uploadBackupToDrive()));
    electron_1.ipcMain.handle('backup:list', wrap(async () => backup_service_js_1.backupService.listBackups()));
    electron_1.ipcMain.handle('settings:update-company', wrap(async (input) => (0, service_js_3.createSettingsService)(await database_manager_js_1.databaseManager.getDb()).updateCompanySettings(input)));
    electron_1.ipcMain.handle('settings:get-order-protection-password', wrap(async () => (0, service_js_3.createSettingsService)(await database_manager_js_1.databaseManager.getDb()).getOrderProtectionPassword()));
    electron_1.ipcMain.handle('settings:update-order-protection-password', wrap(async (input) => (0, service_js_3.createSettingsService)(await database_manager_js_1.databaseManager.getDb()).updateOrderProtectionPassword(input)));
    electron_1.ipcMain.handle('reports:summary', wrap(async (from, to) => (0, service_js_11.createReportsService)(await database_manager_js_1.databaseManager.getDb()).summary(from, to)));
    electron_1.ipcMain.handle('printers:list', wrap(async () => printer_service_js_1.printerService.listPrinters()));
    electron_1.ipcMain.handle('printer:open-drawer', wrap(async (printerName) => printer_service_js_1.printerService.openDrawer(printerName)));
    electron_1.ipcMain.handle('services:list', wrap(async (activeOnly) => services_manager_js_1.servicesManager.list(Boolean(activeOnly))));
    electron_1.ipcMain.handle('warranties:list', wrap(async () => (0, service_js_10.createWarrantiesService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('warranties:statuses', wrap(async () => (0, service_js_10.createWarrantiesService)(await database_manager_js_1.databaseManager.getDb()).listStatuses()));
    electron_1.ipcMain.handle('warranties:create', wrap(async (input) => (0, service_js_10.createWarrantiesService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('warranties:update-status', wrap(async (id, input) => (0, service_js_10.createWarrantiesService)(await database_manager_js_1.databaseManager.getDb()).updateStatus(id, input)));
    electron_1.ipcMain.handle('services:create', wrap(async (input) => services_manager_js_1.servicesManager.create(input)));
    electron_1.ipcMain.handle('services:update', wrap(async (id, input) => services_manager_js_1.servicesManager.update(id, input)));
    electron_1.ipcMain.handle('services:delete', wrap(async (id) => services_manager_js_1.servicesManager.remove(id)));
    electron_1.ipcMain.handle('app:health', wrap(async () => database_manager_js_1.databaseManager.healthCheck()));
    electron_1.ipcMain.handle('app:open-external', wrap(async ({ url }) => {
        await electron_1.shell.openExternal(url);
        return { opened: true };
    }));
    electron_1.ipcMain.handle('db:save-config', wrap(async (config) => {
        await database_manager_js_1.databaseManager.saveConfig(config);
        await database_manager_js_1.databaseManager.migrate();
        return database_manager_js_1.databaseManager.healthCheck();
    }));
    electron_1.ipcMain.handle('auth:verify-password', wrap(async (password) => (0, service_js_4.createAuthService)(await database_manager_js_1.databaseManager.getDb()).verifyPassword(password)));
    electron_1.ipcMain.handle('auth:login', wrap(async (input) => (0, service_js_4.createAuthService)(await database_manager_js_1.databaseManager.getDb()).login(input)));
    electron_1.ipcMain.handle('settings:company', wrap(async () => (0, service_js_3.createSettingsService)(await database_manager_js_1.databaseManager.getDb()).getCompanySettings()));
    electron_1.ipcMain.handle('clients:list', wrap(async () => (0, service_js_1.createClientsService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('clients:create', wrap(async (input) => (0, service_js_1.createClientsService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('clients:update', wrap(async (id, input) => (0, service_js_1.createClientsService)(await database_manager_js_1.databaseManager.getDb()).update(id, input)));
    electron_1.ipcMain.handle('clients:delete', wrap(async (id) => (0, service_js_1.createClientsService)(await database_manager_js_1.databaseManager.getDb()).remove(id)));
    electron_1.ipcMain.handle('orders:list', wrap(async () => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('orders:detail', wrap(async (id) => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).detail(id)));
    electron_1.ipcMain.handle('orders:create', wrap(async (input) => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('orders:catalogs', wrap(async () => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).catalogs()));
    electron_1.ipcMain.handle('orders:update-status', wrap(async (orderId, statusId) => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).updateStatus(orderId, statusId)));
    electron_1.ipcMain.handle('orders:update', wrap(async (orderId, input) => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).update(orderId, input)));
    electron_1.ipcMain.handle('orders:cancel', wrap(async (orderId) => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).cancel(orderId)));
    electron_1.ipcMain.handle('payments:list', wrap(async (orderId) => (0, service_js_5.createPaymentsService)(await database_manager_js_1.databaseManager.getDb()).list(orderId)));
    electron_1.ipcMain.handle('payments:create', wrap(async (input) => (0, service_js_5.createPaymentsService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('invoices:list', wrap(async () => (0, service_js_6.createInvoicesService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('invoices:detail', wrap(async (id) => (0, service_js_6.createInvoicesService)(await database_manager_js_1.databaseManager.getDb()).detail(id)));
    electron_1.ipcMain.handle('invoices:create-from-order', wrap(async (orderId) => (0, service_js_6.createInvoicesService)(await database_manager_js_1.databaseManager.getDb()).createFromOrder(orderId)));
    electron_1.ipcMain.handle('cash:open', wrap(async (input) => (0, service_js_7.createCashService)(await database_manager_js_1.databaseManager.getDb()).open(input)));
    electron_1.ipcMain.handle('cash:close', wrap(async (declaredAmount) => (0, service_js_7.createCashService)(await database_manager_js_1.databaseManager.getDb()).close({ declaredAmount })));
    electron_1.ipcMain.handle('cash:summary', wrap(async () => (0, service_js_7.createCashService)(await database_manager_js_1.databaseManager.getDb()).summary()));
    electron_1.ipcMain.handle('expenses:list', wrap(async () => (0, service_js_9.createExpensesService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('expenses:create', wrap(async (input) => (0, service_js_9.createExpensesService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('expenses:categories', wrap(async () => (0, service_js_9.createExpensesService)(await database_manager_js_1.databaseManager.getDb()).listCategories()));
    electron_1.ipcMain.handle('deliveries:list', wrap(async () => (0, service_js_8.createDeliveriesService)(await database_manager_js_1.databaseManager.getDb()).list()));
    electron_1.ipcMain.handle('deliveries:create', wrap(async (input) => (0, service_js_8.createDeliveriesService)(await database_manager_js_1.databaseManager.getDb()).create(input)));
    electron_1.ipcMain.handle('dashboard:summary', wrap(async () => (0, service_js_2.createOrdersService)(await database_manager_js_1.databaseManager.getDb()).dashboard()));
};
exports.registerIpc = registerIpc;
