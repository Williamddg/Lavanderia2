/// <reference types="vite/client" />

import type {
  ApiResponse,
  ClientInput,
  DbConnectionConfig,
  DeliveryInput,
  ExternalLinkPayload,
  LoginInput,
  OrderInput,
  PaymentInput,
  Service,
  ServiceInput
} from '@shared/types';

declare global {
  interface Window {
    desktopApi: {
      verifyPassword: (password: string) => Promise<ApiResponse<{ valid: boolean }>>;
      getOrderProtectionPassword: () => Promise<unknown>;
      updateOrderProtectionPassword: (input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => Promise<unknown>;

      updateOrder: (orderId: number, input: OrderInput) => Promise<unknown>;
      cancelOrder: (orderId: number) => Promise<unknown>;

      getLicenseStatus: () => Promise<unknown>;
      activateLicense: (licenseKey: string) => Promise<unknown>;

      connectDriveBackup: () => Promise<unknown>;
      uploadBackupToDrive: () => Promise<unknown>;
      listBackups: () => Promise<unknown>;

      listPrinters: () => Promise<unknown>;
      openCashDrawer: (printerName?: string) => Promise<unknown>;

      updateCompanySettings: (input: any) => Promise<any>;

      getReportsSummary: (from?: string, to?: string) => Promise<unknown>;

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

      health: () => Promise<unknown>;
      openExternal: (payload: ExternalLinkPayload) => Promise<unknown>;
      saveDbConfig: (config: DbConnectionConfig) => Promise<unknown>;
      login: (input: LoginInput) => Promise<unknown>;
      getCompanySettings: () => Promise<unknown>;

      listClients: () => Promise<unknown>;
      createClient: (input: ClientInput) => Promise<unknown>;
      updateClient: (id: number, input: ClientInput) => Promise<unknown>;
      deleteClient: (id: number) => Promise<unknown>;

      listOrders: () => Promise<unknown>;
      getOrderDetail: (id: number) => Promise<unknown>;
      getOrderCatalogs: () => Promise<unknown>;
      createOrder: (input: OrderInput) => Promise<unknown>;
      updateOrderStatus: (orderId: number, statusId: number) => Promise<unknown>;

      listPayments: (orderId?: number) => Promise<unknown>;
      createPayment: (input: PaymentInput) => Promise<unknown>;

      listInvoices: () => Promise<unknown>;
      getInvoiceDetail: (id: number) => Promise<unknown>;
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