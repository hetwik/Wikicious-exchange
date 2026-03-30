// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Generic mock ERC20 with configurable decimals and public mint
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 dec)
        ERC20(name, symbol)
    {
        _decimals = dec;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Mock Chainlink AggregatorV3 — configurable price + timestamp
contract MockChainlinkFeed {
    uint8   public decimals;
    int256  public latestAnswer;
    uint256 public updatedAt;

    constructor(uint8 dec) {
        decimals   = dec;
        latestAnswer = 0;
        updatedAt    = block.timestamp;
    }

    function setPrice(int256 price) external {
        latestAnswer = price;
        updatedAt    = block.timestamp;
    }

    function setUpdatedAt(uint256 ts) external {
        updatedAt = ts;
    }

    function latestRoundData()
        external view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, latestAnswer, block.timestamp, updatedAt, 1);
    }
}

/// @dev Mock Arbitrum L2 Sequencer Uptime Feed
/// answer = 0 → sequencer UP (normal)
/// answer = 1 → sequencer DOWN
contract MockSequencerFeed {
    int256  public answer;     // 0 = up, 1 = down
    uint256 public startedAt;  // time sequencer last restarted

    constructor() {
        answer    = 0;
        // Put startedAt far enough in the past to clear the grace period
        startedAt = block.timestamp - 7200; // 2 hours ago
    }

    function setDown() external {
        answer    = 1;
        startedAt = block.timestamp;
    }

    function setUp() external {
        answer    = 0;
        startedAt = block.timestamp - 7200;
    }

    function latestRoundData()
        external view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, answer, startedAt, block.timestamp, 1);
    }
}

/// @dev Minimal mock for GMX backstop interface
contract MockGMXBackstop {
    bool public called;
    uint256 public constant minGMXRouteSize = 10_000 * 1e6; // $10K

    function routeToGMX(
        address, bytes32, bool, uint256, uint256
    ) external payable returns (bytes32) {
        called = true;
        return keccak256(abi.encodePacked(block.timestamp, msg.sender));
    }

    function isMarketSupported(bytes32) external pure returns (bool) {
        return true;
    }
}
