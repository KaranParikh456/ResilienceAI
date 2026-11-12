import asyncio


class ScannerError(Exception):
    """Raised when a scanner cannot run or fails."""


async def run_command(
    args: list[str],
    timeout: float = 300,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    """Run a command without a shell. Returns (exit_code, stdout, stderr)."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
    except FileNotFoundError:
        raise ScannerError(f"{args[0]} is not installed or not on PATH")

    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        raise ScannerError(f"{args[0]} timed out after {timeout:.0f} seconds")

    return (
        proc.returncode,
        stdout.decode(errors="replace"),
        stderr.decode(errors="replace"),
    )