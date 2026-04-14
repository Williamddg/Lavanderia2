"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditService = void 0;
const createAuditService = (db) => ({
    async log(action, entityType, entityId, details, userId) {
        await db
            .insertInto('audit_logs')
            .values({
            action,
            entity_type: entityType,
            entity_id: entityId,
            details_json: details ? JSON.stringify(details) : null,
            user_id: userId ?? null
        })
            .execute();
    }
});
exports.createAuditService = createAuditService;
