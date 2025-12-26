
'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useConnect, useReadContract, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

import { RED_PACKET_ADDRESS, TOKENS } from '@/lib/constants';
import RedPacketABI from '@/lib/abi/RedPacket.json';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, toBytes, formatUnits } from 'viem';
import { Gift, CheckCircle, XCircle, Sparkles, LockOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function ClaimPage() {
    const { id } = useParams();
    const packetId = (Array.isArray(id) ? id[0] : id) as `0x${string}`;

    const { address, isConnected, chain } = useAccount();
    const { connect, connectors } = useConnect();
    const { writeContract, isPending, isSuccess, error } = useWriteContract();
    const { switchChain } = useSwitchChain();

    const [sk, setSk] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false); // Envelope state

    // Read Packet Data
    const { data: packet, error: readError, isLoading: isReading }: any = useReadContract({
        address: RED_PACKET_ADDRESS as `0x${string}`,
        abi: RedPacketABI.abi,
        functionName: 'packets',
        args: [packetId],
        chainId: base.id,
        query: {
            enabled: !!packetId
        }
    });

    useEffect(() => {
        if (readError) console.error("Read Contract Error:", readError);
        if (packet) console.log("Packet Data Loaded:", packet);
    }, [packet, readError]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // ...
            const hash = window.location.hash;
            const params = new URLSearchParams(hash.replace('#', ''));
            const skVal = params.get('sk');
            if (skVal) setSk(skVal);
        }
    }, []);

    useEffect(() => {
        if (isSuccess) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FF4500', '#FFD700', '#FFFFFF']
            });
        }
    }, [isSuccess]);

    // Token & Message Handling
    // struct Packet { creator, token, balance, initialBalance, count, initialCount, isRandom, expiresAt, signerPtr, restrictedTo, message }
    // return array: [creator, token, balance, initialBalance, count, initialCount, isRandom, expiresAt, signerPtr, message] -- Wait, restrictedTo might be missing in older ABIs or read returns?
    // Let's rely on index or named properties if Wagmi returns object? Wagmi/Viem returns Array usually for structs.
    // Based on updated contract:
    // 0: creator
    // 1: token
    // 2: balance
    // 3: initialBalance
    // 4: count
    // 5: initialCount
    // 6: isRandom
    // 7: expiresAt
    // 8: signerPtr
    // 9: restrictedTo (NEW)
    // 10: message

    const tokenAddr = packet ? packet[1] : null;
    const tokenInfo = tokenAddr ? TOKENS.find(t => t.address.toLowerCase() === tokenAddr.toLowerCase()) : null;
    const tokenSymbol = tokenInfo ? tokenInfo.symbol : 'Token';
    const message = packet ? packet[10] : '';
    const isRestricted = packet && packet[9] !== "0x0000000000000000000000000000000000000000";

    async function handleClaim() {
        if (!address || !packetId) return;

        // Check if on correct network
        if (chain?.id !== base.id) {
            try {
                await switchChain({ chainId: base.id });
            } catch (e) {
                alert('Please switch to Base Mainnet to claim this gift.');
                return;
            }
        }

        try {
            // Check if this is a direct claim (user is the restrictedTo recipient)
            const restrictedTo = packet ? packet[9] : null;
            const isDirectRecipient = restrictedTo && restrictedTo.toLowerCase() === address.toLowerCase();

            let signature: `0x${string}`;

            if (isDirectRecipient) {
                // Direct recipient: use empty signature
                signature = '0x' as `0x${string}`;
            } else {
                // Link-based claim: generate signature from secret key
                if (!sk) {
                    alert('Invalid claim link. Secret key missing.');
                    return;
                }
                const messageHash = keccak256(encodePacked(['bytes32', 'address'], [packetId, address]));
                const claimerAccount = privateKeyToAccount(sk as `0x${string}`);
                signature = await claimerAccount.signMessage({
                    message: { raw: toBytes(messageHash) }
                });
            }

            writeContract({
                address: RED_PACKET_ADDRESS as `0x${string}`,
                abi: RedPacketABI.abi,
                functionName: 'claim',
                args: [packetId, signature],
                chainId: base.id
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Check if user is direct recipient (can claim without secret key)
    const restrictedTo = packet ? packet[9] : null;
    const isDirectRecipient = restrictedTo && address && restrictedTo.toLowerCase() === address.toLowerCase();

    // Only show "Invalid Link" if NOT a direct recipient and missing secret key
    if (!sk && !isDirectRecipient) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="bg-card p-8 rounded-3xl border border-destructive/50">
                    <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
                    <p className="text-muted-foreground">Missing secret key. Please check the link.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
            {/* Decor */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[80%] h-[80%] bg-primary/5 blur-[150px] rounded-full animate-pulse" />
            </div>

            <AnimatePresence mode='wait'>
                {!isOpen ? (
                    <motion.div
                        key="envelope"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
                        onClick={() => setIsOpen(true)}
                        className="cursor-pointer max-w-sm w-full bg-gradient-to-b from-red-600 to-red-700 p-1 rounded-[2rem] shadow-2xl relative z-10 transform hover:scale-105 transition-transform"
                    >
                        <div className="bg-red-600 h-96 rounded-[1.8rem] flex flex-col items-center justify-center border-4 border-yellow-400/30 relative overflow-hidden">
                            <div className="absolute top-[-50px] w-40 h-40 bg-yellow-400/20 rounded-full blur-xl" />
                            <div className="text-yellow-100/80 font-bold tracking-widest uppercase text-sm mb-4">You received a</div>
                            <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg mb-6 border-4 border-yellow-200">
                                <span className="text-4xl">🧧</span>
                            </div>
                            <p className="text-white font-bold text-xl px-4 text-center">
                                {packet ? `Red Packet from ${packet[0].slice(0, 6)}...` : 'Loading Packet...'}
                            </p>
                            <p className="text-white/60 text-sm mt-8 animate-bounce">Click to Open</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="max-w-md w-full bg-card p-8 rounded-[2rem] shadow-2xl relative z-10 border border-border/50 text-center"
                    >
                        <div className="w-20 h-20 bg-gradient-to-tr from-primary to-orange-500 rounded-2xl mx-auto -mt-16 mb-6 shadow-xl shadow-primary/30 flex items-center justify-center transform rotate-6 border-4 border-background">
                            <Gift className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">
                            {message || (isReading ? "Loading..." : "Best Wishes!")}
                        </h1>

                        {readError && (
                            <div className="text-red-500 bg-red-500/10 p-3 rounded-xl mb-4 text-xs break-words max-w-xs mx-auto">
                                Failed to load packet. Please check your network.
                            </div>
                        )}

                        <p className="text-muted-foreground mb-8 text-lg">
                            Someone sent you a gift!
                        </p>

                        <div className="bg-secondary/30 rounded-2xl p-6 mb-8 border border-white/5">
                            <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Contains</div>
                            {packet ? (
                                <div className="text-4xl font-black tracking-tighter">
                                    {packet[6] ? '???' : formatUnits(packet[2] ? packet[2] / packet[4] : BigInt(0), tokenInfo?.decimals || 18)} {tokenSymbol}
                                </div>
                            ) : (
                                <div className="animate-pulse h-10 w-32 bg-secondary rounded mx-auto" />
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                                {packet && packet[6] ? 'Lucky Draw (Random Amount)' : 'Fixed Amount'}
                            </div>
                        </div>

                        {!isConnected ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Connect wallet to claim</p>
                                <div className="flex justify-center">
                                    <Button
                                        variant="premium"
                                        onClick={() => {
                                            const injected = connectors.find(c => c.id === 'injected');
                                            connect({ connector: injected || connectors[0] });
                                        }}
                                    >
                                        Connect Wallet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isSuccess ? (
                                    <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in">
                                        <CheckCircle className="w-12 h-12 mb-2" />
                                        <span className="font-bold text-lg">Claimed Successfully!</span>
                                        <p className="text-sm text-green-500/80 mt-1">Funds arriving in your wallet.</p>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
                                        variant="premium"
                                        onClick={handleClaim}
                                        disabled={isPending || !packet || packet[4] === BigInt(0)}
                                    >
                                        {isPending ? 'Claiming...' : (!packet || packet[4] > BigInt(0)) ? `Open & Claim` : 'Sold Out'}
                                    </Button>
                                )}

                                {error && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden">
                                        <p className="text-red-500 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                            {error.message.includes('AlreadyClaimed') ? 'Already Claimed' : error.message.includes('PacketEmpty') ? 'Sold Out' : 'Claim Failed'}
                                        </p>
                                    </motion.div>
                                )}

                                <div className="text-xs text-muted-foreground mt-4">
                                    <p>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
