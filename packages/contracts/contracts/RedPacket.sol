// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RedPacket is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct Packet {
        address creator;
        address token;
        uint256 balance;         // Remaining balance
        uint256 initialBalance;  // Total initial balance
        uint256 count;           // Remaining claims
        uint256 initialCount;    // Total initial claims
        bool isRandom;           // If true, random amounts; else equal
        uint256 expiresAt;
        address signerPtr;       // The public key (address) derived from the ephemeral private key
        address restrictedTo;    // If non-zero, only this address can claim
        string message;
    }

    // packetId => Packet
    mapping(bytes32 => Packet) public packets;
    // packetId => mapping(address => bool)
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    event PacketCreated(
        bytes32 indexed packetId,
        address indexed creator,
        address indexed restrictedTo, // allowing filtering by recipient
        address token,
        uint256 totalAmount,
        uint256 count,
        uint256 expiresAt,
        string message
    );

    event Claimed(
        bytes32 indexed packetId,
        address indexed claimer,
        uint256 amount
    );

    event Refunded(
        bytes32 indexed packetId,
        address indexed creator,
        uint256 amount
    );

    error InvalidAmount();
    error InvalidCount();
    error PacketExpired();
    error PacketNotExpired();
    error PacketEmpty();
    error AlreadyClaimed();
    error InvalidSignature();
    error InsufficientAllowance();
    error NotEligible();
    error ETHTransferFailed();

    /**
     * @notice Create a new Red Packet
     * @param _token Token address (0x0 for Native ETH)
     * @param _totalAmount Total tokens to lock (must match msg.value if ETH)
     * @param _count Number of people who can claim
     * @param _isRandom Whether amounts are random (Lucky Draw) or Equal
     * @param _signerPtr Public address corresponding to the ephemeral key used for signing claims
     * @param _restrictedTo Optional: Restrict claim to a specific address (0x0 for any)
     * @param _duration Duration in seconds until expiry
     * @param _message Gift message
     */
    function createPacket(
        address _token,
        uint256 _totalAmount,
        uint256 _count,
        bool _isRandom,
        address _signerPtr,
        address _restrictedTo,
        uint256 _duration,
        string calldata _message
    ) external payable nonReentrant returns (bytes32) {
        if (_totalAmount == 0) revert InvalidAmount();
        if (_count == 0) revert InvalidCount();

        // Handle ETH vs ERC20
        if (_token == address(0)) {
            // Native ETH received?
            if (msg.value != _totalAmount) revert InvalidAmount();
        } else {
            // ERC20
            if (msg.value > 0) revert InvalidAmount(); // Do not accept ETH if token is ERC20
            IERC20 token = IERC20(_token);
            if (token.allowance(msg.sender, address(this)) < _totalAmount) {
                revert InsufficientAllowance();
            }
            token.safeTransferFrom(msg.sender, address(this), _totalAmount);
        }

        // Create unique ID
        bytes32 packetId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _token,
                _totalAmount,
                _count,
                _signerPtr,
                _restrictedTo
            )
        );

        packets[packetId] = Packet({
            creator: msg.sender,
            token: _token,
            balance: _totalAmount,
            initialBalance: _totalAmount,
            count: _count,
            initialCount: _count,
            isRandom: _isRandom,
            expiresAt: block.timestamp + _duration,
            signerPtr: _signerPtr,
            restrictedTo: _restrictedTo,
            message: _message
        });

        emit PacketCreated(packetId, msg.sender, _restrictedTo, _token, _totalAmount, _count, block.timestamp + _duration, _message);

        return packetId;
    }

    /**
     * @notice Claim a Red Packet
     * @param _packetId ID of the packet
     * @param _signature Signature signed by the creator's ephemeral key.
     */
    function claim(bytes32 _packetId, bytes calldata _signature) external nonReentrant {
        Packet storage packet = packets[_packetId];

        if (block.timestamp > packet.expiresAt) revert PacketExpired();
        if (packet.count == 0 || packet.balance == 0) revert PacketEmpty();
        if (hasClaimed[_packetId][msg.sender]) revert AlreadyClaimed();
        
        // Single Recipient Check
        if (packet.restrictedTo != address(0)) {
            if (msg.sender != packet.restrictedTo) revert NotEligible();
        }

        // Skip signature verification if caller is the direct recipient
        bool isDirectRecipient = (packet.restrictedTo != address(0) && msg.sender == packet.restrictedTo);
        
        if (!isDirectRecipient) {
            // Verify Signature (only for link-based claims)
            bytes32 hash = keccak256(abi.encodePacked(_packetId, msg.sender));
            bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);

            if (ECDSA.recover(ethSignedHash, _signature) != packet.signerPtr) {
                revert InvalidSignature();
            }
        }

        // Calculate Claim Amount
        uint256 claimAmount;
        if (packet.count == 1) {
            claimAmount = packet.balance;
        } else if (!packet.isRandom) {
            claimAmount = packet.balance / packet.count;
        } else {
            // Pseudo-random logic
            uint256 avg = packet.balance / packet.count;
            uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, packet.count))) % (avg * 2);
            random = random == 0 ? 1 : random;
            if (random >= packet.balance) random = packet.balance - (packet.count - 1); 
            claimAmount = random;
        }

        // Update State
        packet.count -= 1;
        packet.balance -= claimAmount;
        hasClaimed[_packetId][msg.sender] = true;

        // Transfer Funds
        if (packet.token == address(0)) {
            // Native ETH
            (bool success, ) = payable(msg.sender).call{value: claimAmount}("");
            if (!success) revert ETHTransferFailed();
        } else {
            // ERC20
            IERC20(packet.token).safeTransfer(msg.sender, claimAmount);
        }

        emit Claimed(_packetId, msg.sender, claimAmount);
    }

    /**
     * @notice Refund remaining balance after expiry
     * @param _packetId ID of the packet
     */
    function refund(bytes32 _packetId) external nonReentrant {
        Packet storage packet = packets[_packetId];
        
        if (msg.sender != packet.creator) revert InvalidSignature(); // Only creator can trigger refund? Or anyone? Usually anyone if expired.
        // Let's allow creator only for control, or anyone if we want to save them gas?
        // Let's stick to creator for now to avoid griefing.
        
        if (block.timestamp <= packet.expiresAt) revert PacketNotExpired();
        if (packet.balance == 0) revert PacketEmpty();

        uint256 amount = packet.balance;
        packet.balance = 0;
        packet.count = 0;

        IERC20(packet.token).safeTransfer(packet.creator, amount);

        emit Refunded(_packetId, packet.creator, amount);
    }
}
