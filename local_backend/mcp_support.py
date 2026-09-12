from __future__ import annotations

import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from browser_use import Tools
from browser_use.mcp.client import MCPClient


class MCPServerSettings(BaseModel):
    """Non-secret configuration for one external stdio MCP server.

    Secret values are intentionally not accepted here. ``envKeys`` contains only
    environment-variable names; values are resolved locally in the backend at
    runtime and are never sent to the browser UI or settings export.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=128)
    command: str = Field(min_length=1, max_length=2048)
    args: list[str] = Field(default_factory=list, max_length=64)
    env_keys: list[str] = Field(default_factory=list, alias="envKeys", max_length=64)
    tool_filter: list[str] = Field(default_factory=list, alias="toolFilter", max_length=256)
    prefix: str = Field(default="", max_length=128)
    enabled: bool = True

    @field_validator("name", "command", "prefix")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("args", "env_keys", "tool_filter")
    @classmethod
    def normalize_string_list(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            item = str(value).strip()
            if not item or item in seen:
                continue
            seen.add(item)
            normalized.append(item)
        return normalized


# Keep process-discovery basics available without forwarding every backend secret.
_PLATFORM_ENV_KEYS = (
    "PATH",
    "HOME",
    "USER",
    "TMP",
    "TEMP",
    "TMPDIR",
    "SYSTEMROOT",
    "COMSPEC",
    "PATHEXT",
)


def resolve_mcp_env(env_keys: list[str]) -> dict[str, str] | None:
    """Resolve an allow-list of environment variable names to local values.

    ``None`` lets the MCP SDK inherit its normal environment when no explicit
    keys were requested. When keys are requested, only process-discovery basics
    plus those exact names are forwarded.
    """

    requested = [key.strip() for key in env_keys if key.strip()]
    if not requested:
        return None

    resolved: dict[str, str] = {}
    for key in (*_PLATFORM_ENV_KEYS, *requested):
        if key in resolved:
            continue
        value = os.getenv(key)
        if value is not None:
            resolved[key] = value
    return resolved


async def connect_mcp_servers(
    tools: Tools,
    servers: list[MCPServerSettings],
    interaction_mode: Literal["inspect", "full"],
) -> tuple[list[MCPClient], list[str]]:
    """Register external MCP tools using Browser Use's native MCPClient.

    Inspect Only deliberately exposes *zero* external MCP tools. MCP tool
    semantics are server-defined, so SHAMYLI cannot prove that an arbitrary MCP
    tool is read-only. Full Browser Control is therefore required before any MCP
    subprocess is started or any MCP action is registered.
    """

    enabled = [server for server in servers if server.enabled]
    if not enabled:
        return [], []
    if interaction_mode == "inspect":
        return [], [server.name for server in enabled]

    connected: list[MCPClient] = []
    try:
        for server in enabled:
            client = MCPClient(
                server_name=server.name,
                command=server.command,
                args=server.args,
                env=resolve_mcp_env(server.env_keys),
            )
            await client.register_to_tools(
                tools,
                tool_filter=server.tool_filter or None,
                prefix=server.prefix or None,
            )
            connected.append(client)
        return connected, []
    except Exception:
        await disconnect_mcp_clients(connected)
        raise


async def disconnect_mcp_clients(clients: list[MCPClient]) -> None:
    for client in reversed(clients):
        try:
            await client.disconnect()
        except Exception:
            pass
