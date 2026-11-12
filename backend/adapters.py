"""Integration-owned boundary. No imports or changes within teammates' modules."""
import importlib
from .schemas import Evidence, Banks, Simulation


class Unavailable(Exception):
    pass


class Adapter:
    def __init__(self, module):
        self.module = None
        if module:
            try:
                self.module = importlib.import_module(module)
            except ImportError:
                pass

    def available(self, *methods):
        return self.module is not None and all(callable(getattr(self.module, m, None)) for m in methods)

    async def call(self, name, *args):
        if not self.available(name):
            raise Unavailable('integration_unavailable')
        return await getattr(self.module, name)(*args)

    async def scan(self, path):
        return Evidence.model_validate(await self.call('scan', str(path)))

    async def banks(self):
        return Banks.model_validate(await self.call('banks_status'))

    async def start(self, id, scan_id, targets):
        return Simulation.model_validate(await self.call('start', id, scan_id, targets))

    async def status(self, id):
        return Simulation.model_validate(await self.call('status', id))

    async def failure(self, request):
        return Simulation.model_validate(await self.call('inject_failure', request.model_dump()))
