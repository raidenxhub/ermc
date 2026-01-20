import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient | null;
			user: User | null;
		}
		interface PageData {
			supabase?: SupabaseClient;
			user?: User | null;
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};
