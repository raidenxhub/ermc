<script lang="ts">
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms';
    import { goto, invalidateAll } from '$app/navigation';
    import { createClient } from '@supabase/supabase-js';
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
    import { Send, Bell, Ban, Check, Volume2, X, LoaderCircle } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let data;
    let hadAccess = !!data.access;
    $: if (hadAccess && !data.access) {
        toast.error(data.reason || 'Coordination ended or you disconnected.');
        void goto('/rostering');
    }
    $: hadAccess = !!data.access;

    // Supabase client for realtime
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

    let messageInput = '';
    let chatContainer: HTMLElement;
    let messages = data.messages || [];
    let onlineRoster = data.onlineRoster || [];
    $: onlineRoster = data.onlineRoster || [];
    let sendState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    let knockStateByUserId: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
    type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

    let alertVolume = 0.35;
    let audioReady = false;
    let alertAudio: HTMLAudioElement | null = null;

    const clampVolume = (value: number) => Math.min(1, Math.max(0.05, value));

    function playAlert() {
        if (!audioReady || !alertAudio) return;
        if (!alertAudio.paused) return;
        try {
            alertAudio.volume = clampVolume(alertVolume);
            alertAudio.currentTime = 0;
            void alertAudio.play().catch(() => {});
        } catch (e) { void e; }
    }

    const setKnockState = (userId: string, state: 'idle' | 'loading' | 'success' | 'error') => {
        knockStateByUserId = { ...knockStateByUserId, [userId]: state };
    };

    const knockSubmit = (toUserId: string): SubmitFunction => () => {
        setKnockState(toUserId, 'loading');
        return async ({ result, update }) => {
            await update({ reset: false });
            if (result.type === 'success') {
                setKnockState(toUserId, 'success');
                setTimeout(() => setKnockState(toUserId, 'idle'), 2000);
                return;
            }
            setKnockState(toUserId, 'error');
            setTimeout(() => setKnockState(toUserId, 'idle'), 2000);
        };
    };

    const sendSubmit: SubmitFunction = () => {
        sendState = 'loading';
        return async ({ result, update }) => {
            if (result.type === 'success') {
                messageInput = '';
                await update({ reset: false });
                scrollToBottom();
                sendState = 'success';
                setTimeout(() => (sendState = 'idle'), 2000);
                return;
            }

            await update({ reset: false });
            sendState = 'error';
            toast.error('Failed to send message.');
            setTimeout(() => (sendState = 'idle'), 2000);
        };
    };

    onMount(() => {
        try {
            const stored = localStorage.getItem('ermc:alertVolume');
            if (stored) {
                const parsed = Number.parseFloat(stored);
                if (Number.isFinite(parsed)) alertVolume = clampVolume(parsed);
            }
        } catch (e) { void e; }

        alertAudio = new Audio('/alert.mp3');
        alertAudio.preload = 'auto';
        alertAudio.volume = clampVolume(alertVolume);

        const unlock = () => {
            audioReady = true;
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });

        if (data.access && data.event) {
            scrollToBottom();

            // Subscribe to Messages
            const messageChannel = supabase
                .channel(`event-messages:${data.event.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${data.event.id}` }, async (payload) => {
                    // Fetch user profile for the new message
                    // In a real app we'd join, but for realtime we might need to fetch or optimistic update
                    // For now, let's just push payload and maybe missing name until refresh
                    // Or better: payload.new usually only has raw data. 
                    // Let's rely on the fact that we can't easily get the join here without a function.
                    // We'll just show "User [ID]" if we can't find them in the roster list.
                    
                    const sender = data.onlineRoster?.find(r => r.user?.id === payload.new.user_id)?.user;
                    const newMessage = {
                        ...payload.new,
                        user: sender || { name: 'Unknown', cid: '?' }
                    };
                    
                    messages = [...messages, newMessage];
                    setTimeout(scrollToBottom, 50);

                    if (document.visibilityState !== 'visible' && payload.new.user_id !== data.user.id) {
                        playAlert();
                    }
                })
                .subscribe();

            // Subscribe to Knocks
            const knockChannel = supabase
                .channel(`knocks:${data.user.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'knocks', filter: `to_user_id=eq.${data.user.id}` }, () => {
                    playAlert();
                    toast.message('Knock Knock!', { description: 'Someone is trying to get your attention.' });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(messageChannel);
                supabase.removeChannel(knockChannel);
                try {
                    alertAudio?.pause();
                    alertAudio = null;
                } catch (e) { void e; }
            };
        }

        // Poll every 10 seconds to re-validate access (VATSIM online status)
        const interval = setInterval(() => {
            invalidateAll();
        }, 10000);

        return () => {
            clearInterval(interval);
            try {
                alertAudio?.pause();
                alertAudio = null;
            } catch (e) { void e; }
        };
    });

    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
</script>

<svelte:head>
    <title>Coordination</title>
    <meta name="description" content="Live event chat, controller roster presence, and knock alerts." />
</svelte:head>

<div class="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
    <div class="mb-4 space-y-2">
        <h1 class="text-3xl font-bold">Coordination</h1>
        <p class="text-muted-foreground">Live event chat, controller roster presence, and knock alerts.</p>
    </div>
    {#if !data.access}
        <div class="flex-1 flex items-center justify-center">
            <div class="max-w-md text-center space-y-4 p-8 border rounded-xl bg-card shadow-lg">
                <div class="flex justify-center">
                    <Ban size={48} class="text-error" />
                </div>
                <h1 class="text-2xl font-bold">Coordination Unavailable</h1>
                <p class="text-muted-foreground">{data.reason || "You don't have an active event booking right now."}</p>
                {#if data.booking}
                     <div class="bg-muted p-4 rounded-lg text-sm text-left">
                        <p class="font-semibold">Your Booking:</p>
                        <p>Event: {data.booking.event?.name}</p>
                        <p>Position: {data.booking.position}</p>
                        <p class="mt-2 text-xs opacity-70">Make sure you are logged into VATSIM with a matching callsign.</p>
                     </div>
                {/if}
                <a href="/rostering" class="btn btn-primary">Find an Event</a>
            </div>
        </div>
    {:else}
        <div class="mb-4 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    Live Coordination
                </h1>
                <p class="text-sm text-muted-foreground">{data.event.name} • {data.booking.position}</p>
            </div>
            <div class="flex gap-2">
                 <span class="badge badge-outline">{onlineRoster.filter(r => r.isOnline).length} Online</span>
            </div>
        </div>

        <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
            <!-- Chat Area -->
            <div class="lg:col-span-3 flex flex-col border rounded-xl bg-card shadow-sm overflow-hidden">
                <div class="p-4 border-b bg-muted/30 font-medium">Global Event Chat</div>
                
                <div class="flex-1 overflow-y-auto p-4 space-y-4" bind:this={chatContainer}>
                    {#each messages as msg}
                        <div class="flex flex-col {msg.user_id === data.user.id ? 'items-end' : 'items-start'}">
                            <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <span class="font-bold text-foreground">{msg.user?.name}</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div class="px-4 py-2 rounded-lg max-w-[80%] {msg.user_id === data.user.id ? 'bg-primary text-primary-content' : 'bg-muted'}">
                                {msg.content}
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="p-4 border-t bg-muted/10">
                    <form 
                        method="POST" 
                        action="?/sendMessage" 
                        use:enhance={sendSubmit}
                        class="flex gap-2"
                    >
                        <input type="hidden" name="event_id" value={data.event.id} />
                        <input 
                            type="text" 
                            name="content" 
                            bind:value={messageInput}
                            placeholder="Type a message to all controllers..." 
                            class="input input-bordered flex-1"
                            autocomplete="off"
                        />
                        <button
                            class="btn btn-square {sendState === 'success' ? 'btn-success' : sendState === 'error' ? 'btn-error' : 'btn-primary'}"
                            disabled={sendState === 'loading' || sendState === 'success'}
                        >
                            {#if sendState === 'loading'}
                                <LoaderCircle size={18} class="animate-spin" />
                            {:else if sendState === 'success'}
                                <Check size={18} />
                            {:else if sendState === 'error'}
                                <X size={18} />
                            {:else}
                                <Send size={18} />
                            {/if}
                        </button>
                    </form>
                </div>
            </div>

            <!-- Sidebar: Online Roster -->
            <div class="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                <div class="p-4 border-b bg-muted/30 flex items-center justify-between gap-3">
                    <div class="font-medium">Active Controllers</div>
                    <div class="flex items-center gap-2">
                        <Volume2 size={16} class="opacity-70" />
                        <input
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            value={alertVolume}
                            class="range range-xs w-24"
                            on:input={(e) => {
                                const v = Number.parseFloat((e.currentTarget as HTMLInputElement).value);
                                alertVolume = clampVolume(Number.isFinite(v) ? v : 0.35);
                                try {
                                    localStorage.setItem('ermc:alertVolume', String(alertVolume));
                                } catch (e) { void e; }
                                if (alertAudio) alertAudio.volume = alertVolume;
                            }}
                        />
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-2 space-y-1">
                    {#each onlineRoster as controller}
                        <div class="flex items-center justify-between p-3 rounded-lg border {controller.isOnline ? 'bg-green-500/5 border-green-500/20' : 'opacity-60 grayscale'}">
                            <div class="flex items-center gap-3">
                                <div class="avatar placeholder">
                                    <div class="bg-neutral text-neutral-content rounded-full w-8">
                                        <span class="text-xs">{controller.position.slice(-3)}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col">
                                    <span class="font-medium text-sm">{controller.position}</span>
                                    <span class="text-xs text-muted-foreground">{controller.user?.name}</span>
                                </div>
                            </div>
                            
                            {#if controller.isOnline && controller.user_id !== data.user.id}
                                <form method="POST" action="?/knock" use:enhance={knockSubmit(controller.user_id)}>
                                    <input type="hidden" name="to_user_id" value={controller.user_id} />
                                    <input type="hidden" name="event_id" value={data.event.id} />
                                    <button
                                        class="btn btn-xs btn-square {knockStateByUserId[controller.user_id] === 'success' ? 'btn-success' : knockStateByUserId[controller.user_id] === 'error' ? 'btn-error' : 'btn-ghost'} {knockStateByUserId[controller.user_id] === 'idle' ? 'text-warning' : ''}"
                                        disabled={knockStateByUserId[controller.user_id] === 'loading' || knockStateByUserId[controller.user_id] === 'success'}
                                        title="Knock"
                                    >
                                        {#if knockStateByUserId[controller.user_id] === 'loading'}
                                            <LoaderCircle size={16} class="animate-spin" />
                                        {:else if knockStateByUserId[controller.user_id] === 'success'}
                                            <Check size={16} />
                                        {:else if knockStateByUserId[controller.user_id] === 'error'}
                                            <X size={16} />
                                        {:else}
                                            <Bell size={16} />
                                        {/if}
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {/each}
                    
                    {#if onlineRoster.length === 0}
                         <div class="p-4 text-center text-sm text-muted-foreground">No active controllers.</div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
