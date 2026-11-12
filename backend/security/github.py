import os
import re
import shutil
import tempfile
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from backend.security.runner import ScannerError, run_command

_NAME = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")


class InvalidRepositoryURL(ValueError):
    """The submitted URL is not an acceptable GitHub repository URL."""


def parse_github_url(url: str) -> tuple[str, str]:
    """Accept only https://github.com/<owner>/<repo>[.git]. Returns (owner, repo)."""
    try:
        parsed = urlparse(url.strip())
        port = parsed.port
    except ValueError:
        raise InvalidRepositoryURL("Malformed URL")

    if parsed.scheme != "https":
        raise InvalidRepositoryURL("Only https:// URLs are allowed")
    if parsed.hostname != "github.com":
        raise InvalidRepositoryURL("Only github.com repositories are allowed")
    if port or parsed.username or parsed.password:
        raise InvalidRepositoryURL("Ports and credentials are not allowed")
    if parsed.query or parsed.fragment:
        raise InvalidRepositoryURL("Query strings and fragments are not allowed")

    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) != 2:
        raise InvalidRepositoryURL("URL must look like https://github.com/owner/repo")

    owner, repo = parts
    if repo.endswith(".git"):
        repo = repo[:-4]
    for part in (owner, repo):
        if not _NAME.match(part) or part in (".", ".."):
            raise InvalidRepositoryURL("Invalid owner or repository name")
    return owner, repo


@asynccontextmanager
async def cloned_repo(url: str, timeout: float = 120):
    """Shallow-clone a GitHub repo into a temp folder, then delete it afterwards.

    Usage:
        async with cloned_repo(url) as (path, name):
            ...
    """
    owner, repo = parse_github_url(url)
    clean_url = f"https://github.com/{owner}/{repo}.git"

    tmp = tempfile.mkdtemp(prefix="resilience-")
    dest = os.path.join(tmp, "repo")
    env = {
        **os.environ,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_LFS_SKIP_SMUDGE": "1",
    }

    try:
        code, _, err = await run_command(
            [
                "git",
                "-c", "core.hooksPath=/dev/null",
                "-c", "protocol.file.allow=never",
                "clone",
                "--depth", "1",
                "--single-branch",
                "--no-tags",
                "--no-recurse-submodules",
                "--",
                clean_url,
                dest,
            ],
            timeout,
            env=env,
        )
        if code != 0:
            raise ScannerError(f"git clone failed: {err.strip()[:300]}")
        yield dest, f"{owner}/{repo}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)