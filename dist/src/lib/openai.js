"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
const openai_1 = require("openai");
const globalForOpenAI = globalThis;
exports.openai = globalForOpenAI.openai ??
    new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
if (process.env.NODE_ENV !== "production")
    globalForOpenAI.openai = exports.openai;
//# sourceMappingURL=openai.js.map