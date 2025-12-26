
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("RedPacket", function () {
    async function deployFixture() {
        const [owner, creator, claimer1, claimer2, otherAccount] = await ethers.getSigners();

        // Deploy Mock Token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const token = await MockERC20.deploy("Test USDC", "USDC");
        await token.waitForDeployment();

        // Deploy RedPacket
        const RedPacket = await ethers.getContractFactory("RedPacket");
        const redPacket = await RedPacket.deploy();
        await redPacket.waitForDeployment();

        // Mint tokens to creator and approve
        await token.mint(creator.address, ethers.parseUnits("1000", 18));
        await token.connect(creator).approve(redPacket.target, ethers.MaxUint256);

        return { redPacket, token, owner, creator, claimer1, claimer2, otherAccount };
    }

    describe("Core Flow", function () {
        it("Should create a packet", async function () {
            const { redPacket, token, creator } = await loadFixture(deployFixture);

            const ephemeral = ethers.Wallet.createRandom();
            const amount = ethers.parseUnits("10", 18);
            const count = 2;
            const duration = 3600;

            await expect(redPacket.connect(creator).createPacket(
                token.target,
                amount,
                count,
                false, // equal split
                ephemeral.address,
                ethers.ZeroAddress, // restrictedTo address(0)
                duration,
                "Best Wishes"
            )).to.emit(redPacket, "PacketCreated");
        });

        it("Should claim successfully with valid signature", async function () {
            const { redPacket, token, creator, claimer1 } = await loadFixture(deployFixture);

            const ephemeral = ethers.Wallet.createRandom();
            const amount = ethers.parseUnits("10", 18);
            const count = 2;

            // Create
            const tx = await redPacket.connect(creator).createPacket(
                token.target,
                amount,
                count,
                false,
                ephemeral.address,
                ethers.ZeroAddress,
                3600,
                "Gift"
            );
            const receipt = await tx.wait();
            const logs = await redPacket.queryFilter(redPacket.filters.PacketCreated(), receipt?.blockNumber);
            const packetId = logs[0].args[0];

            // Sign: keccak256(packetId, claimer)
            const hash = ethers.solidityPackedKeccak256(["bytes32", "address"], [packetId, claimer1.address]);
            const signature = await ephemeral.signMessage(ethers.getBytes(hash));

            // Claim
            await expect(redPacket.connect(claimer1).claim(packetId, signature))
                .to.emit(redPacket, "Claimed")
                .withArgs(packetId, claimer1.address, ethers.parseUnits("5", 18));

            expect(await token.balanceOf(claimer1.address)).to.equal(ethers.parseUnits("5", 18));
        });

        it("Should enforce restrictedTo address", async function () {
            const { redPacket, token, creator, claimer1, claimer2 } = await loadFixture(deployFixture);

            const ephemeral = ethers.Wallet.createRandom();

            // Create restricted to claimer1
            const tx = await redPacket.connect(creator).createPacket(
                token.target,
                ethers.parseUnits("10", 18),
                1,
                false,
                ephemeral.address,
                claimer1.address, // Restricted to Claimer1
                3600,
                "For You Only"
            );
            const receipt = await tx.wait();
            const logs = await redPacket.queryFilter(redPacket.filters.PacketCreated(), receipt?.blockNumber);
            const packetId = logs[0].args[0];

            // Claimer2 tries to claim (even with valid signature!)
            const hash2 = ethers.solidityPackedKeccak256(["bytes32", "address"], [packetId, claimer2.address]);
            const signature2 = await ephemeral.signMessage(ethers.getBytes(hash2));

            await expect(redPacket.connect(claimer2).claim(packetId, signature2))
                .to.be.revertedWithCustomError(redPacket, "NotEligible");

            // Claimer1 claims
            const hash1 = ethers.solidityPackedKeccak256(["bytes32", "address"], [packetId, claimer1.address]);
            const signature1 = await ephemeral.signMessage(ethers.getBytes(hash1));

            await expect(redPacket.connect(claimer1).claim(packetId, signature1))
                .to.emit(redPacket, "Claimed");
        });
    });
});
