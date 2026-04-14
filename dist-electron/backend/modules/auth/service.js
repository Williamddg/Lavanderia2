"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthService = void 0;
const zod_1 = require("zod");
const kysely_1 = require("kysely");
const password_js_1 = require("../../security/password.js");
const schema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(3)
});
const passwordSchema = zod_1.z.object({
    password: zod_1.z.string().min(3)
});
const createAuthService = (db) => ({
    async login(input) {
        const parsed = schema.parse(input);
        const user = await db
            .selectFrom('users as u')
            .innerJoin('roles as r', 'r.id', 'u.role_id')
            .select([
            'u.id',
            'u.username',
            'u.role_id',
            'u.password_hash',
            'u.full_name',
            (0, kysely_1.sql) `r.name`.as('role_name')
        ])
            .where('u.username', '=', parsed.username)
            .where('u.is_active', '=', 1)
            .executeTakeFirst();
        if (!user || !(0, password_js_1.verifyPasswordHash)(parsed.password, user.password_hash)) {
            throw new Error('Credenciales inválidas.');
        }
        if (!(0, password_js_1.isSecurePasswordHash)(user.password_hash)) {
            await db
                .updateTable('users')
                .set({
                password_hash: (0, password_js_1.hashPassword)(parsed.password)
            })
                .where('id', '=', user.id)
                .execute();
        }
        await db
            .insertInto('audit_logs')
            .values({
            user_id: user.id,
            action: 'LOGIN_SUCCESS',
            entity_type: 'user',
            entity_id: String(user.id),
            details_json: JSON.stringify({ username: user.username })
        })
            .execute();
        return {
            id: user.id,
            username: user.username,
            roleId: user.role_id,
            roleName: user.role_name,
            displayName: user.full_name
        };
    },
    async verifyPassword(password) {
        const parsed = passwordSchema.parse({ password });
        const setting = await db
            .selectFrom('app_settings')
            .select(['id', 'setting_value'])
            .where('setting_key', '=', 'order_protection_password')
            .executeTakeFirst();
        const storedValue = String(setting?.setting_value ?? '');
        if (!setting || !(0, password_js_1.verifyPasswordHash)(parsed.password, storedValue)) {
            throw new Error('Contraseña administrativa incorrecta.');
        }
        if (!(0, password_js_1.isSecurePasswordHash)(storedValue)) {
            await db
                .updateTable('app_settings')
                .set({
                setting_value: (0, password_js_1.hashPassword)(parsed.password)
            })
                .where('id', '=', setting.id)
                .execute();
        }
        await db
            .insertInto('audit_logs')
            .values({
            user_id: null,
            action: 'ORDER_PROTECTION_PASSWORD_SUCCESS',
            entity_type: 'app_settings',
            entity_id: String(setting.id),
            details_json: JSON.stringify({
                settingKey: 'order_protection_password'
            })
        })
            .execute();
        return { valid: true };
    }
});
exports.createAuthService = createAuthService;
