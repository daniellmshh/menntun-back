import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { createPublicKey } from "crypto";
import { prisma } from "../../lib/prisma";
import { JwtPayload, RequestUser } from "../../common/types";

// Module-level cache — fetched once at startup, reused for all requests
let cachedPublicKeyPem: string | null = null;

async function fetchSupabasePublicKey(supabaseUrl: string): Promise<string> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;

  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`);
  }
  const jwks = await res.json() as { keys: any[] };
  const key = jwks.keys?.[0];
  if (!key) throw new Error("No keys found in Supabase JWKS");

  const publicKey = createPublicKey({ key, format: "jwk" });
  cachedPublicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  return cachedPublicKeyPem;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const supabaseUrl =
      configService.get<string>("supabase.url") ||
      process.env.SUPABASE_URL ||
      "";

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Dynamically provide the EC public key from Supabase JWKS (ES256)
      secretOrKeyProvider: async (
        _request: any,
        _rawJwtToken: any,
        done: (err: any, key?: string) => void,
      ) => {
        try {
          const pem = await fetchSupabasePublicKey(supabaseUrl);
          done(null, pem);
        } catch (err) {
          done(err);
        }
      },
      // Supabase tokens use 'authenticated' as audience
      audience: "authenticated",
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await prisma.user.findUnique({
      where: { supabaseUid: payload.sub },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException("User not found or inactive");
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
}
