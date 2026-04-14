import type {
  Expense,
  ExpenseInput,
  ApiResponse,
  CashCloseResult,
  CashSessionSummary,
  CatalogsPayload,
  Client,
  ClientInput,
  CompanySettings,
  DashboardSummary,
  DbConnectionConfig,
  DeliveryInput,
  DeliveryRecord,
  HealthStatus,
  Invoice,
  InvoiceDetail,
  LoginInput,
  Order,
  OrderDetail,
  OrderInput,
  Payment,
  PaymentInput,
  Service,
  ServiceInput,
  SessionUser,
  WarrantyInput,
  WarrantyRecord,
  WarrantyStatus,
  WarrantyUpdateInput,
  ReportsSummary,
  PrinterInfo,
  OpenDrawerResult,
  BackupRecord,
  BackupUploadResult,
  ConnectDriveResult,
  CashOpenInput,
} from '@shared/types';

async function unwrap<T>(promise: Promise<unknown>): Promise<T> {
  const response = (await promise) as ApiResponse<T>;
  if (!response.success) throw new Error(response.error ?? 'Error desconocido.');
  return response.data as T;
}

export const api = {
  licenseStatus: () => unwrap<any>(window.desktopApi.getLicenseStatus()),
  activateLicense: (licenseKey: string) =>
    unwrap<any>(window.desktopApi.activateLicense(licenseKey)),

  connectDriveBackup: () =>
    unwrap<ConnectDriveResult>(window.desktopApi.connectDriveBackup()),

  uploadBackupToDrive: () =>
    unwrap<BackupUploadResult>(window.desktopApi.uploadBackupToDrive()),

  listBackups: () =>
    unwrap<BackupRecord[]>(window.desktopApi.listBackups()),

  listPrinters: () => unwrap<PrinterInfo[]>(window.desktopApi.listPrinters()),
  openCashDrawer: (printerName?: string) =>
    unwrap<OpenDrawerResult>(window.desktopApi.openCashDrawer(printerName)),

  updateCompanySettings: (input: any) =>
    unwrap(window.desktopApi.updateCompanySettings(input)),

  getOrderProtectionPassword: () =>
    unwrap<string | null>(window.desktopApi.getOrderProtectionPassword()),

  updateOrderProtectionPassword: (input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) =>
  unwrap<{ success: true }>(
    window.desktopApi.updateOrderProtectionPassword(input)
  ),

  reportsSummary: (from?: string, to?: string) =>
    unwrap<ReportsSummary>(window.desktopApi.getReportsSummary(from, to)),

  listWarranties: () => unwrap<WarrantyRecord[]>(window.desktopApi.listWarranties()),
  listWarrantyStatuses: () => unwrap<WarrantyStatus[]>(window.desktopApi.listWarrantyStatuses()),
  createWarranty: (input: WarrantyInput) => unwrap<WarrantyRecord>(window.desktopApi.createWarranty(input)),
  updateWarrantyStatus: (id: number, input: WarrantyUpdateInput) =>
    unwrap<WarrantyRecord>(window.desktopApi.updateWarrantyStatus(id, input)),

  listExpenseCategories: () =>
    unwrap<{ id: number; name: string }[]>(
      window.desktopApi.listExpenseCategories()
    ),

  listExpenses: () => unwrap<Expense[]>(window.desktopApi.listExpenses()),
  createExpense: (input: ExpenseInput) => unwrap<Expense>(window.desktopApi.createExpense(input)),
  health: () => unwrap<HealthStatus>(window.desktopApi.health()),
  openExternal: (url: string) => unwrap(window.desktopApi.openExternal({ url })),
  saveDbConfig: (config: DbConnectionConfig) => unwrap<HealthStatus>(window.desktopApi.saveDbConfig(config)),
  login: (input: LoginInput) => unwrap<SessionUser>(window.desktopApi.login(input)),
  companySettings: () => unwrap<CompanySettings | null>(window.desktopApi.getCompanySettings()),

  verifyPassword: (password: string) =>
    unwrap<{ valid: boolean }>(window.desktopApi.verifyPassword(password)),

  listClients: () => unwrap<Client[]>(window.desktopApi.listClients()),
  createClient: (input: ClientInput) => unwrap<Client>(window.desktopApi.createClient(input)),
  updateClient: (id: number, input: ClientInput) => unwrap<Client>(window.desktopApi.updateClient(id, input)),
  deleteClient: (id: number) => unwrap<{ id: number }>(window.desktopApi.deleteClient(id)),

  listOrders: () => unwrap<Order[]>(window.desktopApi.listOrders()),
  orderDetail: (id: number) => unwrap<OrderDetail>(window.desktopApi.getOrderDetail(id)),
  orderCatalogs: () => unwrap<CatalogsPayload>(window.desktopApi.getOrderCatalogs()),
  createOrder: (input: OrderInput) => unwrap<OrderDetail>(window.desktopApi.createOrder(input)),
  updateOrder: (orderId: number, input: OrderInput) =>
    unwrap<OrderDetail>(window.desktopApi.updateOrder(orderId, input)),
  cancelOrder: (orderId: number) =>
    unwrap<{ success: boolean }>(window.desktopApi.cancelOrder(orderId)),
  updateOrderStatus: (orderId: number, statusId: number) =>
    unwrap<{ success: boolean }>(window.desktopApi.updateOrderStatus(orderId, statusId)),

  listPayments: (orderId?: number) => unwrap<Payment[]>(window.desktopApi.listPayments(orderId)),
  createPayment: (input: PaymentInput) => unwrap<Payment>(window.desktopApi.createPayment(input)),

  listInvoices: () => unwrap<Invoice[]>(window.desktopApi.listInvoices()),
  invoiceDetail: (id: number) => unwrap<InvoiceDetail>(window.desktopApi.getInvoiceDetail(id)),
  createInvoiceFromOrder: (orderId: number) => unwrap<InvoiceDetail>(window.desktopApi.createInvoiceFromOrder(orderId)),

  openCashSession: (input: CashOpenInput) =>
  unwrap(window.desktopApi.openCashSession(input)),
  closeCashSession: (declaredAmount: number) =>
    unwrap<CashCloseResult>(window.desktopApi.closeCashSession(declaredAmount)),
  cashSummary: () => unwrap<CashSessionSummary>(window.desktopApi.getCashSummary()),

  listDeliveries: () => unwrap<DeliveryRecord[]>(window.desktopApi.listDeliveries()),
  createDelivery: (input: DeliveryInput) => unwrap<DeliveryRecord>(window.desktopApi.createDelivery(input)),

  dashboardSummary: () => unwrap<DashboardSummary>(window.desktopApi.getDashboardSummary()),

  listServices: (activeOnly?: boolean) => unwrap<Service[]>(window.desktopApi.listServices(activeOnly)),
  createService: (input: ServiceInput) => unwrap<Service>(window.desktopApi.createService(input)),
  updateService: (id: number, input: ServiceInput) => unwrap<Service>(window.desktopApi.updateService(id, input)),
  deleteService: (id: number) => unwrap<{ success: boolean }>(window.desktopApi.deleteService(id))
};