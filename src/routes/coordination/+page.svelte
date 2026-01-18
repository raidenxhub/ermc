<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { createClient } from '@supabase/supabase-js';
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
    import { Send, Bell, User as UserIcon } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let data;

    // Supabase client for realtime
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

    let messageInput = '';
    let chatContainer: HTMLElement;
    let messages = data.messages || [];

    // Sound effect
    // We'll use a simple beep using AudioContext or a data URI if no file exists
    // Using a simple base64 beep for now to ensure it works without external files
    const knockSound = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // This is likely invalid/empty, let's use a real one or just visual toast if fail.
    // Actually, let's try to play a browser notification sound or just rely on toast for now if file missing.
    
    function playKnock() {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Public domain knock/bell sound
            audio.play().catch(e => console.error('Audio play failed', e));
        } catch (e) {
            console.error('Audio setup failed', e);
        }
    }

    onMount(() => {
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
                })
                .subscribe();

            // Subscribe to Knocks
            const knockChannel = supabase
                .channel(`knocks:${data.user.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'knocks', filter: `to_user_id=eq.${data.user.id}` }, (payload) => {
                    playKnock();
                    toast.message('Knock Knock!', { description: 'Someone is trying to get your attention.' });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(messageChannel);
                supabase.removeChannel(knockChannel);
            };
        }
    });

    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
</script>

<div class="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
    {#if !data.access}
        <div class="flex-1 flex items-center justify-center">
            <div class="max-w-md text-center space-y-4 p-8 border rounded-xl bg-card shadow-lg">
                <div class="text-4xl">🚫</div>
                <h1 class="text-2xl font-bold">Access Denied</h1>
                <p class="text-muted-foreground">{data.reason}</p>
                {#if data.booking}
                     <div class="bg-muted p-4 rounded-lg text-sm text-left">
                        <p class="font-semibold">Your Booking:</p>
                        <p>Event: {data.booking.event?.name}</p>
                        <p>Position: {data.booking.position}</p>
                        <p class="mt-2 text-xs opacity-70">Make sure you are logged into VATSIM with a matching callsign.</p>
                     </div>
                {/if}
                <button class="btn btn-primary" on:click={() => window.location.reload()}>Check Again</button>
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
                 <span class="badge badge-outline">{data.onlineRoster.filter(r => r.isOnline).length} Online</span>
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
                        use:enhance={() => {
                            messageInput = '';
                            return async ({ update }) => {
                                await update({ reset: false });
                                scrollToBottom();
                            };
                        }}
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
                        <button class="btn btn-primary btn-square">
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            <!-- Sidebar: Online Roster -->
            <div class="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                <div class="p-4 border-b bg-muted/30 font-medium">Active Controllers</div>
                <div class="flex-1 overflow-y-auto p-2 space-y-1">
                    {#each data.onlineRoster as controller}
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
                                <form method="POST" action="?/knock" use:enhance>
                                    <input type="hidden" name="to_user_id" value={controller.user_id} />
                                    <input type="hidden" name="event_id" value={data.event.id} />
                                    <button class="btn btn-ghost btn-xs btn-square text-warning" title="Knock">
                                        <Bell size={16} />
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {/each}
                    
                    {#if data.onlineRoster.length === 0}
                         <div class="p-4 text-center text-sm text-muted-foreground">No active controllers.</div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
