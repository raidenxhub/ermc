import { writable } from 'svelte/store';

export type ConfirmOptions = {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
};

type ConfirmState = (ConfirmOptions & { resolve: (value: boolean) => void }) | null;

export const confirmState = writable<ConfirmState>(null);

export const confirm = (options: ConfirmOptions) =>
	new Promise<boolean>((resolve) => {
		confirmState.set({ ...options, resolve });
	});

export const resolveConfirm = (value: boolean) => {
	confirmState.update((state) => {
		if (state) state.resolve(value);
		return null;
	});
};
