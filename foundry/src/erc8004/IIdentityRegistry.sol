// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IIdentityRegistry {
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    function register(string memory agentURI, MetadataEntry[] memory metadata)
        external
        returns (uint256 agentId);

    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function getAgentWallet(uint256 agentId) external view returns (address);
}
