"""Fast contract checks for the Browser Use 0.13.10 native MCP adapter.

No external MCP subprocess is started. The smoke test verifies SHAMYLI's safe
configuration/interaction boundary while keeping Browser Use's MCPClient as the
actual production implementation.
"""

import asyncio
import os

from browser_use import Tools
from browser_use.mcp.client import MCPClient as NativeMCPClient

import mcp_support
from mcp_support import MCPServerSettings, connect_mcp_servers, disconnect_mcp_clients, resolve_mcp_env


class FakeMCPClient:
    instances: list["FakeMCPClient"] = []

    def __init__(self, server_name: str, command: str, args=None, env=None):
        self.server_name = server_name
        self.command = command
        self.args = args or []
        self.env = env
        self.register_calls: list[dict] = []
        self.disconnected = False
        self.__class__.instances.append(self)

    async def register_to_tools(self, tools, tool_filter=None, prefix=None):
        self.register_calls.append({"tools": tools, "tool_filter": tool_filter, "prefix": prefix})

    async def disconnect(self):
        self.disconnected = True


async def main() -> None:
    assert NativeMCPClient.__module__ == "browser_use.mcp.client"

    server = MCPServerSettings(
        name=" demo ",
        command=" npx ",
        args=[" @example/mcp ", "", "@example/mcp"],
        envKeys=["SHAMYLI_MCP_TEST_TOKEN", " SHAMYLI_MCP_TEST_TOKEN "],
        toolFilter=["read_page", "", "read_page"],
        prefix=" demo_ ",
        enabled=True,
    )
    assert server.name == "demo"
    assert server.command == "npx"
    assert server.args == ["@example/mcp"]
    assert server.env_keys == ["SHAMYLI_MCP_TEST_TOKEN"]
    assert server.tool_filter == ["read_page"]
    assert server.prefix == "demo_"
    assert server.model_dump(by_alias=True)["envKeys"] == ["SHAMYLI_MCP_TEST_TOKEN"]

    os.environ["SHAMYLI_MCP_TEST_TOKEN"] = "local-secret-value"
    os.environ["SHAMYLI_MCP_UNRELATED_SECRET"] = "must-not-be-forwarded"
    resolved = resolve_mcp_env(server.env_keys)
    assert resolved is not None
    assert resolved["SHAMYLI_MCP_TEST_TOKEN"] == "local-secret-value"
    assert "SHAMYLI_MCP_UNRELATED_SECRET" not in resolved
    assert resolve_mcp_env([]) is None

    original_client = mcp_support.MCPClient
    mcp_support.MCPClient = FakeMCPClient  # type: ignore[assignment]
    try:
        tools = Tools()

        clients, skipped = await connect_mcp_servers(tools, [server], "inspect")
        assert clients == []
        assert skipped == ["demo"]
        assert FakeMCPClient.instances == []

        clients, skipped = await connect_mcp_servers(tools, [server], "full")
        assert skipped == []
        assert len(clients) == 1
        fake = FakeMCPClient.instances[0]
        assert fake.server_name == "demo"
        assert fake.command == "npx"
        assert fake.args == ["@example/mcp"]
        assert fake.env is not None
        assert fake.env["SHAMYLI_MCP_TEST_TOKEN"] == "local-secret-value"
        assert fake.register_calls[0]["tool_filter"] == ["read_page"]
        assert fake.register_calls[0]["prefix"] == "demo_"

        await disconnect_mcp_clients(clients)  # type: ignore[arg-type]
        assert fake.disconnected is True
    finally:
        mcp_support.MCPClient = original_client

    print("SHAMYLI native MCP contract smoke: PASS")


if __name__ == "__main__":
    asyncio.run(main())
