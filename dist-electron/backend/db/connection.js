"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDb = void 0;
const kysely_1 = require("kysely");
const mysql2_1 = __importDefault(require("mysql2"));
const createDb = (config) => new kysely_1.Kysely({
    dialect: new kysely_1.MysqlDialect({
        pool: mysql2_1.default.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: config.ssl ? {} : undefined,
            decimalNumbers: true,
            connectionLimit: 10
        })
    })
});
exports.createDb = createDb;
