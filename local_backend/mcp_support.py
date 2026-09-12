from __future__ import annotations

import os
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from browser_use import Tools
from browser_use.mcp.client import MCPClient

_ENV_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _normalize_string_list(values: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = str(value).strip()
        if not item or item in seen:
            continue
        seen.add(item)
        normalized.append(item)
    return normalized


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

    @field_validator("args", "tool_filter")
    @classmethod
    def normalize_string_list(cls, values: list[str]) -> list[str]:
        return _normalize_string_list(values)

    @field_validator("env_keys")
    @classmethod
    def normalize_env_keys(cls, values: list[str]) -> list[str]:
        normalized = _normalize_string_list(values)
        invalid = [key for key in normalized if not _ENV_KEY_RE.fullmatch(key)]
        if invalid:
            raise ValueError(f"Invalid environment variable name: {invalid[0]}")
        return normalized


# Minimal non-secret process environment required to discover executables and
# standard user/cache directories. Provider API keys and unrelated backend
# variables are deliberately absent unless their exact names are allow-listed.
_PLATFORM_ENV_KEYS = (
    "PATH",
    "HOME",
    "USER",
    "USERPROFILE",
    "LOCALAPPDATA",
    "APPDATA",
    "TMP",
    "TEMP",
    "TMPDIR",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
)


def resolve_mcp_env(env_keys: list[str]) -> dict[str, str]:
    """Build a least-privilege environment for an external MCP subprocess.

    Only standard process-discovery variables plus explicitly allow-listed names
    are forwarded. Returning an explicit mapping even when ``envKeys`` is empty
    prevents an MCP subprocess from inheriting unrelated backend secrets such as
    LLM provider API keys.
    """

    requested = [key.strip() for key in env_keys if key.strip()]
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
            # Track the client before registration so cleanup also covers a
            # connect/registration failure after the subprocess has started.
            connected.append(client)
            await client.register_to_tools(
                tools,
                tool_filter=server.tool_filter or None,
                prefix=server.prefix or None,
            )
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
