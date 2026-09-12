"""Fast contract checks for the Browser Use 0.13.10 native MCP adapter.

No external MCP subprocess is started. The smoke test verifies SHAMYLI's safe
configuration/interaction boundary while keeping Browser Use's MCPClient as the
actual production implementation.
"""

import asyncio
import os

from pydantic import ValidationError
from browser_use import Tools
from browser_use.mcp.client import MCPClient as NativeMCPClient

import mcp_support
from mcp_support import MCPServerSettings, connect_mcp_servers, disconnect_mcp_clients, mcp_action_prefix, resolve_mcp_env


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
    assert mcp_action_prefix(server) == "mcp_demo_"
    assert mcp_action_prefix(MCPServerSettings(name="GitHub Server", command="x")) == "mcp_github_server_"

    try:
        MCPServerSettings(name="bad", command="npx", envKeys=["BAD=VALUE"])
        raise AssertionError("Invalid environment variable name was accepted")
    except ValidationError:
        pass

    os.environ["SHAMYLI_MCP_TEST_TOKEN"] = "local-secret-value"
    os.environ["SHAMYLI_MCP_UNRELATED_SECRET"] = "must-not-be-forwarded"
    os.environ["OPENAI_API_KEY"] = "provider-key-must-not-leak"
    resolved = resolve_mcp_env(server.env_keys)
    assert resolved["SHAMYLI_MCP_TEST_TOKEN"] == "local-secret-value"
    assert "SHAMYLI_MCP_UNRELATED_SECRET" not in resolved
    assert "OPENAI_API_KEY" not in resolved

    least_privilege = resolve_mcp_env([])
    assert isinstance(least_privilege, dict)
    assert "SHAMYLI_MCP_TEST_TOKEN" not in least_privilege
    assert "SHAMYLI_MCP_UNRELATED_SECRET" not in least_privilege
    assert "OPENAI_API_KEY" not in least_privilege

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
        assert "OPENAI_API_KEY" not in fake.env
        assert fake.register_calls[0]["tool_filter"] == ["read_page"]
        assert fake.register_calls[0]["prefix"] == "mcp_demo_"

        await disconnect_mcp_clients(clients)  # type: ignore[arg-type]
        assert fake.disconnected is True

        duplicate_a = MCPServerSettings(name="one", command="x", prefix="shared")
        duplicate_b = MCPServerSettings(name="two", command="y", prefix="shared")
        try:
            await connect_mcp_servers(tools, [duplicate_a, duplicate_b], "full")
            raise AssertionError("Duplicate MCP action namespace was accepted")
        except ValueError as exc:
            assert "unique" in str(exc)
    finally:
        mcp_support.MCPClient = original_client

    print("SHAMYLI native MCP contract smoke: PASS")


if __name__ == "__main__":
    asyncio.run(main())
