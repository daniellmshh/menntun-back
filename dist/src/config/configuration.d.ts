declare const _default: () => {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    jwt: {
        secret: string;
        expiration: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
    };
};
export default _default;
