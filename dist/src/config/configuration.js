"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT || "3001", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    jwt: {
        secret: process.env.JWT_SECRET || "",
        expiration: process.env.JWT_EXPIRATION || "7d",
    },
    supabase: {
        url: process.env.SUPABASE_URL || "",
        anonKey: process.env.SUPABASE_ANON_KEY || "",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
});
//# sourceMappingURL=configuration.js.map