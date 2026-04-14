/// <reference types="vite/client" />

import type {
  ApiResponse,
  ClientInput,
  CompanySettings,
  CompanySettingsInput,
  DbConnectionConfig,
  DeliveryInput,
  ExternalLinkPayload,
  BootstrapRole,
  HealthStatus,
  InitialUsersSetupInput,
  InitialUsersSetupResult,
  LocalInstallInput,
  LocalInstallResult,
  Invoice,
  InvoiceDetail,
  LicenseStatus,
  LoginInput,
  Order,
  OrderDetail,
  OrderProtectionPasswordInput,
  OrderInput,
  Payment,
  PaymentInput,
  PrinterInfo,
  ReportsSummary,
  Service,
  ServiceInput,
  SessionUser,
  UserAccessVerificationInput
} from '@shared/types';

declare global {
  interface Window {
    desktopApi: {
      verifyPassword: (password: string) => Promise<ApiResponse<{ valid: boolean }>>;
      verifyUserAccess: (
        input: UserAccessVerificationInput
      ) => Promise<ApiResponse<{ valid: true }>>;
      listBootstrapRoles: () => Promise<ApiResponse<BootstrapRole[]>>;
      bootstrapUsers: (
        input: InitialUsersSetupInput
      ) => Promise<ApiResponse<InitialUsersSetupResult>>;
      updateOrderProtectionPassword: (
        input: OrderProtectionPasswordInput
      ) => Promise<ApiResponse<{ success: true }>>;

      updateOrder: (orderId: number, input: OrderInput) => Promise<ApiResponse<OrderDetail>>;
      cancelOrder: (orderId: number) => Promise<ApiResponse<{ success: boolean }>>;

      getLicenseStatus: () => Promise<ApiResponse<LicenseStatus>>;
      activateLicense: (licenseKey: string) => Promise<ApiResponse<LicenseStatus>>;

      connectDriveBackup: () => Promise<unknown>;
      uploadBackupToDrive: () => Promise<unknown>;
      listBackups: () => Promise<unknown>;

      listPrinters: () => Promise<ApiResponse<PrinterInfo[]>>;
      openCashDrawer: (printerName?: string) => Promise<unknown>;

      updateCompanySettings: (
        input: CompanySettingsInput
      ) => Promise<ApiResponse<CompanySettings | null>>;

      getReportsSummary: (from?: string, to?: string) => Promise<ApiResponse<ReportsSummary>>;

      listWarranties: () => Promise<unknown>;
      listWarrantyStatuses: () => Promise<unknown>;
      createWarranty: (input: { orderId: number; reason: string }) => Promise<unknown>;
      updateWarrantyStatus: (
        id: number,
        input: { statusId: number; resolution: string | null }
      ) => Promise<unknown>;

      listExpenses: () => Promise<unknown>;
      createExpense: (input: {
        categoryId: number;
        amount: number;
        description: string;
        expenseDate: string;
      }) => Promise<unknown>;
      listExpenseCategories: () => Promise<unknown>;

      listServices: (activeOnly?: boolean) => Promise<Service[]>;
      createService: (input: ServiceInput) => Promise<Service>;
      updateService: (id: number, input: ServiceInput) => Promise<Service>;
      deleteService: (id: number) => Promise<{ success: boolean }>;

      health: () => Promise<ApiResponse<HealthStatus>>;
      openExternal: (payload: ExternalLinkPayload) => Promise<ApiResponse<{ opened: true }>>;
      saveDbConfig: (config: DbConnectionConfig) => Promise<ApiResponse<HealthStatus>>;
      bootstrapLocalInstall: (input: LocalInstallInput) => Promise<ApiResponse<LocalInstallResult>>;
      login: (input: LoginInput) => Promise<ApiResponse<SessionUser>>;
      getCompanySettings: () => Promise<ApiResponse<CompanySettings | null>>;

      listClients: () => Promise<unknown>;
      createClient: (input: ClientInput) => Promise<unknown>;
      updateClient: (id: number, input: ClientInput) => Promise<unknown>;
      deleteClient: (id: number) => Promise<unknown>;

      listOrders: () => Promise<ApiResponse<Order[]>>;
      getOrderDetail: (id: number) => Promise<ApiResponse<OrderDetail>>;
      getOrderCatalogs: () => Promise<unknown>;
      createOrder: (input: OrderInput) => Promise<unknown>;
      updateOrderStatus: (orderId: number, statusId: number) => Promise<unknown>;

      listPayments: (orderId?: number) => Promise<ApiResponse<Payment[]>>;
      createPayment: (input: PaymentInput) => Promise<ApiResponse<Payment>>;

      listInvoices: () => Promise<ApiResponse<Invoice[]>>;
      getInvoiceDetail: (id: number) => Promise<ApiResponse<InvoiceDetail>>;
      createInvoiceFromOrder: (orderId: number) => Promise<unknown>;

      openCashSession: (input: {
  openingAmount?: number;
  openedByName: string;
  openedByPhone: string;
}) => Promise<unknown>;
      closeCashSession: (declaredAmount: number) => Promise<unknown>;
      getCashSummary: () => Promise<unknown>;

      listDeliveries: () => Promise<unknown>;
      createDelivery: (input: DeliveryInput) => Promise<unknown>;

      getDashboardSummary: () => Promise<unknown>;
    };
  }
}

export {};
