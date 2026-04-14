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
const userAccessSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(3),
    password: zod_1.z.string().min(3)
});
const initialUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(3).max(120),
    username: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(32)
        .regex(/^[a-z][a-z0-9._-]+$/, 'El usuario solo puede contener letras minúsculas, números, punto, guion y guion bajo.'),
    password: zod_1.z
        .string()
        .min(10, 'La contraseña debe tener al menos 10 caracteres.')
        .max(128)
        .refine((value) => /[A-Z]/.test(value), 'La contraseña debe incluir una mayúscula.')
        .refine((value) => /[a-z]/.test(value), 'La contraseña debe incluir una minúscula.')
        .refine((value) => /\d/.test(value), 'La contraseña debe incluir un número.')
        .refine((value) => /[^A-Za-z0-9]/.test(value), 'La contraseña debe incluir un carácter especial.'),
    roleId: zod_1.z.number().int().positive()
});
const bootstrapUsersSchema = zod_1.z.object({
    users: zod_1.z.array(initialUserSchema).min(1).max(20)
});
const createAuthService = (db) => ({
    async verifyUserAccess(input) {
        const parsed = userAccessSchema.parse(input);
        const user = await db
            .selectFrom('users')
            .select(['id', 'username', 'password_hash'])
            .where('username', '=', parsed.username)
            .where('is_active', '=', 1)
            .executeTakeFirst();
        if (!user || !(0, password_js_1.verifyPasswordHash)(parsed.password, user.password_hash)) {
            throw new Error('La contraseña del usuario es incorrecta.');
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
            action: 'SETTINGS_ACCESS_CONFIRMED',
            entity_type: 'user',
            entity_id: String(user.id),
            details_json: JSON.stringify({ username: user.username })
        })
            .execute();
        return { valid: true };
    },
    async listBootstrapRoles() {
        return db
            .selectFrom('roles')
            .select(['id', 'name', 'description'])
            .orderBy('id')
            .execute();
    },
    async bootstrapUsers(input) {
        const parsed = bootstrapUsersSchema.parse(input);
        const normalizedUsers = parsed.users.map((user) => ({
            ...user,
            username: user.username.trim().toLowerCase(),
            fullName: user.fullName.trim()
        }));
        const uniqueUsernames = new Set(normalizedUsers.map((user) => user.username));
        if (uniqueUsernames.size !== normalizedUsers.length) {
            throw new Error('No se permiten usuarios repetidos en la instalación inicial.');
        }
        const totalUsers = await db
            .selectFrom('users')
            .select((eb) => eb.fn.count('id').as('count'))
            .executeTakeFirst();
        if (Number(totalUsers?.count ?? 0) > 0) {
            throw new Error('La instalación inicial de usuarios ya fue completada.');
        }
        const roles = await db
            .selectFrom('roles')
            .select(['id', 'name'])
            .execute();
        const rolesById = new Map(roles.map((role) => [role.id, role.name]));
        const hasAdministrator = normalizedUsers.some((user) => rolesById.get(user.roleId) === 'Administrador');
        if (!hasAdministrator) {
            throw new Error('Debes crear al menos un usuario con rol Administrador.');
        }
        const invalidRole = normalizedUsers.find((user) => !rolesById.has(user.roleId));
        if (invalidRole) {
            throw new Error(`El rol seleccionado para "${invalidRole.username}" no es válido.`);
        }
        await db.transaction().execute(async (trx) => {
            for (const user of normalizedUsers) {
                await trx
                    .insertInto('users')
                    .values({
                    role_id: user.roleId,
                    username: user.username,
                    password_hash: (0, password_js_1.hashPassword)(user.password),
                    full_name: user.fullName,
                    is_active: 1
                })
                    .execute();
            }
            await trx
                .insertInto('audit_logs')
                .values({
                user_id: null,
                action: 'INITIAL_USERS_BOOTSTRAPPED',
                entity_type: 'users',
                entity_id: 'bootstrap',
                details_json: JSON.stringify({
                    users: normalizedUsers.map((user) => ({
                        username: user.username,
                        roleId: user.roleId
                    }))
                })
            })
                .execute();
        });
        return { createdUsers: normalizedUsers.length };
    },
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
