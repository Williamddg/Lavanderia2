import { contextBridge, ipcRenderer } from 'electron';
import type {
  ClientInput,
  DbConnectionConfig,
  DeliveryInput,
  ExternalLinkPayload,
  LoginInput,
  OrderInput,
  PaymentInput,
  ServiceInput
} from '../shared/types.js';

contextBridge.exposeInMainWorld('desktopApi', {
  verifyPassword: (password: string) =>
    ipcRenderer.invoke('auth:verify-password', password),

  getOrderProtectionPassword: () =>
    ipcRenderer.invoke('settings:get-order-protection-password'),

  updateOrderProtectionPassword: (input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) =>
  ipcRenderer.invoke('settings:update-order-protection-password', input),

  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (licenseKey: string) => ipcRenderer.invoke('license:activate', licenseKey),

  connectDriveBackup: () => ipcRenderer.invoke('backup:connect-drive'),
  uploadBackupToDrive: () => ipcRenderer.invoke('backup:upload-drive'),
  listBackups: () => ipcRenderer.invoke('backup:list'),

  listPrinters: () => ipcRenderer.invoke('printers:list'),
  openCashDrawer: (printerName?: string) => ipcRenderer.invoke('printer:open-drawer', printerName),

  updateCompanySettings: (input: any) =>
    ipcRenderer.invoke('settings:update-company', input),
  getReportsSummary: (from?: string, to?: string) =>
    ipcRenderer.invoke('reports:summary', from, to),

  listWarranties: () => ipcRenderer.invoke('warranties:list'),
  listWarrantyStatuses: () => ipcRenderer.invoke('warranties:statuses'),
  createWarranty: (input: { orderId: number; reason: string }) =>
    ipcRenderer.invoke('warranties:create', input),
  updateWarrantyStatus: (id: number, input: { statusId: number; resolution: string | null }) =>
    ipcRenderer.invoke('warranties:update-status', id, input),

  health: () => ipcRenderer.invoke('app:health'),
  openExternal: (payload: ExternalLinkPayload) => ipcRenderer.invoke('app:open-external', payload),
  saveDbConfig: (config: DbConnectionConfig) => ipcRenderer.invoke('db:save-config', config),
  login: (input: LoginInput) => ipcRenderer.invoke('auth:login', input),
  getCompanySettings: () => ipcRenderer.invoke('settings:company'),

  listClients: () => ipcRenderer.invoke('clients:list'),
  createClient: (input: ClientInput) => ipcRenderer.invoke('clients:create', input),
  updateClient: (id: number, input: ClientInput) => ipcRenderer.invoke('clients:update', id, input),
  deleteClient: (id: number) => ipcRenderer.invoke('clients:delete', id),

  listOrders: () => ipcRenderer.invoke('orders:list'),
  getOrderDetail: (id: number) => ipcRenderer.invoke('orders:detail', id),
  getOrderCatalogs: () => ipcRenderer.invoke('orders:catalogs'),
  createOrder: (input: OrderInput) => ipcRenderer.invoke('orders:create', input),
  updateOrderStatus: (orderId: number, statusId: number) =>
    ipcRenderer.invoke('orders:update-status', orderId, statusId),

  updateOrder: (orderId: number, input: OrderInput) =>
    ipcRenderer.invoke('orders:update', orderId, input),

  cancelOrder: (orderId: number) =>
    ipcRenderer.invoke('orders:cancel', orderId),

  listPayments: (orderId?: number) => ipcRenderer.invoke('payments:list', orderId),
  createPayment: (input: PaymentInput) => ipcRenderer.invoke('payments:create', input),

  listInvoices: () => ipcRenderer.invoke('invoices:list'),
  getInvoiceDetail: (id: number) => ipcRenderer.invoke('invoices:detail', id),
  createInvoiceFromOrder: (orderId: number) => ipcRenderer.invoke('invoices:create-from-order', orderId),

  openCashSession: (input: {
  openingAmount?: number;
  openedByName: string;
  openedByPhone: string;
}) => ipcRenderer.invoke('cash:open', input),
  closeCashSession: (declaredAmount: number) => ipcRenderer.invoke('cash:close', declaredAmount),
  getCashSummary: () => ipcRenderer.invoke('cash:summary'),

  listExpenses: () => ipcRenderer.invoke('expenses:list'),
  createExpense: (input: { categoryId: number; amount: number; description: string; expenseDate: string }) =>
    ipcRenderer.invoke('expenses:create', input),
  listExpenseCategories: () => ipcRenderer.invoke('expenses:categories'),

  listDeliveries: () => ipcRenderer.invoke('deliveries:list'),
  createDelivery: (input: DeliveryInput) => ipcRenderer.invoke('deliveries:create', input),

  getDashboardSummary: () => ipcRenderer.invoke('dashboard:summary'),

  listServices: (activeOnly?: boolean) => ipcRenderer.invoke('services:list', activeOnly),
  createService: (input: ServiceInput) => ipcRenderer.invoke('services:create', input),
  updateService: (id: number, input: ServiceInput) => ipcRenderer.invoke('services:update', id, input),
  deleteService: (id: number) => ipcRenderer.invoke('services:delete', id)
});