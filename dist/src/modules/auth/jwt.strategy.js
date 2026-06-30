"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_1 = require("../../lib/prisma");
let cachedPublicKeyPem = null;
async function fetchSupabasePublicKey(supabaseUrl) {
    if (cachedPublicKeyPem)
        return cachedPublicKeyPem;
    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    const res = await fetch(jwksUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch JWKS: ${res.status}`);
    }
    const jwks = await res.json();
    const key = jwks.keys?.[0];
    if (!key)
        throw new Error("No keys found in Supabase JWKS");
    const publicKey = (0, crypto_1.createPublicKey)({ key, format: "jwk" });
    cachedPublicKeyPem = publicKey.export({ type: "spki", format: "pem" });
    return cachedPublicKeyPem;
}
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    constructor(configService) {
        const supabaseUrl = configService.get("supabase.url") ||
            process.env.SUPABASE_URL ||
            "";
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (_request, _rawJwtToken, done) => {
                try {
                    const pem = await fetchSupabasePublicKey(supabaseUrl);
                    done(null, pem);
                }
                catch (err) {
                    done(err);
                }
            },
            audience: "authenticated",
        });
        this.configService = configService;
    }
    async validate(payload) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { supabaseUid: payload.sub },
        });
        if (!user || !user.active) {
            throw new common_1.UnauthorizedException("User not found or inactive");
        }
        return {
            id: user.id,
            supabaseUid: user.supabaseUid,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map