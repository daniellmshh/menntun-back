"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse(data, meta = null) {
    return { data, meta, error: null };
}
function errorResponse(message) {
    return { data: null, meta: null, error: message };
}
//# sourceMappingURL=index.js.map