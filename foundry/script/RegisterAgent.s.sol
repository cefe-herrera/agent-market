// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {MainnetKey} from "./MainnetKey.sol";
import {IIdentityRegistry} from "../src/erc8004/IIdentityRegistry.sol";

/// @notice Registers a demo x402 seller on BSC testnet ERC-8004 IdentityRegistry.
/// @dev Owner = MAIN_PRIVATE_KEY. That wallet cannot giveFeedback to itself.
contract RegisterAgent is MainnetKey {
    address internal constant IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address internal constant U_TOKEN = 0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565;
    address internal constant DEFAULT_PAY_TO = 0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b;

    function run() external {
        uint256 pk = mainPrivateKey();
        address owner = vm.addr(pk);
        address payTo = vm.envOr("X402_PAY_TO", DEFAULT_PAY_TO);
        string memory endpoint = vm.envOr(
            "AGENT_ENDPOINT", string("http://localhost:3000/api/agent/resource")
        );

        string memory uri = _dataUri(_registrationJson(owner, payTo, endpoint));

        IIdentityRegistry.MetadataEntry[] memory meta = new IIdentityRegistry.MetadataEntry[](2);
        meta[0] = IIdentityRegistry.MetadataEntry("built_with", bytes("bnbagent"));
        meta[1] = IIdentityRegistry.MetadataEntry("x402", bytes("true"));

        vm.startBroadcast(pk);
        uint256 agentId = IIdentityRegistry(IDENTITY).register(uri, meta);
        vm.stopBroadcast();

        console.log("agentId", agentId);
        console.log("owner (cannot self-feedback)", owner);
        console.log("payTo", payTo);
        console.log("endpoint", endpoint);
        console.log("id CAIP", "97:0x8004A818BFB912233c491871b3d84c89A494BD9e");
        console.log("tokenURI", IIdentityRegistry(IDENTITY).tokenURI(agentId));
    }

    function _registrationJson(address owner, address payTo, string memory endpoint)
        internal
        view
        returns (string memory)
    {
        return string.concat(
            '{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1",',
            '"name":"Latam Market Pay",',
            '"description":"x402 exact seller on BSC testnet. Charges $U (United Stables) via EIP-3009. Built for BNB Agent Studio indexing + ERC-8004 reputation.",',
            '"image":"",',
            '"registrations":[{"agentRegistry":"eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e"}],',
            '"services":[',
            '{"name":"x402","endpoint":"',
            endpoint,
            '","version":"1"},',
            '{"name":"web","endpoint":"',
            endpoint,
            '","version":"1.0.0"}',
            "],",
            '"x402":{"network":"eip155:97","asset":"',
            vm.toString(U_TOKEN),
            '","payTo":"',
            vm.toString(payTo),
            '","scheme":"exact"},',
            '"owner":"',
            vm.toString(owner),
            '"}'
        );
    }

    function _dataUri(string memory json) internal pure returns (string memory) {
        return string.concat("data:application/json;utf8,", json);
    }
}
