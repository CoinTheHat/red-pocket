
const hre = require("hardhat");

async function main() {
    const RedPacket = await hre.ethers.getContractFactory("RedPacket");
    const redPacket = await RedPacket.deploy();

    await redPacket.waitForDeployment();

    const address = await redPacket.getAddress();
    console.log(`RedPacket deployed to ${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
