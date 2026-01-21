declare module '$env/static/public' {
  export const PUBLIC_SUPABASE_URL: string;
  export const PUBLIC_SUPABASE_ANON_KEY: string;
  export const PUBLIC_SITE_URL: string;
}

declare module '$env/static/private' {
  export const SUPABASE_SERVICE_ROLE: string;
  export const ACCESS_KEY: string;
  export const SITE_URL: string;
  export const PUBLIC_SITE_URL: string;
  export const VERCEL_URL: string;
  export const DISCORD_GUILD_ID: string;
  export const CONTACT_DISCORD_WEBHOOK_URL: string;
  export const VATSIM_HOSTNAME: string;
}

declare module '$env/dynamic/public' {
  export const env: {
    PUBLIC_SUPABASE_URL?: string;
    PUBLIC_SUPABASE_ANON_KEY?: string;
    PUBLIC_SITE_URL?: string;
    [key: `PUBLIC_${string}`]: string | undefined;
  };
}

declare module '$env/dynamic/private' {
  export const env: Record<string, string | undefined>;
}
