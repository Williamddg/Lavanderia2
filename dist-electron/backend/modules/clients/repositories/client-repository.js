"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientRepository = void 0;
const createClientRepository = (db) => ({
    list: () => db.selectFrom('clients').selectAll().orderBy('id desc').execute(),
    findById: (id) => db.selectFrom('clients').selectAll().where('id', '=', id).executeTakeFirst(),
    count: () => db.selectFrom('clients').select((eb) => eb.fn.count('id').as('count')).executeTakeFirstOrThrow(),
    update: (id, values) => db.updateTable('clients').set(values).where('id', '=', id).executeTakeFirstOrThrow(),
    delete: (id) => db.deleteFrom('clients').where('id', '=', id).executeTakeFirstOrThrow()
});
exports.createClientRepository = createClientRepository;
