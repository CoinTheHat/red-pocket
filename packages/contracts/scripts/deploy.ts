import { ethers } from "hardhat";

async function main() {
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    const unlockTime = currentTimestampInSeconds + 60;

    const RedPacket = await ethers.getContractFactory("RedPacket");
    const redPacket = await RedPacket.deploy();

    await redPacket.waitForDeployment();

    console.log(
        `RedPacket deployed to ${redPacket.target}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
