
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Chip } from '@/components/ui/chip';
import { RED_PACKET_ADDRESS, USDC_ADDRESS, TOKENS } from '@/lib/constants';
import RedPacketABI from '@/lib/abi/RedPacket.json';

import { Loader2, Gift, CheckCircle, ArrowLeft, Settings2, Copy, Wallet, Share2 } from 'lucide-react';
import { parseEther, parseUnits, isAddress } from 'viem';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatePage() {
    const { isConnected, chainId } = useAccount();
    const { connect, connectors } = useConnect();
    const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
    const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Mode: 'single' | 'link'
    const [mode, setMode] = useState('link');

    // Form State
    const [token, setToken] = useState(TOKENS[0]); // Default ETH
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [count, setCount] = useState('1'); // Default 1 for single, user input for link
    const [splitType, setSplitType] = useState<'equal' | 'random'>('equal');
    const [message, setMessage] = useState('');
    const [expiry, setExpiry] = useState('24h');

    // UI State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [createdPacketId, setCreatedPacketId] = useState<string | null>(null);

    // Constants
    const MESSAGES = ["Best Wishes! 🎁", "GM! ☀️", "Happy Birthday! 🎂", "Congrats! 🎉", "For Coffee ☕️"];
    const EXPIRY_OPTIONS = [
        { label: '24 Hours', value: '24h', seconds: 86400 },
        { label: '7 Days', value: '7d', seconds: 604800 },
        { label: '1 Hour', value: '1h', seconds: 3600 },
    ];

    // Capture Receipt Logs to find PacketID & Save to LocalStorage
    useEffect(() => {
        if (isSuccess && receipt) {
            const log = receipt.logs.find(l => l.address.toLowerCase() === RED_PACKET_ADDRESS.toLowerCase());
            if (log && log.topics[1]) {
                const pId = log.topics[1];
                setCreatedPacketId(pId);

                // Save to LocalStorage
                const sk = localStorage.getItem('pending_sk');
                const savedPockets = JSON.parse(localStorage.getItem('my_pockets') || '[]');
                const newPocket = {
                    id: pId,
                    amount: amount,
                    token: token.symbol,
                    count: count,
                    claimedCount: 0,
                    expiresAt: Date.now() + (EXPIRY_OPTIONS.find(e => e.value === expiry)?.seconds || 86400) * 1000,
                    status: 'active',
                    mode: mode,
                    sk: sk,
                    createdAt: Date.now()
                };

                if (!savedPockets.find((p: any) => p.id === pId)) {
                    savedPockets.unshift(newPocket);
                    localStorage.setItem('my_pockets', JSON.stringify(savedPockets));
                }
            }
        }
    }, [isSuccess, receipt, amount, token, count, mode, expiry]);

    // Logic
    async function handleCreate() {
        if (!isConnected) return;
        try {
            // 1. Generate Ephemeral Key
            const sk = generatePrivateKey();
            const account = privateKeyToAccount(sk);
            const pk = account.address;

            // 2. Prepare Args
            const parsedAmount = parseUnits(amount || '0', token.decimals);
            const parsedCount = mode === 'single' ? 1n : BigInt(count || '1');
            const isRandom = splitType === 'random' && mode === 'link';
            let duration = BigInt(EXPIRY_OPTIONS.find(e => e.value === expiry)?.seconds || 86400);

            const restrictedTo = mode === 'single' ? (recipient as `0x${string}`) : "0x0000000000000000000000000000000000000000";

            // 3. Save pending SK
            localStorage.setItem('pending_sk', sk);
            localStorage.setItem('pending_token', token.symbol);

            // Check if ETH
            const isNative = token.address === "0x0000000000000000000000000000000000000000";

            writeContract({
                address: RED_PACKET_ADDRESS as `0x${string}`,
                abi: RedPacketABI.abi,
                functionName: 'createPacket',
                args: [
                    token.address as `0x${string}`,
                    parsedAmount,
                    parsedCount,
                    isRandom,
                    pk,
                    restrictedTo,
                    duration,
                    message || "Best Wishes"
                ],
                value: isNative ? parsedAmount : 0n
            });

        } catch (e) {
            console.error(e);
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-card w-full p-8 rounded-3xl border border-border/50 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-500" />
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Packet Created!</h2>
                    <p className="text-muted-foreground mb-8">
                        {mode === 'single' ? `Sent ${amount} ${localStorage.getItem('pending_token')}...` : `Ready to share ${amount} ${localStorage.getItem('pending_token')}`}
                    </p>

                    {mode === 'link' && (
                        <div className="space-y-4">
                            <div className="bg-secondary/50 p-3 rounded-xl break-all text-xs font-mono text-left relative group">
                                {typeof window !== 'undefined' && createdPacketId &&
                                    `${window.location.origin}/claim/${createdPacketId}#sk=${localStorage.getItem('pending_sk')}`
                                }
                                {!createdPacketId && "Generating Link (Wait for confirmation)..."}
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-8 w-8">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button
                                variant="premium"
                                className="w-full h-12"
                                onClick={() => {
                                    if (createdPacketId) {
                                        const url = `${window.location.origin}/claim/${createdPacketId}#sk=${localStorage.getItem('pending_sk')}`;
                                        navigator.clipboard.writeText(url);
                                        alert("Link Copied!");
                                    } else {
                                        alert("Please wait for transaction to confirm...");
                                    }
                                }}
                            >
                                <Share2 className="mr-2 w-4 h-4" /> Share Link
                            </Button>
                        </div>
                    )}

                    {mode === 'single' && (
                        <div className="bg-secondary/30 p-4 rounded-xl mb-6">
                            <p className="text-sm text-muted-foreground">Recipient can claim using the "My Gifts" tab or you can send them the link as a notify.</p>
                        </div>
                    )}

                    <Link href="/create" onClick={() => window.location.reload()}>
                        <Button variant="outline" className="w-full mt-4">Create Another</Button>
                    </Link>

                    <div className="mt-6 pt-6 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Note: Retrieve the actual link from Dashboard if you missed it.</p>
                    </div>
                </motion.div>
            </div>
        )
    }


    if (!mounted) return (
        <main className="min-h-screen pb-20 p-4 max-w-lg mx-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
    )

    return (
        <main className="min-h-screen pb-20 p-4 max-w-lg mx-auto">
            <header className="flex items-center gap-4 mb-8 pt-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Create Pocket</h1>
            </header>

            {!isConnected ? (
                <div className="text-center py-20 space-y-4">
                    <p className="text-muted-foreground">Connect wallet to send gifts.</p>
                    <Button
                        onClick={() => {
                            const injected = connectors.find(c => c.id === 'injected');
                            connect({ connector: injected || connectors[0] });
                        }}
                    >
                        Connect Wallet
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Mode Selection */}
                    <SegmentedControl
                        options={[
                            { label: 'Share via Link', value: 'link' },
                            { label: 'Send Direct', value: 'single' },
                        ]}
                        value={mode}
                        onChange={setMode}
                    />

                    {/* Token & Amount */}
                    <div className="bg-card p-6 rounded-3xl border border-border/50 shadow-lg space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground ml-1 mb-2 block">Token</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 noscroll">
                                {TOKENS.map(t => (
                                    <Chip
                                        key={t.symbol}
                                        active={token.symbol === t.symbol}
                                        onClick={() => setToken(t)}
                                        icon={t.symbol === 'ETH' ? <Wallet className="w-3 h-3" /> : undefined}
                                    >
                                        {t.symbol}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground ml-1 mb-2 block">Total Amount</label>
                            <div className="relative">
                                <Input
                                    className="text-4xl font-bold h-20 pl-4 pr-16 rounded-2xl bg-secondary/30 border-transparent focus:border-primary/50"
                                    placeholder="0.0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    type="number"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                                    {token.symbol}
                                </div>
                            </div>
                        </div>

                        {mode === 'single' ? (
                            <div>
                                <label className="text-sm text-muted-foreground ml-1 mb-2 block">Recipient Address</label>
                                <Input
                                    placeholder="0x..."
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-muted-foreground ml-1 mb-2 block">Quantity</label>
                                    <Input
                                        type="number"
                                        placeholder="10"
                                        value={count}
                                        onChange={e => setCount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground ml-1 mb-2 block">Type</label>
                                    <div className="flex bg-secondary/50 rounded-lg p-1 h-10">
                                        <button
                                            className={`flex-1 rounded-md text-xs font-semibold transition-all ${splitType === 'equal' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                                            onClick={() => setSplitType('equal')}
                                        >
                                            Equal
                                        </button>
                                        <button
                                            className={`flex-1 rounded-md text-xs font-semibold transition-all ${splitType === 'random' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                                            onClick={() => setSplitType('random')}
                                        >
                                            Random
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <div className="space-y-3">
                        <label className="text-sm text-muted-foreground ml-1">Message</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 noscroll">
                            {MESSAGES.map(msg => (
                                <button
                                    key={msg}
                                    onClick={() => setMessage(msg)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all ${message === msg ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border/50 hover:bg-secondary'}`}
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>
                        <Input
                            placeholder="Write a message..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                    </div>

                    {/* Advanced Toggle */}
                    <div className="flex items-center justify-between px-2">
                        <button
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            <Settings2 className="w-4 h-4" /> Advanced Settings
                        </button>
                    </div>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-card p-6 rounded-3xl border border-border/50 space-y-4">
                                    <label className="text-sm text-muted-foreground ml-1 block">Expiry</label>
                                    <div className="flex gap-2">
                                        {EXPIRY_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setExpiry(opt.value)}
                                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${expiry === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary/50'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <Button
                        className="w-full h-16 text-lg rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all font-bold"
                        variant="premium"
                        onClick={handleCreate}
                        disabled={isWritePending || isConfirming || !amount || (mode === 'single' && !isAddress(recipient))}
                    >
                        {isWritePending ? 'Confirm in Wallet...' : isConfirming ? 'Creating...' : `Put ${amount || '0'} ${token.symbol} in Pocket`}
                    </Button>

                    {writeError && (
                        <p className="text-center text-sm text-red-500 bg-red-500/10 p-2 rounded-lg">
                            {writeError.message.includes('User rejected') ? 'Transaction rejected' : 'Error creating packet'}
                        </p>
                    )}
                </div>
            )}
        </main>
    );
}
