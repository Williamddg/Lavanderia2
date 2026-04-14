"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.licenseService = void 0;
const node_os_1 = __importDefault(require("node:os"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const supabase_js_1 = require("@supabase/supabase-js");
const ElectronStore = require('electron-store').default;
const store = new ElectronStore({
    name: 'license-store'
});
const SUPABASE_URL = 'https://wswuifmfauepefrtaonf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aun5sv8y2isZI_ISPRfeDg_3rBQP6Rp';
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const getMachineId = () => {
    const raw = `${node_os_1.default.hostname()}|${node_os_1.default.platform()}|${node_os_1.default.arch()}`;
    return node_crypto_1.default.createHash('sha256').update(raw).digest('hex');
};
class LicenseService {
    getCached() {
        return store.get('license') ?? null;
    }
    saveCached(data) {
        store.set('license', data);
    }
    clearCached() {
        store.delete('license');
    }
    async activate(licenseKey, appVersion) {
        const machineId = getMachineId();
        const { data, error } = await supabase.functions.invoke('validate-license', {
            body: { licenseKey, machineId, appVersion }
        });
        if (error) {
            throw new Error(error.message || 'No se pudo validar la licencia.');
        }
        if (!data?.valid) {
            throw new Error(data?.message || 'Licencia inválida.');
        }
        this.saveCached({
            licenseKey,
            expiresAt: data.expiresAt,
            daysLeft: data.daysLeft,
            lastValidatedAt: new Date().toISOString(),
            planType: data.planType,
            businessName: data.businessName ?? null,
            phone: data.phone ?? null
        });
        return data;
    }
    async status(appVersion) {
        const cached = this.getCached();
        if (!cached?.licenseKey) {
            return {
                valid: false,
                requiresActivation: true,
                message: 'Debes activar la licencia.'
            };
        }
        try {
            const fresh = await this.activate(cached.licenseKey, appVersion);
            return {
                valid: true,
                requiresActivation: false,
                warning: Boolean(fresh.warning),
                daysLeft: Number(fresh.daysLeft ?? 0),
                expiresAt: fresh.expiresAt,
                message: fresh.message,
                businessName: fresh.businessName ?? null,
                phone: fresh.phone ?? null
            };
        }
        catch (error) {
            const lastValidated = cached.lastValidatedAt
                ? new Date(cached.lastValidatedAt)
                : null;
            const hoursSinceLastValidation = lastValidated
                ? (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60)
                : Number.POSITIVE_INFINITY;
            if (hoursSinceLastValidation <= 72) {
                return {
                    valid: true,
                    offlineGrace: true,
                    requiresActivation: false,
                    warning: Number(cached.daysLeft ?? 0) <= 5,
                    daysLeft: Number(cached.daysLeft ?? 0),
                    expiresAt: cached.expiresAt,
                    message: 'Modo sin conexión temporal.',
                    businessName: cached.businessName ?? null,
                    phone: cached.phone ?? null
                };
            }
            return {
                valid: false,
                requiresActivation: true,
                message: error instanceof Error ? error.message : 'Licencia inválida.'
            };
        }
    }
}
exports.licenseService = new LicenseService();
