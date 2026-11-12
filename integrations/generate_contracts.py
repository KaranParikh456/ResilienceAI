"""Generate frontend contracts from the running backend's OpenAPI model."""
import json
from pathlib import Path
from backend.main import app

def ts(schema):
    if '$ref' in schema:
        return schema['$ref'].split('/')[-1]
    if 'anyOf' in schema:
        return ' | '.join(ts(item) for item in schema['anyOf'])
    if 'enum' in schema:
        return ' | '.join(json.dumps(item) for item in schema['enum'])
    if 'const' in schema:
        return json.dumps(schema['const'])
    kind = schema.get('type')
    if kind == 'array':
        return '(' + ts(schema['items']) + ')[]'
    if kind == 'object':
        if 'properties' not in schema:
            return 'Record<string, unknown>'
        fields = [json.dumps(key) + ('' if key in schema.get('required', []) else '?') + ': ' + ts(value)
                  for key, value in schema['properties'].items()]
        return '{ ' + '; '.join(fields) + ' }'
    return {'integer': 'number', 'number': 'number', 'string': 'string', 'boolean': 'boolean', 'null': 'null'}.get(kind, 'unknown')

if __name__ == '__main__':
    schemas = app.openapi()['components']['schemas']
    Path('frontend/src/lib/contracts.ts').write_text(
        '// Generated: python -m integrations.generate_contracts\n' +
        '\n'.join('export type ' + key + ' = ' + ts(value) + ';' for key, value in schemas.items()), encoding='utf-8')
