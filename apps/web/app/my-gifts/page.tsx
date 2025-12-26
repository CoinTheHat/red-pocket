
'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { PocketCard } from '@/components/ui/pocket-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { parseAbiItem, formatUnits } from 'viem';
import { RED_PACKET_ADDRESS, TOKENS } from '@/lib/constants';
import RedPacketABI from '@/lib/abi/RedPacket.json';

export default function Dashboard() {
    const { isConnected, address } = useAccount();
    const publicClient = usePublicClient({ chainId: 8453 }); // Base Mainnet
    const [filter, setFilter] = useState('active'); // active, received, expired
    const [gifts, setGifts] = useState<any[]>([]);
    const [receivedGifts, setReceivedGifts] = useState<any[]>([]);
    const [isLoadingReceived, setIsLoadingReceived] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. Fetch Created Gifts (Local)
    useEffect(() => {
        const savedPockets = JSON.parse(localStorage.getItem('my_pockets') || '[]');
        setGifts(savedPockets);
    }, []);

    // 2. Fetch Received Gifts (On-Chain)
    useEffect(() => {
        async function fetchReceived() {
            if (!address || !publicClient) return;
            setIsLoadingReceived(true);
            try {
                // Get current block and query last 10k blocks
                // Contract was just deployed, so this captures everything
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;

                // Get Logs for packets restricted to ME
                const logs = await publicClient.getLogs({
                    address: RED_PACKET_ADDRESS as `0x${string}`,
                    event: parseAbiItem('event PacketCreated(bytes32 indexed packetId, address indexed creator, address indexed restrictedTo, address token, uint256 totalAmount, uint256 count, uint256 expiresAt, string message)'),
                    args: {
                        restrictedTo: address
                    },
                    fromBlock: fromBlock
                });

                // Fetch details for each log to check status
                const _received = await Promise.all(logs.map(async (log: any) => {
                    const { packetId, token, totalAmount, count, expiresAt, message, creator } = log.args;

                    // Read current status to check if claimed
                    const statusData = await publicClient.readContract({
                        address: RED_PACKET_ADDRESS as `0x${string}`,
                        abi: RedPacketABI.abi,
                        functionName: 'packets',
                        args: [packetId!]
                    }) as any;

                    // statusData: [creator, token, balance, initialBalance, count, initialCount, isRandom, expiresAt, signerPtr, restrictedTo, message]
                    // If balance == 0, claimed.
                    const isClaimed = statusData[2] === 0n;
                    const isExpired = Date.now() / 1000 > Number(expiresAt);

                    const tokenInfo = TOKENS.find(t => t.address.toLowerCase() === token?.toLowerCase()) || { symbol: '???', decimals: 18 };
                    const formattedAmount = formatUnits(totalAmount || 0n, tokenInfo.decimals);

                    return {
                        id: packetId,
                        amount: formattedAmount,
                        token: tokenInfo.symbol,
                        count: Number(count),
                        claimedCount: isClaimed ? 1 : 0, // Simplified for single
                        expiresAt: Number(expiresAt) * 1000,
                        status: isClaimed ? 'claimed' : (isExpired ? 'expired' : 'active'),
                        mode: 'single', // Implicitly single if restricted
                        creator: creator
                    };
                }));

                setReceivedGifts(_received);
            } catch (e) {
                console.error("Error fetching received gifts:", e);
            } finally {
                setIsLoadingReceived(false);
            }
        }

        if (filter === 'received') {
            fetchReceived();
        }
    }, [address, publicClient, filter]);


    const filteredGifts = (filter === 'received' ? receivedGifts : gifts).filter(g => {
        if (filter === 'received') return true; // Already fetched specific list
        if (filter === 'active') return g.status === 'active';
        if (filter === 'expired') return g.status === 'expired' || g.status === 'claimed';
        return true;
    });

    return (
        <main className="min-h-screen p-4 pb-20 max-w-lg mx-auto">
            <header className="flex items-center justify-between mb-8 pt-4">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">My Pockets</h1>
                </div>
                <Link href="/create">
                    <Button size="icon" className="rounded-full h-10 w-10 shadow-lg shadow-primary/20">
                        <Plus className="w-5 h-5" />
                    </Button>
                </Link>
            </header>

            {!mounted ? (
                <div className="text-center py-20 text-muted-foreground">
                    Loading...
                </div>
            ) : !isConnected ? (
                <div className="text-center py-20 text-muted-foreground">
                    Connect wallet to view your gifts.
                </div>
            ) : (
                <div className="space-y-6">
                    <SegmentedControl
                        options={[
                            { label: 'Active', value: 'active' },
                            { label: 'Received', value: 'received' },
                            { label: 'History', value: 'expired' },
                        ]}
                        value={filter}
                        onChange={setFilter}
                    />

                    <div className="space-y-4">
                        {isLoadingReceived && filter === 'received' && (
                            <div className="text-center py-10 animate-pulse">Scanning blockchain...</div>
                        )}

                        {!isLoadingReceived && filteredGifts.map((gift, i) => (
                            <PocketCard
                                key={i}
                                amount={gift.amount}
                                token={gift.token}
                                count={gift.count}
                                claimedCount={gift.claimedCount}
                                expiresAt={new Date(gift.expiresAt).toLocaleDateString()}
                                status={gift.status}
                                onClick={() => {
                                    if (filter === 'received') {
                                        // Navigate to claim page - no link needed for direct recipients
                                        window.location.href = `/claim/${gift.id}`;
                                    } else {
                                        // Active/History logic
                                        if (gift.mode === 'link' && gift.sk) {
                                            const url = `${window.location.origin}/claim/${gift.id}#sk=${gift.sk}`;
                                            navigator.clipboard.writeText(url);
                                            alert('Claim Link copied to clipboard!');
                                        } else {
                                            const url = `${window.location.origin}/claim/${gift.id}#sk=${gift.sk}`;
                                            navigator.clipboard.writeText(url);
                                            alert('Link copied. Send this to the recipient!');
                                        }
                                    }
                                }}
                            />
                        ))}

                        {!isLoadingReceived && filteredGifts.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No {filter} pockets found.</p>
                                {filter === 'active' && (
                                    <Link href="/create">
                                        <Button variant="link" className="mt-2 text-primary">Create one now</Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
